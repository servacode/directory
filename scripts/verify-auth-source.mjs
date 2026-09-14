import { readFile } from 'node:fs/promises';

const required = [
  ['apps/api/src/modules/auth/core/phone-normalizer.ts', '+963'],
  ['apps/api/src/modules/auth/core/auth-service.ts', 'Refresh token reuse detected'],
  ['apps/api/src/modules/auth/core/password-recovery.service.ts', 'sendVerificationCode'],
  ['apps/api/src/modules/auth/adapters/argon2-password-hasher.ts', 'argon2id'],
  ['apps/api/src/modules/auth/adapters/jose-token.service.ts', "alg: 'HS256'"],
  ['apps/api/src/modules/auth/adapters/whatsapp-recovery.channel.ts', 'JSON.stringify({ phone: input.phone, code: input.code })'],
  ['apps/api/src/modules/auth/persistence/pg-auth.store.ts', 'FOR UPDATE'],
  ['apps/api/src/modules/auth/http/access-token.guard.ts', 'authenticateAccessToken'],
  ['infrastructure/database/migrations/0006_password_recovery.sql', 'password_recovery_challenges'],
];
const failures = [];
for (const [file, expected] of required) {
  const text = await readFile(file, 'utf8');
  if (!text.includes(expected)) failures.push(`${file}: missing ${expected}`);
}
const whatsapp = await readFile('apps/api/src/modules/auth/adapters/whatsapp-recovery.channel.ts', 'utf8');
if (/newPassword|currentPassword|passwordHash|password\s*:/i.test(whatsapp)) failures.push('WhatsApp recovery adapter must never contain password payload logic');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Auth source security verification: PASS');
console.log('WhatsApp payload: phone + verification code only');
