// REA 를 확인을 받고 함께 설치하기, 정밀 모드(겉, 흐름, 속), 코드 흔적 등급.
// 진짜 REA 와 npm 은 시험에서 부르지 않는다. REA 자리에 대역(fixtures/fake-rea.cjs)을 쓴다. 임시 HOME 과 내 컴퓨터의 시험용 사이트만 쓴다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startSite, fakeClock } from './fixtures/server.mjs';
import { collect, buildDraftFromPages } from '../skill/reversebusiness/tools/collect.mjs';
import { checkReport } from '../skill/reversebusiness/tools/check-report.mjs';
import { buildDraft } from '../skill/reversebusiness/tools/from-rea.mjs';
import { findBrowser } from '../skill/reversebusiness/tools/render.mjs';
import { REA_PACKAGE, nodeOk, findRea, reaRunner, reaInstaller } from '../skill/reversebusiness/tools/rea-bridge.mjs';
import { classifyHosts, scanScripts, termsForbidCodeReading } from '../skill/reversebusiness/tools/deep.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(ROOT, 'bin', 'rebiz.mjs');
const FAKE = path.join(ROOT, 'test', 'fixtures', 'fake-rea.cjs');
const FAKE_RUN = [process.execPath, FAKE];
const BROWSER = findBrowser();
const tmp = (p = 'rebiz-rea-') => fs.mkdtempSync(path.join(os.tmpdir(), p));
const example = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'examples', 'aicitybuilders-vibecoding', 'report.json'), 'utf8'));

function home(...agents) {
  const dir = tmp('rebiz-home-');
  for (const a of agents) fs.mkdirSync(path.join(dir, a), { recursive: true });
  return dir;
}
// 설치기를 임시 HOME 에서 돌린다. REA 설치기는 언제나 대역이고, 진짜 rea 는 없는 것으로 둔다.
function run(dir, args, extra = {}) {
  const log = path.join(dir, 'fake-rea.log');
  const env = { ...process.env, HOME: dir, USERPROFILE: dir, NO_COLOR: '1', TMPDIR: path.join(dir, 'tmp'), REBIZ_REA: 'none', REBIZ_NODE: 'v24.11.0', REBIZ_REA_INSTALLER: JSON.stringify(FAKE_RUN), FAKE_REA_LOG: log, ...extra };
  for (const k of Object.keys(env)) if (env[k] === null) delete env[k];
  delete env.CLAUDE_CONFIG_DIR; delete env.CODEX_HOME; delete env.REBIZ_TEST_TTY;
  fs.mkdirSync(env.TMPDIR, { recursive: true });
  const r = spawnSync(process.execPath, [CLI, ...args], { env, cwd: dir, encoding: 'utf8' });
  const calls = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  return { status: r.status, out: `${r.stdout}${r.stderr}`, calls };
}

// 대화형 터미널을 흉내 낸다 (REBIZ_TEST_TTY). "[Y/n]" 이 나올 때마다 그때까지의 REA 호출 기록을 찍어 두고 답을 하나씩 넣는다.
function runTty(dir, args, answers, extra = {}) {
  const log = path.join(dir, 'fake-rea.log');
  const env = { ...process.env, HOME: dir, USERPROFILE: dir, NO_COLOR: '1', TMPDIR: path.join(dir, 'tmp'), REBIZ_REA: 'none', REBIZ_NODE: 'v24.11.0', REBIZ_REA_INSTALLER: JSON.stringify(FAKE_RUN), FAKE_REA_LOG: log, REBIZ_TEST_TTY: '1', REBIZ_NO_AUTO_FILL: '1', ...extra };
  for (const k of Object.keys(env)) if (env[k] === null) delete env[k];
  delete env.CLAUDE_CONFIG_DIR; delete env.CODEX_HOME; delete env.REBIZ_REA_RUNNER;
  fs.mkdirSync(env.TMPDIR, { recursive: true });
  const readCalls = () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI, ...args], { env, cwd: dir });
    let out = '';
    let asked = 0;
    const atPrompt = [];
    const onData = (d) => {
      out += d;
      const n = (out.match(/\[Y\/n\]/g) || []).length;
      while (asked < n) {
        atPrompt.push(readCalls());
        child.stdin.write(`${answers[asked] ?? 'n'}\n`);
        asked += 1;
        if (asked >= answers.length) child.stdin.end(); // 답을 다 넣으면 입력을 닫는다 (닫지 않으면 자식이 입력을 기다린다)
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (status) => resolve({ status, out, calls: readCalls(), atPrompt }));
  });
}
// rebiz <주소> 를 실제 시계로 돌린다 (대화형이 아님). REA 설치기는 대역, 진짜 rea 는 없는 것으로.
function runAsync(dir, args, extra = {}) {
  const log = path.join(dir, 'fake-rea.log');
  const env = { ...process.env, HOME: dir, USERPROFILE: dir, NO_COLOR: '1', TMPDIR: path.join(dir, 'tmp'), REBIZ_REA: 'none', REBIZ_NODE: 'v24.11.0', REBIZ_REA_INSTALLER: JSON.stringify(FAKE_RUN), FAKE_REA_LOG: log, REBIZ_NO_AUTO_FILL: '1', ...extra };
  for (const k of Object.keys(env)) if (env[k] === null) delete env[k];
  delete env.CLAUDE_CONFIG_DIR; delete env.CODEX_HOME; delete env.REBIZ_TEST_TTY;
  if (!('REBIZ_REA_RUNNER' in extra)) delete env.REBIZ_REA_RUNNER;
  fs.mkdirSync(env.TMPDIR, { recursive: true });
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI, ...args], { env, cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (status) => resolve({ status, out, calls: fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [] }));
  });
}

test('REA 를 부르는 이름은 공식 npm 패키지 하나뿐이고, Node 판을 먼저 본다', () => {
  assert.equal(REA_PACKAGE, 'rea-agents');
  for (const v of ['v22.19.0', 'v22.30.1', 'v24.11.0', 'v24.22.3', 'v26.0.0']) assert.equal(nodeOk(v), true, v);
  for (const v of ['v18.20.0', 'v20.18.0', 'v22.18.9', 'v23.5.0', 'v24.10.9', 'v25.1.0', 'v26.0.0-rc.1']) assert.equal(nodeOk(v), false, v);
  // 실행 파일과 문서 어디에도 다른 패키지 이름이나 다른 설치 주소가 없다
  for (const f of ['bin/rebiz.mjs', 'lib/agents.mjs', 'skill/reversebusiness/tools/rea-bridge.mjs', 'skill/reversebusiness/tools/collect.mjs', 'README.md', 'AGENTS.md', 'skill/reversebusiness/SKILL.md']) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of text.matchAll(/npx\s+(?:-y\s+|--yes\s+)?([@\w$][@\w./:${}-]*)/g)) assert.ok(/^(rea-agents(@latest)?|github:smeagemoeny-maker\/reversebusiness|rebiz|\$\{REA_PACKAGE\}@latest)$/.test(m[1]), `${f}: npx ${m[1]}`);
    assert.ok(!/npm\s+(i|install)\s+(-g\s+|--global\s+)?(?!rea-agents)[a-z@]/.test(text), f);
    assert.ok(!/dangerously|skip-permissions|--no-sandbox|danger-full-access/.test(text), `${f}: 권한 확인을 건너뛰는 옵션`);
  }
  // rea 실행 파일 찾기: 같은 폴더에 node 가 없으면 지금 Node 판을 본다
  const dir = tmp();
  fs.mkdirSync(path.join(dir, '.local', 'opt', 'node-v24.99.0', 'bin'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.local', 'opt', 'node-v24.99.0', 'bin', 'rea'), '#!/usr/bin/env node\n');
  assert.equal(findRea({ env: { PATH: '', REBIZ_NODE: 'v20.0.0' }, home: dir, platform: 'linux' }), null, '같은 폴더에 node 가 없고 지금 Node 도 낮으면 못 쓰는 것으로 본다');
  assert.equal(findRea({ env: { PATH: '', REBIZ_NODE: 'v24.11.0' }, home: dir, platform: 'linux' }).bin, path.join(dir, '.local', 'opt', 'node-v24.99.0', 'bin', 'rea'));
  assert.equal(findRea({ env: { PATH: path.join(dir, '.local', 'opt', 'node-v24.99.0', 'bin'), REBIZ_REA: 'none' }, home: dir, platform: 'linux' }), null);
  // 실행 파일도 REA 스킬도 없으면 부를 방법이 없다 (내려받지 않는다)
  const empty = tmp();
  assert.equal(reaRunner({ env: { PATH: '', REBIZ_NODE: 'v24.11.0' }, home: empty, platform: 'linux' }), null);
  // 확인을 받고 REA setup 으로 설치했으면(REA 스킬이 있음) 공식 패키지를 npx 로 부른다
  fs.mkdirSync(path.join(empty, '.agents', 'skills', 'reverse-engineer-anything'), { recursive: true });
  fs.writeFileSync(path.join(empty, '.agents', 'skills', 'reverse-engineer-anything', 'SKILL.md'), 'x\n');
  assert.deepEqual(reaRunner({ env: { PATH: '', REBIZ_NODE: 'v24.11.0' }, home: empty, platform: 'linux' }).pre, ['-y', 'rea-agents@latest']);
  assert.equal(reaRunner({ env: { PATH: '', REBIZ_NODE: 'v24.11.0' }, home: empty, platform: 'linux', allowNpx: false }), null);
  assert.equal(reaRunner({ env: { PATH: '', REBIZ_NODE: 'v20.18.0' }, home: empty, platform: 'linux' }), null, 'Node 가 낮으면 npx 로도 부르지 않는다');
  assert.equal(reaRunner({ env: { PATH: '', REBIZ_REA: 'none', REBIZ_NODE: 'v24.11.0' }, home: empty, platform: 'linux' }), null);
  // 설치기: 지금 Node 옆의 npx 로, 공식 이름 하나로만
  const posix = reaInstaller({ env: { REBIZ_NODE: 'v24.11.0' }, platform: 'linux', execPath: '/opt/node/bin/node' });
  assert.deepEqual([path.basename(posix.cmd), ...posix.pre], ['npx', '-y', 'rea-agents@latest']);
  assert.equal(reaInstaller({ env: { REBIZ_NODE: 'v20.18.0' }, platform: 'linux' }), null);
  // Windows: npx 는 .cmd 라서 cmd.exe /d /c 로 감싼다. 깔린 rea.cmd 도 같다.
  // 시험 기계에 실제로 없는 폴더를 Node 자리로 준다 (진짜 Windows 에서는 C:\\Program Files\\nodejs\\npx.cmd 가 있어서 전체 경로가 나온다)
  const win = reaInstaller({ env: { REBIZ_NODE: 'v24.11.0' }, platform: 'win32', execPath: 'Z:\\rebiz-no-such-dir\\node.exe' });
  assert.equal(win.cmd, 'cmd.exe');
  assert.deepEqual(win.pre, ['/d', '/c', 'npx.cmd', '-y', 'rea-agents@latest']);
  const winApp = path.join(dir, 'appdata');
  const winBin = path.join(winApp, 'npm', 'rea.cmd');
  fs.mkdirSync(path.dirname(winBin), { recursive: true });
  fs.writeFileSync(winBin, '@echo off\r\n');
  const winRun = reaRunner({ env: { PATH: '', APPDATA: winApp, REBIZ_NODE: 'v24.11.0' }, home: tmp(), platform: 'win32' });
  assert.equal(winRun.cmd, 'cmd.exe');
  assert.deepEqual(winRun.pre, ['/d', '/c', winBin]);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(empty, { recursive: true, force: true });
});

test('설치: REA 가 없으면 바뀔 것을 보여 주고, 확인을 받은 뒤에만 REA 를 부른다', async () => {
  const dir = home('.claude', '.codex');
  fs.writeFileSync(path.join(dir, '.claude', 'settings.json'), '{"keep":"me"}\n');
  // dry-run: REA 를 내려받지도 부르지도 않는다 (무엇을 할지만 알려 준다)
  let r = run(dir, ['--dry-run']);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /REA 가 없습니다\. 확인하면 공식 REA 를 설치해 정밀 모드\(겉, 흐름, 속\)로 읽습니다\./);
  assert.match(r.out, /패키지\s+rea-agents\s+\(npm 의 공식 패키지\. 이 이름만 씁니다\)/);
  assert.match(r.out, /실행할 명령\s+npx -y rea-agents@latest setup --client claude_code --client codex/);
  assert.match(r.out, /바뀔 곳\s+claude_code, codex 의 설정 파일\s+REA 연결 추가/);
  assert.match(r.out, /확인 전에는 아무것도 내려받지 않습니다\. 건너뛰려면 --no-rea/);
  assert.deepEqual(r.calls, [], 'dry-run 은 REA 를 부르지 않는다');
  assert.ok(!fs.existsSync(path.join(dir, '.agents')), 'dry-run 은 아무것도 만들지 않는다');
  // 물어볼 사람이 없는 터미널에서 --yes 가 없으면 둘 다 설치하지 않고, 바뀔 것만 보여 준다
  r = run(dir, ['--no-open']);
  assert.match(r.out, /REA 가 없습니다\. 확인하면/);
  assert.match(r.out, /--yes 를 붙여 다시 실행하세요/);
  assert.deepEqual(r.calls, [], '확인 전에는 REA 를 부르지 않는다');
  assert.ok(!fs.existsSync(path.join(dir, '.claude', 'skills', 'reversebusiness')));
  // 대화형: 스킬은 예, REA 는 아니오 -> REA 는 한 번도 부르지 않는다
  r = await runTty(dir, ['--no-open'], ['y', 'n']);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /reversebusiness 스킬을 설치할까요\? \[Y\/n\]/);
  assert.match(r.out, /REA 도 설치할까요\? \[Y\/n\]/);
  assert.match(r.out, /REA 는 설치하지 않았습니다\. 가벼운 모드로 동작합니다\. 나중에 정밀 모드로: npx -y rea-agents@latest setup/);
  assert.deepEqual(r.calls, []);
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'skills', 'reversebusiness', 'SKILL.md')), '우리 스킬은 설치된다');
  assert.ok(!fs.existsSync(path.join(dir, '.agents', 'skills', 'reverse-engineer-anything')));
  // 대화형: REA 에 예 -> 묻는 순간까지는 호출 0, 답한 뒤에 REA 의 계획을 받아 보여 주고 설치한다
  r = await runTty(dir, ['--no-open'], ['y', 'y']);
  assert.equal(r.status, 0, r.out);
  assert.equal(r.atPrompt.length, 2, '스킬 갱신과 REA 를 따로 묻는다');
  assert.deepEqual(r.atPrompt[1], [], 'REA 확인 전에는 REA(npx)를 한 번도 부르지 않는다');
  assert.deepEqual(r.calls, [['setup', '--client', 'claude_code', '--client', 'codex', '--dry-run', '--json'], ['setup', '--client', 'claude_code', '--client', 'codex', '--yes', '--json']]);
  assert.match(r.out, /claude_code\s+~[\\/]\.claude_code\.fake\.json\s+REA 연결 추가/);
  assert.match(r.out, /REA reverse-engineering skill\s+~[\\/]\.agents[\\/]skills[\\/]reverse-engineer-anything\s+REA 스킬 설치/);
  assert.match(r.out, /REA 설치 {2}에이전트 연결 2곳, REA 스킬 설치/);
  assert.equal(fs.readFileSync(path.join(dir, '.claude', 'settings.json'), 'utf8'), '{"keep":"me"}\n', '우리 설치기는 설정 파일을 건드리지 않는다');
  // 다시 실행: REA 스킬이 있으니 다시 설치하지 않는다
  fs.rmSync(path.join(dir, 'fake-rea.log'), { force: true });
  r = run(dir, ['--yes', '--no-open']);
  assert.match(r.out, /REA 있음.*다시 설치하지 않습니다/);
  assert.deepEqual(r.calls, [], '있으면 npx 를 부르지 않는다 (판을 묻는 것도 없음)');
  // --remove: 우리 것만 지운다. REA 는 사용자가 따로 지운다.
  r = run(dir, ['--remove']);
  assert.equal(r.status, 0, r.out);
  assert.ok(!fs.existsSync(path.join(dir, '.claude', 'skills', 'reversebusiness')));
  assert.ok(fs.existsSync(path.join(dir, '.agents', 'skills', 'reverse-engineer-anything', 'SKILL.md')), 'REA 는 지우지 않는다');
  assert.match(r.out, /REA 는 지우지 않았습니다 \(별개의 도구\)\. REA 까지 지우려면: npx -y rea-agents@latest uninstall/);
  assert.deepEqual(r.calls, []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('설치: --yes, --no-rea, Node 가 낮을 때, 이미 있을 때, 계획이나 설치가 실패할 때', () => {
  let dir = home('.claude', '.codex');
  let r = run(dir, ['--yes', '--no-open']);
  assert.equal(r.status, 0, r.out);
  assert.deepEqual(r.calls.map((c) => c.at(-2)), ['--dry-run', '--yes'], '--yes 는 묻지 않고 계획을 받은 뒤 설치');
  assert.match(r.out, /REA 설치 {2}에이전트 연결 2곳, REA 스킬 설치 {2}\(ready\)/);
  assert.ok(fs.existsSync(path.join(dir, '.agents', 'skills', 'reverse-engineer-anything', 'SKILL.md')), '대역이 REA 스킬 자리를 만들었다');
  fs.rmSync(dir, { recursive: true, force: true });

  dir = home('.claude');
  r = run(dir, ['--yes', '--no-open', '--no-rea']);
  assert.match(r.out, /REA 설치 제안을 건너뜁니다 \(--no-rea\)/);
  assert.deepEqual(r.calls, []);
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'skills', 'reversebusiness', 'SKILL.md')));
  fs.rmSync(dir, { recursive: true, force: true });

  dir = home('.claude');
  r = run(dir, ['--yes', '--no-open'], { REBIZ_NODE: 'v20.18.0', REBIZ_REA_INSTALLER: null });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /REA 는 건너뜁니다\. REA 는 Node 22\.19 이상\(22\.x\), 24\.11 이상\(24\.x\), 26 이상이 필요한데 지금 Node 는 v20\.18\.0 입니다\./);
  assert.match(r.out, /가벼운 모드로 동작합니다/);
  assert.deepEqual(r.calls, []);
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'skills', 'reversebusiness', 'SKILL.md')), '우리 스킬은 그대로 설치한다');
  fs.rmSync(dir, { recursive: true, force: true });

  dir = home('.claude');
  r = run(dir, ['--yes', '--no-open'], { REBIZ_REA: null, REBIZ_REA_RUNNER: JSON.stringify(FAKE_RUN) });
  assert.match(r.out, /REA 있음 \(6\.9\.0\)\. 다시 설치하지 않습니다/);
  assert.deepEqual(r.calls, [['--version']], '버전만 묻고 setup 은 부르지 않는다');
  fs.rmSync(dir, { recursive: true, force: true });

  dir = home('.claude');
  r = run(dir, ['--yes', '--no-open'], { FAKE_REA_FAIL: 'setup' });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /REA 는 건너뜁니다\s+REA 의 설치 계획을 받지 못했습니다\. 가벼운 모드로 계속합니다/);
  assert.equal(r.calls.length, 1);
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'skills', 'reversebusiness', 'SKILL.md')));
  fs.rmSync(dir, { recursive: true, force: true });

  dir = home('.claude');
  r = run(dir, ['--yes', '--no-open'], { FAKE_REA_FAIL: 'apply' });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /REA 설치 실패\s+REA setup 이 끝나지 않았습니다\. 가벼운 모드로 계속합니다\. 나중에: npx -y rea-agents@latest setup/);
  assert.equal(r.calls.length, 2);
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'skills', 'reversebusiness', 'SKILL.md')), 'REA 가 실패해도 우리 스킬은 남는다');
  fs.rmSync(dir, { recursive: true, force: true });

  dir = home();
  r = run(dir, ['--dir', path.join(dir, 'custom'), '--yes', '--no-open']);
  assert.match(r.out, /REA 를 연결할 에이전트를 고르지 않았습니다/);
  assert.deepEqual(r.calls, []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('풀이 도구: 호스트 이름 나누기, 코드에서 이름 찾기, 약관의 금지 조항', () => {
  const g = classifyHosts([{ host: 'js.tosspayments.com', sent: 0 }, { host: 'www.googletagmanager.com' }, 'player.vimeo.com', 'i.vimeocdn.com', 'shop.example', 'cdn.unknown-vendor.example'], 'www.shop.example');
  assert.deepEqual(g.map((x) => [x.kind, x.name]), [['payment', '토스페이먼츠'], ['analytics', 'Google 태그'], ['video', 'Vimeo'], ['other', 'cdn.unknown-vendor.example']]);
  assert.deepEqual(g.find((x) => x.name === 'Vimeo').hosts.sort(), ['i.vimeocdn.com', 'player.vimeo.com']);
  const scan = scanScripts([{ url: 'https://shop.example/app.js', text: fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'site', 'shop-script.txt'), 'utf8') }]);
  for (const r of ['/dashboard', '/lessons/:id', '/my/orders', '/shop-pricing']) assert.ok(scan.routes.includes(r), r);
  assert.ok(!scan.routes.some((r) => /skip\.js|static/.test(r)), '파일 주소는 화면 경로로 세지 않는다');
  assert.deepEqual(scan.endpoints, ['/api/checkout']);
  assert.deepEqual(scan.payments, ['토스페이먼츠']);
  assert.deepEqual(scan.plans, ['스타터', '프로']);
  assert.ok(scan.prices.includes('12900') && scan.prices.includes('39000'));
  assert.ok(!JSON.stringify(scan).includes('test_ck_fixture'), '키처럼 보이는 글자는 가져오지 않는다');
  assert.equal(termsForbidCodeReading('회원은 서비스를 역설계하거나 디컴파일할 수 없습니다.').forbids, true);
  assert.equal(termsForbidCodeReading('You may not reverse engineer the Service.').forbids, true);
  assert.equal(termsForbidCodeReading('시험용으로 지어낸 약관입니다. 콘텐츠를 복제하지 않습니다.').forbids, false);
});

const fakeRea = () => ({ cmd: process.execPath, pre: [FAKE], how: 'test' });
const quick = (extra = {}) => { const c = fakeClock(); return { sleep: c.sleep, now: c.now, externalRequests: 'block', rea: fakeRea(), ...extra }; };
const callsOf = (log) => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

test('정밀 모드 (내 것): 겉, 흐름, 속 세 깊이로 읽고, 누르면 안 되는 것은 누르지 않는다', { skip: BROWSER ? false : '이 컴퓨터에 Chrome 계열 브라우저가 없어 건너뜀' }, async () => {
  const site = await startSite();
  const dir = tmp();
  const log = path.join(dir, 'rea.log');
  process.env.FAKE_REA_LOG = log;
  try {
    const c = await collect(`${site.origin}/shop`, quick({ relation: 'own', evidenceDir: path.join(dir, 'evidence'), version: '9.9.9' }));
    assert.equal(c.stop, null);
    assert.equal(c.deep.mode, 'precise');
    // 순서: robots, 받은 HTML, 그다음에야 브라우저와 REA
    assert.deepEqual(site.seen.slice(0, 2).map((r) => r.path), ['/robots.txt', '/shop']);
    const calls = callsOf(log);
    assert.deepEqual(calls.map((a) => a[0]), ['inspect-web-page', 'analyze-web-bundle'], '겉 읽기 다음에, 약관까지 읽은 뒤 속 읽기');
    for (const a of calls) {
      assert.match(a[1], /^http:\/\/127\.0\.0\.1:\d+$/, 'REA 는 내 컴퓨터 안의 디버깅 주소에만 붙는다');
      assert.equal(a[a.indexOf('--allowed-origins') + 1], site.origin, '출처는 JSON 배열이 아니라 주소 그대로');
    }
    assert.ok(calls[0].includes('--include-storage-keys') && !calls[0].includes('--include-script-sources') && !calls[0].includes('--include-storage-fingerprints'), '저장소는 키 이름만');
    assert.ok(!calls[1].includes('--fetch-source-maps'));
    // 흐름: 펼치기만
    assert.deepEqual(c.deep.flow.kinds, { tab: 1, details: 2, more: 1 });
    assert.deepEqual(c.deep.flow.newPrices, ['129,000원'], '연간 탭을 펼쳐야 보이는 가격');
    for (const never of ['/clicked-buy', '/checkout', '/subscribe', '/login', '/signup', '/api/checkout', '/dashboard', '/my/orders']) assert.ok(!site.seen.some((r) => r.path === never), `${never} 로 요청이 나가면 안 된다`);
    assert.ok(site.seen.every((r) => r.method === 'GET' && !('cookie' in r.headers)));
    assert.ok(c.deep.hosts.filter((h) => h.host !== '127.0.0.1').every((h) => h.sent === 0), '시험에서는 바깥으로 아무것도 보내지 않는다');
    // 속: 이름만
    assert.equal(c.deep.code.state, 'partial');
    for (const r of ['/dashboard', '/my/orders', '/lessons/:id', '/admin/reports']) assert.ok(c.deep.code.routes.includes(r), r);
    assert.deepEqual(c.deep.code.payments, ['토스페이먼츠']);
    // 리포트
    const { report } = buildDraftFromPages(c, { relation: 'own', version: '9.9.9', today: '2026-11-17' });
    const k = checkReport(report, { dissectOnly: true });
    assert.deepEqual(k.errors, ['meta.one_line: 한 줄 요약이 비었어요']);
    assert.ok(k.counts.code >= 8, `코드 흔적 ${k.counts.code}`);
    assert.deepEqual(report.meta.depth.steps.map((s) => [s.key, s.state]), [['surface', 'done'], ['flow', 'done'], ['code', 'partial']]);
    assert.equal(report.meta.depth.reached, 'code');
    const seen = Object.fromEntries(report.evidence.map((e) => [e.id, e.seen || 'page']));
    const price = report.sections.money.price;
    assert.ok(price.some((p) => p.status === 'observed' && /129,000원/.test(p.text) && p.evidence.every((id) => seen[id] === 'flow')), '펼쳐서 본 가격은 흐름에서 본 관찰');
    const trace = price.find((p) => p.status === 'code');
    assert.match(trace.text, /"39000".*지금 파는 가격인지는 모른다/);
    assert.ok(!/12900|129,000/.test(trace.text), '화면에서 이미 본 값은 코드 흔적으로 다시 적지 않는다');
    assert.deepEqual(report.sections.flow.services.map((s) => [s.kind, s.names.join(), s.seen]), [['payment', '토스페이먼츠', 'flow'], ['analytics', 'Google 태그', 'flow'], ['video', 'Vimeo', 'flow']]);
    const codeScreens = report.sections.map.screens.filter((s) => s.status === 'code').map((s) => s.name);
    assert.ok(codeScreens.includes('/dashboard') && codeScreens.includes('/my/orders'));
    assert.ok(!codeScreens.includes('/terms') && !codeScreens.includes('/login'), '화면에서 링크로 보인 경로는 코드에서만 본 화면이 아니다');
    assert.match(report.sections.map.screens.find((s) => s.name === '/dashboard').purpose, /로그인이나 결제 뒤로 보이는 경로다\. 열어 보지 않았다/);
    assert.ok(report.sections.tech.items.some((t) => t.layer === '브라우저 저장소' && /값은 읽지 않았다/.test(t.text)));
    // 근거 폴더: 이름과 숫자뿐. 쿠키 값, 스크립트 글은 없다.
    assert.deepEqual(fs.readdirSync(path.join(dir, 'evidence')).sort(), ['01_inspect_page.json', '02_bundle_evidence.json', '03_flow.json', '04_code_scan.json']);
    const saved = fs.readdirSync(path.join(dir, 'evidence')).map((f) => fs.readFileSync(path.join(dir, 'evidence', f), 'utf8')).join('\n');
    for (const secret of ['SECRET-COOKIE-VALUE', 'test_ck_fixture', 'function pay', 'should-not-come-back']) assert.ok(!saved.includes(secret), secret);
    assert.ok(c.render.closed.exited && c.render.closed.profileRemoved);
  } finally { delete process.env.FAKE_REA_LOG; await site.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('정밀 모드 (남의 것): 약관이 코드 분석을 금지하거나 약관을 못 읽었으면 속 읽기를 하지 않는다', { skip: BROWSER ? false : '브라우저 없음' }, async () => {
  const dir = tmp();
  const log = path.join(dir, 'rea.log');
  process.env.FAKE_REA_LOG = log;
  const forbid = { '/terms': (req, res, html) => html('<!doctype html><html><head><title>이용약관 | 달콤 구독</title></head><body><main><h1>이용약관</h1><p>회원은 서비스를 역설계하거나 디컴파일할 수 없습니다. 시험용으로 지어낸 조항입니다.</p></main></body></html>') };
  try {
    // 1. 약관에 금지 조항이 있다
    let site = await startSite({ routes: forbid });
    let c = await collect(`${site.origin}/shop`, quick({ evidenceDir: path.join(dir, 'a') }));
    await site.close();
    assert.equal(c.deep.code.state, 'blocked');
    assert.match(c.deep.code.note, /이용약관에 코드 분석을 금지하는 말\("역설계"\)이 있어 속 읽기는 하지 않았다/);
    assert.deepEqual(callsOf(log).map((a) => a[0]), ['inspect-web-page'], 'analyze-web-bundle 을 부르지 않는다');
    let { report } = buildDraftFromPages(c, { today: '2026-11-17' });
    assert.deepEqual(report.meta.depth.steps.map((s) => s.state), ['done', 'done', 'blocked']);
    assert.equal(checkReport(report, { dissectOnly: true }).counts.code, 0);
    assert.ok(report.evidence.every((e) => e.seen !== 'code'));
    assert.ok(report.sections.map.screens.every((s) => s.status !== 'code'));
    assert.ok(report.sections.unknowns.some((u) => /약관이 막고 있으므로 하지 않는다/.test(u.next)));
    assert.ok(!fs.existsSync(path.join(dir, 'a', '04_code_scan.json')) && !fs.existsSync(path.join(dir, 'a', '02_bundle_evidence.json')));
    assert.equal(report.sections.flow.services.length, 3, '흐름에서 본 것은 그대로 남는다');

    // 2. 약관을 읽지 못했다 (한 장만 읽음): 기본은 하지 않는다
    fs.rmSync(log, { force: true });
    site = await startSite();
    c = await collect(`${site.origin}/shop`, quick({ maxPages: 1, evidenceDir: path.join(dir, 'b') }));
    await site.close();
    assert.equal(c.deep.code.state, 'skipped');
    assert.match(c.deep.code.note, /이용약관을 읽지 못해 속 읽기\(코드 읽기\)는 하지 않았다/);
    assert.deepEqual(callsOf(log).map((a) => a[0]), ['inspect-web-page']);

    // 3. 약관을 읽었고 금지하는 말이 없다: 속 읽기를 하고, 낱말로 찾아본 것임을 적는다
    fs.rmSync(log, { force: true });
    site = await startSite();
    c = await collect(`${site.origin}/shop`, quick({ evidenceDir: path.join(dir, 'c') }));
    await site.close();
    assert.equal(c.deep.code.state, 'partial');
    report = buildDraftFromPages(c, { today: '2026-11-17' }).report;
    assert.match(report.meta.depth.steps[2].note, /코드 분석을 금지하는 말을 찾지 못했다 \(낱말로 찾아본 것이며 법률 검토가 아니다\)/);
    assert.equal(report.meta.terms.status, 'robots-only');
  } finally { delete process.env.FAKE_REA_LOG; fs.rmSync(dir, { recursive: true, force: true }); }
});

test('정밀 모드: --light 면 REA 를 부르지 않고, REA 단계가 실패하면 건너뛰고 그 사실을 남긴다', { skip: BROWSER ? false : '브라우저 없음' }, async () => {
  const dir = tmp();
  const log = path.join(dir, 'rea.log');
  process.env.FAKE_REA_LOG = log;
  const site = await startSite();
  try {
    let c = await collect(`${site.origin}/shop`, quick({ mode: 'light', relation: 'own', evidenceDir: path.join(dir, 'l') }));
    assert.equal(c.deep.mode, 'light');
    assert.deepEqual(callsOf(log), []);
    assert.ok(!site.seen.some((r) => r.path === '/clicked-buy'));
    let { report } = buildDraftFromPages(c, { relation: 'own', today: '2026-11-17' });
    assert.deepEqual(report.meta.depth.steps.map((s) => s.state), ['done', 'skipped', 'skipped']);
    assert.match(report.meta.depth.steps[1].note, /가벼운 모드로 실행했다 \(--light\)/);
    assert.equal(report.sections.flow.services, undefined);
    assert.ok(!JSON.stringify(report.sections.money.price).includes('129,000'), '가벼운 모드에서는 펼치지 않는다');

    process.env.FAKE_REA_FAIL = 'inspect,bundle';
    c = await collect(`${site.origin}/shop`, quick({ relation: 'own', evidenceDir: path.join(dir, 'f') }));
    assert.equal(c.deep.mode, 'precise');
    assert.match(c.deep.surface.note, /REA 겉 읽기가 실패해 우리 읽기만 썼다/);
    assert.equal(c.deep.code.state, 'done', 'REA 분석이 실패해도 이미 내려온 스크립트에서 이름은 찾는다');
    assert.match(c.deep.code.note, /REA 스크립트 분석이 결과를 내지 못했다/);
    report = buildDraftFromPages(c, { relation: 'own', today: '2026-11-17' }).report;
    assert.deepEqual(checkReport(report, { dissectOnly: true }).errors, ['meta.one_line: 한 줄 요약이 비었어요']);
    assert.match(report.meta.depth.steps[0].note, /REA 겉 읽기가 실패해 우리 읽기만 썼다/);
    assert.ok(report.sections.map.screens.some((s) => s.status === 'code' && s.name === '/dashboard'));
  } finally { delete process.env.FAKE_REA_LOG; delete process.env.FAKE_REA_FAIL; await site.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('rebiz <주소>: REA 가 있으면 정밀 모드, --light 로 끈다 (대역 REA, 실제 시계)', { skip: BROWSER ? false : '브라우저 없음' }, async () => {
  const site = await startSite();
  const dir = tmp();
  const { spawn } = await import('node:child_process');
  const cli = (args) => new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI, ...args], { env: { ...process.env, HOME: dir, USERPROFILE: dir, NO_COLOR: '1', REBIZ_REA_RUNNER: JSON.stringify(FAKE_RUN) } });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (status) => resolve({ status, out }));
  });
  try {
    // 바깥 호스트가 없는 시험용 페이지를 쓴다 (실행 파일로 돌릴 때는 바깥 요청을 막는 시험용 옵션이 없다)
    const r = await cli([`${site.origin}/spa`, '--no-open', '--own', '--pages', '1', '--out', path.join(dir, 'out')]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /정밀 모드: REA 를 찾았습니다/);
    assert.match(r.out, /깊이 {4}정밀 모드 \(REA\)/);
    assert.match(r.out, /겉 읽기\s+읽음/);
    assert.match(r.out, /흐름 읽기\s+읽음\s+펼치기 2번 \(접힌 글 2\)/);
    assert.match(r.out, /속 읽기\s+일부만/);
    assert.match(r.out, /코드 흔적 \d+/);
    assert.ok(fs.existsSync(path.join(dir, 'out', 'evidence', '03_flow.json')));
    const report = JSON.parse(fs.readFileSync(path.join(dir, 'out', 'report.json'), 'utf8'));
    assert.equal(report.meta.depth.mode, 'precise');
    assert.ok(fs.readFileSync(path.join(dir, 'out', 'report.html'), 'utf8').includes('"depth":{"mode":"precise"'));
    const light = await cli([`${site.origin}/spa`, '--no-open', '--light', '--pages', '1', '--out', path.join(dir, 'light')]);
    assert.match(light.out, /깊이 {4}가벼운 모드/);
    assert.match(light.out, /흐름 읽기\s+안 함\s+가벼운 모드로 실행했다 \(--light\)/);
    assert.ok(!fs.existsSync(path.join(dir, 'light', 'evidence')));
  } finally { await site.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('rebiz <주소>: REA 가 없으면 확인을 받은 뒤에만 설치하고, 아니면 가벼운 모드로 끝까지 읽는다 (대역 REA, 실제 시계)', { skip: BROWSER ? false : '브라우저 없음' }, async () => {
  // 가벼운 모드로 끝나는 경우는 스크립트가 없는 페이지(/plain)를 읽어 브라우저를 띄우지 않게 해 시간을 줄인다. 정밀 모드를 볼 때만 /spa.
  const plain = (req, res, html) => html('<!doctype html><html><head><title>달콤 구독 | 시험용</title></head><body><main><h1>시험용으로 지어낸 구독 가게</h1><p>매달 9,900원에 간식 상자를 보냅니다. 시험용으로 지어낸 글입니다.</p></main></body></html>');
  const site = await startSite({ routes: { '/plain': plain } });
  const url = `${site.origin}/plain`;
  const spa = `${site.origin}/spa`;
  const base = ['--no-open', '--no-fill', '--own', '--pages', '1'];
  try {
    // --dry-run: 바뀔 것만 보여 주고, REA 도 대상 사이트도 부르지 않는다
    let dir = home('.claude');
    let r = await runAsync(dir, [url, ...base, '--dry-run', '--out', path.join(dir, 'out')]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /REA 가 없습니다\. 확인하면 공식 REA 를 설치해/);
    assert.match(r.out, /실행할 명령\s+npx -y rea-agents@latest setup --client claude_code/);
    assert.match(r.out, /dry-run: 아무것도 내려받거나 읽지 않고 여기서 멈춥니다/);
    assert.deepEqual(r.calls, []);
    assert.equal(site.seen.length, 0, 'dry-run 은 대상 사이트에도 요청하지 않는다');
    assert.ok(!fs.existsSync(path.join(dir, 'out')));
    fs.rmSync(dir, { recursive: true, force: true });

    // 물어볼 사람이 없는 터미널: 설치하지 않고 바뀔 것만 보여 준 뒤 가벼운 모드로 끝까지
    dir = home('.claude');
    r = await runAsync(dir, [url, ...base, '--out', path.join(dir, 'out')]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /REA 가 없습니다\. 확인하면/);
    assert.match(r.out, /물어볼 사람이 없는 터미널이라 REA 는 설치하지 않았습니다\. 설치하고 읽으려면 --yes/);
    assert.deepEqual(r.calls, [], '확인 없이는 REA 를 한 번도 부르지 않는다');
    assert.match(r.out, /깊이 {4}가벼운 모드/);
    assert.match(r.out, /REA 를 설치하지 않아 가벼운 모드로 읽었습니다\. 정밀 모드로: /);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'out', 'report.json'), 'utf8')).meta.depth.mode, 'light');
    assert.ok(!fs.existsSync(path.join(dir, '.agents', 'skills', 'reverse-engineer-anything')));

    // 대화형으로 거절: 묻는 순간까지 호출 0, 거절 뒤에도 0, 가벼운 모드로 정상 완료
    r = await runTty(dir, [url, ...base, '--out', path.join(dir, 'tty')], ['n']);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /REA 도 설치할까요\? \[Y\/n\]/);
    assert.deepEqual(r.atPrompt, [[]]);
    assert.deepEqual(r.calls, []);
    assert.match(r.out, /깊이 {4}가벼운 모드/);
    assert.ok(fs.existsSync(path.join(dir, 'tty', 'report.html')));
    fs.rmSync(dir, { recursive: true, force: true });

    // --no-rea: 묻지도 보여 주지도 않고 가벼운 모드
    dir = home('.claude');
    r = await runAsync(dir, [url, ...base, '--no-rea', '--out', path.join(dir, 'out')]);
    assert.equal(r.status, 0, r.out);
    assert.doesNotMatch(r.out, /REA 가 없습니다/);
    assert.match(r.out, /REA 설치 제안을 건너뛰었습니다 \(--no-rea\)/);
    assert.deepEqual(r.calls, []);
    fs.rmSync(dir, { recursive: true, force: true });

    // 설치 실패: 해부는 막히지 않고 가벼운 모드로 계속
    dir = home('.claude');
    r = await runAsync(dir, [url, ...base, '--yes', '--out', path.join(dir, 'out')], { FAKE_REA_FAIL: 'apply' });
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /REA 설치 실패/);
    assert.match(r.out, /REA 설치가 끝나지 않아 가벼운 모드로 읽었습니다/);
    assert.deepEqual(r.calls.map((c) => c[0]), ['setup', 'setup'], '실패한 REA 로 읽지 않는다');
    assert.ok(fs.existsSync(path.join(dir, 'out', 'report.json')));
    fs.rmSync(dir, { recursive: true, force: true });

    // --yes: 묻지 않고 설치한 뒤 그 REA 로 정밀 모드
    dir = home('.claude');
    r = await runAsync(dir, [spa, ...base, '--yes', '--out', path.join(dir, 'out')]);
    assert.equal(r.status, 0, r.out);
    assert.deepEqual(r.calls.slice(0, 2).map((c) => c.at(-2)), ['--dry-run', '--yes']);
    assert.match(r.out, /REA 설치 {2}에이전트 연결 1곳, REA 스킬 설치/);
    assert.ok(r.calls.slice(2).some((c) => c[0] === 'inspect-web-page'), '설치한 REA 로 겉 읽기');
    assert.match(r.out, /깊이 {4}정밀 모드 \(REA\)/);
    // 이미 있으면(REA 스킬이 놓임) 다시 설치하지 않는다. 묻지도 않는다.
    fs.rmSync(path.join(dir, 'fake-rea.log'), { force: true });
    r = await runAsync(dir, [spa, ...base, '--out', path.join(dir, 'again')], { REBIZ_REA: null, REBIZ_REA_RUNNER: JSON.stringify(FAKE_RUN) });
    assert.equal(r.status, 0, r.out);
    assert.doesNotMatch(r.out, /REA 가 없습니다|REA 도 설치할까요/);
    assert.ok(!r.calls.some((c) => c[0] === 'setup'), '있으면 setup 을 부르지 않는다');
    assert.match(r.out, /깊이 {4}정밀 모드 \(REA\)/);
    fs.rmSync(dir, { recursive: true, force: true });

    // Node 가 낮으면 묻지 않고, 까닭을 한 줄로
    dir = home('.claude');
    r = await runAsync(dir, [url, ...base, '--out', path.join(dir, 'out')], { REBIZ_NODE: 'v20.18.0', REBIZ_REA_INSTALLER: null });
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /REA 는 Node 22\.19 이상.*지금 Node 는 v20\.18\.0 입니다/);
    assert.deepEqual(r.calls, []);
    fs.rmSync(dir, { recursive: true, force: true });
  } finally { await site.close(); }
});

test('검사기: 코드에서만 본 것은 관찰로 쓸 수 없다', () => {
  const base = () => {
    const r = example();
    r.evidence.push({ id: 'E11', type: 'doc', ref: 'evidence/04_code_scan.json', note: '속 읽기 기록', seen: 'code' }, { id: 'E12', type: 'doc', ref: 'evidence/03_flow.json', note: '흐름 읽기 기록', seen: 'flow' });
    r.sections.tech.items.push({ layer: '화면 경로', text: '코드 안에 화면 경로 이름이 있다.', status: 'code', evidence: ['E11'] }, { layer: '바깥 서비스', text: '결제 호스트로 요청이 나가려 했다.', status: 'observed', evidence: ['E12'] });
    return r;
  };
  const errs = (mutate) => { const r = base(); mutate(r); return checkReport(r).errors.join('\n'); };
  const ok = checkReport(base());
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.counts.code, 1);
  // 코드에서만 본 가격을 지금 파는 가격(관찰)으로 쓰면 오류
  assert.match(errs((r) => { r.sections.money.price.push({ text: '프로 요금제는 39,000원이다.', status: 'observed', evidence: ['E11'] }); }), /money\.price\[\d+\]: 코드에서만 본 것은 관찰\(observed\)이 아니라 코드 흔적/);
  assert.equal(errs((r) => { r.sections.money.price.push({ text: '코드 안에 39000 이라는 숫자가 있다. 지금 파는 가격인지는 모른다.', status: 'code', evidence: ['E11'] }); }), '');
  assert.equal(errs((r) => { r.sections.money.price.push({ text: '가격 상자와 코드에 같은 값이 있다.', status: 'observed', evidence: ['E1', 'E11'] }); }), '', '화면에서 본 근거가 함께 있으면 관찰');
  assert.match(errs((r) => { r.sections.tech.items.push({ layer: 'x', text: 'y', status: 'code', evidence: ['E1'] }); }), /코드 흔적\(status: code\)에는 코드에서 본 근거\(seen: code\)가 1개 이상/);
  assert.match(errs((r) => { r.sections.money.revenue = [{ text: '코드에 매출 숫자가 있다', status: 'code', evidence: ['E11'] }]; }), /수익 숫자는 공개된 근거가 있는 관찰만/);
  assert.match(errs((r) => { r.sections.map.screens.push({ name: '/dashboard', purpose: '코드에서만', features: [], status: 'observed', evidence: ['E11'] }); }), /map\.screens\[\d+\]: 코드에서만 본 것은 관찰/);
  assert.match(errs((r) => { r.evidence[10].seen = 'bundle'; }), /seen 은 page \| flow \| code/);
  assert.match(errs((r) => { r.sections.flow.services = [{ kind: 'payment', label: '결제', names: ['토스페이먼츠'], seen: 'flow', evidence: ['E11'] }]; }), /흐름에서 봤다고 적으려면 흐름에서 본 근거가 있어야/);
  assert.equal(errs((r) => { r.sections.flow.services = [{ kind: 'payment', label: '결제', names: ['토스페이먼츠'], seen: 'flow', evidence: ['E12'] }]; }), '');
  // 읽은 깊이
  assert.match(errs((r) => { r.meta.depth.steps[1] = { key: 'flow', state: 'skipped' }; }), /끝까지 못 읽은 단계에는 까닭\(note\)을 적어요/);
  assert.match(errs((r) => { r.meta.depth.steps[2] = { key: 'code', state: 'skipped', note: '하지 않음' }; }), /코드에서 본 근거가 있는데 속 읽기 단계가 done 이나 partial 이 아니에요/);
  assert.match(errs((r) => { r.meta.depth.steps[0].key = 'deep'; }), /key 는 surface \| flow \| code/);
});

test('from-rea: 흐름 기록과 속 기록을 읽어 초안에 넣고, 코드에서 본 것은 코드 흔적으로 둔다', () => {
  const dir = tmp();
  const node = (id, parent, role, name) => ({ node_id: id, parent_id: parent, role, name, ignored: false });
  fs.writeFileSync(path.join(dir, 'inspect.json'), JSON.stringify({ operation: 'inspect_web_page', evidence_id: 'ev_1', normalized_result: { target: { url: 'https://shop.example/', origin: 'https://shop.example', title: '시험 가게' }, capture_window: { started_at: '2026-11-17T03:00:00Z' }, accessibility: { text_capture: { status: 'included' }, nodes: [node('1', null, 'RootWebArea', ''), node('2', '1', 'heading', '시험용 제목'), node('3', '1', 'StaticText', '한 달 9,900원')] }, scripts: { items: [] } } }));
  fs.writeFileSync(path.join(dir, 'bundle.json'), JSON.stringify({ records: [{ operation: 'analyze_web_bundle', evidence_id: 'ev_2', normalized_result: { capture: { scripts_observed: 2 }, completeness: { parsed_scripts: 2, status: 'complete' }, route_inventory: { routes: [{ path: '/dashboard' }, { path: '/' }] }, observations: { routes: [], endpoints: [] } } }] }));
  fs.writeFileSync(path.join(dir, '03_flow.json'), JSON.stringify({ clicks: 3, kinds: { details: 3 }, hosts: [{ host: 'shop.example', requests: 9, sent: 9 }, { host: 'js.stripe.com', requests: 1, sent: 1 }, { host: 'www.google-analytics.com', requests: 2, sent: 0 }] }));
  fs.writeFileSync(path.join(dir, '04_code_scan.json'), JSON.stringify({ files: 2, bytes: 1000, routes: ['/dashboard', '/my/orders'], endpoints: ['/api/pay'], payments: ['Stripe', '토스페이먼츠'], prices: ['29000'], plans: ['프로'] }));
  const { report } = buildDraft({ evidenceFiles: ['inspect.json', 'bundle.json', '03_flow.json', '04_code_scan.json'].map((f) => path.join(dir, f)), base: dir });
  const k = checkReport(report, { dissectOnly: true });
  assert.ok(k.errors.every((e) => /one_line/.test(e)), k.errors.join(' / '));
  assert.ok(k.counts.code >= 6);
  assert.deepEqual(report.evidence.filter((e) => e.seen).map((e) => [e.ref, e.seen]), [['bundle.json', 'code'], ['03_flow.json', 'flow'], ['04_code_scan.json', 'code']]);
  assert.deepEqual(report.meta.depth.steps.map((s) => s.state), ['done', 'done', 'done']);
  assert.deepEqual(report.sections.flow.services.map((s) => [s.kind, s.names.join(), s.seen]), [['payment', 'Stripe', 'flow'], ['analytics', 'Google 태그', 'flow'], ['payment', '토스페이먼츠', 'code']]);
  assert.ok(report.sections.money.price.some((p) => p.status === 'observed' && /9,900원/.test(p.text)));
  assert.ok(report.sections.money.price.some((p) => p.status === 'code' && /29000/.test(p.text)));
  assert.deepEqual(report.sections.map.screens.filter((s) => s.status === 'code').map((s) => s.name), ['/dashboard', '/my/orders']);
  assert.ok(report.sections.tech.items.every((t) => !(t.status === 'observed' && /경로 모양/.test(t.text))), '번들에서 본 경로는 관찰이 아니다');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('해부 화면: 읽은 깊이, 코드 흔적, 바깥 서비스 자리가 있고 영상은 30초를 넘지 않는다', () => {
  const html = fs.readFileSync(path.join(ROOT, 'viewer', 'index.html'), 'utf8');
  assert.match(html, /id="h-depth"/);
  const js = fs.readFileSync(path.join(ROOT, 'viewer', 'viewer.js'), 'utf8');
  assert.match(js, /function renderDepth/);
  assert.match(js, /screen-code/);
  const css = fs.readFileSync(path.join(ROOT, 'viewer', 'viewer.css'), 'utf8');
  assert.match(css, /\.st\.code/);
  assert.match(css, /\.features\.code-routes li \{[^}]*dashed/);
  const sections = fs.readFileSync(path.join(ROOT, 'viewer', 'sections.js'), 'utf8');
  assert.match(sections, /flow-services/);
  const stage = fs.readFileSync(path.join(ROOT, 'viewer', 'stage.js'), 'utf8');
  assert.match(stage, /function sceneDepth/);
  const dur = Number((/var DUR = ([\d.]+);/.exec(stage) || [])[1]);
  assert.ok(dur >= 20 && dur <= 30, `영상 길이 ${dur}초`);
});
