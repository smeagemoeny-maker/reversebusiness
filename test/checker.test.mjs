// 검사기, 초안 만들기, 화면 만들기 시험.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkReport } from '../skill/reversebusiness/tools/check-report.mjs';
import { checkClone } from '../skill/reversebusiness/tools/check-clone.mjs';
import { buildDraft, scrub, cleanUrl } from '../skill/reversebusiness/tools/from-rea.mjs';
import { buildView, loadMine } from '../skill/reversebusiness/tools/build-view.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EX = path.join(ROOT, 'examples', 'aicitybuilders-vibecoding');
const example = () => JSON.parse(fs.readFileSync(path.join(EX, 'report.json'), 'utf8'));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'rebiz-test-'));
const errorsOf = (mutate) => { const r = example(); mutate(r); return checkReport(r).errors.join('\n'); };

test('예시 리포트는 검사를 통과한다', () => {
  const { errors, warnings, counts } = checkReport(example());
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  assert.deepEqual(counts, { observed: 20, inferred: 6, unknown: 7, code: 0 });
});

test('리포트 검사: 선을 넘는 내용을 잡는다', () => {
  assert.match(errorsOf((r) => { r.sections.money.customer[0].evidence = []; }), /관찰에는 근거가 1개 이상/);
  assert.match(errorsOf((r) => { r.sections.money.customer[0].evidence = ['E99']; }), /근거 E99 가 장부에 없어요/);
  assert.match(errorsOf((r) => { r.sections.money.revenue = [{ text: '월 매출 1억', status: 'inferred', evidence: ['E1'] }]; }), /수익 숫자는 공개된 근거가 있는 관찰만/);
  assert.match(errorsOf((r) => { r.sections.money.revenue = [{ text: '월 매출 1억', status: 'observed', evidence: ['E4'] }]; }), /공개 출처/);
  assert.match(errorsOf((r) => { r.sections.flow.steps = r.sections.flow.steps.filter((s) => s.stage !== 'payment'); }), /payment 단계가 없어요/);
  assert.match(errorsOf((r) => { r.sections.my_version.differences.pop(); }), /차별점은 정확히 3개/);
  assert.match(errorsOf((r) => { r.sections.my_version.working_name = `${r.meta.target.name} 클론`; }), /클론, 카피 같은 말/);
  assert.match(errorsOf((r) => { r.sections.my_version.working_name = `새 ${r.meta.target.name}`; }), /대상의 이름을 내 버전 이름에 넣지 않아요/);
  assert.match(errorsOf((r) => { r.evidence.push({ id: 'E11', type: 'file', ref: 'src/app.js', note: 'x' }); }), /남의 서비스에는 file/);
  assert.match(errorsOf((r) => { r.meta.terms.status = 'not-applicable'; }), /남의 서비스는 not-applicable/);
  assert.match(errorsOf((r) => { r.sections.tech.items[0].text = 'key sk-abcdefghijklmnopqrstuvwx'; }), /비밀 키처럼 보이는 글자/);
  assert.match(errorsOf((r) => { r.schema = 'other@1'; }), /rebiz\/report@1/);
});

test('리포트 검사: 뼈대와 단계 이름', () => {
  assert.match(errorsOf((r) => { r.skeleton.blocks[0].role = 'hero'; }), /role 은 attract/);
  assert.match(errorsOf((r) => { r.skeleton.blocks[0].weight = 0; }), /weight 는 0보다 큰 숫자/);
  assert.match(errorsOf((r) => { r.skeleton.blocks = []; }), /구역이 한 개 이상/);
  assert.match(errorsOf((r) => { r.sections.flow.steps[0].stage = 'landing'; }), /stage 는 arrive/);
  assert.equal(errorsOf((r) => { delete r.skeleton; }), '', '뼈대는 없어도 된다');
});

test('겹침 검사: 예시의 내 버전은 통과하고, 원본 문장, 이름, 그림 주소를 넣으면 실패한다', () => {
  // 시험용으로 지어낸 원본
  const source = {
    texts: ['달빛 도시락은 퇴근길에 받는 따뜻한 저녁 도시락을 매일 문 앞에 둡니다', '한 끼 팔천구백 원부터 시작합니다', '자주 묻는 질문'],
    names: ['달빛 도시락'], domains: ['dalbit-dosirak.example', 'dalbit-dosirak'], assets: ['https://dalbit-dosirak.example/img/hero.webp'],
  };
  const ok = checkClone(path.join(EX, 'my-version'), source);
  assert.deepEqual(ok.fails, []);
  assert.ok(ok.stats.textFiles >= 2);
  const dir = tmp();
  fs.cpSync(path.join(EX, 'my-version'), dir, { recursive: true });
  const page = path.join(dir, 'index.html');
  fs.writeFileSync(page, fs.readFileSync(page, 'utf8').replace('</main>', '<p>우리는 퇴근길에 받는 따뜻한 저녁 도시락을 매일 준비합니다</p><p>Dalbit Dosirak 방식</p><img src="https://dalbit-dosirak.example/img/hero.webp" alt=""></main>'));
  const bad = checkClone(dir, source);
  const rules = bad.fails.map((f) => f.rule);
  assert.ok(rules.includes('문장') && rules.includes('이름') && rules.includes('자원'), JSON.stringify(bad.fails));
  const cli = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'rebiz.mjs'), 'clone-check', dir, '--text', page, '--brand', '달빛 도시락'], { encoding: 'utf8' });
  assert.equal(cli.status, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('가리기: 이메일, 전화, 키 모양 글자, 주소의 물음표 뒤', () => {
  assert.equal(scrub('문의 a.b@example.com 또는 010-1234-5678'), '문의 [이메일 가림] 또는 [전화 가림]');
  assert.equal(scrub('key sk-abcdefghijklmnopqrstuvwxyz'), 'key [키 모양 글자 가림]');
  assert.equal(cleanUrl('https://example.com/a/b?token=abc#x'), 'https://example.com/a/b');
});

test('REA 근거에서 초안: 본 것만 옮기고 비밀 값이 실릴 수 있는 키는 버린다', () => {
  const dir = tmp();
  const node = (id, parent, role, name) => ({ node_id: id, parent_id: parent, role, name, ignored: false });
  const evidence = {
    operation: 'inspect_web_page', evidence_id: 'ev_test_0001',
    normalized_result: {
      target: { url: 'https://shop.example/landing?session=zzz', origin: 'https://shop.example', title: '시험 가게 | 달빛' },
      capture_window: { started_at: '2026-11-17T03:00:00Z' },
      accessibility: {
        text_capture: { status: 'included' },
        nodes: [node('1', null, 'RootWebArea', ''), node('2', '1', 'main', ''), node('3', '2', 'heading', '시험용 제목'), node('4', '2', 'paragraph', ''), node('5', '4', 'StaticText', '한 달 9,900원에 시작합니다'), node('6', '2', 'button', '회원가입'), node('7', '2', 'link', '구독 신청하기')],
      },
      scripts: { items: [{ url: 'https://shop.example/static/main.abc.js?v=1', length: 1000 }] },
      storage: { local_storage_keys: ['lang'], session_storage_keys: [], indexed_db_names: [] },
      cookies: [{ name: 'sid', value: 'SECRET-COOKIE-VALUE' }],
      request_headers: { authorization: 'Bearer SECRET-TOKEN-VALUE' },
    },
  };
  const file = path.join(dir, 'inspect.json');
  fs.writeFileSync(file, JSON.stringify(evidence));
  const { report, source, stats } = buildDraft({ evidenceFiles: [file], base: dir });
  assert.equal(report.schema, 'rebiz/report@1');
  assert.equal(source.schema, 'rebiz/source@1');
  assert.equal(report.meta.target.url, 'https://shop.example/landing');
  assert.match(JSON.stringify(report.sections.money.price), /9,900원/);
  assert.equal(report.sections.money.customer[0].status, 'unknown');
  const all = JSON.stringify({ report, source });
  assert.ok(!all.includes('SECRET-COOKIE-VALUE') && !all.includes('SECRET-TOKEN-VALUE') && !all.includes('session=zzz'));
  assert.ok(stats.dropped.includes('cookies'));
  const errors = checkReport(report).errors;
  assert.ok(errors.length > 0 && errors.every((e) => /one_line|my_version/.test(e)), errors.join(' / '));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('해부 화면: 한 파일, 바깥 자원 없음, 내 버전 미리보기에는 스크립트가 없다', () => {
  const dir = tmp();
  const out = buildView(path.join(EX, 'report.json'), path.join(dir, 'view.html'), { mine: path.join(EX, 'my-version') });
  const html = fs.readFileSync(out, 'utf8');
  assert.ok(!/<script[^>]+src=/.test(html) && !/<link[^>]+href=/.test(html), '스크립트와 스타일이 모두 안에 들어 있다');
  const loads = [...html.matchAll(/(?:src|href)\s*=\s*"(https?:[^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(loads)].sort(), ['https://www.aicitybuilders.com', 'https://www.youtube.com/@CONNECT-AI-LAB'], '바깥 주소는 꼬리말의 링크 두 개뿐');
  assert.ok(!/@import|url\(\s*["']?https?:/.test(html));
  const mine = loadMine(path.join(EX, 'my-version'));
  assert.ok(!/<script/i.test(mine.html) && /<style>/.test(mine.html) && !/<link[^>]+stylesheet/i.test(mine.html));
  assert.match(mine.html, /Content-Security-Policy" content="default-src 'none'/, '미리보기는 바깥 자원을 불러오지 못한다');
  const risky = path.join(dir, 'risky');
  fs.mkdirSync(risky);
  fs.writeFileSync(path.join(risky, 'index.html'), '<html><head><meta http-equiv="refresh" content="0;url=https://elsewhere.example"><base href="https://elsewhere.example/"><script src="https://elsewhere.example/x.js"></script></head><body><img src="dot.png"><img src="https://elsewhere.example/a.png"></body></html>');
  fs.writeFileSync(path.join(risky, 'dot.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
  const r2 = loadMine(risky).html;
  assert.ok(!/refresh|<base|<script/i.test(r2), '저절로 넘어가기, base, 스크립트를 뺀다');
  assert.match(r2, /<img src="data:image\/png;base64,/, '같은 폴더의 작은 그림은 안으로 넣는다');
  assert.match(mine.image, /^data:image\/jpeg;base64,/);
  assert.ok(Object.keys(mine.rects).length >= 9);
  // 리포트 글에 태그가 들어 있어도 화면을 깨지 못한다
  const evil = example();
  evil.meta.target.name = '</script><script>window.__pwned = 1</script>';
  const f = path.join(dir, 'evil.json');
  fs.writeFileSync(f, JSON.stringify(evil));
  const html2 = fs.readFileSync(buildView(f, path.join(dir, 'evil.html')), 'utf8');
  assert.ok(!html2.includes('</script><script>window.__pwned'));
  assert.equal((html2.match(/<script>/g) || []).length, 4);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('뷰어 스크립트는 리포트 글을 HTML 로 해석하지 않는다', () => {
  for (const f of ['viewer.js', 'stage.js', 'sections.js']) {
    const js = fs.readFileSync(path.join(ROOT, 'viewer', f), 'utf8');
    assert.ok(!/\.innerHTML|insertAdjacentHTML|document\.write|\beval\(/.test(js), f);
  }
  const sections = fs.readFileSync(path.join(ROOT, 'viewer', 'sections.js'), 'utf8');
  assert.match(sections, /setAttribute\('sandbox', 'allow-same-origin'\)/);
  assert.ok(!/allow-scripts/.test(sections));
});

test('해부만 검사: 내 버전 칸이 비어 있어도 통과하고, 쓰기 시작했으면 끝까지 본다', () => {
  const blankMine = () => { const r = example(); r.sections.my_version = { working_name: '', same_problem: '', who: '', mvp: [], differences: [{ title: '', text: '' }, { title: '', text: '' }, { title: '', text: '' }], not_taken: [] }; return r; };
  const full = checkReport(blankMine());
  assert.ok(full.errors.some((e) => /my_version/.test(e)), '보통 검사에서는 빈 내 버전이 오류');
  assert.equal(full.myVersion, 'empty');
  const only = checkReport(blankMine(), { dissectOnly: true });
  assert.deepEqual(only.errors, []);
  assert.equal(only.myVersion, 'empty');
  const half = blankMine();
  half.sections.my_version.working_name = '새 이름';
  assert.ok(checkReport(half, { dissectOnly: true }).errors.some((e) => /my_version/.test(e)), '쓰다 만 내 버전은 해부만 검사에서도 잡는다');
  const noSection = blankMine();
  delete noSection.sections.my_version;
  assert.deepEqual(checkReport(noSection, { dissectOnly: true }).errors, []);
  // 해부만 검사라도 나머지 선은 그대로
  const bad = blankMine();
  bad.sections.money.customer[0].evidence = [];
  assert.match(checkReport(bad, { dissectOnly: true }).errors.join(' '), /관찰에는 근거가 1개 이상/);
  const dir = tmp();
  const f = path.join(dir, 'r.json');
  fs.writeFileSync(f, JSON.stringify(blankMine()));
  const cli = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'rebiz.mjs'), 'check', f, '--dissect-only'], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stdout);
  assert.match(cli.stdout, /내 버전 칸 {2}아직 안 씀 \(해부만 검사\)/);
  assert.match(cli.stdout, /통과 \(경고 0개\) · 해부만/);
  assert.equal(spawnSync(process.execPath, [path.join(ROOT, 'bin', 'rebiz.mjs'), 'check', f], { encoding: 'utf8' }).status, 1);
  const tool = spawnSync(process.execPath, [path.join(ROOT, 'skill', 'reversebusiness', 'tools', 'check-report.mjs'), f, '--dissect-only'], { encoding: 'utf8' });
  assert.equal(tool.status, 0, tool.stdout);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('약관 상태값: robots-only 는 경고, 모르는 값은 오류', () => {
  const r = example();
  r.meta.terms.status = 'robots-only';
  const a = checkReport(r);
  assert.deepEqual(a.errors, []);
  assert.ok(a.warnings.some((w) => /robots\.txt 까지만 확인/.test(w)));
  assert.match(errorsOf((x) => { x.meta.terms.status = 'seen'; }), /checked \| robots-only \| not-applicable \| not-found/);
});

test('해부 화면: 얇은 결과 알림과 아직 만들지 않음 자리가 들어 있다', () => {
  const html = fs.readFileSync(path.join(ROOT, 'viewer', 'index.html'), 'utf8');
  assert.match(html, /id="h-thin"/);
  const js = fs.readFileSync(path.join(ROOT, 'viewer', 'viewer.js'), 'utf8');
  assert.match(js, /rd && rd\.thin/);
  assert.match(js, /아직 만들지 않음/);
  assert.match(fs.readFileSync(path.join(ROOT, 'viewer', 'sections.js'), 'utf8'), /no_mine_t: '아직 만들지 않음'/);
});
