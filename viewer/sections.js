// reversebusiness 볼거리: 해부 장면 재생과 영상 저장, 돈이 흐르는 구조도, 원본 뼈대와 내 버전 비교.
// 의존성 없음. 리포트의 글은 textContent 로만 넣는다. 내 버전 미리보기는 스크립트가 꺼진 틀 안에서만 보인다.
(function () {
  'use strict';
  var S = {
    ko: {
      stage_title: '해부 장면', stage_sub: '페이지의 구역을 뼈대로만 그려 층으로 벌립니다. 원본의 화면, 문구, 로고는 쓰지 않습니다.',
      replay: '다시 재생', save_video: '영상으로 저장 (9:16)', saving: '영상을 만드는 중입니다. 이 탭을 열어 두세요.', cancel: '그만두기',
      saved: '저장했습니다', no_rec: '이 브라우저에서는 영상 저장이 되지 않습니다. 최신 Chrome, Edge, Safari 에서 열어 주세요.', rec_fail: '영상을 만들지 못했습니다. 다시 눌러 주세요.',
      flow_title: '돈이 흐르는 구조도', flow_sub_a: '다섯 마디 가운데 ', flow_sub_b: '. 점선은 아직 모르는 구간입니다.',
      arrive: '유입', first_value: '첫 가치', signup: '가입', payment: '결제', 'return': '다시 오기',
      observed: '관찰', inferred: '추정', unknown: '모름', missing: '리포트에 이 단계가 없습니다.',
      cmp_title: '원본 뼈대에서 내 버전으로', cmp_sub: '배우는 것은 구역의 순서와 짜임뿐입니다. 문구, 이름, 색, 그림은 새로 만듭니다.',
      cmp_a: '원본 뼈대', cmp_b: '내 버전', cmp_play: '전환 보기', not_taken: '가져오지 않음',
      no_mine_t: '아직 만들지 않음', no_mine: '내 버전은 아직 없습니다. 리포트 6번 칸의 명세만 에이전트에게 넘겨 새로 만들게 한 뒤, 이렇게 다시 엽니다.', no_mine_cmd: 'rebiz view report.json --mine ./my-version',
      no_skel: '이 리포트에는 구역 뼈대가 없어 다섯 단계로 대신 그렸습니다.',
      attract: '데려오는 층', value: '가치를 주는 층', pay: '돈 받는 층', other: '그 밖', role_return: '다시 오게 하는 층',
      motto: '모두를 위한 AI 교육', frame_title: '내 버전 미리보기', svc_title: '바깥 서비스', seen_flow: '흐름에서 봄', seen_code: '코드에서만 봄'
    },
    en: {
      stage_title: 'Dissection', stage_sub: 'Sections are drawn as bare wireframes and pulled apart into layers. No screenshots, copy or logos of the original.',
      replay: 'Replay', save_video: 'Save as video (9:16)', saving: 'Rendering the video. Keep this tab open.', cancel: 'Cancel',
      saved: 'Saved', no_rec: 'This browser cannot save video. Open this page in a recent Chrome, Edge or Safari.', rec_fail: 'The video could not be made. Try again.',
      flow_title: 'Money flow', flow_sub_a: 'Of five steps: ', flow_sub_b: '. Dashed links are still unknown.',
      arrive: 'Arrive', first_value: 'First value', signup: 'Sign-up', payment: 'Payment', 'return': 'Return',
      observed: 'OBSERVED', inferred: 'INFERRED', unknown: 'UNKNOWN', missing: 'The report has no entry for this step.',
      cmp_title: 'From the skeleton to my version', cmp_sub: 'Only the order and arrangement of sections is learned. Copy, names, colors and images are made new.',
      cmp_a: 'Original skeleton', cmp_b: 'My version', cmp_play: 'Play transition', not_taken: 'Not taken',
      no_mine_t: 'Not made yet', no_mine: 'There is no version of my own yet. Hand only the cell 6 spec to your agent, let it build a new page, then open it again like this.', no_mine_cmd: 'rebiz view report.json --mine ./my-version',
      no_skel: 'This report has no section skeleton, so the five steps are drawn instead.',
      attract: 'Attract layer', value: 'Value layer', pay: 'Pay layer', other: 'Other', role_return: 'Return layer',
      motto: 'AI education for everyone', frame_title: 'My version preview', svc_title: 'OUTSIDE SERVICES', seen_flow: 'seen in flow', seen_code: 'seen only in code'
    }
  };
  var STAGES = ['arrive', 'first_value', 'signup', 'payment', 'return'];
  var st = { report: null, lang: 'ko', jump: null, mine: null, model: null, player: null, rec: null, cmp: null, wired: false };

  function $(id) { return document.getElementById(id); }
  function t(k) { return (S[st.lang] && S[st.lang][k]) || S.ko[k] || k; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = String(text); return n; }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function str(v) { return typeof v === 'string' ? v : v == null ? '' : String(v); }
  function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function roleName(role) { return role === 'return' ? t('role_return') : t(role); }

  function staticText(lang) {
    st.lang = lang === 'en' ? 'en' : 'ko';
    Array.prototype.forEach.call(document.querySelectorAll('[data-s]'), function (n) { n.textContent = t(n.getAttribute('data-s')); });
  }

  // ---------- 내 버전 미리보기 재료 ----------
  function mineData() {
    var d = window.__REBIZ__ && window.__REBIZ__.mine;
    return d && typeof d === 'object' ? d : null;
  }
  function loadMine(done) {
    var d = mineData();
    if (!d) { st.mine = null; return done(); }
    if (st.mine && st.mine.src === d) return done();
    st.mine = { src: d, html: str(d.html), rects: d.rects && typeof d.rects === 'object' ? d.rects : {}, img: null };
    if (!/^data:image\/(png|jpeg|webp);base64,/.test(str(d.image))) return done();
    var img = new Image();
    img.onload = function () { st.mine.img = img; done(); };
    img.onerror = function () { done(); };
    img.src = d.image;
  }

  // ---------- A. 해부 장면 ----------
  function setMsg(text) { $('stage-msg').textContent = text || ''; }
  function fileName(ext) {
    var host = (st.model && st.model.host) || 'report';
    return 'reversebusiness-' + host.replace(/[^a-z0-9.-]/gi, '-') + '.' + ext;
  }
  function startRecording() {
    var R = window.RebizStage;
    if (st.rec) { st.rec.cancel(); st.rec = null; $('rec').hidden = true; setMsg(''); $('stage-save').textContent = t('save_video'); return; }
    if (!R.canRecord()) { setMsg(t('no_rec')); return; }
    $('rec').hidden = false;
    $('rec-fill').style.width = '0%';
    $('rec-text').textContent = t('saving');
    $('stage-save').textContent = t('cancel');
    setMsg('');
    st.rec = R.record(st.model, st.lang, {
      progress: function (p) { $('rec-fill').style.width = Math.round(p * 100) + '%'; },
      done: function (blob, ext) {
        st.rec = null;
        var name = fileName(ext);
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        $('rec').hidden = true;
        $('stage-save').textContent = t('save_video');
        setMsg(t('saved') + ': ' + name + ' (' + (blob.size / 1048576).toFixed(1) + ' MB, 1080x1920)');
        window.__rebizLastVideo = { name: name, size: blob.size, type: blob.type };
      },
      error: function (why) {
        st.rec = null;
        $('rec').hidden = true;
        $('stage-save').textContent = t('save_video');
        setMsg(why === 'unsupported' ? t('no_rec') : t('rec_fail'));
      }
    });
    if (!st.rec) $('stage-save').textContent = t('save_video');
  }

  // ---------- B. 돈이 흐르는 구조도 ----------
  function renderFlow() {
    var r = st.report, box = $('flow'), detail = $('flow-detail');
    box.textContent = '';
    detail.hidden = true;
    var steps = arr(((r.sections || {}).flow || {}).steps);
    var nodes = STAGES.map(function (key) {
      var step = steps.filter(function (x) { return x && x.stage === key; })[0];
      var status = step && /^(observed|inferred|unknown)$/.test(step.status) ? step.status : 'unknown';
      return { key: key, status: status, label: step ? str(step.label) : '', text: step ? str(step.text) : t('missing'), ev: step ? arr(step.evidence).map(str) : [] };
    });
    // 흐름이나 코드에서 본 바깥 서비스: 결제사는 결제 마디에, 분석 도구는 유입 마디에, 로그인 도구는 가입 마디에 붙인다.
    var services = arr(((r.sections || {}).flow || {}).services).filter(function (x) { return x && arr(x.names).length; });
    var attach = { payment: 'payment', analytics: 'arrive', auth: 'signup' };
    var c = { observed: 0, inferred: 0, unknown: 0 };
    nodes.forEach(function (n, i) {
      c[n.status] += 1;
      var card = el('button', 'fnode ' + n.status);
      card.type = 'button';
      card.setAttribute('aria-expanded', 'false');
      var top = el('span', 'fnode-top');
      top.appendChild(el('span', 'fnode-no', '0' + (i + 1)));
      top.appendChild(el('span', 'st ' + n.status, t(n.status)));
      card.appendChild(top);
      card.appendChild(el('span', 'fnode-name', t(n.key)));
      if (n.label && n.label !== t(n.key)) card.appendChild(el('span', 'fnode-label', n.label));
      card.appendChild(el('span', 'fnode-text', n.text));
      var mine = services.filter(function (x) { return attach[x.kind] === n.key; });
      if (mine.length) {
        var sv = el('span', 'fnode-svc');
        mine.forEach(function (x) { arr(x.names).slice(0, 4).forEach(function (nm) { var chip = el('span', x.seen === 'code' ? 'code' : null, str(nm)); chip.title = t(x.seen === 'code' ? 'seen_code' : 'seen_flow'); sv.appendChild(chip); }); });
        card.appendChild(sv);
      }
      if (n.ev.length) {
        var evs = el('span', 'fnode-ev');
        n.ev.slice(0, 4).forEach(function (id) { evs.appendChild(el('span', 'ev', id)); });
        card.appendChild(evs);
      }
      card.addEventListener('click', function () {
        var open = card.getAttribute('aria-expanded') === 'true';
        Array.prototype.forEach.call(box.querySelectorAll('.fnode'), function (x) { x.setAttribute('aria-expanded', 'false'); });
        if (open) { detail.hidden = true; return; }
        card.setAttribute('aria-expanded', 'true');
        detail.textContent = '';
        var head = el('p', 'flow-detail-head');
        head.appendChild(el('span', 'fnode-no', '0' + (i + 1)));
        head.appendChild(el('b', null, t(n.key)));
        head.appendChild(el('span', 'st ' + n.status, t(n.status)));
        n.ev.forEach(function (id) {
          var b = el('button', 'ev', id);
          b.type = 'button';
          b.addEventListener('click', function () { if (st.jump) st.jump(id); });
          head.appendChild(b);
        });
        detail.appendChild(head);
        detail.appendChild(el('p', 'flow-detail-text', n.text));
        detail.hidden = false;
      });
      box.appendChild(card);
      if (i < nodes.length - 1) {
        var known = n.status !== 'unknown';
        var link = el('span', 'flink ' + (known ? 'known' : 'unknown'));
        link.setAttribute('aria-hidden', 'true');
        link.appendChild(el('i'));
        box.appendChild(link);
      }
    });
    // 다음 마디가 모름이면 그 앞 선도 점선으로
    var links = box.querySelectorAll('.flink');
    nodes.forEach(function (n, i) { if (i > 0 && n.status === 'unknown' && links[i - 1]) links[i - 1].className = 'flink unknown'; });
    var old = document.getElementById('flow-services');
    if (old) old.remove();
    if (services.length) {
      var row = el('div', 'flow-services');
      row.id = 'flow-services';
      row.appendChild(el('span', 'flow-services-title', t('svc_title')));
      services.forEach(function (x) {
        var g = el('span', 'svc ' + (x.seen === 'code' ? 'code' : 'flow'));
        g.appendChild(el('span', 'svc-kind', str(x.label || x.kind)));
        arr(x.names).slice(0, 6).forEach(function (nm) { g.appendChild(el('span', 'svc-name', str(nm))); });
        g.appendChild(el('span', 'svc-seen', t(x.seen === 'code' ? 'seen_code' : 'seen_flow')));
        row.appendChild(g);
      });
      box.parentNode.insertBefore(row, detail);
    }
    $('flow-sub').textContent = t('flow_sub_a') + t('observed') + ' ' + c.observed + ' · ' + t('inferred') + ' ' + c.inferred + ' · ' + t('unknown') + ' ' + c.unknown + t('flow_sub_b');
  }

  // ---------- C. 원본 뼈대와 내 버전 ----------
  function glyphSvg(kind) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    var G = (window.RebizStage && window.RebizStage.GLYPHS) || {};
    var d = '';
    (G[kind] || G.text || []).forEach(function (p) {
      var x0 = p[1] * 100, y0 = p[2] * 100, x1 = p[3] * 100, y1 = p[4] * 100;
      d += p[0] === 'b' ? 'M' + x0 + ' ' + y0 + 'H' + x1 + 'V' + y1 + 'H' + x0 + 'Z' : 'M' + x0 + ' ' + y0 + 'L' + x1 + ' ' + y1;
    });
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(path);
    return svg;
  }

  function renderCompare() {
    var M = st.model, skel = $('cmp-skel'), mineBox = $('cmp-mine'), list = $('cmp-list'), range = $('cmp-range'), win = $('cmp-win'), page = $('cmp-page');
    skel.textContent = ''; mineBox.textContent = ''; list.textContent = '';
    var cmp = st.cmp = { blocks: [], frame: null, natW: 0, natH: 0, hasMine: false, mapped: false, timer: 0 };
    var acc = 0;
    M.blocks.forEach(function (b, i) {
      var d = el('div', 'sk ' + b.role + (b.taken ? '' : ' untaken'));
      d.appendChild(glyphSvg(b.kind));
      d.appendChild(el('span', 'sk-no', (i < 9 ? '0' : '') + (i + 1)));
      skel.appendChild(d);
      cmp.blocks.push({ el: d, a0: acc, a1: acc + b.f, b: b });
      acc += b.f;
      var li = el('li', 'cmp-item ' + b.role + (b.taken ? '' : ' untaken'));
      li.appendChild(el('span', 'cmp-no', (i < 9 ? '0' : '') + (i + 1)));
      li.appendChild(el('span', 'cmp-name', b.name));
      li.appendChild(el('span', 'cmp-role', b.taken ? roleName(b.role) : t('not_taken')));
      li.addEventListener('mouseenter', function () { d.classList.add('hot'); });
      li.addEventListener('mouseleave', function () { d.classList.remove('hot'); });
      list.appendChild(li);
    });
    if (M.synthesized) { var note = el('li', 'cmp-note', t('no_skel')); list.appendChild(note); }

    var html = st.mine && st.mine.html;
    range.value = '0';
    range.disabled = !html;
    $('cmp-play').disabled = !html;
    if (!html) {
      var empty = el('div', 'cmp-empty');
      empty.appendChild(el('p', 'cmp-empty-t', t('no_mine_t')));
      empty.appendChild(el('p', 'cmp-empty-s', t('no_mine')));
      empty.appendChild(el('code', 'cmp-empty-c', t('no_mine_cmd')));
      mineBox.appendChild(empty);
      mineBox.classList.add('is-empty');
      layoutCompare();
      return;
    }
    mineBox.classList.remove('is-empty');
    cmp.hasMine = true;
    var frame = document.createElement('iframe');
    frame.className = 'cmp-frame';
    frame.setAttribute('sandbox', 'allow-same-origin'); // 스크립트는 켜지 않는다
    frame.setAttribute('title', t('frame_title'));
    frame.setAttribute('tabindex', '-1');
    frame.setAttribute('scrolling', 'no');
    cmp.frame = frame;
    cmp.natW = page.clientWidth < 520 ? 480 : 1100;
    frame.style.width = cmp.natW + 'px';
    frame.addEventListener('load', function () { measureMine(); });
    frame.srcdoc = html;
    mineBox.appendChild(frame);
    layoutCompare();
  }

  function measureMine() {
    var cmp = st.cmp;
    if (!cmp || !cmp.frame) return;
    var doc = null;
    try { doc = cmp.frame.contentDocument; } catch (e) { doc = null; }
    if (!doc || !doc.documentElement) { layoutCompare(); return; }
    var h = Math.max(doc.documentElement.scrollHeight, doc.body ? doc.body.scrollHeight : 0);
    cmp.natH = h;
    cmp.frame.style.height = h + 'px';
    cmp.mapped = false;
    cmp.blocks.forEach(function (x) {
      x.m0 = null;
      var sel = st.report.skeleton && arr(st.report.skeleton.blocks)[x.b.i] ? str(arr(st.report.skeleton.blocks)[x.b.i].mine) : '';
      if (!sel) return;
      var node = null;
      try { node = doc.querySelector(sel); } catch (e) { node = null; }
      if (!node) return;
      var rc = node.getBoundingClientRect();
      var top = rc.top + (doc.defaultView ? doc.defaultView.pageYOffset : 0);
      x.m0 = top / h; x.m1 = (top + rc.height) / h;
      cmp.mapped = true;
    });
    layoutCompare();
  }

  function layoutCompare() {
    var cmp = st.cmp;
    if (!cmp) return;
    var win = $('cmp-win'), page = $('cmp-page'), mineBox = $('cmp-mine');
    var w = page.clientWidth;
    if (!w) return;
    var k = Number($('cmp-range').value) / 100;
    var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    var pageH;
    if (cmp.hasMine && cmp.natH) {
      var sc = w / cmp.natW;
      cmp.frame.style.transform = 'scale(' + sc + ')';
      pageH = cmp.natH * sc;
    } else pageH = Math.max(win.clientHeight - 2, w * 1.6);
    page.style.height = Math.round(pageH) + 'px';
    var morph = cmp.mapped ? Math.min(1, e / 0.7) : 0;
    var fadeSkel = cmp.hasMine ? Math.max(0, Math.min(1, (e - 0.5) / 0.4)) : 0;
    cmp.blocks.forEach(function (x) {
      var top = x.a0, bot = x.a1, op = 1 - fadeSkel;
      if (cmp.mapped) {
        if (x.m0 != null) { top = x.a0 + (x.m0 - x.a0) * morph; bot = x.a1 + (x.m1 - x.a1) * morph; }
        else op = Math.max(0, 1 - e / 0.35);
      }
      x.el.style.top = (top * 100).toFixed(3) + '%';
      x.el.style.height = Math.max(0, (bot - top) * 100).toFixed(3) + '%';
      x.el.style.opacity = op.toFixed(3);
    });
    mineBox.style.opacity = cmp.hasMine ? Math.max(0, Math.min(1, (e - 0.3) / 0.5)).toFixed(3) : '1';
    $('cmp-skel').style.pointerEvents = fadeSkel > 0.9 ? 'none' : '';
  }

  function playCompare() {
    var cmp = st.cmp, range = $('cmp-range');
    if (!cmp || !cmp.hasMine) return;
    if (cmp.timer) { cancelAnimationFrame(cmp.timer); cmp.timer = 0; }
    var from = Number(range.value) >= 99 ? 100 : 0, to = from === 0 ? 100 : 0;
    if (reduced()) { range.value = String(to); layoutCompare(); return; }
    var start = 0, dur = 2600;
    function step(now) {
      if (!start) start = now;
      var p = Math.min(1, (now - start) / dur);
      range.value = String(from + (to - from) * p);
      layoutCompare();
      cmp.timer = p < 1 ? requestAnimationFrame(step) : 0;
    }
    cmp.timer = requestAnimationFrame(step);
  }

  // ---------- 묶어서 그리기 ----------
  function wire() {
    if (st.wired) return;
    st.wired = true;
    $('stage-play').addEventListener('click', function () { if (st.player) st.player.replay(); });
    $('stage-save').addEventListener('click', startRecording);
    $('cmp-range').addEventListener('input', layoutCompare);
    $('cmp-play').addEventListener('click', playCompare);
    var again = 0;
    window.addEventListener('resize', function () {
      clearTimeout(again);
      again = setTimeout(function () {
        if (st.cmp && st.cmp.frame) {
          var natW = $('cmp-page').clientWidth < 520 ? 480 : 1100;
          if (natW !== st.cmp.natW) { st.cmp.natW = natW; st.cmp.frame.style.width = natW + 'px'; measureMine(); return; }
        }
        layoutCompare();
      }, 120);
    });
  }

  function render(report, lang, jump) {
    st.report = report; st.jump = jump || null;
    staticText(lang);
    wire();
    var R = window.RebizStage;
    function build() {
      st.model = R.buildModel(report, st.mine ? { rects: st.mine.rects, img: st.mine.img } : null, st.lang);
      if (!st.player) st.player = R.mount($('stage'), function () { return st.model; }, function () { return st.lang; });
      else st.player.refresh();
      renderFlow();
      renderCompare();
    }
    loadMine(function () { if (st.report === report) build(); });
  }

  window.RebizSections = { render: render, staticText: staticText, state: function () { return st; } };
})();
