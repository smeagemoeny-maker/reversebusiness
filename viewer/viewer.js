// reversebusiness 뷰어. report.json(rebiz/report@1)을 한 장으로 그린다.
// 볼거리(해부 장면, 구조도, 비교)는 stage.js 와 sections.js 가 그린다.
// 의존성 없음. 리포트 내용은 전부 textContent 로만 넣는다(HTML 로 해석하지 않음).
(function () {
  'use strict';

  var T = {
    ko: {
      open: '다른 리포트 열기', pick: '파일 고르기',
      empty_title: 'report.json 을 여기에 놓으세요',
      empty_sub: '파일은 이 브라우저 안에서만 읽습니다. 어디로도 보내지 않습니다.',
      foot_line: '이 리포트는 공개적으로 관찰한 것만 담습니다. 추정은 추정으로, 모르는 것은 모름으로 적습니다. 공부와 기획을 위한 정리이며 법률 자문이 아닙니다.',
      bad_file: '이 파일은 reversebusiness 리포트가 아니에요. schema 가 "rebiz/report@1" 인 report.json 을 넣어 주세요.',
      bad_json: 'JSON 으로 읽을 수 없는 파일이에요.',
      observed: '관찰', inferred: '추정', unknown: '모름', code: '코드 흔적',
      code_note: '코드 흔적은 내려온 코드 안에서만 본 것입니다. 지금 그렇다는 뜻이 아닙니다.', code_screens: '코드에서만 이름이 보인 화면 (열어 보지 않음)',
      depth_title: '읽은 깊이', d_surface: '겉 읽기', d_flow: '흐름 읽기', d_code: '속 읽기', d_surface_s: '화면의 글과 구조', d_flow_s: '펼치기와 요청이 나간 곳', d_code_s: '내려온 코드 안의 이름',
      ds_done: '읽음', ds_partial: '일부만', ds_skipped: '안 함', ds_blocked: '약관이 막음', ds_failed: '실패', seen_flow: '흐름에서 봄', seen_code: '코드에서 봄',
      tally_title: '이 리포트의 문장', tally_note_a: '따로 정리한 모르는 것 ', tally_note_b: '건', evidence_n: '근거 ',
      m_date: '분석일', m_rel: '관계', m_scope: '범위', m_method: '방법', m_terms: '이용약관', m_by: '분석', m_url: '주소',
      own: '내 것 (소스 읽기 가능)', third: '남의 것 (공개된 것만)',
      terms_checked: '확인함', 'terms_robots-only': 'robots.txt 만 확인 (약관은 아직 읽지 않음)', 'terms_not-applicable': '해당 없음', 'terms_not-found': '찾지 못함',
      thin_a: '읽은 글이 ', thin_b: '자뿐이라 모름이 많습니다.', thin_next: '다음에 할 일: ', read_rendered: '브라우저가 그린 화면을 읽음', read_html: '받은 HTML 만 읽음', m_read: '읽은 방식', chars: '자',
      c1: '누가 왜 돈을 내는가', c2: '핵심 사용자 흐름', c3: '화면과 기능 지도', c4: '기술 구성', c5: '근거와 모르는 것', c6: '내 버전 명세',
      customer: '고객', problem: '문제', price: '가격', revenue: '공개된 숫자',
      revenue_empty: '공개된 근거가 있는 숫자가 없어 비워 둠',
      signup: '가입', first_value: '첫 가치', payment: '결제', arrive: '유입', 'return': '다시 오기', other: '단계',
      draft: '자동 초안', no_one_line: '한 줄 요약은 아직 비어 있습니다. 에이전트가 읽고 채웁니다.', spec_empty: '아직 만들지 않음. 해부만 한 리포트입니다. 내 버전까지 가려면 에이전트에게 이 리포트를 넘겨 6번 칸을 채우게 하세요.',
      unknowns: '모르는 것', ledger: '근거 장부', why: '이유', next: '알아낼 방법', from_cell: '칸',
      none_unknown: '따로 정리한 항목 없음',
      idx_evidence: '근거', idx_unknowns: '모르는 것', idx_diff: '차별점', idx_mvp: '최소 기능',
      proposal: '제안', same_problem: '같은 문제', who: '누구를 위해', mvp: '최소 기능', not_taken: '가져오지 않는 것', diff: '차별점'
    },
    en: {
      open: 'Open another report', pick: 'Choose file',
      empty_title: 'Drop a report.json here',
      empty_sub: 'The file is read inside this browser only. Nothing is sent anywhere.',
      foot_line: 'This report holds only what was publicly observed. Inferences are marked as inferred, unknowns as unknown. It is a study and planning note, not legal advice.',
      bad_file: 'This is not a reversebusiness report. Use a report.json whose schema is "rebiz/report@1".',
      bad_json: 'This file could not be read as JSON.',
      observed: 'OBSERVED', inferred: 'INFERRED', unknown: 'UNKNOWN', code: 'CODE TRACE',
      code_note: 'A code trace was seen only inside the downloaded code. It does not mean it is true today.', code_screens: 'Screens named only in code (not opened)',
      depth_title: 'READING DEPTH', d_surface: 'Surface', d_flow: 'Flow', d_code: 'Code', d_surface_s: 'Text and structure on screen', d_flow_s: 'Expanding, and where requests go', d_code_s: 'Names inside the downloaded code',
      ds_done: 'READ', ds_partial: 'PARTIAL', ds_skipped: 'NOT DONE', ds_blocked: 'BLOCKED BY TERMS', ds_failed: 'FAILED', seen_flow: 'SEEN IN FLOW', seen_code: 'SEEN IN CODE',
      tally_title: 'STATEMENTS IN THIS REPORT', tally_note_a: 'Open questions listed: ', tally_note_b: '', evidence_n: 'Evidence ',
      m_date: 'DATE', m_rel: 'RELATION', m_scope: 'SCOPE', m_method: 'METHOD', m_terms: 'TERMS', m_by: 'ANALYST', m_url: 'URL',
      own: 'Own product (source readable)', third: 'Third party (public material only)',
      terms_checked: 'Checked', 'terms_robots-only': 'robots.txt only (terms not read yet)', 'terms_not-applicable': 'Not applicable', 'terms_not-found': 'Not found',
      thin_a: 'Only ', thin_b: ' characters could be read, so many items are unknown.', thin_next: 'Next: ', read_rendered: 'Read from the page as drawn by a browser', read_html: 'Read from the received HTML only', m_read: 'READ', chars: ' chars',
      c1: 'Who pays, and why', c2: 'Core user flow', c3: 'Screen and feature map', c4: 'Tech setup', c5: 'Evidence and unknowns', c6: 'My version spec',
      customer: 'CUSTOMER', problem: 'PROBLEM', price: 'PRICE', revenue: 'PUBLIC NUMBERS',
      revenue_empty: 'Left empty: no number with a public source',
      signup: 'SIGN-UP', first_value: 'FIRST VALUE', payment: 'PAYMENT', arrive: 'ARRIVE', 'return': 'RETURN', other: 'STEP',
      draft: 'AUTO DRAFT', no_one_line: 'The one-line summary is still empty. Your agent fills it in.', spec_empty: 'Not made yet. This report covers the dissection only. To go on to your own version, hand it to your agent to fill in cell 6.',
      unknowns: 'UNKNOWNS', ledger: 'EVIDENCE LEDGER', why: 'WHY', next: 'HOW TO FIND OUT', from_cell: 'CELL',
      none_unknown: 'No separate items',
      idx_evidence: 'EVIDENCE', idx_unknowns: 'UNKNOWNS', idx_diff: 'DIFFERENCES', idx_mvp: 'FEATURES',
      proposal: 'PROPOSAL', same_problem: 'SAME PROBLEM', who: 'FOR WHOM', mvp: 'MINIMUM FEATURES', not_taken: 'NOT TAKEN', diff: 'DIFFERENCE'
    }
  };
  var CELL_EN = ['MONEY', 'FLOW', 'MAP', 'TECH', 'EVIDENCE / UNKNOWN', 'MY VERSION'];

  var lang = (typeof navigator !== 'undefined' && /^ko\b/i.test(navigator.language || '')) ? 'ko' : 'en';
  try {
    var q = new URLSearchParams(location.search);
    if (q.get('lang') === 'en' || q.get('lang') === 'ko') lang = q.get('lang');
  } catch (e) {}
  if (window.__REBIZ__ && (window.__REBIZ__.lang === 'en' || window.__REBIZ__.lang === 'ko')) lang = window.__REBIZ__.lang;
  var current = null;

  function t(k) { return (T[lang] && T[lang][k]) || T.ko[k] || k; }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function str(v) { return typeof v === 'string' ? v : v == null ? '' : String(v); }
  function isHttp(u) { return /^https?:\/\//i.test(str(u)); }

  // ---------- small pieces ----------
  function statusTag(s) {
    var ok = s === 'observed' || s === 'inferred' || s === 'unknown' || s === 'code';
    return el('span', 'st ' + (ok ? s : 'unknown'), t(ok ? s : 'unknown'));
  }
  function evChips(ids) {
    return arr(ids).map(function (id) {
      var b = el('button', 'ev', str(id));
      b.type = 'button';
      b.addEventListener('click', function () { jumpToEvidence(str(id)); });
      return b;
    });
  }
  function jumpToEvidence(id) {
    var row = document.querySelector('[data-ev="' + id.replace(/[^A-Za-z0-9_-]/g, '') + '"]');
    if (!row) return;
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('flash');
    setTimeout(function () { row.classList.remove('flash'); }, 1600);
  }
  function claim(c) {
    var s = c && c.status;
    var box = el('div', 'claim ' + (s === 'inferred' ? 'inferred' : s === 'observed' ? 'observed' : s === 'code' ? 'code' : 'unknown'));
    var p = el('p', 'claim-text', str(c && c.text));
    var tags = el('span', 'claim-tags');
    tags.appendChild(statusTag(s));
    evChips(c && c.evidence).forEach(function (n) { tags.appendChild(n); });
    p.appendChild(document.createTextNode(' '));
    p.appendChild(tags);
    box.appendChild(p);
    return box;
  }
  function group(label, claims, emptyText) {
    var g = el('div', 'group');
    g.appendChild(el('p', 'group-label lab', label));
    var list = arr(claims);
    if (!list.length) g.appendChild(el('p', 'group-empty', emptyText || t('unknown')));
    list.forEach(function (c) { g.appendChild(claim(c)); });
    return g;
  }
  function cell(no, extraClass) {
    var c = el('article', 'cell' + (extraClass ? ' ' + extraClass : ''));
    c.id = 'cell-' + no;
    var head = el('div', 'cell-head');
    head.appendChild(el('span', 'cell-no', '0' + no));
    var titles = el('div');
    titles.appendChild(el('span', 'cell-en', CELL_EN[no - 1]));
    titles.appendChild(el('h2', 'cell-title', t('c' + no)));
    head.appendChild(titles);
    c.appendChild(head);
    return c;
  }
  function list(items, cls) {
    var ul = el('ul', cls);
    arr(items).forEach(function (x) { ul.appendChild(el('li', null, str(x))); });
    return ul;
  }

  // ---------- counting ----------
  function countAll(r) {
    var n = { observed: 0, inferred: 0, unknown: 0, code: 0 };
    var s = (r && r.sections) || {};
    function add(c) { if (c && n[c.status] !== undefined) n[c.status] += 1; }
    var m = s.money || {};
    ['customer', 'problem', 'price', 'revenue'].forEach(function (k) { arr(m[k]).forEach(add); });
    arr((s.flow || {}).steps).forEach(add);
    arr((s.map || {}).screens).forEach(add);
    arr((s.tech || {}).items).forEach(add);
    return n;
  }
  // 칸 안에서 모름으로 둔 문장을 5번 칸에 다시 모은다.
  function gatherUnknownClaims(r) {
    var out = [];
    var s = (r && r.sections) || {};
    function take(no, c) { if (c && c.status === 'unknown') out.push({ no: no, text: str(c.text || c.name) }); }
    var m = s.money || {};
    ['customer', 'problem', 'price', 'revenue'].forEach(function (k) { arr(m[k]).forEach(function (c) { take(1, c); }); });
    arr((s.flow || {}).steps).forEach(function (c) { take(2, c); });
    arr((s.map || {}).screens).forEach(function (c) { take(3, c); });
    arr((s.tech || {}).items).forEach(function (c) { take(4, c); });
    return out;
  }

  function countCell(r, no) {
    var n = { observed: 0, inferred: 0, unknown: 0, code: 0 };
    var s = (r && r.sections) || {};
    function add(c) { if (c && n[c.status] !== undefined) n[c.status] += 1; }
    if (no === 1) { var m = s.money || {}; ['customer', 'problem', 'price', 'revenue'].forEach(function (k) { arr(m[k]).forEach(add); }); }
    if (no === 2) arr((s.flow || {}).steps).forEach(add);
    if (no === 3) arr((s.map || {}).screens).forEach(add);
    if (no === 4) arr((s.tech || {}).items).forEach(add);
    return n;
  }
  // 여섯 칸을 한 줄로 먼저 보여 주는 띠.
  function renderIndex(r) {
    var box = $('index');
    box.textContent = '';
    var s = r.sections || {};
    for (var no = 1; no <= 6; no++) {
      var a = el('a', 'idx');
      a.href = '#cell-' + no;
      a.appendChild(el('span', 'idx-no', '0' + no));
      a.appendChild(el('span', 'idx-title', t('c' + no)));
      var line = el('span', 'idx-counts');
      if (no <= 4) {
        var n = countCell(r, no);
        ['observed', 'inferred', 'unknown'].concat(n.code ? ['code'] : []).forEach(function (k) {
          var c = el('span', 'idx-c ' + k + (n[k] ? '' : ' zero'));
          c.appendChild(el('i'));
          c.appendChild(document.createTextNode(t(k) + ' ' + n[k]));
          line.appendChild(c);
        });
      } else if (no === 5) {
        line.appendChild(el('span', 'idx-c plain', t('idx_evidence') + ' ' + arr(r.evidence).length));
        var u = el('span', 'idx-c unknown');
        u.appendChild(el('i'));
        u.appendChild(document.createTextNode(t('idx_unknowns') + ' ' + (arr(s.unknowns).length + gatherUnknownClaims(r).length)));
        line.appendChild(u);
      } else {
        line.appendChild(el('span', 'idx-c plain', t('idx_diff') + ' ' + arr((s.my_version || {}).differences).length));
        line.appendChild(el('span', 'idx-c plain', t('idx_mvp') + ' ' + arr((s.my_version || {}).mvp).length));
      }
      a.appendChild(line);
      box.appendChild(a);
    }
  }

  // ---------- hero ----------
  function renderHero(r) {
    var m = r.meta || {};
    var tg = m.target || {};
    $('h-kind').textContent = 'REVERSE BUSINESS  ·  ' + str(tg.kind || '').toUpperCase() + (m.draft ? '  ·  ' + t('draft') : '');
    $('h-name').textContent = str(tg.name);
    $('h-line').textContent = str(m.one_line) || t('no_one_line');
    $('h-line').classList.toggle('is-empty', !str(m.one_line));
    // 읽은 글이 얇으면 맨 위에 작게 알린다.
    var rd = m.read && typeof m.read === 'object' ? m.read : null;
    var thin = $('h-thin');
    thin.hidden = !(rd && rd.thin);
    thin.textContent = '';
    if (rd && rd.thin) {
      thin.appendChild(el('b', null, t('thin_a') + Number(rd.chars || 0) + t('thin_b')));
      if (lang === 'ko' && str(rd.next)) thin.appendChild(document.createTextNode(' ' + t('thin_next') + str(rd.next)));
    }
    document.title = str(tg.name) + ' · reversebusiness';

    var dl = $('h-meta');
    dl.textContent = '';
    function row(k, v, cls) {
      if (!v) return;
      dl.appendChild(el('dt', 'lab', t(k)));
      var dd = el('dd', cls);
      if (v instanceof Node) dd.appendChild(v); else dd.textContent = v;
      dl.appendChild(dd);
    }
    row('m_date', str(m.analyzed_at));
    row('m_rel', tg.relation === 'own' ? t('own') : t('third'), tg.relation === 'own' ? 'own' : null);
    if (isHttp(tg.url)) {
      var a = el('a', null, str(tg.url));
      a.href = str(tg.url); a.target = '_blank'; a.rel = 'noopener noreferrer';
      row('m_url', a);
    }
    if (m.read && typeof m.read === 'object') row('m_read', t(m.read.mode === 'rendered' ? 'read_rendered' : 'read_html') + ' · ' + Number(m.read.chars || 0) + t('chars'));
    row('m_scope', str(m.scope));
    row('m_method', arr(m.method).map(str).join(' / '));
    var terms = m.terms || {};
    row('m_terms', [t('terms_' + str(terms.status)), str(terms.note)].filter(Boolean).join(' · '));
    row('m_by', str(m.analyst));

    var n = countAll(r);
    var total = n.observed + n.inferred + n.unknown || 1;
    var box = $('h-tally');
    box.textContent = '';
    box.appendChild(el('p', 'tally-title lab', t('tally_title')));
    var nums = el('div', 'tally-nums');
    ['observed', 'inferred', 'unknown'].forEach(function (k) {
      var d = el('div', 'tally-num ' + k);
      d.appendChild(el('b', null, n[k]));
      d.appendChild(el('span', null, t(k)));
      nums.appendChild(d);
    });
    box.appendChild(nums);
    var bar = el('div', 'tally-bar');
    ['observed', 'inferred', 'unknown'].forEach(function (k) {
      if (!n[k]) return;
      var i = el('i', k);
      i.style.flex = String(n[k] / total);
      bar.appendChild(i);
    });
    box.appendChild(bar);
    var note = el('p', 'tally-note');
    note.appendChild(document.createTextNode(t('tally_note_a')));
    note.appendChild(el('b', null, arr((r.sections || {}).unknowns).length));
    note.appendChild(document.createTextNode(t('tally_note_b') + '  ·  ' + t('evidence_n')));
    note.appendChild(el('b', null, arr(r.evidence).length));
    box.appendChild(note);
    if (n.code) {
      var cn = el('p', 'tally-code');
      cn.appendChild(el('span', 'st code', t('code') + ' ' + n.code));
      cn.appendChild(document.createTextNode(' ' + t('code_note')));
      box.appendChild(cn);
    }
    renderDepth(m);
  }

  // 읽은 깊이: 겉, 흐름, 속 가운데 어디까지 읽었고 왜 멈췄는지.
  function renderDepth(m) {
    var box = $('h-depth');
    box.textContent = '';
    var d = m.depth && typeof m.depth === 'object' ? m.depth : null;
    box.hidden = !d;
    if (!d) return;
    box.appendChild(el('p', 'depth-title lab', t('depth_title')));
    var row = el('div', 'depth-row');
    ['surface', 'flow', 'code'].forEach(function (key, i) {
      var st = arr(d.steps).filter(function (x) { return x && x.key === key; })[0] || { state: 'skipped', note: '' };
      var state = /^(done|partial|skipped|blocked|failed)$/.test(st.state) ? st.state : 'skipped';
      var c = el('div', 'depth-step ' + state);
      var head = el('p', 'depth-head');
      head.appendChild(el('span', 'depth-no', '0' + (i + 1)));
      head.appendChild(el('b', null, t('d_' + key)));
      head.appendChild(el('span', 'depth-state lab', t('ds_' + state)));
      c.appendChild(head);
      c.appendChild(el('p', 'depth-sub', t('d_' + key + '_s')));
      if (str(st.note)) c.appendChild(el('p', 'depth-note', str(st.note)));
      row.appendChild(c);
    });
    box.appendChild(row);
  }

  // ---------- six cells ----------
  function renderGrid(r) {
    var s = r.sections || {};
    var grid = $('grid');
    grid.textContent = '';

    // 01 money
    var c1 = cell(1);
    var m = s.money || {};
    c1.appendChild(group(t('customer'), m.customer));
    c1.appendChild(group(t('problem'), m.problem));
    c1.appendChild(group(t('price'), m.price));
    c1.appendChild(group(t('revenue'), m.revenue, t('revenue_empty')));
    grid.appendChild(c1);

    // 02 flow
    var c2 = cell(2);
    var ol = el('ol', 'steps');
    arr((s.flow || {}).steps).forEach(function (st) {
      var li = el('li', 'step');
      var lab = el('div', 'step-label');
      lab.appendChild(el('span', null, str(st.label)));
      if (st.stage && st.stage !== 'other') lab.appendChild(el('span', 'stage lab', t(st.stage)));
      li.appendChild(lab);
      li.appendChild(claim(st));
      ol.appendChild(li);
    });
    c2.appendChild(ol);
    grid.appendChild(c2);

    // 03 map
    var c3 = cell(3);
    var codeScreens = arr((s.map || {}).screens).filter(function (sc) { return sc && sc.status === 'code'; });
    arr((s.map || {}).screens).forEach(function (sc) {
      if (sc && sc.status === 'code') return;
      var d = el('div', 'screen');
      var name = el('p', 'screen-name');
      name.appendChild(el('span', null, str(sc.name)));
      var tags = el('span', 'claim-tags');
      tags.appendChild(statusTag(sc.status));
      evChips(sc.evidence).forEach(function (n) { tags.appendChild(n); });
      name.appendChild(tags);
      d.appendChild(name);
      d.appendChild(el('p', 'screen-purpose', str(sc.purpose)));
      if (arr(sc.features).length) d.appendChild(list(sc.features, 'features'));
      c3.appendChild(d);
    });
    if (codeScreens.length) {
      // 코드에서만 이름이 보인 화면은 점선으로 따로 모은다.
      var cs = el('div', 'screen screen-code');
      var head = el('p', 'screen-name');
      head.appendChild(el('span', null, t('code_screens')));
      var tg = el('span', 'claim-tags');
      tg.appendChild(el('span', 'st code', t('code') + ' ' + codeScreens.length));
      evChips(codeScreens[0].evidence).forEach(function (n) { tg.appendChild(n); });
      head.appendChild(tg);
      cs.appendChild(head);
      var ul = el('ul', 'features code-routes');
      codeScreens.forEach(function (sc) { var li = el('li', null, str(sc.name)); li.title = str(sc.purpose); ul.appendChild(li); });
      cs.appendChild(ul);
      c3.appendChild(cs);
    }
    grid.appendChild(c3);

    // 04 tech
    var c4 = cell(4);
    arr((s.tech || {}).items).forEach(function (it) {
      var row = el('div', 'tech-row');
      row.appendChild(el('div', 'tech-layer lab', str(it.layer)));
      row.appendChild(claim(it));
      c4.appendChild(row);
    });
    grid.appendChild(c4);

    // 05 evidence + unknowns (wide)
    var c5 = cell(5, 'wide-2');
    var split = el('div', 'split');
    var ub = el('section', 'unknown-box');
    var unknowns = arr(s.unknowns);
    var gathered = gatherUnknownClaims(r);
    var ul = el('p', 'box-label lab');
    ul.appendChild(document.createTextNode(t('unknowns')));
    ul.appendChild(el('span', null, String(unknowns.length + gathered.length)));
    ub.appendChild(ul);
    unknowns.forEach(function (u) {
      var d = el('div', 'unk');
      d.appendChild(el('p', 'unk-q', str(u.question)));
      if (u.why) { var w = el('p', 'unk-line'); w.appendChild(el('b', 'lab', t('why'))); w.appendChild(document.createTextNode(str(u.why))); d.appendChild(w); }
      if (u.next) { var x = el('p', 'unk-line'); x.appendChild(el('b', 'lab', t('next'))); x.appendChild(document.createTextNode(str(u.next))); d.appendChild(x); }
      ub.appendChild(d);
    });
    gathered.forEach(function (g) {
      var d = el('div', 'unk');
      var p = el('p', 'unk-line');
      p.appendChild(el('span', 'unk-from lab', '0' + g.no + ' ' + t('from_cell')));
      p.appendChild(document.createTextNode(g.text));
      d.appendChild(p);
      ub.appendChild(d);
    });
    if (!unknowns.length && !gathered.length) ub.appendChild(el('p', 'unk-line', t('none_unknown')));
    split.appendChild(ub);

    var lg = el('section', 'ledger');
    var ll = el('p', 'box-label lab');
    ll.appendChild(document.createTextNode(t('ledger')));
    ll.appendChild(el('span', null, String(arr(r.evidence).length)));
    lg.appendChild(ll);
    arr(r.evidence).forEach(function (e) {
      var row = el('div', 'ev-row');
      row.setAttribute('data-ev', str(e.id).replace(/[^A-Za-z0-9_-]/g, ''));
      row.appendChild(el('span', 'ev-id', str(e.id)));
      row.appendChild(el('span', 'ev-type', str(e.type)));
      if (e.seen === 'flow' || e.seen === 'code') row.classList.add('seen-' + e.seen);
      var body = el('div');
      var ref = el('p', 'ev-ref');
      if (e.type === 'url' && isHttp(e.ref)) {
        var a = el('a', null, str(e.ref));
        a.href = str(e.ref); a.target = '_blank'; a.rel = 'noopener noreferrer';
        ref.appendChild(a);
      } else ref.textContent = str(e.ref);
      body.appendChild(ref);
      var note = [e.seen === 'flow' ? t('seen_flow') : e.seen === 'code' ? t('seen_code') : '', str(e.note), str(e.seen_at)].filter(Boolean).join('  ·  ');
      if (note) body.appendChild(el('p', 'ev-note', note));
      row.appendChild(body);
      lg.appendChild(row);
    });
    split.appendChild(lg);
    c5.appendChild(split);
    grid.appendChild(c5);

    // 06 my version (full width)
    var c6 = cell(6, 'wide-3');
    var mv = s.my_version || {};
    var spec = el('div', 'spec');
    var left = el('div');
    if (!str(mv.working_name) && !arr(mv.mvp).length) {
      c6.appendChild(el('p', 'group-empty', t('spec_empty')));
      grid.appendChild(c6);
      return;
    }
    var nm = el('p', 'spec-name', str(mv.working_name));
    nm.appendChild(el('span', 'spec-tag lab', t('proposal')));
    left.appendChild(nm);
    left.appendChild(el('p', 'group-label lab', t('same_problem')));
    left.appendChild(el('p', 'spec-text', str(mv.same_problem)));
    left.appendChild(el('p', 'group-label lab', t('who')));
    left.appendChild(el('p', 'spec-text', str(mv.who)));
    spec.appendChild(left);
    var right = el('div');
    var diffs = el('div', 'diffs');
    arr(mv.differences).forEach(function (d, i) {
      var b = el('div', 'diff');
      b.appendChild(el('span', 'diff-no lab', t('diff').toUpperCase() + ' 0' + (i + 1)));
      b.appendChild(el('p', 'diff-title', str(d && d.title)));
      b.appendChild(el('p', 'diff-text', str(d && d.text)));
      diffs.appendChild(b);
    });
    right.appendChild(diffs);
    var cols = el('div', 'spec-cols');
    var a1 = el('div'); a1.appendChild(el('p', 'group-label lab', t('mvp'))); a1.appendChild(list(mv.mvp, 'spec-list'));
    var a2 = el('div'); a2.appendChild(el('p', 'group-label lab', t('not_taken'))); a2.appendChild(list(mv.not_taken, 'spec-list no'));
    cols.appendChild(a1); cols.appendChild(a2);
    right.appendChild(cols);
    spec.appendChild(right);
    c6.appendChild(spec);
    grid.appendChild(c6);
  }

  // ---------- load / show ----------
  function applyStaticText() {
    document.documentElement.lang = lang;
    if (window.RebizSections) window.RebizSections.staticText(lang);
    Array.prototype.forEach.call(document.querySelectorAll('[data-t]'), function (n) { n.textContent = t(n.getAttribute('data-t')); });
    $('btn-lang').textContent = lang === 'ko' ? 'EN' : '한국어';
  }
  function show(r) {
    current = r;
    $('empty').hidden = true;
    $('report').hidden = false;
    renderHero(r);
    renderIndex(r);
    renderGrid(r);
    if (window.RebizSections) window.RebizSections.render(r, lang, jumpToEvidence);
    window.scrollTo(0, 0);
  }
  function showEmpty(msg) {
    $('report').hidden = true;
    $('empty').hidden = false;
    $('empty-err').textContent = msg || '';
  }
  function accept(text) {
    var r;
    try { r = JSON.parse(text); } catch (e) { return showEmpty(t('bad_json')); }
    if (!r || r.schema !== 'rebiz/report@1' || !r.sections) return showEmpty(t('bad_file'));
    show(r);
  }
  function readFile(f) {
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () { accept(String(fr.result)); };
    fr.onerror = function () { showEmpty(t('bad_json')); };
    fr.readAsText(f);
  }

  function init() {
    applyStaticText();
    $('btn-open').addEventListener('click', function () { $('file').click(); });
    $('btn-pick').addEventListener('click', function () { $('file').click(); });
    $('file').addEventListener('change', function (e) { readFile(e.target.files && e.target.files[0]); e.target.value = ''; });
    $('btn-lang').addEventListener('click', function () {
      lang = lang === 'ko' ? 'en' : 'ko';
      applyStaticText();
      if (current) { renderHero(current); renderIndex(current); renderGrid(current); if (window.RebizSections) window.RebizSections.render(current, lang, jumpToEvidence); }
    });
    var drop = $('empty');
    document.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('drag'); });
    document.addEventListener('dragleave', function () { drop.classList.remove('drag'); });
    document.addEventListener('drop', function (e) {
      e.preventDefault();
      drop.classList.remove('drag');
      readFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
    });

    if (window.__REBIZ__ && window.__REBIZ__.report) return accept(JSON.stringify(window.__REBIZ__.report));
    var src = null;
    try { src = new URLSearchParams(location.search).get('src'); } catch (e) {}
    // ?src= 는 같은 자리의 상대 경로만 받는다(웹 서버로 열었을 때).
    if (src && /^https?:$/.test(location.protocol) && !/^[a-z]+:|^\/\//i.test(src)) {
      fetch(src).then(function (res) { return res.text(); }).then(accept).catch(function () { showEmpty(t('bad_json')); });
      return;
    }
    showEmpty('');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
