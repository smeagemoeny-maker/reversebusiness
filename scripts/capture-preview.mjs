#!/usr/bin/env node
// 개발용: 내 버전 페이지(내 컴퓨터의 파일)를 한 장으로 찍고, 리포트의 뼈대가 가리키는 구역의 위치를 잰다.
// 결과: <내 버전 폴더>.preview.jpg 와 <내 버전 폴더>.preview.json. 해부 화면의 영상 저장이 이것을 쓴다.
// 사용: node scripts/capture-preview.mjs <내 버전 폴더> --report <report.json> [--width 1100]
// Chrome 이 필요하다. Node 22 이상, 또는 node --experimental-websocket.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchChrome, openPage } from './lib/chrome.mjs';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--report' && args[args.indexOf(a) - 1] !== '--width');
const reportFile = args.includes('--report') ? args[args.indexOf('--report') + 1] : '';
const width = args.includes('--width') ? Number(args[args.indexOf('--width') + 1]) : 1100;
if (!dir || !reportFile) { console.error('사용: node scripts/capture-preview.mjs <내 버전 폴더> --report <report.json> [--width 1100]'); process.exit(2); }
const root = path.resolve(dir);
const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
const selectors = [...new Set(((report.skeleton || {}).blocks || []).map((b) => b.mine).filter(Boolean))];
const chrome = await launchChrome();
try {
  const page = await openPage(chrome.endpoint);
  await page.viewport({ width, height: 900 });
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href, 1000);
  const m = await page.evaluate(`(() => {
    const h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const rects = {};
    for (const sel of ${JSON.stringify(selectors)}) {
      const n = document.querySelector(sel);
      if (!n) continue;
      const r = n.getBoundingClientRect();
      rects[sel] = [Number(((r.top + scrollY) / h).toFixed(4)), Number(((r.top + scrollY + r.height) / h).toFixed(4))];
    }
    return { h, rects };
  })()`);
  const base = root.replace(/[\\/]+$/, '');
  await page.shot(`${base}.preview.jpg`, { clip: { x: 0, y: 0, width, height: m.h }, format: 'jpeg', quality: 72 });
  fs.writeFileSync(`${base}.preview.json`, `${JSON.stringify({ width, height: m.h, rects: m.rects }, null, 2)}\n`);
  console.log(`${path.basename(base)}.preview.jpg  ${width}x${m.h}  (${Math.round(fs.statSync(`${base}.preview.jpg`).size / 1024)} KB)`);
  console.log(`잰 구역 ${Object.keys(m.rects).length}/${selectors.length}`);
  await page.close();
} finally { await chrome.close(); }
