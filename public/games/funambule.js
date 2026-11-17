// 🎪 Le Funambule — une bille sur un plateau, on penche le téléphone pour la garder au centre.
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

  // ═══ Simulation locale ═══
  const sim = { x: 0, y: 0, vx: 0, vy: 0, out: false, last: 0, round: -1, practice: false, goAt: 0, seed: 1, level: 0, sentFall: false, falls: 0 };
  let raf = 0, cur = null;
  function reset() { Object.assign(sim, { x: 0, y: 0, vx: 0, vy: 0, out: false, sentFall: false }); }
  function frame(ts) {
    raf = 0;
    if (!cur || cur.phase !== 'play') return;
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

  const screens = {
    intro(S, g) {
      return `${UI.header(1, 1, 'Le Funambule', 'Garde l\'équilibre ! 🎪')}
        <div class="card">${GAME.rules()}</div><div class="card keep">${sensorLine()}</div>
        <p class="center muted">On commence par un <b>entraînement</b>.</p>
        ${UI.hostButton('Entraînement 🎯')}`;
    },
    play(S, g) {
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
      </ol>
      <div class="muted" style="font-size:.92rem">3 manches : brise, vent fort, tempête · dernier debout : <b>+100</b>, puis 60, 40, 20, 10</div>`,
    tv: (S, g) => (screens[g.phase] || screens.intro)(S, g),
    key: (S, g) => [g.phase, g.round, g.practice, S.spectator ? '' : g.me, MANETTE.isReady(g, S.you), needsPermission(), hasSensor()].join('|'),
    screen: (S, g) => (screens[g.phase] || screens.intro)(S, g),
    onState: (S, g) => {
      cur = g;
      if (g.phase === 'play') {
        const k = `${g.round}|${g.practice}|${g.seed}`;
        if (sim.round !== k) { sim.round = k; reset(); sim.falls = 0; sim.goAt = Date.now() + g.goIn - (g.goIn ? 0 : g.elapsed); }
        Object.assign(sim, { practice: g.practice, seed: g.seed, level: g.level });
        if (g.me === 'out' && !g.practice) sim.out = true;
        if (!raf) raf = requestAnimationFrame(frame);
      }
    },
    live: { ready: (S, g) => MANETTE.readyChips(g), standing: (S, g) => (g.practice ? `<div class="pr-chips">${MANETTE.readyChips(g)}</div>` : standingList(g)) },
    bind: (S, g, root) => {
      root.querySelectorAll('[data-perm]').forEach((b) => b.addEventListener('click', () => enable().then(() => UI.refresh())));
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
