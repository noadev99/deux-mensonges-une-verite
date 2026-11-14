// ─────────────────────────────────────────────────────────────────────────────
// Cœur client : connexion, accueil, salon, choix du jeu, classement de soirée.
// Chaque jeu s'enregistre avec UI.registerGame(id, { key, screen, live, bind, rules }).
// ─────────────────────────────────────────────────────────────────────────────
const UI = (() => {
  // reconnexion rapide et sans fin (un téléphone peut rester en veille longtemps)
  const socket = io({ reconnectionDelay: 500, reconnectionDelayMax: 2000, timeout: 8000 });
  const $app = document.getElementById('app');
  const GAMES = {}; // modules d'affichage des jeux
  let S = null;
  let lastKey = null;
  let confettiFor = null; // évite de relancer les confettis à chaque mise à jour
  let catalog = []; // liste des jeux (pour l'accueil, avant d'avoir rejoint un salon)
  fetch('/api/games').then((r) => r.json()).then((c) => { catalog = c; if (lastKey === 'home') renderHome(); }).catch(() => {});

  const ICON = ICONS.ui;
  const crown = `<span class="crown">${ICON.crown}</span>`;

  // ─── Helpers partagés avec les jeux ──────────────────────────────────────
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const P = (id) => S && S.players.find((p) => p.id === id);
  const av = (p, cls = '') => (p ? `<span class="av ${cls}" style="background:${p.color}">${typeof p.avatar === 'number' ? ICONS.avatar(p.avatar) : esc(p.avatar)}</span>` : '');
  const name = (id) => esc(P(id)?.name ?? '?');
  const isHost = () => S && S.hostId === S.you;
  const gameInfo = (id) => S.games.find((g) => g.id === (id || S.gameId));

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }

  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#ff6fa3', '#ffc23d', '#2fd3a7', '#6d8bff', '#ffffff'];
    for (let i = 0; i < 90; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      c.style.animationDuration = 2.2 + Math.random() * 2 + 's';
      c.style.animationDelay = Math.random() * .6 + 's';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 5000);
    }
  }

  const send = (type, payload) => socket.emit('action', { type, payload });
  // action de l'hôte : on joint le numéro de l'état affiché, le serveur ignore les clics en retard
  const sendHost = (type) => socket.emit('action', { type, v: S && S.v });

  // Bouton principal réservé à l'hôte, collé en bas de l'écran
  const hostButton = (label, action = 'next') => `<div class="dock">${isHost()
    ? `<button class="alt" data-host-action="${action}">${label}</button>`
    : `<p>${name(S.hostId)} ${crown} lance la suite…</p>`}</div>`;
  const forceLink = (label, action = 'next') => isHost() ? `<p class="center"><a class="link" data-host-action="${action}">${label}</a></p>` : '';

  // Classement trié par score (scores = {pid: points}, deltas optionnels)
  function scoreboard(scores, deltas = {}) {
    return Object.keys(scores).filter(P).sort((a, b) => scores[b] - scores[a]).map((id, i) => `
      <div class="score"><b>${i + 1}</b>${av(P(id))}<span class="n">${name(id)}${id === S.you ? ' (toi)' : ''}</span>
      ${deltas[id] ? `<span class="plus">+${deltas[id]}</span>` : ''}<span class="p">${scores[id]}</span></div>`).join('');
  }

  function podium(scores) {
    const ranked = Object.keys(scores).filter(P).sort((a, b) => scores[b] - scores[a]);
    const order = [ranked[1], ranked[0], ranked[2]];
    const h = [100, 140, 72], col = ['#efe8fb', '#ffc23d', '#ff6fa3'], pos = [2, 1, 3];
    return `<div class="podium">${order.map((id, i) => id ? `
      <div class="col reveal" style="animation-delay:${[.25, .5, 0][i]}s">${av(P(id), i === 1 ? 'lg' : '')}<div style="font-weight:600;margin:6px 0 0">${name(id)}</div><div class="muted">${scores[id]} pts</div>
      <div class="bar" style="height:${h[i]}px;background:${col[i]}">${pos[i]}</div></div>` : '<div class="col"></div>').join('')}</div>`;
  }

  // Chrono : <span class="timer"> mis à jour toutes les 250 ms à partir du temps restant envoyé par le serveur
  const timer = (remaining) => remaining > 0 ? `<span class="timer" data-ends="${Date.now() + remaining}">${Math.ceil(remaining / 1000)} s</span>` : '';
  setInterval(() => {
    document.querySelectorAll('.timer[data-ends]').forEach((el) => {
      const left = Math.max(0, Number(el.dataset.ends) - Date.now());
      const sec = Math.ceil(left / 1000);
      el.textContent = sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : `${sec} s`;
      el.classList.toggle('hurry', left < 10000);
    });
  }, 250);
  // Temps restant (ms) du chrono affiché, pour envoyer automatiquement juste avant la fin
  const timeLeft = () => { const el = document.querySelector('.timer[data-ends]'); return el ? Number(el.dataset.ends) - Date.now() : Infinity; };

  // Barre de progression + titre de phase
  const header = (round, total, step, title) => `
    <div class="progress"><div style="width:${total ? ((round - 1) / total) * 100 : 0}%"></div></div>
    <div class="phase"><div class="step">${step}</div><div class="t">${title}</div></div>`;

  // Détail des points gagnés : gains = {pid: {total, reasons:[{pts,label}]}}
  // Détail des points gagnés : replié par défaut derrière une petite flèche, en version compacte.
  // gains = {pid: {total, reasons:[{pts,label}]}}
  let gainsOpen = false; // reste ouvert/fermé d'un écran à l'autre si le joueur l'a ouvert
  function gainsBlock(gains) {
    const ids = Object.keys(gains || {}).filter(P).sort((a, b) => gains[b].total - gains[a].total);
    if (!ids.length) return '<div class="muted gains-none">Personne ne marque de points cette fois.</div>';
    const mine = gains[S.you]?.total;
    return `<details class="gains-d" ${gainsOpen ? 'open' : ''}>
      <summary><span class="gains-title">Détail des points</span>${mine ? `<span class="gains-me">toi : +${mine}</span>` : ''}</summary>
      <div class="gains">${ids.map((id) => `
        <div class="g"><div class="gl">${av(P(id), 'sm')}<span class="gn">${name(id)}</span><span class="plus">+${gains[id].total}</span></div>
        <ul>${gains[id].reasons.map((r) => `<li>+${r.pts} ${esc(r.label)}</li>`).join('')}</ul></div>`).join('')}</div>
    </details>`;
  }
  const gainTotals = (gains) => Object.fromEntries(Object.entries(gains || {}).map(([id, x]) => [id, x.total]));

  // Grille de joueurs cliquables (data-attr = nom de l'attribut pour bind)
  const playerGrid = (ids, selected, attr) => `<div class="grid">${ids.filter(P).map((id) =>
    `<button class="pick ${selected === id ? 'sel' : ''}" data-${attr}="${id}">${av(P(id))}<span>${name(id)}${id === S.you ? ' (toi)' : ''}</span></button>`).join('')}</div>`;

  // Écran de fin standard : podium + trophées + classement + boutons
  function endScreen(g) {
    return `
      <h1>Fin de partie</h1>
      <div class="card">${podium(g.scores)}</div>
      ${g.awards && g.awards.length ? `<div class="card"><h2>Trophées</h2>${g.awards.map((w) => `
        <div class="award"><span class="e">${ICON.trophy}</span><div><b>${esc(w.title)}</b> : ${w.winners.map(name).join(' & ')}<div class="muted" style="font-size:.9rem">${esc(w.desc)} (${w.value})</div></div></div>`).join('')}</div>` : ''}
      <div class="card"><h2>Classement</h2>${scoreboard(g.scores)}</div>
      ${endFooter()}`;
  }

  // Bas d'écran de fin de partie commun à tous les jeux
  function endFooter() {
    const last = S.history[S.history.length - 1];
    const mine = last && last.gains[S.you];
    return `
      ${mine ? `<p class="center white">+${mine} pts au classement de la soirée</p>` : ''}
      <div class="dock">${isHost()
        ? `<div class="row"><button class="ghost" data-core="restartGame">${ICON.again} Rejouer</button><button class="alt" data-core="toLobby">${ICON.dice} Autre jeu</button></div>`
        : `<p>${name(S.hostId)} ${crown} choisit la suite…</p>`}</div>`;
  }

  // ─── Connexion ────────────────────────────────────────────────────────────
  socket.on('connect', () => {
    setOffline(false);
    const saved = JSON.parse(localStorage.getItem('session') || 'null');
    if (saved) socket.emit('rejoin', saved);
    else if (lastKey !== 'home') renderHome(); // ne pas effacer un pseudo en cours de saisie
  });
  socket.on('disconnect', () => setOffline(true));
  // Le salon n'existe plus (serveur redémarré, salon vide trop longtemps…)
  socket.on('rejoinFailed', ({ code } = {}) => {
    if (S && S.code !== code) return; // on vient de créer/rejoindre un autre salon entre-temps
    const had = !!S;
    localStorage.removeItem('session');
    S = null;
    renderHome();
    if (had) toast('Ce salon n\'existe plus. Recrée un salon ou rejoins-en un autre.');
  });

  // Téléphone qui se réveille, onglet qui revient au premier plan, réseau qui revient :
  // on se reconnecte tout de suite au lieu d'attendre.
  const wake = () => {
    if (document.visibilityState !== 'visible') return;
    if (!socket.connected) socket.connect();
    keepAwake();
  };
  // Tant qu'on est dans un salon : petit ping régulier pour que le serveur ne s'endorme pas
  setInterval(() => { if (S && document.visibilityState === 'visible') fetch('/api/ping', { cache: 'no-store' }).catch(() => {}); }, 4 * 60 * 1000);
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('pageshow', wake);
  window.addEventListener('online', wake);
  window.addEventListener('focus', wake);

  // Bandeau « Reconnexion… » (affiché seulement si la coupure dure plus d'une seconde)
  let offlineTimer = null;
  function setOffline(off) {
    clearTimeout(offlineTimer);
    let bar = document.getElementById('offline');
    if (!off) { bar?.remove(); return; }
    offlineTimer = setTimeout(() => {
      if (socket.connected || document.getElementById('offline')) return;
      bar = document.createElement('div');
      bar.id = 'offline';
      bar.className = 'offline';
      bar.innerHTML = '<span class="wait">📡</span> Reconnexion…';
      document.body.appendChild(bar);
    }, 1000);
  }

  // Empêche l'écran de se mettre en veille pendant qu'on est dans un salon
  let wakeLock = null;
  async function keepAwake() {
    if (!S || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    if (wakeLock && !wakeLock.released) return;
    try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* refusé (batterie faible…) : pas grave */ }
  }
  socket.on('joined', (d) => localStorage.setItem('session', JSON.stringify(d)));
  socket.on('errorMsg', toast);
  // Le serveur a été mis à jour pendant que la page était ouverte : on recharge la nouvelle version
  const outdated = (build) => {
    if (!build || !window.BUILD || build === window.BUILD) return false;
    if (sessionStorage.getItem('reloadedFor') === build) return false; // évite une boucle
    sessionStorage.setItem('reloadedFor', build);
    location.reload();
    return true;
  };
  socket.on('hello', ({ build } = {}) => outdated(build));
  socket.on('state', (s) => {
    if (outdated(s.build)) return;
    const first = !S;
    S = s;
    render();
    if (first) keepAwake();
  });

  // ─── Accueil ──────────────────────────────────────────────────────────────
  function renderHome() {
    lastKey = 'home';
    $app.className = '';
    document.body.style.removeProperty('--game');
    const code = new URLSearchParams(location.search).get('salon') || '';
    const boxes = catalog.map((g) => `<span class="box" style="background:${g.color}" title="${esc(g.name)}">${ICONS.game(g.id)}</span>`).join('');
    $app.innerHTML = `
      <div class="logo"><span>Soirée</span><br><span>Jeux</span></div>
      <div class="boxes">${boxes}</div>
      <p class="tag">${catalog.length || 'Des'} jeux à jouer entre amis, chacun sur son téléphone.</p>
      <div class="card stack">
        <label for="name"><h2 style="margin:0">Ton pseudo</h2></label>
        <input id="name" maxlength="20" placeholder="Ex. : Noa" autocomplete="nickname" value="${esc(localStorage.getItem('name') || '')}" />
        ${code ? '' : '<button class="full" id="create">Créer un salon</button>'}
      </div>
      ${code ? '' : '<div class="or">ou rejoins tes amis</div>'}
      <div class="card stack">
        <label for="code"><h2 style="margin:0">${code ? 'Tu es invité(e) dans le salon' : 'Code du salon'}</h2></label>
        <input id="code" class="codeinput" maxlength="4" placeholder="ABCD" autocomplete="off" value="${esc(code)}" />
        <button class="full alt" id="join" style="--game:var(--blue)">Rejoindre</button>
      </div>
      ${code ? '<p class="center"><a class="link" href="/">Créer mon propre salon</a></p>' : ''}`;
    const getName = () => { const n = document.getElementById('name').value.trim(); localStorage.setItem('name', n); return n; };
    const c = document.getElementById('create');
    if (c) c.onclick = () => socket.emit('create', { name: getName() });
    const join = () => socket.emit('join', { name: getName(), code: document.getElementById('code').value });
    document.getElementById('join').onclick = join;
    document.getElementById('code').addEventListener('keydown', (e) => e.key === 'Enter' && join());
  }

  // ─── Salon ────────────────────────────────────────────────────────────────
  function lobbyScreen() {
    const g = gameInfo();
    const n = S.players.filter((p) => p.connected).length;
    const missing = Math.max(0, g.minPlayers - n);
    const shown = isHost() ? S.games : S.games.filter((x) => x.id === S.gameId);
    return `
      <div class="code-label">Code du salon</div>
      <div class="code">${[...S.code].map((c) => `<span>${c}</span>`).join('')}</div>
      <div class="invite"><button class="ghost" data-invite>${ICON.send} Inviter des amis</button></div>

      <div class="card">
        <div class="cardhead"><h2>Joueurs</h2><span class="muted">${n} / 16</span></div>
        <div class="players" data-live="lobbyPlayers"></div>
      </div>

      <div class="card">
        <h2>${isHost() ? 'Choisis un jeu' : "Le jeu choisi par l'hôte"}</h2>
        <div class="games ${shown.length === 1 ? 'solo' : ''}">${shown.map((x) => {
          const tag = isHost() ? 'button' : 'div';
          return `<${tag} class="gamecard ${x.id === S.gameId ? 'sel' : ''}" data-game="${x.id}" style="--c:${x.color}">
            <span class="lid">${ICONS.game(x.id)}</span>
            <span class="info"><div class="t">${esc(x.name)}</div><div class="d">${esc(x.tagline)}</div>
            <div class="m"><span>${ICON.players}${x.minPlayers} à ${x.maxPlayers}</span><span>${ICON.clock}${esc(x.duration)}</span></div></span></${tag}>`;
        }).join('')}</div>
      </div>

      ${GAMES[S.gameId]?.rules ? `<div class="card"><details><summary>Comment on joue à ${esc(g.name)} ?</summary>${GAMES[S.gameId].rules()}</details></div>` : ''}
      ${soireeCard()}
      <p class="center"><a class="link" data-leave>Quitter le salon</a></p>

      <div class="dock">${isHost()
        ? `<button class="alt" data-core="startGame" ${missing ? 'disabled' : ''}>${missing ? `Il manque ${missing} joueur${missing > 1 ? 's' : ''}` : `Lancer ${esc(g.name)}`}</button>`
        : `<p>${name(S.hostId)} ${crown} va lancer la partie…</p>`}</div>`;
  }

  function soireeCard() {
    if (!S.history.length) return '';
    const ranked = [...S.players].sort((a, b) => b.soiree - a.soiree);
    return `<div class="card">
      <h2>Classement de la soirée</h2>
      ${ranked.map((p, i) => `<div class="score"><b>${i === 0 ? crown : i + 1}</b>${av(p)}<span class="n">${esc(p.name)}${p.id === S.you ? ' (toi)' : ''}</span><span class="p">${p.soiree}</span></div>`).join('')}
      <details style="margin-top:10px"><summary>${S.history.length} partie${S.history.length > 1 ? 's' : ''} jouée${S.history.length > 1 ? 's' : ''}</summary>
        ${S.history.map((h) => `<div class="muted" style="margin-top:6px;display:flex;align-items:center;gap:8px"><span class="mini" style="background:${gameInfo(h.gameId)?.color}">${ICONS.game(h.gameId)}</span> ${esc(gameInfo(h.gameId)?.name)} : gagnée par ${h.winners.map(name).join(' & ')}</div>`).join('')}
      </details>
      <p class="muted" style="font-size:.85rem;margin-bottom:0">À chaque partie, le premier gagne autant de points qu'il y a de joueurs, le dernier 1 point.</p>
    </div>`;
  }

  const LIVE = {
    lobbyPlayers: () => {
      const g = gameInfo();
      const n = S.players.filter((p) => p.connected).length;
      const seats = Math.max(0, g.minPlayers - n);
      return S.players.map((p) => `<div class="player ${p.connected ? '' : 'off'}">${av(p)}<span>${esc(p.name)}${p.id === S.hostId ? ' ' + crown : ''}${p.id === S.you ? ' (toi)' : ''}${p.connected ? '' : ' 💤'}</span></div>`).join('')
        + Array.from({ length: seats }, () => '<div class="player seat"><span class="av">?</span><span>En attente…</span></div>').join('');
    },
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────
  function screenKey() {
    if (S.phase === 'lobby') {
      return ['lobby', S.gameId, S.hostId, S.players.filter((p) => p.connected).length, S.history.length].join('|');
    }
    const mod = GAMES[S.gameId];
    return ['game', S.gameId, S.hostId, mod.key ? mod.key(S, S.game) : S.game.phase].join('|');
  }

  function render() {
    if (!S) return renderHome();
    const mod = GAMES[S.gameId];
    if (S.phase === 'playing' && !mod) { $app.innerHTML = '<div class="card">Ce jeu n\'est pas encore chargé. Recharge la page.</div>'; return; }
    if (S.phase === 'playing') mod.onState?.(S, S.game);
    document.body.style.setProperty('--game', gameInfo().color);

    const key = screenKey();
    if (key !== lastKey) {
      lastKey = key;
      $app.className = S.phase === 'lobby' ? 'wide' : '';
      if (S.phase === 'lobby') $app.innerHTML = lobbyScreen();
      else {
        const g = gameInfo();
        const quit = isHost() && S.game.phase !== 'end' ? '<a class="link" data-quit>Arrêter</a>' : '';
        $app.innerHTML = `<div class="topbar"><span class="chip"><span class="mini">${ICONS.game(g.id)}</span>${esc(g.name)}</span><span class="room">${quit}<span>Salon <b>${S.code}</b></span></span></div>` + mod.screen(S, S.game);
        if (S.game.phase === 'end' && confettiFor !== S.history.length) { confettiFor = S.history.length; confetti(); }
      }
      bindCore();
      if (S.phase === 'playing') mod.bind?.(S, S.game, $app);
    }
    // zones mises à jour en continu sans tout redessiner (garde le focus des champs)
    document.querySelectorAll('[data-live]').forEach((el) => {
      const fn = LIVE[el.dataset.live] || mod?.live?.[el.dataset.live];
      if (fn) el.innerHTML = fn(S, S.game);
    });
  }

  function bindCore() {
    const on = (sel, fn) => document.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
    on('[data-core]', (e) => socket.emit(e.currentTarget.dataset.core));
    document.querySelectorAll('.gains-d').forEach((d) => d.addEventListener('toggle', () => { gainsOpen = d.open; }));
    on('[data-quit]', () => { if (confirm('Arrêter la partie et revenir au salon ? Les points de cette partie seront perdus.')) socket.emit('toLobby'); });
    on('[data-host-action]', (e) => {
      const el = e.currentTarget;
      if (el.dataset.busy) return; // déjà cliqué : on attend le nouvel écran
      el.dataset.busy = '1';
      el.classList.add('busy');
      sendHost(el.dataset.hostAction);
      setTimeout(() => { delete el.dataset.busy; el.classList.remove('busy'); }, 1500); // si rien ne change (erreur), on réactive
    });
    on('[data-game]', (e) => isHost() && socket.emit('selectGame', e.currentTarget.dataset.game));
    on('[data-leave]', () => { socket.emit('leave'); localStorage.removeItem('session'); S = null; renderHome(); });
    on('[data-invite]', () => {
      const url = `${location.origin}/?salon=${S.code}`;
      const text = `Rejoins ma Soirée Jeux ! Code : ${S.code}`;
      if (navigator.share) navigator.share({ title: 'Soirée Jeux', text, url }).catch(() => {});
      else navigator.clipboard?.writeText(url).then(() => toast('Lien d\'invitation copié'), () => toast(url));
    });
  }

  return {
    boot: () => {},
    refresh: () => render(),
    registerGame: (id, mod) => { GAMES[id] = mod; },
    // helpers pour les jeux
    esc, P, av, name, isHost, send, toast, hostButton, forceLink, scoreboard, podium, endFooter,
    header, gainsBlock, gainTotals, playerGrid, endScreen,
    timer, timeLeft,
    get state() { return S; },
  };
})();
