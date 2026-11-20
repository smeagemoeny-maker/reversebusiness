#!/usr/bin/env node
// 개발용 검수: 해부 화면(내 컴퓨터의 report.html)을 Chrome 으로 열어 캡처, 콘솔 오류, 바깥 요청, 영상 저장을 확인한다.
// 사용: node scripts/qa-viewer.mjs <report.html> --out <폴더> [--video] [--frames]
// Chrome 이 필요하다. Node 22 이상, 또는 node --experimental-websocket.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchChrome, openPage, wait } from './lib/chrome.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--out');
const out = path.resolve(args.includes('--out') ? args[args.indexOf('--out') + 1] : 'qa-out');
if (!file) { console.error('사용: node scripts/qa-viewer.mjs <report.html> --out <폴더> [--video] [--frames]'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const url = pathToFileURL(path.resolve(file)).href;
const result = { file: path.basename(file), console_errors: [], outside_requests: [], shots: [], video: null };
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
    await page.goto(url, 1500);
    const shot = async (name, opts) => { const f = path.join(out, `${view.name}_${name}.png`); await page.shot(f, opts); result.shots.push(path.basename(f)); };
    const rectOf = (sel) => page.evaluate(`(() => { const n = document.querySelector(${JSON.stringify(sel)}); n.scrollIntoView({ block: 'start' }); const r = n.getBoundingClientRect(); return { x: Math.max(0, r.left + scrollX), y: r.top + scrollY, width: r.width, height: r.height }; })()`);
    await shot('first', {});
    // 해부 장면: 장면마다 한 장
    const times = args.includes('--frames') ? [1.4, 4.6, 7.8, 11.8, 14.7, 19.0, 21.0, 24.4, 26.2, 28.6] : [14.7];
    for (const t of times) {
      await page.evaluate(`RebizSections.state().player.seek(${t})`);
      await wait(150);
      await shot(`stage_${String(t).replace('.', '_')}`, { clip: await rectOf('#stage') });
    }
    await page.evaluate('RebizSections.state().player.seek(RebizStage.STILL)');
    await shot('flow', { clip: await rectOf('#show-flow') });
    for (const v of [0, 55, 100]) {
      await page.evaluate(`(() => { const r = document.getElementById('cmp-range'); r.value = ${v}; r.dispatchEvent(new Event('input')); })()`);
      await wait(200);
      await shot(`compare_${v}`, { clip: await rectOf('#show-cmp') });
    }
    await page.evaluate('window.scrollTo(0, 0)');
    await shot('full', { full: true });
    result[`${view.name}_overflow_px`] = await page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth');
    if (view.name === 'desktop' && args.includes('--video')) {
      await page.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: out });
      await page.evaluate('window.scrollTo(0, 0)');
      const can = await page.evaluate('RebizStage.canRecord()');
      if (!can) result.video = { ok: false, why: 'unsupported' };
      else {
        await page.evaluate("document.getElementById('stage-save').click()");
        let info = null;
        for (let i = 0; i < 90 && !info; i += 1) { await wait(500); info = await page.evaluate('window.__rebizLastVideo || null'); }
        await wait(1500);
        result.video = info ? { ok: true, ...info, path: path.join(out, info.name), message: await page.evaluate("document.getElementById('stage-msg').textContent") } : { ok: false, why: 'timeout', message: await page.evaluate("document.getElementById('stage-msg').textContent") };
      }
    }
    await page.close();
  }
} finally { await chrome.close(); }
fs.writeFileSync(path.join(out, 'qa.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
process.exit(result.console_errors.length || result.outside_requests.length ? 1 : 0);
