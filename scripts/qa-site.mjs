#!/usr/bin/env node
// 개발용 검수: 내 컴퓨터의 정적 페이지(예: rebiz build 가 만든 폴더)를 Chrome 으로 열어 넓은 화면과 폰 너비를 찍고,
// 가로 넘침, 콘솔 오류, 바깥 요청을 확인한다.
// 사용: node scripts/qa-site.mjs <폴더 또는 html 파일> --out <폴더>
// Chrome 이 필요하다. Node 22 이상, 또는 node --experimental-websocket.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchChrome, openPage } from './lib/chrome.mjs';

const args = process.argv.slice(2);
const target = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
const out = path.resolve(args.includes('--out') ? args[args.indexOf('--out') + 1] : 'qa-out');
if (!target) { console.error('사용: node scripts/qa-site.mjs <폴더 또는 html 파일> --out <폴더>'); process.exit(2); }
const file = fs.statSync(target).isDirectory() ? path.join(target, 'index.html') : target;
fs.mkdirSync(out, { recursive: true });
const url = pathToFileURL(path.resolve(file)).href;
const result = { file: path.basename(file), console_errors: [], outside_requests: [], shots: [] };
const chrome = await launchChrome();
try {
  for (const view of [{ name: 'desktop', width: 1440, height: 900, scale: 1, mobile: false }, { name: 'phone', width: 390, height: 844, scale: 2, mobile: true }]) {
    const page = await openPage(chrome.endpoint);
    page.on((m) => {
      if (m.method === 'Runtime.exceptionThrown') result.console_errors.push(`${view.name}: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') result.console_errors.push(`${view.name}: ${m.params.args.map((a) => a.value ?? a.description).join(' ')}`);
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') result.console_errors.push(`${view.name}: ${m.params.entry.text}`);
      if (m.method === 'Network.requestWillBeSent' && !/^(file:|data:|blob:|about:)/.test(m.params.request.url)) result.outside_requests.push(`${view.name}: ${m.params.request.url}`);
    });
    await page.viewport(view);
    await page.goto(url, 1200);
    for (const [name, opts] of [['first', {}], ['full', { full: true }]]) { const f = path.join(out, `${view.name}_${name}.png`); await page.shot(f, opts); result.shots.push(path.basename(f)); }
    result[`${view.name}_overflow_px`] = await page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth');
    result[`${view.name}_height_px`] = await page.evaluate('document.documentElement.scrollHeight');
    // 화면 밖으로 삐져나간 요소가 있으면 몇 개인지
    result[`${view.name}_wide_elements`] = await page.evaluate('[...document.querySelectorAll("body *")].filter((n) => n.getBoundingClientRect().right > document.documentElement.clientWidth + 1).length');
    await page.close();
  }
} finally { await chrome.close(); }
fs.writeFileSync(path.join(out, 'qa.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
process.exit(result.console_errors.length || result.outside_requests.length || result.desktop_overflow_px > 0 || result.phone_overflow_px > 0 ? 1 : 0);
