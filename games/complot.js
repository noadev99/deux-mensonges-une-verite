// ─────────────────────────────────────────────────────────────────────────────
// 🗡️ Le Complot
// Des traîtres cachés parmi les joueurs. 5 missions : le chef propose une
// équipe, tout le monde vote. L'équipe part en mission et chacun joue en secret
// « Réussite » ou « Sabotage » (seuls les traîtres peuvent saboter).
// 3 réussites → les loyaux gagnent les missions · 3 sabotages → les traîtres.
// Pour finir : on accuse. Démasquer les traîtres rapporte gros.
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, gain, applyGains, awards, active, initScores } = require('./_utils');

// taille des équipes pour chaque mission, selon le nombre de joueurs
const TEAMS = { 5: [2, 3, 2, 3, 3], 6: [2, 3, 4, 3, 4], 7: [2, 3, 3, 4, 4], 8: [3, 4, 4, 5, 5], 9: [3, 4, 4, 5, 5], 10: [3, 4, 4, 5, 5] };
const traitorCount = (n) => (n <= 6 ? 1 : n <= 8 ? 2 : 3);
const MAX_REJECTS = 3; // au 3ᵉ refus d'affilée, l'équipe part quand même
const PTS = { MISSION_OK: 50, MISSION_KO: 100, WIN_LOYAL: 100, WIN_TRAITOR: 200, FOUND: 100, HIDDEN: 150 };

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['sabotages', 'found', 'missions']);
  const ids = Object.keys(scores);
  const n = Math.max(5, Math.min(10, ids.length));
  const traitors = shuffle(ids).slice(0, traitorCount(ids.length));
  const g = {
    scores, stats, traitors,
    sizes: TEAMS[n],
    leaders: shuffle(ids), leaderIdx: 0,
    mission: 0, results: [], rejects: 0,
    team: [], votes: {}, plays: {}, accuse: {}, result: null, missionResult: null,
    phase: 'propose',
  };
  return g;
}

const leader = (g) => g.leaders[g.leaderIdx % g.leaders.length];
const isTraitor = (g, id) => g.traitors.includes(id);
const count = (g, v) => g.results.filter((r) => r === v).length;

function nextLeader(ctx, g) {
  const present = new Set(active(ctx, g).map((p) => p.id));
  for (let k = 0; k < g.leaders.length; k++) {
    g.leaderIdx++;
    if (present.has(leader(g))) return;
  }
}

function startPropose(ctx, g) {
  g.team = [];
  g.votes = {};
  g.plays = {};
  g.phase = 'propose';
  if (!active(ctx, g).some((p) => p.id === leader(g))) nextLeader(ctx, g);
}

function closeVote(ctx, g) {
  const yes = Object.values(g.votes).filter((v) => v === 'yes').length;
  const no = Object.values(g.votes).filter((v) => v === 'no').length;
  g.approved = yes > no;
  g.forced = !g.approved && g.rejects + 1 >= MAX_REJECTS;
  g.phase = 'voteResult';
}

function closeMission(ctx, g) {
  const cards = g.team.map((id) => g.plays[id] || 'ok'); // absent = réussite
  const sabotages = cards.filter((c) => c === 'ko').length;
  const ok = sabotages === 0;
  g.results.push(ok ? 'ok' : 'ko');
  const gains = {};
  for (const id of Object.keys(g.scores)) {
    if (ok && !isTraitor(g, id)) gain(gains, id, PTS.MISSION_OK, 'Mission réussie ✅');
    if (!ok && isTraitor(g, id)) gain(gains, id, PTS.MISSION_KO, 'Mission sabotée 💣');
  }
  for (const id of g.team) { g.stats[id].missions++; if (g.plays[id] === 'ko') g.stats[id].sabotages++; }
  applyGains(g.scores, gains);
  g.missionResult = { ok, sabotages, cards: shuffle(cards), team: g.team, gains };
  g.phase = 'missionResult';
}

function startAccuse(g) {
  g.winner = count(g, 'ok') >= 3 ? 'loyal' : 'traitor';
  g.accuse = {};
  g.phase = 'accuse';
}

function finish(ctx, g) {
  const gains = {};
  const counts = {};
  for (const t of Object.values(g.accuse)) counts[t] = (counts[t] || 0) + 1;
  const max = Math.max(0, ...Object.values(counts));
  const top = max ? Object.keys(counts).filter((id) => counts[id] === max) : [];
  for (const id of Object.keys(g.scores)) {
    if (isTraitor(g, id)) {
      if (g.winner === 'traitor') gain(gains, id, PTS.WIN_TRAITOR, 'Le complot a réussi 🗡️');
      if (!top.includes(id)) gain(gains, id, PTS.HIDDEN, 'Jamais démasqué 🥷');
    } else {
      if (g.winner === 'loyal') gain(gains, id, PTS.WIN_LOYAL, 'Les missions sont sauvées 🛡️');
      if (isTraitor(g, g.accuse[id])) { gain(gains, id, PTS.FOUND, 'A accusé un traître 👉'); g.stats[id].found++; }
    }
  }
  applyGains(g.scores, gains);
  g.result = { gains, counts, top };
  g.phase = 'final';
}

function autoAdvance(ctx, g) {
  const act = active(ctx, g);
  if (!act.length) return;
  if (g.phase === 'propose' && !act.some((p) => p.id === leader(g))) nextLeader(ctx, g);
  if (g.phase === 'vote' && act.every((p) => p.id in g.votes)) closeVote(ctx, g);
  if (g.phase === 'mission') {
    const present = new Set(act.map((p) => p.id));
    if (g.team.filter((id) => present.has(id)).every((id) => id in g.plays)) closeMission(ctx, g);
  }
  if (g.phase === 'accuse' && act.every((p) => p.id in g.accuse)) finish(ctx, g);
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  const size = g.sizes[g.mission];

  if (type === 'team') {
    if (g.phase !== 'propose' || pid !== leader(g)) return;
    const team = Array.isArray(payload) ? [...new Set(payload)].filter((id) => id in g.scores) : [];
    if (team.length !== size) return { error: `Choisis exactement ${size} joueurs` };
    g.team = team;
    g.votes = {};
    g.phase = 'vote';
    return;
  }
  if (type === 'vote') {
    if (g.phase !== 'vote' || (payload !== 'yes' && payload !== 'no')) return;
    g.votes[pid] = payload;
    return autoAdvance(ctx, g);
  }
  if (type === 'play') {
    if (g.phase !== 'mission' || !g.team.includes(pid) || pid in g.plays) return;
    if (payload !== 'ok' && payload !== 'ko') return;
    if (payload === 'ko' && !isTraitor(g, pid)) return { error: 'Seuls les traîtres peuvent saboter 😇' };
    g.plays[pid] = payload;
    return autoAdvance(ctx, g);
  }
  if (type === 'accuse') {
    if (g.phase !== 'accuse' || payload === pid || !(payload in g.scores)) return;
    g.accuse[pid] = payload;
    return autoAdvance(ctx, g);
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'propose') nextLeader(ctx, g); // chef absent : on passe au suivant
    else if (g.phase === 'vote') closeVote(ctx, g);
    else if (g.phase === 'voteResult') {
      if (g.approved || g.forced) { g.rejects = 0; g.plays = {}; g.phase = 'mission'; }
      else { g.rejects++; nextLeader(ctx, g); startPropose(ctx, g); }
    } else if (g.phase === 'mission') closeMission(ctx, g);
    else if (g.phase === 'missionResult') {
      if (count(g, 'ok') >= 3 || count(g, 'ko') >= 3) startAccuse(g);
      else { g.mission++; nextLeader(ctx, g); startPropose(ctx, g); }
    } else if (g.phase === 'accuse') finish(ctx, g);
    else if (g.phase === 'final') {
      g.phase = 'end';
      g.awards = awards(g.stats, [
        ['sabotages', 'Saboteur', '💣', 'a saboté le plus de missions'],
        ['found', 'Fin limier', '👉', 'a démasqué un traître'],
        ['missions', 'Agent de terrain', '🎒', 'est parti le plus souvent en mission'],
      ]);
      ctx.endGame(g.scores);
    }
  }
}

function stateFor(ctx, g, pid) {
  const act = active(ctx, g);
  const traitor = pid != null && isTraitor(g, pid);
  const over = g.phase === 'final' || g.phase === 'end';
  const s = {
    phase: g.phase, scores: g.scores, participants: Object.keys(g.scores),
    round: g.mission + 1, totalRounds: 5,
    sizes: g.sizes, mission: g.mission, results: g.results, rejects: g.rejects, maxRejects: MAX_REJECTS,
    nTraitors: g.traitors.length,
    leader: leader(g), team: g.team,
    // rôle : chacun ne connaît que le sien (les traîtres se connaissent entre eux)
    role: pid == null || !(pid in g.scores) ? null : traitor ? 'traitor' : 'loyal',
    allies: traitor ? g.traitors : null,
    myVote: g.votes[pid] ?? null,
    voted: act.filter((p) => p.id in g.votes).map((p) => p.id),
    myPlay: g.plays[pid] ?? null,
    played: g.team.filter((id) => id in g.plays),
    myAccuse: g.accuse[pid] ?? null,
    accused: act.filter((p) => p.id in g.accuse).map((p) => p.id),
    needed: act.length,
    winner: g.winner ?? null,
  };
  if (g.phase === 'voteResult') { s.votes = g.votes; s.approved = g.approved; s.forced = g.forced; }
  if (g.phase === 'missionResult') s.missionResult = g.missionResult;
  if (over) { s.traitors = g.traitors; s.result = g.result; s.accuseVotes = g.accuse; }
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'complot',
  color: '#8f5bd6',
  name: 'Le Complot',
  emoji: '🗡️',
  tagline: 'Des traîtres sabotent vos missions. Démasquez-les.',
  description: 'Le chef choisit une équipe, on vote, l\'équipe part en mission… et les traîtres cachés peuvent saboter.',
  minPlayers: 5,
  maxPlayers: 10,
  duration: '20–30 min',
  create,
  onAction,
  onPlayersChanged: autoAdvance,
  stateFor,
};
