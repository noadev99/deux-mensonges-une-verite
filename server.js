// ─────────────────────────────────────────────────────────────────────────────
// Plateforme de jeux de soirée — cœur commun
// Gère : salons, joueurs, reconnexion, hôte, choix du jeu, classement de soirée.
// Chaque jeu est un module autonome dans /games (voir games/README.md).
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { Server } = require('socket.io');
const GAMES = require('./games');
const { shuffle } = require('./games/_utils');

const app = express();
const server = http.createServer(app);
// Un téléphone en veille ou sur une autre appli n'est déclaré absent qu'après ~1 min
const io = new Server(server, { pingInterval: 20000, pingTimeout: 40000 });
// Numéro de version : change à chaque démarrage du serveur (donc à chaque mise à jour).
// Les pages ouvertes avec une ancienne version se rechargent toutes seules.
const fs = require('fs');
const BUILD = Date.now().toString(36);
const INDEX = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8')
  .replace(/(src|href)="\/(js|games|css)\/([^"]+)"/g, `$1="/$2/$3?v=${BUILD}"`)
  .replace('<div id="app"></div>', `<div id="app"></div>\n<script>window.BUILD = '${BUILD}';</script>`);
const sendIndex = (req, res) => { res.set('Cache-Control', 'no-store'); res.type('html').send(INDEX); };
app.get(['/', '/index.html'], sendIndex);
app.use(express.static(path.join(__dirname, 'public'), { index: false, maxAge: '7d' }));

const MAX_PLAYERS = 16;
// Numéro de la bouille dessinée côté client (public/js/icons.js → ICONS.avatar)
const AVATARS = Array.from({ length: 16 }, (_, i) => i);
const COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7', '#748ffc', '#da77f2', '#f783ac', '#a9e34b'];

const rooms = new Map();

// ─── Utilitaires ─────────────────────────────────────────────────────────────
function newCode() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c;
  do c = Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join('');
  while (rooms.has(c));
  return c;
}

// Bouille choisie par le joueur (dessinée côté client, public/js/perso.js)
const LOOK_KEYS = ['col', 'eyes', 'mouth', 'acc'];
const cleanLook = (l) => Object.fromEntries(LOOK_KEYS.map((k) => {
  const v = l && l[k];
  return [k, Number.isInteger(v) && v >= 0 && v < 64 ? v : Math.floor(Math.random() * 64)];
}));

function newPlayer(room, name, look) {
  const used = new Set([...room.players.values()].map((p) => p.avatar));
  const pool = AVATARS.filter((a) => !used.has(a));
  const list = pool.length ? pool : AVATARS;
  const p = {
    id: crypto.randomUUID(),
    name: name.slice(0, 20),
    avatar: list[Math.floor(Math.random() * list.length)],
    color: COLORS[room.players.size % COLORS.length],
    look: cleanLook(look),
    connected: true,
    socketId: null,
    soiree: 0, // points cumulés sur toute la soirée
  };
  room.players.set(p.id, p);
  return p;
}

function newRoom() {
  const r = {
    code: newCode(), players: new Map(), hostId: null, phase: 'lobby',
    gameId: catalog[0].id, wantedGame: catalog[0].id, game: null, gameEnded: false, history: [], oral: false, screens: new Set(), options: {}, used: new Map(),
  };
  rooms.set(r.code, r);
  return r;
}

const connected = (room) => [...room.players.values()].filter((p) => p.connected);

// Retire seulement les joueurs absents depuis plus de 20 min (partis pour de bon)
const GONE_AFTER = 20 * 60 * 1000;
function purgeGone(room) {
  for (const [id, p] of room.players) if (!p.connected && p.leftAt && Date.now() - p.leftAt > GONE_AFTER) room.players.delete(id);
}
const catalog = Object.values(GAMES).map(({ id, name, emoji, color, tagline, description, minPlayers, maxPlayers, duration, oral, options, requiresTv }) =>
  ({ id, name, emoji, color, tagline, description, minPlayers, maxPlayers, duration, oral: !!oral, options: options || [], requiresTv: !!requiresTv }));

// Options d'un jeu choisies par l'hôte (ex. thème des questions), avec les valeurs par défaut
function gameOptions(room, gameId = room.gameId) {
  const defs = GAMES[gameId]?.options || [];
  const chosen = room.options[gameId] || {};
  return Object.fromEntries(defs.map((o) => [o.key, chosen[o.key] ?? o.default]));
}
app.get('/api/games', (req, res) => res.json(catalog));
// QR code (SVG) pour rejoindre un salon : /api/qr?u=<lien>
const QRCode = require('qrcode');
app.get('/api/qr', async (req, res) => {
  const u = String(req.query.u || '').slice(0, 300);
  if (!u) return res.status(400).end();
  try {
    const svg = await QRCode.toString(u, { type: 'svg', margin: 1, color: { dark: '#1a0f2eff', light: '#ffffffff' } });
    res.set('Cache-Control', 'public, max-age=86400').type('image/svg+xml').send(svg);
  } catch (e) { res.status(500).end(); }
});
// Ping des clients pendant une soirée : empêche l'hébergeur de mettre le serveur en veille
app.get('/api/ping', (req, res) => res.json({ ok: true, rooms: rooms.size }));

// Contexte passé aux modules de jeu : tout ce dont un jeu a besoin, rien de plus.
function ctx(room) {
  return {
    room,
    player: (id) => room.players.get(id),
    players: () => [...room.players.values()],
    connected: () => connected(room),
    // Le jeu appelle endGame(scores) une fois terminé → points de soirée
    endGame: (scores) => endGame(room, scores),
    oral: () => !!room.oral, // l'hôte a choisi « réponses à l'oral »
    option: (key) => gameOptions(room)[key], // option du jeu choisie par l'hôte
    // fait vibrer le téléphone d'un joueur (jeux en temps réel)
    buzz: (pid, pattern) => { const p = room.players.get(pid); if (p?.connected && p.socketId) io.to(p.socketId).emit('buzz', pattern); },
    // Tire n éléments de list en évitant ceux déjà sortis dans ce salon
    // (on ne retombe pas sur les mêmes questions d'une partie à l'autre)
    fresh: (list, n) => {
      if (!room.used.has(list)) room.used.set(list, new Set());
      const used = room.used.get(list);
      let pool = list.map((_, i) => i).filter((i) => !used.has(i));
      if (pool.length < n) { used.clear(); pool = list.map((_, i) => i); }
      const picked = shuffle(pool).slice(0, n);
      picked.forEach((i) => used.add(i));
      return picked.map((i) => list[i]);
    },
    // Minuteur serveur : exécute fn après ms, puis renvoie l'état à tous.
    // Ignoré si la partie a changé entre-temps (retour au salon, rejouer…).
    schedule: (ms, fn) => {
      const game = room.game;
      return setTimeout(() => {
        if (room.game !== game || room.phase !== 'playing') return;
        fn();
        broadcast(room);
      }, ms);
    },
  };
}

// Points de soirée : le 1er d'une partie à N joueurs gagne N points, le dernier 1.
// Les ex æquo partagent le meilleur rang.
function endGame(room, scores) {
  if (room.gameEnded) return;
  room.gameEnded = true;
  const entries = Object.entries(scores).filter(([id]) => room.players.has(id)).sort((a, b) => b[1] - a[1]);
  const n = entries.length;
  const gains = {};
  entries.forEach(([id, s], i) => {
    const rank = entries.findIndex(([, s2]) => s2 === s); // ex æquo
    gains[id] = n - rank;
    room.players.get(id).soiree += gains[id];
  });
  const top = entries.length ? entries[0][1] : null;
  room.history.push({
    gameId: room.gameId,
    winners: entries.filter(([, s]) => s === top).map(([id]) => id),
    gains,
  });
}

// ─── État envoyé à chaque joueur ─────────────────────────────────────────────
function stateFor(room, pid) {
  const s = {
    code: room.code,
    you: pid,
    hostId: room.hostId,
    phase: room.phase, // 'lobby' | 'playing'
    build: BUILD,
    v: room.v || 0, // numéro de l'état (anti double-clic de l'hôte)
    gameId: room.gameId,
    games: catalog,
    oral: !!room.oral,
    options: gameOptions(room),     // options du jeu choisi (ex. { pack: 'anime' })
    tv: room.screens.size > 0,      // un écran partagé (mode salon) est connecté
    spectator: pid === null,         // c'est l'écran partagé qui reçoit cet état
    history: room.history,
    players: [...room.players.values()].map((p) => ({
      id: p.id, name: p.name, avatar: p.avatar, color: p.color, look: p.look, connected: p.connected, soiree: p.soiree,
    })),
  };
  if (room.phase === 'playing' && room.game) s.game = GAMES[room.gameId].stateFor(ctx(room), room.game, pid);
  return s;
}

// Dans le salon : si le jeu choisi n'est plus jouable avec ce nombre de joueurs,
// on en sélectionne un qui l'est (ex. à 2 joueurs → Le ring savonneux)
function fitGame(room) {
  if (room.phase !== 'lobby') return;
  const n = connected(room).length;
  if (!n) return;
  const ok = (g) => g && n >= g.minPlayers && n <= g.maxPlayers && (!g.requiresTv || room.screens.size > 0);
  const wanted = GAMES[room.wantedGame || room.gameId];
  if (ok(wanted)) { room.gameId = wanted.id; return; }      // le jeu choisi par l'hôte redevient jouable
  if (ok(GAMES[room.gameId])) return;
  const next = Object.values(GAMES).find(ok) || Object.values(GAMES).find((g) => n >= g.minPlayers && n <= g.maxPlayers);
  if (next) room.gameId = next.id;
}

function broadcast(room) {
  fitGame(room);
  room.v = (room.v || 0) + 1;
  for (const p of room.players.values()) {
    if (p.connected && p.socketId) io.to(p.socketId).emit('state', stateFor(room, p.id));
  }
  if (room.screens.size) {
    const spec = stateFor(room, null); // l'écran ne voit que ce qui est public
    for (const sid of room.screens) io.to(sid).emit('state', spec);
  }
}

// Prévient le jeu qu'un joueur est parti / revenu (pour débloquer un vote, etc.)
function notifyGame(room) {
  if (room.phase === 'playing' && room.game) GAMES[room.gameId].onPlayersChanged?.(ctx(room), room.game);
}

function startGame(room) {
  const mod = GAMES[room.gameId];
  room.game = mod.create(ctx(room));
  room.gameEnded = false;
  room.phase = 'playing';
}

// ─── Sockets ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.emit('hello', { build: BUILD }); // permet aux pages périmées de se recharger
  let room = null;
  let player = null;

  const err = (msg) => socket.emit('errorMsg', msg);
  const isHost = () => room && player && room.hostId === player.id;
  const attach = (r, p) => {
    room = r;
    player = p;
    const old = p.socketId && p.socketId !== socket.id && io.sockets.sockets.get(p.socketId);
    p.connected = true;
    p.socketId = socket.id;
    p.leftAt = null;
    if (old) old.disconnect(true); // ancien onglet / ancienne connexion du même joueur
    socket.emit('joined', { code: r.code, playerId: p.id });
    notifyGame(r);
    broadcast(r);
  };

  socket.on('create', ({ name, look } = {}) => {
    name = String(name || '').trim();
    if (!name) return err('Choisis un pseudo');
    const r = newRoom();
    const p = newPlayer(r, name, look);
    r.hostId = p.id;
    attach(r, p);
  });

  socket.on('join', ({ name, code, look } = {}) => {
    name = String(name || '').trim();
    code = String(code || '').trim().toUpperCase();
    const r = rooms.get(code);
    if (!r) return err('Salon introuvable');
    if (!name) return err('Choisis un pseudo');
    // Même pseudo qu'un joueur absent → on lui rend sa place (téléphone changé, session perdue…)
    const same = [...r.players.values()].find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (same && !same.connected) { if (look) same.look = cleanLook(look); return attach(r, same); }
    if (same) return err('Ce pseudo est déjà pris');
    if (r.phase !== 'lobby') return err('Une partie est en cours : attends la fin, ou reprends ta place avec ton ancien pseudo');
    if (r.players.size >= MAX_PLAYERS) return err('Salon plein');
    const p = newPlayer(r, name, look);
    if (!r.hostId || !r.players.has(r.hostId)) r.hostId = p.id; // salon créé par un écran : le 1er joueur est l'hôte
    attach(r, p);
  });

  socket.on('rejoin', ({ code, playerId } = {}) => {
    const r = rooms.get(String(code || '').toUpperCase());
    const p = r && r.players.get(playerId);
    if (!p) return socket.emit('rejoinFailed', { code: String(code || '').toUpperCase() });
    attach(r, p);
  });

  socket.on('leave', () => {
    if (!room || !player) return;
    const r = room;
    r.players.delete(player.id);
    if (r.hostId === player.id) r.hostId = connected(r)[0]?.id ?? null;
    room = player = null;
    if (r.players.size === 0) return rooms.delete(r.code);
    notifyGame(r);
    broadcast(r);
  });

  // Écran partagé (télé / ordi) : il regarde le salon sans être un joueur
  let watching = null;
  // Mode télé : l'écran crée lui-même le salon (sans joueur), les téléphones le rejoignent avec le QR code
  // ─── Jeux en temps réel : la télé fait tourner le jeu, les téléphones sont des manettes ───
  // Manette → télé : uniquement les commandes (joystick + boutons), 30 fois par seconde au maximum.
  let lastCtl = 0;
  socket.on('ctl', (c) => {
    if (!room || !player || room.phase !== 'playing' || !GAMES[room.gameId]?.realtime || !room.screens.size) return;
    const now = Date.now();
    if (now - lastCtl < 30) return;
    lastCtl = now;
    const clamp = (v) => Math.max(-1, Math.min(1, Number(v) || 0));
    const msg = { p: player.id, x: clamp(c?.x), y: clamp(c?.y), a: !!c?.a, b: !!c?.b };
    for (const sid of room.screens) io.to(sid).emit('ctl', msg);
  });
  // Télé → serveur : ce qui se passe dans le jeu (chute, choc, fin de manche). Seul le premier écran fait foi.
  socket.on('screenEvent', ({ type, payload } = {}) => {
    const r = watching;
    if (!r || r.phase !== 'playing' || !r.game || [...r.screens][0] !== socket.id) return;
    const mod = GAMES[r.gameId];
    if (!mod.onScreenEvent) return;
    const changed = mod.onScreenEvent(ctx(r), r.game, String(type || ''), payload);
    if (changed) broadcast(r);
  });

  socket.on('createScreen', () => {
    if (watching) watching.screens.delete(socket.id);
    const r = newRoom();
    watching = r;
    r.screens.add(socket.id);
    socket.emit('screenCreated', { code: r.code });
    broadcast(r);
  });
  socket.on('watch', ({ code } = {}) => {
    const r = rooms.get(String(code || '').trim().toUpperCase());
    if (!r) return socket.emit('watchFailed');
    if (watching) watching.screens.delete(socket.id);
    watching = r;
    r.screens.add(socket.id);
    broadcast(r); // les téléphones passent en mode manette
  });

  // L'hôte change une option du jeu choisi (ex. thème)
  socket.on('setOption', ({ key, value } = {}) => {
    if (!isHost() || room.phase !== 'lobby') return;
    const def = (GAMES[room.gameId]?.options || []).find((o) => o.key === key);
    if (!def || !def.choices.some((c) => c.value === value)) return;
    room.options[room.gameId] = { ...(room.options[room.gameId] || {}), [key]: value };
    broadcast(room);
  });

  // L'hôte active / désactive les réponses à l'oral
  // Le joueur change son perso (depuis le salon)
  socket.on('setLook', (look) => {
    if (!room || !player) return;
    player.look = cleanLook(look);
    broadcast(room);
  });

  // L'hôte donne son rôle à un autre joueur connecté
  socket.on('setHost', (targetId) => {
    if (!isHost()) return;
    const t = room.players.get(targetId);
    if (!t || !t.connected || t.id === player.id) return;
    room.hostId = t.id;
    broadcast(room);
  });

  socket.on('setOral', (on) => {
    if (!isHost() || room.phase !== 'lobby') return;
    room.oral = !!on;
    broadcast(room);
  });

  // L'hôte choisit le jeu dans le salon
  socket.on('selectGame', (gameId) => {
    if (!isHost() || room.phase !== 'lobby' || !GAMES[gameId]) return;
    // jeu bloqué tant qu'il n'y a pas assez de joueurs (ou trop)
    const n = connected(room).length, g = GAMES[gameId];
    if (n < g.minPlayers) return err(`${g.name} : il faut au moins ${g.minPlayers} joueurs (vous êtes ${n})`);
    if (n > g.maxPlayers) return err(`${g.name} : ${g.maxPlayers} joueurs maximum`);
    room.gameId = gameId;
    room.wantedGame = gameId; // choix de l'hôte, gardé même si le nombre de joueurs change
    broadcast(room);
  });

  socket.on('startGame', () => {
    if (!isHost() || room.phase !== 'lobby') return;
    const mod = GAMES[room.gameId];
    const n = connected(room).length;
    if (n < mod.minPlayers) return err(`${mod.name} : il faut au moins ${mod.minPlayers} joueurs`);
    if (n > mod.maxPlayers) return err(`${mod.name} : ${mod.maxPlayers} joueurs maximum`);
    if (mod.requiresTv && !room.screens.size) return err(`${mod.name} se joue sur une télé : branche le mode télé (bouton 📺)`);
    startGame(room);
    broadcast(room);
  });

  // Rejouer au même jeu
  socket.on('restartGame', () => {
    if (!isHost() || room.phase !== 'playing') return;
    purgeGone(room);
    startGame(room);
    broadcast(room);
  });

  // Retour au salon (changer de jeu)
  socket.on('toLobby', () => {
    if (!isHost()) return;
    room.phase = 'lobby';
    room.game = null;
    purgeGone(room);
    broadcast(room);
  });

  // Toutes les actions de jeu passent par ici → module du jeu
  socket.on('action', ({ type, payload, v } = {}) => {
    if (!room || !player || room.phase !== 'playing' || !room.game) return;
    // « Suivant » cliqué sur un écran déjà dépassé (double-clic) : ignoré
    if ((type === 'next' || type === 'undo') && v != null && v !== room.v) return;
    const mod = GAMES[room.gameId];
    const res = mod.onAction(ctx(room), room.game, player.id, String(type || ''), payload, { isHost: isHost() });
    if (res && res.error) return err(res.error);
    broadcast(room);
  });

  socket.on('disconnect', () => {
    if (watching) {
      const w = watching;
      w.screens.delete(socket.id);
      broadcast(w);
      watching = null;
      // salon sans joueur connecté ni écran : supprimé au bout de 10 min
      setTimeout(() => { if (rooms.get(w.code) === w && !connected(w).length && !w.screens.size) rooms.delete(w.code); }, 10 * 60 * 1000);
    }
    if (!room || !player) return;
    const r = room;
    const p = player;
    // Le téléphone s'est déjà reconnecté avec une nouvelle connexion : rien à faire
    if (p.socketId !== socket.id) return;
    p.connected = false;
    p.socketId = null;
    p.leftAt = Date.now();
    if (r.hostId === p.id) {
      // 45 s de grâce pour que l'hôte revienne (veille, rechargement, réseau…)
      setTimeout(() => {
        if (p.connected || r.hostId !== p.id) return;
        const next = connected(r)[0];
        if (next) { r.hostId = next.id; broadcast(r); }
      }, 45000);
    }
    if (connected(r).length === 0) {
      setTimeout(() => { if (rooms.get(r.code) === r && connected(r).length === 0) rooms.delete(r.code); }, 10 * 60 * 1000);
      return;
    }
    notifyGame(r);
    broadcast(r);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log(`\n🎉  Soirée Jeux — serveur lancé (${catalog.length} jeu(x))\n`);
  console.log(`   Sur cet ordi :        http://localhost:${PORT}`);
  for (const ip of ips) console.log(`   Sur le même Wi-Fi :   http://${ip}:${PORT}`);
  console.log('');
});
