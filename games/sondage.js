// ─────────────────────────────────────────────────────────────────────────────
// 📊 Le Sondage
// Une question sur la bande : « Combien d'entre nous ont déjà … ? »
// Chacun répond OUI / NON en secret, puis parie sur le nombre de « oui ».
// Le plus proche marque. Les réponses restent anonymes : on ne révèle que le total.
// ─────────────────────────────────────────────────────────────────────────────
const { gain, applyGains, awards, active, initScores } = require('./_utils');

// « … déjà [x] » : utilisé en « As-tu déjà x ? » et « Combien d'entre nous ont déjà x ? »
const QUESTIONS = [
  'dormi à la belle étoile', 'fait du camping sauvage', 'pleuré devant un dessin animé', 'chanté sous la douche',
  'raté un avion ou un train', 'menti sur son âge', 'oublié l\'anniversaire d\'un proche', 'envoyé un message à la mauvaise personne',
  'fait semblant d\'être malade pour ne pas aller en cours ou au travail', 'mangé un plat tombé par terre', 'été pris en photo par un radar',
  'parlé tout seul dans la rue', 'regardé une série entière en un week-end', 'cassé l\'écran de son téléphone', 'fait une chute devant tout le monde',
  'dansé sur une table', 'eu un fou rire à un enterrement ou une cérémonie', 'stalké un ex sur les réseaux', 'oublié ses clés à l\'intérieur',
  'fait un tatouage', 'teint ses cheveux d\'une couleur flashy', 'sauté en parachute ou à l\'élastique', 'gagné quelque chose à un jeu à gratter',
  'appelé un prof « maman » ou « papa »', 'mis un vêtement à l\'envers toute une journée', 'fait du karaoké en public', 'mangé des escargots',
  'goûté de la nourriture pour animaux', 'perdu son téléphone dans les toilettes', 'fait un régime qui a duré moins d\'une semaine',
  'été viré d\'un cours', 'passé une nuit blanche pour finir un travail', 'raconté un secret qu\'on lui avait confié', 'recroisé un ex par hasard',
  'pris un fou rire impossible à arrêter', 'eu peur d\'un film au point de dormir la lumière allumée', 'fait une fausse promesse de « on se rappelle »',
  'acheté un truc inutile à 3 h du matin', 'porté le même vêtement trois jours de suite', 'nagé tout nu', 'été en retard à son propre rendez-vous important',
  'écouté une chanson plus de 20 fois d\'affilée', 'utilisé une excuse bidon pour annuler une soirée', 'reçu une contravention', 'parlé à son animal comme à un humain',
  'fait un vœu en voyant une étoile filante', 'rêvé d\'une personne de cette soirée', 'gardé un cadeau qu\'on n\'aimait pas pour le réoffrir',
  'mangé un pot de glace entier tout seul', 'fait semblant de connaître une chanson', 'pris l\'avion seul', 'joué à un jeu vidéo toute une nuit',
];

const ROUNDS = 8;
const VOTE_MS = 45000;
const PTS = { EXACT: 100, CLOSE: 50 };

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['exact', 'yes']);
  const n = ctx.rounds(ROUNDS);
  const g = { scores, stats, n, round: 0, tok: 0, qs: ctx.fresh(QUESTIONS, n), phase: 'intro' };
  return g;
}

function nextRound(ctx, g) {
  g.round++;
  g.cur = { q: g.qs[g.round - 1], answers: {}, voters: Object.keys(g.scores).length };
  g.phase = 'vote';
  const tok = ++g.tok;
  g.until = Date.now() + VOTE_MS;
  ctx.schedule(VOTE_MS, () => { if (g.tok === tok) reveal(ctx, g); });
}

function reveal(ctx, g) {
  if (g.phase !== 'vote') return;
  g.tok++;
  const c = g.cur, list = Object.entries(c.answers);
  c.count = list.filter(([, a]) => a.yes).length;
  c.total = list.length;
  const gains = {};
  for (const [id, a] of list) {
    if (a.yes) g.stats[id].yes++;
    const d = Math.abs(a.guess - c.count);
    if (d === 0) { gain(gains, id, PTS.EXACT, 'Pile le bon nombre 🎯'); g.stats[id].exact++; }
    else if (d === 1) gain(gains, id, PTS.CLOSE, 'À 1 près');
  }
  applyGains(g.scores, gains);
  c.guesses = Object.fromEntries(list.map(([id, a]) => [id, a.guess]));
  c.gains = gains;
  g.phase = 'reveal';
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  if (type === 'answer' && g.phase === 'vote') {
    const yes = !!payload?.yes, guess = Math.round(Number(payload?.guess));
    if (!(guess >= 0 && guess <= Object.keys(g.scores).length)) return { error: 'Choisis un nombre de « oui »' };
    g.cur.answers[pid] = { yes, guess };
    if (active(ctx, g).every((p) => p.id in g.cur.answers)) reveal(ctx, g);
    return;
  }
  if (type === 'edit' && g.phase === 'vote') { delete g.cur.answers[pid]; return; }
  if (type === 'next' && isHost) {
    if (g.phase === 'intro') return nextRound(ctx, g);
    if (g.phase === 'vote') return reveal(ctx, g);
    if (g.phase === 'reveal') {
      if (g.round >= g.n) {
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['exact', 'Sondeur en chef', '📊', 'a trouvé le nombre exact le plus souvent'],
          ['yes', 'A tout vécu', '😎', 'a répondu « oui » le plus souvent (en secret… sauf pour ce trophée)'],
        ]);
        ctx.endGame(g.scores);
      } else nextRound(ctx, g);
    }
  }
}

function onPlayersChanged(ctx, g) {
  if (g.phase === 'vote' && Object.keys(g.cur.answers).length && active(ctx, g).every((p) => p.id in g.cur.answers)) reveal(ctx, g);
}

function stateFor(ctx, g, pid) {
  const s = { phase: g.phase, round: g.round, totalRounds: g.n, scores: g.scores, participants: Object.keys(g.scores), left: g.until ? Math.max(0, g.until - Date.now()) : 0 };
  if (g.cur) {
    const c = g.cur;
    s.cur = { q: c.q, max: Object.keys(g.scores).length, done: Object.keys(c.answers), mine: c.answers[pid] || null };
    if (g.phase === 'reveal') Object.assign(s.cur, { count: c.count, total: c.total, guesses: c.guesses, gains: c.gains });
  }
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'sondage',
  color: '#4fc3f7',
  name: 'Le Sondage',
  emoji: '📊',
  tagline: 'Combien d\'entre nous ont déjà… ? Réponds en secret, puis devine le total !',
  description: 'Chacun répond oui ou non en secret à une question sur sa vie, puis parie sur le nombre de « oui » dans la bande.',
  minPlayers: 3,
  maxPlayers: 16,
  duration: '10 min',
  create,
  onAction,
  onPlayersChanged,
  stateFor,
  _test: { QUESTIONS },
};
