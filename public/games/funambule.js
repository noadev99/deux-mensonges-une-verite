// 🎪 Le Funambule — une bille sur un plateau, on penche le téléphone pour la garder au centre.
// Sans télé : chaque téléphone a son propre plateau. Avec la télé (mode salon) : un plateau
// commun affiché sur la télé, avec toutes les billes, qui se poussent ; le téléphone est la manette.
// Capteur d'inclinaison (deviceorientation). Pas de capteur ? On glisse le doigt sur le plateau.
// Le vent dépend d'une graine envoyée par le serveur : il souffle pareil chez tout le monde.
(() => {
  const { esc, P, av, name } = UI;

  // ═══ Inclinaison ═══
  const tilt = { events: 0, beta: 0, gamma: 0, b0: 0, g0: 0, on: false, denied: false };
  function onOrient(e) {
    if (e.beta == null) return;
    tilt.events++;
    tilt.beta = e.beta; tilt.gamma = e.gamma;
  }
  if (window.DeviceOrientationEvent) window.addEventListener('deviceorientation', onOrient);
  const askable = () => !!window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function';
  const hasSensor = () => tilt.events > 5;
  const needsPermission = () => askable() && !tilt.on && !tilt.denied && !hasSensor();
  const enable = () => (!askable() || tilt.on ? Promise.resolve(true)
    : DeviceOrientationEvent.requestPermission().then((r) => { tilt.on = r === 'granted'; tilt.denied = !tilt.on; return tilt.on; }).catch(() => false));
  const calibrate = () => { tilt.b0 = tilt.beta; tilt.g0 = tilt.gamma; };

  // doigt sur le plateau (sans capteur) : position du doigt = inclinaison
  const finger = { on: false, x: 0, y: 0 };

  // ═══ Vent : rafales identiques pour tous (graine + temps) ═══
  // Réglages mesurés avec un joueur simulé (temps de réaction ~0,25 s) :
  // survie médiane ≈ 40 s (brise), 22 s (vent fort), 14 s (tempête) ; personne ne tient les 90 s.
  const TUNE = { a0: 0.45, al: 0.3, grow: 18, gustFreq: 0.55, gust: 2.4, damp: 0.5, rMin: 0.5, shrink0: 0.005, shrinkL: 0.003 };
  function wind(seed, t, level) {
    const s = (k) => Math.sin(seed * 0.0001 * (k + 1) + k * 1.7);
    const amp = (TUNE.a0 + level * TUNE.al) * (1 + t / TUNE.grow);     // de plus en plus fort
    const wx = Math.sin(t * (0.7 + 0.2 * s(1)) + 6 * s(2)) * 0.6 + Math.sin(t * (1.9 + 0.3 * s(3)) + 6 * s(4)) * 0.4;
    const wy = Math.sin(t * (0.9 + 0.2 * s(5)) + 6 * s(6)) * 0.6 + Math.sin(t * (2.3 + 0.3 * s(7)) + 6 * s(8)) * 0.4;
    const gust = Math.max(0, Math.sin(t * TUNE.gustFreq + 6 * s(9))) ** 4 * TUNE.gust;   // grosses rafales régulières
    return [(wx + gust * Math.sign(s(10) || 1)) * amp, (wy + gust * 0.5 * Math.sign(s(11) || 1)) * amp];
  }
  // le plateau rétrécit avec le temps (jusqu'à la moitié de sa taille)
  const radius = (t, level) => Math.max(TUNE.rMin, 1 - Math.max(0, t) * (TUNE.shrink0 + level * TUNE.shrinkL));


  // ═══════════ Mode télé : plateau commun, les billes se poussent ═══════════
  const TILT_MAX = 25;                 // inclinaison (degrés) qui donne la poussée maximale
  const PUSH = 3.8;                    // accélération à fond (≈ la même qu'avec le téléphone seul)
  const BALL = 0.085;                  // rayon d'une bille (le plateau fait 1 au départ)
  const BOUNCE = 1.5;                  // rebond > 1 : les chocs « claquent » (réglé : une bonne charge éjecte en 2–3 s)
  const clamp1 = (v) => Math.max(-1, Math.min(1, v));

  // --- téléphone : envoie son inclinaison à la télé (comme un joystick) ---
  const ctl = { x: 0, y: 0, sent: '', last: 0, timer: 0, padOn: false };
  function tiltInput() {
    if (ctl.padOn) return [ctl.x, ctl.y];
    if (!hasSensor()) return [0, 0];
    const k = Math.sin((TILT_MAX * Math.PI) / 180);
    return [clamp1(Math.sin(((tilt.gamma - tilt.g0) * Math.PI) / 180) / k), clamp1(Math.sin(((tilt.beta - tilt.b0) * Math.PI) / 180) / k)];
  }
  function startCtl() {
    if (ctl.timer) return;
    ctl.timer = setInterval(() => {
      if (!cur || cur.phase !== 'play' || !cur.shared || UI.state?.spectator || cur.me === 'wait') { stopCtl(); return; }
      const [x, y] = tiltInput();
      const msg = { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, a: false, b: false, c: false };
      const k = JSON.stringify(msg), now = Date.now();
      if (k !== ctl.sent || now - ctl.last > 300) { ctl.sent = k; ctl.last = now; UI.emit('ctl', msg); }
      const dot = document.querySelector('.fu-dot');
      if (dot) dot.style.transform = `translate(${x * 70}px, ${y * 70}px)`;
    }, 45);
  }
  function stopCtl() { clearInterval(ctl.timer); ctl.timer = 0; }

  // --- télé : physique de toutes les billes ---
  const arena = { key: '', balls: [], raf: 0, goAt: 0, seed: 1, level: 0, practice: false, hits: {}, lastTs: 0 };
  const sendTv = (type, payload) => UI.emit('screenEvent', { type, payload });
  function spawn(id, i, n, seed) {
    const a = (seed % 360) * (Math.PI / 180) + (i / Math.max(1, n)) * Math.PI * 2;
    const r = n > 1 ? 0.5 : 0;
    return { id, x: Math.cos(a) * r, y: Math.sin(a) * r, vx: 0, vy: 0, out: false, outAt: 0, by: null, byAt: 0 };
  }
  function arenaSetup(g) {
    arena.key = `${g.round}|${g.practice}|${g.seed}`;
    arena.seed = g.seed; arena.level = g.level; arena.practice = g.practice;
    arena.goAt = Date.now() + g.goIn - (g.goIn ? 0 : g.elapsed);
    const ids = g.players.filter((id) => !g.fallen.includes(id));
    arena.balls = ids.map((id, i) => spawn(id, i, ids.length, g.seed));
    arena.hits = {};
  }
  function arenaStep(dt, t) {
    const R = radius(t, arena.level);
    const [wx, wy] = wind(arena.seed, t, arena.level);
    const damp = Math.pow(TUNE.damp, dt);
    const live = arena.balls.filter((b) => !b.out);
    for (const b of live) {
      const inp = MANETTE.inputs[b.id] || {};
      const ax = clamp1(inp.x || 0) * PUSH, ay = clamp1(inp.y || 0) * PUSH;
      b.vx = (b.vx + (ax + wx) * dt) * damp;
      b.vy = (b.vy + (ay + wy) * dt) * damp;
      b.x += b.vx * dt * 0.55; b.y += b.vy * dt * 0.55;
    }
    // chocs entre billes : on se repousse, et on retient qui a poussé qui (pour l'éjection)
    const now = performance.now();
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= BALL * 2 || d === 0) continue;
      dx /= d; dy /= d;
      const over = (BALL * 2 - d) / 2;
      a.x -= dx * over; a.y -= dy * over; b.x += dx * over; b.y += dy * over;
      const vn = (a.vx - b.vx) * dx + (a.vy - b.vy) * dy;      // vitesse de rapprochement
      if (vn <= 0) continue;
      // le plus rapide avant le choc est « celui qui pousse »
      const sa = Math.hypot(a.vx, a.vy), sb = Math.hypot(b.vx, b.vy);
      const imp = (vn * (1 + BOUNCE)) / 2;                     // choc entre deux masses égales
      a.vx -= imp * dx; a.vy -= imp * dy; b.vx += imp * dx; b.vy += imp * dy;
      if (sa >= sb) { b.by = a.id; b.byAt = now; } else { a.by = b.id; a.byAt = now; }
      const k = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id;
      if (vn > 0.25 && (!arena.hits[k] || now - arena.hits[k] > 400)) {
        arena.hits[k] = now; sendTv('hit', { a: a.id, b: b.id });
        MANETTE.tone(180 + Math.random() * 60, 0.08, 'triangle', 0.12);
      }
    }
    for (const b of live) {
      if (Math.hypot(b.x, b.y) <= R) continue;
      b.out = true; b.outAt = now;
      const by = b.by && now - b.byAt < 2500 ? b.by : null;
      sendTv('fall', { pid: b.id, by });
      MANETTE.tone(320, 0.45, 'sawtooth', 0.12, -240);
      if (arena.practice) {                          // entraînement : on réapparaît près du centre
        setTimeout(() => { Object.assign(b, spawn(b.id, 0, 1, 0), { x: (Math.random() - 0.5) * 0.3, y: (Math.random() - 0.5) * 0.3 }); }, 900);
      }
    }
  }
  function arenaLoop(ts) {
    arena.raf = 0;
    if (!cur || cur.phase !== 'play' || !cur.shared || !UI.state?.spectator) return;
    const dt = Math.min(0.05, arena.lastTs ? (ts - arena.lastTs) / 1000 : 0.016);
    arena.lastTs = ts;
    const t = (Date.now() - arena.goAt) / 1000;
    if (t > 0) arenaStep(dt, t);
    arenaPaint(t);
    arena.raf = requestAnimationFrame(arenaLoop);
  }
  function arenaPaint(t) {
    const cv = document.querySelector('#fu-tv');
    if (cv) {
      const W = cv.width = cv.clientWidth * devicePixelRatio, H = cv.height = cv.clientHeight * devicePixelRatio;
      const c = cv.getContext('2d'), R0 = Math.min(W, H) * 0.44, cx = W / 2, cy = H / 2, px = devicePixelRatio;
      const R = R0 * radius(Math.max(0, t), arena.level);
      c.clearRect(0, 0, W, H);
      c.fillStyle = '#2a1a4a'; c.beginPath(); c.arc(cx, cy, R0 * 1.06, 0, 7); c.fill();
      c.fillStyle = 'rgba(224,54,90,.3)'; c.beginPath(); c.arc(cx, cy, R0, 0, 7); c.fill();
      c.fillStyle = '#f6efe2'; c.strokeStyle = '#1a0f2e'; c.lineWidth = 4 * px; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill(); c.stroke();
      c.strokeStyle = '#ffc23d'; c.lineWidth = 3 * px; c.setLineDash([10 * px, 10 * px]); c.beginPath(); c.arc(cx, cy, R0 * 0.25, 0, 7); c.stroke(); c.setLineDash([]);
      if (t > 0) {
        const [wx, wy] = wind(arena.seed, t, arena.level), wl = Math.min(1, Math.hypot(wx, wy) / 3);
        c.globalAlpha = 0.3 + wl * 0.6; c.strokeStyle = '#4fc3f7'; c.lineWidth = 10 * px; c.lineCap = 'round';
        const ex = cx + (wx / 3) * R0 * 0.7, ey = cy + (wy / 3) * R0 * 0.7;
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(ex, ey); c.stroke(); c.globalAlpha = 1;
      }
      const now = performance.now(), br = R0 * BALL;
      for (const b of arena.balls) {
        let scale = 1;
        if (b.out) { const k = (now - b.outAt) / 700; if (k > 1) continue; scale = 1 - k; c.globalAlpha = 1 - k; }
        const x = cx + b.x * R0, y = cy + b.y * R0, r = br * scale;
        c.fillStyle = MANETTE.colorOf(b.id); c.strokeStyle = '#1a0f2e'; c.lineWidth = 3 * px;
        c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.stroke();
        const img = MANETTE.faceImg(b.id);
        if (img.complete && img.naturalWidth) c.drawImage(img, x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6);
        if (!b.out) {
          c.font = `700 ${Math.round(15 * px)}px system-ui, sans-serif`; c.textAlign = 'center';
          c.lineWidth = 4 * px; c.strokeStyle = '#1a0f2e'; c.fillStyle = '#fff';
          const nm = UI.P(b.id)?.name || '';
          c.strokeText(nm, x, y + r + 18 * px); c.fillText(nm, x, y + r + 18 * px);
        }
        c.globalAlpha = 1;
      }
    }
    const count = document.querySelector('[data-count]');
    if (count) { const txt = t < 0 ? String(Math.ceil(-t)) : t < 0.9 ? 'GO !' : ''; if (count.textContent !== txt) { count.textContent = txt; count.classList.toggle('go', t >= 0); } }
    const clock = document.querySelector('[data-clock]');
    if (clock) clock.textContent = t > 0 ? `${t.toFixed(1)} s` : '';
  }

  // ═══ Sans télé : simulation locale (chacun sa bille) ═══
  const sim = { x: 0, y: 0, vx: 0, vy: 0, out: false, last: 0, round: -1, practice: false, goAt: 0, seed: 1, level: 0, sentFall: false, falls: 0 };
  let raf = 0, cur = null;
  function reset() { Object.assign(sim, { x: 0, y: 0, vx: 0, vy: 0, out: false, sentFall: false }); }
  function frame(ts) {
    raf = 0;
    if (!cur || cur.phase !== 'play' || cur.shared) return;
    const now = Date.now();
    const dt = Math.min(0.05, sim.last ? (ts - sim.last) / 1000 : 0.016);
    sim.last = ts;
    const t = (now - sim.goAt) / 1000;
    const playing = cur.me === 'play' && t > 0 && !sim.out;
    if (playing) {
      // inclinaison → accélération (degrés, recentrés sur la position de départ)
      let ax = 0, ay = 0;
      if (finger.on) { ax = finger.x * 3; ay = finger.y * 3; }
      else if (hasSensor()) {
        ax = Math.sin(((tilt.gamma - tilt.g0) * Math.PI) / 180) * 9;
        ay = Math.sin(((tilt.beta - tilt.b0) * Math.PI) / 180) * 9;
      }
      const [wx, wy] = wind(sim.seed, t, sim.level);
      const damp = Math.pow(TUNE.damp, dt);        // frottement réglé par seconde (pareil à 60 ou 120 images/s)
      sim.vx = (sim.vx + (ax + wx) * dt) * damp;
      sim.vy = (sim.vy + (ay + wy) * dt) * damp;
      sim.x += sim.vx * dt * 0.55;
      sim.y += sim.vy * dt * 0.55;
      if (Math.hypot(sim.x, sim.y) > radius(t, sim.level)) {
        sim.out = true;
        if (!sim.sentFall) { sim.sentFall = true; UI.send('fall'); navigator.vibrate?.(250); MANETTE.tone(300, 0.4, 'sawtooth', 0.12, -200); }
        if (sim.practice) { sim.falls++; setTimeout(() => { reset(); }, 700); }
      }
    } else if (t <= 0) { calibrate(); }
    paint(t);
    raf = requestAnimationFrame(frame);
  }
  function paint(t) {
    const cv = document.querySelector('#fu-cv');
    if (cv) {
      const W = cv.width = cv.clientWidth * devicePixelRatio, H = cv.height = cv.clientHeight * devicePixelRatio;
      const c = cv.getContext('2d'), R = Math.min(W, H) * 0.42, cx = W / 2, cy = H / 2;
      c.clearRect(0, 0, W, H);
      c.fillStyle = '#2a1a4a'; c.beginPath(); c.arc(cx, cy, R * 1.08, 0, 7); c.fill();
      const rr = R * radius(t, sim.level);
      c.fillStyle = '#e0365a'; c.globalAlpha = 0.25; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill(); c.globalAlpha = 1;   // le vide qui avance
      c.fillStyle = '#f6efe2'; c.beginPath(); c.arc(cx, cy, rr, 0, 7); c.fill();
      c.strokeStyle = '#ffc23d'; c.lineWidth = 4 * devicePixelRatio; c.setLineDash([8, 8]); c.beginPath(); c.arc(cx, cy, R * 0.25, 0, 7); c.stroke(); c.setLineDash([]);
      // flèche du vent
      if (t > 0) {
        const [wx, wy] = wind(sim.seed, t, sim.level), wl = Math.min(1, Math.hypot(wx, wy) / 3);
        c.globalAlpha = 0.25 + wl * 0.6; c.strokeStyle = '#4fc3f7'; c.lineWidth = 6 * devicePixelRatio;
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + (wx / 3) * R * 0.8, cy + (wy / 3) * R * 0.8); c.stroke(); c.globalAlpha = 1;
      }
      const bx = cx + sim.x * R, by = cy + sim.y * R;
      c.fillStyle = sim.out ? '#e0365a' : MANETTE.colorOf(UI.state?.you); c.strokeStyle = '#1a0f2e'; c.lineWidth = 3 * devicePixelRatio;
      c.beginPath(); c.arc(bx, by, R * 0.11, 0, 7); c.fill(); c.stroke();
    }
    const count = document.querySelector('[data-count]');
    if (count) count.textContent = t < 0 ? String(Math.ceil(-t)) : t < 0.9 ? 'GO !' : '';
    const clock = document.querySelector('[data-clock]');
    if (clock) clock.textContent = t > 0 ? `${t.toFixed(1)} s` : '';
  }

  const standingList = (g) => `<div class="players">${g.players.filter(P).map((id) => `<div class="player ${g.fallen.includes(id) ? 'va-out' : ''}">${av(P(id))}<span>${name(id)} ${g.fallen.includes(id) ? '💥' : '🎪'}</span></div>`).join('')}</div>`;
  const sensorLine = () => (needsPermission() ? '<button class="big dr-perm" data-perm>📐 Activer le capteur d\'inclinaison</button>'
    : hasSensor() ? '<p class="center dr-ok">📐 Capteur prêt</p>' : '<p class="muted center">Pas de capteur : <b>glisse le doigt</b> sur le plateau pour pencher.</p>');

  // télé : le plateau commun
  const sharedTv = (S, g) => `<div class="dr-tv">${g.practice ? MANETTE.practiceBanner('Penchez vos téléphones pour bouger votre bille. Foncez dans les autres pour les pousser ! « Je suis prêt » quand c\'est bon.')
      : `<div class="dr-head"><span class="dr-mtitle">🎪 Manche ${g.round}/${g.totalRounds} · ${esc(g.levelName)}</span><span class="white">Poussez les autres dans le vide !</span></div>`}
    <div class="fu-arena"><canvas id="fu-tv"></canvas><div class="dr-count" data-count></div><div class="fu-clock tv" data-clock></div></div>
    ${MANETTE.kbName() ? `<p class="white center">⌨️ ${esc(MANETTE.kbName())} : flèches pour bouger</p>` : ''}
    <div class="card" data-live="standing"></div></div>`;
  // téléphone : la manette (inclinaison, ou doigt dans le cercle sans capteur)
  const sharedPad = (S, g) => {
    if (g.me === 'wait') return `<div class="card center keep"><p>⏳ Tu joueras à la prochaine manche ! Regarde la télé 📺</p></div>`;
    const out = g.me === 'out';
    return `<div class="phase"><div class="step">${g.practice ? '🎯 Entraînement · rien ne compte' : `Manche ${g.round} / ${g.totalRounds} · ${esc(g.levelName)}`}</div><div class="t">${out ? 'Tombé dans le vide ! 💥' : '📺 Regarde la télé !'}</div></div>
      ${g.practice ? `<div class="center" style="margin-bottom:8px">${MANETTE.readyBtn(S, g)}</div>` : ''}
      <div class="card keep center fu-pad ${out ? 'out' : ''}" style="--pc:${MANETTE.colorOf(S.you)}">
        <div class="fu-ring" data-padzone><span class="fu-dot"></span></div>
        <p style="margin:10px 0 0">${hasSensor() ? 'Penche le téléphone pour <b>bouger ta bille</b>. Fonce dans les autres pour les <b>pousser</b> !' : '<b>Glisse le doigt</b> dans le cercle pour bouger ta bille. Fonce dans les autres pour les <b>pousser</b> !'}</p>
        ${needsPermission() ? '<button class="big dr-perm" data-perm>📐 Activer le capteur</button>' : ''}
        ${hasSensor() ? '<button class="ghost" data-calib>🎯 Recentrer (tiens le téléphone à plat)</button>' : ''}
      </div>
      ${UI.isHost() ? `<div class="center"><a class="link" data-host-action="next">${g.practice ? 'Passer l\'entraînement' : 'Arrêter la manche'}</a></div>` : ''}`;
  };

  const screens = {
    intro(S, g) {
      return `${UI.header(1, 1, 'Le Funambule', 'Garde l\'équilibre ! 🎪')}
        <div class="card">${GAME.rules()}</div><div class="card keep">${sensorLine()}</div>
        ${S.tv ? '<p class="center white"><b>📺 Télé branchée : tous sur le même plateau, on peut se pousser !</b></p>' : '<p class="center muted">Branche la télé (📺) pour jouer tous sur le même plateau et vous pousser.</p>'}
        <p class="center muted">On commence par un <b>entraînement</b>.</p>
        ${UI.hostButton('Entraînement 🎯')}`;
    },
    play(S, g) {
      if (g.shared) return S.spectator ? sharedTv(S, g) : sharedPad(S, g);
      if (S.spectator) {
        return `<div class="dr-tv">${g.practice ? MANETTE.practiceBanner('Penchez le téléphone pour garder la bille au centre. « Je suis prêt » quand c\'est bon !') : UI.header(g.round, g.totalRounds, `Manche ${g.round} / ${g.totalRounds} · ${esc(g.levelName)}`, 'Qui tiendra le plus longtemps ?')}
          <div class="card center fu-stage" style="min-height:140px"><div class="dr-count" data-count></div><div class="tv-big" data-clock></div></div>
          <div class="card" data-live="standing"></div></div>`;
      }
      if (g.me === 'wait') return `<div class="card center"><p>⏳ Tu joueras à la prochaine manche !</p></div><div class="card" data-live="standing"></div>`;
      return `<div class="phase"><div class="step">${g.practice ? '🎯 Entraînement · rien ne compte' : `Manche ${g.round} / ${g.totalRounds} · ${esc(g.levelName)}`}</div><div class="t">${g.me === 'out' ? 'Tombé ! 💥' : 'Garde la bille au centre !'}</div></div>
        ${g.practice ? `<div class="center" style="margin-bottom:8px">${MANETTE.readyBtn(S, g)}</div>` : ''}
        <div class="card keep fu-stage"><canvas id="fu-cv"></canvas><div class="dr-count" data-count></div><div class="fu-clock" data-clock></div></div>
        ${needsPermission() ? '<button class="big dr-perm" data-perm>📐 Activer le capteur</button>' : ''}
        <p class="center muted">${hasSensor() ? 'Tiens le téléphone <b>à plat</b> et penche-le doucement.' : 'Glisse le doigt sur le plateau pour pencher.'} La flèche bleue montre le vent.</p>
        <div class="card keep" data-live="standing"></div>
        ${UI.isHost() ? `<div class="center"><a class="link" data-host-action="next">${g.practice ? 'Passer l\'entraînement' : 'Arrêter la manche'}</a></div>` : ''}`;
    },
    roundEnd(S, g) {
      const r = g.result;
      return `${UI.header(g.round + 1, g.totalRounds + 1, `Manche ${g.round} / ${g.totalRounds}`, r.left.length ? `${r.left.map(name).join(' & ')} tient bon ! 🎪` : 'Tout le monde est tombé !')}
        <div class="card">${r.ranking.filter(P).map((id, i) => `<div class="score"><b>${i + 1}</b>${av(P(id))}<span class="n">${name(id)}</span><span class="p">${r.left.includes(id) ? '🎪 debout' : `${((r.falls[id] || 0) / 1000).toFixed(1)} s`}</span></div>`).join('')}</div>
        <div class="card gains-card">${UI.gainsBlock(r.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(r.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Manche suivante 🎪')}`;
    },
    end: (S, g) => UI.endScreen(g),
  };

  const GAME = {
    rules: () => `<ol class="rules">
        <li>Une <b>bille</b> est posée sur ton écran. Tiens ton téléphone <b>à plat</b>.</li>
        <li>Penche-le doucement pour la garder au centre : le <b>vent</b> souffle de plus en plus fort, et le <b>plateau rétrécit</b> !</li>
        <li>Si la bille sort du plateau, tu es éliminé. Le <b>dernier debout</b> gagne la manche.</li>
        <li>📺 <b>Avec la télé</b> : tout le monde est sur le <b>même plateau</b>. Fonce dans les autres pour les <b>pousser dans le vide</b> (+20 par adversaire éjecté) !</li>
      </ol>
      <div class="muted" style="font-size:.92rem">3 manches : brise, vent fort, tempête · dernier debout : <b>+100</b>, puis 60, 40, 20, 10</div>`,
    tv: (S, g) => (screens[g.phase] || screens.intro)(S, g),
    keyboard: MANETTE.keyboard('Flèches ou ZQSD pour bouger ta bille sur le plateau.'),   // joueur au clavier sur l'ordi de la télé
    key: (S, g) => [g.phase, g.round, g.practice, S.spectator ? '' : g.me, MANETTE.isReady(g, S.you), needsPermission(), hasSensor()].join('|'),
    screen: (S, g) => (screens[g.phase] || screens.intro)(S, g),
    onState: (S, g) => {
      cur = g;
      if (g.phase === 'play' && g.shared) {
        const k = `${g.round}|${g.practice}|${g.seed}`;
        if (S.spectator) {
          if (arena.key !== k) arenaSetup(g);
          if (!arena.raf) arena.raf = requestAnimationFrame(arenaLoop);
        } else {
          // on prend la position « à plat » juste avant le départ
          if (sim.round !== k) { sim.round = k; if (g.goIn > 0) setTimeout(calibrate, Math.max(0, g.goIn - 300)); else calibrate(); }
          if (g.me !== 'wait') startCtl();
        }
        return;
      }
      stopCtl();
      if (g.phase === 'play') {
        const k = `${g.round}|${g.practice}|${g.seed}`;
        if (sim.round !== k) { sim.round = k; reset(); sim.falls = 0; sim.goAt = Date.now() + g.goIn - (g.goIn ? 0 : g.elapsed); }
        Object.assign(sim, { practice: g.practice, seed: g.seed, level: g.level });
        if (g.me === 'out' && !g.practice) sim.out = true;
        if (!raf) raf = requestAnimationFrame(frame);
      }
    },
    live: { ready: (S, g) => MANETTE.readyChips(g), standing: (S, g) => (g.practice ? `<div class="pr-chips">${MANETTE.readyChips(g)}</div>` : standingList(g) + (g.shared && Object.keys(g.pushes || {}).length ? `<p class="muted" style="margin:8px 0 0">💥 ${Object.entries(g.pushes).filter(([id]) => P(id)).map(([id, n]) => `${name(id)} ×${n}`).join(' · ')}</p>` : '')) },
    bind: (S, g, root) => {
      root.querySelectorAll('[data-perm]').forEach((b) => b.addEventListener('click', () => enable().then(() => UI.refresh())));
      root.querySelector('[data-calib]')?.addEventListener('click', () => { calibrate(); navigator.vibrate?.(30); UI.toast('Recentré 🎯'); });
      const pz = root.querySelector('[data-padzone]');
      if (pz) {
        const move = (e) => { const r = pz.getBoundingClientRect(); ctl.x = clamp1(((e.clientX - r.left) / r.width - 0.5) * 2.2); ctl.y = clamp1(((e.clientY - r.top) / r.height - 0.5) * 2.2); };
        pz.addEventListener('pointerdown', (e) => { e.preventDefault(); ctl.padOn = true; move(e); pz.setPointerCapture?.(e.pointerId); });
        pz.addEventListener('pointermove', (e) => { if (ctl.padOn) { e.preventDefault(); move(e); } });
        const up = () => { ctl.padOn = false; ctl.x = 0; ctl.y = 0; };
        pz.addEventListener('pointerup', up); pz.addEventListener('pointercancel', up);
        pz.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
      }
      if (S.spectator) MANETTE.kbResume();
      const st = root.querySelector('.fu-stage');
      if (st) {
        const move = (e) => { const r = st.getBoundingClientRect(); finger.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2)); finger.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2)); };
        st.addEventListener('pointerdown', (e) => { if (hasSensor()) return; e.preventDefault(); finger.on = true; move(e); st.setPointerCapture?.(e.pointerId); });
        st.addEventListener('pointermove', (e) => { if (finger.on) { e.preventDefault(); move(e); } });
        const up = () => { finger.on = false; finger.x = 0; finger.y = 0; };
        st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
        st.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
      }
      if (!hasSensor() && tilt.on) setTimeout(() => hasSensor() && UI.refresh(), 1500);
    },
  };
  UI.registerGame('funambule', GAME);
})();
