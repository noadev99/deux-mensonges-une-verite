// ─────────────────────────────────────────────────────────────────────────────
// 🏷️ L'Étiquette
// Combien ça coûte ? Chacun tape un prix en secret. Le plus proche SANS DÉPASSER gagne.
// Si tout le monde a dépassé, le plus proche gagne quand même un peu.
// ─────────────────────────────────────────────────────────────────────────────
const { gain, applyGains, awards, active, initScores } = require('./_utils');

// [chose à estimer, prix, unité, emoji, petite précision affichée à la révélation]
const ITEMS = [
  ['Un ticket de métro à l\'unité à Paris (2025)', 2.5, '€', '🚇', 'Tarif du ticket métro-train-RER depuis janvier 2025'],
  ['Un timbre « lettre verte » (2025)', 1.39, '€', '✉️', 'Tarif La Poste 2025'],
  ['Le pass Navigo mensuel (2025)', 88.8, '€', '🎫', 'Tarif 2025, toutes zones'],
  ['Le SMIC mensuel net, temps plein (début 2025)', 1426, '€', '💶', 'Environ 1 426 € net par mois'],
  ['L\'amende pour avoir grillé un feu rouge', 135, '€', '🚦', 'Amende forfaitaire, plus 4 points en moins'],
  ['L\'amende pour stationnement gênant', 35, '€', '🅿️', 'Amende forfaitaire (le « très gênant » coûte 135 €)'],
  ['Un passeport pour un adulte en France', 86, '€', '🛂', 'Le timbre fiscal coûte 86 €'],
  ['Une première carte d\'identité en France', 0, '€', '🪪', 'C\'est gratuit ! (sauf en cas de perte : 25 €)'],
  ['Passer l\'examen du code de la route', 30, '€', '🚗', 'Redevance fixée par l\'État'],
  ['Le premier iPhone à sa sortie aux États-Unis (2007, 4 Go)', 499, '$', '📱', 'Le modèle 8 Go coûtait 599 $'],
  ['Le « Salvator Mundi », tableau le plus cher jamais vendu (2017)', 450, 'millions de $', '🖼️', 'Attribué à Léonard de Vinci, vendu 450 millions de dollars'],
  ['Une Ferrari 250 GTO de 1963 vendue aux enchères (2018)', 48.4, 'millions de $', '🏎️', 'Environ 48,4 millions de dollars'],
  ['La carte Pokémon la plus chère (Pikachu Illustrator, 2022)', 5.3, 'millions de $', '⚡', 'Environ 5,3 millions de dollars'],
  ['Le maillot de Maradona de la « main de Dieu » (vente 2022)', 9.3, 'millions de $', '⚽', 'Environ 9,3 millions de dollars'],
  ['Le tout premier tweet, vendu en NFT (2021)', 2.9, 'millions de $', '🐦', 'Environ 2,9 millions de dollars… il ne vaut presque plus rien'],
  ['Le prix payé pour 2 pizzas en 2010, en bitcoins', 10000, 'bitcoins', '🍕', '10 000 bitcoins : la pizza la plus chère de l\'histoire'],
];

const ROUNDS = 8;
const GUESS_MS = 35000;
const PTS = { WIN: 100, EXACT: 50, OVER: 50 };

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['wins', 'over']);
  const n = ctx.rounds(ROUNDS);
  return { scores, stats, n, round: 0, tok: 0, items: ctx.fresh(ITEMS, n), phase: 'intro' };
}

function nextRound(ctx, g) {
  g.round++;
  g.cur = { item: g.items[g.round - 1], answers: {} };
  g.phase = 'guess';
  const tok = ++g.tok;
  g.until = Date.now() + GUESS_MS;
  ctx.schedule(GUESS_MS, () => { if (g.tok === tok) reveal(ctx, g); });
}

function reveal(ctx, g) {
  if (g.phase !== 'guess') return;
  g.tok++;
  const c = g.cur, price = c.item[1];
  const list = Object.entries(c.answers).map(([id, v]) => ({ id, v, over: v > price + 1e-9, d: Math.abs(v - price) })).sort((a, b) => a.v - b.v);
  const gains = {};
  const under = list.filter((x) => !x.over);
  if (under.length) {
    const best = Math.min(...under.map((x) => x.d));
    for (const x of under) if (x.d === best) {
      gain(gains, x.id, PTS.WIN, 'Le plus proche sans dépasser 🏷️');
      g.stats[x.id].wins++;
      if (x.d < 1e-9) gain(gains, x.id, PTS.EXACT, 'Le prix exact ! 🎯');
    }
  } else if (list.length) {
    const best = Math.min(...list.map((x) => x.d));
    for (const x of list) if (x.d === best) gain(gains, x.id, PTS.OVER, 'Tout le monde a dépassé : le plus proche quand même');
  }
  for (const x of list) if (x.over) g.stats[x.id].over++;
  applyGains(g.scores, gains);
  c.list = list;
  c.gains = gains;
  g.phase = 'reveal';
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  if (type === 'price' && g.phase === 'guess') {
    const v = Number(String(payload).replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(v) || v < 0 || v > 1e9) return { error: 'Tape un prix' };
    g.cur.answers[pid] = Math.round(v * 100) / 100;
    if (active(ctx, g).every((p) => p.id in g.cur.answers)) reveal(ctx, g);
    return;
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'intro') return nextRound(ctx, g);
    if (g.phase === 'guess') return reveal(ctx, g);
    if (g.phase === 'reveal') {
      if (g.round >= g.n) {
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['wins', 'Œil d\'expert', '🏷️', 'a gagné le plus de manches'],
          ['over', 'Panier percé', '💸', 'a dépassé le prix le plus souvent'],
        ]);
        ctx.endGame(g.scores);
      } else nextRound(ctx, g);
    }
  }
}

function onPlayersChanged(ctx, g) {
  if (g.phase === 'guess' && Object.keys(g.cur.answers).length && active(ctx, g).every((p) => p.id in g.cur.answers)) reveal(ctx, g);
}

function stateFor(ctx, g, pid) {
  const s = { phase: g.phase, round: g.round, totalRounds: g.n, scores: g.scores, participants: Object.keys(g.scores), left: g.until ? Math.max(0, g.until - Date.now()) : 0 };
  if (g.cur) {
    const [label, price, unit, emoji, note] = g.cur.item;
    s.cur = { label, unit, emoji, done: Object.keys(g.cur.answers), mine: g.cur.answers[pid] ?? null };
    if (g.phase === 'reveal') Object.assign(s.cur, { price, note, list: g.cur.list, gains: g.cur.gains });
  }
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'etiquette',
  color: '#ffb84d',
  name: 'L\'Étiquette',
  emoji: '🏷️',
  tagline: 'Combien ça coûte ? Le plus proche sans dépasser gagne !',
  description: 'Devinez le prix de choses de la vie courante et de records d\'enchères. Le plus proche sans dépasser gagne.',
  minPlayers: 2,
  maxPlayers: 16,
  duration: '8 min',
  create,
  onAction,
  onPlayersChanged,
  stateFor,
  _test: { ITEMS },
};
