// ─────────────────────────────────────────────────────────────────────────────
// 🎪 Le Funambule
// Une bille sur un plateau : on garde son téléphone bien à plat pour qu'elle ne
// tombe pas. Des rafales de vent (les mêmes pour tout le monde) la poussent de plus
// en plus fort. Le dernier dont la bille tient encore gagne la manche.
// La bille est simulée sur chaque téléphone ; le serveur ne fait que l'arbitrage
// (qui est tombé, quand) et donne le « vent » : une graine commune à tous.
// ─────────────────────────────────────────────────────────────────────────────
const { gain, applyGains, awards, active, initScores, practiceReady, allReady } = require('./_utils');

const COUNTDOWN = 3500;
const LIMIT = 90000;
const PLACE_PTS = [100, 60, 40, 20, 10];
const LEVELS = ['Brise légère 🍃', 'Vent fort 💨', 'Tempête 🌪️'];

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['wins', 'time']);
  const n = ctx.rounds(3);
  return { scores, stats, n, round: 0, tok: 0, phase: 'intro', players: Object.keys(scores) };
}

function setup(ctx, g) {
  g.players = active(ctx, g).map((p) => p.id);
  g.falls = {};          // pid → temps tenu (ms)
  g.order = [];          // ordre de chute
  g.seed = Math.floor(Math.random() * 1e9);
  g.goAt = Date.now() + COUNTDOWN;
  g.phase = 'play';
  const tok = ++g.tok;
  if (!g.practice) ctx.schedule(COUNTDOWN + LIMIT, () => { if (g.tok === tok) finishRound(ctx, g); });
}

function startPractice(ctx, g) { g.practice = true; g.ready = []; g.level = 0; setup(ctx, g); }
function startRound(ctx, g) { g.practice = false; g.ready = []; g.round++; g.level = Math.min(LEVELS.length - 1, g.round - 1); setup(ctx, g); }

const standing = (ctx, g) => g.players.filter((id) => !(id in g.falls) && active(ctx, g).some((p) => p.id === id));

function check(ctx, g) {
  if (g.phase !== 'play' || g.practice) return;
  const left = standing(ctx, g);
  if (left.length === 0 || (g.players.length > 1 && left.length <= 1)) finishRound(ctx, g);
}

function finishRound(ctx, g) {
  if (g.phase !== 'play') return;
  g.tok++;
  const now = Date.now();
  const left = standing(ctx, g);
  for (const id of left) g.falls[id] = Math.max(0, now - g.goAt);  // encore debout
  const ranking = [...left.sort(), ...g.order.slice().reverse()].filter((id, i, a) => a.indexOf(id) === i);
  const gains = {};
  ranking.forEach((id, i) => {
    const pts = left.includes(id) ? PLACE_PTS[0] : PLACE_PTS[i];
    if (pts) gain(gains, id, pts, left.includes(id) ? 'Encore debout à la fin 🎪' : `${i + 1}ᵉ place (tombé à ${((g.falls[id] || 0) / 1000).toFixed(1)} s)`);
    g.stats[id].time += Math.round((g.falls[id] || 0) / 1000);
  });
  left.forEach((id) => g.stats[id].wins++);
  applyGains(g.scores, gains);
  g.result = { ranking, left, falls: { ...g.falls }, gains };
  g.phase = 'roundEnd';
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  if (type === 'fall' && g.phase === 'play') {
    if (!g.players.includes(pid) || pid in g.falls || Date.now() < g.goAt) return { quiet: true };
    if (g.practice) { ctx.buzz(pid, [120]); return { quiet: true }; }
    g.falls[pid] = Date.now() - g.goAt;
    g.order.push(pid);
    ctx.buzz(pid, [250]);
    check(ctx, g);
    return;
  }
  if (type === 'ready') { if (practiceReady(ctx, g, pid)) startRound(ctx, g); return; }
  if (type === 'next' && isHost) {
    if (g.phase === 'intro') return startPractice(ctx, g);
    if (g.phase === 'play' && g.practice) return startRound(ctx, g);
    if (g.phase === 'play') return finishRound(ctx, g);
    if (g.phase === 'roundEnd') {
      if (g.round >= g.n) {
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['wins', 'Équilibriste', '🎪', 'a gagné le plus de manches'],
          ['time', 'Nerfs d\'acier', '🧘', 'a tenu le plus longtemps au total (secondes)'],
        ]);
        ctx.endGame(g.scores);
      } else startRound(ctx, g);
    }
  }
}

function onPlayersChanged(ctx, g) {
  if (g.practice && g.phase === 'play' && allReady(ctx, g)) return startRound(ctx, g);
  check(ctx, g);
}

function stateFor(ctx, g, pid) {
  const s = {
    phase: g.phase, round: g.round, totalRounds: g.n, scores: g.scores, participants: Object.keys(g.scores),
    players: g.players || [], practice: !!g.practice, ready: g.ready || [],
    level: g.level || 0, levelName: LEVELS[g.level || 0], seed: g.seed, goIn: g.goAt ? Math.max(0, g.goAt - Date.now()) : 0,
    elapsed: g.goAt ? Math.max(0, Date.now() - g.goAt) : 0,
    fallen: Object.keys(g.falls || {}), limit: LIMIT,
    me: g.players?.includes(pid) ? (g.falls && pid in g.falls ? 'out' : 'play') : 'wait',
  };
  if (g.phase === 'roundEnd') s.result = g.result;
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'funambule',
  color: '#9c6bff',
  name: 'Le Funambule',
  emoji: '🎪',
  tagline: 'Garde ton téléphone bien à plat : ta bille ne doit pas tomber !',
  description: 'Une bille roule sur ton écran : penche le téléphone pour la garder au centre malgré les rafales de vent. Le dernier debout gagne.',
  minPlayers: 1,
  maxPlayers: 16,
  duration: '6 min',
  create,
  onAction,
  onPlayersChanged,
  stateFor,
  _test: { LEVELS, LIMIT },
};
