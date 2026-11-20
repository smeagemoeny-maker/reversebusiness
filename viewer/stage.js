// reversebusiness 해부 장면. 캔버스 한 장에 그리는 짧은 영화(약 29초)이고, 같은 그림을 9:16 영상으로 저장한다.
// 의존성 없음. 그리는 재료는 리포트의 숫자와 내 말로 쓴 이름뿐이다. 원본의 화면, 문구, 로고는 쓰지 않는다.
(function () {
  'use strict';

  var C = { bg: '#07080A', panel: '#0D0F12', ivory: '#EBE2D2', dim: '#B9B1A3', mute: '#8A8478', gold: '#D6892A', hi: '#F2B45A' };
  var SANS = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Helvetica Neue", system-ui, sans-serif';
  var MONO = '"SF Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
  var DUR = 29.4;
  var SC = { title: [0, 2.6], depth: [2.6, 5.4], read: [5.4, 9.4], split: [9.4, 15.6], flow: [15.6, 21.4], mine: [21.4, 26.6], end: [26.6, 29.4] };
  var STILL = SC.split[1] - 0.9; // 멈춰 놓고 보여 줄 때 쓰는 장면 (층이 다 벌어진 때)
  var ROLES = ['attract', 'value', 'pay', 'return'];
  var STAGES = ['arrive', 'first_value', 'signup', 'payment', 'return'];
  var TXT = {
    ko: {
      s0: '읽은 깊이', s0sub: '겉에서 속까지, 허락된 데까지만', d_surface: '겉 읽기', d_flow: '흐름 읽기', d_code: '속 읽기', d_surface_s: '화면의 글과 구조', d_flow_s: '펼치기와 요청이 나간 곳', d_code_s: '내려온 코드 안의 이름',
      ds_done: '읽음', ds_partial: '일부만', ds_skipped: '안 함', ds_blocked: '약관이 막음', ds_failed: '실패', code: '코드 흔적',
      s1: '읽기', s1sub: '공개 페이지의 구역을 위에서 아래로', s2: '해부', s2sub: '구역마다 하는 일로 층을 나눕니다',
      s3: '돈의 흐름', s3sub: '유입에서 다시 오기까지, 확인된 만큼만', s4: '내 버전', s4sub: '구조만 배우고 나머지는 새로 만듭니다',
      attract: '데려오는 층', value: '가치를 주는 층', pay: '돈 받는 층', 'return': '다시 오게 하는 층', other: '그 밖',
      arrive: '유입', first_value: '첫 가치', signup: '가입', payment: '결제', back: '다시 오기',
      observed: '관찰', inferred: '추정', unknown: '모름', blocks: '구역', none: '없음',
      fresh: ['문구', '이름', '색', '그림'], fresh_t: '새로 만든 것', not_taken: '가져오지 않음',
      no_mine: '아직 만들지 않음', no_mine2: '해부만 한 리포트입니다. 명세가 채워지면 여기에 그려집니다', spec_only: '명세로 그린 자리',
      end1: '확인한 만큼만 말합니다', motto: '모두를 위한 AI 교육', tagline: '주소 하나로 사업을 해부합니다', by_role: '층은 추정, 구역 순서는 관찰'
    },
    en: {
      s0: 'DEPTH', s0sub: 'From surface to code, only as far as allowed', d_surface: 'Surface', d_flow: 'Flow', d_code: 'Code', d_surface_s: 'Text and structure on screen', d_flow_s: 'Expanding, and where requests go', d_code_s: 'Names inside the downloaded code',
      ds_done: 'READ', ds_partial: 'PARTIAL', ds_skipped: 'NOT DONE', ds_blocked: 'BLOCKED BY TERMS', ds_failed: 'FAILED', code: 'CODE TRACE',
      s1: 'READ', s1sub: 'Sections of the public page, top to bottom', s2: 'DISSECT', s2sub: 'Layers by the job each section does',
      s3: 'MONEY FLOW', s3sub: 'From arrival to return, only what was confirmed', s4: 'MY VERSION', s4sub: 'Learn the structure, make everything else new',
      attract: 'Attract layer', value: 'Value layer', pay: 'Pay layer', 'return': 'Return layer', other: 'Other',
      arrive: 'Arrive', first_value: 'First value', signup: 'Sign-up', payment: 'Payment', back: 'Return',
      observed: 'OBSERVED', inferred: 'INFERRED', unknown: 'UNKNOWN', blocks: 'SECTIONS', none: 'none',
      fresh: ['Copy', 'Name', 'Color', 'Images'], fresh_t: 'Made new', not_taken: 'Not taken',
      no_mine: 'Not made yet', no_mine2: 'Dissection only so far. It appears here once the spec is filled in', spec_only: 'Drawn from the spec',
      end1: 'We only say what we confirmed', motto: 'AI education for everyone', tagline: 'One URL in, one business dissected', by_role: 'Layers are inferred, section order is observed'
    }
  };

  // ---------- small math ----------
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  function stageName(T, key) { return key === 'return' ? T.back : T[key]; }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function str(v) { return typeof v === 'string' ? v : v == null ? '' : String(v); }
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  // ---------- model: 리포트에서 그릴 것만 뽑는다 ----------
  function buildModel(r, mine, lang) {
    var m = (r && r.meta) || {}, tg = m.target || {}, s = (r && r.sections) || {};
    var host = '', pathName = '';
    try { var u = new URL(str(tg.url)); host = u.hostname.replace(/^www\./, ''); pathName = u.pathname === '/' ? '' : u.pathname; } catch (e) {}
    var n = { observed: 0, inferred: 0, unknown: 0, code: 0 };
    function add(c) { if (c && n[c.status] !== undefined) n[c.status] += 1; }
    var mo = s.money || {};
    ['customer', 'problem', 'price', 'revenue'].forEach(function (k) { arr(mo[k]).forEach(add); });
    arr((s.flow || {}).steps).forEach(add); arr((s.map || {}).screens).forEach(add); arr((s.tech || {}).items).forEach(add);

    var steps = arr((s.flow || {}).steps);
    var nodes = STAGES.map(function (st) {
      var step = steps.filter(function (x) { return x && x.stage === st; })[0];
      return { key: st, status: step && /^(observed|inferred|unknown)$/.test(step.status) ? step.status : 'unknown', label: step ? str(step.label) : '', text: step ? str(step.text) : '', ev: step ? arr(step.evidence).map(str) : [], missing: !step };
    });

    var raw = r && r.skeleton && arr(r.skeleton.blocks).length >= 2 ? arr(r.skeleton.blocks) : null;
    var synthesized = !raw;
    if (!raw) {
      var roleOf = { arrive: 'attract', first_value: 'value', signup: 'pay', payment: 'pay', 'return': 'return' };
      raw = nodes.map(function (nd) { return { name: stageName(TXT[lang] || TXT.ko, nd.key), role: roleOf[nd.key], weight: 1, kind: 'text', status: nd.status }; });
    }
    var total = raw.reduce(function (a, b) { return a + (Number(b.weight) > 0 ? Number(b.weight) : 1); }, 0) || 1;
    var fr = raw.map(function (b) { return Math.max((Number(b.weight) > 0 ? Number(b.weight) : 1) / total, 0.028); });
    var sum = fr.reduce(function (a, b) { return a + b; }, 0);
    var rects = (mine && mine.rects) || {};
    var blocks = raw.slice(0, 18).map(function (b, i) {
      var role = ROLES.indexOf(b.role) >= 0 ? b.role : 'other';
      var mr = b.mine && rects[b.mine] ? rects[b.mine] : null;
      return { i: i, name: str(b.name), role: role, kind: str(b.kind) || 'text', f: fr[i] / sum, taken: b.taken !== false, mine: mr, status: b.status };
    });
    var roleCount = {};
    blocks.forEach(function (b) { roleCount[b.role] = (roleCount[b.role] || 0) + 1; });
    var mv = s.my_version || {};
    return {
      name: str(tg.name), host: host, path: pathName, oneLine: str(m.one_line), counts: n, evidenceN: arr(r && r.evidence).length,
      depth: ['surface', 'flow', 'code'].map(function (key) {
        var st = arr((m.depth || {}).steps).filter(function (x) { return x && x.key === key; })[0];
        return { key: key, state: st && /^(done|partial|skipped|blocked|failed)$/.test(st.state) ? st.state : (key === 'surface' ? 'done' : 'skipped') };
      }),
      blocks: blocks, synthesized: synthesized, roleCount: roleCount, nodes: nodes,
      mine: { name: str(mv.working_name), img: mine && mine.img ? mine.img : null, has: !!str(mv.working_name), mapped: blocks.some(function (b) { return b.mine; }) }
    };
  }

  // ---------- text helpers ----------
  function font(ctx, px, weight, mono) { ctx.font = (weight || 300) + ' ' + px + 'px ' + (mono ? MONO : SANS); }
  function wrap(ctx, text, maxW, maxLines) {
    var words = str(text).split(/(\s+)/), lines = [], cur = '';
    function push(w) {
      if (ctx.measureText(cur + w).width <= maxW || !cur) { cur += w; return; }
      lines.push(cur.trim()); cur = w.replace(/^\s+/, '');
    }
    words.forEach(function (w) {
      if (ctx.measureText(w).width > maxW) { w.split('').forEach(function (ch) { push(ch); }); } else push(w);
    });
    if (cur.trim()) lines.push(cur.trim());
    if (maxLines && lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,2}$/, '') + '…'; }
    return lines;
  }
  function fitText(ctx, text, px, weight, maxW, maxLines, mono) {
    var size = px, lines;
    for (var k = 0; k < 8; k++) {
      font(ctx, size, weight, mono);
      lines = wrap(ctx, text, maxW);
      if (lines.length <= maxLines) break;
      size *= 0.88;
    }
    font(ctx, size, weight, mono);
    return { size: size, lines: wrap(ctx, text, maxW, maxLines) };
  }
  function spaced(ctx, text, x, y, gap) {
    // 넓은 자간의 모노 라벨
    var cx = x;
    for (var i = 0; i < text.length; i++) { ctx.fillText(text[i], cx, y); cx += ctx.measureText(text[i]).width + gap; }
    return cx - x;
  }
  function spacedWidth(ctx, text, gap) {
    var w = 0;
    for (var i = 0; i < text.length; i++) w += ctx.measureText(text[i]).width + gap;
    return w;
  }

  // ---------- layout ----------
  function layoutOf(W, H) {
    var portrait = H > W * 1.12;
    var s = portrait ? W / 1080 : Math.min(W / 1920, H / 1080);
    var L = { W: W, H: H, portrait: portrait, s: s };
    if (portrait) {
      L.f = { mono: 26 * s, small: 30 * s, body: 38 * s, title: 104 * s, sub: 36 * s };
      L.pad = 64 * s;
      L.titleY = 262 * s;
      L.top = 450 * s; L.bot = H - 130 * s;
      L.flat = { x: W * 0.24, y: L.top + 44 * s, w: W * 0.52, h: L.bot - 260 * s - L.top - 44 * s };
      L.stack = { x: W * 0.04, y: L.top, w: W * 0.47, h: L.bot - 190 * s - L.top };
      L.labelX = W * 0.565; L.labelW = W * 0.4;
      L.legendY = L.bot - 104 * s;
      L.flowTop = L.top + 50 * s; L.flowBot = L.bot - 190 * s;
      L.sumY = L.bot - 40 * s;
      L.mineY = L.bot - 150 * s;
      L.yaw = -0.5;
      L.aspect = 2.0;
    } else {
      L.f = { mono: 22 * s, small: 24 * s, body: 30 * s, title: 100 * s, sub: 30 * s };
      L.pad = 72 * s;
      L.titleY = H * 0.3;
      L.flat = { x: W * 0.43, y: H * 0.15, w: W * 0.36, h: H * 0.72 };
      L.stack = { x: W * 0.37, y: H * 0.17, w: W * 0.32, h: H * 0.68 };
      L.labelX = W * 0.73; L.labelW = W * 0.24;
      L.legendY = H * 0.56;
      L.sumY = H * 0.9;
      L.mineY = H * 0.58;
      L.yaw = -0.56;
      L.aspect = 1.7;
    }
    return L;
  }

  // ---------- geometry: 납작한 페이지에서 층으로 ----------
  var PITCH0 = Math.PI / 2, PITCH1 = 0.56;
  function geoOf(model, L) {
    var N = model.blocks.length;
    var aspect = L.aspect;
    var maxF = Math.max.apply(null, model.blocks.map(function (b) { return b.f; }));
    var gap = N > 12 ? 0.13 : N > 8 ? 0.16 : 0.2;
    var cum = 0;
    var g = { N: N, d: [], zc: [], e: [], y: [], aspect: aspect };
    model.blocks.forEach(function (b, i) {
      var d = b.f * aspect;
      g.d.push(d); g.zc.push(-aspect / 2 + cum + d / 2); cum += d;
      g.e.push(lerp(0.5, 0.9, Math.sqrt(b.f / maxF)));
      g.y.push((N - 1 - i) * gap - (N - 1) * gap / 2);
    });
    function fit(k, area, yaw) {
      var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      for (var i = 0; i < N; i++) corners(g, i, k, k, yaw).forEach(function (p) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
      var S = Math.min(area.w / (maxX - minX), area.h / (maxY - minY));
      return { S: S, ox: area.x + area.w / 2 - S * (minX + maxX) / 2, oy: area.y + area.h / 2 - S * (minY + maxY) / 2 };
    }
    g.fit0 = fit(0, L.flat, L.yaw);
    g.fit1 = fit(1, L.stack, L.yaw);
    return g;
  }
  // 층 i 의 네 모서리(단위 좌표). ki: 이 층이 얼마나 벌어졌는가, kc: 카메라가 얼마나 돌았는가.
  function corners(g, i, ki, kc, yaw1) {
    var pitch = lerp(PITCH0, PITCH1, kc), yaw = lerp(0, yaw1, kc);
    var depth = lerp(g.d[i], g.e[i], ki), y = g.y[i] * ki, z = g.zc[i] * (1 - ki);
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    return [[-0.5, -depth / 2], [0.5, -depth / 2], [0.5, depth / 2], [-0.5, depth / 2]].map(function (c) {
      var x = c[0], zz = z + c[1];
      var x1 = x * cy + zz * sy, z1 = -x * sy + zz * cy;
      return [x1, -(y * cp - z1 * sp)];
    });
  }
  function screenQuad(g, i, ki, kc, L) {
    var S = lerp(g.fit0.S, g.fit1.S, kc), ox = lerp(g.fit0.ox, g.fit1.ox, kc), oy = lerp(g.fit0.oy, g.fit1.oy, kc);
    return corners(g, i, ki, kc, L.yaw).map(function (p) { return [ox + p[0] * S, oy + p[1] * S]; });
  }
  // 사각형 안의 점 (u 왼쪽에서 오른쪽, v 위에서 아래)
  function at(q, u, v) {
    var ax = lerp(q[0][0], q[1][0], u), ay = lerp(q[0][1], q[1][1], u);
    var bx = lerp(q[3][0], q[2][0], u), by = lerp(q[3][1], q[2][1], u);
    return [lerp(ax, bx, v), lerp(ay, by, v)];
  }
  function pathQuad(ctx, q) { ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (var i = 1; i < 4; i++) ctx.lineTo(q[i][0], q[i][1]); ctx.closePath(); }
  function line(ctx, q, u0, v0, u1, v1) { var a = at(q, u0, v0), b = at(q, u1, v1); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  function box(ctx, q, u0, v0, u1, v1) {
    var a = at(q, u0, v0), b = at(q, u1, v0), c = at(q, u1, v1), d = at(q, u0, v1);
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
  }

  function roleStyle(role) {
    if (role === 'pay') return { stroke: C.gold, fill: rgba(C.gold, 0.13), w: 2.4, dash: null };
    if (role === 'attract') return { stroke: C.ivory, fill: rgba(C.ivory, 0.05), w: 2, dash: null };
    if (role === 'value') return { stroke: C.dim, fill: rgba(C.ivory, 0.025), w: 1.5, dash: null };
    if (role === 'return') return { stroke: C.hi, fill: rgba(C.hi, 0.04), w: 2, dash: [7, 6] };
    return { stroke: C.mute, fill: 'rgba(0,0,0,0)', w: 1.2, dash: null };
  }

  // 구역 종류마다 선으로만 그린 뼈대 무늬. ['b', u0, v0, u1, v1] 는 상자, ['l', ...] 은 선. 캔버스와 비교 화면이 같이 쓴다.
  var GLYPHS = (function () {
    var g = { media: [['b', 0.06, 0.12, 0.94, 0.88], ['l', 0.06, 0.12, 0.94, 0.88], ['l', 0.94, 0.12, 0.06, 0.88]],
      headline: [['l', 0.08, 0.3, 0.56, 0.3], ['l', 0.08, 0.5, 0.44, 0.5], ['b', 0.08, 0.66, 0.26, 0.84]],
      price: [['l', 0.07, 0.28, 0.46, 0.28], ['l', 0.07, 0.46, 0.38, 0.46], ['l', 0.07, 0.64, 0.42, 0.64], ['b', 0.6, 0.12, 0.93, 0.88], ['l', 0.65, 0.34, 0.8, 0.34], ['b', 0.65, 0.58, 0.88, 0.76]],
      notice: [['b', 0.1, 0.2, 0.9, 0.8], ['l', 0.16, 0.42, 0.7, 0.42], ['l', 0.16, 0.6, 0.56, 0.6]],
      cta: [['l', 0.32, 0.34, 0.68, 0.34], ['b', 0.4, 0.54, 0.6, 0.78]],
      text: [['l', 0.1, 0.3, 0.84, 0.3], ['l', 0.1, 0.5, 0.72, 0.5], ['l', 0.1, 0.7, 0.5, 0.7]],
      nav: [], numbers: [], list: [], quotes: [], faq: [], footer: [] };
    var i;
    for (i = 0; i < 4; i++) g.nav.push(['b', 0.3 + i * 0.105, 0.28, 0.385 + i * 0.105, 0.72]);
    for (i = 0; i < 3; i++) g.numbers.push(['b', 0.08 + i * 0.3, 0.2, 0.22 + i * 0.3, 0.52], ['l', 0.08 + i * 0.3, 0.72, 0.3 + i * 0.3, 0.72]);
    for (i = 0; i < 4; i++) g.list.push(['b', 0.07, 0.1 + i * 0.215, 0.2, 0.25 + i * 0.215], ['l', 0.26, 0.14 + i * 0.215, 0.9, 0.14 + i * 0.215], ['l', 0.26, 0.22 + i * 0.215, 0.7, 0.22 + i * 0.215]);
    for (i = 0; i < 3; i++) g.quotes.push(['b', 0.07 + i * 0.3, 0.2, 0.33 + i * 0.3, 0.8], ['l', 0.11 + i * 0.3, 0.42, 0.29 + i * 0.3, 0.42]);
    for (i = 0; i < 4; i++) g.faq.push(['l', 0.14, 0.2 + i * 0.2, 0.8, 0.2 + i * 0.2], ['l', 0.84, 0.16 + i * 0.2, 0.87, 0.22 + i * 0.2]);
    for (i = 0; i < 4; i++) g.footer.push(['l', 0.08 + i * 0.22, 0.3, 0.2 + i * 0.22, 0.3], ['l', 0.08 + i * 0.22, 0.52, 0.17 + i * 0.22, 0.52], ['l', 0.08 + i * 0.22, 0.72, 0.19 + i * 0.22, 0.72]);
    return g;
  })();
  function glyph(ctx, q, kind) {
    ctx.beginPath();
    (GLYPHS[kind] || GLYPHS.text).forEach(function (p) { (p[0] === 'b' ? box : line)(ctx, q, p[1], p[2], p[3], p[4]); });
    ctx.stroke();
  }

  function drawPlate(ctx, q, b, L, opt) {
    var st = roleStyle(b.role), s = L.s, a = opt.alpha;
    if (a <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = a;
    // 두께: 아래로 살짝 내린 같은 모양
    if (opt.thick > 0.01) {
      var dy = 9 * s * opt.thick;
      ctx.strokeStyle = rgba(st.stroke, 0.35);
      ctx.lineWidth = Math.max(1, s);
      ctx.beginPath();
      [1, 2, 3].forEach(function (k) { ctx.moveTo(q[k][0], q[k][1]); ctx.lineTo(q[k][0], q[k][1] + dy); });
      ctx.moveTo(q[1][0], q[1][1] + dy); ctx.lineTo(q[2][0], q[2][1] + dy); ctx.lineTo(q[3][0], q[3][1] + dy);
      ctx.stroke();
    }
    pathQuad(ctx, q);
    ctx.fillStyle = rgba(C.bg, 0.86);
    ctx.fill();
    pathQuad(ctx, q);
    ctx.fillStyle = opt.hot ? rgba(st.stroke, 0.24) : st.fill;
    ctx.fill();
    ctx.lineWidth = Math.max(1, st.w * s * (opt.hot ? 1.4 : 1));
    ctx.strokeStyle = st.stroke;
    if (st.dash) ctx.setLineDash(st.dash.map(function (v) { return v * s; }));
    pathQuad(ctx, q);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = a * (opt.glyph == null ? 0.6 : opt.glyph);
    ctx.lineWidth = Math.max(1, 1.2 * s);
    ctx.strokeStyle = b.role === 'pay' ? C.hi : C.dim;
    glyph(ctx, q, b.kind);
    ctx.restore();
  }

  // ---------- frame chrome ----------
  function backdrop(ctx, L) {
    var W = L.W, H = L.H, s = L.s;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    // 흐린 격자
    ctx.strokeStyle = rgba(C.gold, 0.045);
    ctx.lineWidth = 1;
    ctx.beginPath();
    var step = 120 * s, x, y;
    for (x = (W % step) / 2; x < W; x += step) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, H); }
    for (y = (H % step) / 2; y < H; y += step) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(W, Math.round(y) + 0.5); }
    ctx.stroke();
    var v = ctx.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.2, W / 2, H * 0.5, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(7,8,10,0)'); v.addColorStop(1, 'rgba(7,8,10,0.92)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }
  function chrome(ctx, L, t, sceneNo) {
    var W = L.W, H = L.H, s = L.s;
    var pad = L.pad, top = L.portrait ? 84 * s : 66 * s;
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.gold;
    ctx.fillRect(pad, top - 9 * s, 3 * s, 18 * s);
    font(ctx, L.f.mono, 400, true);
    ctx.fillStyle = C.ivory;
    ctx.textAlign = 'left';
    spaced(ctx, 'REVERSE BUSINESS', pad + 16 * s, top, 4.5 * s);
    if (sceneNo) {
      var label = '0' + sceneNo + ' / 04';
      font(ctx, L.f.mono, 400, true);
      var lw = spacedWidth(ctx, label, 3 * s);
      ctx.fillStyle = C.gold;
      spaced(ctx, label, W - pad - lw, top, 3 * s);
      // 네 칸 진행 눈금
      var bw = 34 * s, gx = W - pad - lw - 26 * s - (bw + 6 * s) * 4;
      for (var i = 0; i < 4; i++) {
        ctx.fillStyle = i < sceneNo ? C.gold : rgba(C.ivory, 0.18);
        ctx.fillRect(gx + i * (bw + 6 * s), top - 1.5 * s, bw, 3 * s);
      }
    }
    // 구석 표기
    font(ctx, L.f.mono * 0.86, 400, true);
    var mark = 'reversebusiness · CONNECT AI LAB';
    ctx.fillStyle = rgba(C.ivory, 0.62);
    var mw = spacedWidth(ctx, mark, 2 * s);
    spaced(ctx, mark, L.portrait ? (W - mw) / 2 : W - pad - mw, H - (L.portrait ? 62 * s : 44 * s), 2 * s);
    // 아래 진행 선
    ctx.fillStyle = rgba(C.ivory, 0.1);
    ctx.fillRect(0, H - 3 * s, W, 3 * s);
    ctx.fillStyle = C.gold;
    ctx.fillRect(0, H - 3 * s, W * clamp(t / DUR, 0, 1), 3 * s);
  }

  function sceneTitle(ctx, L, T, title, sub, k, alphaOut) {
    var s = L.s, a = easeOut(seg(k, 0, 0.12)) * (alphaOut == null ? 1 : alphaOut);
    if (a <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    var x = L.pad, y = L.titleY + (1 - a) * 18 * s;
    font(ctx, L.f.title, 200);
    ctx.fillStyle = C.ivory;
    ctx.fillText(title, x - 4 * s, y);
    ctx.fillStyle = C.gold;
    ctx.fillRect(x, y + 26 * s, 64 * s * a, 2 * s);
    var maxW = L.portrait ? L.W - L.pad * 2 : L.W * 0.26;
    font(ctx, L.f.sub, 300);
    ctx.fillStyle = C.dim;
    wrap(ctx, sub, maxW, 3).forEach(function (ln, i) { ctx.fillText(ln, x, y + 26 * s + L.f.sub * 1.5 * (i + 1) + 8 * s); });
    ctx.restore();
  }

  // ---------- scenes ----------
  function sceneIntro(ctx, L, M, T, k) {
    var W = L.W, H = L.H, s = L.s;
    var a = easeOut(seg(k, 0, 0.18)) * (1 - seg(k, 0.86, 1));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    var cy = H * (L.portrait ? 0.42 : 0.46);
    font(ctx, L.f.mono, 400, true);
    ctx.fillStyle = C.gold;
    var tag = T.tagline;
    var ft = fitText(ctx, M.name || M.host || 'reversebusiness', (L.portrait ? 92 : 104) * s, 200, W - L.pad * 2.4, L.portrait ? 3 : 2);
    font(ctx, L.f.mono, 400, true);
    ctx.fillText(tag, W / 2, cy - ft.lines.length * ft.size * 0.58 - 56 * s);
    font(ctx, ft.size, 200);
    ctx.fillStyle = C.ivory;
    ft.lines.forEach(function (ln, i) { ctx.fillText(ln, W / 2, cy + (i - (ft.lines.length - 1) / 2) * ft.size * 1.16); });
    var by = cy + ft.lines.length * ft.size * 0.62 + 64 * s;
    ctx.fillStyle = C.gold;
    var hw = 220 * s * easeOut(seg(k, 0.1, 0.5));
    ctx.fillRect(W / 2 - hw, by - 44 * s, hw * 2, 1.5 * s);
    // 입력되는 명령
    var cmd = 'rebiz ' + (M.host ? M.host + M.path : '<url>');
    var shown = cmd.slice(0, Math.round(cmd.length * seg(k, 0.2, 0.62)));
    font(ctx, L.f.body * 0.92, 400, true);
    var full = ctx.measureText(cmd).width;
    if (full > W - L.pad * 2) font(ctx, L.f.body * 0.92 * (W - L.pad * 2) / full, 400, true);
    full = ctx.measureText(cmd).width;
    ctx.textAlign = 'left';
    ctx.fillStyle = C.dim;
    ctx.fillText('$', W / 2 - full / 2 - 34 * s, by + 14 * s);
    ctx.fillStyle = C.ivory;
    ctx.fillText(shown, W / 2 - full / 2, by + 14 * s);
    if (Math.floor(k * 14) % 2 === 0) { ctx.fillStyle = C.gold; ctx.fillRect(W / 2 - full / 2 + ctx.measureText(shown).width + 5 * s, by - 14 * s, 12 * s, 32 * s); }
    ctx.restore();
  }

  function drawStack(ctx, L, M, G, o) {
    // 아래 층부터 그린다 (위 층이 앞에 온다)
    for (var i = G.N - 1; i >= 0; i--) {
      var b = M.blocks[i];
      var ki = o.ki(i);
      var q = screenQuad(G, i, ki, o.kc, L);
      drawPlate(ctx, q, b, L, { alpha: o.alpha(i, b), thick: ki, hot: o.hot ? o.hot(b) : false, glyph: o.glyph ? o.glyph(i) : null });
    }
  }

  // 읽은 깊이: 겉, 흐름, 속. 읽은 단계는 금색 선이 차오르고, 못 읽은 단계는 점선으로 남는다.
  function sceneDepth(ctx, L, M, T, k) {
    var W = L.W, H = L.H, s = L.s;
    sceneTitle(ctx, L, T, T.s0, T.s0sub, k);
    var x0 = L.portrait ? L.pad : W * 0.42, w = L.portrait ? W - L.pad * 2 : W * 0.5;
    var y0 = L.portrait ? L.top + 60 * s : H * 0.26, rowH = L.portrait ? 250 * s : H * 0.19;
    M.depth.forEach(function (d, i) {
      var a = easeOut(seg(k, 0.12 + i * 0.16, 0.26 + i * 0.16));
      if (a <= 0.01) return;
      var y = y0 + i * rowH, read = d.state === 'done' || d.state === 'partial';
      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      font(ctx, L.f.mono, 400, true);
      ctx.fillStyle = read ? C.gold : C.mute;
      ctx.fillText('0' + (i + 1), x0, y);
      font(ctx, L.f.body * 1.5, 200);
      ctx.fillStyle = read ? C.ivory : C.dim;
      ctx.fillText(T['d_' + d.key], x0 + 56 * s, y + 4 * s);
      var nw = ctx.measureText(T['d_' + d.key]).width;
      font(ctx, L.f.small, 300);
      ctx.fillStyle = C.dim;
      ctx.fillText(T['d_' + d.key + '_s'], x0 + 56 * s, y + L.f.small * 1.7 + 6 * s);
      // 상태 표
      var tag = T['ds_' + d.state];
      font(ctx, L.f.mono * 0.82, 400, true);
      var tw = ctx.measureText(tag).width + 18 * s, th = L.f.mono * 1.4, tx = Math.min(x0 + 56 * s + nw + 24 * s, x0 + w - tw), ty = y - th * 0.82;
      if (d.state === 'done') { ctx.fillStyle = C.gold; ctx.fillRect(tx, ty, tw, th); ctx.fillStyle = C.bg; }
      else if (d.state === 'partial') { ctx.strokeStyle = C.gold; ctx.lineWidth = Math.max(1, 1.4 * s); ctx.strokeRect(tx, ty, tw, th); ctx.fillStyle = C.hi; }
      else { ctx.setLineDash([4 * s, 4 * s]); ctx.strokeStyle = C.mute; ctx.lineWidth = Math.max(1, 1.2 * s); ctx.strokeRect(tx, ty, tw, th); ctx.setLineDash([]); ctx.fillStyle = C.dim; }
      ctx.textBaseline = 'middle';
      ctx.fillText(tag, tx + 9 * s, ty + th / 2 + s);
      // 깊이 선
      var ly = y + L.f.small * 1.7 + 34 * s, fill = easeOut(seg(k, 0.2 + i * 0.16, 0.5 + i * 0.16));
      ctx.fillStyle = rgba(C.ivory, 0.1);
      ctx.fillRect(x0, ly, w, 2 * s);
      if (read) { ctx.fillStyle = C.gold; ctx.fillRect(x0, ly - s, w * fill * (d.state === 'partial' ? 0.6 : 1), 4 * s); }
      else { ctx.strokeStyle = C.mute; ctx.lineWidth = Math.max(1, 1.5 * s); ctx.setLineDash([8 * s, 8 * s]); ctx.beginPath(); ctx.moveTo(x0, ly + s); ctx.lineTo(x0 + w * fill, ly + s); ctx.stroke(); ctx.setLineDash([]); }
      ctx.restore();
    });
  }

  function sceneRead(ctx, L, M, G, T, k) {
    var s = L.s, N = G.N;
    sceneTitle(ctx, L, T, T.s1, T.s1sub, k);
    var scan = seg(k, 0.1, 0.78);
    var top = screenQuad(G, 0, 0, 0, L), bot = screenQuad(G, N - 1, 0, 0, L);
    var y0 = top[0][1], y1 = bot[3][1], xl = top[0][0], xr = top[1][0];
    var sy = lerp(y0, y1, scan);
    drawStack(ctx, L, M, G, {
      kc: 0, ki: function () { return 0; },
      alpha: function (i) { var q = screenQuad(G, i, 0, 0, L); return clamp((sy - q[0][1]) / (40 * s), 0, 1); },
      glyph: function (i) { var q = screenQuad(G, i, 0, 0, L); return 0.6 * clamp((sy - q[0][1] - 20 * s) / (60 * s), 0, 1); }
    });
    // 구역 번호
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    font(ctx, L.f.mono * 0.82, 400, true);
    var seen = 0;
    for (var i = 0; i < N; i++) {
      var q = screenQuad(G, i, 0, 0, L);
      if (sy < q[0][1]) continue;
      seen += 1;
      var hh = q[3][1] - q[0][1];
      if (hh < L.f.mono * 0.9 && i % 2) continue;
      ctx.fillStyle = rgba(C.ivory, 0.55);
      ctx.fillText((i < 9 ? '0' : '') + (i + 1), xl - 14 * s, (q[0][1] + q[3][1]) / 2);
    }
    if (scan > 0 && scan < 1) {
      var grad = ctx.createLinearGradient(0, sy - 70 * s, 0, sy);
      grad.addColorStop(0, rgba(C.gold, 0)); grad.addColorStop(1, rgba(C.gold, 0.22));
      ctx.fillStyle = grad;
      ctx.fillRect(xl - 8 * s, sy - 70 * s, xr - xl + 16 * s, 70 * s);
      ctx.fillStyle = C.hi;
      ctx.fillRect(xl - 26 * s, sy - s, xr - xl + 52 * s, 2 * s);
    }
    ctx.textAlign = 'left';
    font(ctx, L.f.mono, 400, true);
    ctx.fillStyle = C.gold;
    var label = T.blocks + ' ' + (seen < 10 ? '0' : '') + seen + ' / ' + (N < 10 ? '0' : '') + N;
    ctx.fillText(label, xl, y0 - 26 * s);
    if (M.synthesized) { ctx.fillStyle = C.mute; ctx.fillText('?', xr - 10 * s, y0 - 26 * s); }
  }

  function legend(ctx, L, M, T, k) {
    var s = L.s, items = ROLES, x, y, i;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    for (i = 0; i < items.length; i++) {
      var a = easeOut(seg(k, 0.36 + i * 0.1, 0.44 + i * 0.1));
      if (a <= 0.01) continue;
      var role = items[i], n = M.roleCount[role] || 0, st = roleStyle(role);
      if (L.portrait) { x = L.pad + (i % 2) * (L.W - L.pad * 2) / 2; y = L.legendY + Math.floor(i / 2) * 62 * s; }
      else { x = L.pad; y = L.legendY + i * 58 * s; }
      ctx.save();
      ctx.globalAlpha = a * (n ? 1 : 0.6);
      var sw = 26 * s;
      ctx.lineWidth = Math.max(1, st.w * s);
      ctx.strokeStyle = n ? st.stroke : C.mute;
      ctx.fillStyle = n ? (role === 'pay' ? rgba(C.gold, 0.35) : st.fill) : 'rgba(0,0,0,0)';
      if (st.dash || !n) ctx.setLineDash([5 * s, 4 * s]);
      ctx.beginPath(); ctx.rect(x, y - sw / 2, sw, sw); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
      font(ctx, L.f.body * 0.9, 300);
      ctx.fillStyle = n ? C.ivory : C.dim;
      ctx.fillText(T[role], x + sw + 16 * s, y);
      var tw = ctx.measureText(T[role]).width;
      font(ctx, L.f.mono, 400, true);
      ctx.fillStyle = n ? C.gold : C.mute;
      ctx.fillText(n ? String(n) : T.unknown, x + sw + 16 * s + tw + 14 * s, y + s);
      ctx.restore();
    }
  }

  function sceneSplit(ctx, L, M, G, T, k, fade) {
    var s = L.s, N = G.N;
    sceneTitle(ctx, L, T, T.s2, T.s2sub, k, fade);
    var kc = ease(seg(k, 0.04, 0.34));
    var active = null;
    for (var r = 0; r < ROLES.length; r++) if (k >= 0.36 + r * 0.1 && k < 0.46 + r * 0.1) active = ROLES[r];
    drawStack(ctx, L, M, G, {
      kc: kc,
      ki: function (i) { return ease(seg(k, 0.04 + (N - 1 - i) * 0.012, 0.3 + (N - 1 - i) * 0.012)); },
      alpha: function (i, b) { return fade * (active && b.role !== active ? 0.4 : 1); },
      hot: function (b) { return active && b.role === active; }
    });
    ctx.save();
    ctx.globalAlpha = fade;
    legend(ctx, L, M, T, k);
    // 이름표
    var la = easeOut(seg(k, 0.3, 0.42));
    if (la > 0.01) {
      var q0 = screenQuad(G, 0, 1, 1, L), qn = screenQuad(G, N - 1, 1, 1, L);
      var yTop = Math.min(q0[1][1], q0[0][1]) - 6 * s, yBot = Math.max(qn[2][1], qn[1][1]) + 6 * s;
      var rowH = (yBot - yTop) / Math.max(1, N - 1);
      var fs = Math.min(L.f.body * 0.84, rowH * 0.78);
      for (var i = 0; i < N; i++) {
        var b = M.blocks[i], q = screenQuad(G, i, 1, 1, L);
        var ax = Math.max(q[1][0], q[2][0]), ay = (q[1][1] + q[2][1]) / 2;
        var ly = N === 1 ? ay : yTop + rowH * i, lx = L.labelX;
        var dim = active && b.role !== active;
        var st = roleStyle(b.role);
        ctx.globalAlpha = fade * la * (dim ? 0.3 : 1);
        ctx.strokeStyle = rgba(st.stroke, 0.55);
        ctx.lineWidth = Math.max(1, s);
        ctx.beginPath(); ctx.moveTo(ax + 6 * s, ay); ctx.lineTo(lx - 34 * s, ay); ctx.lineTo(lx - 14 * s, ly); ctx.lineTo(lx - 6 * s, ly); ctx.stroke();
        ctx.fillStyle = st.stroke;
        ctx.beginPath(); ctx.arc(ax + 6 * s, ay, 3 * s, 0, 6.3); ctx.fill();
        ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
        font(ctx, fs * 0.74, 400, true);
        ctx.fillStyle = st.stroke;
        var no = (i < 9 ? '0' : '') + (i + 1);
        ctx.fillText(no, lx, ly + s);
        var nw = ctx.measureText(no).width + 12 * s;
        font(ctx, fs, 300);
        ctx.fillStyle = C.ivory;
        var name = b.name, maxW = L.labelW - nw;
        while (name.length > 3 && ctx.measureText(name).width > maxW) name = name.slice(0, -2) + '…';
        ctx.fillText(name, lx + nw, ly);
      }
    }
    ctx.restore();
  }

  function flowPoints(L) {
    var pts = [], i;
    if (L.portrait) for (i = 0; i < 5; i++) pts.push([L.W * 0.17, lerp(L.flowTop, L.flowBot, i / 4)]);
    else for (i = 0; i < 5; i++) pts.push([L.W * (0.12 + i * 0.19), L.H * (0.6 + (i % 2 ? 0.04 : -0.04))]);
    return pts;
  }
  function sceneFlow(ctx, L, M, T, k, time) {
    var s = L.s, pts = flowPoints(L), i;
    sceneTitle(ctx, L, T, T.s3, T.s3sub, k);
    var drawn = seg(k, 0.08, 0.6) * 4; // 그려진 구간 수
    // 길
    for (i = 0; i < 4; i++) {
      var p = clamp(drawn - i, 0, 1);
      if (p <= 0) break;
      var a = pts[i], b = pts[i + 1];
      var known = M.nodes[i].status !== 'unknown' && M.nodes[i + 1].status !== 'unknown';
      ctx.strokeStyle = known ? rgba(C.gold, 0.6) : rgba(C.mute, 0.6);
      ctx.lineWidth = Math.max(1, (known ? 2 : 1.4) * s);
      if (!known) ctx.setLineDash([8 * s, 8 * s]);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(lerp(a[0], b[0], p), lerp(a[1], b[1], p)); ctx.stroke();
      ctx.setLineDash([]);
    }
    // 흐르는 점
    var dots = 16;
    for (i = 0; i < dots; i++) {
      var u = ((time * 0.11 + i / dots) % 1) * 4;
      if (u > drawn) continue;
      var si = Math.min(3, Math.floor(u)), f = u - si;
      var pa = pts[si], pb = pts[si + 1];
      var kn = M.nodes[si].status !== 'unknown' && M.nodes[si + 1].status !== 'unknown';
      ctx.fillStyle = kn ? C.hi : rgba(C.dim, 0.5);
      ctx.shadowColor = C.gold; ctx.shadowBlur = kn ? 14 * s : 0;
      ctx.beginPath(); ctx.arc(lerp(pa[0], pb[0], f), lerp(pa[1], pb[1], f), (kn ? 5 : 3.2) * s, 0, 6.3); ctx.fill();
      ctx.shadowBlur = 0;
    }
    // 마디
    for (i = 0; i < 5; i++) {
      var na = easeOut(seg(k, 0.06 + i * 0.13, 0.16 + i * 0.13));
      if (na <= 0.01) continue;
      var nd = M.nodes[i], pt = pts[i], R = (L.portrait ? 30 : 28) * s;
      ctx.save();
      ctx.globalAlpha = na;
      ctx.beginPath(); ctx.arc(pt[0], pt[1], R, 0, 6.3);
      ctx.fillStyle = C.bg; ctx.fill();
      if (nd.status === 'observed') { ctx.strokeStyle = C.ivory; ctx.lineWidth = 2.4 * s; ctx.stroke(); ctx.beginPath(); ctx.arc(pt[0], pt[1], R * 0.42, 0, 6.3); ctx.fillStyle = C.ivory; ctx.fill(); }
      else if (nd.status === 'inferred') { ctx.strokeStyle = C.gold; ctx.lineWidth = 2.4 * s; ctx.stroke(); ctx.beginPath(); ctx.arc(pt[0], pt[1], R * 0.42, 0, 6.3); ctx.strokeStyle = C.gold; ctx.lineWidth = 2 * s; ctx.stroke(); }
      else { ctx.setLineDash([6 * s, 6 * s]); ctx.strokeStyle = C.mute; ctx.lineWidth = 2 * s; ctx.stroke(); ctx.setLineDash([]); font(ctx, R * 0.9, 400, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.mute; ctx.fillText('?', pt[0], pt[1] + s); }
      // 글자
      var tx, ty, align;
      if (L.portrait) { tx = pt[0] + R + 30 * s; ty = pt[1] - 14 * s; align = 'left'; }
      else { tx = pt[0]; ty = pt[1] + R + (i % 2 ? 54 : 54) * s; align = 'center'; }
      ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
      font(ctx, L.f.mono * 0.86, 400, true);
      ctx.fillStyle = C.gold;
      if (L.portrait) ctx.fillText('0' + (i + 1), tx, ty - L.f.body * 1.05);
      else ctx.fillText('0' + (i + 1), tx, pt[1] - R - 22 * s);
      font(ctx, L.f.body * 1.22, 300);
      ctx.fillStyle = nd.status === 'unknown' ? C.dim : C.ivory;
      ctx.fillText(stageName(T, nd.key), tx, ty + 6 * s);
      var lw = ctx.measureText(stageName(T, nd.key)).width;
      // 상태 표
      var tag = T[nd.status], evs = nd.ev.slice(0, 3).join(' ');
      font(ctx, L.f.mono * 0.82, 400, true);
      var tw = ctx.measureText(tag).width + 16 * s, th = L.f.mono * 1.36;
      var bx = L.portrait ? tx + lw + 18 * s : tx - (tw + (evs ? ctx.measureText(evs).width + 12 * s : 0)) / 2;
      var byy = L.portrait ? ty + 6 * s - th * 0.86 : ty + 22 * s;
      if (nd.status === 'observed') { ctx.fillStyle = C.ivory; ctx.fillRect(bx, byy, tw, th); ctx.fillStyle = C.bg; }
      else if (nd.status === 'inferred') { ctx.strokeStyle = C.gold; ctx.lineWidth = Math.max(1, 1.4 * s); ctx.strokeRect(bx, byy, tw, th); ctx.fillStyle = C.hi; }
      else { ctx.setLineDash([4 * s, 4 * s]); ctx.strokeStyle = C.mute; ctx.lineWidth = Math.max(1, 1.2 * s); ctx.strokeRect(bx, byy, tw, th); ctx.setLineDash([]); ctx.fillStyle = C.dim; }
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(tag, bx + 8 * s, byy + th / 2 + s);
      if (evs) { ctx.fillStyle = C.dim; ctx.fillText(evs, bx + tw + 12 * s, byy + th / 2 + s); }
      if (nd.text) {
        // 리포트에 내 말로 적은 문장의 앞부분
        var fsz = L.f.small * (L.portrait ? 0.9 : 0.74);
        font(ctx, fsz, 300);
        ctx.fillStyle = rgba(C.dim, 0.9);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = L.portrait ? 'left' : 'center';
        var lines = wrap(ctx, nd.text, L.portrait ? L.W - tx - L.pad : L.W * 0.165, L.portrait ? 2 : 3);
        var y0 = L.portrait ? ty + 6 * s + fsz * 1.75 : byy + th + fsz * 1.7;
        lines.forEach(function (ln, j) { ctx.fillText(ln, tx, y0 + j * fsz * 1.45); });
      }
      ctx.restore();
    }
    // 합계
    var ca = easeOut(seg(k, 0.66, 0.78));
    if (ca > 0.01) {
      var c = { observed: 0, inferred: 0, unknown: 0 };
      M.nodes.forEach(function (nd) { c[nd.status] += 1; });
      var text = T.observed + ' ' + c.observed + '   ·   ' + T.inferred + ' ' + c.inferred + '   ·   ' + T.unknown + ' ' + c.unknown;
      ctx.save(); ctx.globalAlpha = ca;
      font(ctx, L.f.body, 300);
      ctx.textAlign = L.portrait ? 'left' : 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = C.dim;
      ctx.fillText(text, L.portrait ? L.pad : L.W / 2, L.sumY);
      ctx.restore();
    }
  }

  function sceneMine(ctx, L, M, G, T, k) {
    var s = L.s, N = G.N, i;
    sceneTitle(ctx, L, T, T.s4, T.s4sub, k);
    var top = screenQuad(G, 0, 0, 0, L), bot = screenQuad(G, N - 1, 0, 0, L);
    var x0 = top[0][0], x1 = top[1][0], y0 = top[0][1], y1 = bot[3][1], pw = x1 - x0, ph = y1 - y0;
    var img = M.mine.img, hasImg = !!(img && img.width && M.mine.mapped);
    var morph = hasImg ? ease(seg(k, 0.12, 0.42)) : 0;
    var imgH = hasImg ? pw * img.height / img.width : ph;
    var appear = easeOut(seg(k, 0, 0.1));
    ctx.save();
    ctx.beginPath(); ctx.rect(x0 - 40 * s, y0 - 4 * s, pw + 80 * s, ph + 8 * s); ctx.clip();
    for (i = 0; i < N; i++) {
      var b = M.blocks[i], q = screenQuad(G, i, 0, 0, L);
      var ay0 = q[0][1], ay1 = q[3][1], by0 = ay0, by1 = ay1;
      var gone = hasImg && !b.mine;
      if (hasImg && b.mine) { by0 = y0 + b.mine[0] * imgH; by1 = y0 + b.mine[1] * imgH; }
      var cy0 = lerp(ay0, by0, morph), cy1 = lerp(ay1, by1, morph);
      var quad = [[x0, cy0], [x1, cy0], [x1, cy1], [x0, cy1]];
      var reveal = hasImg && b.mine ? easeOut(seg(k, 0.4 + i * 0.03, 0.56 + i * 0.03)) : 0;
      var alpha = appear * (gone ? 1 - seg(k, 0.1, 0.32) : 1);
      if (!M.mine.has) alpha *= 0.55 + 0.25 * Math.sin(k * 20 + i);
      if (reveal > 0.01 && cy1 > y0 && cy0 < y1) {
        ctx.save();
        ctx.globalAlpha = reveal;
        ctx.beginPath(); ctx.rect(x0, cy0, pw, (cy1 - cy0) * reveal); ctx.clip();
        ctx.drawImage(img, 0, b.mine[0] * img.height, img.width, (b.mine[1] - b.mine[0]) * img.height, x0, cy0, pw, cy1 - cy0);
        ctx.restore();
      }
      drawPlate(ctx, quad, b, L, { alpha: alpha * (1 - reveal * 0.9), thick: 0, hot: !hasImg && M.mine.has && k > 0.3 + i * 0.03 && k < 0.42 + i * 0.03, glyph: 0.6 * (1 - reveal) });
      if (gone && alpha > 0.05) {
        ctx.save(); ctx.globalAlpha = alpha;
        font(ctx, L.f.mono * 0.8, 400, true); ctx.fillStyle = C.mute; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(T.not_taken, (x0 + x1) / 2, (cy0 + cy1) / 2);
        ctx.restore();
      }
    }
    ctx.restore();
    // 아래로 이어진다는 표시
    if (hasImg && imgH > ph) {
      var fa = seg(k, 0.4, 0.6);
      var g2 = ctx.createLinearGradient(0, y1 - 90 * s, 0, y1 + 6 * s);
      g2.addColorStop(0, 'rgba(7,8,10,0)'); g2.addColorStop(1, 'rgba(7,8,10,' + fa + ')');
      ctx.fillStyle = g2; ctx.fillRect(x0 - 4 * s, y1 - 90 * s, pw + 8 * s, 100 * s);
    }
    ctx.strokeStyle = rgba(C.gold, 0.5 * appear); ctx.lineWidth = Math.max(1, s);
    ctx.strokeRect(x0 - 8 * s, y0 - 8 * s, pw + 16 * s, ph + 16 * s);
    // 옆 글자
    var tx = L.pad, ty = L.mineY;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    if (!M.mine.has) {
      var na = easeOut(seg(k, 0.2, 0.34));
      ctx.save(); ctx.globalAlpha = na;
      font(ctx, L.f.body * 1.05, 300); ctx.fillStyle = C.ivory; ctx.fillText(T.no_mine, tx, ty);
      font(ctx, L.f.small, 300); ctx.fillStyle = C.dim;
      wrap(ctx, T.no_mine2, L.portrait ? L.W - L.pad * 2 : L.W * 0.26, 2).forEach(function (ln, j) { ctx.fillText(ln, tx, ty + L.f.small * 1.5 * (j + 1) + 6 * s); });
      ctx.restore();
      return;
    }
    var a1 = easeOut(seg(k, 0.16, 0.3));
    ctx.save(); ctx.globalAlpha = a1;
    font(ctx, L.f.mono * 0.86, 400, true); ctx.fillStyle = C.gold;
    spaced(ctx, 'MY VERSION', tx, ty - L.f.body * 1.5, 3 * s);
    var nm = fitText(ctx, M.mine.name, L.f.body * 1.15, 300, L.portrait ? L.W * 0.5 : L.W * 0.26, 2);
    ctx.fillStyle = C.ivory;
    nm.lines.forEach(function (ln, j) { ctx.fillText(ln, tx, ty + j * nm.size * 1.3); });
    ctx.restore();
    // 새로 만든 것
    var bx = L.portrait ? L.W * 0.58 : tx, byy = L.portrait ? ty - L.f.body * 1.5 : ty + nm.lines.length * nm.size * 1.3 + 46 * s;
    var la = easeOut(seg(k, 0.46, 0.56));
    ctx.save(); ctx.globalAlpha = la;
    font(ctx, L.f.mono * 0.86, 400, true); ctx.fillStyle = C.mute;
    ctx.fillText(T.fresh_t, bx, byy);
    ctx.restore();
    var cx = bx, cyy = byy + 22 * s;
    T.fresh.forEach(function (w, j) {
      var ca = easeOut(seg(k, 0.52 + j * 0.07, 0.6 + j * 0.07));
      if (ca <= 0.01) return;
      font(ctx, L.f.small, 300);
      var cw = ctx.measureText(w).width + 28 * s, ch = L.f.small * 1.7;
      if (cx + cw > (L.portrait ? L.W - L.pad : L.W * 0.3) && cx > bx) { cx = bx; cyy += ch + 10 * s; }
      ctx.save(); ctx.globalAlpha = ca;
      ctx.strokeStyle = C.gold; ctx.lineWidth = Math.max(1, 1.3 * s);
      ctx.strokeRect(cx, cyy, cw, ch);
      ctx.fillStyle = C.hi; ctx.textBaseline = 'middle';
      ctx.fillText(w, cx + 14 * s, cyy + ch / 2 + s);
      ctx.restore();
      cx += cw + 10 * s;
    });
    if (!hasImg) {
      ctx.save(); ctx.globalAlpha = la;
      font(ctx, L.f.mono * 0.8, 400, true); ctx.fillStyle = C.mute; ctx.textBaseline = 'alphabetic';
      ctx.fillText(T.spec_only, x0, y0 - 22 * s);
      ctx.restore();
    }
  }

  function sceneEnd(ctx, L, M, T, k) {
    var W = L.W, H = L.H, s = L.s;
    var a = easeOut(seg(k, 0, 0.2));
    ctx.save(); ctx.globalAlpha = a;
    var keys = ['observed', 'inferred', 'unknown'], cols = [C.ivory, C.hi, C.mute];
    var cy = H * (L.portrait ? 0.36 : 0.38), gapX = (L.portrait ? 270 : 300) * s;
    keys.forEach(function (key, i) {
      var x = W / 2 + (i - 1) * gapX;
      var val = Math.round(M.counts[key] * easeOut(seg(k, 0.05, 0.5)));
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      font(ctx, (L.portrait ? 150 : 150) * s, 300, true);
      ctx.fillStyle = cols[i];
      ctx.fillText(String(val), x, cy);
      font(ctx, L.f.body, 300);
      ctx.fillStyle = C.dim;
      ctx.fillText(T[key], x, cy + 58 * s);
    });
    // 비율 막대
    var total = M.counts.observed + M.counts.inferred + M.counts.unknown || 1;
    var bw = Math.min(W - L.pad * 2, 900 * s), bx = (W - bw) / 2, by = cy + 112 * s, x = bx;
    keys.forEach(function (key, i) {
      var w = bw * M.counts[key] / total * easeOut(seg(k, 0.1, 0.55));
      if (key === 'unknown') { ctx.fillStyle = C.mute; for (var dx = 0; dx < w; dx += 10 * s) ctx.fillRect(x + dx, by, 5 * s, 6 * s); }
      else { ctx.fillStyle = i === 0 ? C.ivory : C.gold; ctx.fillRect(x, by, Math.max(0, w - 4 * s), 6 * s); }
      x += w;
    });
    font(ctx, L.f.sub, 300); ctx.fillStyle = C.dim; ctx.textAlign = 'center';
    ctx.fillText(T.end1 + (M.counts.code ? '  ·  ' + T.code + ' ' + M.counts.code : ''), W / 2, by + 74 * s);
    // 이름
    var wy = H * (L.portrait ? 0.66 : 0.76);
    var wa = easeOut(seg(k, 0.3, 0.55));
    ctx.globalAlpha = a * wa;
    font(ctx, (L.portrait ? 96 : 84) * s, 200);
    ctx.fillStyle = C.ivory;
    ctx.fillText('reversebusiness', W / 2, wy);
    ctx.fillStyle = C.gold;
    ctx.fillRect(W / 2 - 120 * s * wa, wy + 30 * s, 240 * s * wa, 2 * s);
    font(ctx, L.f.mono, 400, true);
    ctx.fillStyle = C.ivory;
    var line1 = 'CONNECT AI LAB';
    var lw = spacedWidth(ctx, line1, 5 * s);
    ctx.textAlign = 'left';
    spaced(ctx, line1, W / 2 - lw / 2, wy + 84 * s, 5 * s);
    ctx.textAlign = 'center';
    font(ctx, L.f.small, 300); ctx.fillStyle = C.dim;
    ctx.fillText(T.motto, W / 2, wy + 136 * s);
    font(ctx, L.f.mono * 0.9, 400, true); ctx.fillStyle = C.hi;
    var cmd = 'npx github:smeagemoeny-maker/reversebusiness';
    if (ctx.measureText(cmd).width > W - L.pad * 2) font(ctx, L.f.mono * 0.9 * (W - L.pad * 2) / ctx.measureText(cmd).width, 400, true);
    ctx.fillText(cmd, W / 2, wy + (L.portrait ? 230 : 196) * s);
    ctx.restore();
  }

  // ---------- one frame ----------
  var cache = { key: '', L: null, G: null };
  function draw(ctx, W, H, t, M, lang) {
    var T = TXT[lang] || TXT.ko;
    var key = W + 'x' + H + ':' + M.blocks.length + ':' + M.blocks.map(function (b) { return b.f.toFixed(3); }).join(',');
    if (cache.key !== key) { cache.L = layoutOf(W, H); cache.G = geoOf(M, cache.L); cache.key = key; }
    var L = cache.L, G = cache.G;
    t = clamp(t, 0, DUR);
    var no = t < SC.depth[0] ? 0 : t < SC.split[0] ? 1 : t < SC.flow[0] ? 2 : t < SC.mine[0] ? 3 : t < SC.end[0] ? 4 : 0;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    backdrop(ctx, L);
    var out = 0; // 장면 끝에서 어두워지는 정도
    if (t < SC.title[1]) sceneIntro(ctx, L, M, T, seg(t, SC.title[0], SC.title[1]));
    else if (t < SC.depth[1]) { sceneDepth(ctx, L, M, T, seg(t, SC.depth[0], SC.depth[1])); out = seg(t, SC.depth[1] - 0.35, SC.depth[1]); }
    else if (t < SC.read[1]) sceneRead(ctx, L, M, G, T, seg(t, SC.read[0], SC.read[1]));
    else if (t < SC.split[1]) { sceneSplit(ctx, L, M, G, T, seg(t, SC.split[0], SC.split[1]), 1); out = seg(t, SC.split[1] - 0.45, SC.split[1]); }
    else if (t < SC.flow[1]) { sceneFlow(ctx, L, M, T, seg(t, SC.flow[0], SC.flow[1]), t); out = seg(t, SC.flow[1] - 0.4, SC.flow[1]); }
    else if (t < SC.mine[1]) { sceneMine(ctx, L, M, G, T, seg(t, SC.mine[0], SC.mine[1])); out = seg(t, SC.mine[1] - 0.4, SC.mine[1]); }
    else sceneEnd(ctx, L, M, T, seg(t, SC.end[0], SC.end[1]));
    if (out > 0) { ctx.globalAlpha = 1; ctx.fillStyle = rgba(C.bg, out); ctx.fillRect(0, 0, W, H); }
    chrome(ctx, L, t, no);
    ctx.restore();
  }

  // ---------- on-page player ----------
  function mount(canvas, getModel, getLang) {
    var ctx = canvas.getContext('2d');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var state = { t: reduce ? STILL : 0, playing: !reduce, last: 0, visible: true, hold: 0, raf: 0 };
    function size() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    }
    function paint() { var M = getModel(); if (M) draw(ctx, canvas.width, canvas.height, state.t, M, getLang()); }
    function tick(now) {
      state.raf = 0;
      if (!state.playing) return;
      var dt = state.last ? Math.min(0.1, (now - state.last) / 1000) : 0;
      state.last = now;
      if (state.visible && !document.hidden) {
        if (state.t >= DUR) { state.hold += dt; if (state.hold > 2.6) { state.t = 0; state.hold = 0; } }
        else state.t = Math.min(DUR, state.t + dt);
        size(); paint();
      }
      state.raf = requestAnimationFrame(tick);
    }
    function play() { state.playing = true; state.last = 0; if (!state.raf) state.raf = requestAnimationFrame(tick); }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { state.visible = es[0].isIntersecting; }, { threshold: 0.05 }).observe(canvas);
    window.addEventListener('resize', function () { size(); paint(); });
    size(); paint();
    if (state.playing) play();
    return {
      replay: function () { state.t = 0; state.hold = 0; play(); },
      refresh: function () { size(); paint(); },
      seek: function (t) { state.playing = false; state.t = t; size(); paint(); },
      state: state
    };
  }

  // ---------- 9:16 영상으로 저장 ----------
  function pickType() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    var types = ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    for (var i = 0; i < types.length; i++) if (MediaRecorder.isTypeSupported(types[i])) return types[i];
    return '';
  }
  function canRecord() {
    var c = document.createElement('canvas');
    return !!(c.captureStream && pickType());
  }
  function record(M, lang, on) {
    var type = pickType();
    var cv = document.createElement('canvas');
    cv.width = 1080; cv.height = 1920;
    if (!cv.captureStream || !type) { on.error('unsupported'); return null; }
    var ctx = cv.getContext('2d');
    draw(ctx, 1080, 1920, 0, M, lang);
    var stream = cv.captureStream(30);
    var rec, chunks = [], stopped = false, cancelled = false, raf = 0;
    try { rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8000000 }); } catch (e) { on.error('unsupported'); return null; }
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onerror = function () { stopped = true; on.error('failed'); };
    rec.onstop = function () {
      stream.getTracks().forEach(function (tr) { tr.stop(); });
      if (cancelled) return;
      if (!chunks.length) { on.error('failed'); return; }
      var blob = new Blob(chunks, { type: type.split(';')[0] });
      on.done(blob, type.indexOf('mp4') >= 0 ? 'mp4' : 'webm');
    };
    var start = 0;
    function frame(now) {
      if (stopped) return;
      if (!start) start = now;
      var t = (now - start) / 1000;
      draw(ctx, 1080, 1920, Math.min(t, DUR), M, lang);
      on.progress(Math.min(1, t / (DUR + 0.4)));
      if (t >= DUR + 0.4) { stopped = true; rec.stop(); return; }
      raf = requestAnimationFrame(frame);
    }
    rec.start(1000);
    raf = requestAnimationFrame(frame);
    return { cancel: function () { if (stopped) return; stopped = true; cancelled = true; cancelAnimationFrame(raf); try { rec.stop(); } catch (e) {} } };
  }

  window.RebizStage = { DUR: DUR, SC: SC, STILL: STILL, TXT: TXT, GLYPHS: GLYPHS, buildModel: buildModel, draw: draw, mount: mount, record: record, canRecord: canRecord };
})();
