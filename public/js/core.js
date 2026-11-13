// ─────────────────────────────────────────────────────────────────────────────
// Cœur client : connexion, accueil, salon, choix du jeu, classement de soirée.
// Chaque jeu s'enregistre avec UI.registerGame(id, { key, screen, live, bind, rules }).
// ─────────────────────────────────────────────────────────────────────────────
const UI = (() => {
  const socket = io();
  const $app = document.getElementById('app');
  const GAMES = {}; // modules d'affichage des jeux
  let S = null;
  let lastKey = null;

  // ─── Helpers partagés avec les jeux ──────────────────────────────────────
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const P = (id) => S && S.players.find((p) => p.id === id);
  const av = (p, cls = '') => (p ? `<span class="av ${cls}" style="background:${p.color}33">${p.avatar}</span>` : '');
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

  const send = (type, payload) => socket.emit('action', { type, payload });

  // Bouton réservé à l'hôte (sinon message d'attente)
  const hostButton = (label, action = 'next') => isHost()
    ? `<button class="full alt" data-host-action="${action}">${label}</button>`
    : `<p class="center white">En attente de l'hôte ${name(S.hostId)} 👑…</p>`;
  const forceLink = (label, action = 'next') => isHost() ? `<p class="center"><a class="link" data-host-action="${action}">${label}</a></p>` : '';

  // Classement trié par score (scores = {pid: points}, deltas optionnels)
  function scoreboard(scores, deltas = {}) {
    return Object.keys(scores).filter(P).sort((a, b) => scores[b] - scores[a]).map((id, i) => `
      <div class="score"><b style="width:22px">${i + 1}</b>${av(P(id))}<span class="n">${name(id)}${id === S.you ? ' (toi)' : ''}</span>
      ${deltas[id] ? `<span class="plus">+${deltas[id]}</span>` : ''}<span class="p">${scores[id]}</span></div>`).join('');
  }

  function podium(scores) {
    const ranked = Object.keys(scores).filter(P).sort((a, b) => scores[b] - scores[a]);
    const order = [ranked[1], ranked[0], ranked[2]];
    const h = [110, 150, 80], col = ['#94a3b8', '#fbbf24', '#d97706'], pos = [2, 1, 3];
    return `<div class="podium">${order.map((id, i) => id ? `
      <div class="col reveal">${av(P(id))}<div style="font-weight:600;margin:4px 0">${name(id)}</div><div class="muted">${scores[id]} pts</div>
      <div class="bar" style="height:${h[i]}px;background:${col[i]}">${pos[i]}</div></div>` : '<div class="col"></div>').join('')}</div>`;
  }

  // Bas d'écran de fin de partie commun à tous les jeux
  function endFooter() {
    const last = S.history[S.history.length - 1];
    const mine = last && last.gains[S.you];
    return `
      ${mine ? `<p class="center white">+${mine} pts au classement de la soirée 🎉</p>` : ''}
      ${isHost()
        ? `<div class="row"><button class="alt" data-core="restartGame">Rejouer 🔁</button><button data-core="toLobby">Changer de jeu 🎲</button></div>`
        : `<p class="center white">L'hôte ${name(S.hostId)} choisit la suite 👑</p>`}`;
  }

  // ─── Connexion ────────────────────────────────────────────────────────────
  socket.on('connect', () => {
    const saved = JSON.parse(localStorage.getItem('session') || 'null');
    if (saved) socket.emit('rejoin', saved);
    else renderHome();
  });
  // ancienne session expirée — sauf si on vient entre-temps de créer/rejoindre un salon
  socket.on('rejoinFailed', () => { if (S) return; localStorage.removeItem('session'); renderHome(); });
  socket.on('joined', (d) => localStorage.setItem('session', JSON.stringify(d)));
  socket.on('errorMsg', toast);
  socket.on('state', (s) => { S = s; render(); });

  // ─── Accueil ──────────────────────────────────────────────────────────────
  function renderHome() {
    lastKey = 'home';
    const code = new URLSearchParams(location.search).get('salon') || '';
    $app.innerHTML = `
      <h1>🎉 Soirée Jeux</h1>
      <p class="tag">Des jeux à faire entre amis, chacun sur son téléphone.</p>
      <div class="card stack">
        <input id="name" maxlength="20" placeholder="Ton pseudo" value="${esc(localStorage.getItem('name') || '')}" />
        ${code ? '' : '<button class="full" id="create">Créer un salon</button>'}
      </div>
      <div class="card stack">
        <h2>Rejoindre un salon</h2>
        <input id="code" maxlength="4" placeholder="CODE" value="${esc(code)}" style="text-transform:uppercase;letter-spacing:.3em;text-align:center;font-weight:700" />
        <button class="full alt" id="join">Rejoindre</button>
      </div>
      ${code ? '<p class="center"><a class="link" href="/">Créer mon propre salon</a></p>' : ''}`;
    const getName = () => { const n = document.getElementById('name').value.trim(); localStorage.setItem('name', n); return n; };
    const c = document.getElementById('create');
    if (c) c.onclick = () => socket.emit('create', { name: getName() });
    document.getElementById('join').onclick = () => socket.emit('join', { name: getName(), code: document.getElementById('code').value });
  }

  // ─── Salon ────────────────────────────────────────────────────────────────
  function lobbyScreen() {
    const url = `${location.origin}/?salon=${S.code}`;
    const n = S.players.filter((p) => p.connected).length;
    const g = gameInfo();
    const missing = Math.max(0, g.minPlayers - n);
    return `
      <h1>🎉 Salon</h1>
      <div class="card center">
        <div class="muted">Code du salon</div>
        <div class="code">${S.code}</div>
        <button class="ghost" data-copy="${esc(url)}">📋 Copier le lien d'invitation</button>
      </div>
      <div class="card"><h2>Joueurs</h2><div class="players" data-live="lobbyPlayers"></div></div>
      <div class="card">
        <h2>${isHost() ? 'Choisis un jeu' : "Jeu choisi par l'hôte"}</h2>
        <div class="games">${S.games.map((x) => {
          const tag = isHost() ? 'button' : 'div';
          if (!isHost() && x.id !== S.gameId) return '';
          return `<${tag} class="gamecard ${x.id === S.gameId ? 'sel' : ''}" data-game="${x.id}">
            <span class="e">${x.emoji}</span>
            <span><div class="t">${esc(x.name)}</div><div class="d">${esc(x.tagline)}</div>
            <div class="m">👥 ${x.minPlayers}–${x.maxPlayers} · ⏱️ ${esc(x.duration)}</div></span></${tag}>`;
        }).join('')}</div>
      </div>
      ${GAMES[S.gameId]?.rules ? `<div class="card"><details><summary><b>Règles de ${esc(g.name)}</b></summary>${GAMES[S.gameId].rules()}</details></div>` : ''}
      ${isHost()
        ? `<button class="full" data-core="startGame" ${missing ? 'disabled' : ''}>${missing ? `Encore ${missing} joueur(s) minimum…` : `Lancer ${esc(g.name)} 🚀`}</button>`
        : `<p class="center white">L'hôte va lancer la partie…</p>`}
      <div style="height:14px"></div>
      ${soireeCard()}
      <p class="center"><a class="link" data-leave>Quitter le salon</a></p>`;
  }

  function soireeCard() {
    if (!S.history.length) return '';
    const ranked = [...S.players].sort((a, b) => b.soiree - a.soiree);
    return `<div class="card">
      <h2>🏆 Classement de la soirée</h2>
      ${ranked.map((p, i) => `<div class="score"><b style="width:22px">${i === 0 ? '👑' : i + 1}</b>${av(p)}<span class="n">${esc(p.name)}${p.id === S.you ? ' (toi)' : ''}</span><span class="p">${p.soiree}</span></div>`).join('')}
      <details style="margin-top:8px"><summary>Parties jouées (${S.history.length})</summary>
        ${S.history.map((h) => `<div class="muted" style="margin-top:6px">${gameInfo(h.gameId)?.emoji} ${esc(gameInfo(h.gameId)?.name)} — 🥇 ${h.winners.map(name).join(' & ')}</div>`).join('')}
      </details>
      <p class="muted" style="font-size:.85rem;margin-bottom:0">À chaque partie, le 1er gagne autant de points qu'il y a de joueurs, le dernier 1 point.</p>
    </div>`;
  }

  const LIVE = {
    lobbyPlayers: () => S.players.map((p) => `<div class="player ${p.connected ? '' : 'off'}">${av(p)}<span>${esc(p.name)}${p.id === S.hostId ? ' 👑' : ''}${p.id === S.you ? ' (toi)' : ''}</span></div>`).join(''),
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
    if (S.phase === 'playing' && !mod) { $app.innerHTML = '<div class="card">Jeu inconnu 😕 Recharge la page.</div>'; return; }
    if (S.phase === 'playing') mod.onState?.(S, S.game);

    const key = screenKey();
    if (key !== lastKey) {
      lastKey = key;
      if (S.phase === 'lobby') $app.innerHTML = lobbyScreen();
      else {
        const g = gameInfo();
        $app.innerHTML = `<div class="topbar"><span>${g.emoji} ${esc(g.name)}</span><span>Salon <b>${S.code}</b></span></div>` + mod.screen(S, S.game);
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
    on('[data-host-action]', (e) => send(e.currentTarget.dataset.hostAction));
    on('[data-game]', (e) => isHost() && socket.emit('selectGame', e.currentTarget.dataset.game));
    on('[data-leave]', () => { socket.emit('leave'); localStorage.removeItem('session'); S = null; renderHome(); });
    on('[data-copy]', (e) => {
      const txt = e.currentTarget.dataset.copy;
      navigator.clipboard?.writeText(txt).then(() => toast('Lien copié !'), () => toast(txt));
    });
  }

  return {
    boot: () => {},
    registerGame: (id, mod) => { GAMES[id] = mod; },
    // helpers pour les jeux
    esc, P, av, name, isHost, send, toast, hostButton, forceLink, scoreboard, podium, endFooter,
    get state() { return S; },
  };
})();
