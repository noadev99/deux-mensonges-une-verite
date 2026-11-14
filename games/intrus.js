// ─────────────────────────────────────────────────────────────────────────────
// 🕵️ L'Intrus
// Tout le monde connaît le mot secret… sauf l'intrus. Chacun donne un indice
// d'un mot, à tour de rôle (2 tours). Puis vote. Si l'intrus est démasqué,
// il peut encore gagner en devinant le mot.
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, sample, normalize, gain, applyGains, awards, active, initScores } = require('./_utils');

const TOURS = 2;
const MAX_ROUNDS = 6;
const PTS = { FOUND: 100, TEAM_WIN: 50, ESCAPED: 200, STOLE: 150 };

const WORDS = [
  'plage', 'pizza', 'girafe', 'château', 'avion', 'chocolat', 'piscine', 'guitare', 'montagne', 'vampire',
  'hôpital', 'cinéma', 'pirate', 'football', 'mariage', 'camping', 'dentiste', 'fromage', 'dragon', 'neige',
  'licorne', 'sushi', 'volcan', 'bibliothèque', 'astronaute', 'cirque', 'boulangerie', 'requin', 'Noël', 'zombie',
  'karaoké', 'parapluie', 'tatouage', 'métro', 'croissant', 'fantôme', 'jungle', 'casino', 'sorcière', 'aéroport',
  'pingouin', 'barbecue', 'robot', 'ascenseur', 'Halloween', 'cowboy', 'tracteur', 'bougie', 'miroir', 'champagne',
  'escargot', 'ninja', 'igloo', 'marathon', 'coiffeur', 'trampoline', 'désert', 'prison', 'fusée', 'kangourou',
  'raclette', 'smartphone', 'carnaval', 'pyramide', 'abeille', 'sous-marin', 'opéra', 'chameau', 'pompier', 'lune',
  'crêpe', 'magicien', 'tennis', 'arc-en-ciel', 'yoga', 'cactus', 'discothèque', 'pâtes', 'hérisson', 'télécommande',
];

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['found', 'escaped', 'stole', 'intruderTimes']);
  const ids = Object.keys(scores);
  const rounds = Math.min(MAX_ROUNDS, Math.max(3, ids.length));
  const g = {
    scores, stats,
    oral: ctx.oral(), // à l'oral : chacun dit son indice à voix haute
    round: 0, totalRounds: rounds,
    words: sample(WORDS, rounds),
    // chaque joueur est intrus au plus une fois (si assez de manches)
    intruders: shuffle(ids).concat(shuffle(ids)).slice(0, rounds),
  };
  newRound(ctx, g);
  return g;
}

function newRound(ctx, g) {
  g.round++;
  g.word = g.words[g.round - 1];
  g.intruderId = g.intruders[g.round - 1];
  // ordre de parole : l'intrus ne commence jamais
  let order = shuffle(Object.keys(g.scores));
  if (order[0] === g.intruderId) order.push(order.shift());
  g.order = order;
  g.turn = 0;
  g.tour = 1;
  g.clues = [];
  g.votes = {};
  g.guess = null;
  g.result = null;
  g.phase = 'clues';
  g.stats[g.intruderId].intruderTimes++;
  skipAbsent(ctx, g);
}

const currentSpeaker = (g) => g.order[g.turn];

// passe le tour des joueurs absents
function skipAbsent(ctx, g) {
  const present = new Set(active(ctx, g).map((p) => p.id));
  while (g.phase === 'clues' && !present.has(currentSpeaker(g))) nextTurn(g);
}

function nextTurn(g) {
  g.turn++;
  if (g.turn >= g.order.length) {
    g.turn = 0;
    g.tour++;
    if (g.tour > TOURS) g.phase = 'vote';
  }
}

function tally(ctx, g) {
  const counts = {};
  for (const t of Object.values(g.votes)) counts[t] = (counts[t] || 0) + 1;
  const max = Math.max(0, ...Object.values(counts));
  const top = Object.keys(counts).filter((id) => counts[id] === max);
  g.counts = counts;
  g.caught = max > 0 && top.length === 1 && top[0] === g.intruderId;
  if (g.caught && ctx.player(g.intruderId)?.connected) g.phase = 'guess';
  else finishRound(ctx, g);
}

function finishRound(ctx, g) {
  const gains = {};
  const intr = g.intruderId;
  const stole = g.caught && g.guess != null && normalize(g.guess) === normalize(g.word);
  for (const [voter, target] of Object.entries(g.votes)) {
    if (voter !== intr && target === intr) { gain(gains, voter, PTS.FOUND, 'A flairé l\'intrus 👃'); g.stats[voter].found++; }
  }
  if (!g.caught) {
    gain(gains, intr, PTS.ESCAPED, 'Intrus jamais démasqué 🥷');
    g.stats[intr].escaped++;
  } else if (stole) {
    gain(gains, intr, PTS.STOLE, 'Démasqué… mais a deviné le mot 🧠');
    g.stats[intr].stole++;
  } else {
    for (const id of Object.keys(g.scores)) if (id !== intr) gain(gains, id, PTS.TEAM_WIN, 'Victoire de l\'équipe 🤝');
  }
  applyGains(g.scores, gains);
  g.result = { gains, stole, counts: g.counts || {} };
  g.phase = 'reveal';
}

function autoAdvance(ctx, g) {
  const act = active(ctx, g);
  if (g.phase === 'clues') skipAbsent(ctx, g);
  if (g.phase === 'vote' && act.length && act.every((p) => p.id in g.votes)) tally(ctx, g);
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };

  if (type === 'clue') {
    if (g.phase !== 'clues' || currentSpeaker(g) !== pid) return;
    if (g.oral) { // indice dit à voix haute : on note juste que c'est fait
      g.clues.push({ pid, text: null, tour: g.tour });
      nextTurn(g);
      return autoAdvance(ctx, g);
    }
    const text = String(payload || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    if (!text) return { error: 'Écris un indice' };
    if (text.split(' ').length > 2) return { error: 'Un seul mot (deux maximum) !' };
    if (pid !== g.intruderId && normalize(text).includes(normalize(g.word))) return { error: 'Tu ne peux pas donner le mot lui-même 😅' };
    g.clues.push({ pid, text, tour: g.tour });
    nextTurn(g);
    return autoAdvance(ctx, g);
  }
  if (type === 'vote') {
    if (g.phase !== 'vote' || payload === pid || !(payload in g.scores)) return;
    g.votes[pid] = payload;
    return autoAdvance(ctx, g);
  }
  if (type === 'guess') {
    if (g.phase !== 'guess' || pid !== g.intruderId) return;
    g.guess = String(payload || '').trim().slice(0, 40);
    return finishRound(ctx, g);
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'clues') { nextTurn(g); autoAdvance(ctx, g); }     // passer le tour de quelqu'un
    else if (g.phase === 'vote') {
      if (!Object.keys(g.votes).length) return { error: 'Personne n\'a encore voté' };
      tally(ctx, g);
    } else if (g.phase === 'guess') finishRound(ctx, g);
    else if (g.phase === 'reveal') {
      if (g.round >= g.totalRounds) {
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['found', 'Fin limier', '👃', "a démasqué l'intrus le plus souvent"],
          ['escaped', 'Agent double', '🥷', 'est passé entre les mailles'],
          ['stole', 'Voleur de mots', '🧠', 'a deviné le mot en étant démasqué'],
        ]);
        ctx.endGame(g.scores);
      } else newRound(ctx, g);
    }
  }
}

function stateFor(ctx, g, pid) {
  const isIntruder = pid === g.intruderId;
  const act = active(ctx, g);
  const s = {
    phase: g.phase, round: g.round, totalRounds: g.totalRounds, scores: g.scores,
    participants: Object.keys(g.scores),
    isIntruder,
    // le mot n'est montré qu'aux joueurs qui ne sont pas l'intrus (jamais à l'écran partagé avant la fin)
    word: g.phase === 'reveal' || (pid in g.scores && !isIntruder) ? g.word : null,
    oral: g.oral,
    order: g.order, turn: g.turn, tour: g.tour, tours: TOURS,
    speaker: g.phase === 'clues' ? currentSpeaker(g) : null,
    clues: g.clues,
    myVote: g.votes[pid] ?? null,
    voted: act.filter((p) => p.id in g.votes).map((p) => p.id),
    needed: act.length,
  };
  if (g.phase === 'guess' || g.phase === 'reveal') s.intruderId = g.intruderId;
  if (g.phase === 'reveal') {
    s.word = g.word;
    s.votes = g.votes;
    s.caught = g.caught;
    s.guess = g.guess;
    s.result = g.result;
  }
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'intrus',
  color: '#2fd3a7',
  name: "L'Intrus",
  emoji: '🕵️',
  tagline: "Tout le monde connaît le mot… sauf l'intrus.",
  description: "Donnez chacun un indice d'un mot sans trop en dire, puis démasquez celui qui ne connaît pas le mot secret.",
  minPlayers: 3,
  maxPlayers: 12,
  duration: '15–20 min',
  oral: true,
  create,
  onAction,
  onPlayersChanged: autoAdvance,
  stateFor,
};
