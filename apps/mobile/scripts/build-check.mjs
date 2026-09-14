import { existsSync } from 'node:fs';
if (!existsSync(new URL('../android', import.meta.url))) {
  console.error('Native Android scaffold is not present yet. Generate it with the pinned React Native toolchain on a network-enabled development machine.');
  process.exit(2);
}
