// ─────────────────────────────────────────────────────────────────────────────
// 💰 Le Butin
// Chaque manche, les joueurs sont mis en duo devant un butin. On négocie
// (à l'oral ou par messages), puis chacun choisit en secret :
//   🤝 Partager / 🗡️ Trahir
// Deux « Partager » → moitié chacun · un seul traître → il rafle tout
// Deux traîtres → personne n'a rien. La mise grimpe à chaque manche.
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, gain, applyGains, awards, active, initScores } = require('./_utils');

const POTS = [100, 150, 200, 300, 500];   // la dernière manche est le « coup final »
const TIME = { deal: 75000 };             // négociation + choix
const MAX_MSG = 3;                        // messages par joueur et par manche (à l'écrit)

const pairKey = (a, b) => [a, b].sort().join('|');

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['betray', 'share', 'fooled']);
  const n = ctx.rounds(POTS.length);
  // en version courte on garde les plus gros butins (le coup final reste à 500)
  const g = { scores, stats, round: 0, totalRounds: n, pots: POTS.slice(POTS.length - n), met: {}, rested: {}, oral: ctx.oral() };
  newRound(ctx, g);
  return g;
}

function setPhase(ctx, g, phase, ms, onTimeout) {
  g.phase = phase;
  g.deadline = ms ? Date.now() + ms : null;
  if (!ms) return;
  const stamp = (g.stamp = (g.stamp || 0) + 1);
  setImmediate(() => ctx.schedule(ms + 1000, () => { if (g.stamp === stamp) onTimeout(); }));
}

// Duos au hasard, en évitant de reformer les mêmes paires
function makeDuos(g, ids) {
  let best = null, bestCost = Infinity;
  for (let t = 0; t < 40; t++) {
    let order = shuffle(ids);
    let rest = null;
    if (order.length % 2) {
      // celui qui s'est le moins reposé passe son tour
      order.sort((a, b) => (g.rested[a] || 0) - (g.rested[b] || 0));
      const minR = g.rested[order[0]] || 0;
      const cands = order.filter((id) => (g.rested[id] || 0) === minR);
      rest = cands[Math.floor(Math.random() * cands.length)];
      order = shuffle(order.filter((id) => id !== rest));
    }
    const duos = [];
    for (let i = 0; i + 1 < order.length; i += 2) duos.push({ a: order[i], b: order[i + 1] });
    const cost = duos.reduce((s, d) => s + (g.met[pairKey(d.a, d.b)] || 0), 0);
    if (cost < bestCost) { best = { duos, rest }; bestCost = cost; }
    if (!cost) break;
  }
  return best;
}

function newRound(ctx, g) {
  g.round++;
  g.pot = g.pots[g.round - 1];
  let ids = active(ctx, g).map((p) => p.id);
  if (ids.length < 2) ids = Object.keys(g.scores);
  const { duos, rest } = makeDuos(g, ids);
  g.duos = duos;
  g.rest = rest;
  if (rest) g.rested[rest] = (g.rested[rest] || 0) + 1;
  for (const d of duos) g.met[pairKey(d.a, d.b)] = (g.met[pairKey(d.a, d.b)] || 0) + 1;
  g.choices = {};
  g.msgs = duos.map(() => []);
  g.result = null;
  setPhase(ctx, g, 'deal', TIME.deal, () => reveal(ctx, g));
}

const duoIndex = (g, pid) => g.duos.findIndex((d) => d.a === pid || d.b === pid);
const inDuo = (g) => g.duos.flatMap((d) => [d.a, d.b]);

function reveal(ctx, g) {
  const gains = {};
  const duos = g.duos.map((d) => {
    const ca = g.choices[d.a] || 'share'; // pas de choix = on fait confiance
    const cb = g.choices[d.b] || 'share';
    const out = { a: d.a, b: d.b, ca, cb, auto: [!g.choices[d.a], !g.choices[d.b]] };
    for (const [me, mine, other] of [[d.a, ca, cb], [d.b, cb, ca]]) {
      if (mine === 'betray') g.stats[me].betray++; else g.stats[me].share++;
      if (mine === 'share' && other === 'share') gain(gains, me, g.pot / 2, 'Partage équitable 🤝');
      else if (mine === 'betray' && other === 'share') gain(gains, me, g.pot, 'Trahison réussie : tout le butin 🗡️');
      else if (mine === 'share' && other === 'betray') g.stats[me].fooled++;
    }
    out.outcome = ca === 'share' && cb === 'share' ? 'share' : ca === 'betray' && cb === 'betray' ? 'burn' : 'betray';
    return out;
  });
  applyGains(g.scores, gains);
  g.result = { duos, gains };
  setPhase(ctx, g, 'reveal');
}

function autoAdvance(ctx, g) {
  if (g.phase !== 'deal') return;
  const players = new Set(inDuo(g));
  const act = active(ctx, g).filter((p) => players.has(p.id));
  if (act.length && act.every((p) => p.id in g.choices)) reveal(ctx, g);
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  if (type === 'msg') {
    if (g.phase !== 'deal' || g.oral) return;
    const i = duoIndex(g, pid);
    if (i < 0) return;
    if (g.msgs[i].filter((m) => m.from === pid).length >= MAX_MSG) return { error: `${MAX_MSG} messages maximum par manche` };
    const text = String(payload || '').trim().replace(/\s+/g, ' ').slice(0, 90);
    if (!text) return;
    g.msgs[i].push({ from: pid, text });
    return;
  }
  if (type === 'choose') {
    if (g.phase !== 'deal' || duoIndex(g, pid) < 0 || pid in g.choices) return;
    if (payload !== 'share' && payload !== 'betray') return;
    g.choices[pid] = payload;
    return autoAdvance(ctx, g);
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'deal') reveal(ctx, g);
    else if (g.phase === 'reveal') {
      if (g.round >= g.totalRounds) {
        setPhase(ctx, g, 'end');
        g.awards = awards(g.stats, [
          ['betray', 'Judas', '🗡️', 'a trahi le plus souvent'],
          ['share', 'Bisounours', '🤝', 'a partagé le plus souvent'],
          ['fooled', 'Naïf', '🐑', 's\'est fait trahir le plus souvent'],
        ]);
        ctx.endGame(g.scores);
      } else newRound(ctx, g);
    }
  }
}

function stateFor(ctx, g, pid) {
  const i = pid ? duoIndex(g, pid) : -1;
  const s = {
    phase: g.phase, round: g.round, totalRounds: g.totalRounds, scores: g.scores,
    participants: Object.keys(g.scores),
    pot: g.pot, final: g.round === g.totalRounds, oral: g.oral, maxMsg: MAX_MSG,
    remaining: g.deadline ? Math.max(0, g.deadline - Date.now()) : 0,
    rest: g.rest,
    // public : qui a choisi, jamais quoi
    duos: g.duos.map((d) => ({ a: d.a, b: d.b, chosen: [d.a in g.choices, d.b in g.choices] })),
    myDuo: i,
    partner: i >= 0 ? (g.duos[i].a === pid ? g.duos[i].b : g.duos[i].a) : null,
    myChoice: g.choices[pid] ?? null,
    msgs: i >= 0 ? g.msgs[i] : [],
    myMsgCount: i >= 0 ? g.msgs[i].filter((m) => m.from === pid).length : 0,
  };
  if (g.phase === 'reveal') s.result = g.result;
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'butin',
  color: '#f5b83d',
  name: 'Le Butin',
  emoji: '💰',
  tagline: 'Partager ou tout rafler ? Fais-toi confiance… ou pas.',
  description: 'En duo devant un butin, on négocie puis on choisit en secret : partager, ou trahir pour tout prendre.',
  minPlayers: 3,
  maxPlayers: 16,
  duration: '10–15 min',
  oral: true, // à l'oral : on négocie à voix haute, sans messages
  create,
  onAction,
  onPlayersChanged: autoAdvance,
  stateFor,
};
