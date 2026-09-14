import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rename, stat, unlink } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import pg from 'pg';
import { PLATFORM_SETTING_DEFINITIONS } from '@health/config';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');
const uploadRoot = resolve(process.env.UPLOAD_DIR ?? './var/uploads');
const evidenceDir = resolve(uploadRoot, 'verification-evidence');
const execute = process.env.VERIFICATION_EVIDENCE_PURGE_EXECUTE === 'PURGE';
const batchSize = Math.min(Math.max(Number(process.env.VERIFICATION_EVIDENCE_PURGE_BATCH ?? 250), 1), 1000);
const pool = new Pool({ connectionString: databaseUrl, max: 2 });

type Candidate = { id: string; facilityId: string; storageKey: string };

function evidencePath(storageKey: string): string {
  if (!/^verification-evidence\/[0-9a-f-]+\.(jpg|png|webp)$/i.test(storageKey)) throw new Error('Invalid evidence storage key');
  const path = resolve(uploadRoot, storageKey);
  const rel = relative(uploadRoot, path);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('Evidence path escapes upload root');
  return path;
}

async function retentionDays(): Promise<number> {
  const result = await pool.query<{ value: unknown }>(`SELECT value_json AS value FROM platform_settings WHERE key='verificationEvidenceRetentionDays'`);
  const configured = Number(result.rows[0]?.value);
  const fallback = PLATFORM_SETTING_DEFINITIONS.verificationEvidenceRetentionDays.defaultValue;
  return Number.isInteger(configured) && configured >= 30 && configured <= 730 ? configured : fallback;
}

async function recoverInterruptedQuarantine(): Promise<void> {
  await mkdir(evidenceDir, { recursive: true });
  for (const name of await readdir(evidenceDir)) {
    const marker = name.indexOf('.deleting-');
    if (marker < 0) continue;
    const originalName = name.slice(0, marker);
    const originalKey = `verification-evidence/${originalName}`;
    const quarantinePath = join(evidenceDir, name);
    const originalPath = join(evidenceDir, originalName);
    const row = await pool.query(`SELECT 1 FROM facility_verification_evidence WHERE storage_key=$1 LIMIT 1`, [originalKey]);
    try {
      if (row.rowCount) await rename(quarantinePath, originalPath);
      else await unlink(quarantinePath);
    } catch (error) {
      if ((error as { code?: string }).code !== 'ENOENT') throw error;
    }
  }
}

async function candidates(days: number): Promise<Candidate[]> {
  const result = await pool.query<Candidate>(`
    SELECT ve.id, ve.facility_id AS "facilityId", ve.storage_key AS "storageKey"
    FROM facility_verification_evidence ve
    JOIN facilities f ON f.id=ve.facility_id
    WHERE f.status IN ('REJECTED','CLOSED')
      AND f.updated_at < NOW() - ($1::int * INTERVAL '1 day')
    ORDER BY ve.created_at
    LIMIT $2`, [days, batchSize]);
  return result.rows;
}

async function purgeOne(candidate: Candidate, days: number): Promise<boolean> {
  const client = await pool.connect();
  const originalPath = evidencePath(candidate.storageKey);
  const quarantinePath = `${originalPath}.deleting-${randomUUID()}`;
  let quarantined = false;
  try {
    await client.query('BEGIN');
    const locked = await client.query<Candidate>(`
      SELECT ve.id, ve.facility_id AS "facilityId", ve.storage_key AS "storageKey"
      FROM facility_verification_evidence ve
      JOIN facilities f ON f.id=ve.facility_id
      WHERE ve.id=$1 AND f.status IN ('REJECTED','CLOSED')
        AND f.updated_at < NOW() - ($2::int * INTERVAL '1 day')
      FOR UPDATE OF ve`, [candidate.id, days]);
    if (!locked.rows[0]) { await client.query('ROLLBACK'); return false; }
    try { await stat(originalPath); await rename(originalPath, quarantinePath); quarantined = true; }
    catch (error) { if ((error as { code?: string }).code !== 'ENOENT') throw error; }
    await client.query(`DELETE FROM facility_verification_evidence WHERE id=$1`, [candidate.id]);
    await client.query(`INSERT INTO audit_logs(id,actor_user_id,action,entity_type,entity_id,metadata)
      VALUES($1,NULL,'FACILITY_VERIFICATION_EVIDENCE_RETENTION_PURGED','FACILITY',$2,$3::jsonb)`,
      [randomUUID(), candidate.facilityId, JSON.stringify({ evidenceId: candidate.id, retentionDays: days })]);
    await client.query('COMMIT');
    if (quarantined) await unlink(quarantinePath).catch((error: { code?: string }) => { if (error.code !== 'ENOENT') throw error; });
    return true;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    if (quarantined) await rename(quarantinePath, originalPath).catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

try {
  const days = await retentionDays();
  await recoverInterruptedQuarantine();
  const rows = await candidates(days);
  if (!execute) {
    process.stdout.write(`DRY RUN: ${rows.length} verification evidence file(s) eligible for purge after ${days} day(s). Set VERIFICATION_EVIDENCE_PURGE_EXECUTE=PURGE to execute.\n`);
  } else {
    let purged = 0;
    for (const row of rows) if (await purgeOne(row, days)) purged++;
    process.stdout.write(`Purged ${purged} verification evidence file(s) using ${days}-day retention.\n`);
  }
} finally { await pool.end(); }
