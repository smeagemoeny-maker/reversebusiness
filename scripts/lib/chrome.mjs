// 개발용: 내 컴퓨터의 Chrome 을 임시 프로필로 띄워 내 파일을 찍고 재는 도우미. 의존성 없음.
// 남의 사이트를 여는 데 쓰지 않는다. file:// 과 127.0.0.1 주소만 받는다.
// Node 22 이상, 또는 Node 20 에서 node --experimental-websocket 로 실행한다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
].filter(Boolean);

const freePort = () => new Promise((ok, no) => {
  const s = net.createServer();
  s.once('error', no);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)); });
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export { wait };

export async function launchChrome({ args = [] } = {}) {
  if (typeof WebSocket === 'undefined') throw new Error('WebSocket 이 없어요. Node 22 이상으로 실행하거나 node --experimental-websocket 을 붙여 주세요.');
  const bin = CANDIDATES.find((p) => fs.existsSync(p));
  if (!bin) throw new Error('Chrome 을 찾지 못했어요. CHROME_PATH 로 실행 파일 위치를 알려 주세요.');
  const port = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'rebiz-chrome-'));
  const proc = spawn(bin, [
    '--headless=new', `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    ...args, 'about:blank',
  ], { stdio: 'ignore' });
  const endpoint = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i += 1) {
    try { const r = await fetch(`${endpoint}/json/version`); if (r.ok) break; } catch { /* 아직 뜨는 중 */ }
    await wait(250);
  }
  return {
    endpoint, pid: proc.pid,
    async close() {
      try { process.kill(proc.pid); } catch { /* 이미 끝남 */ }
      await wait(400);
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* 남아도 임시 폴더 */ }
    },
  };
}

const LOCAL = /^(file:\/\/|about:blank$|http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$))/;
export async function openPage(endpoint, url = 'about:blank') {
  if (!LOCAL.test(url)) throw new Error('내 컴퓨터의 파일이나 로컬 주소만 열어요.');
  const tab = await (await fetch(`${endpoint}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
  let seq = 0;
  const pending = new Map();
  const handlers = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { ok, no } = pending.get(m.id); pending.delete(m.id); m.error ? no(new Error(m.error.message)) : ok(m.result); return; }
    for (const h of handlers) h(m);
  };
  const send = (method, params = {}) => new Promise((ok, no) => { const id = ++seq; pending.set(id, { ok, no }); ws.send(JSON.stringify({ id, method, params })); });
  const page = {
    send,
    on: (fn) => handlers.push(fn),
    async goto(u, ms = 1200) { if (!LOCAL.test(u)) throw new Error('내 컴퓨터의 파일이나 로컬 주소만 열어요.'); await send('Page.navigate', { url: u }); await wait(ms); },
    async evaluate(expression) {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text);
      return r.result.value;
    },
    async viewport({ width, height, scale = 1, mobile = false }) { await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile }); },
    async shot(file, { clip, full = false, format = 'png', quality } = {}) {
      let c = clip;
      if (full) { const m = await send('Page.getLayoutMetrics'); c = { x: 0, y: 0, width: m.cssContentSize.width, height: Math.min(Math.ceil(m.cssContentSize.height), 16000), scale: 1 }; }
      const r = await send('Page.captureScreenshot', { format, ...(quality ? { quality } : {}), captureBeyondViewport: !!c, ...(c ? { clip: { scale: 1, ...c } } : {}) });
      fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
      return file;
    },
    async close() { try { ws.close(); } catch { /* 닫힘 */ } try { await fetch(`${endpoint}/json/close/${tab.id}`); } catch { /* 닫힘 */ } },
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Log.enable');
  if (url !== 'about:blank') await page.goto(url);
  return page;
}
