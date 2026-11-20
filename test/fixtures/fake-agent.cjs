// 시험용 대역: 에이전트 CLI(claude, codex)인 척하는 작은 스크립트 (node 로 실행). 진짜 에이전트를 시험에서 돌리지 않으려고 쓴다.
// 받은 인자, 작업 폴더, 표준 입력으로 온 할 일을 FAKE_AGENT_LOG 에 한 줄로 적고, FAKE_AGENT_MODE 에 따라 정해 둔 일을 한다.
// 아무 데도 접속하지 않는다. 고치는 것은 작업 폴더 안의 파일뿐이다.
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const mode = process.env.FAKE_AGENT_MODE || 'noop';
let prompt = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { prompt += d; });
process.stdin.on('end', () => {
  if (process.env.FAKE_AGENT_LOG) fs.appendFileSync(process.env.FAKE_AGENT_LOG, JSON.stringify({ args, cwd: process.cwd(), prompt, mode, pid: process.pid }) + '\n');
  const cwd = process.cwd();
  const report = path.join(cwd, 'report.json');
  const load = () => JSON.parse(fs.readFileSync(report, 'utf8'));
  const save = (r) => fs.writeFileSync(report, JSON.stringify(r, null, 2) + '\n');
  if (mode === 'fail') { process.stderr.write('fake agent failed\n'); process.exit(1); }
  if (mode === 'sleep') { setTimeout(() => process.exit(0), 600000); return; }
  if (mode === 'break') { fs.writeFileSync(report, '{ 깨진 json'); process.exit(0); }
  if (mode === 'stray') fs.writeFileSync(path.join(cwd, 'extra.txt'), '리포트 말고 다른 파일\n');
  const specFixture = {
    working_name: '골목 화분 구독 (가상의 예시)', same_problem: '한 장짜리 페이지에서 믿음을 주며 정기 구독을 판다.', who: '가상의 예시다. 집에서 작은 화분을 키우는 사람.',
    mvp: ['무엇을 받는지 보여 주는 한 장면', '달마다 받는 것 세 가지', '가격과 바꾸는 방법'],
    differences: [{ title: '대상', text: '집에서 화분을 키우는 사람이다.' }, { title: '형태', text: '정적인 한 장이다.' }, { title: '유통', text: '동네 배달만 한다.' }],
    not_taken: ['문구, 이름, 그림, 색을 하나도 옮기지 않는다'],
  };
  if (mode === 'fill' || mode === 'stray' || mode === 'dissect') {
    const r = load();
    const ev = (r.evidence[0] || {}).id;
    const infer = (item, text) => {
      if (item && item.status === 'unknown') { item.text = text; item.status = 'inferred'; item.evidence = ev ? [ev] : []; }
    };
    (r.sections.money.customer || []).forEach((x) => infer(x, '읽어 둔 자료의 결과물 예시로 보아 혼자 가게를 꾸리는 사람을 겨냥한 것으로 추정한다.'));
    if (mode === 'dissect') {
      r.meta.draft = false;
      r.meta.one_line = '작은 그릇 정기 구독 서비스를 공개 페이지 기준으로 해부한 리포트다.';
      (r.sections.money.problem || []).forEach((x) => infer(x, '읽어 둔 자료로 보아 빠른 결과 확인이 필요한 문제를 푸는 것으로 추정한다.'));
      (r.sections.flow?.steps || []).forEach((x) => infer(x, '읽어 둔 자료상 첫 화면 탐색과 재방문 안내로 이어지는 것으로 추정한다.'));
      r.sections.my_version = specFixture;
    }
    save(r);
  }
  if (mode === 'spec') {
    const r = load();
    r.sections.my_version = specFixture;
    save(r);
  }
  if (mode === 'apply') {
    // 내 첫 화면에 물음 구역 하나를 내 말로 넣는다. 가격은 지어내지 않고 자리만 둔다.
    const page = path.join(cwd, 'index.html');
    const html = fs.readFileSync(page, 'utf8');
    const add = '<section class="ask" id="ask">\n  <h2>오기 전에 묻는 것</h2>\n  <details><summary>공구를 따로 사서 가져와야 하나요</summary><p>교실에 다 있습니다.</p></details>\n  <details><summary>수업료는 얼마인가요</summary><p>여기에 쓸 것: 지금 수업료.</p></details>\n</section>\n';
    fs.writeFileSync(page, html.replace('<footer', add + '<footer'));
  }
  process.stdout.write('fake agent done (' + mode + ')\n');
  process.exit(0);
});
