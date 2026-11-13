// ─────────────────────────────────────────────────────────────────────────────
// 🎭 2 Mensonges, 1 Vérité
// Chacun écrit 3 anecdotes (2 fausses, 1 vraie). Pour chaque joueur :
//   1) on devine QUI a écrit, 2) on devine LAQUELLE est vraie.
// ─────────────────────────────────────────────────────────────────────────────

const PTS = {
  AUTHOR_FOUND: 100, // tu as reconnu l'auteur
  INCOGNITO: 50,     // (auteur) par joueur qui ne t'a pas reconnu
  GHOST: 100,        // (auteur) personne ne t'a reconnu
  SCAPEGOAT: 25,     // tu es innocent mais quelqu'un t'a accusé
  TRUE_FOUND: 100,   // tu as trouvé la vraie anecdote
  DOUBLE: 50,        // auteur ET vraie anecdote trouvés
  FOOLED: 75,        // (auteur) par joueur berné par un mensonge
  PERFECT_LIE: 150,  // (auteur) personne n'a trouvé la vraie
};

const shuffle = (a) => {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const blankStats = () => ({ authorFound: 0, trueFound: 0, fooled: 0, incognito: 0, accused: 0 });

// ─── Cycle de vie ────────────────────────────────────────────────────────────
function create(ctx) {
  const g = { phase: 'writing', anecdotes: {}, scores: {}, stats: {}, order: [], roundIndex: 0, current: null };
  for (const p of ctx.connected()) {
    g.scores[p.id] = 0;
    g.stats[p.id] = blankStats();
  }
  return g;
}

// joueurs de la partie encore connectés
const active = (ctx, g) => ctx.connected().filter((p) => p.id in g.scores);

function startRound(g) {
  const authorId = g.order[g.roundIndex];
  const items = shuffle(g.anecdotes[authorId]);
  g.current = {
    authorId,
    items,
    trueIndex: items.findIndex((i) => i.isTrue),
    authorVotes: {},
    trueVotes: {},
    foundAuthor: [],
    authorGains: null,
    trueGains: null,
  };
  g.phase = 'guessAuthor';
}

function beginRounds(g) {
  g.order = shuffle(Object.keys(g.anecdotes));
  g.roundIndex = 0;
  startRound(g);
}

function gain(gains, pid, pts, label) {
  if (!gains[pid]) gains[pid] = { total: 0, reasons: [] };
  gains[pid].total += pts;
  gains[pid].reasons.push({ pts, label });
}

function applyGains(g, gains) {
  for (const [pid, x] of Object.entries(gains)) if (pid in g.scores) g.scores[pid] += x.total;
}

const nameOf = (ctx, id) => ctx.player(id)?.name ?? '?';

function revealAuthor(ctx, g) {
  const c = g.current;
  const gains = {};
  const votes = Object.entries(c.authorVotes).filter(([v]) => v !== c.authorId);
  for (const [voter, target] of votes) {
    if (target === c.authorId) {
      gain(gains, voter, PTS.AUTHOR_FOUND, `A démasqué ${nameOf(ctx, c.authorId)} 🔍`);
      c.foundAuthor.push(voter);
      g.stats[voter].authorFound++;
    } else {
      gain(gains, c.authorId, PTS.INCOGNITO, `Incognito face à ${nameOf(ctx, voter)} 🥸`);
      g.stats[c.authorId].incognito++;
      if (target in g.scores) {
        gain(gains, target, PTS.SCAPEGOAT, `Accusé à tort par ${nameOf(ctx, voter)} 🫣`);
        g.stats[target].accused++;
      }
    }
  }
  if (votes.length > 0 && c.foundAuthor.length === 0) gain(gains, c.authorId, PTS.GHOST, "Fantôme : personne ne t'a reconnu 👻");
  applyGains(g, gains);
  c.authorGains = gains;
  g.phase = 'revealAuthor';
}

function revealTrue(ctx, g) {
  const c = g.current;
  const gains = {};
  let found = 0;
  const votes = Object.entries(c.trueVotes);
  for (const [voter, idx] of votes) {
    if (idx === c.trueIndex) {
      found++;
      gain(gains, voter, PTS.TRUE_FOUND, 'A trouvé la vérité ✅');
      g.stats[voter].trueFound++;
      if (c.foundAuthor.includes(voter)) gain(gains, voter, PTS.DOUBLE, 'Double détective 🕵️');
    } else {
      gain(gains, c.authorId, PTS.FOOLED, `A berné ${nameOf(ctx, voter)} 🤥`);
      g.stats[c.authorId].fooled++;
    }
  }
  if (votes.length > 0 && found === 0) gain(gains, c.authorId, PTS.PERFECT_LIE, "Mensonge parfait : tout le monde s'est fait avoir 🎭");
  applyGains(g, gains);
  c.trueGains = gains;
  g.phase = 'revealTrue';
}

function finish(ctx, g) {
  g.phase = 'end';
  g.current = null;
  g.awards = computeAwards(g);
  ctx.endGame(g.scores);
}

function computeAwards(g) {
  const ids = Object.keys(g.stats);
  const best = (key, title, emoji, desc) => {
    const max = Math.max(0, ...ids.map((id) => g.stats[id][key]));
    if (max <= 0) return null;
    return { title, emoji, desc, value: max, winners: ids.filter((id) => g.stats[id][key] === max) };
  };
  return [
    best('authorFound', 'Sherlock', '🔍', "a démasqué le plus d'auteurs"),
    best('trueFound', 'Détecteur de mensonges', '🧠', 'a trouvé le plus de vérités'),
    best('fooled', 'Grand Mytho', '🤥', 'a berné le plus de monde'),
    best('incognito', 'Caméléon', '🦎', 'est passé le plus inaperçu'),
    best('accused', 'Suspect n°1', '🚨', 'a été accusé à tort le plus souvent'),
  ].filter(Boolean);
}

// Avance automatiquement quand tout le monde a joué
function autoAdvance(ctx, g) {
  const act = active(ctx, g);
  const c = g.current;
  if (g.phase === 'writing') {
    if (act.length && act.every((p) => p.id in g.anecdotes)) beginRounds(g);
  } else if (g.phase === 'guessAuthor') {
    if (act.every((p) => p.id in c.authorVotes)) revealAuthor(ctx, g);
  } else if (g.phase === 'guessTrue') {
    if (act.filter((p) => p.id !== c.authorId).every((p) => p.id in c.trueVotes)) revealTrue(ctx, g);
  }
}

// ─── Actions des joueurs ─────────────────────────────────────────────────────
function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  const c = g.current;

  switch (type) {
    case 'submit': {
      if (g.phase !== 'writing') return;
      const { texts, trueIndex } = payload || {};
      if (!Array.isArray(texts) || texts.length !== 3) return { error: 'Il faut 3 anecdotes' };
      const clean = texts.map((t) => String(t || '').trim().slice(0, 280));
      if (clean.some((t) => t.length < 3)) return { error: 'Remplis bien les 3 anecdotes' };
      if (![0, 1, 2].includes(trueIndex)) return { error: 'Indique laquelle est vraie' };
      g.anecdotes[pid] = clean.map((text, i) => ({ text, isTrue: i === trueIndex }));
      break;
    }
    case 'edit':
      if (g.phase === 'writing') delete g.anecdotes[pid];
      break;
    case 'voteAuthor':
      if (g.phase !== 'guessAuthor' || payload === pid || !(payload in g.scores)) return;
      c.authorVotes[pid] = payload;
      break;
    case 'voteTrue':
      if (g.phase !== 'guessTrue' || pid === c.authorId || ![0, 1, 2].includes(payload)) return;
      c.trueVotes[pid] = payload;
      break;
    case 'next': // l'hôte avance ou force
      if (!isHost) return;
      if (g.phase === 'writing') {
        if (Object.keys(g.anecdotes).length < 2) return { error: 'Il faut au moins 2 joueurs prêts' };
        beginRounds(g);
      } else if (g.phase === 'guessAuthor') revealAuthor(ctx, g);
      else if (g.phase === 'revealAuthor') g.phase = 'guessTrue';
      else if (g.phase === 'guessTrue') revealTrue(ctx, g);
      else if (g.phase === 'revealTrue') {
        g.roundIndex++;
        if (g.roundIndex >= g.order.length) return finish(ctx, g);
        startRound(g);
      }
      return;
    default:
      return;
  }
  autoAdvance(ctx, g);
}

function onPlayersChanged(ctx, g) {
  autoAdvance(ctx, g);
}

// ─── Vue personnalisée (on cache les secrets) ────────────────────────────────
function stateFor(ctx, g, pid) {
  const s = {
    phase: g.phase,
    scores: g.scores,
    points: PTS,
    round: g.roundIndex + 1,
    totalRounds: g.order.length,
    submitted: Object.keys(g.anecdotes),
    participants: Object.keys(g.scores),
  };
  if (g.phase === 'writing') s.myAnecdotes = g.anecdotes[pid] || null;

  const c = g.current;
  if (c) {
    const isAuthor = c.authorId === pid;
    const cur = { items: c.items.map((i) => i.text), isAuthor };
    if (g.phase !== 'guessAuthor') cur.authorId = c.authorId;
    if (isAuthor || g.phase === 'revealTrue') cur.trueIndex = c.trueIndex;

    const act = active(ctx, g);
    if (g.phase === 'guessAuthor') {
      cur.myVote = c.authorVotes[pid] ?? null;
      cur.voted = Object.keys(c.authorVotes).length;
      cur.needed = act.length;
    }
    if (g.phase === 'guessTrue') {
      cur.myVote = c.trueVotes[pid] ?? null;
      const voters = act.filter((p) => p.id !== c.authorId);
      cur.voted = Object.keys(c.trueVotes).length;
      cur.needed = voters.length;
      cur.waitingFor = voters.filter((p) => !(p.id in c.trueVotes)).map((p) => p.id);
    }
    if (['revealAuthor', 'guessTrue', 'revealTrue'].includes(g.phase)) {
      cur.authorVotes = Object.fromEntries(Object.entries(c.authorVotes).filter(([v]) => v !== c.authorId));
      cur.authorGains = c.authorGains;
    }
    if (g.phase === 'revealTrue') {
      cur.trueVotes = c.trueVotes;
      cur.trueGains = c.trueGains;
    }
    s.current = cur;
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
  description: "Chacun écrit 3 anecdotes sur lui, dont 1 seule vraie. Devinez d'abord qui les a écrites, puis laquelle est vraie.",
  minPlayers: 3,
  maxPlayers: 16,
  duration: '20–40 min',
  create,
  onAction,
  onPlayersChanged,
  stateFor,
};
