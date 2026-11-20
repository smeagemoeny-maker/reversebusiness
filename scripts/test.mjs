import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Run each *.test.mjs file sequentially so headless browser tests never compete for CPU on 2-core CI runners.
const dir = path.resolve('test');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.mjs')).sort().map((f) => path.join('test', f));
const extra = process.argv.slice(2);
const env = { ...process.env, REBIZ_LANG: process.env.REBIZ_LANG || 'ko', REBIZ_HEADLESS: process.env.REBIZ_HEADLESS || '1' };
let code = 0;
for (const file of files) {
  const r = spawnSync(process.execPath, ['--test', ...extra, file], { stdio: 'inherit', env });
  if (r.status !== 0) code = r.status == null ? 1 : r.status;
}
process.exit(code);
