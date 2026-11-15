// ─────────────────────────────────────────────────────────────────────────────
// 🖼️ L'Image cachée
// L'écran du salon (ou chaque téléphone) montre 10 images d'une même famille.
// Tous les joueurs reçoivent en secret la MÊME image… sauf un, qui n'a rien.
// Chacun donne un indice (à l'écrit ou à l'oral), puis on vote pour démasquer
// celui qui n'a rien. Démasqué, il peut encore gagner en devinant l'image.
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, normalize, gain, applyGains, awards, active, initScores } = require('./_utils');

const MAX_ROUNDS = 6;
const PTS = { FOUND: 100, TEAM_WIN: 50, ESCAPED: 200, STOLE: 150 };

// [nom de la famille, [[image, nom] × 10]]
const FAMILIES = [
  ['Les fruits', [['🍎', 'Pomme'], ['🍌', 'Banane'], ['🍇', 'Raisin'], ['🍓', 'Fraise'], ['🍉', 'Pastèque'], ['🍍', 'Ananas'], ['🥝', 'Kiwi'], ['🍒', 'Cerises'], ['🍑', 'Pêche'], ['🍋', 'Citron']]],
  ['Les animaux de la ferme', [['🐄', 'Vache'], ['🐖', 'Cochon'], ['🐑', 'Mouton'], ['🐐', 'Chèvre'], ['🐓', 'Coq'], ['🦆', 'Canard'], ['🐎', 'Cheval'], ['🐇', 'Lapin'], ['🦃', 'Dinde'], ['🐕', 'Chien']]],
  ['Les animaux sauvages', [['🦁', 'Lion'], ['🐘', 'Éléphant'], ['🦒', 'Girafe'], ['🦓', 'Zèbre'], ['🐒', 'Singe'], ['🐅', 'Tigre'], ['🦛', 'Hippopotame'], ['🐊', 'Crocodile'], ['🦘', 'Kangourou'], ['🐻', 'Ours']]],
  ['Les animaux marins', [['🐳', 'Baleine'], ['🦈', 'Requin'], ['🐙', 'Pieuvre'], ['🐬', 'Dauphin'], ['🦀', 'Crabe'], ['🐠', 'Poisson tropical'], ['🦑', 'Calamar'], ['🐢', 'Tortue'], ['🦭', 'Phoque'], ['🐡', 'Poisson-globe']]],
  ['Les transports', [['🚗', 'Voiture'], ['🚌', 'Bus'], ['🚲', 'Vélo'], ['✈️', 'Avion'], ['🚀', 'Fusée'], ['🚂', 'Train'], ['🚁', 'Hélicoptère'], ['⛵', 'Voilier'], ['🛵', 'Scooter'], ['🚕', 'Taxi']]],
  ['Les sports', [['⚽', 'Football'], ['🏀', 'Basket'], ['🎾', 'Tennis'], ['🏉', 'Rugby'], ['🏐', 'Volley'], ['🏓', 'Ping-pong'], ['🥊', 'Boxe'], ['⛷️', 'Ski'], ['🏊', 'Natation'], ['🚴', 'Vélo de course']]],
  ['Les desserts', [['🍰', 'Gâteau'], ['🍩', 'Donut'], ['🍪', 'Cookie'], ['🍫', 'Chocolat'], ['🍦', 'Glace'], ['🧁', 'Cupcake'], ['🥧', 'Tarte'], ['🍮', 'Flan'], ['🍭', 'Sucette'], ['🥐', 'Croissant']]],
  ['La malbouffe', [['🍕', 'Pizza'], ['🍔', 'Burger'], ['🌭', 'Hot-dog'], ['🍟', 'Frites'], ['🌮', 'Tacos'], ['🍣', 'Sushi'], ['🍜', 'Ramen'], ['🥗', 'Salade'], ['🥪', 'Sandwich'], ['🍝', 'Pâtes']]],
  ['Les instruments', [['🎸', 'Guitare'], ['🎹', 'Piano'], ['🥁', 'Batterie'], ['🎺', 'Trompette'], ['🎻', 'Violon'], ['🎷', 'Saxophone'], ['🪕', 'Banjo'], ['🎤', 'Micro'], ['🔔', 'Cloche'], ['🪗', 'Accordéon']]],
  ['La météo', [['☀️', 'Soleil'], ['🌧️', 'Pluie'], ['❄️', 'Neige'], ['⛈️', 'Orage'], ['🌈', 'Arc-en-ciel'], ['🌪️', 'Tornade'], ['🌫️', 'Brouillard'], ['☁️', 'Nuage'], ['🌙', 'Lune'], ['🌊', 'Vague']]],
  ['Les vêtements', [['👕', 'T-shirt'], ['👖', 'Jean'], ['👗', 'Robe'], ['🧥', 'Manteau'], ['🧢', 'Casquette'], ['👟', 'Basket'], ['🧦', 'Chaussettes'], ['🧣', 'Écharpe'], ['👒', 'Chapeau'], ['🩳', 'Short']]],
  ['Les métiers', [['👨‍🍳', 'Cuisinier'], ['👩‍🚒', 'Pompière'], ['👮', 'Policier'], ['👩‍⚕️', 'Médecin'], ['👨‍🚀', 'Astronaute'], ['👩‍🏫', 'Prof'], ['👨‍🔧', 'Mécanicien'], ['👩‍🌾', 'Agricultrice'], ['🧑‍🎨', 'Artiste'], ['🕵️', 'Détective']]],
  ['La fête', [['🎂', 'Gâteau d\'anniversaire'], ['🎁', 'Cadeau'], ['🎈', 'Ballon'], ['🎉', 'Confettis'], ['🕯️', 'Bougie'], ['🎃', 'Citrouille'], ['🎄', 'Sapin de Noël'], ['🧨', 'Pétard'], ['🎆', 'Feu d\'artifice'], ['🥂', 'Champagne']]],
  ['La maison', [['🛋️', 'Canapé'], ['🛏️', 'Lit'], ['🚿', 'Douche'], ['🪑', 'Chaise'], ['🚪', 'Porte'], ['🪟', 'Fenêtre'], ['🧸', 'Nounours'], ['🖼️', 'Tableau'], ['🕰️', 'Horloge'], ['🧹', 'Balai']]],
  ['Les plantes', [['🌵', 'Cactus'], ['🌻', 'Tournesol'], ['🌹', 'Rose'], ['🌲', 'Sapin'], ['🌴', 'Palmier'], ['🍄', 'Champignon'], ['🍁', 'Feuille d\'érable'], ['🌷', 'Tulipe'], ['🌾', 'Blé'], ['🍀', 'Trèfle']]],
  ['Les petites bêtes', [['🐝', 'Abeille'], ['🦋', 'Papillon'], ['🐞', 'Coccinelle'], ['🐜', 'Fourmi'], ['🕷️', 'Araignée'], ['🐛', 'Chenille'], ['🦟', 'Moustique'], ['🐌', 'Escargot'], ['🦗', 'Criquet'], ['🪲', 'Scarabée']]],
  ['Les lieux', [['🏰', 'Château'], ['🏠', 'Maison'], ['🏥', 'Hôpital'], ['🏫', 'École'], ['⛪', 'Église'], ['🏟️', 'Stade'], ['🏝️', 'Île'], ['🌋', 'Volcan'], ['⛺', 'Tente'], ['🏭', 'Usine']]],
  ['La technologie', [['📱', 'Téléphone'], ['💻', 'Ordinateur'], ['⌚', 'Montre'], ['🎮', 'Manette'], ['📷', 'Appareil photo'], ['🎧', 'Casque'], ['📺', 'Télé'], ['🖨️', 'Imprimante'], ['🔋', 'Pile'], ['💡', 'Ampoule']]],
  ['Les créatures fantastiques', [['🐉', 'Dragon'], ['🦄', 'Licorne'], ['🧛', 'Vampire'], ['🧟', 'Zombie'], ['👻', 'Fantôme'], ['🧙', 'Sorcier'], ['🧜', 'Sirène'], ['👽', 'Extraterrestre'], ['🤖', 'Robot'], ['🧚', 'Fée']]],
  ['Les légumes', [['🥕', 'Carotte'], ['🥦', 'Brocoli'], ['🌽', 'Maïs'], ['🍆', 'Aubergine'], ['🥔', 'Pomme de terre'], ['🍅', 'Tomate'], ['🥒', 'Concombre'], ['🧅', 'Oignon'], ['🧄', 'Ail'], ['🌶️', 'Piment']]],
  ['Les émotions', [['😂', 'Mort de rire'], ['😡', 'En colère'], ['😱', 'Terrifié'], ['😴', 'Endormi'], ['😍', 'Amoureux'], ['🤢', 'Malade'], ['🤔', 'Pensif'], ['😎', 'Trop cool'], ['🥶', 'Gelé'], ['🤯', 'Choqué']]],
  ['Les loisirs', [['🎲', 'Dé'], ['♟️', 'Échecs'], ['🃏', 'Cartes'], ['🧩', 'Puzzle'], ['🎯', 'Fléchettes'], ['🎳', 'Bowling'], ['🪁', 'Cerf-volant'], ['🎣', 'Pêche'], ['🛹', 'Skate'], ['🎨', 'Peinture']]],
  ['Les outils', [['🔨', 'Marteau'], ['🪚', 'Scie'], ['🔧', 'Clé'], ['🪛', 'Tournevis'], ['✂️', 'Ciseaux'], ['📏', 'Règle'], ['🧲', 'Aimant'], ['🔦', 'Lampe torche'], ['🪣', 'Seau'], ['🧯', 'Extincteur']]],
  ['Les oiseaux', [['🦅', 'Aigle'], ['🦉', 'Hibou'], ['🦜', 'Perroquet'], ['🐧', 'Pingouin'], ['🦩', 'Flamant rose'], ['🦚', 'Paon'], ['🕊️', 'Colombe'], ['🦢', 'Cygne'], ['🐦', 'Moineau'], ['🦤', 'Dodo']]],
];

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['found', 'escaped', 'stole']);
  const ids = Object.keys(scores);
  const rounds = Math.min(MAX_ROUNDS, Math.max(3, ids.length));
  const g = {
    scores, stats, oral: ctx.oral(),
    round: 0, totalRounds: rounds,
    families: ctx.fresh(FAMILIES, rounds),
    // chacun « n'a rien » au plus une fois (si assez de manches)
    blanks: shuffle(ids).concat(shuffle(ids)).slice(0, rounds),
  };
  newRound(ctx, g);
  return g;
}

function newRound(ctx, g) {
  g.round++;
  const [family, items] = g.families[g.round - 1];
  g.family = family;
  g.items = shuffle(items);               // ordre des 10 images à l'écran
  g.secret = Math.floor(Math.random() * g.items.length);
  g.blank = g.blanks[g.round - 1];
  let order = shuffle(Object.keys(g.scores));
  if (order[0] === g.blank) order.push(order.shift()); // celui qui n'a rien ne commence jamais
  g.order = order;
  g.turn = 0;
  g.clues = [];
  g.votes = {};
  g.guess = null;
  g.caught = false;
  g.result = null;
  g.phase = 'clues';
  skipAbsent(ctx, g);
}

const speaker = (g) => g.order[g.turn];
function skipAbsent(ctx, g) {
  const present = new Set(active(ctx, g).map((p) => p.id));
  while (g.phase === 'clues' && !present.has(speaker(g))) nextTurn(g);
}
function nextTurn(g) {
  g.turn++;
  if (g.turn >= g.order.length) g.phase = 'vote';
}

function tally(ctx, g) {
  const counts = {};
  for (const t of Object.values(g.votes)) counts[t] = (counts[t] || 0) + 1;
  const max = Math.max(0, ...Object.values(counts));
  const top = Object.keys(counts).filter((id) => counts[id] === max);
  g.counts = counts;
  g.caught = max > 0 && top.length === 1 && top[0] === g.blank;
  if (g.caught && ctx.player(g.blank)?.connected) g.phase = 'guess';
  else finishRound(ctx, g);
}

function finishRound(ctx, g) {
  const gains = {};
  const b = g.blank;
  const stole = g.caught && g.guess === g.secret;
  for (const [voter, target] of Object.entries(g.votes)) {
    if (voter !== b && target === b) { gain(gains, voter, PTS.FOUND, 'A démasqué celui qui n\'avait rien 👃'); g.stats[voter].found++; }
  }
  if (!g.caught) { gain(gains, b, PTS.ESCAPED, 'Jamais démasqué, sans rien savoir 🥷'); g.stats[b].escaped++; }
  else if (stole) { gain(gains, b, PTS.STOLE, 'Démasqué… mais a trouvé l\'image 🧠'); g.stats[b].stole++; }
  else for (const id of Object.keys(g.scores)) if (id !== b) gain(gains, id, PTS.TEAM_WIN, 'Victoire de l\'équipe 🤝');
  applyGains(g.scores, gains);
  g.result = { gains, stole, counts: g.counts || {} };
  g.phase = 'reveal';
}

function autoAdvance(ctx, g) {
  if (g.phase === 'clues') skipAbsent(ctx, g);
  const act = active(ctx, g);
  if (g.phase === 'vote' && act.length && act.every((p) => p.id in g.votes)) tally(ctx, g);
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  if (type === 'clue') {
    if (g.phase !== 'clues' || speaker(g) !== pid) return;
    if (g.oral) { g.clues.push({ pid, text: null }); nextTurn(g); return autoAdvance(ctx, g); }
    const text = String(payload || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    if (!text) return { error: 'Écris un indice' };
    if (text.split(' ').length > 2) return { error: 'Un seul mot (deux maximum) !' };
    const secretName = g.items[g.secret][1];
    if (pid !== g.blank && normalize(text).includes(normalize(secretName))) return { error: 'Tu ne peux pas donner le nom de l\'image 😅' };
    g.clues.push({ pid, text });
    nextTurn(g);
    return autoAdvance(ctx, g);
  }
  if (type === 'vote') {
    if (g.phase !== 'vote' || payload === pid || !(payload in g.scores)) return;
    g.votes[pid] = payload;
    return autoAdvance(ctx, g);
  }
  if (type === 'guess') {
    const i = Number(payload);
    if (g.phase !== 'guess' || pid !== g.blank || !Number.isInteger(i) || i < 0 || i >= g.items.length) return;
    g.guess = i;
    return finishRound(ctx, g);
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'clues') { nextTurn(g); autoAdvance(ctx, g); }
    else if (g.phase === 'vote') {
      if (!Object.keys(g.votes).length) return { error: 'Personne n\'a encore voté' };
      tally(ctx, g);
    } else if (g.phase === 'guess') finishRound(ctx, g);
    else if (g.phase === 'reveal') {
      if (g.round >= g.totalRounds) {
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['found', 'Œil de lynx', '👃', 'a démasqué le plus souvent celui qui n\'avait rien'],
          ['escaped', 'Bluffeur pro', '🥷', 'est passé inaperçu sans rien savoir'],
          ['stole', 'Devin', '🧠', 'a trouvé l\'image en étant démasqué'],
        ]);
        ctx.endGame(g.scores);
      } else newRound(ctx, g);
    }
  }
}

function stateFor(ctx, g, pid) {
  const act = active(ctx, g);
  const over = g.phase === 'guess' || g.phase === 'reveal';
  const isBlank = pid === g.blank;
  const s = {
    phase: g.phase, round: g.round, totalRounds: g.totalRounds, scores: g.scores,
    participants: Object.keys(g.scores), oral: g.oral,
    family: g.family,
    items: g.items.map(([img, label]) => ({ img, label })),   // les 10 images : publiques
    role: pid in g.scores ? (isBlank ? 'blank' : 'seer') : null,
    // l'image secrète : seulement aux joueurs qui l'ont (jamais à celui qui n'a rien, ni à la télé avant la fin)
    mySecret: pid in g.scores && !isBlank ? g.secret : null,
    order: g.order, speaker: g.phase === 'clues' ? speaker(g) : null,
    clues: g.clues,
    myVote: g.votes[pid] ?? null,
    voted: act.filter((p) => p.id in g.votes).map((p) => p.id),
    needed: act.length,
  };
  if (over) { s.blank = g.blank; s.caught = g.caught; }
  if (g.phase === 'reveal') { s.secret = g.secret; s.votes = g.votes; s.guess = g.guess; s.result = g.result; }
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'image',
  color: '#ff9f43',
  name: 'L\'Image cachée',
  emoji: '🖼️',
  tagline: 'Tout le monde voit la même image… sauf un, qui n\'a rien.',
  description: '10 images d\'une même famille à l\'écran. Tous ont la même image secrète sauf un : trouvez qui bluffe.',
  minPlayers: 3,
  maxPlayers: 12,
  duration: '10–15 min',
  oral: true,
  create,
  onAction,
  onPlayersChanged: autoAdvance,
  stateFor,
};
