// 가벼운 수집기 시험. 내 컴퓨터의 시험용 사이트(127.0.0.1)만 읽는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startSite, fakeClock } from './fixtures/server.mjs';
import { collect, buildDraftFromPages, writeOutputs, parseRobots, rulesFor, isAllowed, neverOpen, normalizeUrl, readPage, LIMITS } from '../skill/reversebusiness/tools/collect.mjs';
import { findBrowser } from '../skill/reversebusiness/tools/render.mjs';
import { checkReport } from '../skill/reversebusiness/tools/check-report.mjs';
import { parseHtml, textOf, byTag, textLines } from '../skill/reversebusiness/tools/html-lite.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(ROOT, 'bin', 'rebiz.mjs');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'rebiz-test-'));
// 가짜 시계로 빨리 돌린다. 브라우저로 그려 읽는 시험은 따로 있으므로 여기서는 꺼 둔다.
// REA 도 여기서는 없는 것으로 둔다 (정밀 모드 시험은 따로 있고, 진짜 REA 는 시험에서 부르지 않는다).
const quick = (extra = {}) => { const c = fakeClock(); return { sleep: c.sleep, now: c.now, clock: c, render: 'off', rea: null, ...extra }; };
const runCli = (args, home) => new Promise((resolve) => {
  const child = spawn(process.execPath, [CLI, ...args], { env: { ...process.env, HOME: home, USERPROFILE: home, NO_COLOR: '1', REBIZ_REA: 'none', ...(home.__env || {}) } });
  let stdout = '';
  child.stdout.on('data', (d) => { stdout += d; });
  child.stderr.on('data', (d) => { stdout += d; });
  child.on('close', (status) => resolve({ status, stdout }));
});

test('robots.txt: 묶음 고르기, 가장 긴 규칙, 별표와 끝 표시', () => {
  const groups = parseRobots('User-agent: *\nDisallow: /private/\nAllow: /private/open\nDisallow: /*.pdf$\nCrawl-delay: 4\n\nUser-agent: rebiz\nDisallow: /only-me\n');
  const star = rulesFor(groups, 'someone-else');
  assert.equal(isAllowed(star.rules, '/'), true);
  assert.equal(isAllowed(star.rules, '/private/x'), false);
  assert.equal(isAllowed(star.rules, '/private/open/page'), true);
  assert.equal(isAllowed(star.rules, '/files/a.pdf'), false);
  assert.equal(isAllowed(star.rules, '/files/a.pdf?x=1'), true);
  assert.equal(star.delay, 4);
  const mine = rulesFor(groups, 'rebiz');
  assert.equal(mine.named, true);
  assert.equal(isAllowed(mine.rules, '/only-me/x'), false);
  assert.equal(isAllowed(mine.rules, '/private/x'), true, '내 이름을 부른 묶음이 있으면 그것만 따른다');
  assert.equal(isAllowed(rulesFor(parseRobots('User-agent: *\nDisallow:\n')).rules, '/anything'), true, '빈 Disallow 는 모두 허용');
});

test('주소 고르기: 로그인과 결제 주소는 열지 않는다', () => {
  for (const p of ['/login', '/signup', '/checkout', '/account/settings', '/cart', '/admin', '/ko/로그인', '/order.html']) assert.equal(neverOpen(p), true, p);
  for (const p of ['/pricing', '/terms', '/border', '/joinery', '/payback-guide', '/refund-policy']) assert.equal(neverOpen(p), false, p);
  assert.throws(() => normalizeUrl('ftp://example.com'), /http/);
  assert.throws(() => normalizeUrl('https://user:pw@example.com'), /비밀번호/);
  assert.equal(normalizeUrl('example.com/a#frag').href, 'https://example.com/a');
});

test('HTML 읽기: 숨긴 글과 스크립트는 건너뛴다', () => {
  const root = parseHtml('<html><body><p>보이는 <b>글</b></p><p hidden>숨긴 글</p><script>var a = "<p>스크립트</p>";</script><style>p{}</style><div style="display:none">안 보임</div><ul><li>하나<li>둘</ul></body></html>');
  const body = byTag(root, 'body')[0];
  assert.equal(textOf(body), '보이는 글 하나 둘');
  assert.deepEqual(textLines(body), ['보이는 글', '하나', '둘']);
});

test('한도 안에서 읽는다: robots 먼저, 최대 5장, GET 만, 쿠키 없음, 정직한 User-Agent', async () => {
  const site = await startSite();
  try {
    const c = await collect(`${site.origin}/`, { version: '9.9.9', ...quick() });
    assert.equal(c.stop, null);
    assert.equal(site.seen[0].path, '/robots.txt', 'robots.txt 를 가장 먼저 받는다');
    assert.deepEqual(site.seen.map((r) => r.path), ['/robots.txt', '/', '/pricing', '/terms', '/refund']);
    assert.ok(c.pages.length <= LIMITS.maxPages);
    assert.ok(site.seen.every((r) => r.method === 'GET'));
    assert.ok(site.seen.every((r) => !('cookie' in r.headers)), '받은 쿠키를 돌려보내지 않는다');
    assert.ok(site.seen.every((r) => !('authorization' in r.headers)));
    assert.match(site.seen[1].headers['user-agent'], /^rebiz\/9\.9\.9 \(\+https:\/\/github\.com\/smeagemoeny-maker\/reversebusiness/);
    const opened = site.seen.map((r) => r.path);
    for (const never of ['/login', '/signup', '/checkout', '/private/members', '/subscribe', '/newsletter']) assert.ok(!opened.includes(never), `${never} 를 열면 안 된다`);
  } finally { await site.close(); }
});

test('요청 사이 2초 이상, Crawl-delay 가 더 길면 그 값', async () => {
  const site = await startSite();
  try {
    const q = quick();
    const c = await collect(`${site.origin}/`, q);
    const starts = c.log.map((r) => Date.parse(r.started_at));
    for (let i = 1; i < starts.length; i += 1) assert.ok(starts[i] - starts[i - 1] >= 2000, `요청 ${i} 과 ${i + 1} 사이가 2초보다 짧다`);
    assert.equal(q.clock.sleeps.length, c.log.length - 1);
    assert.equal(LIMITS.delayMs, 2000);
  } finally { await site.close(); }
  const slow = await startSite({ robots: 'User-agent: *\nCrawl-delay: 7\n' });
  try {
    const q = quick();
    const c = await collect(`${slow.origin}/`, q);
    const starts = c.log.map((r) => Date.parse(r.started_at));
    assert.ok(starts[2] - starts[1] >= 7000, 'Crawl-delay 7초를 지킨다');
    assert.equal(c.delayMs, 7000);
  } finally { await slow.close(); }
});

test('robots.txt 가 막으면 페이지를 받지 않고 멈춘다', async () => {
  const site = await startSite();
  try {
    const c = await collect(`${site.origin}/private/members`, quick());
    assert.equal(c.pages.length, 0);
    assert.equal(c.stop.code, 'robots-disallow');
    assert.deepEqual(site.seen.map((r) => r.path), ['/robots.txt'], '막힌 주소로는 요청을 보내지 않는다');
  } finally { await site.close(); }
  const all = await startSite({ robots: 'User-agent: *\nDisallow: /\n' });
  try {
    const c = await collect(`${all.origin}/`, quick());
    assert.equal(c.stop.code, 'robots-disallow');
    assert.equal(all.seen.length, 1);
  } finally { await all.close(); }
});

test('robots.txt 응답에 따라: 403 과 5xx 는 멈춤, 404 는 규칙 없음', async () => {
  for (const [status, code] of [[403, 'robots-blocked'], [503, 'robots-unreachable']]) {
    const site = await startSite({ robotsStatus: status });
    try {
      const c = await collect(`${site.origin}/`, quick());
      assert.equal(c.stop.code, code);
      assert.equal(site.seen.length, 1);
    } finally { await site.close(); }
  }
  const none = await startSite({ robotsStatus: 404 });
  try {
    const c = await collect(`${none.origin}/`, quick());
    assert.equal(c.stop, null);
    assert.equal(c.robots.found, false);
    assert.ok(c.pages.length >= 1);
  } finally { await none.close(); }
});

test('페이지 한도: --pages 로 줄이면 그만큼만 받는다', async () => {
  const site = await startSite();
  try {
    const c = await collect(`${site.origin}/`, { maxPages: 2, ...quick() });
    assert.equal(c.pages.length, 2);
    assert.equal(site.seen.filter((r) => r.path !== '/robots.txt').length, 2);
    assert.ok(c.skipped.length >= 1);
    const many = await collect(`${site.origin}/`, { maxPages: 50, ...quick() });
    assert.ok(many.pages.length <= 5, '5장을 넘겨 달라고 해도 5장까지만');
  } finally { await site.close(); }
});

test('막힌 곳은 넘지 않는다: 403, 사람 확인 화면, 로그인으로 넘기기, 다른 사이트로 넘기기', async () => {
  const cases = [
    [{ '/': (req, res) => { res.writeHead(403); res.end('no'); } }, 'blocked'],
    [{ '/': (req, res, html) => html('<title>Just a moment...</title><p>Verify you are human</p>') }, 'challenge'],
    [{ '/': (req, res) => { res.writeHead(302, { location: '/login?next=/' }); res.end(); } }, 'login-wall'],
    [{ '/': (req, res) => { res.writeHead(302, { location: 'https://elsewhere.example/' }); res.end(); } }, 'offsite-redirect'],
  ];
  for (const [routes, code] of cases) {
    const site = await startSite({ routes });
    try {
      const c = await collect(`${site.origin}/`, quick());
      assert.equal(c.stop.code, code);
      assert.equal(c.pages.length, 0);
      assert.ok(site.seen.length <= 2, '멈춘 뒤에 더 요청하지 않는다');
    } finally { await site.close(); }
  }
});

test('초안: 본 것만 관찰, 나머지는 모름. 비밀 값과 연락처는 가린다', async () => {
  const site = await startSite();
  const dir = tmp();
  try {
    const c = await collect(`${site.origin}/?utm=private-campaign-77`, quick());
    const built = buildDraftFromPages(c, { today: '2026-11-17', version: '9.9.9' });
    writeOutputs(dir, c, built);
    const r = built.report;
    assert.equal(r.schema, 'rebiz/report@1');
    assert.equal(r.meta.draft, true);
    const { errors } = checkReport(r);
    assert.ok(errors.every((e) => /one_line|my_version/.test(e)), `초안에 남는 일은 한 줄 요약과 내 버전뿐이어야 한다: ${errors.join(' / ')}`);
    const price = r.sections.money.price;
    assert.equal(price[0].status, 'observed');
    assert.match(JSON.stringify(price), /8,900원/);
    assert.match(JSON.stringify(price), /2026-11-17 에 읽은 값/);
    assert.equal(r.sections.money.customer[0].status, 'unknown');
    assert.equal(r.sections.money.revenue.length, 0);
    const stage = Object.fromEntries(r.sections.flow.steps.map((s) => [s.stage, s.status]));
    assert.deepEqual(stage, { arrive: 'observed', first_value: 'unknown', signup: 'observed', payment: 'observed', return: 'observed' });
    assert.equal(r.sections.my_version.working_name, '');
    const roles = r.skeleton.blocks.map((b) => b.role);
    assert.ok(roles.includes('pay') && roles.includes('attract'), `층: ${roles.join(',')}`);
    // 뼈대에는 원본 문구가 없다
    assert.ok(!/퇴근길|따뜻한 저녁|된장/.test(JSON.stringify(r.skeleton)));
    const all = ['report.json', 'source.json', 'requests.json'].map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
    for (const secret of ['help@dalbit-dosirak.example', '02-555-0199', 'tok_should_never_be_copied', 'sk-abcdefghijklmnopqrstuvwxyz012345', 'private-campaign-77', 'secretcampaign123', 'should-not-come-back', 'G-TEST000']) assert.ok(!all.includes(secret), `${secret} 가 결과에 남아 있다`);
    assert.match(all, /\[이메일 가림\]/);
    const source = JSON.parse(fs.readFileSync(path.join(dir, 'source.json'), 'utf8'));
    assert.ok(source.texts.includes('퇴근길에 받는 따뜻한 저녁'), '겹침 검사용 원본 글은 source.json 에만 있다');
    assert.ok(source.brand.names.includes('달빛 도시락'));
    assert.ok(!fs.readFileSync(path.join(dir, 'report.json'), 'utf8').includes('숨긴 글'));
  } finally { await site.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('스크립트로 그리는 페이지는 그렇다고 적고 모름으로 둔다', () => {
  const p = readPage('<html><head><title>App</title><script src="/assets/index-abc123.js"></script></head><body><div id="root"></div></body></html>', 'https://app.example/');
  assert.equal(p.textLength, 0);
  const c = { pages: [{ ...p, kind: 'main', status: 200, headers: {}, truncated: false }], robots: { url: 'https://app.example/robots.txt', found: false, status: 404, allow: [], disallow: [], delay: null }, skipped: [], log: [{}, {}], delayMs: 2000 };
  const { report, thin } = buildDraftFromPages(c, { today: '2026-11-17' });
  assert.equal(thin, true);
  assert.equal(report.sections.money.price[0].status, 'unknown');
  assert.ok(report.sections.tech.items.some((t) => t.status === 'unknown' && /글이 0자로 적다/.test(t.text)));
  assert.deepEqual({ mode: report.meta.read.mode, thin: report.meta.read.thin, chars: report.meta.read.chars }, { mode: 'html', thin: true, chars: 0 });
  assert.equal(report.skeleton, undefined, '구역을 못 읽었으면 뼈대를 지어내지 않는다');
});

test('rebiz <주소>: 실제 시계로 끝까지 (요청 간격 실측, 화면 파일 생성)', async () => {
  const site = await startSite();
  const dir = tmp();
  try {
    const out = path.join(dir, 'out');
    // 서버가 같은 프로세스에 있으므로 자식 프로세스를 기다리는 동안 이벤트 루프를 막지 않는다.
    const run = await runCli([`${site.origin}/`, '--no-open', '--no-render', '--out', out, '--pages', '3'], dir);
    assert.equal(run.status, 0, run.stdout);
    assert.match(run.stdout, /해부 화면 {2}file:\/\//);
    assert.match(run.stdout, /페이지 3장 · 요청 4번/);
    for (let i = 1; i < site.seen.length; i += 1) assert.ok(site.seen[i].at - site.seen[i - 1].at >= 1950, `요청 사이 실측 ${site.seen[i].at - site.seen[i - 1].at}ms`);
    for (const f of ['report.json', 'report.html', 'source.json', 'requests.json']) assert.ok(fs.existsSync(path.join(out, f)), f);
    const html = fs.readFileSync(path.join(out, 'report.html'), 'utf8');
    assert.ok(html.includes('window.__REBIZ__'));
    assert.ok(!fs.existsSync(path.join(dir, '.claude')), '주소 해부는 에이전트 폴더를 만들지 않는다');
  } finally { await site.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('rebiz <주소>: robots 가 막으면 종료 코드 3', async () => {
  const site = await startSite({ robots: 'User-agent: *\nDisallow: /\n' });
  const dir = tmp();
  try {
    const run = await runCli([`${site.origin}/`, '--no-open', '--out', path.join(dir, 'out')], dir);
    assert.equal(run.status, 3, run.stdout);
    assert.match(run.stdout, /robots\.txt 가 이 주소를 막고 있어요/);
    assert.ok(!fs.existsSync(path.join(dir, 'out', 'report.json')));
    assert.equal(site.seen.length, 1);
  } finally { await site.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});


test('처음 넣은 주소가 로그인이나 결제 화면이면 아무것도 받지 않는다', async () => {
  const site = await startSite();
  try {
    for (const p of ['/login', '/checkout?plan=week', '/account/billing']) {
      const c = await collect(`${site.origin}${p}`, quick());
      assert.equal(c.stop.code, 'login-wall', p);
      assert.equal(c.pages.length, 0);
    }
    assert.equal(site.seen.length, 0, '요청을 하나도 보내지 않는다');
  } finally { await site.close(); }
});

test('이어 읽던 페이지가 막히면 남은 링크도 받지 않고 거기서 끝낸다', async () => {
  const site = await startSite({ routes: { '/pricing': (req, res) => { res.writeHead(429); res.end('slow down'); } } });
  try {
    const c = await collect(`${site.origin}/`, quick());
    assert.equal(c.pages.length, 1);
    assert.equal(c.stop.code, 'blocked');
    assert.deepEqual(site.seen.map((r) => r.path), ['/robots.txt', '/', '/pricing'], '막힌 뒤에는 약관과 환불 페이지를 받지 않는다');
    const { report } = buildDraftFromPages(c, { today: '2026-11-17' });
    assert.ok(report.sections.unknowns.some((u) => /받지 않은 페이지/.test(u.question)));
  } finally { await site.close(); }
});

test('robots.txt: 다르게 적은 같은 주소, 너무 긴 Crawl-delay, 다른 곳으로 넘기기, 사람 확인 화면', async () => {
  const rules = rulesFor(parseRobots('User-agent: *\nDisallow: /private\nDisallow: /a%2fb\n')).rules;
  assert.equal(isAllowed(rules, '/%70rivate/x'), false, '%70 은 p 와 같다');
  assert.equal(isAllowed(rules, '/a%2Fb'), false, '%2f 와 %2F 는 같다');
  assert.equal(isAllowed(rules, '/public'), true);
  const cases = [
    [{ robots: 'User-agent: *\nCrawl-delay: 45\n' }, null, 45000],
    [{ robots: 'User-agent: *\nCrawl-delay: 600\n' }, 'crawl-delay-too-long'],
    [{ routes: { '/robots.txt': (req, res) => { res.writeHead(301, { location: 'https://elsewhere.example/robots.txt' }); res.end(); } } }, 'robots-unreachable'],
    [{ routes: { '/robots.txt': (req, res) => { res.writeHead(302, { location: '/login' }); res.end(); } } }, 'robots-unreachable'],
    [{ routes: { '/robots.txt': (req, res, html) => html('<title>Just a moment...</title><p>Verify you are human</p>') } }, 'challenge'],
    [{ routes: { '/robots.txt': (req, res, html) => html('<!doctype html><html><head><title>앱</title></head><body><div id="root"></div></body></html>') } }, null, 2000],
  ];
  for (const [opts, code, delay] of cases) {
    const site = await startSite(opts);
    try {
      const c = await collect(`${site.origin}/`, quick());
      if (code) {
        assert.equal(c.stop && c.stop.code, code);
        assert.equal(c.pages.length, 0);
        assert.equal(site.seen.filter((r) => r.path !== '/robots.txt').length, 0, `${code}: 페이지를 받으면 안 된다`);
      } else {
        assert.equal(c.stop, null);
        assert.equal(c.delayMs, delay);
        assert.ok(c.pages.length >= 1);
      }
    } finally { await site.close(); }
  }
});

test('아주 깊게 겹친 HTML 도 멈추지 않고 읽는다', () => {
  const deep = `<html><body>${'<div>'.repeat(20000)}깊은 글${'</div>'.repeat(20000)}<p>끝 2,000원</p></body></html>`;
  const p = readPage(deep, 'https://deep.example/');
  assert.ok(p.lines.includes('깊은 글'));
  assert.deepEqual(p.prices, ['2,000원']);
});

// ---------- 0.3.1: 그려진 화면 읽기, 소유 관계, 약관 상태, 얇은 결과 ----------
const BROWSER = findBrowser();

test('얇은 페이지: 브라우저로 한 번 그려 읽으면 가격과 누르는 곳이 관찰된다', { skip: BROWSER ? false : '이 컴퓨터에 Chrome 계열 브라우저가 없어 건너뜀' }, async () => {
  const site = await startSite();
  try {
    const c = await collect(`${site.origin}/spa`, quick({ render: 'auto', version: '9.9.9' }));
    assert.equal(c.stop, null);
    assert.equal(c.render.mode, 'used');
    assert.ok(c.render.closed.exited && c.render.closed.profileRemoved, '브라우저를 끄고 임시 프로필을 지운다');
    const main = c.pages[0];
    assert.equal(main.rendered, true);
    assert.equal(main.plainTextLength, 0, '받은 HTML 에는 글이 없었다');
    assert.ok(main.textLength > 100);
    assert.deepEqual(main.prices, ['12,900원', '3,000원']);
    assert.deepEqual(main.signup, ['회원가입']);
    assert.deepEqual(main.pay, ['구독 신청하기']);
    // 구역의 길이는 브라우저에서 잰 값
    assert.deepEqual(main.skeleton.map((b) => [b.kind, b.weight]), [['nav', 70], ['media', 620], ['price', 420], ['list', 900], ['faq', 300], ['footer', 160]]);
    // 순서: robots, 받은 HTML, 그다음에야 브라우저
    assert.deepEqual(site.seen.slice(0, 2).map((r) => r.path), ['/robots.txt', '/spa']);
    const viaBrowser = site.seen.filter((r) => /HeadlessChrome/.test(r.headers['user-agent']));
    assert.ok(viaBrowser.length >= 2);
    assert.ok(viaBrowser.every((r) => /rebiz\/9\.9\.9 \(\+https:\/\/github\.com\/smeagemoeny-maker\/reversebusiness\)$/.test(r.headers['user-agent'])), '브라우저로 읽을 때도 이름을 밝힌다');
    // 브라우저 안에서도 같은 선
    assert.ok(site.seen.every((r) => r.method === 'GET'), 'GET 이 아닌 요청은 내보내지 않는다');
    for (const never of ['/api/data', '/collect', '/login', '/signup', '/newsletter']) assert.ok(!site.seen.some((r) => r.path === never), `${never} 로 요청이 나가면 안 된다`);
    assert.ok(site.seen.every((r) => !('cookie' in r.headers)), '받은 쿠키를 돌려보내지 않는다');
    assert.ok(c.render.why['GET 이 아닌 요청'] >= 1 && c.render.why['robots.txt 금지'] >= 1);
    assert.ok(c.pages.length <= 5);
    assert.deepEqual(c.pages.map((p) => p.kind), ['main', 'pricing', 'terms', 'refund']);
    const starts = c.log.map((r) => Date.parse(r.started_at));
    for (let i = 1; i < starts.length; i += 1) assert.ok(starts[i] - starts[i - 1] >= 2000, '그려 읽을 때도 요청 사이 2초');
    const { report, thin } = buildDraftFromPages(c, { today: '2026-11-17', version: '9.9.9' });
    assert.equal(report.meta.read.mode, 'rendered');
    assert.equal(report.meta.read.html_chars, 0);
    assert.equal(thin, true, '시험용 페이지는 그린 뒤에도 글이 적다');
    assert.equal(report.sections.money.price[0].status, 'observed');
    assert.match(report.sections.money.price[0].text, /12,900원/);
    assert.ok(report.sections.tech.items.some((t) => t.layer === '그리는 방식' && t.status === 'observed' && /0자였고/.test(t.text)));
    assert.ok(report.sections.tech.items.some((t) => t.layer === '브라우저 안에서 거른 요청' && t.status === 'observed'));
    assert.match(report.skeleton.note, /잰 뼈대/);
    assert.match(report.meta.scope, /헤드리스 브라우저/);
    assert.ok(!/아침마다|반찬 세 가지|멸치/.test(JSON.stringify(report.skeleton)), '뼈대에는 원본 문구가 없다');
  } finally { await site.close(); }
});

test('그려 읽기: robots 가 막으면 브라우저를 띄우지 않고, 로그인으로 넘기는 스크립트는 따라가지 않는다', { skip: BROWSER ? false : '브라우저 없음' }, async () => {
  const blocked = await startSite({ robots: 'User-agent: *\nDisallow: /spa\n' });
  try {
    const c = await collect(`${blocked.origin}/spa`, quick({ render: 'force' }));
    assert.equal(c.stop.code, 'robots-disallow');
    assert.deepEqual(blocked.seen.map((r) => r.path), ['/robots.txt']);
    assert.equal(c.render.pages, 0);
  } finally { await blocked.close(); }
  const jump = await startSite({ routes: { '/jump': (req, res, html) => html('<!doctype html><html><head><title>넘기기</title></head><body><p>잠시만요</p><script>location.href = "/login?next=/jump";</script></body></html>') } });
  try {
    const c = await collect(`${jump.origin}/jump`, quick({ render: 'auto' }));
    assert.ok(!jump.seen.some((r) => r.path === '/login'), '로그인 주소는 브라우저 안에서도 열지 않는다');
    assert.ok(c.render.why['로그인이나 결제 주소'] >= 1);
  } finally { await jump.close(); }
});

test('브라우저가 없거나 --no-render 면 얇은 결과와 다음에 할 일을 알려 준다', async () => {
  const site = await startSite();
  try {
    const none = await collect(`${site.origin}/spa`, quick({ render: 'auto', browser: null }));
    assert.equal(none.render.mode, 'unavailable');
    const a = buildDraftFromPages(none, { today: '2026-11-17' });
    assert.equal(a.thin, true);
    assert.match(a.read.note, /읽은 글이 0자뿐이라 모름이 많다.*브라우저.*찾지 못해/);
    assert.match(a.read.next, /Chrome 계열 브라우저가 있는 컴퓨터에서 다시 실행하거나, REA/);
    assert.equal(a.report.sections.money.price[0].status, 'unknown');
    const off = await collect(`${site.origin}/spa`, quick());
    assert.equal(off.render.mode, 'off');
    assert.match(buildDraftFromPages(off, { today: '2026-11-17' }).read.next, /--no-render 를 빼고/);
    assert.ok(site.seen.every((r) => !/HeadlessChrome/.test(r.headers['user-agent'])));
  } finally { await site.close(); }
});

test('약관 상태와 소유 관계: robots 만 확인했으면 checked 가 아니다, --own 이면 내 것', async () => {
  const site = await startSite();
  try {
    const c = await collect(`${site.origin}/`, quick());
    const third = buildDraftFromPages(c, { today: '2026-11-17' }).report;
    assert.equal(third.meta.terms.status, 'robots-only');
    assert.match(third.meta.terms.note, /조항은 아직 읽지 않았다/);
    assert.ok(checkReport(third).warnings.some((w) => /robots\.txt 까지만 확인/.test(w)));
    const own = buildDraftFromPages(c, { today: '2026-11-17', relation: 'own' }).report;
    assert.equal(own.meta.target.relation, 'own');
    assert.equal(own.meta.terms.status, 'not-applicable');
    assert.ok(checkReport(own).errors.every((e) => /one_line|my_version/.test(e)));
  } finally { await site.close(); }
  const bare = await startSite({ robotsStatus: 404, routes: { '/': (req, res, html) => html('<html><head><title>가게</title></head><body><h1>시험용 가게</h1><p>한 끼 5,000원</p></body></html>') } });
  try {
    const c = await collect(`${bare.origin}/`, quick());
    assert.equal(buildDraftFromPages(c, { today: '2026-11-17' }).report.meta.terms.status, 'not-found');
  } finally { await bare.close(); }
});

test('rebiz <주소> --own: 그려 읽고 내 것으로 적는다 (실제 시계)', { skip: BROWSER ? false : '브라우저 없음' }, async () => {
  const site = await startSite();
  const dir = tmp();
  try {
    const out = path.join(dir, 'out');
    const run = await runCli([`${site.origin}/spa`, '--no-open', '--own', '--pages', '1', '--out', out], dir);
    assert.equal(run.status, 0, run.stdout);
    assert.match(run.stdout, /그려서 읽기:/);
    assert.match(run.stdout, /그려 읽기 .* 임시 프로필로 1장\. 브라우저를 끄고 프로필을 지웠습니다/);
    assert.match(run.stdout, /내 것으로 적습니다 \(--own\)/);
    assert.match(run.stdout, /다음 {2}rebiz fill \S*report\.json/, '끝에 다음에 칠 명령을 알려 준다');
    const r = JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8'));
    assert.equal(r.meta.target.relation, 'own');
    assert.equal(r.meta.read.mode, 'rendered');
    assert.match(JSON.stringify(r.sections.money.price), /12,900원/);
    const q = JSON.parse(fs.readFileSync(path.join(out, 'requests.json'), 'utf8'));
    assert.equal(q.render.mode, 'used');
    assert.ok(!fs.readdirSync(out).some((f) => /\.(png|jpe?g|webp)$/i.test(f)), '화면 캡처를 저장하지 않는다');
    const off = await runCli([`${site.origin}/spa`, '--no-open', '--no-render', '--pages', '1', '--out', path.join(dir, 'off')], dir);
    assert.match(off.stdout, /얇은 결과 {2}읽은 글이 0자뿐이라 모름이 많다/);
    assert.match(off.stdout, /다음 {7}--no-render 를 빼고 다시 실행/);
  } finally { await site.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
