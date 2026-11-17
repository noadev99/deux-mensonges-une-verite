// ─────────────────────────────────────────────────────────────────────────────
// 🎚️ Le Curseur
// Une échelle entre deux extrêmes (« Froid ↔ Chaud »). Le donneur voit une cible
// secrète sur l'échelle et donne UN indice (« un café »). Les autres placent le
// curseur sur leur téléphone. Plus on est près de la cible, plus on marque.
// Le donneur marque la moyenne des autres : il a intérêt à être clair !
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, gain, applyGains, awards, active, initScores } = require('./_utils');

const SCALES = [
  ['Froid', 'Chaud'], ['Nul', 'Génial'], ['Facile', 'Difficile'], ['Ringard', 'Stylé'], ['Inutile', 'Indispensable'],
  ['Rassurant', 'Effrayant'], ['Pas cher', 'Hors de prix'], ['Très sain', 'Pas sain du tout'], ['Pour les enfants', 'Pour les adultes'],
  ['Calme', 'Bruyant'], ['Moche', 'Magnifique'], ['Lent', 'Rapide'], ['Petit', 'Énorme'], ['Ennuyeux', 'Passionnant'],
  ['Triste', 'Joyeux'], ['Doux', 'Piquant'], ['Romantique', 'Pas du tout romantique'], ['Sous-coté', 'Surcoté'],
  ['Fragile', 'Indestructible'], ['Normal', 'Bizarre'], ['Vieux jeu', 'Moderne'], ['Héros', 'Méchant'], ['Salé', 'Sucré'],
  ['Mauvaise idée', 'Excellente idée'], ['Ça sent mauvais', 'Ça sent bon'], ['Facile à dessiner', 'Impossible à dessiner'],
  ['Pas dangereux', 'Très dangereux'], ['Talent inutile', 'Talent utile'], ['Rare', 'Partout'], ['Plat d\'hiver', 'Plat d\'été'],
  ['Pas drôle', 'Hilarant'], ['Gênant', 'Classe'], ['Flippant', 'Mignon'], ['Pour un premier rendez-vous : à éviter', 'Pour un premier rendez-vous : parfait'],
  ['Mérite la prison', 'Mérite une médaille'], ['Film à voir seul', 'Film à voir à plusieurs'], ['Animal de compagnie nul', 'Animal de compagnie génial'],
  ['Mauvais à la télé', 'Bon à la télé'], ['Tout le monde aime', 'Tout le monde déteste'], ['Petit déjeuner', 'Dîner'],
];

const CLUE_MS = 60000;
const GUESS_MS = 40000;
const ZONES = [[4, 100, 'En plein dans le mille 🎯'], [10, 60, 'Tout près'], [18, 30, 'Pas loin']];
const ptsFor = (d) => { for (const [max, p, label] of ZONES) if (d <= max) return [p, label]; return [0, '']; };

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['bull', 'clue']);
  const ids = shuffle(Object.keys(scores));
  const n = ctx.rounds(Math.min(10, Math.max(ids.length, 4)));
  const givers = Array.from({ length: n }, (_, i) => ids[i % ids.length]);
  return { scores, stats, n, round: 0, tok: 0, givers, scales: ctx.fresh(SCALES, n), phase: 'intro' };
}

function timed(ctx, g, ms, fn) {
  const tok = ++g.tok;
  g.until = Date.now() + ms;
  ctx.schedule(ms, () => { if (g.tok === tok) fn(); });
}

function nextRound(ctx, g) {
  g.round++;
  let giver = g.givers[g.round - 1];
  // donneur parti : le suivant présent prend sa place
  if (!active(ctx, g).some((p) => p.id === giver)) giver = active(ctx, g)[0]?.id || giver;
  g.cur = { giver, scale: g.scales[g.round - 1], target: 5 + Math.floor(Math.random() * 91), clue: null, guesses: {} };
  g.phase = 'clue';
  timed(ctx, g, CLUE_MS, () => { g.cur.clue = g.cur.clue || '(pas d\'indice… à l\'instinct !)'; startGuess(ctx, g); });
}

function startGuess(ctx, g) {
  g.phase = 'guess';
  timed(ctx, g, GUESS_MS, () => reveal(ctx, g));
}

const guessers = (ctx, g) => active(ctx, g).filter((p) => p.id !== g.cur.giver);

function reveal(ctx, g) {
  if (g.phase !== 'guess') return;
  g.tok++;
  const c = g.cur, gains = {};
  const pts = [];
  for (const [id, v] of Object.entries(c.guesses)) {
    const [p, label] = ptsFor(Math.abs(v - c.target));
    pts.push(p);
    if (p) gain(gains, id, p, label);
    if (p === ZONES[0][1]) g.stats[id].bull++;
  }
  const avg = pts.length ? Math.round(pts.reduce((a, b) => a + b, 0) / pts.length) : 0;
  if (avg) { gain(gains, c.giver, avg, 'Indice clair : la moyenne des autres 💡'); g.stats[c.giver].clue += avg; }
  applyGains(g.scores, gains);
  c.gains = gains;
  g.phase = 'reveal';
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  const c = g.cur;
  if (type === 'clue' && g.phase === 'clue') {
    if (pid !== c.giver) return { error: 'Ce n\'est pas toi qui donnes l\'indice' };
    const t = String(payload ?? '').trim().slice(0, 50);
    if (!t) return { error: 'Écris un indice' };
    c.clue = t;
    return startGuess(ctx, g);
  }
  if (type === 'guess' && g.phase === 'guess') {
    if (pid === c.giver) return { error: 'Tu connais déjà la cible 😉' };
    const v = Math.round(Number(payload));
    if (!(v >= 0 && v <= 100)) return;
    c.guesses[pid] = v;
    if (guessers(ctx, g).every((p) => p.id in c.guesses)) reveal(ctx, g);
    return;
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'intro') return nextRound(ctx, g);
    if (g.phase === 'clue') { c.clue = c.clue || '(indice à l\'oral)'; return startGuess(ctx, g); }
    if (g.phase === 'guess') return reveal(ctx, g);
    if (g.phase === 'reveal') {
      if (g.round >= g.n) {
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['bull', 'Dans le mille', '🎯', 'a visé pile le plus souvent'],
          ['clue', 'Roi de l\'indice', '💡', 'a donné les indices les plus clairs (points gagnés)'],
        ]);
        ctx.endGame(g.scores);
      } else nextRound(ctx, g);
    }
  }
}

function onPlayersChanged(ctx, g) {
  if (g.phase === 'guess' && Object.keys(g.cur.guesses).length && guessers(ctx, g).every((p) => p.id in g.cur.guesses)) reveal(ctx, g);
}

function stateFor(ctx, g, pid) {
  const s = { phase: g.phase, round: g.round, totalRounds: g.n, scores: g.scores, participants: Object.keys(g.scores), left: g.until ? Math.max(0, g.until - Date.now()) : 0 };
  if (g.cur) {
    const c = g.cur;
    s.cur = { giver: c.giver, scale: c.scale, clue: c.clue, done: Object.keys(c.guesses), mine: c.guesses[pid] ?? null, needed: guessers(ctx, g).length };
    if (pid === c.giver || g.phase === 'reveal') s.cur.target = c.target;
    if (g.phase === 'reveal') Object.assign(s.cur, { guesses: c.guesses, gains: c.gains });
  }
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'curseur',
  color: '#7c9cff',
  name: 'Le Curseur',
  emoji: '🎚️',
  tagline: 'Un indice, une échelle : placez le curseur au bon endroit !',
  description: 'Le donneur voit une cible secrète entre deux extrêmes (Froid ↔ Chaud…) et donne un seul indice. Les autres placent le curseur.',
  minPlayers: 2,
  maxPlayers: 12,
  duration: '12 min',
  create,
  onAction,
  onPlayersChanged,
  stateFor,
  _test: { SCALES, ptsFor },
};
