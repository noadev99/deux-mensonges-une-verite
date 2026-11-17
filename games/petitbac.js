// ─────────────────────────────────────────────────────────────────────────────
// 🔤 Le Petit Bac express
// Une lettre, 5 catégories, 75 secondes. Le premier qui a tout rempli peut crier
// STOP : il ne reste alors que 10 secondes aux autres.
// Vérification : la table conteste les réponses douteuses (majorité = refusée).
// Réponse valable et unique : 10 pts · la même qu'un autre : 5 pts.
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, sample, normalize, gain, applyGains, awards, active, initScores } = require('./_utils');

const CATS = [
  'Prénom', 'Pays', 'Ville', 'Animal', 'Fruit ou légume', 'Métier', 'Objet de la maison', 'Sport', 'Personne célèbre',
  'Film ou série', 'Plat ou aliment', 'Instrument de musique', 'Partie du corps', 'Vêtement ou accessoire', 'Marque',
  'Chanteur ou groupe', 'Personnage de dessin animé', 'Moyen de transport', 'Couleur', 'Boisson', 'Chose qui pique',
  'Excuse pour être en retard', 'Chose qu\'on emporte en vacances', 'Insulte gentille', 'Chose qu\'on trouve dans un sac',
  'Mot qui fait peur', 'Super-pouvoir', 'Cadeau nul', 'Chose ronde', 'Métier qui fait rêver',
];
const LETTERS = 'ABCDEFGHILMNOPRSTV'.split('');
const N_CATS = 5;
const WRITE_MS = 75000;
const STOP_MS = 10000;
const PTS = { UNIQUE: 10, SHARED: 5, FIRST: 5 };

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['unique', 'stop', 'refused']);
  const n = ctx.rounds(3);
  return { scores, stats, n, round: 0, tok: 0, letters: sample(LETTERS, n), phase: 'intro' };
}

function nextRound(ctx, g) {
  g.round++;
  g.cur = { letter: g.letters[g.round - 1], cats: sample(CATS, N_CATS), answers: {}, stopBy: null, votes: {} };
  g.phase = 'write';
  arm(ctx, g, WRITE_MS);
}

function arm(ctx, g, ms) {
  const tok = ++g.tok;
  g.until = Date.now() + ms;
  ctx.schedule(ms, () => { if (g.tok === tok) startCheck(ctx, g); });
}

const startsOk = (word, letter) => normalize(word).startsWith(letter.toLowerCase());

function startCheck(ctx, g) {
  if (g.phase !== 'write') return;
  g.tok++;
  g.until = 0;
  g.phase = 'check';
}

// une réponse est refusée si la mauvaise lettre, ou si la majorité des autres joueurs la conteste
function isRefused(ctx, g, pid, ci) {
  const c = g.cur, w = (c.answers[pid] || [])[ci];
  if (!w) return true;
  if (!startsOk(w, c.letter)) return true;
  const judges = active(ctx, g).filter((p) => p.id !== pid).length;
  const votes = (c.votes[`${pid}|${ci}`] || []).length;
  return judges > 0 && votes * 2 > judges;
}

function score(ctx, g) {
  const c = g.cur, gains = {};
  c.result = {};
  c.cats.forEach((cat, ci) => {
    const ok = Object.keys(c.answers).filter((pid) => !isRefused(ctx, g, pid, ci));
    const count = {};
    for (const pid of ok) { const k = normalize(c.answers[pid][ci]); count[k] = (count[k] || 0) + 1; }
    for (const pid of Object.keys(c.answers)) {
      const w = c.answers[pid][ci];
      if (!w) continue;
      if (!ok.includes(pid)) { c.result[`${pid}|${ci}`] = 0; g.stats[pid].refused++; continue; }
      const uniq = count[normalize(w)] === 1;
      c.result[`${pid}|${ci}`] = uniq ? PTS.UNIQUE : PTS.SHARED;
      gain(gains, pid, uniq ? PTS.UNIQUE : PTS.SHARED, `${cat} : ${w}${uniq ? '' : ' (trouvé aussi par un autre)'}`);
      if (uniq) g.stats[pid].unique++;
    }
  });
  if (c.stopBy && gains[c.stopBy]) gain(gains, c.stopBy, PTS.FIRST, 'A crié STOP le premier ✋');
  applyGains(g.scores, gains);
  c.gains = gains;
  g.phase = 'reveal';
}

const clean = (list) => (Array.isArray(list) ? list : []).slice(0, N_CATS).map((w) => String(w ?? '').trim().slice(0, 30));

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  const c = g.cur;
  if (type === 'draft' && g.phase === 'write') { c.answers[pid] = clean(payload); return { quiet: true }; }
  if (type === 'stop' && g.phase === 'write') {
    const list = clean(payload);
    c.answers[pid] = list;
    if (list.filter(Boolean).length < N_CATS) return { error: 'Remplis les 5 catégories pour crier STOP' };
    if (!c.stopBy) {
      c.stopBy = pid;
      g.stats[pid].stop++;
      if (g.until - Date.now() > STOP_MS) arm(ctx, g, STOP_MS);
      for (const p of active(ctx, g)) if (p.id !== pid) ctx.buzz(p.id, [200, 80, 200]);
    }
    return;
  }
  if (type === 'contest' && g.phase === 'check') {
    const [owner, ci] = String(payload).split('|');
    if (owner === pid || !(owner in c.answers) || !(Number(ci) >= 0 && Number(ci) < N_CATS)) return { quiet: true };
    const k = `${owner}|${Number(ci)}`;
    const list = c.votes[k] || [];
    c.votes[k] = list.includes(pid) ? list.filter((x) => x !== pid) : [...list, pid];
    return;
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'intro') return nextRound(ctx, g);
    if (g.phase === 'write') return startCheck(ctx, g);
    if (g.phase === 'check') return score(ctx, g);
    if (g.phase === 'reveal') {
      if (g.round >= g.n) {
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['unique', 'Esprit original', '💡', 'a trouvé le plus de réponses que personne d\'autre n\'avait'],
          ['stop', 'Main la plus rapide', '✋', 'a crié STOP le plus souvent'],
          ['refused', 'Avocat du diable', '😅', 's\'est fait refuser le plus de réponses'],
        ]);
        ctx.endGame(g.scores);
      } else nextRound(ctx, g);
    }
  }
}

function stateFor(ctx, g, pid) {
  const s = { phase: g.phase, round: g.round, totalRounds: g.n, scores: g.scores, participants: Object.keys(g.scores), left: g.until ? Math.max(0, g.until - Date.now()) : 0 };
  if (g.cur) {
    const c = g.cur;
    s.cur = { letter: c.letter, cats: c.cats, stopBy: c.stopBy, mine: c.answers[pid] || null };
    if (g.phase === 'check' || g.phase === 'reveal') {
      s.cur.answers = c.answers;
      s.cur.votes = c.votes;
      s.cur.refused = {};
      for (const owner of Object.keys(c.answers)) for (let ci = 0; ci < N_CATS; ci++) if (c.answers[owner][ci] && isRefused(ctx, g, owner, ci)) s.cur.refused[`${owner}|${ci}`] = true;
      s.cur.badLetter = {};
      for (const owner of Object.keys(c.answers)) c.answers[owner].forEach((w, ci) => { if (w && !startsOk(w, c.letter)) s.cur.badLetter[`${owner}|${ci}`] = true; });
    }
    if (g.phase === 'reveal') Object.assign(s.cur, { result: c.result, gains: c.gains });
  }
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'petitbac',
  color: '#5ed39a',
  name: 'Le Petit Bac express',
  emoji: '🔤',
  tagline: 'Une lettre, 5 catégories, 75 secondes. STOP !',
  description: 'Trouvez un mot par catégorie qui commence par la lettre tirée. Le premier qui a tout rempli crie STOP. Les mots trouvés par plusieurs valent moins.',
  minPlayers: 2,
  maxPlayers: 12,
  duration: '10 min',
  create,
  onAction,
  stateFor,
  _test: { CATS, LETTERS, startsOk },
};
