// 🤠 Le Duel de cowboys — le téléphone détecte quand on le lève (accéléromètre).
// Pas de capteur (ordi, autorisation refusée) ? On touche l'écran pour tirer.
(() => {
  const { esc, P, av, name } = UI;

  // ═══ Capteur : un geste brusque = on dégaine ═══
  const THRESH = 140;           // « à-coup » (m/s³) : main immobile ≈ 0–20, geste vif ≈ 200+
  const motion = { events: 0, prev: null, lastT: 0, on: false, denied: false };
  let onDraw = null;            // fonction appelée quand on dégaine (selon la phase)
  function onMotion(e) {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a || a.x == null) return;
    motion.events++;
    const t = performance.now();
    const dt = Math.min(0.1, motion.lastT ? (t - motion.lastT) / 1000 : 1 / 60);
    motion.lastT = t;
    const cur = [a.x, a.y, a.z];
    if (motion.prev && onDraw) {
      const j = Math.hypot(cur[0] - motion.prev[0], cur[1] - motion.prev[1], cur[2] - motion.prev[2]) / dt;
      if (j > THRESH) onDraw('motion');
    }
    motion.prev = cur;
  }
  if (window.DeviceMotionEvent) window.addEventListener('devicemotion', onMotion);
  const askable = () => !!window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function';
  const hasSensor = () => motion.events > 5;
  const needsPermission = () => askable() && !motion.on && !motion.denied && !hasSensor();
  const enableMotion = () => (!askable() || motion.on ? Promise.resolve(true)
    : DeviceMotionEvent.requestPermission().then((r) => { motion.on = r === 'granted'; motion.denied = !motion.on; return motion.on; }).catch(() => false));
  const sensorLine = () => (needsPermission() ? '<button class="big dr-perm" data-perm>📳 Activer le capteur de mouvement</button>'
    : hasSensor() ? '<p class="center dr-ok">📳 Capteur prêt</p>' : '<p class="muted center">Pas de capteur : tu tireras en <b>touchant l\'écran</b>.</p>');

  const bang = () => { MANETTE.noise(0.35, 0.4, 2400, -2000); navigator.vibrate?.([60]); };
  const fireSound = () => { MANETTE.tone(880, 0.12, 'square', 0.15); MANETTE.tone(1320, 0.18, 'square', 0.15, 0, 0.1); };

  // ═══ Entraînement local : signal factice, temps de réaction affiché ═══
  const pr = { state: 'idle', t0: 0, timer: 0, last: null, best: null, msg: '' };
  function practiceGo() {
    clearTimeout(pr.timer);
    pr.state = 'lower'; pr.msg = 'Baisse ton téléphone contre ta jambe…';
    paintPractice();
    pr.timer = setTimeout(() => {
      pr.state = 'wait'; pr.msg = 'Attends le signal… ne bouge pas !'; paintPractice();
      pr.timer = setTimeout(() => { pr.state = 'fire'; pr.t0 = performance.now(); fireSound(); navigator.vibrate?.(80); paintPractice(); }, 1500 + Math.random() * 3000);
    }, 2000);
  }
  function practiceDraw() {
    if (pr.state === 'wait') { clearTimeout(pr.timer); pr.state = 'idle'; pr.msg = '😬 Faux départ ! Tu as bougé avant le signal.'; navigator.vibrate?.(300); }
    else if (pr.state === 'fire') {
      const rt = Math.round(performance.now() - pr.t0);
      bang();
      pr.last = rt; pr.best = Math.min(pr.best ?? Infinity, rt); pr.state = 'idle';
      pr.msg = `💥 ${rt} ms ${rt < 300 ? '⚡ Rapide !' : rt < 500 ? '👍' : '🐢'}`;
    } else return;
    paintPractice();
  }
  function paintPractice() {
    const el = document.querySelector('[data-pr]');
    if (!el) return;
    el.className = `du-zone ${pr.state}`;
    el.innerHTML = pr.state === 'fire' ? '<b class="du-fire">FEU !</b>'
      : `<b>${pr.state === 'idle' ? '🤠' : pr.state === 'lower' ? '⬇️' : '🤫'}</b><span>${esc(pr.msg || 'Touche « Essayer » pour un duel d\'essai')}</span>${pr.best ? `<small>Meilleur temps : ${pr.best} ms</small>` : ''}`;
  }

  // ═══ Vrai duel ═══
  let round = 0, armedAt = 0, fireT = 0, sent = false, cur = null, S0 = null;
  function draw(how) {
    if (!cur || sent) return;
    const g = cur;
    if (g.cur?.me !== 'duel' || g.cur.drew) return;
    if (g.phase === 'aim') {
      if (Date.now() < armedAt) return;                 // on baisse encore son arme : rien ne compte
      sent = true; UI.send('draw', 0); navigator.vibrate?.(300);
    } else if (g.phase === 'fire') {
      sent = true; bang();
      UI.send('draw', Math.round(performance.now() - fireT));
    }
  }

  const duelists = (g, big) => {
    const [a, b] = g.cur.pair;
    return `<div class="du-vs ${big ? 'big' : ''}"><div>${av(P(a), 'lg')}<b>${name(a)}</b></div><span class="du-x">VS</span><div>${av(P(b), 'lg')}<b>${name(b)}</b></div></div>`;
  };
  const step = (g) => `Duel ${g.round} / ${g.totalRounds}`;

  const screens = {
    intro(S, g) {
      return `${UI.header(1, 1, 'Le Duel de cowboys', 'Qui dégaine le plus vite ? 🤠')}
        <div class="card">${GAME.rules()}</div>
        <div class="card keep">${sensorLine()}</div>
        <p class="center muted">On commence par un <b>entraînement</b> pour essayer.</p>
        ${UI.hostButton('Entraînement 🎯')}`;
    },

    practice(S, g) {
      if (S.spectator) return `<div class="dr-tv">${MANETTE.practiceBanner('Chacun fait des duels d\'essai sur son téléphone. Appuyez sur « Je suis prêt » quand vous avez compris.')}</div>`;
      return `${UI.header(1, 1, '🎯 Entraînement · rien ne compte', 'Essaie de dégainer !')}
        <div class="card keep center">
          <p style="margin-top:0">1. Tiens ton téléphone <b>baissé contre ta jambe</b>, écran vers toi.<br>2. Au signal <b>FEU !</b> lève-le d'un coup sec.</p>
          ${sensorLine()}
          <button class="du-zone idle" data-pr data-tapdraw></button>
          <button class="full" data-try>🔫 Essayer</button>
          <div style="margin-top:10px">${MANETTE.readyBtn(S, g)}</div></div>
        <div class="card"><div class="pr-chips" data-live="ready"></div></div>
        ${UI.isHost() ? '<div class="center"><a class="link" data-host-action="next">Passer l\'entraînement</a></div>' : ''}`;
    },

    aim(S, g) {
      const c = g.cur;
      if (c.me === 'duel') {
        return `${UI.header(g.round, g.totalRounds, step(g), 'Duel ! 🤠')}${duelists(g)}
          <button class="du-zone ${c.drew ? 'early' : 'wait'}" data-tapdraw><b>${c.drew ? '😬' : '🤫'}</b><span data-live="aimtxt"></span></button>`;
      }
      return `${UI.header(g.round, g.totalRounds, step(g), 'Faites vos paris 💰')}${duelists(g)}
        <div class="card keep center"><p style="margin-top:0"><b>Qui va gagner ?</b> Bon pari : +30</p>
          <div class="row">${c.pair.map((id) => `<button class="${c.myBet === id ? '' : 'ghost'}" data-bet="${esc(id)}">${name(id)}</button>`).join('')}</div>
          <p class="muted" style="margin-bottom:0">Silence… on attend le signal 🤫</p></div>`;
    },

    fire(S, g) {
      const c = g.cur;
      if (c.me === 'duel') {
        return `${UI.header(g.round, g.totalRounds, step(g), 'FEU ! 🔫')}${duelists(g)}
          <button class="du-zone ${c.drew ? 'done' : 'fire'}" data-tapdraw>${c.drew ? '<b>💥</b><span>Tiré ! Résultat…</span>' : '<b class="du-fire">FEU !</b><span>Lève ton téléphone (ou touche ici) !</span>'}</button>`;
      }
      return `${UI.header(g.round, g.totalRounds, step(g), 'FEU ! 🔫')}${duelists(g)}<div class="du-zone fire"><b class="du-fire">FEU !</b></div>`;
    },

    result(S, g) {
      const c = g.cur;
      const line = (id) => `<div class="score">${av(P(id))}<span class="n">${name(id)}${c.winner === id ? ' 🏆' : ''}</span><span class="p">${c.early.includes(id) ? '😬 faux départ' : c.rt[id] != null ? `${c.rt[id]} ms` : '😴 pas tiré'}</span></div>`;
      return `${UI.header(g.round + 1, g.totalRounds + 1, step(g), c.winner ? `${name(c.winner)} gagne le duel ! 🤠` : esc(c.why))}
        <div class="card center reveal">${c.winner ? `${av(P(c.winner), 'lg')}<h2>${c.why === 'early' ? 'Victoire sur faux départ adverse !' : 'La gâchette la plus rapide !'}</h2>` : `<h2>${esc(c.why)}</h2>`}</div>
        <div class="card">${c.pair.map(line).join('')}</div>
        ${Object.keys(c.betsList).length ? `<div class="card"><h2>Paris</h2>${Object.entries(c.betsList).filter(([id]) => P(id)).map(([id, b]) => `<div class="score">${av(P(id), 'sm')}<span class="n">${name(id)} → ${name(b)}</span><span>${b === c.winner ? '✅' : '❌'}</span></div>`).join('')}</div>` : ''}
        <div class="card gains-card">${UI.gainsBlock(c.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(c.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Duel suivant 🤠')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  const GAME = {
    rules: () => `<ol class="rules">
        <li>Deux duellistes tiennent leur téléphone <b>baissé contre la jambe</b>.</li>
        <li>Après un silence imprévisible : <b>FEU !</b> Le premier qui <b>lève son téléphone</b> gagne.</li>
        <li>Bouger avant le signal = <b>faux départ</b>, duel perdu ! Les autres parient sur le gagnant.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">Duel gagné : <b>+100</b> · bon pari : <b>+30</b> · pas de capteur ? on touche l'écran</div>`,
    tv: (S, g) => {
      if (g.phase === 'practice') return screens.practice(S, g);
      if (g.phase === 'aim') return `${UI.header(g.round, g.totalRounds, step(g), 'Silence… 🤫')}${duelists(g, true)}<div class="du-zone wait big"><b>🤫</b><span>Baissez vos armes… attendez le signal</span><small>${g.cur.bets} pari${g.cur.bets > 1 ? 's' : ''}</small></div>`;
      if (g.phase === 'fire') return `${UI.header(g.round, g.totalRounds, step(g), 'FEU ! 🔫')}${duelists(g, true)}<div class="du-zone fire big"><b class="du-fire">FEU !</b></div>`;
      return null;
    },
    key: (S, g) => [g.phase, g.round, g.cur?.myBet, g.cur?.drew, MANETTE.isReady(g, S.you), needsPermission(), hasSensor()].join('|'),
    screen: (S, g) => screens[g.phase](S, g),
    onState: (S, g) => {
      cur = g; S0 = S;
      if (g.phase === 'aim' && round !== g.round) { round = g.round; sent = false; armedAt = Date.now() + (g.cur.armIn || 0); }
      if (g.phase === 'fire' && fireT === 0) {
        fireT = performance.now();
        if (!S.spectator) { fireSound(); if (g.cur.me === 'duel') navigator.vibrate?.(80); }
        else fireSound();
      }
      if (g.phase !== 'fire') fireT = 0;
      onDraw = g.phase === 'practice' ? practiceDraw : (g.phase === 'aim' || g.phase === 'fire') && !S.spectator ? draw : null;
    },
    live: {
      ready: (S, g) => MANETTE.readyChips(g),
      aimtxt: () => (Date.now() < armedAt ? 'Baisse ton téléphone contre ta jambe…' : 'Ne bouge plus… attends « FEU ! »'),
    },
    bind: (S, g, root) => {
      root.querySelectorAll('[data-perm]').forEach((b) => b.addEventListener('click', () => enableMotion().then(() => UI.refresh())));
      root.querySelectorAll('[data-bet]').forEach((b) => b.addEventListener('click', () => UI.send('bet', b.dataset.bet)));
      root.querySelector('[data-try]')?.addEventListener('click', () => { enableMotion(); practiceGo(); });
      root.querySelectorAll('[data-tapdraw]').forEach((z) => z.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (g.phase === 'practice') practiceDraw(); else draw('tap');
      }));
      paintPractice();
      if (!hasSensor() && motion.on) setTimeout(() => hasSensor() && UI.refresh(), 1500);
    },
  };
  // le texte « baisse ton arme / ne bouge plus » change tout seul
  setInterval(() => { const el = document.querySelector('[data-live="aimtxt"]'); if (el && cur?.phase === 'aim') el.textContent = GAME.live.aimtxt(); }, 250);
  UI.registerGame('duel', GAME);
})();
