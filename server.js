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

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));

const MAX_PLAYERS = 16;
const AVATARS = ['🦊', '🐸', '🐙', '🦄', '🐼', '🦁', '🐧', '🐨', '🐯', '🦉', '🐢', '🦖', '🐝', '🦩', '🐳', '🦔'];
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

function newPlayer(room, name) {
  const used = new Set([...room.players.values()].map((p) => p.avatar));
  const pool = AVATARS.filter((a) => !used.has(a));
  const list = pool.length ? pool : AVATARS;
  const p = {
    id: crypto.randomUUID(),
    name: name.slice(0, 20),
    avatar: list[Math.floor(Math.random() * list.length)],
    color: COLORS[room.players.size % COLORS.length],
    connected: true,
    socketId: null,
    soiree: 0, // points cumulés sur toute la soirée
  };
  room.players.set(p.id, p);
  return p;
}

const connected = (room) => [...room.players.values()].filter((p) => p.connected);
const catalog = Object.values(GAMES).map(({ id, name, emoji, color, tagline, description, minPlayers, maxPlayers, duration }) =>
  ({ id, name, emoji, color, tagline, description, minPlayers, maxPlayers, duration }));
app.get('/api/games', (req, res) => res.json(catalog));

// Contexte passé aux modules de jeu : tout ce dont un jeu a besoin, rien de plus.
function ctx(room) {
  return {
    room,
    player: (id) => room.players.get(id),
    players: () => [...room.players.values()],
    connected: () => connected(room),
    // Le jeu appelle endGame(scores) une fois terminé → points de soirée
    endGame: (scores) => endGame(room, scores),
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
    gameId: room.gameId,
    games: catalog,
    history: room.history,
    players: [...room.players.values()].map((p) => ({
      id: p.id, name: p.name, avatar: p.avatar, color: p.color, connected: p.connected, soiree: p.soiree,
    })),
  };
  if (room.phase === 'playing' && room.game) s.game = GAMES[room.gameId].stateFor(ctx(room), room.game, pid);
  return s;
}

function broadcast(room) {
  for (const p of room.players.values()) {
    if (p.connected && p.socketId) io.to(p.socketId).emit('state', stateFor(room, p.id));
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
  let room = null;
  let player = null;

  const err = (msg) => socket.emit('errorMsg', msg);
  const isHost = () => room && player && room.hostId === player.id;
  const attach = (r, p) => {
    room = r;
    player = p;
    p.connected = true;
    p.socketId = socket.id;
    socket.emit('joined', { code: r.code, playerId: p.id });
    notifyGame(r);
    broadcast(r);
  };

  socket.on('create', ({ name } = {}) => {
    name = String(name || '').trim();
    if (!name) return err('Choisis un pseudo');
    const r = {
      code: newCode(), players: new Map(), hostId: null, phase: 'lobby',
      gameId: catalog[0].id, game: null, gameEnded: false, history: [],
    };
    rooms.set(r.code, r);
    const p = newPlayer(r, name);
    r.hostId = p.id;
    attach(r, p);
  });

  socket.on('join', ({ name, code } = {}) => {
    name = String(name || '').trim();
    code = String(code || '').trim().toUpperCase();
    const r = rooms.get(code);
    if (!r) return err('Salon introuvable');
    if (!name) return err('Choisis un pseudo');
    if (r.phase !== 'lobby') return err('Une partie est en cours, attends la fin pour rejoindre');
    if ([...r.players.values()].some((p) => p.name.toLowerCase() === name.toLowerCase())) return err('Ce pseudo est déjà pris');
    if (r.players.size >= MAX_PLAYERS) return err('Salon plein');
    attach(r, newPlayer(r, name));
  });

  socket.on('rejoin', ({ code, playerId } = {}) => {
    const r = rooms.get(String(code || '').toUpperCase());
    const p = r && r.players.get(playerId);
    if (!p) return socket.emit('rejoinFailed');
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

  // L'hôte choisit le jeu dans le salon
  socket.on('selectGame', (gameId) => {
    if (!isHost() || room.phase !== 'lobby' || !GAMES[gameId]) return;
    room.gameId = gameId;
    broadcast(room);
  });

  socket.on('startGame', () => {
    if (!isHost() || room.phase !== 'lobby') return;
    const mod = GAMES[room.gameId];
    const n = connected(room).length;
    if (n < mod.minPlayers) return err(`${mod.name} : il faut au moins ${mod.minPlayers} joueurs`);
    if (n > mod.maxPlayers) return err(`${mod.name} : ${mod.maxPlayers} joueurs maximum`);
    startGame(room);
    broadcast(room);
  });

  // Rejouer au même jeu
  socket.on('restartGame', () => {
    if (!isHost() || room.phase !== 'playing') return;
    // on retire les absents avant de relancer
    for (const [id, p] of room.players) if (!p.connected) room.players.delete(id);
    startGame(room);
    broadcast(room);
  });

  // Retour au salon (changer de jeu)
  socket.on('toLobby', () => {
    if (!isHost()) return;
    room.phase = 'lobby';
    room.game = null;
    for (const [id, p] of room.players) if (!p.connected) room.players.delete(id);
    broadcast(room);
  });

  // Toutes les actions de jeu passent par ici → module du jeu
  socket.on('action', ({ type, payload } = {}) => {
    if (!room || !player || room.phase !== 'playing' || !room.game) return;
    const mod = GAMES[room.gameId];
    const res = mod.onAction(ctx(room), room.game, player.id, String(type || ''), payload, { isHost: isHost() });
    if (res && res.error) return err(res.error);
    broadcast(room);
  });

  socket.on('disconnect', () => {
    if (!room || !player) return;
    const r = room;
    const p = player;
    p.connected = false;
    p.socketId = null;
    if (r.hostId === p.id) {
      // 15 s de grâce pour que l'hôte revienne (rechargement, réseau…)
      setTimeout(() => {
        if (p.connected || r.hostId !== p.id) return;
        const next = connected(r)[0];
        if (next) { r.hostId = next.id; broadcast(r); }
      }, 15000);
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
