const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));

// ─── Barème ────────────────────────────────────────────────────────────────
const PTS = {
  AUTHOR_FOUND: 100, // tu as reconnu l'auteur
  INCOGNITO: 50,     // (auteur) par joueur qui ne t'a pas reconnu
  GHOST: 100,        // (auteur) personne ne t'a reconnu
  SCAPEGOAT: 25,     // tu es innocent mais quelqu'un t'a accusé
  TRUE_FOUND: 100,   // tu as trouvé la vraie anecdote
  DOUBLE: 50,        // auteur ET vraie anecdote trouvés
  FOOLED: 75,        // (auteur) par joueur berné par un mensonge
  PERFECT_LIE: 150,  // (auteur) personne n'a trouvé la vraie
};

const MIN_PLAYERS = 3;
const AVATARS = ['🦊', '🐸', '🐙', '🦄', '🐼', '🦁', '🐧', '🐨', '🐯', '🦉', '🐢', '🦖', '🐝', '🦩', '🐳', '🦔'];
const COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7', '#748ffc', '#da77f2', '#f783ac', '#a9e34b'];

const rooms = new Map();

const shuffle = (a) => {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

function newCode() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c;
  do c = Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join('');
  while (rooms.has(c));
  return c;
}

function newPlayer(room, name) {
  const used = new Set([...room.players.values()].map((p) => p.avatar));
  const free = AVATARS.filter((a) => !used.has(a));
  const p = {
    id: crypto.randomUUID(),
    name: name.slice(0, 20),
    avatar: (free.length ? free : AVATARS)[Math.floor(Math.random() * (free.length || AVATARS.length))],
    color: COLORS[room.players.size % COLORS.length],
    score: 0,
    connected: true,
    socketId: null,
    anecdotes: null, // [{text, isTrue}]
    stats: blankStats(),
  };
  room.players.set(p.id, p);
  return p;
}

const blankStats = () => ({ authorFound: 0, trueFound: 0, fooled: 0, incognito: 0, accused: 0 });

const connected = (room) => [...room.players.values()].filter((p) => p.connected);

// ─── Vue personnalisée de l'état (on cache les secrets) ─────────────────────
function stateFor(room, pid) {
  const me = room.players.get(pid);
  const s = {
    code: room.code,
    phase: room.phase,
    you: pid,
    hostId: room.hostId,
    points: PTS,
    round: room.roundIndex + 1,
    totalRounds: room.order.length,
    players: [...room.players.values()].map((p) => ({
      id: p.id, name: p.name, avatar: p.avatar, color: p.color, score: p.score,
      connected: p.connected, submitted: !!p.anecdotes,
    })),
  };
  if (room.phase === 'writing') s.myAnecdotes = me.anecdotes;

  const c = room.current;
  if (c) {
    const isAuthor = c.authorId === pid;
    const cur = { items: c.items.map((i) => i.text), isAuthor };
    const authorKnown = room.phase !== 'guessAuthor';
    if (authorKnown) cur.authorId = c.authorId;
    if (isAuthor || room.phase === 'revealTrue') cur.trueIndex = c.trueIndex;

    if (room.phase === 'guessAuthor') {
      cur.myVote = c.authorVotes[pid] ?? null;
      cur.voted = Object.keys(c.authorVotes).length;
      cur.needed = connected(room).length;
    }
    if (room.phase === 'guessTrue') {
      cur.myVote = c.trueVotes[pid] ?? null;
      cur.voted = Object.keys(c.trueVotes).length;
      cur.needed = connected(room).filter((p) => p.id !== c.authorId).length;
      cur.waitingFor = connected(room).filter((p) => p.id !== c.authorId && !(p.id in c.trueVotes)).map((p) => p.id);
    }
    if (['revealAuthor', 'guessTrue', 'revealTrue'].includes(room.phase)) {
      cur.authorVotes = Object.fromEntries(Object.entries(c.authorVotes).filter(([v]) => v !== c.authorId));
      cur.authorGains = c.authorGains;
    }
    if (room.phase === 'revealTrue') {
      cur.trueVotes = c.trueVotes;
      cur.trueGains = c.trueGains;
    }
    s.current = cur;
  }

  if (room.phase === 'end') s.awards = computeAwards(room);
  return s;
}

function broadcast(room) {
  for (const p of room.players.values()) {
    if (p.connected && p.socketId) io.to(p.socketId).emit('state', stateFor(room, p.id));
  }
}

// ─── Déroulement ───────────────────────────────────────────────────────────
function startRound(room) {
  const authorId = room.order[room.roundIndex];
  const author = room.players.get(authorId);
  const items = shuffle(author.anecdotes);
  room.current = {
    authorId,
    items,
    trueIndex: items.findIndex((i) => i.isTrue),
    authorVotes: {},
    trueVotes: {},
    foundAuthor: new Set(),
    authorGains: null,
    trueGains: null,
  };
  room.phase = 'guessAuthor';
}

function gain(gains, pid, pts, label) {
  if (!gains[pid]) gains[pid] = { total: 0, reasons: [] };
  gains[pid].total += pts;
  gains[pid].reasons.push({ pts, label });
}

function applyGains(room, gains) {
  for (const [pid, g] of Object.entries(gains)) {
    const p = room.players.get(pid);
    if (p) p.score += g.total;
  }
}

function revealAuthor(room) {
  const c = room.current;
  const author = room.players.get(c.authorId);
  const gains = {};
  const votes = Object.entries(c.authorVotes).filter(([v]) => v !== c.authorId);
  for (const [voter, target] of votes) {
    const vp = room.players.get(voter);
    if (target === c.authorId) {
      gain(gains, voter, PTS.AUTHOR_FOUND, `A démasqué ${author.name} 🔍`);
      c.foundAuthor.add(voter);
      vp.stats.authorFound++;
    } else {
      gain(gains, c.authorId, PTS.INCOGNITO, `Incognito face à ${vp.name} 🥸`);
      author.stats.incognito++;
      const t = room.players.get(target);
      if (t) {
        gain(gains, target, PTS.SCAPEGOAT, `Accusé à tort par ${vp.name} 🫣`);
        t.stats.accused++;
      }
    }
  }
  if (votes.length > 0 && c.foundAuthor.size === 0) gain(gains, c.authorId, PTS.GHOST, 'Fantôme : personne ne t\'a reconnu 👻');
  applyGains(room, gains);
  c.authorGains = gains;
  room.phase = 'revealAuthor';
}

function revealTrue(room) {
  const c = room.current;
  const author = room.players.get(c.authorId);
  const gains = {};
  let found = 0;
  const votes = Object.entries(c.trueVotes);
  for (const [voter, idx] of votes) {
    const vp = room.players.get(voter);
    if (idx === c.trueIndex) {
      found++;
      gain(gains, voter, PTS.TRUE_FOUND, 'A trouvé la vérité ✅');
      vp.stats.trueFound++;
      if (c.foundAuthor.has(voter)) gain(gains, voter, PTS.DOUBLE, 'Double détective 🕵️');
    } else {
      gain(gains, c.authorId, PTS.FOOLED, `A berné ${vp.name} 🤥`);
      author.stats.fooled++;
    }
  }
  if (votes.length > 0 && found === 0) gain(gains, c.authorId, PTS.PERFECT_LIE, 'Mensonge parfait : tout le monde s\'est fait avoir 🎭');
  applyGains(room, gains);
  c.trueGains = gains;
  room.phase = 'revealTrue';
}

function checkAutoAdvance(room) {
  const c = room.current;
  if (room.phase === 'writing') {
    const pending = connected(room).filter((p) => !p.anecdotes);
    if (pending.length === 0) beginRounds(room);
  } else if (room.phase === 'guessAuthor') {
    if (connected(room).every((p) => p.id in c.authorVotes)) revealAuthor(room);
  } else if (room.phase === 'guessTrue') {
    if (connected(room).filter((p) => p.id !== c.authorId).every((p) => p.id in c.trueVotes)) revealTrue(room);
  }
}

function beginRounds(room) {
  room.order = shuffle([...room.players.values()].filter((p) => p.anecdotes).map((p) => p.id));
  room.roundIndex = 0;
  startRound(room);
}

function computeAwards(room) {
  const ps = [...room.players.values()];
  const best = (key, title, emoji, desc) => {
    const max = Math.max(...ps.map((p) => p.stats[key]));
    if (max <= 0) return null;
    return { title, emoji, desc, value: max, winners: ps.filter((p) => p.stats[key] === max).map((p) => p.id) };
  };
  return [
    best('authorFound', 'Sherlock', '🔍', 'a démasqué le plus d\'auteurs'),
    best('trueFound', 'Détecteur de mensonges', '🧠', 'a trouvé le plus de vérités'),
    best('fooled', 'Grand Mytho', '🤥', 'a berné le plus de monde'),
    best('incognito', 'Caméléon', '🦎', 'est passé le plus inaperçu'),
    best('accused', 'Suspect n°1', '🚨', 'a été accusé à tort le plus souvent'),
  ].filter(Boolean);
}

function resetToLobby(room) {
  room.phase = 'lobby';
  room.order = [];
  room.roundIndex = 0;
  room.current = null;
  for (const p of room.players.values()) {
    p.score = 0;
    p.anecdotes = null;
    p.stats = blankStats();
  }
  // retire les joueurs déconnectés entre deux parties
  for (const [id, p] of room.players) if (!p.connected) room.players.delete(id);
}

// ─── Sockets ───────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  let room = null;
  let player = null;

  const err = (msg) => socket.emit('errorMsg', msg);
  const attach = (r, p) => {
    room = r;
    player = p;
    p.connected = true;
    p.socketId = socket.id;
    socket.emit('joined', { code: r.code, playerId: p.id });
    broadcast(r);
  };
  const isHost = () => room && player && room.hostId === player.id;

  socket.on('create', ({ name } = {}) => {
    name = String(name || '').trim();
    if (!name) return err('Choisis un pseudo');
    const r = { code: newCode(), players: new Map(), hostId: null, phase: 'lobby', order: [], roundIndex: 0, current: null };
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
    if (r.phase !== 'lobby') return err('La partie a déjà commencé');
    if ([...r.players.values()].some((p) => p.name.toLowerCase() === name.toLowerCase())) return err('Ce pseudo est déjà pris');
    if (r.players.size >= 16) return err('Salon plein');
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
    room.players.delete(player.id);
    const r = room;
    if (r.hostId === player.id) r.hostId = connected(r)[0]?.id ?? null;
    room = player = null;
    if (r.players.size === 0) return rooms.delete(r.code);
    checkAutoAdvance(r);
    broadcast(r);
  });

  socket.on('start', () => {
    if (!isHost() || room.phase !== 'lobby') return;
    if (connected(room).length < MIN_PLAYERS) return err(`Il faut au moins ${MIN_PLAYERS} joueurs`);
    room.phase = 'writing';
    broadcast(room);
  });

  socket.on('submitAnecdotes', ({ texts, trueIndex } = {}) => {
    if (!room || room.phase !== 'writing') return;
    if (!Array.isArray(texts) || texts.length !== 3) return err('Il faut 3 anecdotes');
    const clean = texts.map((t) => String(t || '').trim().slice(0, 280));
    if (clean.some((t) => t.length < 3)) return err('Remplis bien les 3 anecdotes');
    if (![0, 1, 2].includes(trueIndex)) return err('Indique laquelle est vraie');
    player.anecdotes = clean.map((text, i) => ({ text, isTrue: i === trueIndex }));
    checkAutoAdvance(room);
    broadcast(room);
  });

  socket.on('editAnecdotes', () => {
    if (!room || room.phase !== 'writing') return;
    player.anecdotes = null;
    broadcast(room);
  });

  socket.on('voteAuthor', (target) => {
    if (!room || room.phase !== 'guessAuthor') return;
    if (target === player.id || !room.players.has(target)) return;
    room.current.authorVotes[player.id] = target;
    checkAutoAdvance(room);
    broadcast(room);
  });

  socket.on('voteTrue', (idx) => {
    if (!room || room.phase !== 'guessTrue') return;
    if (player.id === room.current.authorId || ![0, 1, 2].includes(idx)) return;
    room.current.trueVotes[player.id] = idx;
    checkAutoAdvance(room);
    broadcast(room);
  });

  // L'hôte fait avancer la partie (ou force si quelqu'un traîne)
  socket.on('next', () => {
    if (!isHost()) return;
    switch (room.phase) {
      case 'writing':
        if ([...room.players.values()].filter((p) => p.anecdotes).length < 2) return err('Il faut au moins 2 joueurs prêts');
        beginRounds(room);
        break;
      case 'guessAuthor': revealAuthor(room); break;
      case 'revealAuthor': room.phase = 'guessTrue'; break;
      case 'guessTrue': revealTrue(room); break;
      case 'revealTrue':
        room.roundIndex++;
        if (room.roundIndex >= room.order.length) { room.phase = 'end'; room.current = null; }
        else startRound(room);
        break;
      case 'end': resetToLobby(room); break;
      default: return;
    }
    broadcast(room);
  });

  socket.on('disconnect', () => {
    if (!room || !player) return;
    player.connected = false;
    player.socketId = null;
    const r = room;
    const p = player;
    if (r.hostId === p.id) {
      // on laisse 15 s à l'hôte pour revenir (rechargement de page, réseau…)
      setTimeout(() => {
        if (p.connected || r.hostId !== p.id) return;
        const next = connected(r)[0];
        if (next) { r.hostId = next.id; broadcast(r); }
      }, 15000);
    }
    if (connected(r).length === 0) {
      // on garde le salon 10 min au cas où tout le monde revient
      setTimeout(() => { if (rooms.get(r.code) === r && connected(r).length === 0) rooms.delete(r.code); }, 10 * 60 * 1000);
      return;
    }
    checkAutoAdvance(r);
    broadcast(r);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log(`\n🎭  2 Mensonges, 1 Vérité — serveur lancé\n`);
  console.log(`   Sur cet ordi :        http://localhost:${PORT}`);
  for (const ip of ips) console.log(`   Sur le même Wi-Fi :   http://${ip}:${PORT}`);
  console.log('');
});
