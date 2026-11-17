// ─────────────────────────────────────────────────────────────────────────────
// 🤠 Le Duel de cowboys
// Deux duellistes, téléphone baissé contre la jambe. Après un temps imprévisible,
// « FEU ! » : le premier qui LÈVE son téléphone (détecté par l'accéléromètre, ou en
// touchant l'écran) gagne. Bouger avant le signal = faux départ, duel perdu.
// Les spectateurs parient sur le gagnant.
// Le temps de réaction est mesuré PAR LE TÉLÉPHONE (depuis l'affichage du signal),
// pour que la qualité du réseau ne compte pas.
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, gain, applyGains, awards, active, initScores, practiceReady, allReady } = require('./_utils');

const READY_MS = 3000;            // « Baissez vos armes… »
const WAIT_MIN = 2000, WAIT_MAX = 6500;
const FIRE_MS = 4000;             // temps max pour dégainer après le signal
const MIN_RT = 90;                // plus rapide que ça = anticipation = faux départ
const PTS = { WIN: 100, BET: 30 };

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['wins', 'early', 'bets']);
  const ids = Object.keys(scores);
  const n = ctx.rounds(ids.length <= 2 ? 5 : Math.min(12, Math.max(6, ids.length)));
  return { scores, stats, n, round: 0, tok: 0, duels: Object.fromEntries(ids.map((id) => [id, 0])), best: {}, phase: 'intro', players: ids };
}

function startPractice(ctx, g) {
  g.practice = true;
  g.ready = [];
  g.players = active(ctx, g).map((p) => p.id);
  g.phase = 'practice';
}

// les deux joueurs présents qui ont fait le moins de duels (au hasard en cas d'égalité)
function pickPair(ctx, g) {
  const ids = shuffle(active(ctx, g).map((p) => p.id)).sort((a, b) => g.duels[a] - g.duels[b]);
  return ids.slice(0, 2);
}

function nextDuel(ctx, g) {
  g.practice = false;
  const pair = pickPair(ctx, g);
  if (pair.length < 2) return endGame(ctx, g);
  g.round++;
  pair.forEach((id) => g.duels[id]++);
  g.cur = { pair, bets: {}, rt: {}, early: [], winner: null, result: null };
  g.phase = 'aim';
  const tok = ++g.tok;
  const wait = READY_MS + WAIT_MIN + Math.random() * (WAIT_MAX - WAIT_MIN);
  g.armedAt = Date.now() + READY_MS; // avant : on baisse son téléphone, les mouvements ne comptent pas
  g.fireAt = Date.now() + wait;
  ctx.schedule(wait, () => {
    if (g.tok !== tok || g.phase !== 'aim') return;
    g.phase = 'fire';
    ctx.schedule(FIRE_MS, () => { if (g.tok === tok && g.phase === 'fire') resolve(ctx, g); });
  });
}

function resolve(ctx, g) {
  if (g.phase !== 'aim' && g.phase !== 'fire') return;
  g.tok++;
  const c = g.cur, [a, b] = c.pair;
  let winner = null, why = '';
  if (c.early.length === 2) why = 'Deux faux départs : personne ne gagne 🤦';
  else if (c.early.length === 1) { winner = c.pair.find((id) => id !== c.early[0]); why = 'early'; }
  else {
    const ra = c.rt[a], rb = c.rt[b];
    if (ra == null && rb == null) why = 'Personne n\'a dégainé 😴';
    else if (rb == null || (ra != null && ra < rb)) winner = a;
    else if (ra == null || rb < ra) winner = b;
    else why = 'Égalité parfaite !';
  }
  const gains = {};
  if (winner) {
    gain(gains, winner, PTS.WIN, c.early.length ? 'Duel gagné (faux départ de l\'adversaire)' : `Plus rapide : ${c.rt[winner]} ms ⚡`);
    g.stats[winner].wins++;
    for (const [id, pick] of Object.entries(c.bets)) if (pick === winner) { gain(gains, id, PTS.BET, 'Bon pari 💰'); g.stats[id].bets++; }
  }
  for (const id of c.pair) if (c.rt[id] != null && !c.early.includes(id)) g.best[id] = Math.min(g.best[id] ?? Infinity, c.rt[id]);
  applyGains(g.scores, gains);
  c.winner = winner;
  c.why = why;
  c.gains = gains;
  g.phase = 'result';
}

function endGame(ctx, g) {
  g.phase = 'end';
  g.tok++;
  const fast = Object.entries(g.best).sort((x, y) => x[1] - y[1])[0];
  g.awards = [
    ...awards(g.stats, [
      ['wins', 'La gâchette la plus rapide', '🤠', 'a gagné le plus de duels'],
      ['bets', 'Parieur avisé', '💰', 'a fait le plus de bons paris'],
      ['early', 'Doigt nerveux', '😬', 'a fait le plus de faux départs'],
    ]),
    ...(fast ? [{ title: 'Réflexe record', emoji: '⚡', desc: 'meilleur temps de réaction (ms)', value: fast[1], winners: [fast[0]] }] : []),
  ];
  ctx.endGame(g.scores);
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  if (type === 'ready') { if (practiceReady(ctx, g, pid)) nextDuel(ctx, g); return; }
  const c = g.cur;
  if (type === 'bet' && g.phase === 'aim') {
    if (c.pair.includes(pid) || !c.pair.includes(payload)) return { quiet: true };
    c.bets[pid] = payload;
    return;
  }
  if (type === 'draw' && (g.phase === 'aim' || g.phase === 'fire')) {
    if (!c.pair.includes(pid) || c.early.includes(pid) || pid in c.rt) return { quiet: true };
    if (g.phase === 'aim') {
      if (Date.now() < g.armedAt) return { quiet: true };   // on est encore en train de baisser son arme
      // bougé avant le signal : faux départ, duel perdu tout de suite
      c.early.push(pid);
      g.stats[pid].early++;
      ctx.buzz(pid, [300]);
      return resolve(ctx, g);
    }
    const rt = Math.round(Number(payload));
    if (!(rt >= MIN_RT)) {                                  // réaction impossible : il avait anticipé
      c.early.push(pid);
      g.stats[pid].early++;
      return resolve(ctx, g);
    }
    c.rt[pid] = Math.min(rt, FIRE_MS);
    if (c.pair.every((id) => id in c.rt)) return resolve(ctx, g);
    return { quiet: true };
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'intro') return startPractice(ctx, g);
    if (g.phase === 'practice') return nextDuel(ctx, g);
    if (g.phase === 'aim' || g.phase === 'fire') return resolve(ctx, g);
    if (g.phase === 'result') return g.round >= g.n ? endGame(ctx, g) : nextDuel(ctx, g);
  }
}

function onPlayersChanged(ctx, g) {
  if (g.phase === 'practice' && allReady(ctx, g)) return nextDuel(ctx, g);
  // un duelliste s'en va pendant le duel : on l'annule et on en relance un autre
  if ((g.phase === 'aim' || g.phase === 'fire') && !g.cur.pair.every((id) => active(ctx, g).some((p) => p.id === id))) {
    g.cur.pair.forEach((id) => { g.duels[id] = Math.max(0, g.duels[id] - 1); });
    g.round--;
    if (active(ctx, g).length >= 2) nextDuel(ctx, g); else endGame(ctx, g);
  }
}

function stateFor(ctx, g, pid) {
  const s = {
    phase: g.phase, round: g.round, totalRounds: g.n, scores: g.scores, participants: Object.keys(g.scores),
    practice: !!g.practice, ready: g.ready || [], players: g.players || [],
  };
  if (g.cur && g.phase !== 'practice') {
    const c = g.cur;
    s.cur = { pair: c.pair, bets: Object.keys(c.bets).length, myBet: c.bets[pid] ?? null, me: c.pair.includes(pid) ? 'duel' : 'watch', drew: pid in c.rt || c.early.includes(pid) };
    // pendant « aim », on n'envoie PAS l'heure du signal (sinon on pourrait tricher)
    if (g.phase === 'aim') s.cur.armIn = Math.max(0, g.armedAt - Date.now());
    if (g.phase === 'result') Object.assign(s.cur, { winner: c.winner, why: c.why, rt: c.rt, early: c.early, betsList: c.bets, gains: c.gains });
  }
  if (g.phase === 'end') { s.awards = g.awards; s.best = g.best; }
  return s;
}

module.exports = {
  id: 'duel',
  color: '#d98a3a',
  name: 'Le Duel de cowboys',
  emoji: '🤠',
  tagline: 'Au signal « FEU ! », lève ton téléphone le plus vite possible. Pas avant !',
  description: 'Duels de réflexes en tête à tête : téléphone baissé, on attend le signal, le plus rapide à lever gagne. Les spectateurs parient.',
  minPlayers: 2,
  maxPlayers: 12,
  duration: '6 min',
  create,
  onAction,
  onPlayersChanged,
  stateFor,
  _test: { MIN_RT, FIRE_MS },
};
