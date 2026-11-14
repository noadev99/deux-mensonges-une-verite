// ─────────────────────────────────────────────────────────────────────────────
// 🎭 2 Mensonges, 1 Vérité
// 1) Chacun écrit 3 anecdotes (2 fausses, 1 vraie)          — chrono 5 min
// 2) Grand jeu d'association : toutes les séries s'affichent sans nom,
//    chacun attribue chaque série à un joueur                — chrono selon le nb de séries
// 3) Révélation de tous les auteurs d'un coup
// 4) Pour chaque série : « Laquelle est vraie ? »            — chrono 75 s
//    puis révélation, puis « Raconte ! » : l'auteur raconte l'histoire vraie
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, gain, applyGains, awards, active, initScores } = require('./_utils');

const PTS = {
  AUTHOR_FOUND: 100, // tu as reconnu l'auteur d'une série
  INCOGNITO: 50,     // (auteur) par joueur qui ne t'a pas reconnu
  GHOST: 100,        // (auteur) personne ne t'a reconnu
  TRUE_FOUND: 100,   // tu as trouvé la vraie anecdote
  DOUBLE: 50,        // bon auteur ET bonne anecdote sur la même série
  FOOLED: 75,        // (auteur) par joueur berné par un mensonge
  PERFECT_LIE: 150,  // (auteur) personne n'a trouvé la vraie
};
const TIME = {
  writing: 300000,                          // 5 min pour écrire
  match: (sets) => 60000 + sets * 30000,    // lecture + association
  vote: 75000,                              // vote « laquelle est vraie »
};
const LABELS = 'ABCDEFGHIJKLMNOP';

// ─── Cycle de vie ────────────────────────────────────────────────────────────
function create(ctx) {
  const { scores, stats } = initScores(ctx, ['authorFound', 'trueFound', 'fooled', 'incognito']);
  const g = { scores, stats, anecdotes: {}, sets: [], matches: {}, round: 0, trueVotes: {}, oral: ctx.oral() };
  // à l'oral : on prépare ses anecdotes dans sa tête, on indique juste laquelle est vraie (1 min)
  setPhase(ctx, g, 'writing', g.oral ? 90000 : TIME.writing, () => { if (Object.keys(g.anecdotes).length >= 2) startMatch(ctx, g); });
  return g;
}

// Change de phase avec un chrono : à la fin du temps, `onTimeout` est appelé
function setPhase(ctx, g, phase, ms, onTimeout) {
  g.phase = phase;
  g.deadline = ms ? Date.now() + ms : null;
  if (!ms) return;
  const stamp = (g.stamp = (g.stamp || 0) + 1); // identifie cette phase précise
  // setImmediate : à la création, la partie n'est pas encore enregistrée dans le salon
  setImmediate(() => ctx.schedule(ms + 1000, () => { if (g.stamp === stamp) onTimeout(); }));
}

function startMatch(ctx, g) {
  g.sets = shuffle(Object.keys(g.anecdotes)).map((authorId, i) => {
    // à l'oral, l'auteur raconte dans son ordre : on ne mélange pas
    const items = g.oral ? g.anecdotes[authorId] : shuffle(g.anecdotes[authorId]);
    return { label: LABELS[i], authorId, items, trueIndex: items.findIndex((x) => x.isTrue) };
  });
  g.matches = {};
  if (g.oral) { // pas d'association à l'oral : on sait qui parle
    g.found = g.sets.map(() => []);
    return startRound(ctx, g, 0);
  }
  setPhase(ctx, g, 'match', TIME.match(g.sets.length), () => revealMatch(ctx, g));
}

const authors = (g) => g.sets.map((s) => s.authorId);
// joueurs que `pid` peut désigner : les auteurs, sauf lui-même
const candidatesFor = (g, pid) => authors(g).filter((a) => a !== pid);
// séries que `pid` doit attribuer : toutes sauf la sienne
const setsFor = (g, pid) => g.sets.map((s, i) => i).filter((i) => g.sets[i].authorId !== pid);

function nameOf(ctx, id) { return ctx.player(id)?.name ?? '?'; }

function revealMatch(ctx, g) {
  const gains = {};
  g.found = g.sets.map(() => []); // found[i] = joueurs qui ont reconnu l'auteur de la série i
  const tried = g.sets.map(() => 0);
  for (const [pid, m] of Object.entries(g.matches)) {
    for (const [i, guess] of Object.entries(m)) {
      const s = g.sets[i];
      if (!s || s.authorId === pid) continue;
      tried[i]++;
      if (guess === s.authorId) {
        g.found[i].push(pid);
        gain(gains, pid, PTS.AUTHOR_FOUND, `A reconnu ${nameOf(ctx, s.authorId)} (série ${s.label}) 🔍`);
        g.stats[pid].authorFound++;
      } else {
        gain(gains, s.authorId, PTS.INCOGNITO, `Incognito face à ${nameOf(ctx, pid)} 🥸`);
        g.stats[s.authorId].incognito++;
      }
    }
  }
  g.sets.forEach((s, i) => { if (tried[i] > 0 && g.found[i].length === 0) gain(gains, s.authorId, PTS.GHOST, 'Fantôme : personne ne t\'a reconnu 👻'); });
  applyGains(g.scores, gains);
  g.matchGains = gains;
  setPhase(ctx, g, 'matchReveal');
}

function startRound(ctx, g, i) {
  g.round = i;
  g.trueVotes = {};
  g.trueGains = null;
  setPhase(ctx, g, 'guessTrue', TIME.vote, () => revealTrue(ctx, g));
}

function revealTrue(ctx, g) {
  const s = g.sets[g.round];
  const gains = {};
  let found = 0;
  const votes = Object.entries(g.trueVotes);
  for (const [voter, idx] of votes) {
    if (idx === s.trueIndex) {
      found++;
      gain(gains, voter, PTS.TRUE_FOUND, 'A trouvé la vérité ✅');
      g.stats[voter].trueFound++;
      if (g.found[g.round].includes(voter)) gain(gains, voter, PTS.DOUBLE, 'Double détective : bon auteur + bonne vérité 🕵️');
    } else {
      gain(gains, s.authorId, PTS.FOOLED, `A berné ${nameOf(ctx, voter)} 🤥`);
      g.stats[s.authorId].fooled++;
    }
  }
  if (votes.length > 0 && found === 0) gain(gains, s.authorId, PTS.PERFECT_LIE, 'Mensonge parfait : tout le monde s\'est fait avoir 🎭');
  applyGains(g.scores, gains);
  g.trueGains = gains;
  setPhase(ctx, g, 'revealTrue');
}

function finish(ctx, g) {
  setPhase(ctx, g, 'end');
  g.awards = awards(g.stats, [
    ['authorFound', 'Sherlock', '🔍', "a reconnu le plus d'auteurs"],
    ['trueFound', 'Détecteur de mensonges', '🧠', 'a trouvé le plus de vérités'],
    ['fooled', 'Grand Mytho', '🤥', 'a berné le plus de monde'],
    ['incognito', 'Caméléon', '🦎', 'est passé le plus inaperçu'],
  ]);
  ctx.endGame(g.scores);
}

// Avance dès que tous les joueurs présents ont joué
function autoAdvance(ctx, g) {
  const act = active(ctx, g);
  if (!act.length) return;
  if (g.phase === 'writing') {
    if (act.every((p) => p.id in g.anecdotes)) startMatch(ctx, g);
  } else if (g.phase === 'match') {
    if (act.every((p) => p.id in g.matches || setsFor(g, p.id).length === 0)) revealMatch(ctx, g);
  } else if (g.phase === 'guessTrue') {
    const author = g.sets[g.round].authorId;
    if (act.filter((p) => p.id !== author).every((p) => p.id in g.trueVotes)) revealTrue(ctx, g);
  }
}

// ─── Actions des joueurs ─────────────────────────────────────────────────────
function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };

  switch (type) {
    case 'submit': {
      if (g.phase !== 'writing') return;
      const { texts, trueIndex } = payload || {};
      if (g.oral) {
        if (![0, 1, 2].includes(trueIndex)) return { error: 'Choisis laquelle sera la vraie' };
        g.anecdotes[pid] = [0, 1, 2].map((i) => ({ text: `Anecdote n°${i + 1}`, isTrue: i === trueIndex }));
        break;
      }
      if (!Array.isArray(texts) || texts.length !== 3) return { error: 'Il faut 3 anecdotes' };
      const clean = texts.map((t) => String(t || '').trim().replace(/\s+/g, ' ').slice(0, 200));
      if (clean.some((t) => t.length < 3)) return { error: 'Remplis bien les 3 anecdotes' };
      if (![0, 1, 2].includes(trueIndex)) return { error: 'Coche celle qui est vraie' };
      g.anecdotes[pid] = clean.map((text, i) => ({ text, isTrue: i === trueIndex }));
      break;
    }
    case 'edit':
      if (g.phase === 'writing') delete g.anecdotes[pid];
      if (g.phase === 'match') delete g.matches[pid];
      return;
    case 'match': {
      if (g.phase !== 'match') return;
      const cand = candidatesFor(g, pid);
      const mine = setsFor(g, pid);
      const m = {};
      for (const [k, v] of Object.entries(payload || {})) {
        const i = Number(k);
        if (mine.includes(i) && cand.includes(v)) m[i] = v;
      }
      if (new Set(Object.values(m)).size !== Object.values(m).length) return { error: 'Chaque joueur ne peut être choisi qu\'une fois' };
      g.matches[pid] = m;
      break;
    }
    case 'voteTrue':
      if (g.phase !== 'guessTrue' || pid === g.sets[g.round].authorId || ![0, 1, 2].includes(payload)) return;
      g.trueVotes[pid] = payload;
      break;
    case 'next': // l'hôte fait avancer (ou force les retardataires)
      if (!isHost) return;
      if (g.phase === 'writing') {
        if (Object.keys(g.anecdotes).length < 2) return { error: 'Il faut au moins 2 joueurs prêts' };
        startMatch(ctx, g);
      } else if (g.phase === 'match') revealMatch(ctx, g);
      else if (g.phase === 'matchReveal') startRound(ctx, g, 0);
      else if (g.phase === 'guessTrue') revealTrue(ctx, g);
      else if (g.phase === 'revealTrue') setPhase(ctx, g, 'story');
      else if (g.phase === 'story') {
        if (g.round + 1 >= g.sets.length) finish(ctx, g);
        else startRound(ctx, g, g.round + 1);
      }
      return;
    default:
      return;
  }
  autoAdvance(ctx, g);
}

// ─── Vue personnalisée (aucun secret envoyé avant l'heure) ───────────────────
function stateFor(ctx, g, pid) {
  const act = active(ctx, g);
  const s = {
    phase: g.phase,
    scores: g.scores,
    points: PTS,
    participants: Object.keys(g.scores),
    remaining: g.deadline ? Math.max(0, g.deadline - Date.now()) : 0,
    round: g.round + 1,
    totalRounds: g.sets.length,
    oral: g.oral,
  };

  if (g.phase === 'writing') {
    s.myAnecdotes = g.oral ? null : g.anecdotes[pid] || null;
    s.myTrue = g.oral && g.anecdotes[pid] ? g.anecdotes[pid].findIndex((a) => a.isTrue) : null;
    s.submitted = Object.keys(g.anecdotes);
  }

  if (g.phase === 'match') {
    s.sets = g.sets.map((x) => ({ label: x.label, items: x.items.map((i) => i.text), mine: x.authorId === pid }));
    s.candidates = candidatesFor(g, pid);
    s.myMatch = g.matches[pid] ?? null;
    s.matched = act.filter((p) => p.id in g.matches).map((p) => p.id);
    s.needed = act.filter((p) => setsFor(g, p.id).length > 0).length;
  }

  if (g.phase === 'matchReveal') {
    s.sets = g.sets.map((x, i) => ({
      label: x.label, authorId: x.authorId, items: x.items.map((it) => it.text),
      found: g.found[i], myGuess: g.matches[pid]?.[i] ?? null, mine: x.authorId === pid,
    }));
    s.matchGains = g.matchGains;
  }

  if (['guessTrue', 'revealTrue', 'story'].includes(g.phase)) {
    const x = g.sets[g.round];
    const isAuthor = x.authorId === pid;
    s.current = {
      label: x.label, authorId: x.authorId, isAuthor,
      items: x.items.map((i) => i.text),
      foundAuthor: g.found[g.round],
    };
    if (isAuthor || g.phase !== 'guessTrue') s.current.trueIndex = x.trueIndex;
    if (g.phase === 'guessTrue') {
      const voters = act.filter((p) => p.id !== x.authorId);
      s.current.myVote = g.trueVotes[pid] ?? null;
      s.current.voted = Object.keys(g.trueVotes).length;
      s.current.needed = voters.length;
      s.current.waitingFor = voters.filter((p) => !(p.id in g.trueVotes)).map((p) => p.id);
    } else {
      s.current.trueVotes = g.trueVotes;
      s.current.trueGains = g.trueGains;
    }
  }

  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'deux-mensonges',
  color: '#ff6fa3',
  name: '2 Mensonges, 1 Vérité',
  emoji: '🎭',
  tagline: 'Devine qui a écrit… puis démasque le menteur.',
  description: "Chacun écrit 3 anecdotes sur lui, dont 1 seule vraie. Associez chaque série à son auteur, puis trouvez la vraie.",
  minPlayers: 3,
  maxPlayers: 12,
  duration: '20–40 min',
  oral: true,
  create,
  onAction,
  onPlayersChanged: autoAdvance,
  stateFor,
};
