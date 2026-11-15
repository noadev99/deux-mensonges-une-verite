// 🚩 La Course au drapeau — le téléphone mesure les secousses et envoie l'énergie au serveur.
// Pas de capteur (ordi, autorisation refusée) ? On peut taper très vite sur un gros bouton.
(() => {
  const { esc, P, av, name } = UI;
  const colorOf = (id) => { const p = P(id); return p?.look ? PERSO.color(p.look) : p?.color || '#fff'; };

  // ═══ Capteur de secousses ═══
  const motion = { on: false, events: 0, acc: 0, level: 0, prev: null, lastT: 0, asked: false, denied: false };
  let racing = false;
  function onMotion(e) {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a || a.x == null) return;
    motion.events++;
    const t = performance.now();
    const dt = Math.min(0.1, motion.lastT ? (t - motion.lastT) / 1000 : 1 / 60);
    motion.lastT = t;
    const cur = [a.x, a.y, a.z];
    if (motion.prev) {
      // variation brutale de l'accélération = secousse (la gravité, constante, ne compte pas)
      // « à-coup » (m/s³) : indépendant de la fréquence du capteur. Main immobile ≈ 0–20, secousse très forte ≈ 400+
      const j = Math.hypot(cur[0] - motion.prev[0], cur[1] - motion.prev[1], cur[2] - motion.prev[2]) / dt;
      if (racing) motion.acc += Math.max(0, j - 40) * dt * 0.055;
      motion.level = motion.level * 0.9 + (j / 40) * 0.1;
    }
    motion.prev = cur;
  }
  // on écoute tout de suite : sur Android les mesures arrivent sans rien demander
  if (window.DeviceMotionEvent) window.addEventListener('devicemotion', onMotion);
  const askable = () => !!window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function';
  function enableMotion() {
    // iPhone : il faut une autorisation, demandée lors d'un appui
    if (!askable() || motion.on) return Promise.resolve(true);
    return DeviceMotionEvent.requestPermission()
      .then((r) => { motion.on = r === 'granted'; motion.denied = !motion.on; return motion.on; })
      .catch(() => false);
  }
  const needsPermission = () => askable() && !motion.on && !motion.denied && !hasSensor();
  const hasSensor = () => motion.events > 5;

  // envoi au serveur 7 fois par seconde
  setInterval(() => {
    if (!racing || motion.acc <= 0.05) return;
    const e = Math.round(motion.acc * 100) / 100; motion.acc = 0;
    UI.send('shake', e);
  }, 140);

  // ═══ Affichage commun : la piste ═══
  let goAt = 0, goRound = 0;
  const lanes = (g, big) => {
    const mat = g.mode.id === 'mat';
    return `<div class="dr-lanes ${mat ? 'mat' : ''} ${big ? 'big' : ''}">
      ${g.players.filter(P).map((id) => `<div class="dr-lane" style="--c:${colorOf(id)}">
        <span class="dr-goal">🚩</span>
        <span class="dr-runner" data-id="${esc(id)}" style="--k:${pct(g, id) / 100}">${av(P(id), big ? '' : 'sm')}<i class="dr-fx"></i></span>
        <b class="dr-name">${name(id)}</b>
      </div>`).join('')}
    </div>`;
  };
  const pct = (g, id) => Math.min(100, ((g.pos[id] || 0) / g.mode.len) * 100).toFixed(1);
  const lightHtml = (g) => (g.light ? `<div class="dr-light ${g.light}"><i></i><i></i><i></i></div>` : '');
  const RULES = `<div class="rg-rules">
      <div><span class="rg-ico">📳</span><b>Secoue !</b><small>plus tu secoues fort et vite, plus tu cours</small></div>
      <div><span class="rg-ico">🚦</span><b>Feu rouge</b><small>au rouge, on s'arrête net… sinon retour au départ !</small></div>
      <div><span class="rg-ico">🧗</span><b>Le mât</b><small>si tu t'arrêtes, tu glisses vers le bas</small></div>
      <div><span class="rg-ico">✋</span><b>Tiens bien</b><small>ton téléphone (dragonne conseillée 😅)</small></div>
    </div>`;

  const sensorCard = () => {
    if (needsPermission()) return `<button class="big dr-perm" data-perm>📳 Activer le capteur de secousses</button>`;
    if (motion.denied) return `<p class="muted center">Capteur refusé : tu joueras en tapant très vite sur l'écran.</p>`;
    if (!window.DeviceMotionEvent) return `<p class="muted center">Pas de capteur sur cet appareil : tu joueras en tapant très vite sur l'écran.</p>`;
    return `<p class="center dr-ok">📳 Capteur prêt <span data-live="sensor"></span></p>`;
  };

  const screens = {
    intro(S, g) {
      const list = g.modes.map((m, i) => `<span class="dr-mode">${i + 1}. ${m.emoji} ${esc(m.name)}</span>`).join('');
      if (S.spectator) {
        return `<div class="rg-title"><span class="rg-art" style="background:#3fbf8f">${ICONS.game('drapeau')}</span><div><h1>La Course au drapeau</h1><p class="white">Secouez vos téléphones comme jamais !</p></div></div>
          ${RULES}<div class="dr-modes">${list}</div>
          <p class="center white tv-big">${name(S.hostId)} lance la course depuis son téléphone 📱</p>`;
      }
      return `<div class="phase"><div class="step">${g.totalRounds} manches</div><div class="t">La Course au drapeau 🚩</div></div>
        <div class="card center keep">${RULES}<div class="dr-modes">${list}</div>${sensorCard()}</div>
        ${UI.hostButton('À vos marques ! 🚩')}`;
    },

    race(S, g) {
      const head = `<div class="dr-head"><span class="dr-mtitle">${g.mode.emoji} ${esc(g.mode.name)}</span><span class="muted">Manche ${g.round}/${g.totalRounds}</span></div>`;
      if (S.spectator) {
        return `<div class="dr-tv">${head.replace('muted', 'white')}<p class="white center">${esc(g.mode.hint)}</p>
          <div class="dr-stage">${lightHtml(g)}${lanes(g, true)}<div class="dr-count" data-count></div></div></div>`;
      }
      if (g.me === 'wait') return `${head}<div class="card center"><p>⏳ Tu courras à la prochaine manche !</p></div>${lanes(g)}`;
      const tap = !hasSensor() && !needsPermission();
      return `<div class="dr-phone ${g.me}" style="--pc:${colorOf(S.you)}">
          ${head}
          <p class="center" style="margin:4px 0 8px">${esc(g.mode.hint)}</p>
          <div class="dr-stage">${lightHtml(g)}<div class="dr-count" data-count></div>
          ${needsPermission() ? '<button class="big dr-perm" data-perm>📳 Activer le capteur</button>' : ''}
          <button class="dr-zone ${tap ? 'tap' : ''}" data-tap>
            <span class="dr-phone-ico">📱</span>
            <b data-live="cta"></b>
            <span class="dr-meter"><i data-meter></i></span>
            <small>${tap ? 'Pas de capteur : tape le plus vite possible ici !' : 'Pas de capteur ? Tu peux aussi taper ici'}</small>
          </button></div>
          ${lanes(g)}
        </div>
        ${UI.isHost() ? '<div class="center"><a class="link" data-host-action="next">Arrêter la manche</a></div>' : ''}`;
    },

    roundEnd(S, g) {
      const r = g.result;
      const last = g.round >= g.totalRounds;
      const win = r.finished[0];
      return `${UI.header(g.round + 1, g.totalRounds + 1, `Manche ${g.round} sur ${g.totalRounds} · ${g.mode.emoji} ${esc(g.mode.name)}`, win ? `${name(win)} attrape le drapeau ! 🚩` : 'Personne n\'a atteint le drapeau 😅')}
        <div class="card"><h2>Arrivée</h2>
          ${r.ranking.filter(P).map((id, i) => `<div class="score"><b>${i + 1}</b>${av(P(id))}<span class="n">${name(id)} <small class="muted">· ${r.times[id] ? (r.times[id] / 1000).toFixed(1) + ' s' : Math.round((r.pos[id] / g.mode.len) * 100) + ' %'}</small></span>${r.gains[id] ? `<span class="plus">+${r.gains[id].total}</span>` : ''}</div>`).join('')}</div>
        <div class="card"><h2>Total</h2>${UI.scoreboard(g.scores)}</div>
        ${UI.hostButton(last ? 'Voir le podium 🏆' : 'Manche suivante 🚩')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  // ═══ Animation locale : compte à rebours, jauge de secousse ═══
  let raf = 0, cur = null;
  function anim() {
    raf = 0;
    if (!cur || cur.phase !== 'race') return;
    const left = goAt - Date.now();
    document.querySelectorAll('[data-count]').forEach((el) => {
      const txt = left > 0 ? String(Math.ceil(left / 1000)) : left > -900 ? 'SECOUE !' : '';
      if (el.textContent !== txt) { el.textContent = txt; el.classList.toggle('go', left <= 0); }
    });
    const meter = document.querySelector('[data-meter]');
    if (meter) {
      const lvl = Math.min(1, (hasSensor() ? motion.level / 9 : tapLevel / 6));
      meter.style.width = `${Math.round(lvl * 100)}%`;
      const ico = document.querySelector('.dr-phone-ico');
      if (ico) ico.style.transform = `rotate(${(Math.random() - 0.5) * 60 * lvl}deg) scale(${1 + lvl * 0.3})`;
    }
    tapLevel *= 0.94;
    raf = requestAnimationFrame(anim);
  }
  let tapLevel = 0;

  UI.registerGame('drapeau', {
    rules: () => `
      <ol class="rules">
        <li><b>Secoue ton téléphone</b> le plus fort et le plus vite possible : ton perso court vers le drapeau 🚩.</li>
        <li>3 manches : 🏃 <b>le sprint</b>, 🚦 <b>feu rouge, feu vert</b> (au rouge, si tu bouges, retour au départ !) et 🧗 <b>le mât savonné</b> (si tu t'arrêtes, tu glisses).</li>
        <li>Pas de capteur ? Tape très vite sur le gros bouton. Tiens bien ton téléphone !</li>
      </ol>
      <div class="muted" style="font-size:.92rem">Points par manche : 8, 5, 3, 2, 1 aux premiers arrivés au drapeau</div>`,

    key: (S, g) => [g.phase, g.round, S.spectator ? '' : g.me, needsPermission(), motion.denied, hasSensor()].join('|'),
    screen: (S, g) => (screens[g.phase] || screens.intro)(S, g),
    tv: (S, g) => (screens[g.phase] || screens.intro)(S, g),

    onState: (S, g) => {
      cur = g;
      racing = g.phase === 'race' && g.me === 'race';
      if (g.phase === 'race') {
        // heure du départ : fixée une fois par manche (après le départ, le serveur envoie 0)
        if (g.goIn > 0) { goAt = Date.now() + g.goIn; goRound = g.round; }
        else if (goRound !== g.round) { goAt = Date.now() - 5000; goRound = g.round; }
        // les persos avancent en douceur (transition CSS) au lieu de tout redessiner
        document.querySelectorAll('.dr-runner[data-id]').forEach((el) => {
          const id = el.dataset.id;
          el.style.setProperty('--k', pct(g, id) / 100);
          el.classList.toggle('fast', (g.rate[id] || 0) > 2.5);
          el.classList.toggle('caught', g.caught.includes(id));
          el.classList.toggle('done', g.finished.includes(id));
        });
        document.querySelectorAll('.dr-light').forEach((el) => { el.className = `dr-light ${g.light || ''}`; });
        if (!raf) raf = requestAnimationFrame(anim);
      } else { motion.acc = 0; }
    },

    live: {
      sensor: () => (hasSensor() ? '✅' : '(secoue pour tester)'),
      cta: (S, g) => (g.me === 'done' ? `🚩 Arrivé ${g.finished.indexOf(S.you) + 1 === 1 ? '1er' : `${g.finished.indexOf(S.you) + 1}ᵉ`} !`
        : g.caught.includes(S.you) ? '🚨 Pris au rouge : retour au départ !' : g.light === 'red' ? '✋ STOP !' : 'SECOUE !'),
    },

    bind: (S, g, root) => {
      root.querySelectorAll('[data-perm]').forEach((b) => b.addEventListener('click', () => enableMotion().then(() => UI.refresh())));
      const zone = root.querySelector('[data-tap]');
      if (zone) {
        zone.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (needsPermission()) enableMotion().then(() => UI.refresh());
          if (!racing || Date.now() < goAt) return;
          motion.acc += hasSensor() ? 0.6 : 1.4;     // taper rapporte moins que secouer
          tapLevel = Math.min(8, tapLevel + 1.2);
          navigator.vibrate?.(8);
        });
      }
      // le capteur se vérifie tout seul : on redessine quand il commence à répondre
      if (!hasSensor() && motion.on) setTimeout(() => hasSensor() && UI.refresh(), 1500);
    },
  });
})();
