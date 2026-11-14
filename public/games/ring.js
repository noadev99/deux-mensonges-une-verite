// 🧼 Le ring savonneux — la TÉLÉ fait tourner le jeu, les TÉLÉPHONES sont des manettes.
// Télé : boucle requestAnimationFrame, physique sur la glace, collisions, mouettes, sons.
// Téléphone : joystick + boutons A/B, envoyés seulement quand ils changent (≈ 25/s max).
(() => {
  const { esc, P, av, name } = UI;

  // ═══ Sons générés en Web Audio (aucun fichier) ═══
  let actx = null;
  const audio = () => {
    if (!actx) { const C = window.AudioContext || window.webkitAudioContext; if (C) actx = new C(); }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  };
  document.addEventListener('pointerdown', () => { if (document.body.classList.contains('tv')) audio(); });
  function tone(freq, dur, type = 'square', vol = 0.12, slide = 0, delay = 0) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.25, freq = 800, slide = 0) {
    const a = audio(); if (!a) return;
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = 'lowpass'; f.frequency.setValueAtTime(freq, a.currentTime);
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq + slide), a.currentTime + dur);
    g.gain.value = vol;
    src.connect(f).connect(g).connect(a.destination); src.start();
  }
  const SFX = {
    beep: () => tone(660, 0.16, 'square', 0.1),
    go: () => { tone(880, 0.12, 'square', 0.1); tone(1320, 0.35, 'square', 0.1, 0, 0.12); },
    bump: () => { noise(0.12, 0.35, 700); tone(160, 0.12, 'sine', 0.2, -60); },
    dash: () => tone(240, 0.2, 'sawtooth', 0.06, 320),
    splash: () => { noise(0.6, 0.4, 1800, -1500); tone(500, 0.3, 'sine', 0.08, -350); },
    squawk: () => { tone(1100, 0.08, 'square', 0.05, -400); tone(900, 0.1, 'square', 0.05, -300, 0.09); },
    splat: () => noise(0.18, 0.3, 350),
    anchor: () => tone(110, 0.25, 'triangle', 0.15, -40),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'square', 0.08, 0, i * 0.12)),
  };

  // ═══ Messages temps réel ═══
  const inputs = {};                                  // télé : dernière commande de chaque joueur
  UI.on('ctl', (m) => { inputs[m.p] = m; });
  UI.on('buzz', (pattern) => navigator.vibrate?.(pattern));

  // ═══ Arènes (monde : 1000 × 640, centre 500 × 320) ═══
  const W = 1000, H = 640, CX = 500, CY = 320;
  const dist = (x, y, a, b) => Math.hypot(x - a, y - b);
  const ARENAS = {
    rond: {
      R: (t) => Math.max(95, 290 - 3.6 * t),
      inside(x, y, t) { return dist(x, y, CX, CY) < this.R(t); },
      draw(c, t) { iceCircle(c, CX, CY, this.R(t)); },
      spawn(i, n, rot, t) { const a = rot + (i / n) * Math.PI * 2; return [CX + Math.cos(a) * 130, CY + Math.sin(a) * 130]; },
    },
    trou: {
      S: (t) => Math.max(150, 275 - 2.6 * t),
      h: (t) => Math.min(115, 45 + 1.4 * t),
      inside(x, y, t) { const s = this.S(t); return Math.abs(x - CX) < s && Math.abs(y - CY) < s && dist(x, y, CX, CY) > this.h(t); },
      draw(c, t) { iceRect(c, CX, CY, this.S(t)); hole(c, CX, CY, this.h(t)); },
      spawn(i, n, rot, t) { const a = rot + (i / n) * Math.PI * 2; return [CX + Math.cos(a) * 165, CY + Math.sin(a) * 165]; },
    },
    tourne: {
      R: (t) => Math.max(110, 285 - 3 * t), w: 0.75,
      inside(x, y, t) { return dist(x, y, CX, CY) < this.R(t); },
      draw(c, t) { iceCircle(c, CX, CY, this.R(t)); spokes(c, CX, CY, this.R(t), t * this.w); },
      // le manège fait tourner et éjecte doucement vers l'extérieur
      force(p, t, dt) {
        const dx = p.x - CX, dy = p.y - CY;
        p.vx += (-dy * this.w * 0.6 + dx * 0.22) * dt; p.vy += (dx * this.w * 0.6 + dy * 0.22) * dt;
      },
      spawn(i, n, rot, t) { const a = rot + (i / n) * Math.PI * 2; return [CX + Math.cos(a) * 120, CY + Math.sin(a) * 120]; },
    },
    iles: {
      r: (t) => Math.max(85, 185 - 1.9 * t), bw: (t) => Math.max(0, 80 - 1.6 * t),
      inside(x, y, t) {
        const r = this.r(t), bw = this.bw(t);
        return dist(x, y, CX - 235, CY) < r || dist(x, y, CX + 235, CY) < r || (Math.abs(y - CY) < bw / 2 && Math.abs(x - CX) < 235);
      },
      draw(c, t) {
        const bw = this.bw(t);
        if (bw > 1) { c.save(); c.fillStyle = '#c98d4a'; c.strokeStyle = INK; c.lineWidth = 5; c.fillRect(CX - 235, CY - bw / 2, 470, bw); c.strokeRect(CX - 235, CY - bw / 2, 470, bw);
          c.strokeStyle = 'rgba(26,15,46,.35)'; c.lineWidth = 2; for (let x = CX - 220; x < CX + 235; x += 22) { c.beginPath(); c.moveTo(x, CY - bw / 2); c.lineTo(x, CY + bw / 2); c.stroke(); } c.restore(); }
        iceCircle(c, CX - 235, CY, this.r(t)); iceCircle(c, CX + 235, CY, this.r(t));
      },
      spawn(i, n, rot, t) { const side = i % 2 ? 1 : -1; const k = Math.floor(i / 2); const a = rot + k * 2.1; return [CX + side * 235 + Math.cos(a) * 55, CY + Math.sin(a) * 55]; },
    },
    finale: {
      R: (t) => Math.max(70, 250 - 4.5 * t), icy: true,
      inside(x, y, t) { return dist(x, y, CX, CY) < this.R(t); },
      draw(c, t) { iceCircle(c, CX, CY, this.R(t), true); },
      spawn(i, n, rot, t) { const a = rot + (i / n) * Math.PI * 2; return [CX + Math.cos(a) * 110, CY + Math.sin(a) * 110]; },
    },
  };

  // ═══ Dessin (style cartoon, contours encre épais) ═══
  const INK = '#1a0f2e';
  function iceCircle(c, x, y, R, shiny) {
    c.save();
    c.beginPath(); c.arc(x, y + 14, R, 0, Math.PI * 2); c.fillStyle = '#7fb6d9'; c.fill();             // épaisseur du bloc de glace
    const gr = c.createRadialGradient(x - R * 0.3, y - R * 0.35, R * 0.1, x, y, R);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, shiny ? '#bfe9ff' : '#d4f1ff');
    c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fillStyle = gr; c.fill();
    c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.arc(x, y, R * 0.78, Math.PI * 1.1, Math.PI * 1.35); c.stroke();
    c.beginPath(); c.arc(x, y, R * 0.6, Math.PI * 1.15, Math.PI * 1.25); c.stroke();
    c.restore();
  }
  function iceRect(c, x, y, s) {
    c.save();
    c.fillStyle = '#7fb6d9'; c.fillRect(x - s, y - s + 14, s * 2, s * 2);
    const gr = c.createLinearGradient(x - s, y - s, x + s, y + s); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#cdeeff');
    c.fillStyle = gr; c.fillRect(x - s, y - s, s * 2, s * 2);
    c.lineWidth = 6; c.strokeStyle = INK; c.strokeRect(x - s, y - s, s * 2, s * 2);
    c.restore();
  }
  function hole(c, x, y, h) {
    c.save(); c.beginPath(); c.arc(x, y, h, 0, Math.PI * 2);
    const gr = c.createRadialGradient(x, y, 0, x, y, h); gr.addColorStop(0, '#0e4a86'); gr.addColorStop(1, '#2aa7e0');
    c.fillStyle = gr; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.restore();
  }
  function spokes(c, x, y, R, ang) {
    c.save(); c.strokeStyle = 'rgba(79,195,255,.45)'; c.lineWidth = 10;
    for (let k = 0; k < 6; k++) { const a = ang + (k * Math.PI) / 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * R * 0.95, y + Math.sin(a) * R * 0.95); c.stroke(); }
    c.beginPath(); c.arc(x, y, 18, 0, Math.PI * 2); c.fillStyle = '#ffc23d'; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
    c.restore();
  }
  function water(c, t) {
    const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3ec1f3'); gr.addColorStop(1, '#1a6fb8');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 3; c.lineCap = 'round';
    for (let row = 0; row < 9; row++) {
      const y = 30 + row * 72;
      for (let k = 0; k < 7; k++) {
        const x = ((k * 170 + row * 60 + t * (row % 2 ? 22 : -18)) % 1170 + 1170) % 1170 - 85;
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 15, y - 9, x + 30, y); c.quadraticCurveTo(x + 45, y + 9, x + 60, y); c.stroke();
      }
    }
  }

  // tête dessinée du joueur (même bouille que partout ailleurs) → image pour le canvas
  const faces = {};
  function faceImg(id) {
    const p = P(id);
    const key = id + JSON.stringify(p?.look || p?.avatar);
    if (faces[id]?.key === key) return faces[id].img;
    const svg = (p?.look ? PERSO.head(p.look) : ICONS.avatar(p?.avatar || 0)).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    faces[id] = { key, img };
    return img;
  }
  const colorOf = (id) => { const p = P(id); return p?.look ? PERSO.color(p.look) : p?.color || '#fff'; };

  function drawPlayer(c, p, now) {
    const s = p.state === 'falling' ? Math.max(0, 1 - p.fallT / 0.7) : 1;
    if (s <= 0) return;
    const inflate = 1 + p.charge * 0.28;
    const shake = p.charge > 0.05 ? (Math.random() - 0.5) * 4 * p.charge : 0;
    const speed = Math.hypot(p.vx, p.vy);
    const stretch = p.dashT > 0 ? 1.18 : 1;
    const r = p.r * inflate * s;
    const ang = Math.atan2(p.vy, p.vx);
    c.save();
    c.translate(p.x + shake, p.y + (p.state === 'falling' ? p.fallT * 40 : 0));
    // ombre
    c.fillStyle = 'rgba(26,15,46,.22)'; c.beginPath(); c.ellipse(0, r * 0.75, r * 0.95, r * 0.35, 0, 0, Math.PI * 2); c.fill();
    if (p.anchoring) { c.strokeStyle = '#6b4a1e'; c.lineWidth = 6; c.setLineDash([6, 6]); c.beginPath(); c.arc(0, 0, r + 9, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); }
    c.save();
    if (speed > 40) { c.rotate(ang); c.scale(stretch, 1 / stretch); c.rotate(-ang); }
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fillStyle = p.color; c.fill();
    c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
    const img = faceImg(p.id);
    if (img.complete) c.drawImage(img, -r, -r, r * 2, r * 2);
    c.restore();
    if (p.charge > 0.05) { c.strokeStyle = `rgba(255,194,61,${0.4 + p.charge * 0.6})`; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, r + 6, -Math.PI / 2, -Math.PI / 2 + p.charge * Math.PI * 2); c.stroke(); }
    if (p.state === 'alive') {
      c.font = '700 17px Fredoka, system-ui'; c.textAlign = 'center';
      const label = P(p.id)?.name || '?';
      const w = c.measureText(label).width + 14;
      c.fillStyle = p.color; c.strokeStyle = INK; c.lineWidth = 3;
      roundRect(c, -w / 2, -r - 34, w, 24, 12); c.fill(); c.stroke();
      c.fillStyle = INK; c.fillText(label, 0, -r - 16);
    }
    c.restore();
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function drawGull(c, g, color, now) {
    const flap = Math.sin(now * 12 + g.x) * 9;
    c.save(); c.translate(g.x, g.y);
    c.fillStyle = 'rgba(26,15,46,.15)'; c.beginPath(); c.ellipse(0, 46, 16, 5, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = INK; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
    c.fillStyle = '#fff';
    c.beginPath(); c.moveTo(-34, -flap); c.quadraticCurveTo(-16, -14, 0, 0); c.quadraticCurveTo(16, -14, 34, -flap); c.stroke();
    c.beginPath(); c.ellipse(0, 2, 15, 10, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#ffa94d'; c.beginPath(); c.moveTo(13, 0); c.lineTo(24, 3); c.lineTo(13, 6); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = color; c.beginPath(); c.arc(-4, 2, 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = INK; c.beginPath(); c.arc(7, -2, 2, 0, Math.PI * 2); c.fill();
    c.font = '600 13px Fredoka, system-ui'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(P(g.id)?.name || '', 0, 30);
    c.restore();
  }
  function drawSplat(c, s) {
    c.save(); c.globalAlpha = Math.min(1, s.life / 0.6);
    c.fillStyle = '#f6f2e4'; c.strokeStyle = INK; c.lineWidth = 3;
    c.beginPath();
    for (let k = 0; k <= 12; k++) { const a = (k / 12) * Math.PI * 2; const rr = s.r * (0.75 + 0.25 * Math.sin(k * 2.7 + s.seed)); c.lineTo(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr * 0.7); }
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#b8a36c'; c.beginPath(); c.arc(s.x + 4, s.y - 2, s.r * 0.25, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  // ═══ Simulation (tourne sur la télé) ═══
  let sim = null;
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  function startSim(S, g, canvas) {
    stopSim();
    const arena = ARENAS[g.arena.id] || ARENAS.rond;
    const rand = rng(g.seed || 1);
    const rot = rand() * Math.PI * 2;
    const ids = g.players.filter((id) => g.alive.includes(id));
    const players = ids.map((id, i) => {
      const [x, y] = arena.spawn(i, ids.length, rot, 0);
      return { id, x, y, vx: 0, vy: 0, r: 26, color: colorOf(id), charge: 0, prevA: false, prevB: false, dashT: 0, dashCd: 0,
        anchoring: false, anchorT: 0, anchorCd: 0, lastHit: null, state: 'alive', fallT: 0 };
    });
    sim = {
      key: `${g.round}|${g.startedAt}`, canvas, ctx: canvas.getContext('2d'), arena, players,
      gulls: {}, splats: [], drops: [], parts: [], hits: {},
      t0: performance.now(), last: performance.now(), acc: 0, count: 3, sentTime: false, raf: 0,
    };
    // les joueurs déjà éliminés (télé rechargée en pleine manche) deviennent tout de suite des mouettes
    for (const id of g.players) if (!g.alive.includes(id)) sim.gulls[id] = { id, x: CX, y: 60, cd: 0, prevA: false };
    resize();
    sim.raf = requestAnimationFrame(loop);
  }
  window.__ringSim = () => sim; // aide au débogage (console du navigateur)
  function stopSim() { if (sim) cancelAnimationFrame(sim.raf); sim = null; }
  function resize() {
    if (!sim) return;
    const cv = sim.canvas, dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth || 800;
    cv.width = Math.round(w * dpr); cv.height = Math.round((w * H / W) * dpr);
    sim.scale = cv.width / W;
  }
  window.addEventListener('resize', resize);

  const send = (type, payload) => UI.emit('screenEvent', { type, payload });

  function step(dt, t) {
    const A = sim.arena, now = performance.now() / 1000;
    const live = sim.players.filter((p) => p.state === 'alive');
    for (const p of live) {
      const inp = inputs[p.id] || {};
      const jx = t > 0 ? inp.x || 0 : 0, jy = t > 0 ? inp.y || 0 : 0;
      const a = t > 0 && !!inp.a, b = t > 0 && !!inp.b;
      p.dashT = Math.max(0, p.dashT - dt); p.dashCd = Math.max(0, p.dashCd - dt); p.anchorCd = Math.max(0, p.anchorCd - dt);
      // B : l'ancre (lourd et immobile, 1,5 s max)
      if (b && p.anchorCd <= 0 && !p.charge) {
        if (!p.anchoring) SFX.anchor();
        p.anchoring = true; p.anchorT += dt;
        if (p.anchorT > 1.5) { p.anchoring = false; p.anchorCd = 3; p.anchorT = 0; }
      } else if (p.anchoring) { p.anchoring = false; p.anchorCd = 1 + p.anchorT; p.anchorT = 0; }
      // A : on charge en maintenant, on fonce en relâchant
      if (a && p.dashCd <= 0 && !p.anchoring) p.charge = Math.min(1, p.charge + dt / 0.8);
      if (!a && p.prevA && p.charge > 0.05) {
        let dx = jx, dy = jy, l = Math.hypot(dx, dy);
        if (l < 0.2) { dx = p.vx; dy = p.vy; l = Math.hypot(dx, dy); }
        if (l < 1) { dx = CX - p.x; dy = CY - p.y; l = Math.hypot(dx, dy) || 1; }
        const sp = 330 + 470 * p.charge;
        p.vx = (dx / l) * sp; p.vy = (dy / l) * sp; p.dashT = 0.35; p.dashCd = 0.55; p.charge = 0;
        SFX.dash();
      }
      if (!a) p.charge = 0;
      p.prevA = a;
      const slick = sim.splats.some((s) => dist(p.x, p.y, s.x, s.y) < s.r);
      if (p.anchoring) { p.vx *= 0.82; p.vy *= 0.82; }
      else {
        const acc = 560 * (p.charge > 0 ? 0.35 : 1) * (slick ? 0.35 : 1);
        p.vx += jx * acc * dt; p.vy += jy * acc * dt;
      }
      A.force?.(p, t, dt);
      const fr = slick ? 0.995 : A.icy ? 0.984 : 0.975;
      p.vx *= Math.pow(fr, dt * 60); p.vy *= Math.pow(fr, dt * 60);
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 200 && p.dashT <= 0) { p.vx *= 0.94; p.vy *= 0.94; }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    // collisions (autos tamponneuses)
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r * (1 + a.charge * 0.28) + b.r * (1 + b.charge * 0.28);
      if (d >= min || d === 0) continue;
      const nx = dx / d, ny = dy / d;
      const ma = a.anchoring ? 7 : 1, mb = b.anchoring ? 7 : 1;
      const over = min - d;
      a.x -= nx * over * (mb / (ma + mb)); a.y -= ny * over * (mb / (ma + mb));
      b.x += nx * over * (ma / (ma + mb)); b.y += ny * over * (ma / (ma + mb));
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn >= 0) continue;
      let jimp = (-(1 + 0.95) * vn) / (1 / ma + 1 / mb);
      const boost = (a.dashT > 0 ? 1.35 : 1) * (b.dashT > 0 ? 1.35 : 1);
      jimp *= boost;
      a.vx -= (jimp / ma) * nx; a.vy -= (jimp / ma) * ny;
      b.vx += (jimp / mb) * nx; b.vy += (jimp / mb) * ny;
      // qui a poussé qui (pour les points d'éjection)
      const sa = Math.hypot(a.vx, a.vy), sb = Math.hypot(b.vx, b.vy);
      b.lastHit = { by: a.id, t: now }; a.lastHit = { by: b.id, t: now };
      if (a.dashT > 0 && b.dashT <= 0) a.lastHit = null;
      if (b.dashT > 0 && a.dashT <= 0) b.lastHit = null;
      if (Math.abs(vn) > 160) {
        const k = [a.id, b.id].sort().join('|');
        if (!sim.hits[k] || now - sim.hits[k] > 0.35) {
          sim.hits[k] = now;
          SFX.bump();
          send('hit', { a: a.id, b: b.id });
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          for (let q = 0; q < 8; q++) sim.parts.push({ x: mx, y: my, vx: (Math.random() - 0.5) * 400, vy: (Math.random() - 0.5) * 400, life: 0.5, kind: 'star' });
        }
      }
      void sa; void sb;
    }
    // chutes
    for (const p of live) {
      if (A.inside(p.x, p.y, t)) continue;
      p.state = 'falling'; p.fallT = 0;
      const by = p.lastHit && now - p.lastHit.t < 3 ? p.lastHit.by : null;
      send('fall', { pid: p.id, by });
      SFX.splash();
      for (let q = 0; q < 14; q++) sim.parts.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 380, life: 0.9, kind: 'drop', g: 900 });
    }
    for (const p of sim.players) {
      if (p.state !== 'falling') continue;
      p.fallT += dt; p.vx *= 0.9; p.vy *= 0.9; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.fallT > 0.7) { p.state = 'out'; sim.gulls[p.id] = { id: p.id, x: p.x, y: p.y - 40, cd: 1, prevA: false }; SFX.squawk(); }
    }
    // mouettes (joueurs éliminés) : elles volent et lâchent des fientes glissantes
    for (const gl of Object.values(sim.gulls)) {
      const inp = inputs[gl.id] || {};
      gl.x = Math.max(30, Math.min(W - 30, gl.x + (inp.x || 0) * 330 * dt));
      gl.y = Math.max(40, Math.min(H - 40, gl.y + (inp.y || 0) * 330 * dt));
      gl.cd = Math.max(0, gl.cd - dt);
      if (inp.a && !gl.prevA && gl.cd <= 0 && t > 0) { gl.cd = 2.2; sim.drops.push({ x: gl.x, y: gl.y, tx: gl.x, ty: gl.y + 40, life: 0.35 }); SFX.squawk(); }
      gl.prevA = !!inp.a;
    }
    for (const d of sim.drops) {
      d.life -= dt;
      if (d.life <= 0) {
        sim.splats.push({ x: d.tx, y: d.ty, r: 36, life: 5, seed: Math.random() * 10 });
        SFX.splat();
        for (const p of sim.players) if (p.state === 'alive' && dist(p.x, p.y, d.tx, d.ty) < 40) send('splat', { pid: p.id });
      }
    }
    sim.drops = sim.drops.filter((d) => d.life > 0);
    for (const s of sim.splats) s.life -= dt;
    sim.splats = sim.splats.filter((s) => s.life > 0);
    for (const q of sim.parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.g) q.vy += q.g * dt; }
    sim.parts = sim.parts.filter((q) => q.life > 0);
  }

  function render(t, now) {
    const c = sim.ctx;
    c.setTransform(sim.scale, 0, 0, sim.scale, 0, 0);
    water(c, now);
    sim.arena.draw(c, Math.max(0, t));
    for (const s of sim.splats) drawSplat(c, s);
    const order = sim.players.filter((p) => p.state !== 'out').sort((a, b) => a.y - b.y);
    for (const p of order) drawPlayer(c, p, now);
    for (const q of sim.parts) {
      c.globalAlpha = Math.max(0, q.life / 0.6);
      if (q.kind === 'star') { c.fillStyle = '#ffc23d'; star(c, q.x, q.y, 7); }
      else { c.fillStyle = '#e8f8ff'; c.beginPath(); c.arc(q.x, q.y, 5, 0, Math.PI * 2); c.fill(); }
      c.globalAlpha = 1;
    }
    for (const d of sim.drops) { c.fillStyle = '#f6f2e4'; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.arc(d.x, d.y + (1 - d.life / 0.35) * 40, 6, 0, Math.PI * 2); c.fill(); c.stroke(); }
    for (const gl of Object.values(sim.gulls)) drawGull(c, gl, colorOf(gl.id), now);
    // chrono et compte à rebours
    c.font = '400 30px "Bagel Fat One", system-ui'; c.textAlign = 'right'; c.lineWidth = 5; c.strokeStyle = INK; c.fillStyle = '#fff';
    if (t > 0) { const s = `${Math.floor(t)} s`; c.strokeText(s, W - 24, 46); c.fillText(s, W - 24, 46); }
    if (t < 0.9) {
      const n = Math.ceil(-t);
      const label = n > 0 ? String(n) : 'POUSSEZ !';
      const k = n > 0 ? 1 + (Math.ceil(-t) + t) * 0.6 : 1 + t * 0.6;
      c.save(); c.translate(CX, CY); c.scale(k, k); c.textAlign = 'center';
      c.font = `400 ${n > 0 ? 150 : 96}px "Bagel Fat One", system-ui`;
      c.lineWidth = 14; c.strokeStyle = INK; c.strokeText(label, 0, 45);
      c.fillStyle = n > 0 ? '#ffc23d' : '#ff6fa3'; c.fillText(label, 0, 45);
      c.restore();
    }
  }
  function star(c, x, y, r) { c.beginPath(); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }

  function loop(ts) {
    if (!sim || !document.body.contains(sim.canvas)) { sim = null; return; }
    const t = (ts - sim.t0) / 1000 - 3;     // 3 s de compte à rebours
    const n = Math.ceil(-t);
    if (n !== sim.count && n >= 0) { sim.count = n; if (n > 0) SFX.beep(); else SFX.go(); }
    sim.acc += Math.min(0.1, (ts - sim.last) / 1000);
    sim.last = ts;
    const DT = 1 / 60;
    while (sim.acc >= DT) { step(DT, t); sim.acc -= DT; }
    render(t, ts / 1000);
    if (t > 95 && !sim.sentTime) { sim.sentTime = true; send('timeUp'); }
    sim.raf = requestAnimationFrame(loop);
  }

  // ═══ Manette (téléphone) ═══
  let pad = null;
  function stopPad() {
    if (!pad) return;
    clearInterval(pad.beat);
    UI.emit('ctl', { x: 0, y: 0, a: false, b: false });
    document.body.classList.remove('padmode');
    pad = null;
  }
  function startPad(root) {
    stopPad();
    const el = root.querySelector('.pad');
    if (!el) return;
    document.body.classList.add('padmode');
    pad = { el, x: 0, y: 0, a: false, b: false, stickId: null, ox: 0, oy: 0, sent: '', lastSend: 0, timer: null };
    const knob = el.querySelector('.pad-knob'), base = el.querySelector('.pad-base');
    const R = 60;
    const flush = () => {
      if (!pad) return;
      const msg = { x: Math.round(pad.x * 100) / 100, y: Math.round(pad.y * 100) / 100, a: pad.a, b: pad.b };
      const k = JSON.stringify(msg);
      const now = Date.now();
      if (k === pad.sent && now - pad.lastSend < 300) return;           // rien n'a changé
      if (now - pad.lastSend < 40) { clearTimeout(pad.timer); pad.timer = setTimeout(flush, 40 - (now - pad.lastSend)); return; } // max ~25/s
      pad.sent = k; pad.lastSend = now;
      UI.emit('ctl', msg);
    };
    pad.beat = setInterval(flush, 300); // renvoie l'état de temps en temps (au cas où un message se perd)
    const zone = el.querySelector('.pad-left');
    const setKnob = () => { knob.style.transform = `translate(${pad.x * R}px, ${pad.y * R}px)`; };
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (pad.stickId != null) return;
      pad.stickId = e.pointerId; zone.setPointerCapture?.(e.pointerId);
      const zr = zone.getBoundingClientRect();
      pad.ox = e.clientX; pad.oy = e.clientY;
      base.style.left = `${e.clientX - zr.left}px`; base.style.top = `${e.clientY - zr.top}px`;
      base.classList.add('on');
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pad.stickId) return;
      e.preventDefault();
      let dx = (e.clientX - pad.ox) / R, dy = (e.clientY - pad.oy) / R;
      const l = Math.hypot(dx, dy);
      if (l > 1) { dx /= l; dy /= l; }
      pad.x = dx; pad.y = dy; setKnob(); flush();
    });
    const release = (e) => {
      if (e.pointerId !== pad.stickId) return;
      pad.stickId = null; pad.x = 0; pad.y = 0; setKnob(); base.classList.remove('on'); flush();
    };
    zone.addEventListener('pointerup', release); zone.addEventListener('pointercancel', release);
    el.querySelectorAll('[data-btn]').forEach((b) => {
      const k = b.dataset.btn;
      const down = (e) => { e.preventDefault(); pad[k] = true; b.classList.add('down'); navigator.vibrate?.(12); flush(); };
      const up = (e) => { e.preventDefault(); pad[k] = false; b.classList.remove('down'); flush(); };
      b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    });
    el.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.querySelector('[data-fs]')?.addEventListener('click', async () => {
      try { await document.documentElement.requestFullscreen?.(); await screen.orientation?.lock?.('landscape'); } catch (e) { /* pas possible sur ce téléphone */ }
    });
  }

  let wonFor = 0;

  // ═══ Écrans ═══
  const RULES = `
    <div class="rg-rules">
      <div><span class="rg-ico">🕹️</span><b>Joystick</b><small>on glisse sur la glace</small></div>
      <div><span class="rg-ico rg-a">A</span><b>Charge</b><small>maintiens… relâche : BOUM</small></div>
      <div><span class="rg-ico rg-b">B</span><b>Ancre</b><small>impossible à pousser, mais immobile</small></div>
      <div><span class="rg-ico">🐦</span><b>Éliminé ?</b><small>tu deviens une mouette : A = fiente glissante</small></div>
    </div>`;

  const statusLabel = (me) => me === 'alive' ? '🟢 En jeu' : me === 'out' ? '💦 Éliminé : tu es une mouette !' : '⏳ En attente de la prochaine manche';

  const screens = {
    intro(S, g) {
      if (S.spectator) {
        return `<div class="rg-title"><span class="rg-art">${ICONS.game('ring')}</span><div><h1>Le ring savonneux</h1><p class="white">Poussez tout le monde à l'eau. Le dernier sur la glace gagne !</p></div></div>
          ${RULES}
          <div class="card"><div class="players figs">${g.participants.filter(P).map((id) => `<div class="pfig" style="--c:${colorOf(id)}">${av(P(id), 'xl')}<span class="pn">${name(id)}</span></div>`).join('')}</div></div>
          <p class="center white tv-big">${name(S.hostId)} lance la partie depuis son téléphone 📱</p>`;
      }
      return `<div class="phase"><div class="step">${g.totalRounds} manches</div><div class="t">Le ring savonneux 🧼</div></div>
        <div class="card center keep"><p style="margin-top:0"><b>📱 Ton téléphone devient une manette.</b><br>Tourne-le en <b>paysage</b> et regarde la télé !</p>${RULES}</div>
        ${UI.hostButton('C\'est parti ! 🧼')}`;
    },

    play(S, g) {
      if (S.spectator) {
        return `<div class="rg-stage">
            <div class="rg-hud"><span class="rg-round">Manche ${g.round}/${g.totalRounds} · ${esc(g.arena.name)}</span><span data-live="alive"></span></div>
            <canvas class="rg-canvas"></canvas>
            <button class="rg-sound" data-sound>🔊</button>
          </div>`;
      }
      const me = P(S.you);
      return `<div class="pad ${g.me}" style="--pc:${colorOf(S.you)}">
          <div class="pad-top">${av(me, 'sm')}<b>${esc(me?.name || '')}</b><span class="pad-status" data-live="status"></span><button class="pad-fs" data-fs aria-label="Plein écran">⛶</button></div>
          <div class="pad-left"><div class="pad-base"><div class="pad-knob"></div></div><span class="pad-hint">Glisse ton pouce ici</span></div>
          <div class="pad-right">
            <button class="pad-btn pad-b" data-btn="b">B<small>${g.me === 'out' ? '—' : 'Ancre'}</small></button>
            <button class="pad-btn pad-a" data-btn="a">A<small>${g.me === 'out' ? 'Fiente' : 'Charge'}</small></button>
          </div>
          <div class="pad-rotate">📱↔️<br>Tourne ton téléphone</div>
        </div>
        ${UI.isHost() ? '<div class="pad-host"><a class="link" data-host-action="next">Arrêter la manche</a></div>' : ''}`;
    },

    roundEnd(S, g) {
      const r = g.result;
      const last = g.round >= g.totalRounds;
      return `${UI.header(g.round + 1, g.totalRounds + 1, `Manche ${g.round} sur ${g.totalRounds} · ${esc(g.arena.name)}`, r.winners.length ? `${r.winners.map(name).join(' & ')} ${r.winners.length > 1 ? 'restent' : 'reste'} sur la glace ! 👑` : 'Tout le monde à l\'eau ! 💦')}
        <div class="card"><h2>Classement de la manche</h2>
          ${r.ranking.filter(P).map((id, i) => `<div class="score"><b>${i + 1}</b>${av(P(id))}<span class="n">${name(id)}${r.ejections[id] ? ` <small class="muted">· ${r.ejections[id]} éjection${r.ejections[id] > 1 ? 's' : ''} 💥</small>` : ''}</span>${r.gains[id] ? `<span class="plus">+${r.gains[id].total}</span>` : ''}</div>`).join('')}</div>
        <div class="card"><h2>Total</h2>${UI.scoreboard(g.scores)}</div>
        ${UI.hostButton(last ? 'Voir le podium 🏆' : 'Manche suivante 🧼')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  UI.registerGame('ring', {
    rules: () => `
      <ol class="rules">
        <li>Le jeu s'affiche sur la <b>télé</b>. Ton <b>téléphone est ta manette</b> (tourne-le en paysage).</li>
        <li>Tout le monde glisse sur une plateforme de glace qui <b>rétrécit</b>. <b>Pousse les autres à l'eau</b> !</li>
        <li><b>A</b> : maintiens pour charger, relâche pour foncer. <b>B</b> : l'ancre, impossible à pousser mais immobile.</li>
        <li>Éliminé ? Tu deviens une <b>mouette</b> : <b>A</b> lâche une fiente qui fait glisser les autres.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">5 manches, 5 arènes · 1er de la manche : <b>+5</b> · 2e : <b>+3</b> · 3e : <b>+1</b> · chaque joueur jeté à l'eau : <b>+1</b></div>`,

    // la télé ne se redessine pas pendant la manche (le canvas tourne tout seul)
    key: (S, g) => [g.phase, g.round, S.spectator ? '' : g.me].join('|'),

    screen: (S, g) => (screens[g.phase] || screens.intro)(S, g),
    tv: (S, g) => (screens[g.phase] || screens.intro)(S, g),

    onState: (S, g) => {
      if (g.phase !== 'play') { stopSim(); stopPad(); }
      if (g.phase === 'roundEnd' && S.spectator && wonFor !== g.round) { wonFor = g.round; SFX.win(); }
    },

    live: {
      alive: (S, g) => g.players.filter(P).map((id) => `<span class="rg-chip ${g.alive.includes(id) ? '' : 'out'}" style="--c:${colorOf(id)}">${av(P(id), 'sm')}${name(id)}</span>`).join(''),
      status: (S, g) => statusLabel(g.me),
    },

    bind: (S, g, root) => {
      if (g.phase === 'play' && S.spectator) {
        const cv = root.querySelector('.rg-canvas');
        if (cv && (!sim || sim.key !== `${g.round}|${g.startedAt}` || sim.canvas !== cv)) startSim(S, g, cv);
        root.querySelector('[data-sound]')?.addEventListener('click', () => { audio(); SFX.beep(); });
      }
      if (g.phase === 'play' && !S.spectator) startPad(root);
    },
  });
})();
