// ─────────────────────────────────────────────────────────────────────────────
// 🏎️ Les Bolides — course de petites voitures en temps réel, vue de dessus.
// Comme le ring : la TÉLÉ fait tourner la course (pilotage, drifts, objets),
// les téléphones sont des manettes. La télé prévient le serveur des moments
// importants (tour bouclé, objet ramassé, arrivée, fin de course).
// Ici on garde l'état de la partie : courses, tours, objets, points.
// ─────────────────────────────────────────────────────────────────────────────
const { gain, applyGains, awards, active, initScores, practiceReady, allReady } = require('./_utils');

const TRACKS = [
  { id: 'parc', name: 'La boucle du parc', laps: 4 },
  { id: 'huit', name: 'Le grand huit', laps: 3 },
  { id: 'epingles', name: 'Les épingles', laps: 3 },
  { id: 'port', name: 'Le circuit du port', laps: 3 },
];
const PLACE_PTS = [10, 7, 5, 3, 2, 1];
const BEST_LAP_PTS = 2;
const ITEMS = ['piment', 'savon', 'bouchon', 'klaxon', 'mouette', 'triple'];

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['wins', 'podiums', 'hits', 'spins', 'bestLaps']);
  const n = Math.min(TRACKS.length, ctx.rounds(TRACKS.length));
  // version courte : on garde toujours le dernier circuit pour la finale
  const tracks = n >= TRACKS.length ? TRACKS : [...TRACKS.slice(0, n - 1), TRACKS[TRACKS.length - 1]];
  return { scores, stats, round: 0, totalRounds: n, tracks, phase: 'intro', result: null };
}

// entraînement : tours illimités sur le premier circuit, rien ne compte
function startPractice(ctx, g) {
  g.practice = true;
  g.ready = [];
  g.track = { id: TRACKS[0].id, name: 'Tour d\'essai', laps: 99 };
  g.players = active(ctx, g).map((p) => p.id);
  g.lap = Object.fromEntries(g.players.map((id) => [id, 1]));
  g.items = {};
  g.finished = [];
  g.times = {};
  g.result = null;
  g.seed = Math.floor(Math.random() * 1e9);
  g.startedAt = Date.now();
  g.phase = 'play';
}

function startRound(ctx, g) {
  g.practice = false;
  g.ready = [];
  g.round++;
  g.track = g.tracks[g.round - 1];
  g.players = active(ctx, g).map((p) => p.id);
  g.lap = Object.fromEntries(g.players.map((id) => [id, 1]));
  g.items = {};
  g.finished = [];       // ordre d'arrivée
  g.times = {};          // temps de course (ms)
  g.result = null;
  g.seed = Math.floor(Math.random() * 1e9);
  g.startedAt = Date.now();
  g.phase = 'play';
}

function finishRound(ctx, g, order = [], best = null) {
  // classement : arrivés d'abord, puis l'ordre donné par la télé (position sur la piste)
  const ranking = [...g.finished];
  for (const id of [...order, ...g.players]) if (g.players.includes(id) && !ranking.includes(id)) ranking.push(id);
  const gains = {};
  ranking.forEach((id, i) => {
    const pts = PLACE_PTS[i] || 0;
    if (pts) gain(gains, id, pts, i === 0 ? 'Vainqueur de la course 🏁' : `${i + 1}ᵉ de la course`);
    if (i < 3 && g.finished.includes(id)) g.stats[id].podiums++;
  });
  if (ranking[0] && g.finished.includes(ranking[0])) g.stats[ranking[0]].wins++;
  if (best && g.players.includes(best.pid)) {
    gain(gains, best.pid, BEST_LAP_PTS, `Meilleur tour (${(best.ms / 1000).toFixed(2)} s) ⏱️`);
    g.stats[best.pid].bestLaps++;
  }
  applyGains(g.scores, gains);
  g.result = { ranking, finished: g.finished.slice(), times: g.times, best, gains };
  g.phase = 'roundEnd';
}

// Événements envoyés par la télé (seul le premier écran fait foi)
function onScreenEvent(ctx, g, type, p = {}) {
  if (g.phase !== 'play') return false;
  const pid = p.pid;
  const known = g.players.includes(pid);
  if (type === 'lap') {
    if (!known) return false;
    const lap = Math.max(1, Math.min(g.track.laps, Math.floor(Number(p.lap) || 1)));
    if (lap === g.lap[pid]) return false;
    g.lap[pid] = lap;
    ctx.buzz(pid, lap === g.track.laps ? [60, 60, 60, 60, 60] : [40]);
    return true;
  }
  if (type === 'item') {
    if (!known) return false;
    const item = ITEMS.includes(p.item) ? p.item : null;
    const left = item === 'triple' ? Math.max(1, Math.min(3, Math.floor(Number(p.left) || 3))) : 0;
    g.items[pid] = item ? { id: item, left } : null;
    if (item && !p.used) ctx.buzz(pid, [20, 30, 20]);
    return true;
  }
  if (type === 'spin') {                       // un bolide part en tête-à-queue
    if (!known) return false;
    g.stats[pid].spins++;
    ctx.buzz(pid, [200, 60, 120]);
    if (p.by && p.by !== pid && g.players.includes(p.by)) { g.stats[p.by].hits++; ctx.buzz(p.by, [30, 30, 30]); }
    return false;
  }
  if (type === 'bump') {
    for (const id of [p.a, p.b]) if (g.players.includes(id)) ctx.buzz(id, [35]);
    return false;
  }
  if (type === 'finish') {
    if (g.practice) return false;
    if (!known || g.finished.includes(pid)) return false;
    g.finished.push(pid);
    g.times[pid] = Math.max(0, Math.floor(Number(p.ms) || 0));
    g.items[pid] = null;
    ctx.buzz(pid, [80, 60, 80, 60, 200]);
    if (g.finished.length >= active(ctx, g).filter((x) => g.players.includes(x.id)).length) finishRound(ctx, g, [], cleanBest(g, p.best));
    return true;
  }
  if (type === 'raceEnd') {
    if (g.practice) return false;                    // fin de course (tout le monde est arrivé, ou temps écoulé)
    const order = Array.isArray(p.order) ? p.order.filter((id) => g.players.includes(id)) : [];
    finishRound(ctx, g, order, cleanBest(g, p.best));
    return true;
  }
  return false;
}
const cleanBest = (g, b) => (b && g.players.includes(b.pid) && Number(b.ms) > 0 ? { pid: b.pid, ms: Math.floor(Number(b.ms)) } : null);

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  if (type === 'ready') { if (practiceReady(ctx, g, pid)) startRound(ctx, g); return; }
  if (type === 'next' && isHost) {
    if (g.phase === 'intro') startPractice(ctx, g);
    else if (g.phase === 'play' && g.practice) startRound(ctx, g);
    else if (g.phase === 'play') finishRound(ctx, g);           // forcer la fin (télé débranchée…)
    else if (g.phase === 'roundEnd') {
      if (g.round >= g.totalRounds) {
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['wins', 'Pilote d\'or', '🏆', 'a gagné le plus de courses'],
          ['hits', 'Chauffard', '😈', 'a fait déraper le plus d\'adversaires'],
          ['bestLaps', 'Chrono', '⏱️', 'a signé le plus de meilleurs tours'],
          ['spins', 'Toupie', '🌀', 's\'est fait le plus de tête-à-queue'],
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
    track: g.track || null, tracks: g.tracks,
    players: g.players || [], seed: g.seed, startedAt: g.startedAt, practice: !!g.practice, ready: g.ready || [],
    lap: g.lap || {}, finished: g.finished || [],
    me: pid && g.players ? (g.players.includes(pid) ? (g.finished.includes(pid) ? 'done' : 'race') : 'wait') : null,
    myLap: pid && g.lap ? g.lap[pid] || 1 : 1,
    myItem: pid && g.items ? g.items[pid] || null : null,
    myPlace: pid && g.finished ? g.finished.indexOf(pid) + 1 : 0,
  };
  if (g.phase === 'roundEnd') s.result = g.result;
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'bolides',
  color: '#ff5d5d',
  name: 'Les Bolides',
  emoji: '🏎️',
  tagline: 'Course de petites voitures : drifte, booste, sème la pagaille !',
  description: 'Course en temps réel sur la télé : 3 tours de circuit, drifts qui chargent un turbo, objets farceurs et aspiration.',
  minPlayers: 2,
  maxPlayers: 6,
  duration: '10–12 min',
  realtime: true,
  requiresTv: true,
  keyboard: true,
  create,
  onAction,
  onScreenEvent,
  onPlayersChanged(ctx, g) { if (g.practice && g.phase === 'play' && allReady(ctx, g)) startRound(ctx, g); },
  stateFor,
  _test: { TRACKS, ITEMS },
};
