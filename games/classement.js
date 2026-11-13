// ─────────────────────────────────────────────────────────────────────────────
// 🏅 Le Classement
// Un juge classe en secret tous les joueurs sur un thème (« le plus drôle »…).
// Les autres devinent son classement. Le rôle de juge tourne.
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, sample, gain, applyGains, awards, active, initScores } = require('./_utils');

const MAX_ROUNDS = 6;
const PTS = { EXACT: 50, CLOSE: 20 };

const THEMES = [
  'survivrait le plus longtemps dans la jungle', 'est le plus drôle', 'est le plus organisé',
  'deviendra le plus célèbre', 'ferait le meilleur président', 'est le plus têtu',
  'cuisine le mieux', 'est le plus en retard', 'garderait le mieux un secret',
  'a le plus de chances de gagner à un jeu télé', 'est le plus dragueur', 'dépense le plus d\'argent',
  'ferait le meilleur parent', 'est le plus râleur', 'danse le mieux',
  'survivrait le mieux à une apocalypse zombie', 'est le plus romantique', 'est le plus mauvais perdant',
  'ferait le meilleur espion', 'a le plus de goût', 'est le plus sportif',
  'passe le plus de temps sur son téléphone', 'est le plus aventurier', 'est le plus gourmand',
  'est le plus susceptible de pleurer devant un film', 'donne les meilleurs conseils', 'est le plus bavard',
  'est le plus courageux', 'ferait le meilleur prof', 'est le plus maladroit',
  'est le plus fêtard', 'mentirait le mieux', 'a la meilleure mémoire',
  'est le plus dramatique', 'serait le meilleur coloc', 'est le plus créatif',
];

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['exact', 'judgeScore', 'judged']);
  const ids = Object.keys(scores);
  const rounds = Math.min(MAX_ROUNDS, ids.length);
  const g = { scores, stats, round: 0, totalRounds: rounds, judges: shuffle(ids).slice(0, rounds), themes: sample(THEMES, rounds) };
  newRound(g);
  return g;
}

function newRound(g) {
  g.round++;
  g.judge = g.judges[g.round - 1];
  g.theme = g.themes[g.round - 1];
  g.ranked = Object.keys(g.scores); // joueurs à classer : figés pour la manche
  g.rankings = {};                  // pid → [ids dans l'ordre]
  g.result = null;
  g.phase = 'rank';
}

const validRanking = (g, list) => Array.isArray(list) && list.length === g.ranked.length && new Set(list).size === list.length && list.every((id) => g.ranked.includes(id));

function reveal(ctx, g) {
  const truth = g.rankings[g.judge];
  const gains = {};
  const perPlayer = {};
  if (truth) {
    for (const [pid, list] of Object.entries(g.rankings)) {
      if (pid === g.judge) continue;
      let pts = 0, exact = 0;
      list.forEach((id, i) => {
        const d = Math.abs(truth.indexOf(id) - i);
        if (d === 0) { pts += PTS.EXACT; exact++; } else if (d === 1) pts += PTS.CLOSE;
      });
      perPlayer[pid] = { pts, exact };
      g.stats[pid].exact += exact;
      if (pts) gain(gains, pid, pts, `${exact} place${exact > 1 ? 's' : ''} exacte${exact > 1 ? 's' : ''} 🎯`);
    }
    // le juge marque la moyenne des devineurs : plus il est « lisible », plus il gagne
    const vals = Object.values(perPlayer).map((x) => x.pts);
    const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    if (avg) gain(gains, g.judge, avg, 'Livre ouvert : la moyenne des autres 📖');
    g.stats[g.judge].judgeScore += avg;
    g.stats[g.judge].judged++;
  }
  applyGains(g.scores, gains);
  g.result = { truth: truth || null, perPlayer, gains };
  g.phase = 'reveal';
}

function autoAdvance(ctx, g) {
  if (g.phase !== 'rank') return;
  const act = active(ctx, g);
  if (act.length && act.every((p) => p.id in g.rankings)) reveal(ctx, g);
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  if (type === 'rank') {
    if (g.phase !== 'rank') return;
    if (!validRanking(g, payload)) return { error: 'Classe tous les joueurs' };
    g.rankings[pid] = payload;
    return autoAdvance(ctx, g);
  }
  if (type === 'edit') { if (g.phase === 'rank') delete g.rankings[pid]; return; }
  if (type === 'next' && isHost) {
    if (g.phase === 'rank') {
      if (!g.rankings[g.judge]) return { error: 'Le juge n\'a pas encore classé' };
      reveal(ctx, g);
    } else if (g.phase === 'reveal') {
      if (g.round >= g.totalRounds) {
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['exact', 'Télépathe', '🔮', 'a trouvé le plus de places exactes'],
          ['judgeScore', 'Livre ouvert', '📖', 'a été le juge le plus facile à deviner'],
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
    judge: g.judge, isJudge: g.judge === pid,
    theme: g.theme,
    ranked: g.ranked,
    myRanking: g.rankings[pid] ?? null,
    done: act.filter((p) => p.id in g.rankings).map((p) => p.id),
    needed: act.length,
  };
  if (g.phase === 'reveal') { s.result = g.result; s.rankings = g.rankings; }
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'classement',
  color: '#b48cff',
  name: 'Le Classement',
  emoji: '🏅',
  tagline: 'Devine comment le juge classe la bande.',
  description: 'Un juge classe tous les joueurs sur un thème, les autres devinent son classement.',
  minPlayers: 3,
  maxPlayers: 8,
  duration: '15 min',
  create,
  onAction,
  onPlayersChanged: autoAdvance,
  stateFor,
};
