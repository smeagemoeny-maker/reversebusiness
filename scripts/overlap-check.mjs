#!/usr/bin/env node
// 다른 프로젝트의 글(README 등)과 이 저장소의 파일이 겹치는지 센다. 의존성 없음.
// 사용: node scripts/overlap-check.mjs <비교할 원본 텍스트 파일> [우리 파일 ...]
// 우리 파일을 주지 않으면 스킬, 뷰어, 실행 파일, 문서를 본다.
// 세는 것: 여섯 낱말이 연달아 같은 구간의 수, 25자 이상인 똑같은 줄의 수.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const DEFAULTS = [...walk('skill'), ...walk('viewer'), ...walk('bin'), ...walk('lib'), 'README.md', 'AGENTS.md', 'CONTRIBUTING.md', 'SECURITY.md']
  .filter((f) => /\.(md|mjs|js|json|css|html)$/.test(f)).map((f) => path.join(ROOT, f));

const N = 6;
const words = (t) => t.toLowerCase().match(/[a-z0-9_@./:-]+|[가-힣]+/g) || [];
const grams = (t) => {
  const w = words(t);
  const s = new Set();
  for (let i = 0; i + N <= w.length; i += 1) s.add(w.slice(i, i + N).join(' '));
  return s;
};
// 라이선스 고지처럼 원래 같은 글이어야 하는 구간은 세지 않는다.
const ALLOW = [/copyright \(c\) 2026 morluto/];

const [src, ...rest] = process.argv.slice(2);
if (!src) {
  console.error('사용: node scripts/overlap-check.mjs <비교할 원본 텍스트 파일> [우리 파일 ...]');
  process.exit(2);
}
const up = fs.readFileSync(src, 'utf8');
const upGrams = grams(up);
const upLines = new Set(up.split('\n').map((l) => l.trim()).filter((l) => l.length >= 25));

let total = 0;
for (const f of rest.length ? rest : DEFAULTS) {
  const t = fs.readFileSync(f, 'utf8');
  const shared = [...grams(t)].filter((g) => upGrams.has(g) && !ALLOW.some((re) => re.test(g)));
  const lines = t.split('\n').map((l) => l.trim()).filter((l) => l.length >= 25 && upLines.has(l));
  total += shared.length + lines.length;
  if (shared.length + lines.length || rest.length) console.log(`${path.relative(ROOT, f)}: 겹치는 여섯 낱말 구간 ${shared.length}, 똑같은 줄 ${lines.length}`);
  shared.slice(0, 5).forEach((g) => console.log(`   ${g}`));
}
console.log(total ? `겹침 합계 ${total}. 위 구간을 내 말로 다시 쓰세요.` : `겹침 0 (파일 ${rest.length || DEFAULTS.length}개).`);
process.exit(total ? 1 : 0);
