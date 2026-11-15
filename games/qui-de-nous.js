// ─────────────────────────────────────────────────────────────────────────────
// 🗳️ Qui de nous ?
// Une question « Qui est le plus susceptible de… ». Chacun vote en secret pour
// un joueur. Voter comme la majorité rapporte des points.
// ─────────────────────────────────────────────────────────────────────────────
const { packOption, byPack, sample, gain, applyGains, awards, active, initScores } = require('./_utils');
const ANIME = require('./packs-anime');
const PLUS = require('./contenu-plus');


const ROUNDS = 10;
const PTS = { WITH_CROWD: 100, ELECTED: 50 };

const QUESTIONS = [
  'rater son avion',
  'devenir célèbre sur internet',
  'oublier l\'anniversaire de son meilleur ami',
  'survivre le plus longtemps sur une île déserte',
  'pleurer devant un dessin animé',
  'se perdre avec un GPS',
  'manger le dernier morceau sans demander',
  'envoyer un message à la mauvaise personne',
  'devenir millionnaire',
  'tout plaquer pour partir élever des chèvres',
  'se faire virer d\'une soirée',
  'adopter dix chats',
  'connaître tous les potins avant tout le monde',
  'finir en garde à vue pour une raison absurde',
  'arriver en retard à son propre mariage',
  'raconter une histoire en l\'exagérant beaucoup trop',
  'parler à ses plantes',
  'ne jamais répondre aux messages',
  'se lancer dans un marathon sans entraînement',
  'avoir un compte secret sur les réseaux',
  'gagner à un jeu télé',
  'tomber amoureux en vacances',
  'ruiner un repas en cuisinant',
  'garder un secret toute sa vie',
  'créer sa propre entreprise',
  'chanter à tue-tête dans la voiture',
  'se tromper de prénom en draguant',
  'dormir pendant un film au cinéma',
  'organiser une fête surprise parfaite',
  'acheter un truc inutile à 3 h du matin',
  'parler aux animaux comme à des humains',
  'se battre avec un distributeur automatique',
  'devenir président(e)',
  'tout savoir sur la vie des stars',
  'faire un road trip sur un coup de tête',
  'rire à un enterrement',
  'se faire tatouer un truc regrettable',
  'gagner un débat même en ayant tort',
  'abandonner une série au dernier épisode',
  'se faire passer pour quelqu\'un d\'autre au téléphone',
  'être le premier sur la piste de danse',
  'appeler son ex à 2 h du matin',
  'devenir influenceur',
  'retomber en enfance devant un jeu vidéo',
  'oublier ses clés à l\'intérieur',
  'survivre à une apocalypse zombie',
  'commander pour toute la table sans demander',
  'se faire arnaquer par un vendeur',
  'partir vivre à l\'autre bout du monde',
  'faire une sieste n\'importe où',
  'connaître les paroles de toutes les chansons',
  'se ridiculiser en voulant impressionner',
  'avoir déjà menti dans cette partie',
  'écrire un livre un jour',
  'donner les meilleurs conseils',
  'se perdre dans un supermarché',
  'finir la soirée en dansant sur la table',
  'avoir peur d\'un papillon',
  'tomber dans les escaliers',
  'oublier pourquoi il/elle est entré(e) dans une pièce',
];

function newRound(g) {
  g.phase = 'vote';
  g.votes = {};
  g.result = null;
}

const ALL = [...QUESTIONS, ...PLUS.QDN];
const ALL_ANIME = [...ANIME.QUESTIONS, ...PLUS.QDN_ANIME];

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['elected', 'withCrowd']);
  const n = ctx.rounds(ROUNDS);
  const g = { scores, stats, round: 1, totalRounds: n, questions: ctx.fresh(byPack(ctx, ALL, ALL_ANIME), n) };
  newRound(g);
  return g;
}

function reveal(ctx, g) {
  const counts = {};
  for (const t of Object.values(g.votes)) counts[t] = (counts[t] || 0) + 1;
  const max = Math.max(0, ...Object.values(counts));
  const top = max > 0 ? Object.keys(counts).filter((id) => counts[id] === max) : [];
  const gains = {};
  for (const [pid, vote] of Object.entries(g.votes)) {
    if (top.includes(vote)) { gain(gains, pid, PTS.WITH_CROWD, 'A voté comme la majorité 🎯'); g.stats[pid].withCrowd++; }
  }
  for (const id of top) if (g.stats[id]) { g.stats[id].elected++; gain(gains, id, PTS.ELECTED, 'Désigné(e) par le groupe 🌟'); }
  applyGains(g.scores, gains);
  g.result = { counts, top, gains };
  g.phase = 'reveal';
}

function autoAdvance(ctx, g) {
  if (g.phase !== 'vote') return;
  const act = active(ctx, g);
  if (act.length && act.every((p) => p.id in g.votes)) reveal(ctx, g);
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  if (type === 'answer') {
    if (g.phase !== 'vote') return;
    const vote = typeof payload === 'object' ? payload?.vote : payload;
    if (!(vote in g.scores)) return { error: 'Choisis un joueur' };
    g.votes[pid] = vote;
    return autoAdvance(ctx, g);
  }
  if (type === 'change') {
    if (g.phase === 'vote') delete g.votes[pid];
    return;
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'vote') {
      if (!Object.keys(g.votes).length) return { error: 'Personne n\'a encore voté' };
      reveal(ctx, g);
    } else if (g.phase === 'reveal') {
      if (g.round >= g.totalRounds) {
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['elected', 'Star de la soirée', '🌟', 'a été désigné(e) le plus souvent'],
          ['withCrowd', 'Dans le mille', '🎯', 'a voté le plus souvent comme la majorité'],
        ]);
        ctx.endGame(g.scores);
      } else {
        g.round++;
        newRound(g);
      }
    }
  }
}

function stateFor(ctx, g, pid) {
  const act = active(ctx, g);
  const s = {
    phase: g.phase, round: g.round, totalRounds: g.totalRounds, scores: g.scores,
    participants: Object.keys(g.scores),
    question: g.questions[g.round - 1],
    myVote: g.votes[pid] ?? null,
    done: act.filter((p) => p.id in g.votes).map((p) => p.id),
    needed: act.length,
  };
  if (g.phase === 'reveal') s.result = g.result; // votes anonymes : seulement les totaux
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'qui-de-nous',
  color: '#ffc23d',
  name: 'Qui de nous ?',
  emoji: '🗳️',
  tagline: 'Qui est le plus susceptible de… ? Vote !',
  description: 'Une question, un vote secret pour un ami : vote comme la majorité pour marquer.',
  minPlayers: 3,
  maxPlayers: 16,
  duration: '10–15 min',
  options: [packOption('Questions de la vie de tous les jours', 'Devenir Hokage, se perdre comme Zoro…')],
  create,
  onAction,
  onPlayersChanged: autoAdvance,
  stateFor,
};
