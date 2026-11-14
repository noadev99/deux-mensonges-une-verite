// ─────────────────────────────────────────────────────────────────────────────
// 🤝 Les Alliances
// 4 manches : chacun choisit en secret un allié. Si c'est réciproque, l'alliance
// est scellée et un coffre commun se remplit. Entre-temps, on s'écrit des
// messages privés (la télé ne montre que les rumeurs : qui écrit à qui).
// Dernière manche : pour chaque coffre, on reste fidèle… ou on poignarde.
//   deux fidèles → on partage · un seul traître → il prend tout · deux → coffre perdu
// ─────────────────────────────────────────────────────────────────────────────
const { gain, applyGains, awards, active, initScores } = require('./_utils');

const ROUNDS = 4;
const CHEST = [100, 150, 200, 250];     // ce qu'une alliance met dans le coffre à chaque manche
const PTS = { SEALED: 25, COURTED: 20 };
const TIME = { pick: 90000, final: 75000 };
const MAX_DM = 5;                        // messages privés par joueur et par manche

const key = (a, b) => [a, b].sort().join('|');

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['sealed', 'stabbed', 'loyal', 'courted']);
  const g = { scores, stats, round: 0, totalRounds: ROUNDS, chests: {}, dms: [], history: [], oral: ctx.oral() };
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

function newRound(ctx, g) {
  g.round++;
  g.picks = {};
  g.roundResult = null;
  setPhase(ctx, g, 'pick', TIME.pick, () => resolvePicks(ctx, g));
}

function resolvePicks(ctx, g) {
  const gains = {};
  const pairs = [], lonely = [];
  for (const [a, b] of Object.entries(g.picks)) {
    if (g.picks[b] === a) {
      if (a < b) {
        pairs.push([a, b]);
        g.chests[key(a, b)] = (g.chests[key(a, b)] || 0) + CHEST[g.round - 1];
        for (const id of [a, b]) { gain(gains, id, PTS.SEALED, 'Alliance scellée 🤝'); g.stats[id].sealed++; }
      }
    } else {
      lonely.push([a, b]);
      gain(gains, b, PTS.COURTED, 'Courtisé(e) 💌');
      g.stats[b].courted++;
    }
  }
  applyGains(g.scores, gains);
  g.roundResult = { pairs, lonely, gains, added: CHEST[g.round - 1] };
  g.history.push({ round: g.round, pairs, lonely });
  setPhase(ctx, g, 'pickReveal');
}

// coffres d'un joueur : [{ with, amount }]
const chestsOf = (g, pid) => Object.entries(g.chests).filter(([k]) => k.split('|').includes(pid))
  .map(([k, amount]) => ({ with: k.split('|').find((x) => x !== pid), amount }));
const holders = (g) => Object.keys(g.scores).filter((id) => chestsOf(g, id).length);

function startFinal(ctx, g) {
  g.decisions = {}; // pid → { autreId: 'loyal' | 'stab' }
  g.locked = {};
  if (!holders(g).length) return finalReveal(ctx, g);
  setPhase(ctx, g, 'final', TIME.final, () => finalReveal(ctx, g));
}

function finalReveal(ctx, g) {
  const gains = {};
  const outcomes = [];
  for (const [k, amount] of Object.entries(g.chests)) {
    const [a, b] = k.split('|');
    const da = g.decisions?.[a]?.[b] || 'loyal';
    const db = g.decisions?.[b]?.[a] || 'loyal';
    let outcome;
    if (da === 'loyal' && db === 'loyal') {
      outcome = 'share';
      for (const id of [a, b]) { gain(gains, id, Math.round(amount / 2), `Coffre partagé avec ${ctx.player(id === a ? b : a)?.name ?? '?'} 🤝`); g.stats[id].loyal++; }
    } else if (da !== db) {
      outcome = 'stab';
      const traitor = da === 'stab' ? a : b;
      const victim = traitor === a ? b : a;
      gain(gains, traitor, amount, `A poignardé ${ctx.player(victim)?.name ?? '?'} : tout le coffre 🗡️`);
      g.stats[traitor].stabbed++;
      g.stats[victim].loyal++;
    } else {
      outcome = 'burn';
      g.stats[a].stabbed++; g.stats[b].stabbed++;
    }
    outcomes.push({ a, b, amount, da, db, outcome });
  }
  applyGains(g.scores, gains);
  g.finalResult = { outcomes, gains };
  setPhase(ctx, g, 'finalReveal');
}

function autoAdvance(ctx, g) {
  const act = active(ctx, g);
  if (!act.length) return;
  if (g.phase === 'pick' && act.every((p) => p.id in g.picks)) resolvePicks(ctx, g);
  if (g.phase === 'final') {
    const need = act.filter((p) => chestsOf(g, p.id).length);
    if (need.every((p) => g.locked[p.id])) finalReveal(ctx, g);
  }
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  if (type === 'pick') {
    if (g.phase !== 'pick' || payload === pid || !(payload in g.scores)) return;
    g.picks[pid] = payload;
    return autoAdvance(ctx, g);
  }
  if (type === 'unpick') { if (g.phase === 'pick') delete g.picks[pid]; return; }
  if (type === 'dm') {
    if ((g.phase !== 'pick' && g.phase !== 'final') || g.oral) return;
    const { to, text } = payload || {};
    if (!(to in g.scores) || to === pid) return;
    if (g.dms.filter((m) => m.from === pid && m.round === g.round && m.phase === g.phase).length >= MAX_DM) return { error: `${MAX_DM} messages maximum pour l'instant` };
    const t = String(text || '').trim().replace(/\s+/g, ' ').slice(0, 100);
    if (!t) return;
    g.dms.push({ from: pid, to, text: t, round: g.round, phase: g.phase, at: Date.now() });
    return;
  }
  if (type === 'decide') {
    if (g.phase !== 'final' || g.locked[pid]) return;
    const { other, choice } = payload || {};
    if (!chestsOf(g, pid).some((c) => c.with === other) || (choice !== 'loyal' && choice !== 'stab')) return;
    g.decisions[pid] = { ...(g.decisions[pid] || {}), [other]: choice };
    return;
  }
  if (type === 'lock') {
    if (g.phase !== 'final') return;
    const mine = chestsOf(g, pid);
    if (mine.some((c) => !g.decisions[pid]?.[c.with])) return { error: 'Décide pour chaque coffre' };
    g.locked[pid] = true;
    return autoAdvance(ctx, g);
  }
  if (type === 'unlock') { if (g.phase === 'final') delete g.locked[pid]; return; }
  if (type === 'next' && isHost) {
    if (g.phase === 'pick') resolvePicks(ctx, g);
    else if (g.phase === 'pickReveal') {
      if (g.round >= g.totalRounds) startFinal(ctx, g);
      else newRound(ctx, g);
    } else if (g.phase === 'final') finalReveal(ctx, g);
    else if (g.phase === 'finalReveal') {
      setPhase(ctx, g, 'end');
      g.awards = awards(g.stats, [
        ['stabbed', 'Brutus', '🗡️', 'a poignardé le plus d\'alliés'],
        ['loyal', 'Fidèle au poste', '🛡️', 'est resté(e) fidèle le plus souvent'],
        ['sealed', 'Diplomate', '🤝', 'a scellé le plus d\'alliances'],
        ['courted', 'Cœur à prendre', '💌', 'a été courtisé(e) le plus souvent'],
      ]);
      ctx.endGame(g.scores);
    }
  }
}

function stateFor(ctx, g, pid) {
  const act = active(ctx, g);
  const s = {
    phase: g.phase, round: g.round, totalRounds: g.totalRounds, scores: g.scores,
    participants: Object.keys(g.scores), oral: g.oral, maxDm: MAX_DM,
    remaining: g.deadline ? Math.max(0, g.deadline - Date.now()) : 0,
    chestAdd: CHEST[g.round - 1],
    // les coffres sont posés sur la table : tout le monde les voit
    chests: Object.entries(g.chests).map(([k, amount]) => ({ a: k.split('|')[0], b: k.split('|')[1], amount })),
    myPick: g.picks?.[pid] ?? null,
    picked: act.filter((p) => p.id in (g.picks || {})).map((p) => p.id),
    needed: act.length,
    // messages privés : seulement ceux qui me concernent
    dms: pid ? g.dms.filter((m) => m.from === pid || m.to === pid) : [],
    myDmCount: g.dms.filter((m) => m.from === pid && m.round === g.round && m.phase === g.phase).length,
    // rumeurs : qui a écrit à qui pendant cette manche (sans le contenu)
    rumors: g.dms.filter((m) => m.round === g.round && m.phase === g.phase).map((m) => ({ from: m.from, to: m.to })),
    history: g.history,
  };
  if (g.phase === 'pickReveal') s.roundResult = g.roundResult;
  if (g.phase === 'final') {
    s.myChests = pid ? chestsOf(g, pid) : [];
    s.myDecisions = g.decisions[pid] || {};
    s.myLocked = !!g.locked[pid];
    const need = act.filter((p) => chestsOf(g, p.id).length);
    s.deciding = need.map((p) => p.id);
    s.lockedIds = need.filter((p) => g.locked[p.id]).map((p) => p.id);
  }
  if (g.phase === 'finalReveal') s.finalResult = g.finalResult;
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'alliances',
  color: '#3fbf8f',
  name: 'Les Alliances',
  emoji: '🤝',
  tagline: 'Fais des alliances… puis décide qui tu poignardes.',
  description: 'Choisis un allié en secret chaque manche pour remplir des coffres communs. À la fin : fidèle ou poignard ?',
  minPlayers: 3,
  maxPlayers: 10,
  duration: '15–20 min',
  oral: true, // à l'oral : on négocie à voix haute, pas de messages privés
  create,
  onAction,
  onPlayersChanged: autoAdvance,
  stateFor,
};
