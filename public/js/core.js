// ─────────────────────────────────────────────────────────────────────────────
// Cœur client : connexion, accueil, salon, choix du jeu, classement de soirée.
// Chaque jeu s'enregistre avec UI.registerGame(id, { key, screen, live, bind, rules }).
// ─────────────────────────────────────────────────────────────────────────────
const UI = (() => {

  // ─── familles de jeux (pour s'y retrouver dans la liste) ───
  const CATS = [
    ['🤥 Bluff et déduction', ['deux-mensonges', 'intrus', 'image', 'dico', 'complot', 'alliances', 'butin']],
    ['😂 Pour rigoler', ['chute', 'qui-de-nous', 'classement', 'dessin', 'note', 'patate']],
    ['🧠 Quiz et devinettes', ['buzzer', 'mime', 'imitateur', 'trombi']],
    ['🤝 En équipe', ['demineur']],
    ['🎮 Action : le téléphone devient une manette', ['ring', 'bolides', 'drapeau']],
  ];
  // +100 / −50 (jamais « +-50 »)
  const signed = (n) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);
  const GAME_CATS = (games) => {
    const used = new Set();
    const out = CATS.map(([t, ids]) => [t, ids.map((id) => games.find((g) => g.id === id)).filter(Boolean)]).filter(([, l]) => l.length);
    out.forEach(([, l]) => l.forEach((g) => used.add(g.id)));
    const rest = games.filter((g) => !used.has(g.id));
    if (rest.length) out.push(['✨ Autres', rest]);
    return out;
  };
  // reconnexion rapide et sans fin (un téléphone peut rester en veille longtemps)
  const socket = io({ reconnectionDelay: 500, reconnectionDelayMax: 2000, timeout: 8000 });
  const $app = document.getElementById('app');
  const GAMES = {}; // modules d'affichage des jeux
  let S = null;
  let lastKey = null;
  let confettiFor = null; // évite de relancer les confettis à chaque mise à jour
  // Mode salon : cette page est l'écran partagé (télé, ordi) d'un salon → ?ecran=CODE
  let SCREEN = (new URLSearchParams(location.search).get('ecran') || '').toUpperCase();
  if (SCREEN) document.body.classList.add('tv');
  const joinUrl = (code) => `${location.origin}/?salon=${code}`;
  const qrImg = (code, cls = '') => `<img class="qr ${cls}" src="/api/qr?u=${encodeURIComponent(joinUrl(code))}" alt="QR code pour rejoindre le salon ${code}">`;
  let showQr = false; // QR code affiché dans le salon (téléphone)
  let homeMode = 'phone'; // accueil : « sur mon téléphone » ou « mode télé »
  let edOpen = false;     // éditeur de bouille déplié
  let mForm = { mode: 'duree', minutes: 50, rounds: 3, games: new Set() }; // formulaire de la soirée enchaînée
  let catalog = []; // liste des jeux (pour l'accueil, avant d'avoir rejoint un salon)
  fetch('/api/games').then((r) => r.json()).then((c) => { catalog = c; if (lastKey === 'home') renderHome(); }).catch(() => {});

  const ICON = ICONS.ui;
  const crown = `<span class="crown">${ICON.crown}</span>`;

  // ─── Helpers partagés avec les jeux ──────────────────────────────────────
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const P = (id) => S && S.players.find((p) => p.id === id);
  // bouille du joueur : rond coloré + visage choisi par le joueur
  const av = (p, cls = '') => (!p ? '' : p.look
    ? `<span class="av ${cls}" style="background:${PERSO.color(p.look)}">${PERSO.head(p.look)}</span>`
    : `<span class="av ${cls}" style="background:${p.color}">${typeof p.avatar === 'number' ? ICONS.avatar(p.avatar) : esc(p.avatar)}</span>`);

  // ─── Éditeur de perso (accueil + salon) ───
  let edLook;
  try { edLook = PERSO.norm(JSON.parse(localStorage.getItem('look'))); if (!localStorage.getItem('look')) throw 0; } catch (e) { edLook = PERSO.random(); }
  const saveLook = () => { try { localStorage.setItem('look', JSON.stringify(edLook)); } catch (e) { /* stockage bloqué */ } };
  saveLook();
  const ROWS = [['eyes', 'Yeux'], ['mouth', 'Bouche'], ['acc', 'Accessoire']];
  const SWATCHES = [['col', 'Couleur', () => PERSO.COLS]];
  const myBouille = () => `<span class="av xl my-bouille" style="background:${PERSO.color(edLook)}">${PERSO.head(edLook)}</span>`;
  // déplier / replier l'éditeur sans redessiner l'écran (garde le pseudo en cours de saisie)
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-edit-bouille]')) return;
    edOpen = !edOpen;
    document.querySelectorAll('.bouille-ed').forEach((el) => el.classList.toggle('open', edOpen));
    document.querySelectorAll('[data-edit-bouille]').forEach((el) => el.setAttribute('aria-expanded', edOpen));
  });
  const persoEditor = () => `<div class="perso-wrap">
      <div class="perso-ed">
        <div class="perso-ctrl">${ROWS.map(([k, lab]) => `<div class="pr"><span class="pl">${lab}</span>
            <button class="pa" data-pk="${k}" data-d="-1" aria-label="${lab} précédent">‹</button><span class="pv">${esc(PERSO.label(k, edLook[k]))}</span><button class="pa" data-pk="${k}" data-d="1" aria-label="${lab} suivant">›</button></div>`).join('')}
          ${SWATCHES.map(([k, lab, list]) => `<div class="pr"><span class="pl">${lab}</span><div class="sw">${list().map((col, i) => `<button class="swc ${edLook[k] === i ? 'sel' : ''}" data-pk="${k}" data-v="${i}" style="background:${col}" aria-label="${lab} ${i + 1}"></button>`).join('')}</div></div>`).join('')}
        </div>
      </div>
      <button class="ghost full" data-pr-rand>🎲 Bouille au hasard</button>
    </div>`;
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pk], [data-pr-rand]');
    if (!b) return;
    if (b.dataset.prRand != null) edLook = PERSO.random();
    else {
      const k = b.dataset.pk;
      edLook[k] = b.dataset.v != null ? Number(b.dataset.v) : (edLook[k] + Number(b.dataset.d) + PERSO.SIZES[k]) % PERSO.SIZES[k];
    }
    saveLook();
    document.querySelectorAll('.perso-wrap').forEach((w) => { w.outerHTML = persoEditor(); });
    document.querySelectorAll('.my-bouille').forEach((w) => { w.outerHTML = myBouille(); });
    if (S && !S.spectator) socket.emit('setLook', edLook); // dans le salon : les autres voient le changement
  });
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
      ${deltas[id] ? `<span class="plus ${deltas[id] < 0 ? 'minus' : ''}">${signed(deltas[id])}</span>` : ''}<span class="p">${scores[id]}</span></div>`).join('');
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
    return `<details class="gains-d" ${gainsOpen || S.spectator ? 'open' : ''}>
      <summary><span class="gains-title">Détail des points</span>${mine ? `<span class="gains-me ${mine < 0 ? 'minus' : ''}">toi : ${signed(mine)}</span>` : ''}</summary>
      <div class="gains">${ids.map((id) => `
        <div class="g"><div class="gl">${av(P(id), 'sm')}<span class="gn">${name(id)}</span><span class="plus ${gains[id].total < 0 ? 'minus' : ''}">${signed(gains[id].total)}</span></div>
        <ul>${gains[id].reasons.map((r) => `<li>${signed(r.pts)} ${esc(r.label)}</li>`).join('')}</ul></div>`).join('')}</div>
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
    const m = S.marathon;
    if (m && !m.done) {
      // soirée enchaînée : points du jeu, classement du marathon, compte à rebours avant le jeu suivant
      const res = m.results[m.results.length - 1];
      const next = m.list[m.idx + 1];
      return `<div class="card mth-card"><div class="cardhead"><h2>🎬 Soirée enchaînée</h2><span class="muted">jeu ${m.idx + 1} / ${m.list.length}</span></div>
          ${res && res.pts[S.you] != null ? `<p class="center" style="margin:0 0 8px">Tu marques <b>+${res.pts[S.you]}</b> au marathon (1er = 10, dernier = 1)</p>` : ''}
          ${scoreboard(m.totals, res ? res.pts : {})}
          <p class="center mth-next">${next ? `Prochain jeu : <b>${esc(gameInfo(next)?.name)}</b>` : '🏁 C\'était le dernier jeu !'} ${m.nextIn != null ? `dans ${timer(m.nextIn)}` : ''}</p>
        </div>
        <div class="dock">${isHost()
          ? `<div class="row"><button class="ghost" data-core="stopMarathon">Arrêter</button><button class="alt" data-core="marathonNext">${next ? 'Jeu suivant ➜' : 'Voir le podium 🏆'}</button></div>`
          : `<p>Le jeu suivant démarre tout seul…</p>`}</div>`;
    }
    return `
      ${mine ? `<p class="center white">+${mine} pts au classement de la soirée</p>` : ''}
      <div class="dock">${isHost()
        ? `<div class="row"><button class="ghost" data-core="restartGame">${ICON.again} Rejouer</button><button class="alt" data-core="toLobby">${ICON.dice} Autre jeu</button></div>`
        : `<p>${name(S.hostId)} ${crown} choisit la suite…</p>`}</div>`;
  }

  // ─── Connexion ────────────────────────────────────────────────────────────
  socket.on('connect', () => {
    setOffline(false);
    if (SCREEN) return socket.emit('watch', { code: SCREEN }); // écran partagé : on regarde, on ne joue pas
    let saved = JSON.parse(localStorage.getItem('session') || 'null');
    // Lien d'invitation (QR code de la télé, lien partagé) vers un AUTRE salon :
    // il passe avant l'ancien salon gardé en mémoire.
    const invited = (new URLSearchParams(location.search).get('salon') || '').toUpperCase();
    if (saved && invited && saved.code !== invited && !S) { localStorage.removeItem('session'); saved = null; }
    if (saved) socket.emit('rejoin', saved);
    else if (lastKey !== 'home') renderHome(); // ne pas effacer un pseudo en cours de saisie
  });
  socket.on('disconnect', () => setOffline(true));
  socket.on('screenCreated', ({ code }) => {
    SCREEN = code;
    history.replaceState(null, '', `/?ecran=${code}`); // un rechargement garde l'écran sur ce salon
    document.body.classList.add('tv');
  });
  socket.on('watchFailed', () => {
    lastKey = 'tvmissing';
    $app.innerHTML = `<div class="logo"><span>Soirée</span><br><span>Jeux</span></div>
      <div class="card center"><h2>Salon ${esc(SCREEN)} introuvable</h2><p class="muted">Crée un salon sur ton téléphone, puis ouvre l'adresse affichée dans « Mode salon ».</p>
      <a class="link" href="/">Retour à l'accueil</a></div>`;
  });
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
  socket.on('joined', (d) => {
    localStorage.setItem('session', JSON.stringify(d));
    // l'adresse suit le salon rejoint (un vieux lien d'invitation ne nous en fera pas sortir)
    if (new URLSearchParams(location.search).get('salon')) history.replaceState(null, '', `/?salon=${d.code}`);
  });
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
    if (first) edOpen = false; // on entre dans le salon : éditeur de bouille replié
    S = s;
    render();
    if (first) keepAwake();
  });

  // ─── Accueil ──────────────────────────────────────────────────────────────
  function renderHome() {
    lastKey = 'home';
    window.TUEUR_UI?.sync();
    $app.className = '';
    document.body.style.removeProperty('--game');
    const code = new URLSearchParams(location.search).get('salon') || '';
    const boxes = catalog.map((g) => `<span class="box" style="background:${g.color}" title="${esc(g.name)}">${ICONS.game(g.id)}</span>`).join('');
    const tabs = code ? '' : `<div class="modes" role="tablist">
        <button class="mode ${homeMode === 'phone' ? 'sel' : ''}" data-mode="phone" role="tab" aria-selected="${homeMode === 'phone'}">📱 Téléphone</button>
        <button class="mode ${homeMode === 'tv' ? 'sel' : ''}" data-mode="tv" role="tab" aria-selected="${homeMode === 'tv'}">📺 Télé</button>
      </div>`;
    if (!code && homeMode === 'tv') {
      $app.innerHTML = `
        <div class="logo"><span>Soirée</span><br><span>Jeux</span></div>
        <div class="boxes">${boxes}</div>
        ${tabs}
        <div class="card stack center">
          <h2 style="margin:0">Le jeu en grand sur la télé</h2>
          <p class="muted" style="margin:0">Ouvre cette page sur l'ordi branché à la télé. Il affiche un QR code : chacun le scanne avec son téléphone, qui devient sa manette. <b>Le premier à rejoindre devient l'hôte</b> et lance les jeux.</p>
          <button class="full alt" id="createScreen" style="--game:var(--blue)">📺 Créer le salon sur cet écran</button>
        </div>
        <details class="card tvjoin"><summary>Afficher un salon déjà créé</summary>
          <div class="row"><input id="tvcode" class="codeinput" maxlength="4" placeholder="ABCD" autocomplete="off" /><button class="alt" id="tvgo" style="flex:0 0 auto">Afficher</button></div>
        </details>`;
      document.getElementById('createScreen').onclick = () => socket.emit('createScreen');
      document.getElementById('tvgo').onclick = () => { const c = document.getElementById('tvcode').value.trim().toUpperCase(); if (c.length === 4) location.href = `/?ecran=${c}`; };
      $app.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { homeMode = b.dataset.mode; renderHome(); }));
      return;
    }
    $app.innerHTML = `
      <div class="logo"><span>Soirée</span> <span>Jeux</span></div>
      <div class="boxes strip">${boxes}</div>
      ${tabs}
      <div class="card me-card">
        <div class="me-row">
          <button class="me-av" data-edit-bouille aria-expanded="${edOpen}" title="Modifier ma bouille">${myBouille()}<span class="edit-badge">✏️</span></button>
          <div class="me-name"><label for="name">Ton pseudo</label>
            <input id="name" maxlength="20" placeholder="Ex. : Noa" autocomplete="nickname" value="${esc(localStorage.getItem('name') || '')}" /></div>
        </div>
        <div class="bouille-ed ${edOpen ? 'open' : ''}">${persoEditor()}</div>
        ${code ? '' : '<button class="full" id="create">Créer un salon</button>'}
      </div>
      <div class="card join-card">
        <label for="code" class="lbl">${code ? 'Tu es invité(e) dans le salon' : 'Ou rejoins tes amis'}</label>
        <div class="row"><input id="code" class="codeinput" maxlength="4" placeholder="ABCD" autocomplete="off" value="${esc(code)}" />
          <button class="alt" id="join" style="--game:var(--blue)">Rejoindre</button></div>
      </div>
      ${code ? '<p class="center"><a class="link" href="/">Créer mon propre salon</a></p>' : ''}`;
    $app.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { homeMode = b.dataset.mode; renderHome(); }));
    const getName = () => { const n = document.getElementById('name').value.trim(); localStorage.setItem('name', n); return n; };
    const c = document.getElementById('create');
    if (c) c.onclick = () => socket.emit('create', { name: getName(), look: edLook });
    const join = () => socket.emit('join', { name: getName(), code: document.getElementById('code').value, look: edLook });
    document.getElementById('join').onclick = join;
    document.getElementById('code').addEventListener('keydown', (e) => e.key === 'Enter' && join());
  }

  // ─── Salon ────────────────────────────────────────────────────────────────
  function lobbyScreen() {
    const g = gameInfo();
    const n = S.players.filter((p) => p.connected).length;
    // le joueur au clavier (télé) ne compte que pour les jeux qui l'acceptent
    const nFor = (x) => S.players.filter((p) => p.connected && (!p.kb || x.keyboard)).length;
    const missing = Math.max(0, g.minPlayers - nFor(g));
    const shown = isHost() ? S.games : S.games.filter((x) => x.id === S.gameId);
    const fits = S.games.filter((x) => nFor(x) >= x.minPlayers && nFor(x) <= x.maxPlayers && x.id !== S.gameId);
    return `
      <div class="lob-head">
        <div class="lob-code"><span class="code-label">Code du salon</span><div class="code sm">${[...S.code].map((c) => `<span>${c}</span>`).join('')}</div></div>
        <div class="lob-actions">
          <button class="iconbtn" data-invite title="Inviter">${ICON.send}<span>Inviter</span></button>
          <button class="iconbtn ${showQr ? 'on' : ''}" data-qr title="QR code">▦<span>QR</span></button>
          ${S.tv ? '' : '<button class="iconbtn" data-tv title="Afficher sur une télé">📺<span>Télé</span></button>'}
        </div>
      </div>
      ${showQr ? `<div class="card center qrcard">${qrImg(S.code)}<p class="muted" style="margin:8px 0 0">Scanne avec l'appareil photo pour rejoindre</p></div>` : ''}
      ${S.tv ? '<p class="center white tvon">📺 La télé est branchée : les téléphones servent de manettes.</p>' : ''}

      <div class="card">
        <div class="cardhead"><h2>Joueurs <small class="muted">${n}/16</small></h2>
          <button class="chipbtn" data-edit-bouille aria-expanded="${edOpen}">${myBouille().replace('av xl', 'av sm')} Ma bouille ✏️</button></div>
        <div class="bouille-ed ${edOpen ? 'open' : ''}">${persoEditor()}</div>
        <div class="players figs" data-live="lobbyPlayers"></div>
      </div>

      <div class="card game-panel" style="--c:${g.color}">
        <div class="gp-top">
          <span class="gp-art">${ICONS.game(g.id)}</span>
          <div class="gp-info"><div class="gp-kicker">${isHost() ? 'Le jeu choisi' : `${name(S.hostId)} a choisi`}</div>
            <div class="gp-name">${esc(g.name)}</div><div class="gp-tag">${esc(g.tagline)}</div>
            <div class="m"><span>${ICON.players}${g.minPlayers} à ${g.maxPlayers}</span><span>${ICON.clock}${esc(g.duration)}</span>${g.requiresTv ? '<span>📺 sur la télé</span>' : ''}</div></div>
        </div>
        ${optionsCard(g)}
        ${g.oral ? `<div class="opt-row"><span class="opt-label">🎤 À l'oral</span>${isHost()
          ? `<button class="switch ${S.oral ? 'on' : ''}" data-oral aria-pressed="${S.oral}"><span></span></button>`
          : `<b>${S.oral ? 'oui' : 'non'}</b>`}<small class="muted">${S.oral ? 'on parle à voix haute, le téléphone sert à voter' : 'tout s\'écrit sur le téléphone'}</small></div>` : ''}
        ${g.requiresTv && !S.tv ? `<p class="gp-warn">📺 Ce jeu se joue sur une télé ou un ordi : touche <b>Télé</b> en haut, ouvre l'adresse sur le grand écran, et vos téléphones deviennent des manettes.</p>` : ''}
        ${GAMES[S.gameId]?.rules ? `<details class="gp-rules"><summary>Comment on joue ?</summary>${GAMES[S.gameId].rules()}</details>` : ''}
      </div>

      ${marathonCard(n, nFor)}
      <div data-live="tueur"></div>
      ${isHost() ? `<div class="card">
        <div class="cardhead"><h2>Changer de jeu</h2>${fits.length ? '<button class="chipbtn" data-random-game>🎲 Au hasard</button>' : ''}</div>
        ${GAME_CATS(S.games).map(([title, list]) => `<div class="gt-cat">${title}</div><div class="gtiles">${list.map((x) => `<button class="gtile ${x.id === S.gameId ? 'sel' : ''} ${nFor(x) < x.minPlayers || nFor(x) > x.maxPlayers ? 'few' : ''}" data-game="${x.id}" style="--c:${x.color}" ${(nFor(x) < x.minPlayers || nFor(x) > x.maxPlayers) && x.id !== S.gameId ? 'disabled' : ''}>
          <span class="gt-art">${ICONS.game(x.id)}</span><span class="gt-name">${esc(x.name)}</span>${nFor(x) < x.minPlayers ? `<small>🔒 ${x.minPlayers} joueurs min.</small>` : nFor(x) > x.maxPlayers ? `<small>🔒 ${x.maxPlayers} max.</small>` : `<small>${x.minPlayers}–${x.maxPlayers} joueurs</small>`}</button>`).join('')}</div>`).join('')}
      </div>` : ''}
      ${soireeCard()}
      <p class="center"><a class="link" data-leave>Quitter le salon</a></p>

      <div class="dock">${isHost()
        ? `<button class="alt" data-core="startGame" ${missing || (g.requiresTv && !S.tv) ? 'disabled' : ''}>${missing ? `Il manque ${missing} joueur${missing > 1 ? 's' : ''}` : g.requiresTv && !S.tv ? 'Branche la télé pour jouer 📺' : `Lancer ${esc(g.name)}`}</button>`
        : `<p>${name(S.hostId)} ${crown} va lancer la partie…</p>`}</div>`;
  }

  // ─── Soirée enchaînée : on choisit une durée OU des jeux, et 3 à 5 manches par jeu ───
  function marathonCard(n, nFor) {
    const m = S.marathon;
    if (m && m.done) {
      return `<div class="card mth-card"><h2>🏆 Fin de la soirée enchaînée</h2>${podium(m.totals)}
        <div class="mth-list">${m.results.map((r) => { const best = Object.keys(r.pts).filter((id) => r.pts[id] === 10); return `<div class="mth-row"><span class="mini" style="background:${gameInfo(r.gameId)?.color}">${ICONS.game(r.gameId)}</span><span>${esc(gameInfo(r.gameId)?.name)}</span><small>${best.map(name).join(' & ')} 👑</small></div>`; }).join('')}</div>
        ${isHost() ? '<button class="ghost full" data-core="stopMarathon">Fermer</button>' : ''}</div>`;
    }
    if (!isHost()) return '';
    const ok = S.games.filter((x) => nFor(x) >= x.minPlayers && nFor(x) <= x.maxPlayers && (!x.requiresTv || S.tv));
    const est = (x) => Math.round(x.est[0] + x.est[1] * mForm.rounds);
    for (const id of [...mForm.games]) if (!ok.some((x) => x.id === id)) mForm.games.delete(id);
    const chosen = ok.filter((x) => mForm.games.has(x.id));
    const total = chosen.reduce((t, x) => t + est(x), 0);
    return `<div class="card mth-form"><div class="cardhead"><h2>🎬 Soirée enchaînée</h2></div>
      <p class="muted" style="margin:0 0 10px">Les jeux s'enchaînent tout seuls. Chaque jeu rapporte de 10 pts (1er) à 1 pt (dernier) : personne ne gagne tout sur un seul jeu.</p>
      <div class="opts mth-tabs"><button class="opt ${mForm.mode === 'duree' ? 'sel' : ''}" data-m="mode" data-v="duree"><b>⏱️ Par durée</b></button><button class="opt ${mForm.mode === 'jeux' ? 'sel' : ''}" data-m="mode" data-v="jeux"><b>✅ Je choisis les jeux</b></button></div>
      ${mForm.mode === 'duree'
        ? `<div class="opt-block"><span class="opt-label">Durée de la soirée</span><div class="chips">${[20, 30, 50, 75, 90, 120].map((v) => `<button class="chipbtn ${mForm.minutes === v ? 'on' : ''}" data-m="minutes" data-v="${v}">${v < 60 ? v + ' min' : (v / 60 | 0) + ' h' + (v % 60 ? v % 60 : '')}</button>`).join('')}</div>
           <small class="muted">Les jeux sont tirés au hasard parmi ceux jouables à ${n} (${ok.length} jeux).</small></div>`
        : `<div class="opt-block"><span class="opt-label">Jeux à jouer, dans l'ordre où tu les coches</span><div class="mth-games">${ok.map((x) => `<button class="mth-g ${mForm.games.has(x.id) ? 'on' : ''}" data-mg="${x.id}" style="--c:${x.color}">${mForm.games.has(x.id) ? `<b class="mth-n">${[...mForm.games].indexOf(x.id) + 1}</b>` : ''}<span class="mini">${ICONS.game(x.id)}</span>${esc(x.name)}<small>~${est(x)} min</small></button>`).join('')}</div>
           <small class="muted">${chosen.length} jeu${chosen.length > 1 ? 'x' : ''} · environ ${total} min</small></div>`}
      <div class="opt-block"><span class="opt-label">Manches par jeu</span><div class="chips">${[3, 4, 5].map((v) => `<button class="chipbtn ${mForm.rounds === v ? 'on' : ''}" data-m="rounds" data-v="${v}">${v} manches</button>`).join('')}</div></div>
      <button class="full alt" data-mstart style="margin-top:12px" ${mForm.mode === 'jeux' && !chosen.length ? 'disabled' : ''}>🎬 Lancer la soirée</button></div>`;
  }

  // Options du jeu (ex. thème) : l'hôte choisit, les autres voient le choix
  function optionsCard(g) {
    if (!g.options?.length) return '';
    return g.options.map((o) => {
      const cur = S.options?.[o.key] ?? o.default;
      const choice = o.choices.find((c) => c.value === cur) || o.choices[0];
      return `<div class="opt-block"><span class="opt-label">${esc(o.label)}</span>
        ${isHost()
          ? `<div class="opts">${o.choices.map((c) => `<button class="opt ${c.value === cur ? 'sel' : ''}" data-opt-key="${esc(o.key)}" data-opt-value="${esc(c.value)}">
              <b>${esc(c.label)}</b>${c.value === cur && c.hint ? `<small>${esc(c.hint)}</small>` : ''}</button>`).join('')}</div>`
          : `<p style="margin:0"><b>${esc(choice.label)}</b>${choice.hint ? ` <span class="muted">· ${esc(choice.hint)}</span>` : ''}</p>`}
      </div>`;
    }).join('');
  }

  // Jeu qui accepte un joueur au clavier sur la télé : le jeu choisi, ou le ring s'il n'y a pas assez de téléphones
  const kbGame = () => (GAMES[S.gameId]?.keyboard ? GAMES[S.gameId]
    : S.players.filter((p) => p.connected && !p.kb).length < 2 || S.players.some((p) => p.connected && p.kb) ? GAMES.ring : null);

  function tvLobby() {
    const g = gameInfo();
    const n = S.players.filter((p) => p.connected).length;
    return `
      <div class="tv-lobby">
        <div class="tv-join">
          <div class="logo small"><span>Soirée</span> <span>Jeux</span></div>
          ${qrImg(S.code, 'big')}
          <div class="tv-scan">Scanne pour rejoindre<br><small>ou va sur <b>${esc(location.host)}</b> avec le code</small></div>
          <div class="code">${[...S.code].map((c) => `<span>${c}</span>`).join('')}</div>
        </div>
        <div class="tv-side">
          <div class="card"><div class="cardhead"><h2>Joueurs</h2><span class="muted">${n}</span></div><div class="players figs" data-live="lobbyPlayers"></div></div>
          ${kbGame() ? kbGame().keyboard.card() : ''}
          <div class="card tv-games-card">
            <div class="cardhead"><h2>Les jeux</h2><span class="muted">${S.games.length} jeux · l'hôte choisit sur son téléphone</span></div>
            <div class="tv-games">${S.games.map((x) => `
              <div class="tv-g ${x.id === S.gameId ? 'sel' : ''} ${n < x.minPlayers ? 'few' : ''}" style="--c:${x.color}">
                <span class="tv-gi">${ICONS.game(x.id)}</span>
                <span class="tv-gn">${esc(x.name)}${x.id === S.gameId ? '<small>Choisi ✓</small>' : ''}</span>
              </div>`).join('')}</div>
          </div>
          <div class="card tv-game">
            <div class="cardhead"><h2>${esc(g.name)}</h2><span class="m">${S.oral && g.oral ? '<span>🎤 à l\'oral</span>' : ''}${(g.options || []).map((o) => { const c = o.choices.find((x) => x.value === (S.options?.[o.key] ?? o.default)); return c ? `<span>${esc(c.label)}</span>` : ''; }).join('')}</span></div>
            ${GAMES[S.gameId]?.rules ? `<div class="tv-rules">${GAMES[S.gameId].rules()}</div>` : `<p>${esc(g.tagline)}</p>`}
          </div>
          ${soireeCard()}
          <div data-live="tueur"></div>
          <p class="center white">${P(S.hostId) ? `${name(S.hostId)} ${crown} lance la partie depuis son téléphone` : `En attente des joueurs… <b>le premier à rejoindre sera l'hôte</b> ${crown}`}</p>
        </div>
      </div>`;
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
    tueur: () => (window.TUEUR_UI ? TUEUR_UI.card() : ''), // 🗡️ jeu de fond (public/js/tueur.js)
    lobbyPlayers: () => {
      const g = gameInfo();
      const n = S.players.filter((p) => p.connected).length;
      const seats = Math.max(0, g.minPlayers - n);
      // les bouilles en grand
      return S.players.map((p) => `<div class="pfig ${p.connected ? '' : 'off'} ${p.id === S.you ? 'me' : ''}" style="--c:${p.look ? PERSO.color(p.look) : p.color}">${av(p, 'xl')}
          <span class="pn">${p.kb ? '⌨️ ' : ''}${esc(p.name)}${p.id === S.hostId ? ' ' + crown : ''}${p.id === S.you ? ' (toi)' : ''}${p.connected ? '' : ' 💤'}</span>${
        isHost() && p.id !== S.you && p.connected ? `<button class="mkhost" data-make-host="${esc(p.id)}" title="Passer le rôle d'hôte à ${esc(p.name)}">${crown}</button>` : ''}</div>`).join('')
        + Array.from({ length: seats }, () => '<div class="pfig seat"><span class="av xl">?</span><span class="pn">En attente…</span></div>').join('');
    },
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────
  function screenKey() {
    if (S.phase === 'lobby') {
      return ['lobby', S.gameId, S.hostId, S.players.filter((p) => p.connected).length, S.history.length, S.tv, S.oral, showQr, JSON.stringify(S.options), S.marathon ? `${S.marathon.done}|${S.marathon.results.length}` : ''].join('|');
    }
    const mod = GAMES[S.gameId];
    return ['game', S.gameId, S.hostId, S.tv, mod.key ? mod.key(S, S.game) : S.game.phase].join('|');
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
      // téléphone pendant qu'un écran partagé est branché : mode manette
      document.body.classList.toggle('tvmode', !!(S.tv && !S.spectator && S.phase === 'playing'));
      if (S.phase === 'lobby') $app.innerHTML = S.spectator ? tvLobby() : lobbyScreen();
      else {
        const g = gameInfo();
        const quit = isHost() && S.game.phase !== 'end' ? '<a class="link" data-quit>Arrêter</a>' : '';
        const room = S.spectator ? `${qrImg(S.code, 'mini')}<span>Rejoindre : <b>${S.code}</b></span>` : `${quit}<span>Salon <b>${S.code}</b></span>`;
        // sur l'écran partagé, un jeu peut fournir une vue dédiée (sans secrets ni formulaires)
        const body = (S.spectator && mod.tv && mod.tv(S, S.game)) || mod.screen(S, S.game);
        const mth = S.marathon && !S.marathon.done ? `<span class="mth-chip">🎬 ${S.marathon.idx + 1}/${S.marathon.list.length}</span>` : '';
        $app.innerHTML = `<div class="topbar"><span class="chip"><span class="mini">${ICONS.game(g.id)}</span>${esc(g.name)}${S.oral && g.oral ? ' · 🎤' : ''}</span>${mth}<span class="room">${room}</span></div>` + body;
        // autocollant dessiné du jeu, collé dans l'en-tête de l'écran
        $app.querySelector('.phase')?.insertAdjacentHTML('afterbegin', `<span class="phase-sticker" style="--c:${g.color}" aria-hidden="true">${ICONS.game(g.id)}</span>`);
        if (document.body.classList.contains('tvmode')) controllerMode();
        if (S.game.phase === 'end' && confettiFor !== S.history.length) { confettiFor = S.history.length; confetti(); }
      }
      bindCore();
      if (S.phase === 'playing') mod.bind?.(S, S.game, $app);
      if (S.phase === 'lobby' && S.spectator) kbGame()?.keyboard.bind($app); // joueur au clavier sur la télé
    }
    // zones mises à jour en continu sans tout redessiner (garde le focus des champs)
    document.querySelectorAll('[data-live]').forEach((el) => {
      const fn = LIVE[el.dataset.live] || mod?.live?.[el.dataset.live];
      if (fn) el.innerHTML = fn(S, S.game);
    });
    window.TUEUR_UI?.sync(); // bouton 🗡️ flottant, visible aussi pendant les autres jeux
  }

  // Téléphone en mode manette : les cartes sans action (textes, résultats, classements) sont sur la télé.
  // On garde celles avec un bouton / un champ, le détail des points et celles marquées « keep » (infos secrètes).
  function controllerMode() {
    let hidden = 0;
    $app.querySelectorAll('.card').forEach((c) => {
      if (c.matches('.keep, .gains-card') || c.querySelector('button, input, textarea, canvas, select, .keep')) return;
      c.classList.add('tv-hidden');
      hidden++;
    });
    if (hidden) $app.querySelector('.topbar')?.insertAdjacentHTML('afterend', '<div class="tv-look">📺 Regarde l\'écran !</div>');
  }

  // Passer le rôle d'hôte (bouton couronne à côté d'un joueur, visible par l'hôte)
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-make-host]');
    if (!b || !S) return;
    const p = S.players.find((x) => x.id === b.dataset.makeHost);
    if (p && confirm(`Passer le rôle d'hôte à ${p.name} ? C'est lui/elle qui lancera les parties.`)) socket.emit('setHost', p.id);
  });

  function bindCore() {
    const on = (sel, fn) => document.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
    on('[data-core]', (e) => socket.emit(e.currentTarget.dataset.core));
    document.querySelectorAll('.gains-d').forEach((d) => d.addEventListener('toggle', () => { gainsOpen = d.open; }));
    on('[data-qr]', () => { showQr = !showQr; render(); });
    on('[data-tv]', () => {
      const url = `${location.origin}/?ecran=${S.code}`;
      window.open(url, '_blank');
      toast(`Sur la télé ou l'ordi, ouvre : ${location.host}/?ecran=${S.code}`);
    });
    on('[data-oral]', () => socket.emit('setOral', !S.oral));
    on('[data-opt-key]', (e) => socket.emit('setOption', { key: e.currentTarget.dataset.optKey, value: e.currentTarget.dataset.optValue }));
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
    on('[data-m]', (e) => {
      const { m, v } = e.currentTarget.dataset;
      mForm[m] = m === 'mode' ? v : Number(v);
      lastKey = null; render();
    });
    on('[data-mg]', (e) => {
      const id = e.currentTarget.dataset.mg;
      if (mForm.games.has(id)) mForm.games.delete(id); else mForm.games.add(id);
      lastKey = null; render();
    });
    on('[data-mstart]', () => socket.emit('startMarathon', mForm.mode === 'jeux'
      ? { games: [...mForm.games], rounds: mForm.rounds } : { minutes: mForm.minutes, rounds: mForm.rounds }));
    on('[data-random-game]', () => {
      const nFor = (x) => S.players.filter((p) => p.connected && (!p.kb || x.keyboard)).length;
      const list = S.games.filter((x) => nFor(x) >= x.minPlayers && nFor(x) <= x.maxPlayers && x.id !== S.gameId);
      if (list.length) socket.emit('selectGame', list[Math.floor(Math.random() * list.length)].id);
    });
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
    // jeux en temps réel : messages directs (manette → télé, télé → serveur, vibrations)
    emit: (ev, data) => socket.emit(ev, data),
    on: (ev, fn) => socket.on(ev, fn),
    // helpers pour les jeux
    esc, P, av, name, isHost, send, toast, hostButton, forceLink, scoreboard, podium, endFooter,
    header, gainsBlock, gainTotals, playerGrid, endScreen,
    timer, timeLeft,
    get state() { return S; },
  };
})();
