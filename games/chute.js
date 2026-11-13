// ─────────────────────────────────────────────────────────────────────────────
// ✍️ La Chute
// Une phrase à trou. Chacun la complète en secret, puis on vote (anonymement)
// pour la réponse la plus drôle.
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, sample, gain, applyGains, awards, active, initScores } = require('./_utils');

const ROUNDS = 6;
const PTS = { VOTE: 100, UNANIMOUS: 200, GOOD_TASTE: 25 };

const PROMPTS = [
  'Le pire cadeau d\'anniversaire, c\'est ___.',
  'La vraie raison pour laquelle les dinosaures ont disparu : ___.',
  'Ce qu\'il ne faut jamais dire à un premier rendez-vous : « ___ ».',
  'Mon talent caché le plus inutile : ___.',
  'Le nouveau parfum de glace qui va faire un flop : ___.',
  'Ce qu\'on trouve vraiment au fond du sac de ma mère : ___.',
  'Le titre de mon autobiographie : « ___ ».',
  'La pire excuse pour arriver en retard : « ___ ».',
  'Le prochain sport olympique : ___.',
  'Ce que les chats pensent vraiment de nous : « ___ ».',
  'La nouvelle règle à l\'école qui ferait scandale : ___.',
  'Ce que je ferais si j\'étais invisible pendant une heure : ___.',
  'Le pire nom pour un restaurant : « ___ ».',
  'La phrase qui ruine un mariage : « ___ ».',
  'Le slogan de ma future campagne présidentielle : « ___ ».',
  'Ce que je cache dans mon historique de recherche : « ___ ».',
  'La pire chose à crier dans une bibliothèque : « ___ ».',
  'Le super-pouvoir le plus nul du monde : ___.',
  'Ce que dit le GPS quand il en a marre de moi : « ___ ».',
  'La nouvelle appli dont personne n\'avait besoin : ___.',
  'Le vrai secret de la recette de ma grand-mère : ___.',
  'Le pire conseil de drague : « ___ ».',
  'Ce qu\'il y a vraiment dans le Triangle des Bermudes : ___.',
  'Le métier du futur : ___.',
  'Ce que mon chien dirait s\'il pouvait parler : « ___ ».',
  'Le pire thème pour une soirée déguisée : ___.',
  'La première chose que je fais en gagnant au loto : ___.',
  'Ce que les extraterrestres trouvent bizarre chez nous : ___.',
  'La pire musique pour un enterrement : ___.',
  'Le message d\'absence le plus honnête : « ___ ».',
  'Ce que personne n\'avoue faire sous la douche : ___.',
  'Le pire endroit pour une demande en mariage : ___.',
  'La 8e merveille du monde : ___.',
  'L\'objet que j\'emporterais sur une île déserte (et pourquoi c\'est une mauvaise idée) : ___.',
  'Le plat le plus triste du monde : ___.',
  'Le pire mot de passe possible : « ___ ».',
  'Ce que le père Noël fait le reste de l\'année : ___.',
  'La chose la plus gênante à oublier dans un taxi : ___.',
  'Le pire job d\'été : ___.',
  'La nouvelle émission de télé-réalité : « ___ ».',
  'Ce qui fait vraiment peur aux fantômes : ___.',
  'La pire fin pour un film romantique : ___.',
  'Le cours qu\'on devrait vraiment apprendre à l\'école : ___.',
  'Ce que je dirais à mon moi de 12 ans : « ___ ».',
  'La pire odeur pour une bougie parfumée : ___.',
  'Le vrai nom de code de ce groupe d\'amis : « ___ ».',
  'Ce qui s\'est réellement passé à ma dernière soirée : ___.',
  'Le pire tatouage à se faire sur le front : « ___ ».',
];

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['votes', 'unanimous', 'taste']);
  const g = { scores, stats, round: 0, totalRounds: ROUNDS, prompts: sample(PROMPTS, ROUNDS) };
  newRound(g);
  return g;
}

function newRound(g) {
  g.round++;
  g.prompt = g.prompts[g.round - 1];
  g.answers = {};
  g.options = null;
  g.votes = {};
  g.result = null;
  g.phase = 'write';
}

function startVote(g) {
  g.options = shuffle(Object.entries(g.answers).map(([author, text]) => ({ author, text })));
  g.phase = 'vote';
}

function reveal(ctx, g) {
  const gains = {};
  const counts = {};
  for (const [voter, idx] of Object.entries(g.votes)) {
    const opt = g.options[idx];
    if (!opt || opt.author === voter) continue;
    counts[opt.author] = (counts[opt.author] || 0) + 1;
    gain(gains, opt.author, PTS.VOTE, `Vote de ${ctx.player(voter)?.name ?? '?'} 😂`);
    g.stats[opt.author].votes++;
  }
  const max = Math.max(0, ...Object.values(counts));
  const winners = max > 0 ? Object.keys(counts).filter((id) => counts[id] === max) : [];
  const nVoters = Object.keys(g.votes).length;
  for (const id of winners) {
    // unanimité : tous les autres votants ont choisi ta réponse
    const others = Object.keys(g.votes).filter((v) => v !== id).length;
    if (others >= 2 && counts[id] === others) { gain(gains, id, PTS.UNANIMOUS, 'Unanimité ! 👑'); g.stats[id].unanimous++; }
  }
  for (const [voter, idx] of Object.entries(g.votes)) {
    const opt = g.options[idx];
    if (opt && winners.includes(opt.author)) { gain(gains, voter, PTS.GOOD_TASTE, 'A voté pour la meilleure 👌'); g.stats[voter].taste++; }
  }
  applyGains(g.scores, gains);
  g.result = { gains, winners, counts, nVoters };
  g.phase = 'reveal';
}

function autoAdvance(ctx, g) {
  const act = active(ctx, g);
  if (g.phase === 'write' && act.length && act.every((p) => p.id in g.answers)) startVote(g);
  else if (g.phase === 'vote') {
    // ceux qui ont une réponse à voter (il faut au moins une réponse qui n'est pas la sienne)
    const voters = act.filter((p) => g.options.some((o) => o.author !== p.id));
    if (voters.every((p) => p.id in g.votes)) reveal(ctx, g);
  }
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  if (type === 'answer') {
    if (g.phase !== 'write') return;
    const text = String(payload || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    if (text.length < 1) return { error: 'Écris ta réponse' };
    g.answers[pid] = text;
    return autoAdvance(ctx, g);
  }
  if (type === 'edit') { if (g.phase === 'write') delete g.answers[pid]; return; }
  if (type === 'vote') {
    if (g.phase !== 'vote') return;
    const opt = g.options[payload];
    if (!opt || opt.author === pid) return;
    g.votes[pid] = payload;
    return autoAdvance(ctx, g);
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'write') {
      if (Object.keys(g.answers).length < 2) return { error: 'Il faut au moins 2 réponses' };
      startVote(g);
    } else if (g.phase === 'vote') reveal(ctx, g);
    else if (g.phase === 'reveal') {
      if (g.round >= g.totalRounds) {
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['votes', 'Roi de la vanne', '😂', 'a reçu le plus de votes'],
          ['unanimous', 'Unanimité', '👑', 'a mis tout le monde d\'accord'],
          ['taste', 'Bon public', '👌', 'a voté le plus souvent pour la meilleure'],
        ]);
        ctx.endGame(g.scores);
      } else newRound(g);
    }
  }
}

function stateFor(ctx, g, pid) {
  const act = active(ctx, g);
  const s = {
    phase: g.phase, round: g.round, totalRounds: g.totalRounds, scores: g.scores,
    participants: Object.keys(g.scores),
    prompt: g.prompt,
    myAnswer: g.answers[pid] ?? null,
    written: Object.keys(g.answers),
    needed: act.length,
  };
  if (g.phase === 'vote') {
    s.options = g.options.map((o) => ({ text: o.text, mine: o.author === pid }));
    s.myVote = g.votes[pid] ?? null;
    s.voted = Object.keys(g.votes);
  }
  if (g.phase === 'reveal') {
    s.options = g.options.map((o, i) => ({ text: o.text, author: o.author, voters: Object.keys(g.votes).filter((v) => g.votes[v] === i) }))
      .sort((a, b) => b.voters.length - a.voters.length);
    s.result = g.result;
  }
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'chute',
  color: '#ff8a4c',
  name: 'La Chute',
  emoji: '✍️',
  tagline: 'Complète la phrase. Fais rire la table.',
  description: 'Une phrase à trou, des réponses anonymes, un vote pour la plus drôle.',
  minPlayers: 3,
  maxPlayers: 16,
  duration: '15 min',
  create,
  onAction,
  onPlayersChanged: autoAdvance,
  stateFor,
};
