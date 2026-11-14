// ─────────────────────────────────────────────────────────────────────────────
// 🧼 Le ring savonneux — mini-jeu en temps réel (façon jeu de soirée sur console)
// La TÉLÉ fait tourner le jeu (physique, collisions) et a toujours raison.
// Les téléphones sont des manettes : ils n'envoient que joystick + boutons
// (relayés par le serveur, voir « ctl » dans server.js).
// La télé prévient le serveur des événements : chute, choc, fin de manche.
// Ici on garde seulement l'état de la partie : manches, éliminés, points.
// ─────────────────────────────────────────────────────────────────────────────
const { gain, applyGains, awards, active, initScores } = require('./_utils');

const ARENAS = [
  { id: 'rond', name: 'La patinoire' },
  { id: 'trou', name: 'Le trou au milieu' },
  { id: 'tourne', name: 'Le manège' },
  { id: 'iles', name: 'Les deux îles' },
  { id: 'finale', name: 'La savonnette finale' },
];
const PLACE_PTS = [5, 3, 1];   // 1er, 2e, 3e de la manche
const EJECT_PTS = 1;           // par joueur éjecté

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['wins', 'ejections', 'falls']);
  const g = { scores, stats, round: 0, totalRounds: ARENAS.length, phase: 'intro', result: null };
  return g;
}

function startRound(ctx, g) {
  g.round++;
  g.arena = ARENAS[g.round - 1];
  g.players = active(ctx, g).map((p) => p.id);   // joueurs présents au début de la manche
  g.alive = [...g.players];
  g.out = [];                                     // ordre d'élimination (le 1er tombé en premier)
  g.ejections = {};
  g.result = null;
  g.seed = Math.floor(Math.random() * 1e9);       // la télé s'en sert pour placer les joueurs
  g.startedAt = Date.now();
  g.phase = 'play';
}

function finishRound(ctx, g) {
  // classement : survivants d'abord (ex æquo si plusieurs), puis les derniers tombés
  const ranking = [g.alive.slice(), ...g.out.slice().reverse().map((id) => [id])];
  const gains = {};
  let place = 0;
  for (const group of ranking) {
    for (const id of group) {
      const pts = PLACE_PTS[place] || 0;
      if (pts) gain(gains, id, pts, place === 0 ? 'Dernier sur la glace 👑' : `${place + 1}ᵉ de la manche`);
    }
    place += group.length;
  }
  for (const [id, n] of Object.entries(g.ejections)) {
    if (n) gain(gains, id, n * EJECT_PTS, `${n} joueur${n > 1 ? 's' : ''} jeté${n > 1 ? 's' : ''} à l'eau 💦`);
    g.stats[id].ejections += n;
  }
  for (const id of g.alive) g.stats[id].wins++;
  applyGains(g.scores, gains);
  g.result = { ranking: ranking.flat(), winners: g.alive.slice(), gains, ejections: g.ejections };
  g.phase = 'roundEnd';
}

// Événements envoyés par la télé (seul le premier écran fait foi)
function onScreenEvent(ctx, g, type, p = {}) {
  if (g.phase !== 'play') return false;
  if (type === 'hit') {                       // deux joueurs se sont rentrés dedans
    for (const id of [p.a, p.b]) if (g.alive.includes(id)) ctx.buzz(id, [45]);
    return false;
  }
  if (type === 'fall') {                      // un joueur est tombé à l'eau
    if (!g.alive.includes(p.pid)) return false;
    g.alive = g.alive.filter((id) => id !== p.pid);
    g.out.push(p.pid);
    g.stats[p.pid].falls++;
    ctx.buzz(p.pid, [300, 90, 300]);
    if (p.by && p.by !== p.pid && g.players.includes(p.by)) {
      g.ejections[p.by] = (g.ejections[p.by] || 0) + 1;
      ctx.buzz(p.by, [70, 50, 70]);
    }
    if (g.alive.length <= 1) finishRound(ctx, g);
    return true;
  }
  if (type === 'timeUp') { finishRound(ctx, g); return true; }   // sécurité : manche trop longue
  if (type === 'splat') { if (g.alive.includes(p.pid)) ctx.buzz(p.pid, [25, 40, 25]); return false; }
  return false;
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  if (type === 'next' && isHost) {
    if (g.phase === 'intro') startRound(ctx, g);
    else if (g.phase === 'play') finishRound(ctx, g);           // forcer la fin (télé débranchée…)
    else if (g.phase === 'roundEnd') {
      if (g.round >= g.totalRounds) {
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['wins', 'Roi de la glace', '👑', 'a gagné le plus de manches'],
          ['ejections', 'Bulldozer', '💥', 'a jeté le plus de joueurs à l\'eau'],
          ['falls', 'Savonnette', '💦', 'est tombé(e) le plus souvent'],
        ]);
        ctx.endGame(g.scores);
      } else startRound(ctx, g);
    }
  }
}

function stateFor(ctx, g, pid) {
  const s = {
    phase: g.phase, round: g.round, totalRounds: g.totalRounds, scores: g.scores,
    participants: Object.keys(g.scores),
    arena: g.arena || null, arenas: ARENAS,
    players: g.players || [], alive: g.alive || [], out: g.out || [],
    seed: g.seed, startedAt: g.startedAt,
    me: pid && g.players ? (g.players.includes(pid) ? (g.alive.includes(pid) ? 'alive' : 'out') : 'wait') : null,
  };
  if (g.phase === 'roundEnd') s.result = g.result;
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'ring',
  color: '#4fc3ff',
  name: 'Le ring savonneux',
  emoji: '🧼',
  tagline: 'Pousse tout le monde à l\'eau. Le téléphone est ta manette !',
  description: 'Mini-jeu d\'action en temps réel sur la télé : on glisse, on charge, on éjecte. Le dernier sur la glace gagne.',
  minPlayers: 2,
  maxPlayers: 6,
  duration: '10 min',
  realtime: true,      // les manettes envoient leurs commandes en direct à la télé
  requiresTv: true,    // se joue avec l'écran partagé (mode télé)
  create,
  onAction,
  onScreenEvent,
  stateFor,
};
