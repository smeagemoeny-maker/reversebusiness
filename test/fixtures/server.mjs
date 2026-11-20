// 시험용 가게 사이트. 127.0.0.1 에서만 뜬다. 받은 요청을 모두 적어 둔다.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'site');
const page = (name) => fs.readFileSync(path.join(SITE, name), 'utf8');

export async function startSite({ robots = 'User-agent: *\nAllow: /\nDisallow: /private/\nDisallow: /api/\n', robotsStatus = 200, routes = {} } = {}) {
  const seen = [];
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    seen.push({ at: Date.now(), method: req.method, path: u.pathname, query: u.search, headers: req.headers });
    const html = (body, status = 200) => { res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'set-cookie': 'session=should-not-come-back; Path=/', server: 'fixture' }); res.end(body); };
    if (routes[u.pathname]) return routes[u.pathname](req, res, html);
    if (u.pathname === '/robots.txt') {
      res.writeHead(robotsStatus, { 'content-type': 'text/plain' });
      return res.end(robotsStatus === 200 ? robots : 'no');
    }
    if (u.pathname === '/spa' || u.pathname === '/spa-pricing') return html(page('spa.html'));
    if (u.pathname === '/shop') return html(page('shop.html'));
    if (u.pathname === '/shop.js') { res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' }); return res.end(page('shop-script.txt')); }
    if (u.pathname === '/spa.js') { res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'set-cookie': 'js=should-not-come-back; Path=/' }); return res.end(page('spa-script.txt')); }
    if (u.pathname === '/api/data') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"secret":"robots 가 막은 주소"}'); }
    if (u.pathname === '/') return html(page('index.html'));
    if (['/pricing', '/terms', '/refund'].includes(u.pathname)) return html(page(`${u.pathname.slice(1)}.html`));
    return html('<h1>없음</h1>', 404);
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { origin, seen, close: () => new Promise((ok) => server.close(ok)) };
}

// 가짜 시계: sleep 을 부르면 시간만 흐른다. 요청 사이 간격을 빨리 확인하려고 쓴다.
export function fakeClock() {
  let t = 1_700_000_000_000;
  const sleeps = [];
  return { now: () => t, sleep: async (ms) => { sleeps.push(ms); t += ms; }, tick: (ms) => { t += ms; }, sleeps };
}
