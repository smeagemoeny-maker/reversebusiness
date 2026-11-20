#!/usr/bin/env node
// 개발용: README 에 쓰는 그림을 다시 만든다. 예시 해부 화면을 Chrome 으로 열어 찍는다.
// 사용: node scripts/make-figures.mjs [--gif]
// Chrome 이 필요하다 (Node 22 이상, 또는 node --experimental-websocket). --gif 는 ffmpeg 도 필요하다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launchChrome, openPage, wait } from './lib/chrome.mjs';
import { buildView } from '../skill/reversebusiness/tools/build-view.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EX = path.join(ROOT, 'examples', 'aicitybuilders-vibecoding');
const DOCS = path.join(ROOT, 'docs');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rebiz-fig-'));
fs.mkdirSync(DOCS, { recursive: true });

// 1. 예시 해부 화면 (저장소에도 한 벌 둔다)
const html = buildView(path.join(EX, 'report.json'), path.join(EX, 'report.html'), { mine: path.join(EX, 'my-version') });
console.log(`examples/aicitybuilders-vibecoding/report.html  ${Math.round(fs.statSync(html).size / 1024)} KB`);

// 2. 구조 비교 그림: 왼쪽은 원본의 뼈대(선으로만), 오른쪽은 내 버전. 원본의 화면은 쓰지 않는다.
function compareSvg() {
  const report = JSON.parse(fs.readFileSync(path.join(EX, 'report.json'), 'utf8'));
  const prev = JSON.parse(fs.readFileSync(path.join(EX, 'my-version.preview.json'), 'utf8'));
  const img = fs.readFileSync(path.join(EX, 'my-version.preview.jpg')).toString('base64');
  const blocks = report.skeleton.blocks;
  const total = blocks.reduce((a, b) => a + b.weight, 0);
  const W = 1600, top = 190, colW = 440, gut = 520, H0 = 1790;
  const xa = 60, xb = xa + colW + gut;
  const mineH = colW * prev.height / prev.width;
  const scaleA = H0 / total;
  const C = { attract: '#EBE2D2', value: '#B9B1A3', pay: '#D6892A', return: '#F2B45A', other: '#8A8478' };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let y = top, n = 0, out = '';
  for (const b of blocks) {
    const h = b.weight * scaleA, col = C[b.role] || C.other, taken = b.taken !== false && b.mine && prev.rects[b.mine];
    out += `<rect x="${xa}" y="${y.toFixed(1)}" width="${colW}" height="${h.toFixed(1)}" fill="${b.role === 'pay' ? 'rgba(214,137,42,0.12)' : 'rgba(235,226,210,0.03)'}" stroke="${col}" stroke-width="${b.role === 'pay' ? 2 : 1.3}"${taken ? '' : ' stroke-dasharray="6 6"'}/>`;
    const lines = Math.max(1, Math.min(6, Math.floor(h / 34)));
    for (let i = 0; i < lines; i += 1) out += `<line x1="${xa + 28}" y1="${(y + (h * (i + 1)) / (lines + 1)).toFixed(1)}" x2="${xa + 28 + (colW - 56) * (i % 2 ? 0.55 : 0.82)}" y2="${(y + (h * (i + 1)) / (lines + 1)).toFixed(1)}" stroke="${col}" stroke-opacity="0.38" stroke-width="1"/>`;
    const ym = y + h / 2;
    if (taken) {
      n += 1;
      const [m0, m1] = prev.rects[b.mine];
      const yb0 = top + m0 * mineH, yb1 = top + m1 * mineH, ymb = (yb0 + yb1) / 2;
      out += `<rect x="${xb}" y="${yb0.toFixed(1)}" width="${colW}" height="${(yb1 - yb0).toFixed(1)}" fill="none" stroke="${col}" stroke-width="1.6"/>`;
      out += `<path d="M${xa + colW + 6} ${ym.toFixed(1)} H${xa + colW + 44} L${xb - 44} ${ymb.toFixed(1)} H${xb - 6}" fill="none" stroke="${col}" stroke-opacity="0.75" stroke-width="1.4"/>`;
      out += `<rect x="${xa + colW + 56}" y="${(ym - 17).toFixed(1)}" width="${44 + b.name.length * 19}" height="34" fill="#07080A"/>`;
      out += `<text x="${xa + colW + 62}" y="${(ym + 6).toFixed(1)}" font-family="'SF Mono', Menlo, monospace" font-size="15" fill="${col}">${String(n).padStart(2, '0')}</text>`;
      out += `<text x="${xa + colW + 92}" y="${(ym + 6).toFixed(1)}" font-size="18" fill="#EBE2D2">${esc(b.name)}</text>`;
    } else {
      out += `<line x1="${xa + colW + 6}" y1="${ym.toFixed(1)}" x2="${xa + colW + 44}" y2="${ym.toFixed(1)}" stroke="#8A8478" stroke-width="1.2" stroke-dasharray="4 4"/>`;
      out += `<text x="${xa + colW + 56}" y="${(ym + 6).toFixed(1)}" font-size="16" fill="#8A8478">${esc(b.name)} (가져오지 않음)</text>`;
    }
    y += h;
  }
  const H = Math.ceil(Math.max(top + H0, top + mineH) + 90);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" font-weight="300">
<rect width="${W}" height="${H}" fill="#07080A"/>
<rect x="60" y="56" width="3" height="20" fill="#D6892A"/>
<text x="76" y="72" font-family="'SF Mono', Menlo, monospace" font-size="14" letter-spacing="4" fill="#EBE2D2">REVERSE BUSINESS</text>
<text x="60" y="130" font-size="44" font-weight="200" fill="#EBE2D2">구조 비교</text>
<text x="330" y="128" font-size="19" fill="#B9B1A3">배운 것: 구역의 순서와 가격 상자의 짜임.  새로 만든 것: 주제, 문구, 이름, 색, 글꼴, 그림 전부.</text>
<text x="${xa}" y="${top - 16}" font-family="'SF Mono', Menlo, monospace" font-size="13" letter-spacing="3" fill="#8A8478">원본의 뼈대 (화면 캡처 없음)</text>
<text x="${xb}" y="${top - 16}" font-family="'SF Mono', Menlo, monospace" font-size="13" letter-spacing="3" fill="#F2B45A">내 버전 (가상의 예시)</text>
<image x="${xb}" y="${top}" width="${colW}" height="${mineH.toFixed(1)}" preserveAspectRatio="none" xlink:href="data:image/jpeg;base64,${img}"/>
${out}
<text x="${W - 60}" y="${H - 36}" text-anchor="end" font-family="'SF Mono', Menlo, monospace" font-size="13" letter-spacing="2" fill="#8A8478">reversebusiness · CONNECT AI LAB</text>
</svg>`;
}
const svgFile = path.join(work, 'compare.svg');
const svg = compareSvg();
fs.writeFileSync(svgFile, svg);
const size = /width="(\d+)" height="(\d+)"/.exec(svg);

const chrome = await launchChrome();
try {
  const page = await openPage(chrome.endpoint);
  await page.viewport({ width: Number(size[1]), height: 900 });
  await page.goto(pathToFileURL(svgFile).href, 800);
  await page.shot(path.join(EX, 'structure-compare.png'), { clip: { x: 0, y: 0, width: Number(size[1]), height: Number(size[2]) } });
  console.log(`examples/aicitybuilders-vibecoding/structure-compare.png  ${size[1]}x${size[2]}`);

  // 3. README 그림
  const rectOf = (sel) => page.evaluate(`(() => { const n = document.querySelector(${JSON.stringify(sel)}); n.scrollIntoView({ block: 'start' }); const r = n.getBoundingClientRect(); return { x: Math.max(0, r.left + scrollX), y: r.top + scrollY, width: r.width, height: r.height }; })()`);
  await page.viewport({ width: 1632, height: 1000 });
  await page.goto(pathToFileURL(html).href, 1500);
  await page.evaluate('RebizSections.state().player.seek(RebizStage.STILL)');
  await wait(200);
  await page.shot(path.join(DOCS, 'hero.png'), { clip: await rectOf('#stage') });
  await page.shot(path.join(DOCS, 'flow.png'), { clip: await rectOf('#show-flow') });
  await page.evaluate("(() => { const r = document.getElementById('cmp-range'); r.value = 100; r.dispatchEvent(new Event('input')); })()");
  await wait(300);
  await page.shot(path.join(DOCS, 'compare.png'), { clip: await rectOf('#show-cmp') });
  console.log('docs/hero.png, flow.png, compare.png');

  if (process.argv.includes('--gif')) {
    // 해부 장면을 한 장씩 찍어 GIF 로 묶는다 (읽기부터 내 버전까지).
    await page.viewport({ width: 960, height: 1400 });
    await page.goto(pathToFileURL(html).href, 1200);
    const clip = await rectOf('#stage');
    const fps = 8, from = 2.7, to = 26.4;
    let i = 0;
    for (let t = from; t <= to; t += 1 / fps) {
      await page.evaluate(`RebizSections.state().player.seek(${t.toFixed(3)})`);
      await page.shot(path.join(work, `f_${String(i).padStart(4, '0')}.png`), { clip });
      i += 1;
    }
    const gif = path.join(DOCS, 'hero.gif');
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i', path.join(work, 'f_%04d.png'), '-vf', 'scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle', gif], { stdio: 'inherit' });
    if (r.status === 0) console.log(`docs/hero.gif  ${i}장, ${(fs.statSync(gif).size / 1048576).toFixed(2)} MB`);
    else console.log('ffmpeg 를 실행하지 못해 GIF 는 만들지 않았어요.');
  }
  await page.close();
} finally { await chrome.close(); fs.rmSync(work, { recursive: true, force: true }); }
