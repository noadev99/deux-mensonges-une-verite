// 🏎️ Les Bolides — la TÉLÉ fait tourner la course, les TÉLÉPHONES sont des manettes.
// Pilotage : l'accélération est automatique · joystick = volant (tiré vers le bas = frein / marche arrière)
// A (maintenu en tournant) = drift qui charge un turbo · B = objet
// Subtilités : démarrage canon, plaques turbo, aspiration, coup de pouce aux derniers,
// mouette qui repose sur la piste ceux qui coupent trop.
(() => {
  const { esc, P, av, name } = UI;
  const { tone, noise, audio, inputs, faceImg, colorOf, startPad, stopPad, kbResume, kbName } = MANETTE;

  const SFX = {
    beep: () => tone(520, 0.18, 'square', 0.1),
    go: () => { tone(880, 0.12, 'square', 0.1); tone(1320, 0.4, 'square', 0.1, 0, 0.12); },
    boost: () => { noise(0.45, 0.22, 2400, -1800); tone(180, 0.35, 'sawtooth', 0.06, 420); },
    spark: (lvl) => tone([0, 700, 900, 1150][lvl] || 700, 0.08, 'square', 0.05),
    pick: () => [660, 880, 1100].forEach((f, i) => tone(f, 0.07, 'square', 0.05, 0, i * 0.05)),
    got: () => tone(1320, 0.12, 'triangle', 0.08),
    use: () => tone(400, 0.15, 'square', 0.06, 300),
    spin: () => { tone(700, 0.5, 'sawtooth', 0.06, -550); noise(0.3, 0.15, 900); },
    bump: () => { noise(0.1, 0.3, 600); tone(150, 0.1, 'sine', 0.18, -50); },
    honk: () => { tone(330, 0.3, 'square', 0.1); tone(415, 0.3, 'square', 0.08); },
    pop: () => { noise(0.08, 0.35, 3000); tone(900, 0.1, 'square', 0.05, -500); },
    squawk: () => { tone(1100, 0.08, 'square', 0.05, -400); tone(900, 0.1, 'square', 0.05, -300, 0.09); },
    lap: () => { tone(988, 0.1, 'square', 0.07); tone(1319, 0.2, 'square', 0.07, 0, 0.1); },
    final: () => [784, 784, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.4 : 0.12, 'square', 0.08, 0, i * 0.14)),
    splash: () => { noise(0.6, 0.4, 1800, -1500); tone(500, 0.3, 'sine', 0.08, -350); },
    stall: () => { noise(0.5, 0.2, 400); tone(90, 0.4, 'sawtooth', 0.08, -30); },
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'square', 0.08, 0, i * 0.11)),
  };

  // ═══ Circuits (monde : 1200 × 768) ═══
  const W = 1200, H = 768, SP = 6; // SP : un point de piste tous les 6 px
  const INK = '#1a0f2e';
  const TRACKS = {
    parc: {
      half: 54, laps: 4, grass: '#6cc04a', grass2: '#62b543',
      pts: [[170, 400], [190, 200], [360, 115], [600, 160], [820, 105], [1030, 165], [1075, 360], [930, 445], [1010, 600], [830, 675], [560, 610], [430, 500], [300, 640], [175, 580]],
      pads: [0.33, 0.83], boxes: [0.16, 0.6],
    },
    huit: {
      half: 52, laps: 3, grass: '#7bc95a', grass2: '#70bd4f',
      fn: (u) => { const a = (u + 0.12) * Math.PI * 2; return [600 + 480 * Math.sin(a), 384 + 520 * Math.sin(a) * Math.cos(a)]; },
      pads: [0.13, 0.63], boxes: [0.44, 0.92],
    },
    epingles: {
      half: 46, laps: 3, grass: '#d9c27a', grass2: '#cfb66b', sand: true,
      pts: [[130, 600], [130, 220], [190, 115], [290, 120], [335, 220], [335, 470], [395, 565], [485, 565], [540, 470], [540, 220], [600, 118], [690, 118], [745, 220], [745, 470], [805, 565], [895, 565], [950, 470], [950, 220], [1010, 118], [1085, 140], [1110, 300], [1100, 600], [1020, 700], [600, 708], [220, 702]],
      pads: [0.9], boxes: [0.03, 0.5],
    },
    port: {
      half: 52, laps: 3, grass: '#5bb8e8', grass2: '#52aedf', water: true,
      pts: [[150, 600], [150, 260], [260, 130], [520, 130], [610, 250], [710, 330], [860, 250], [905, 135], [1060, 150], [1095, 330], [980, 420], [1085, 525], [1040, 670], [720, 690], [570, 585], [420, 690], [230, 690]],
      pads: [0.12, 0.48, 0.86], boxes: [0.28, 0.68],
    },
  };

  function buildTrack(id) {
    const def = TRACKS[id] || TRACKS.parc;
    let raw = [];
    if (def.fn) for (let i = 0; i < 1200; i++) raw.push(def.fn(i / 1200));
    else {
      const p = def.pts, n = p.length;
      for (let i = 0; i < n; i++) {
        const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
        for (let s = 0; s < 40; s++) {
          const t = s / 40, t2 = t * t, t3 = t2 * t;
          raw.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
        }
      }
    }
    // rééchantillonnage régulier (un point tous les SP px)
    const pts = [];
    let carry = 0;
    for (let i = 0; i < raw.length; i++) {
      const a = raw[i], b = raw[(i + 1) % raw.length];
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let d = carry;
      while (d < seg) { const f = d / seg; pts.push({ x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f }); d += SP; }
      carry = d - seg;
    }
    const N = pts.length;
    for (let i = 0; i < N; i++) {
      const a = pts[(i - 2 + N) % N], b = pts[(i + 2) % N];
      const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      pts[i].tx = (b.x - a.x) / l; pts[i].ty = (b.y - a.y) / l;
      pts[i].nx = -pts[i].ty; pts[i].ny = pts[i].tx;           // normale : vers la droite du sens de course
      pts[i].ang = Math.atan2(pts[i].ty, pts[i].tx);
    }
    const at = (f) => Math.floor((((f % 1) + 1) % 1) * N);
    const boxes = [];
    for (const f of def.boxes) for (const off of [-0.55, 0, 0.55]) {
      const q = pts[at(f)];
      boxes.push({ x: q.x + q.nx * off * def.half, y: q.y + q.ny * off * def.half, cd: 0 });
    }
    const pads = def.pads.map((f, i) => { const q = pts[at(f)]; const off = (i % 2 ? 0.4 : -0.4) * def.half; return { x: q.x + q.nx * off, y: q.y + q.ny * off, ang: q.ang }; });
    return { id, def, pts, N, L: N * SP, half: def.half, laps: def.laps, boxes, pads };
  }

  // point de piste le plus proche, cherché autour du dernier point connu (de -30 à +20 points)
  function nearest(T, x, y, from) {
    let best = from, bd = Infinity;
    for (let k = -30; k <= 20; k++) {
      const i = (from + k + T.N) % T.N, q = T.pts[i];
      const d = (q.x - x) ** 2 + (q.y - y) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return [best, Math.sqrt(bd)];
  }
  function nearestAll(T, x, y) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < T.N; i++) { const q = T.pts[i]; const d = (q.x - x) ** 2 + (q.y - y) ** 2; if (d < bd) { bd = d; best = i; } }
    return [best, Math.sqrt(bd)];
  }

  // ═══ Décor dessiné une fois par circuit (image hors écran) ═══
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function trackPath(c, T) { c.beginPath(); T.pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.closePath(); }
  function drawBackground(T, scale) {
    const cv = document.createElement('canvas');
    cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
    const c = cv.getContext('2d');
    c.scale(scale, scale);
    const d = T.def;
    // fond : herbe tondue en bandes, sable, ou eau du port
    c.fillStyle = d.grass; c.fillRect(0, 0, W, H);
    c.fillStyle = d.grass2;
    for (let x = -H; x < W; x += 80) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 40, 0); c.lineTo(x + 40 + H, H); c.lineTo(x + H, H); c.closePath(); c.fill(); }
    if (d.water) {
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.lineCap = 'round';
      for (let y = 30; y < H; y += 60) for (let x = (y % 120) / 2; x < W; x += 140) { c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 15, y - 8, x + 30, y); c.quadraticCurveTo(x + 45, y + 8, x + 60, y); c.stroke(); }
      // quai en bois sous la piste
      c.lineJoin = 'round'; c.lineCap = 'round';
      trackPath(c, T); c.strokeStyle = INK; c.lineWidth = T.half * 2 + 64; c.stroke();
      trackPath(c, T); c.strokeStyle = '#c98d4a'; c.lineWidth = T.half * 2 + 56; c.stroke();
      trackPath(c, T); c.strokeStyle = 'rgba(26,15,46,.25)'; c.lineWidth = T.half * 2 + 56; c.setLineDash([3, 19]); c.stroke(); c.setLineDash([]);
    }
    const rand = rng(T.id.length * 977 + T.N);
    // décor (arbres, pneus, cônes) loin de la piste
    const deco = [];
    for (let k = 0; k < 400 && deco.length < 26; k++) {
      const x = 30 + rand() * (W - 60), y = 30 + rand() * (H - 60);
      const [, dd] = nearestAll(T, x, y);
      if (dd < T.half + (d.water ? 60 : 38) || deco.some((o) => Math.hypot(o.x - x, o.y - y) < 60)) continue;
      deco.push({ x, y, kind: d.water ? 'buoy' : rand() < 0.65 ? (d.sand ? 'cactus' : 'tree') : 'tires', r: 14 + rand() * 12 });
    }
    // piste : contour encre, vibreurs rouge et blanc, asphalte
    c.lineJoin = 'round'; c.lineCap = 'round';
    trackPath(c, T); c.strokeStyle = INK; c.lineWidth = T.half * 2 + 22; c.stroke();
    trackPath(c, T); c.strokeStyle = '#e8383d'; c.lineWidth = T.half * 2 + 16; c.stroke();
    c.lineCap = 'butt'; trackPath(c, T); c.strokeStyle = '#fff'; c.lineWidth = T.half * 2 + 16; c.setLineDash([16, 16]); c.stroke(); c.setLineDash([]); c.lineCap = 'round';
    trackPath(c, T); c.strokeStyle = '#5f6170'; c.lineWidth = T.half * 2; c.stroke();
    trackPath(c, T); c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 3; c.setLineDash([22, 26]); c.stroke(); c.setLineDash([]);
    // traces de pneus (pour le look)
    c.strokeStyle = 'rgba(26,15,46,.12)'; c.lineWidth = 4;
    for (let k = 0; k < 10; k++) {
      const i = Math.floor(rand() * T.N), q = T.pts[i], o = (rand() - 0.5) * T.half;
      c.beginPath(); for (let j = 0; j < 14; j++) { const r = T.pts[(i + j) % T.N]; const oo = o + Math.sin(j / 3) * 6; c.lineTo(r.x + r.nx * oo, r.y + r.ny * oo); } c.stroke();
      void q;
    }
    // ligne de départ en damier
    const s0 = T.pts[0];
    c.save(); c.translate(s0.x, s0.y); c.rotate(s0.ang);
    const cells = Math.round((T.half * 2) / 12);
    for (let r = 0; r < 2; r++) for (let k = 0; k < cells; k++) {
      c.fillStyle = (k + r) % 2 ? INK : '#fff'; c.fillRect(-6 + r * 6 - 6, -T.half + k * ((T.half * 2) / cells), 6, (T.half * 2) / cells);
    }
    c.restore();
    // plaques turbo
    for (const p of T.pads) {
      c.save(); c.translate(p.x, p.y); c.rotate(p.ang);
      c.fillStyle = '#ffc23d'; c.strokeStyle = INK; c.lineWidth = 3;
      roundRect(c, -26, -17, 52, 34, 7); c.fill(); c.stroke();
      c.fillStyle = '#ff7a1a';
      for (const dx of [-12, 4]) { c.beginPath(); c.moveTo(dx - 4, -11); c.lineTo(dx + 8, 0); c.lineTo(dx - 4, 11); c.lineTo(dx + 1, 0); c.closePath(); c.fill(); }
      c.restore();
    }
    for (const o of deco) drawDeco(c, o);
    return cv;
  }
  function drawDeco(c, o) {
    c.save(); c.translate(o.x, o.y); c.strokeStyle = INK; c.lineWidth = 3;
    c.fillStyle = 'rgba(26,15,46,.18)'; c.beginPath(); c.ellipse(4, o.r * 0.7, o.r, o.r * 0.4, 0, 0, Math.PI * 2); c.fill();
    if (o.kind === 'tree') {
      c.fillStyle = '#2f8f3a'; c.beginPath(); c.arc(0, 0, o.r, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#48b24f'; c.beginPath(); c.arc(-o.r * 0.3, -o.r * 0.3, o.r * 0.55, 0, Math.PI * 2); c.fill();
    } else if (o.kind === 'cactus') {
      c.fillStyle = '#3e9b4d'; roundRect(c, -6, -o.r, 12, o.r * 1.6, 6); c.fill(); c.stroke();
      roundRect(c, -16, -o.r * 0.4, 8, o.r * 0.7, 4); c.fill(); c.stroke();
    } else if (o.kind === 'buoy') {
      c.fillStyle = '#ff5d5d'; c.beginPath(); c.arc(0, 0, 11, 0, Math.PI * 2); c.fill(); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.stroke();
    } else {
      for (const [dx, dy] of [[-9, 0], [9, 0], [0, -9]]) { c.fillStyle = '#2b2b33'; c.beginPath(); c.arc(dx, dy, 9, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = '#5f6170'; c.beginPath(); c.arc(dx, dy, 3.5, 0, Math.PI * 2); c.fill(); }
    }
    c.restore();
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  // ═══ Objets ═══
  const ITEM = {
    piment: { emoji: '🌶️', label: 'Piment' },
    triple: { emoji: '🌶️', label: '3 piments' },
    savon: { emoji: '🧼', label: 'Savon' },
    bouchon: { emoji: '🍾', label: 'Bouchon' },
    klaxon: { emoji: '📯', label: 'Klaxon' },
    mouette: { emoji: '🐦', label: 'Mouette' },
  };
  // tirage selon la place : les premiers ont des objets de défense, les derniers de quoi revenir
  function drawItem(rank, n, rand) {
    const tables = {
      first: [['savon', 45], ['bouchon', 30], ['klaxon', 25]],
      mid: [['piment', 25], ['savon', 20], ['bouchon', 25], ['klaxon', 18], ['triple', 12]],
      last: [['piment', 22], ['triple', 25], ['mouette', 25], ['bouchon', 16], ['klaxon', 12]],
    };
    const t = rank === 0 ? tables.first : rank >= Math.max(1, Math.ceil(n * 0.6)) ? tables.last : tables.mid;
    let r = rand() * t.reduce((s, x) => s + x[1], 0);
    for (const [id, w] of t) { if ((r -= w) < 0) return id; }
    return t[0][0];
  }

  // ═══ Simulation (tourne sur la télé) ═══
  let sim = null;
  const send = (type, payload) => UI.emit('screenEvent', { type, payload });

  function startSim(S, g, canvas) {
    stopSim();
    const T = buildTrack(g.track.id);
    T.laps = g.track.laps || T.laps;   // le serveur fait foi
    const rand = rng(g.seed || 1);
    const ids = g.players.slice().sort(() => rand() - 0.5);
    const karts = ids.map((id, i) => {
      const row = Math.floor(i / 2), col = i % 2 ? 1 : -1;
      const back = 26 + row * 38 + (col > 0 ? 14 : 0);
      const idx = (T.N - Math.round(back / SP)) % T.N, q = T.pts[idx];
      return {
        id, color: colorOf(id), x: q.x + q.nx * col * T.half * 0.45, y: q.y + q.ny * col * T.half * 0.45, ang: q.ang,
        vx: 0, vy: 0, idx, progress: -back, lapsDone: 0, lapStart: 0, bestLap: 0, done: false, finishMs: 0,
        drift: null, boostT: 0, boostMax: 0, spinT: 0, inv: 0, stallT: 0, slip: 0, off: 0, rescueT: 0,
        item: null, roll: 0, rollItem: null, prevA: false, prevB: false, gasAt: null, startDone: false, sparkLvl: 0, label: null,
      };
    });
    sim = {
      key: `${g.round}|${g.startedAt}`, canvas, ctx: canvas.getContext('2d'), T, karts, rand,
      soaps: [], corks: [], waves: [], gulls: [], puddles: [], parts: [], banners: [], hits: {},
      bg: null, t0: performance.now(), last: performance.now(), acc: 0, count: 4, raf: 0,
      firstFinish: 0, ended: false, bestLap: null, finalLapShown: false, order: ids.slice(),
    };
    resize();
    sim.raf = requestAnimationFrame(loop);
  }
  window.__bolidesSim = () => sim; // aide au débogage
  function stopSim() { if (sim) cancelAnimationFrame(sim.raf); sim = null; }
  function resize() {
    if (!sim) return;
    const cv = sim.canvas, dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth || 800;
    cv.width = Math.round(w * dpr); cv.height = Math.round((w * H / W) * dpr);
    sim.scale = cv.width / W;
    sim.bg = drawBackground(sim.T, sim.scale);
  }
  window.addEventListener('resize', resize);

  const banner = (text, color = '#ffc23d', dur = 1.6, big = false) => sim.banners.push({ text, color, life: dur, max: dur, big });
  const label = (k, text, color = '#fff') => { k.label = { text, color, life: 1.4 }; };
  function boost(k, s) { if (k.boostT < s) { k.boostT = s; k.boostMax = s; } SFX.boost(); }
  function spin(k, by) {
    if (k.inv > 0 || k.done || k.spinT > 0) return false;
    k.spinT = 0.95; k.inv = 2.2; k.drift = null; k.boostT = 0; k.sparkLvl = 0;
    SFX.spin(); send('spin', { pid: k.id, by: by || null });
    for (let q = 0; q < 10; q++) sim.parts.push({ x: k.x, y: k.y, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260, life: 0.6, max: 0.6, color: '#ffc23d', r: 4, kind: 'star' });
    return true;
  }
  const rankOf = (k) => sim.order.indexOf(k.id);

  function useItem(k) {
    const it = k.item; if (!it) return;
    const fx = Math.cos(k.ang), fy = Math.sin(k.ang);
    SFX.use();
    if (it.id === 'piment' || it.id === 'triple') { boost(k, it.id === 'triple' ? 0.9 : 1.5); label(k, '🌶️ Turbo !', '#ff7a1a'); }
    else if (it.id === 'savon') sim.soaps.push({ x: k.x - fx * 30, y: k.y - fy * 30, owner: k.id, born: sim.now, life: 45 });
    else if (it.id === 'bouchon') { const sp = 520 + Math.max(0, k.vx * fx + k.vy * fy); sim.corks.push({ x: k.x + fx * 22, y: k.y + fy * 22, vx: fx * sp, vy: fy * sp, owner: k.id, life: 1.8, born: sim.now }); SFX.pop(); }
    else if (it.id === 'klaxon') {
      SFX.honk(); sim.waves.push({ x: k.x, y: k.y, r: 10, life: 0.45 });
      for (const o of sim.karts) if (o !== k && Math.hypot(o.x - k.x, o.y - k.y) < 150) spin(o, k.id);
      sim.soaps = sim.soaps.filter((s) => Math.hypot(s.x - k.x, s.y - k.y) > 150);
      sim.corks = sim.corks.filter((s) => s.owner === k.id || Math.hypot(s.x - k.x, s.y - k.y) > 150);
    } else if (it.id === 'mouette') {
      const target = sim.order.map((id) => sim.karts.find((o) => o.id === id)).find((o) => o && o !== k && !o.done);
      if (target) { sim.gulls.push({ x: k.x, y: k.y - 30, target: target.id, owner: k.id, life: 6 }); SFX.squawk(); banner(`🐦 Une mouette fonce sur ${P(target.id)?.name || '?'} !`, '#9fdcff', 1.8); }
    }
    if (it.id === 'triple' && it.left > 1) k.item = { id: 'triple', left: it.left - 1 };
    else k.item = null;
    send('item', { pid: k.id, item: k.item?.id || null, left: k.item?.left || 0, used: true });
  }

  function step(dt, t) {
    const T = sim.T, now = sim.now;
    const nK = sim.karts.length;
    for (const k of sim.karts) {
      const inp = k.done ? {} : inputs[k.id] || {};
      const a = !!inp.a, b = !!inp.b;
      // ── départ : on maintient A pendant le compte à rebours pour faire chauffer le moteur
      if (t < 0) {
        if (a && k.gasAt == null) k.gasAt = t;
        if (!a) k.gasAt = null;
        k.prevA = a; k.prevB = b;
        continue;
      }
      if (!k.startDone) {
        k.startDone = true;
        if (k.gasAt != null && k.gasAt > -0.75) { boost(k, 1.1); label(k, 'Démarrage canon ! 🚀', '#ffc23d'); }
        else if (k.gasAt != null && k.gasAt < -1.7) { k.stallT = 0.9; SFX.stall(); label(k, 'Calé ! 💨', '#ccc'); }
      }
      k.inv = Math.max(0, k.inv - dt); k.boostT = Math.max(0, k.boostT - dt); k.stallT = Math.max(0, k.stallT - dt);
      if (k.label) { k.label.life -= dt; if (k.label.life <= 0) k.label = null; }
      // ── où en est-on sur la piste ?
      const [idx, dOff] = nearest(T, k.x, k.y, k.idx);
      let dI = idx - k.idx; if (dI > T.N / 2) dI -= T.N; if (dI < -T.N / 2) dI += T.N;
      k.idx = idx; k.progress += dI * SP;
      const onGrass = dOff > T.half + 4;
      const puddle = sim.puddles.some((p) => Math.hypot(p.x - k.x, p.y - k.y) < p.r);
      // trop loin de la piste (raccourci, sortie de route) : une mouette te repose sur la piste
      k.off = dOff > T.half + 70 ? k.off + dt : 0;
      if (k.off > 0.9 && !k.rescueT) { k.rescueT = 1.1; SFX.squawk(); }
      // circuit du port : hors du quai, c'est le plongeon
      if (T.def.water && dOff > T.half + 30 && !k.rescueT) {
        k.rescueT = 1.3; k.drift = null; k.boostT = 0; SFX.splash(); label(k, 'Plouf ! 💦', '#9fdcff');
        for (let q = 0; q < 14; q++) sim.parts.push({ x: k.x, y: k.y, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260, life: 0.7, max: 0.7, color: '#e0f6ff', r: 5, kind: 'dot' });
      }
      if (k.rescueT) {
        k.rescueT -= dt;
        if (k.rescueT <= 0.45 && !k.rescued) {
          const q = T.pts[k.idx]; k.x = q.x; k.y = q.y; k.ang = q.ang; k.vx = 0; k.vy = 0; k.rescued = true; k.off = 0; k.drift = null;
        }
        if (k.rescueT <= 0) { k.rescueT = 0; k.rescued = false; k.inv = Math.max(k.inv, 1); }
        else { k.prevA = a; k.prevB = b; continue; }
      }
      // ── objets : ramassage (roulette) puis utilisation avec B
      if (k.roll > 0) {
        k.roll -= dt;
        if (k.roll <= 0) { k.item = { id: k.rollItem, left: k.rollItem === 'triple' ? 3 : 0 }; SFX.got(); send('item', { pid: k.id, item: k.item.id, left: k.item.left }); }
      }
      if (b && !k.prevB && k.item && k.roll <= 0 && k.spinT <= 0 && !k.done) useItem(k);
      // ── pilotage
      const fx = Math.cos(k.ang), fy = Math.sin(k.ang), rx = -fy, ry = fx;
      let vF = k.vx * fx + k.vy * fy, vL = k.vx * rx + k.vy * ry;
      let steer = Math.max(-1, Math.min(1, inp.x || 0));
      const brake = (inp.y || 0) > 0.7;
      if (k.done) { // arrivé : pilote automatique tranquille
        const q = T.pts[(k.idx + 14) % T.N];
        let da = Math.atan2(q.y - k.y, q.x - k.x) - k.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
        steer = Math.max(-1, Math.min(1, da * 2.5));
      }
      // coup de pouce discret aux derniers (+3 % par place derrière le premier, 12 % max)
      const r = rankOf(k);
      let maxS = 200 * (1 + Math.min(0.12, 0.03 * Math.max(0, r)));
      if (k.done) maxS = 120;
      if (onGrass) maxS = k.boostT > 0 ? 190 : T.def.sand ? 75 : 90;
      if (puddle) maxS *= 0.55;
      if (k.boostT > 0) maxS = Math.max(maxS, onGrass ? 190 : 330);
      if (k.spinT > 0) {
        k.spinT -= dt; k.ang += 14 * dt; vF *= Math.pow(0.9, dt * 60); vL *= Math.pow(0.9, dt * 60); steer = 0;
      } else if (k.stallT > 0) {
        vF *= 0.9;
      } else {
        // gaz automatique, frein / marche arrière en tirant le joystick vers le bas
        if (brake) vF = Math.max(-90, vF - 420 * dt);
        else if (vF < maxS) vF = Math.min(maxS, vF + (k.boostT > 0 ? 700 : 240) * dt);
        else vF = Math.max(maxS, vF - (onGrass ? 520 : 220) * dt);
        // ── drift : on maintient A en tournant (assez vite)
        if (a && !k.drift && Math.abs(steer) > 0.35 && vF > 140 && !onGrass) {
          k.drift = { dir: Math.sign(steer), charge: 0 }; k.hop = 0.12;
        }
        if (k.drift && (!a || vF < 90)) {
          const lvl = k.drift.charge >= 3 ? 3 : k.drift.charge >= 2 ? 2 : k.drift.charge >= 1 ? 1 : 0;
          if (a === false && lvl) { boost(k, [0, 0.6, 1.0, 1.5][lvl]); if (lvl === 3) label(k, 'Turbo violet ! 💜', '#c77dff'); }
          k.drift = null; k.sparkLvl = 0;
        }
        const turn = (s) => s * 2.7 * Math.min(1, Math.abs(vF) / 90) * (vF < 0 ? -1 : 1);
        if (k.drift) {
          const tight = (steer * k.drift.dir + 1) / 2;       // 0 = on contre-braque, 1 = on serre le virage
          k.ang += k.drift.dir * (1.25 + 1.9 * tight) * dt;
          if (!onGrass) k.drift.charge = Math.min(3.3, k.drift.charge + dt * (0.7 + 1.3 * tight));
          const lvl = k.drift.charge >= 3 ? 3 : k.drift.charge >= 2 ? 2 : k.drift.charge >= 1 ? 1 : 0;
          if (lvl > k.sparkLvl) { k.sparkLvl = lvl; SFX.spark(lvl); }
          vL += -k.drift.dir * 60 * dt;                        // ça glisse vers l'extérieur
        } else k.ang += turn(steer) * dt;
      }
      // adhérence : forte normalement, faible en drift, sur une fiente ou en tête-à-queue
      const grip = k.spinT > 0 ? 0.97 : k.drift ? 0.9 : puddle ? 0.95 : 0.8;
      vL *= Math.pow(grip, dt * 60);
      const nfx = Math.cos(k.ang), nfy = Math.sin(k.ang);
      k.vx = nfx * vF + -nfy * vL; k.vy = nfy * vF + nfx * vL;
      // ── aspiration : rester juste derrière quelqu'un fait gagner un petit turbo
      let drafting = false;
      if (vF > 150 && !k.done) for (const o of sim.karts) {
        if (o === k || o.done) continue;
        const dx = o.x - k.x, dy = o.y - k.y, d = Math.hypot(dx, dy);
        if (d > 25 && d < 125 && (dx * nfx + dy * nfy) / d > 0.95) { drafting = true; break; }
      }
      k.slipCd = Math.max(0, (k.slipCd || 0) - dt);
      if (k.slipCd > 0 || k.boostT > 0) drafting = false;
      k.slip = drafting ? k.slip + dt : Math.max(0, k.slip - dt * 2);
      if (k.slip > 1.4) { k.slip = 0; k.slipCd = 5; boost(k, 0.7); label(k, 'Aspiration ! 💨', '#9fdcff'); }
      k.drafting = drafting;
      k.x += k.vx * dt; k.y += k.vy * dt;
      // bords de l'écran : on rebondit
      if (k.x < 14 || k.x > W - 14) { k.x = Math.max(14, Math.min(W - 14, k.x)); k.vx *= -0.4; }
      if (k.y < 14 || k.y > H - 14) { k.y = Math.max(14, Math.min(H - 14, k.y)); k.vy *= -0.4; }
      // plaques turbo et caisses à objets
      if (!k.done) {
        for (const p of T.pads) if (Math.hypot(p.x - k.x, p.y - k.y) < 30 && k.boostT < 0.5) { boost(k, 0.9); }
        for (const bx of T.boxes) {
          if (bx.cd > 0 || Math.hypot(bx.x - k.x, bx.y - k.y) > 24) continue;
          bx.cd = 4;
          for (let q = 0; q < 8; q++) sim.parts.push({ x: bx.x, y: bx.y, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.5) * 220, life: 0.5, max: 0.5, color: ['#ff6fa3', '#ffc23d', '#4fc3ff', '#3fbf8f'][q % 4], r: 4, kind: 'sq' });
          if (!k.item && k.roll <= 0) { k.roll = 1.1; k.rollItem = drawItem(r, nK, sim.rand); SFX.pick(); }
        }
      }
      // ── tours
      const laps = Math.floor(k.progress / T.L);
      if (!k.done && laps > k.lapsDone) {
        k.lapsDone = laps;
        const lt = now - k.lapStart; k.lapStart = now;
        if (lt > 3 && (!k.bestLap || lt < k.bestLap)) k.bestLap = lt;
        if (lt > 3 && (!sim.bestLap || lt < sim.bestLap.s)) sim.bestLap = { pid: k.id, s: lt };
        if (laps >= T.laps) {
          k.done = true; k.finishMs = Math.round(now * 1000); k.drift = null; k.item = null;
          const place = sim.karts.filter((o) => o.done).length;
          if (place === 1) sim.firstFinish = now;
          banner(`🏁 ${P(k.id)?.name || '?'} : ${place === 1 ? '1er' : place + 'ᵉ'} !`, place === 1 ? '#ffc23d' : '#fff', 2.2, place === 1);
          SFX.win();
          send('finish', { pid: k.id, ms: k.finishMs, best: sim.bestLap ? { pid: sim.bestLap.pid, ms: Math.round(sim.bestLap.s * 1000) } : null });
        } else {
          SFX.lap();
          send('lap', { pid: k.id, lap: laps + 1 });
          if (laps + 1 === T.laps && !sim.finalLapShown) { sim.finalLapShown = true; banner('Dernier tour !', '#ff6fa3', 2, true); SFX.final(); }
        }
      }
      // ── particules : étincelles de drift, flammes de turbo, poussière
      if (k.drift && k.drift.charge >= 1) {
        const col = ['', '#4fc3ff', '#ff9f1a', '#c77dff'][k.sparkLvl];
        for (const s of [-1, 1]) sim.parts.push({ x: k.x - nfx * 14 + -nfy * s * 8, y: k.y - nfy * 14 + nfx * s * 8, vx: -nfx * 60 + (Math.random() - 0.5) * 120, vy: -nfy * 60 + (Math.random() - 0.5) * 120, life: 0.25, max: 0.25, color: col, r: 3, kind: 'dot' });
      }
      if (k.boostT > 0) sim.parts.push({ x: k.x - nfx * 18, y: k.y - nfy * 18, vx: -nfx * 120 + (Math.random() - 0.5) * 50, vy: -nfy * 120 + (Math.random() - 0.5) * 50, life: 0.3, max: 0.3, color: Math.random() < 0.5 ? '#ffc23d' : '#ff5d2a', r: 5, kind: 'dot' });
      if (onGrass && Math.abs(vF) > 60 && Math.random() < 0.4) sim.parts.push({ x: k.x - nfx * 12, y: k.y - nfy * 12, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.5, max: 0.5, color: T.def.sand ? '#e8d49a' : T.def.water ? '#e0f6ff' : '#9a7b4f', r: 5, kind: 'dot' });
      if (k.drafting && Math.random() < 0.5) sim.parts.push({ x: k.x + (Math.random() - 0.5) * 20, y: k.y + (Math.random() - 0.5) * 20, vx: -nfx * 200, vy: -nfy * 200, life: 0.2, max: 0.2, color: '#fff', r: 2, kind: 'line', ang: k.ang });
      k.hop = Math.max(0, (k.hop || 0) - dt);
      k.prevA = a; k.prevB = b;
    }
    if (t < 0) return;
    // ── chocs entre bolides (ceux qui sont arrivés passent au travers)
    const ks = sim.karts.filter((k) => !k.done && !k.rescueT);
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
      const a = ks[i], b = ks[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d >= 26 || d === 0) continue;
      const nx = dx / d, ny = dy / d, ma = a.boostT > 0 ? 2.2 : 1, mb = b.boostT > 0 ? 2.2 : 1;
      const over = 26 - d;
      a.x -= nx * over * (mb / (ma + mb)); a.y -= ny * over * (mb / (ma + mb));
      b.x += nx * over * (ma / (ma + mb)); b.y += ny * over * (ma / (ma + mb));
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn >= 0) continue;
      const jimp = (-(1 + 0.6) * vn) / (1 / ma + 1 / mb);
      a.vx -= (jimp / ma) * nx; a.vy -= (jimp / ma) * ny; b.vx += (jimp / mb) * nx; b.vy += (jimp / mb) * ny;
      if (Math.abs(vn) > 70) {
        const key = [a.id, b.id].sort().join('|');
        if (!sim.hits[key] || now - sim.hits[key] > 0.5) { sim.hits[key] = now; SFX.bump(); send('bump', { a: a.id, b: b.id }); }
      }
    }
    // ── savons, bouchons, ondes, mouettes, fientes
    for (const s of sim.soaps) {
      s.life -= dt;
      for (const k of ks) if (Math.hypot(k.x - s.x, k.y - s.y) < 22 && !(k.id === s.owner && now - s.born < 1)) { if (spin(k, k.id === s.owner ? null : s.owner)) s.life = 0; }
    }
    sim.soaps = sim.soaps.filter((s) => s.life > 0);
    for (const c of sim.corks) {
      c.life -= dt; c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.x < 8 || c.x > W - 8) { c.vx *= -1; c.x = Math.max(8, Math.min(W - 8, c.x)); }
      if (c.y < 8 || c.y > H - 8) { c.vy *= -1; c.y = Math.max(8, Math.min(H - 8, c.y)); }
      for (const k of ks) if (Math.hypot(k.x - c.x, k.y - c.y) < 20 && !(k.id === c.owner && now - c.born < 0.4)) { spin(k, k.id === c.owner ? null : c.owner); c.life = 0; }
      for (const s of sim.soaps) if (c.life > 0 && Math.hypot(s.x - c.x, s.y - c.y) < 18) { s.life = 0; c.life = 0; }
    }
    sim.corks = sim.corks.filter((c) => c.life > 0);
    for (const w of sim.waves) { w.life -= dt; w.r += 420 * dt; }
    sim.waves = sim.waves.filter((w) => w.life > 0);
    for (const gl of sim.gulls) {
      gl.life -= dt;
      const tk = sim.karts.find((k) => k.id === gl.target);
      if (!tk || tk.done) { gl.life = 0; continue; }
      const dx = tk.x - gl.x, dy = tk.y - 30 - gl.y, d = Math.hypot(dx, dy);
      const sp = 520;
      if (d < 14) {
        spin(tk, gl.owner); sim.puddles.push({ x: tk.x, y: tk.y, r: 34, life: 7, seed: Math.random() * 10 }); SFX.squawk(); gl.life = 0;
      } else { gl.x += (dx / d) * sp * dt; gl.y += (dy / d) * sp * dt; gl.flip = dx < 0; }
    }
    sim.gulls = sim.gulls.filter((g) => g.life > 0);
    for (const p of sim.puddles) p.life -= dt;
    sim.puddles = sim.puddles.filter((p) => p.life > 0);
    for (const bx of T.boxes) bx.cd = Math.max(0, bx.cd - dt);
    for (const q of sim.parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    sim.parts = sim.parts.filter((q) => q.life > 0);
    if (sim.parts.length > 700) sim.parts.splice(0, sim.parts.length - 700);
    for (const bn of sim.banners) bn.life -= dt;
    sim.banners = sim.banners.filter((b) => b.life > 0);
    // ── classement en direct
    sim.order = sim.karts.slice().sort((a, b) => (a.done && b.done ? a.finishMs - b.finishMs : a.done ? -1 : b.done ? 1 : b.progress - a.progress)).map((k) => k.id);
    // ── fin de course : 20 s après le premier arrivé, ou au bout de 4 min
    if (!sim.ended && ((sim.firstFinish && now - sim.firstFinish > 20) || now > 240)) {
      sim.ended = true;
      send('raceEnd', { order: sim.order, best: sim.bestLap ? { pid: sim.bestLap.pid, ms: Math.round(sim.bestLap.s * 1000) } : null });
    }
  }

  // ═══ Rendu ═══
  function drawKart(c, k) {
    const blink = k.inv > 0 && k.spinT <= 0 && Math.floor(sim.now * 12) % 2 === 0;
    if (k.rescueT > 0.45) { // emporté par la mouette (ou repêché)
      c.save(); c.globalAlpha = 0.85; c.translate(k.x, k.y - (1.1 - k.rescueT) * 60);
      c.font = '28px system-ui'; c.textAlign = 'center'; c.fillText('🐦', 0, -20); c.restore();
    }
    c.save();
    c.translate(k.x, k.y - (k.hop > 0 ? Math.sin((k.hop / 0.12) * Math.PI) * 6 : 0));
    if (k.done) c.globalAlpha = 0.55;
    if (blink) c.globalAlpha = 0.35;
    // ombre
    c.fillStyle = 'rgba(26,15,46,.25)'; c.beginPath(); c.ellipse(2, 6, 20, 13, k.ang, 0, Math.PI * 2); c.fill();
    c.save();
    c.rotate(k.ang + (k.drift ? k.drift.dir * 0.28 : 0));
    // roues
    c.fillStyle = INK;
    for (const [wx, wy] of [[-11, -11], [-11, 11], [10, -11], [10, 11]]) roundRect(c, wx - 5, wy - 3.5, 10, 7, 2), c.fill();
    // carrosserie
    c.fillStyle = k.color; c.strokeStyle = INK; c.lineWidth = 3;
    roundRect(c, -17, -10, 34, 20, 7); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.45)'; roundRect(c, 6, -6, 9, 12, 3); c.fill();          // capot
    c.fillStyle = INK; roundRect(c, -21, -9, 5, 18, 2); c.fill();                            // aileron
    c.restore();
    // tête du pilote (toujours droite)
    const img = faceImg(k.id);
    c.beginPath(); c.arc(0, -2, 12, 0, Math.PI * 2); c.fillStyle = k.color; c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
    if (img.complete) c.drawImage(img, -12, -14, 24, 24);
    // jauge de drift
    if (k.drift) {
      const ch = k.drift.charge, col = ['#fff', '#4fc3ff', '#ff9f1a', '#c77dff'][k.sparkLvl];
      c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.arc(0, -2, 17, -Math.PI / 2, -Math.PI / 2 + Math.min(1, ch / 3) * Math.PI * 2); c.stroke();
    }
    // objet en main ou roulette
    if (k.roll > 0 || k.item) {
      const em = k.roll > 0 ? Object.values(ITEM)[Math.floor(sim.now * 14) % 6].emoji : ITEM[k.item.id].emoji;
      c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 2.5; roundRect(c, 12, -34, 24, 24, 6); c.fill(); c.stroke();
      c.font = '16px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(em, 24, -21);
      if (k.item?.id === 'triple') { c.font = '700 10px Fredoka, system-ui'; c.fillStyle = INK; c.fillText(`×${k.item.left}`, 38, -12); }
      c.textBaseline = 'alphabetic';
    }
    // pseudo
    c.globalAlpha = k.done ? 0.55 : 1;
    c.font = '700 13px Fredoka, system-ui'; c.textAlign = 'center';
    const nm = P(k.id)?.name || '?';
    c.lineWidth = 3.5; c.strokeStyle = INK; c.strokeText(nm, 0, 30); c.fillStyle = '#fff'; c.fillText(nm, 0, 30);
    if (k.label) {
      c.globalAlpha = Math.min(1, k.label.life / 0.4);
      c.font = '400 18px "Bagel Fat One", system-ui';
      const y = -40 - (1.4 - k.label.life) * 16;
      c.lineWidth = 5; c.strokeText(k.label.text, 0, y); c.fillStyle = k.label.color; c.fillText(k.label.text, 0, y);
    }
    c.restore();
  }

  function render(t) {
    const c = sim.ctx, T = sim.T, now = sim.now;
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (sim.bg) c.drawImage(sim.bg, 0, 0);
    c.setTransform(sim.scale, 0, 0, sim.scale, 0, 0);
    // plaques turbo qui brillent
    for (const p of T.pads) { c.save(); c.globalAlpha = 0.25 + 0.25 * Math.sin(now * 8); c.fillStyle = '#fff'; c.translate(p.x, p.y); c.rotate(p.ang); roundRect(c, -26, -17, 52, 34, 7); c.fill(); c.restore(); }
    // fientes
    for (const p of sim.puddles) {
      c.save(); c.globalAlpha = Math.min(1, p.life / 0.8); c.fillStyle = '#f6f2e4'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath();
      for (let k = 0; k <= 12; k++) { const a = (k / 12) * Math.PI * 2, rr = p.r * (0.75 + 0.25 * Math.sin(k * 2.7 + p.seed)); c.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 0.7); }
      c.closePath(); c.fill(); c.stroke(); c.restore();
    }
    // caisses à objets
    for (const bx of T.boxes) {
      if (bx.cd > 0) continue;
      c.save(); c.translate(bx.x, bx.y + Math.sin(now * 4 + bx.x) * 2); c.rotate(now * 1.5 + bx.y);
      c.fillStyle = `hsl(${(now * 120 + bx.x) % 360}, 90%, 65%)`; c.strokeStyle = INK; c.lineWidth = 3;
      roundRect(c, -12, -12, 24, 24, 5); c.fill(); c.stroke();
      c.rotate(-(now * 1.5 + bx.y)); c.fillStyle = INK; c.font = '400 16px "Bagel Fat One", system-ui'; c.textAlign = 'center'; c.fillText('?', 0, 6);
      c.restore();
    }
    // savons
    for (const s of sim.soaps) {
      c.save(); c.translate(s.x, s.y); c.fillStyle = '#ff8fb5'; c.strokeStyle = INK; c.lineWidth = 3;
      c.beginPath(); c.ellipse(0, 0, 14, 9, 0.4, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(8, -10, 4, 0, Math.PI * 2); c.arc(14, -16, 2.5, 0, Math.PI * 2); c.fill(); c.restore();
    }
    for (const q of sim.parts) {
      c.globalAlpha = Math.max(0, q.life / q.max); c.fillStyle = q.color; c.strokeStyle = q.color;
      if (q.kind === 'line') { c.lineWidth = 2; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - Math.cos(q.ang) * 18, q.y - Math.sin(q.ang) * 18); c.stroke(); }
      else if (q.kind === 'sq') c.fillRect(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2);
      else if (q.kind === 'star') star(c, q.x, q.y, 6);
      else { c.beginPath(); c.arc(q.x, q.y, q.r * (0.5 + q.life / q.max / 2), 0, Math.PI * 2); c.fill(); }
    }
    c.globalAlpha = 1;
    const order = sim.karts.slice().sort((a, b) => a.y - b.y);
    for (const k of order) drawKart(c, k);
    // bouchons
    for (const cr of sim.corks) {
      c.save(); c.translate(cr.x, cr.y); c.rotate(Math.atan2(cr.vy, cr.vx)); c.fillStyle = '#c98d4a'; c.strokeStyle = INK; c.lineWidth = 2.5;
      roundRect(c, -9, -6, 18, 12, 4); c.fill(); c.stroke(); c.restore();
    }
    for (const w of sim.waves) { c.save(); c.globalAlpha = w.life / 0.45; c.strokeStyle = '#ffc23d'; c.lineWidth = 6; c.beginPath(); c.arc(w.x, w.y, w.r, 0, Math.PI * 2); c.stroke(); c.restore(); }
    for (const gl of sim.gulls) { c.save(); c.translate(gl.x, gl.y); if (gl.flip) c.scale(-1, 1); c.font = '30px system-ui'; c.textAlign = 'center'; c.fillText('🐦', 0, 10); c.restore(); }
    drawHud(c, t);
  }
  function star(c, x, y, r) { c.beginPath(); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }

  function drawHud(c, t) {
    const T = sim.T;
    // classement à gauche
    const rows = sim.order.map((id) => sim.karts.find((k) => k.id === id)).filter(Boolean);
    c.save();
    c.fillStyle = 'rgba(26,15,46,.72)'; roundRect(c, 10, 10, 190, 14 + rows.length * 26, 12); c.fill();
    rows.forEach((k, i) => {
      const y = 30 + i * 26;
      c.font = '400 17px "Bagel Fat One", system-ui'; c.textAlign = 'left'; c.fillStyle = i === 0 ? '#ffc23d' : '#fff'; c.fillText(String(i + 1), 20, y + 5);
      c.beginPath(); c.arc(50, y, 10, 0, Math.PI * 2); c.fillStyle = k.color; c.fill();
      const img = faceImg(k.id); if (img.complete) c.drawImage(img, 40, y - 10, 20, 20);
      c.font = '700 14px Fredoka, system-ui'; c.fillStyle = '#fff';
      const nm = (P(k.id)?.name || '?').slice(0, 11);
      c.fillText(nm, 66, y + 5);
      c.textAlign = 'right'; c.fillStyle = k.done ? '#3fbf8f' : '#ffd27a';
      c.fillText(k.done ? '🏁' : `${Math.min(T.laps, k.lapsDone + 1)}/${T.laps}`, 192, y + 5);
    });
    c.restore();
    // chrono à droite
    c.font = '400 28px "Bagel Fat One", system-ui'; c.textAlign = 'right'; c.lineWidth = 5; c.strokeStyle = INK; c.fillStyle = '#fff';
    if (t > 0) { const m = Math.floor(t / 60), s = (t % 60).toFixed(1).padStart(4, '0'); const txt = `${m}:${s}`; c.strokeText(txt, W - 20, 42); c.fillText(txt, W - 20, 42); }
    if (sim.firstFinish && !sim.ended) { const left = Math.max(0, 20 - (sim.now - sim.firstFinish)); const txt = `Fin dans ${Math.ceil(left)} s`; c.font = '400 20px "Bagel Fat One", system-ui'; c.strokeText(txt, W - 20, 72); c.fillStyle = '#ff6fa3'; c.fillText(txt, W - 20, 72); }
    // feux de départ
    if (t < 0.8) {
      const n = Math.ceil(-t);
      c.save(); c.translate(W / 2, 110);
      c.fillStyle = INK; roundRect(c, -110, -38, 220, 76, 20); c.fill();
      for (let i = 0; i < 3; i++) {
        const on = t >= 0 ? 'go' : 3 - n >= i ? 'red' : '';
        c.beginPath(); c.arc(-66 + i * 66, 0, 24, 0, Math.PI * 2);
        c.fillStyle = on === 'go' ? '#3fbf8f' : on === 'red' ? '#ff4d4d' : '#3b3450'; c.fill();
      }
      c.restore();
      if (t < 0) {
        c.font = '400 22px "Bagel Fat One", system-ui'; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = INK; c.fillStyle = '#fff';
        const tip = 'Maintiens A juste avant le départ… mais pas trop tôt !';
        c.strokeText(tip, W / 2, 180); c.fillText(tip, W / 2, 180);
      } else {
        c.font = '400 90px "Bagel Fat One", system-ui'; c.textAlign = 'center'; c.lineWidth = 12; c.strokeStyle = INK; c.strokeText('PARTEZ !', W / 2, H / 2 + 30); c.fillStyle = '#3fbf8f'; c.fillText('PARTEZ !', W / 2, H / 2 + 30);
      }
    }
    // bandeaux
    sim.banners.forEach((bn, i) => {
      const k = 1 + Math.max(0, bn.life - bn.max + 0.25) * 2;
      c.save(); c.translate(W / 2, (bn.big ? H / 2 : H - 70) - i * 46); c.scale(k, k); c.globalAlpha = Math.min(1, bn.life / 0.3);
      c.font = `400 ${bn.big ? 64 : 34}px "Bagel Fat One", system-ui`; c.textAlign = 'center'; c.lineWidth = bn.big ? 11 : 7; c.strokeStyle = INK;
      c.strokeText(bn.text, 0, 0); c.fillStyle = bn.color; c.fillText(bn.text, 0, 0); c.restore();
    });
  }

  function loop(ts) {
    if (!sim || !document.body.contains(sim.canvas)) { sim = null; return; }
    const t = (ts - sim.t0) / 1000 - 4;     // 4 s : feux de départ
    const n = Math.ceil(-t);
    if (n !== sim.count && n >= 0 && n <= 3) { sim.count = n; if (n > 0) SFX.beep(); else SFX.go(); }
    sim.acc += Math.min(0.1, (ts - sim.last) / 1000);
    sim.last = ts;
    const DT = 1 / 60;
    while (sim.acc >= DT) { sim.now = Math.max(0, t); step(DT, t); sim.acc -= DT; }
    render(t);
    sim.raf = requestAnimationFrame(loop);
  }

  // ═══ Joueur clavier ═══
  const KB_HELP = '<b>←</b> <b>→</b> : volant · <b>↓</b> : frein · <b>Espace</b> : A (drift) · <b>Maj</b> : B (objet)';
  const keyboard = MANETTE.keyboard(KB_HELP);

  // ═══ Écrans ═══
  const RULES = `
    <div class="rg-rules">
      <div><span class="rg-ico">🕹️</span><b>Volant</b><small>ça accélère tout seul · vers le bas : frein</small></div>
      <div><span class="rg-ico rg-a">A</span><b>Drift</b><small>maintiens en tournant : 🔵 → 🟠 → 🟣, relâche = turbo</small></div>
      <div><span class="rg-ico rg-b">B</span><b>Objet</b><small>ramasse les caisses <b>?</b></small></div>
      <div><span class="rg-ico">🚦</span><b>Départ canon</b><small>A juste avant le vert… trop tôt et tu cales</small></div>
    </div>`;

  const itemTxt = (it) => (it ? `${ITEM[it.id]?.emoji || ''}${it.id === 'triple' ? `×${it.left}` : ''}` : '—');
  const statusLabel = (g) => g.me === 'done' ? `🏁 Arrivé${g.myPlace ? ` ${g.myPlace === 1 ? '1er' : g.myPlace + 'ᵉ'}` : ''} !`
    : g.me === 'race' ? `🏎️ Tour ${g.myLap}/${g.track.laps}` : '⏳ Prochaine course';

  const screens = {
    intro(S, g) {
      if (S.spectator) {
        return `<div class="rg-title"><span class="rg-art" style="background:#ff5d5d">${ICONS.game('bolides')}</span><div><h1>Les Bolides</h1><p class="white">${g.totalRounds} courses. Drifte, booste, sème la pagaille !</p></div></div>
          ${RULES}
          <div class="card"><div class="players figs">${g.participants.filter(P).map((id) => `<div class="pfig" style="--c:${colorOf(id)}">${av(P(id), 'xl')}<span class="pn">${name(id)}</span></div>`).join('')}</div></div>
          <p class="center white tv-big">${name(S.hostId)} lance la course depuis son téléphone 📱</p>`;
      }
      return `<div class="phase"><div class="step">${g.totalRounds} courses</div><div class="t">Les Bolides 🏎️</div></div>
        <div class="card center keep"><p style="margin-top:0"><b>📱 Ton téléphone devient une manette.</b><br>Tourne-le en <b>paysage</b> et regarde la télé !</p>${RULES}
        <p class="muted" style="margin-bottom:0">Objets : 🌶️ turbo · 🧼 savon à poser · 🍾 bouchon tout droit · 📯 klaxon qui fait déraper autour · 🐦 mouette sur le premier</p></div>
        ${UI.hostButton('Moteurs ! 🏎️')}`;
    },

    play(S, g) {
      if (S.spectator) {
        return `<div class="rg-stage">
            <div class="rg-hud"><span class="rg-round">Course ${g.round}/${g.totalRounds} · ${esc(g.track.name)} · ${g.track.laps} tours</span></div>
            <canvas class="rg-canvas"></canvas>
            ${kbName() ? `<div class="rg-kbhelp">⌨️ ${esc(kbName())} : ${KB_HELP}</div>` : ''}
            <button class="rg-sound" data-sound>🔊</button>
          </div>`;
      }
      const me = P(S.you);
      return `<div class="pad bl ${g.me === 'race' ? 'alive' : g.me === 'done' ? 'out' : 'wait'}" style="--pc:${colorOf(S.you)}">
          <div class="pad-top">${av(me, 'sm')}<b>${esc(me?.name || '')}</b><span class="pad-status" data-live="status"></span><button class="pad-fs" data-fs aria-label="Plein écran">⛶</button></div>
          <div class="pad-left"><div class="pad-base"><div class="pad-knob"></div></div><span class="pad-hint">Volant : glisse ton pouce<br><small>vers le bas = frein</small></span></div>
          <div class="pad-right">
            <button class="pad-btn pad-b" data-btn="b">B<small data-live="item"></small></button>
            <button class="pad-btn pad-a" data-btn="a">A<small>Drift</small></button>
          </div>
          <div class="pad-rotate">📱↔️<br>Tourne ton téléphone</div>
        </div>
        ${UI.isHost() ? '<div class="pad-host"><a class="link" data-host-action="next">Arrêter la course</a></div>' : ''}`;
    },

    roundEnd(S, g) {
      const r = g.result;
      const last = g.round >= g.totalRounds;
      const fmt = (ms) => `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(2).padStart(5, '0')}`;
      const win = r.finished[0];
      return `${UI.header(g.round + 1, g.totalRounds + 1, `Course ${g.round} sur ${g.totalRounds} · ${esc(g.track.name)}`, win ? `${name(win)} remporte la course ! 🏁` : 'Personne n\'a franchi la ligne ! 😅')}
        <div class="card"><h2>Arrivée</h2>
          ${r.ranking.filter(P).map((id, i) => `<div class="score"><b>${i + 1}</b>${av(P(id))}<span class="n">${name(id)} <small class="muted">· ${r.times[id] ? fmt(r.times[id]) : 'pas arrivé'}${r.best?.pid === id ? ' · ⏱️ meilleur tour' : ''}</small></span>${r.gains[id] ? `<span class="plus">+${r.gains[id].total}</span>` : ''}</div>`).join('')}</div>
        <div class="card"><h2>Total</h2>${UI.scoreboard(g.scores)}</div>
        ${UI.hostButton(last ? 'Voir le podium 🏆' : 'Course suivante 🏎️')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  let wonFor = 0;
  UI.registerGame('bolides', {
    keyboard,
    rules: () => `
      <ol class="rules">
        <li>La course s'affiche sur la <b>télé</b>. Ton <b>téléphone est ta manette</b> (tourne-le en paysage). Ça accélère tout seul : tu n'as qu'à <b>tourner</b>.</li>
        <li><b>Drift</b> : maintiens <b>A</b> en tournant. Les étincelles passent du 🔵 au 🟠 puis au 🟣 ; relâche pour un <b>turbo</b> (plus il est chargé, plus il dure). Serre le virage pour charger plus vite.</li>
        <li><b>Départ canon</b> : appuie sur A pendant le dernier feu rouge. Trop tôt, tu cales !</li>
        <li>Les caisses <b>?</b> donnent un objet (<b>B</b> pour l'utiliser) : 🌶️ turbo, 🧼 savon à poser derrière toi, 🍾 bouchon tiré tout droit, 📯 klaxon qui fait déraper ceux autour, 🐦 mouette qui va bombarder le premier.</li>
        <li>Les plaques jaunes donnent un turbo. Reste dans le sillage de quelqu'un pour profiter de l'<b>aspiration</b>. Couper trop loin dans l'herbe ? Une mouette te repose sur la piste.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">4 circuits (3 ou 4 tours) · points : 10, 7, 5, 3, 2, 1 · meilleur tour : <b>+2</b> · les derniers vont un tout petit peu plus vite</div>`,

    key: (S, g) => [g.phase, g.round, S.spectator ? '' : g.me].join('|'),
    screen: (S, g) => (screens[g.phase] || screens.intro)(S, g),
    tv: (S, g) => (screens[g.phase] || screens.intro)(S, g),

    onState: (S, g) => {
      if (g.phase !== 'play') { stopSim(); stopPad(); }
      if (g.phase === 'roundEnd' && S.spectator && wonFor !== g.round) { wonFor = g.round; SFX.win(); }
    },

    live: {
      status: (S, g) => statusLabel(g),
      item: (S, g) => (g.me === 'race' ? itemTxt(g.myItem) : '—'),
    },

    bind: (S, g, root) => {
      if (S.spectator) kbResume();
      if (g.phase === 'play' && S.spectator) {
        const cv = root.querySelector('.rg-canvas');
        if (cv && (!sim || sim.key !== `${g.round}|${g.startedAt}` || sim.canvas !== cv)) startSim(S, g, cv);
        root.querySelector('[data-sound]')?.addEventListener('click', () => { audio(); SFX.beep(); });
      }
      if (g.phase === 'play' && !S.spectator) startPad(root);
    },
  });
})();
