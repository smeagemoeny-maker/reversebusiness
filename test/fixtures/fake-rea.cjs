// 시험용 대역: REA 인 척하는 작은 스크립트 (node 로 실행). 진짜 REA 를 시험에서 돌리지 않으려고 쓴다.
// 받은 인자를 FAKE_REA_LOG 에 한 줄씩 적고, 정해 둔 모양의 답을 낸다. 아무 데도 접속하지 않는다.
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
if (process.env.FAKE_REA_LOG) fs.appendFileSync(process.env.FAKE_REA_LOG, JSON.stringify(args) + '\n');
const fail = (process.env.FAKE_REA_FAIL || '').split(',');
const val = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : ''; };
const out = (o) => process.stdout.write(JSON.stringify(o) + '\n');
const cmd = args[0];
if (!cmd) process.exit(0);
if (cmd === '--version') { process.stdout.write('6.9.0\n'); process.exit(0); }
if (cmd === 'setup') {
  if (fail.includes('setup')) { process.stderr.write('setup failed\n'); process.exit(1); }
  const clients = args.filter((a, i) => args[i - 1] === '--client');
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const actions = clients.map((c) => ({ id: `configure_client:${c}`, kind: 'configure_client', label: c, target: path.join(home, `.${c}.fake.json`), operation: 'create' }))
    .concat([{ id: 'install_skill', kind: 'install_skill', label: 'REA reverse-engineering skill', target: path.join(home, '.agents', 'skills', 'reverse-engineer-anything'), operation: 'install' }]);
  if (args.includes('--dry-run')) { out({ status: 'planned', plannedActions: actions, appliedActions: [] }); process.exit(0); }
  if (!args.includes('--yes')) { out({ status: 'needs_confirmation', plannedActions: actions, appliedActions: [] }); process.exit(1); }
  if (fail.includes('apply')) { process.stderr.write('apply failed\n'); process.exit(1); } // 계획은 냈지만 설치가 실패하는 경우
  for (const a of actions) { fs.mkdirSync(a.kind === 'install_skill' ? a.target : path.dirname(a.target), { recursive: true }); fs.writeFileSync(a.kind === 'install_skill' ? path.join(a.target, 'SKILL.md') : a.target, 'fake rea\n'); }
  out({ status: 'ready', plannedActions: actions, appliedActions: clients.map((c) => `configured_${c}`).concat(['installed_skill']) }); // 진짜 REA 6.9.0 이 내는 모양
  process.exit(0);
}
if (cmd === 'inspect-web-page' || cmd === 'analyze-web-bundle') {
  const endpoint = args[1], target = args[2], origin = val('--allowed-origins');
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(endpoint) || !target) { process.stderr.write('endpoint must be loopback\n'); process.exit(2); }
  if (!/^https?:\/\/[^\s\[\]"]+$/.test(origin)) { process.stderr.write('invalid_request: allowed-origins must be a plain origin\n'); process.exit(2); }
  if (fail.includes(cmd === 'inspect-web-page' ? 'inspect' : 'bundle')) { process.stderr.write('failed\n'); process.exit(1); }
  if (cmd === 'inspect-web-page') {
    out({ operation: 'inspect_web_page', evidence_id: 'ev_fake_inspect', normalized_result: {
      target: { url: `${origin}/shop`, origin, title: '달콤 구독 | 시험용 가게' }, capture_window: { started_at: '2026-11-17T00:00:00Z' },
      accessibility: { text_capture: { status: 'included' }, nodes: [{ node_id: '1', parent_id: null, role: 'RootWebArea', name: '' }, { node_id: '2', parent_id: '1', role: 'heading', name: '시험용 제목' }] },
      scripts: { items: [{ url: `${origin}/shop.js`, length: 2400 }] },
      storage: { local_storage_keys: ['lang', 'theme'], session_storage_keys: [], indexed_db_names: ['fixture-db'] },
      cookies: [{ name: 'sid', value: 'SECRET-COOKIE-VALUE' }],
    } });
    process.exit(0);
  }
  const file = val('--evidence_output');
  if (!file || fs.existsSync(file)) { process.stderr.write('evidence_output must be an absent file\n'); process.exit(2); }
  fs.writeFileSync(file, JSON.stringify({ records: [{ operation: 'analyze_web_bundle', evidence_id: 'ev_fake_bundle', normalized_result: {
    capture: { scripts_observed: 3, target_url: `${origin}/shop`, target_origin: origin }, completeness: { parsed_scripts: 2, status: 'partial' },
    route_inventory: { routes: [{ path: '/dashboard' }, { path: '/admin/reports' }, { path: '/' }] }, observations: { routes: [{ value: '/en' }], endpoints: [] }, unknowns: [],
  } }] }));
  out({ summary: { operation: 'inspect_analysis_view' } });
  process.exit(0);
}
process.stderr.write(`unknown command ${cmd}\n`);
process.exit(2);
