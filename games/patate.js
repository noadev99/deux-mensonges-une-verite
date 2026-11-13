// ─────────────────────────────────────────────────────────────────────────────
// 💣 Patate chaude
// Une catégorie. Chacun son tour, on tape une réponse pour passer la bombe.
// Elle explose au bout d'un temps secret : celui qui la tient ne marque rien.
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, sample, normalize, gain, applyGains, awards, active, initScores } = require('./_utils');

const ROUNDS = 5;
// durée de la mèche (ms), tirée au hasard entre les deux (réglable pour les tests)
const FUSE_MIN = Number(process.env.PATATE_FUSE_MIN) || 20000;
const FUSE_MAX = Number(process.env.PATATE_FUSE_MAX) || 40000;
const PTS = { ANSWER: 10, SURVIVE: 100 };

const CATEGORIES = [
  'Des marques de voiture', 'Des pays d\'Europe', 'Des fruits', 'Des animaux de la ferme', 'Des métiers',
  'Des choses qu\'on trouve dans une salle de bain', 'Des films Disney', 'Des sports', 'Des prénoms qui commencent par M',
  'Des fromages', 'Des capitales', 'Des instruments de musique', 'Des choses rouges', 'Des légumes',
  'Des super-héros', 'Des marques de vêtements', 'Des desserts', 'Des choses qu\'on emporte à la plage',
  'Des animaux marins', 'Des séries télé', 'Des chanteurs ou chanteuses', 'Des jeux de société',
  'Des choses qu\'on trouve dans une cuisine', 'Des villes de France', 'Des boissons', 'Des insectes',
  'Des mots qui finissent par « -tion »', 'Des pièces de la maison', 'Des personnages de dessin animé',
  'Des choses qui volent', 'Des couleurs', 'Des applis de téléphone', 'Des moyens de transport',
  'Des choses qu\'on fait le dimanche', 'Des fleurs', 'Des métiers où on porte un uniforme',
  'Des parties du corps', 'Des émotions', 'Des choses qu\'on trouve dans un sac à main', 'Des plats italiens',
];

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['answers', 'booms', 'survived']);
  const g = {
    scores, stats, round: 0, totalRounds: ROUNDS,
    categories: sample(CATEGORIES, ROUNDS),
    starters: shuffle(Object.keys(scores)),
  };
  newRound(g);
  return g;
}

function newRound(g) {
  g.round++;
  g.category = g.categories[g.round - 1];
  g.answers = []; // [{pid, text}]
  g.holder = g.starters[(g.round - 1) % g.starters.length];
  g.startedAt = null;
  g.passedAt = null;
  g.result = null;
  g.phase = 'ready';
}

// prochain joueur connecté après `id` dans l'ordre fixe des participants
function nextPlayer(ctx, g, id) {
  const order = Object.keys(g.scores);
  const present = new Set(active(ctx, g).map((p) => p.id));
  for (let k = 1; k <= order.length; k++) {
    const cand = order[(order.indexOf(id) + k) % order.length];
    if (present.has(cand)) return cand;
  }
  return id;
}

function light(ctx, g) {
  g.phase = 'playing';
  g.startedAt = Date.now();
  g.passedAt = g.startedAt;
  if (!active(ctx, g).some((p) => p.id === g.holder)) g.holder = nextPlayer(ctx, g, g.holder);
  const fuse = FUSE_MIN + Math.random() * (FUSE_MAX - FUSE_MIN);
  const round = g.round;
  ctx.schedule(fuse, () => { if (g.phase === 'playing' && g.round === round) explode(ctx, g); });
}

function explode(ctx, g) {
  const gains = {};
  const victim = g.holder;
  for (const a of g.answers) gain(gains, a.pid, PTS.ANSWER, 'Réponse valide');
  for (const p of active(ctx, g)) {
    if (p.id !== victim) { gain(gains, p.id, PTS.SURVIVE, 'A survécu à l\'explosion 😮‍💨'); g.stats[p.id].survived++; }
  }
  g.stats[victim].booms++;
  applyGains(g.scores, gains);
  g.result = { victim, gains, duration: Date.now() - g.startedAt };
  g.phase = 'boom';
}

function onPlayersChanged(ctx, g) {
  // la bombe ne reste pas dans les mains d'un absent
  if (g.phase === 'playing' && !active(ctx, g).some((p) => p.id === g.holder)) {
    g.holder = nextPlayer(ctx, g, g.holder);
    g.passedAt = Date.now();
  }
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  if (type === 'answer') {
    if (g.phase !== 'playing' || g.holder !== pid) return;
    const text = String(payload || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    if (normalize(text).length < 2) return { error: 'Trop court !' };
    if (g.answers.some((a) => normalize(a.text) === normalize(text))) return { error: 'Déjà dit ! Trouve autre chose 🔥' };
    g.answers.push({ pid, text });
    g.stats[pid].answers++;
    g.holder = nextPlayer(ctx, g, pid);
    g.passedAt = Date.now();
    return;
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'ready') light(ctx, g);
    else if (g.phase === 'boom') {
      if (g.round >= g.totalRounds) {
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['answers', 'Démineur', '🧯', 'a donné le plus de réponses'],
          ['booms', 'Aimant à bombes', '💥', 'a explosé le plus souvent'],
          ['survived', 'Survivant', '😮‍💨', 'a survécu le plus souvent'],
        ]);
        ctx.endGame(g.scores);
      } else newRound(g);
    }
  }
}

function stateFor(ctx, g, pid) {
  const s = {
    phase: g.phase, round: g.round, totalRounds: g.totalRounds, scores: g.scores,
    participants: Object.keys(g.scores),
    category: g.category,
    holder: g.holder,
    answers: g.answers,
    // temps écoulé depuis l'allumage (la durée totale reste secrète)
    elapsed: g.startedAt ? Date.now() - g.startedAt : 0,
  };
  if (g.phase === 'boom') s.result = g.result;
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'patate',
  color: '#f0506e',
  name: 'Patate chaude',
  emoji: '💣',
  tagline: 'Réponds vite et passe la bombe avant qu\'elle explose.',
  description: 'Une catégorie, une bombe qui passe de main en main, une explosion au hasard.',
  minPlayers: 3,
  maxPlayers: 12,
  duration: '10 min',
  create,
  onAction,
  onPlayersChanged,
  stateFor,
};
