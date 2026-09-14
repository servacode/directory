import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';

const root = process.cwd();
const scanRoots = ['apps/mobile/src', 'apps/admin/app', 'apps/admin/src'].map((path) => resolve(root, path));
const files = [];
async function walk(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (['.ts','.tsx','.js','.jsx','.css'].includes(extname(entry.name))) files.push(path);
  }
}
for (const dir of scanRoots) await walk(dir);

const failures = [];
const rawHex = /#[0-9a-fA-F]{6}\b/;
const directFetch = /\bfetch\s*\(/;
const directIconImport = /from\s+['\"](?:lucide|lucide-react|lucide-react-native)['\"]/;
const arabicLiteral = /[\u0600-\u06FF]{3,}/;

for (const file of files) {
  const text = await readFile(file, 'utf8');
  const rel = relative(root, file);
  if (rawHex.test(text)) failures.push(`${rel}: raw hex color outside design token package`);
  if (directFetch.test(text) && !rel.startsWith('apps/mobile/src/platform/network/') && !rel.startsWith('apps/admin/src/api/')) failures.push(`${rel}: direct fetch() outside central API client`);
  if (directIconImport.test(text) && rel !== 'apps/mobile/src/ui/AppIcon.tsx') failures.push(`${rel}: direct icon library import`);
  if ((file.endsWith('.ts') || file.endsWith('.tsx')) && arabicLiteral.test(text)) failures.push(`${rel}: hardcoded Arabic UI text outside i18n package`);
}

if (failures.length) {
  console.error('Centralization audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Centralization audit: PASS');
