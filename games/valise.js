// ─────────────────────────────────────────────────────────────────────────────
// 🧳 La Valise
// « Dans ma valise, je mets… » : chacun son tour récite TOUTE la liste à voix
// haute, puis ajoute un objet (qu'il tape sur son téléphone).
// Le joueur suivant est l'arbitre : lui seul voit la liste et valide ✅ ou ❌.
// Une erreur = un cœur en moins (2 cœurs). Le dernier encore en jeu gagne.
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, normalize, gain, applyGains, awards, active, initScores } = require('./_utils');

const LIVES = 2;
const MAX_ITEMS = 40;
const THEMES = {
  valise: { start: 'Dans ma valise, je mets…', label: 'La valise 🧳' },
  marche: { start: 'Au marché, j\'achète…', label: 'Le marché 🧺' },
  zoo: { start: 'Dans mon zoo, il y a…', label: 'Le zoo 🦁' },
};

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['ok', 'judge']);
  const order = shuffle(Object.keys(scores));
  const theme = THEMES[ctx.option('theme')] ? ctx.option('theme') : 'valise';
  return {
    scores, stats, order, theme, list: [], lives: Object.fromEntries(order.map((id) => [id, LIVES])),
    out: [], turn: -1, phase: 'intro', log: [],
  };
}

const alive = (ctx, g) => g.order.filter((id) => g.lives[id] > 0 && active(ctx, g).some((p) => p.id === id));

// joueur suivant encore en jeu (et connecté) après l'index i
function nextAlive(ctx, g, i) {
  const ok = alive(ctx, g);
  for (let k = 1; k <= g.order.length; k++) {
    const id = g.order[(i + k) % g.order.length];
    if (ok.includes(id)) return g.order.indexOf(id);
  }
  return -1;
}

function nextTurn(ctx, g) {
  const ok = alive(ctx, g);
  if ((g.order.length > 1 && ok.length <= 1) || ok.length === 0 || g.list.length >= MAX_ITEMS) return finish(ctx, g);
  g.turn = nextAlive(ctx, g, g.turn);
  const ji = nextAlive(ctx, g, g.turn);
  g.cur = { player: g.order[g.turn], judge: ji === g.turn ? null : g.order[ji], item: null };
  g.phase = 'turn';
}

function finish(ctx, g) {
  const gains = {};
  const survivors = alive(ctx, g);
  for (const id of survivors) gain(gains, id, 100, g.list.length >= MAX_ITEMS ? 'Mémoire d\'éléphant : la valise est pleine ! 🐘' : 'Dernier en jeu 🏆');
  applyGains(g.scores, gains);
  g.finalGains = gains;
  g.phase = 'end';
  g.awards = awards(g.stats, [
    ['ok', 'Mémoire d\'éléphant', '🐘', 'a récité la liste sans faute le plus de fois'],
    ['judge', 'Arbitre impitoyable', '🧐', 'a sifflé le plus d\'erreurs'],
  ]);
  ctx.endGame(g.scores);
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  const c = g.cur;
  if (type === 'item' && g.phase === 'turn') {
    if (pid !== c.player) return { error: 'Ce n\'est pas ton tour' };
    const t = String(payload ?? '').trim().slice(0, 40);
    if (!t) return { error: 'Écris l\'objet que tu ajoutes' };
    if (g.list.some((x) => normalize(x) === normalize(t))) return { error: 'Cet objet est déjà dans la liste !' };
    c.item = t;
    if (!c.judge) return judge(ctx, g, true); // seul en jeu (partie solo) : pas d'arbitre
    return;
  }
  if (type === 'judge' && g.phase === 'turn') {
    // l'arbitre valide ; l'hôte peut aussi trancher (sauf sur son propre tour)
    if (pid !== c.judge && !(isHost && pid !== c.player)) return { error: 'C\'est l\'arbitre qui valide' };
    if (payload && !c.item) return { error: 'Attends que le joueur écrive son objet' };
    return judge(ctx, g, !!payload, pid);
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'intro') return nextTurn(ctx, g);
    if (g.phase === 'turn') return nextTurn(ctx, g); // tour passé (joueur absent…)
    if (g.phase === 'missed') return nextTurn(ctx, g);
  }
  if (type === 'finish' && isHost && g.phase !== 'end') return finish(ctx, g);
}

function judge(ctx, g, ok, by) {
  const c = g.cur;
  if (ok) {
    g.list.push(c.item);
    g.stats[c.player].ok++;
    const gains = {};
    gain(gains, c.player, g.list.length * 5, `Liste de ${g.list.length} sans faute`);
    applyGains(g.scores, gains);
    g.log.push({ id: c.player, ok: true, item: c.item });
    return nextTurn(ctx, g);
  }
  g.lives[c.player]--;
  if (by && by !== c.player && by in g.stats) g.stats[by].judge++;
  if (g.lives[c.player] <= 0) g.out.push(c.player);
  g.log.push({ id: c.player, ok: false });
  g.missed = { id: c.player, lives: g.lives[c.player] };
  g.phase = 'missed';
}

function onPlayersChanged(ctx, g) {
  if (g.phase === 'turn' && !active(ctx, g).some((p) => p.id === g.cur.player)) nextTurn(ctx, g);
}

function stateFor(ctx, g, pid) {
  const s = {
    phase: g.phase, scores: g.scores, participants: Object.keys(g.scores), order: g.order, lives: g.lives, out: g.out,
    count: g.list.length, start: THEMES[g.theme].start, round: g.list.length + 1, totalRounds: MAX_ITEMS,
  };
  if (g.cur) s.cur = { player: g.cur.player, judge: g.cur.judge, item: g.cur.item };
  // la liste reste secrète : seul l'arbitre la voit pendant le tour (et tout le monde à la fin)
  if (g.phase === 'end' || (g.phase === 'turn' && pid === g.cur.judge) || (g.phase === 'turn' && !g.cur.judge)) s.list = g.list;
  if (g.phase === 'turn' && pid !== g.cur.judge && ctx.room?.hostId === pid && !active(ctx, g).some((p) => p.id === g.cur.judge)) s.list = g.list;
  if (g.phase === 'missed') s.missed = g.missed;
  if (g.phase === 'end') { s.awards = g.awards; s.finalGains = g.finalGains; }
  return s;
}

module.exports = {
  id: 'valise',
  color: '#c99a6b',
  name: 'La Valise',
  emoji: '🧳',
  tagline: 'Dans ma valise, je mets… Récite toute la liste sans te tromper !',
  description: 'Jeu de mémoire : chacun récite la liste qui grandit à voix haute et ajoute un objet. Le joueur suivant arbitre. Deux erreurs et c\'est fini.',
  minPlayers: 2,
  maxPlayers: 12,
  duration: '10 min',
  options: [
    { key: 'theme', label: 'Thème', default: 'valise', choices: Object.entries(THEMES).map(([value, t]) => ({ value, label: t.label, hint: `« ${t.start} »` })) },
  ],
  create,
  onAction,
  onPlayersChanged,
  stateFor,
  _test: { LIVES, MAX_ITEMS },
};
