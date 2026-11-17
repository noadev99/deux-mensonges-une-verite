// ─────────────────────────────────────────────────────────────────────────────
// 🎶 La Fredonnette
// Le fredonneur choisit une chanson parmi 3 et la fredonne SANS paroles (« hmm hmm »,
// « na na na », sifflement…). Les autres crient leurs réponses à voix haute.
// Le fredonneur désigne qui a trouvé : +100 pour lui, +50 pour le fredonneur.
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, sample, gain, applyGains, awards, active, initScores } = require('./_utils');

// [titre, interprète ou origine, type] — types : fr, inter, film (films, dessins animés, génériques), enfant
const SONGS = [
  ['Joyeux anniversaire', 'Tout le monde', 'enfant'], ['Frère Jacques', 'Comptine', 'enfant'], ['Au clair de la lune', 'Comptine', 'enfant'],
  ['Une souris verte', 'Comptine', 'enfant'], ['Il était un petit navire', 'Comptine', 'enfant'], ['Vive le vent', 'Chant de Noël', 'enfant'],
  ['Petit Papa Noël', 'Tino Rossi', 'enfant'], ['Alouette', 'Comptine', 'enfant'], ['Le Petit Bonhomme en mousse', 'Patrick Sébastien', 'fr'],
  ['La Marseillaise', 'Hymne national', 'fr'], ['Les Champs-Élysées', 'Joe Dassin', 'fr'], ['L\'Aventurier', 'Indochine', 'fr'],
  ['Allumer le feu', 'Johnny Hallyday', 'fr'], ['Alors on danse', 'Stromae', 'fr'], ['Papaoutai', 'Stromae', 'fr'],
  ['Dernière danse', 'Indila', 'fr'], ['Je veux', 'Zaz', 'fr'], ['La Bohème', 'Charles Aznavour', 'fr'],
  ['Non, je ne regrette rien', 'Édith Piaf', 'fr'], ['La Vie en rose', 'Édith Piaf', 'fr'], ['Les Lacs du Connemara', 'Michel Sardou', 'fr'],
  ['Djadja', 'Aya Nakamura', 'fr'], ['Bella', 'Maître Gims', 'fr'], ['Moi… Lolita', 'Alizée', 'fr'],
  ['Désenchantée', 'Mylène Farmer', 'fr'], ['Tout le bonheur du monde', 'Sinsemilia', 'fr'], ['La Danse des canards', 'J.J. Lionel', 'fr'],
  ['Les Sardines', 'Patrick Sébastien', 'fr'], ['Santiano', 'Hugues Aufray', 'fr'], ['Je l\'aime à mourir', 'Francis Cabrel', 'fr'],
  ['Femme Like U', 'K-Maro', 'fr'], ['Le Lion est mort ce soir', 'Henri Salvador', 'fr'], ['Macarena', 'Los del Río', 'inter'],
  ['Gangnam Style', 'PSY', 'inter'], ['Despacito', 'Luis Fonsi', 'inter'], ['Billie Jean', 'Michael Jackson', 'inter'],
  ['Thriller', 'Michael Jackson', 'inter'], ['Bohemian Rhapsody', 'Queen', 'inter'], ['We Will Rock You', 'Queen', 'inter'],
  ['Seven Nation Army', 'The White Stripes', 'inter'], ['Smells Like Teen Spirit', 'Nirvana', 'inter'], ['Shape of You', 'Ed Sheeran', 'inter'],
  ['Dancing Queen', 'ABBA', 'inter'], ['YMCA', 'Village People', 'inter'], ['I Will Survive', 'Gloria Gaynor', 'inter'],
  ['Happy', 'Pharrell Williams', 'inter'], ['Wake Me Up', 'Avicii', 'inter'], ['Blinding Lights', 'The Weeknd', 'inter'],
  ['Highway to Hell', 'AC/DC', 'inter'], ['Hotel California', 'Eagles', 'inter'], ['Imagine', 'John Lennon', 'inter'],
  ['Hey Jude', 'The Beatles', 'inter'], ['Jingle Bells', 'Chant de Noël', 'enfant'], ['Rolling in the Deep', 'Adele', 'inter'],
  ['Libérée, délivrée', 'La Reine des neiges', 'film'], ['Hakuna Matata', 'Le Roi lion', 'film'], ['Sous l\'océan', 'La Petite Sirène', 'film'],
  ['La Marche impériale', 'Star Wars', 'film'], ['Le thème de Mission impossible', 'Mission impossible', 'film'], ['Le thème de Pirates des Caraïbes', 'Pirates des Caraïbes', 'film'],
  ['Le thème d\'Harry Potter', 'Harry Potter', 'film'], ['My Heart Will Go On', 'Titanic', 'film'], ['Le générique des Simpson', 'Les Simpson', 'film'],
  ['Le générique de Pokémon', 'Pokémon', 'film'], ['Le thème des Dents de la mer', 'Les Dents de la mer', 'film'], ['Le thème de la Panthère rose', 'La Panthère rose', 'film'],
  ['Le thème de James Bond', 'James Bond', 'film'], ['Le générique de Bob l\'éponge', 'Bob l\'éponge', 'film'], ['Ghostbusters', 'SOS Fantômes', 'film'],
  ['Le thème de Tetris', 'Tetris (air russe)', 'film'], ['Le générique de Dragon Ball Z', 'Dragon Ball Z', 'film'], ['Un jour mon prince viendra', 'Blanche-Neige', 'film'],
];
const TYPES = { tout: null, fr: ['fr', 'enfant'], inter: ['inter'], film: ['film'] };

const HUM_MS = 60000;
const PTS = { FIND: 100, HUM: 50 };

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['found', 'hummed']);
  const ids = shuffle(Object.keys(scores));
  const n = ctx.rounds(Math.min(10, Math.max(ids.length, 4)));
  const t = TYPES[ctx.option('type')] || null;
  const pool = t ? SONGS.filter((s) => t.includes(s[2])) : SONGS;
  return { scores, stats, n, round: 0, tok: 0, hummers: Array.from({ length: n }, (_, i) => ids[i % ids.length]), deck: ctx.fresh(pool, Math.min(pool.length, n * 3)), phase: 'intro' };
}

function nextRound(ctx, g) {
  g.round++;
  let hummer = g.hummers[g.round - 1];
  if (!active(ctx, g).some((p) => p.id === hummer)) hummer = active(ctx, g)[0]?.id || hummer;
  const cards = g.deck.splice(0, 3);
  while (cards.length < 3) cards.push(sample(SONGS, 1)[0]);
  g.cur = { hummer, cards, song: null, finder: undefined };
  g.phase = 'choose';
  g.until = 0;
}

function choose(ctx, g, i) {
  g.cur.song = g.cur.cards[i];
  g.phase = 'hum';
  const tok = ++g.tok;
  g.until = Date.now() + HUM_MS;
  ctx.schedule(HUM_MS, () => { if (g.tok === tok) reveal(ctx, g, null); });
}

function reveal(ctx, g, finder) {
  if (g.phase !== 'hum') return;
  g.tok++;
  const c = g.cur, gains = {};
  c.finder = finder;
  g.stats[c.hummer].hummed++;
  if (finder) {
    gain(gains, finder, PTS.FIND, 'A reconnu la chanson 🎶');
    gain(gains, c.hummer, PTS.HUM, 'Fredonnement réussi 🎤');
    g.stats[finder].found++;
  }
  applyGains(g.scores, gains);
  c.gains = gains;
  g.phase = 'reveal';
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  const c = g.cur;
  if (type === 'choose' && g.phase === 'choose') {
    if (pid !== c.hummer) return { error: 'C\'est au fredonneur de choisir' };
    const i = Number(payload);
    if (!(i >= 0 && i < 3)) return;
    return choose(ctx, g, i);
  }
  if (type === 'found' && g.phase === 'hum') {
    if (pid !== c.hummer && !isHost) return { error: 'C\'est le fredonneur qui désigne qui a trouvé' };
    const who = payload == null ? null : String(payload);
    if (who && (who === c.hummer || !(who in g.scores))) return;
    return reveal(ctx, g, who);
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'intro') return nextRound(ctx, g);
    if (g.phase === 'choose') return choose(ctx, g, Math.floor(Math.random() * 3));
    if (g.phase === 'hum') return reveal(ctx, g, null);
    if (g.phase === 'reveal') {
      if (g.round >= g.n) {
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['found', 'Oreille absolue', '👂', 'a reconnu le plus de chansons'],
          ['hummed', 'Juke-box humain', '🎤', 'a fredonné le plus souvent'],
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
    s.cur = { hummer: c.hummer };
    if (g.phase === 'choose' && pid === c.hummer) s.cur.cards = c.cards.map(([t, a]) => ({ t, a }));
    if (c.song && (pid === c.hummer || g.phase === 'reveal')) s.cur.song = { t: c.song[0], a: c.song[1] };
    if (g.phase === 'reveal') Object.assign(s.cur, { finder: c.finder, gains: c.gains });
  }
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'fredonnette',
  color: '#ff7eb6',
  name: 'La Fredonnette',
  emoji: '🎶',
  tagline: 'Fredonne la chanson sans les paroles… les autres doivent la reconnaître !',
  description: 'Un joueur fredonne une chanson connue, sans paroles. Le premier qui la reconnaît à voix haute marque.',
  minPlayers: 2,
  maxPlayers: 16,
  duration: '10 min',
  options: [
    { key: 'type', label: 'Chansons', default: 'tout', choices: [
      { value: 'tout', label: 'Tout 🎶', hint: 'Chansons françaises, tubes, comptines, musiques de films' },
      { value: 'fr', label: 'Françaises 🇫🇷', hint: 'Variété française et comptines' },
      { value: 'inter', label: 'Tubes du monde 🌍', hint: 'Les grands tubes internationaux' },
      { value: 'film', label: 'Films et dessins animés 🎬', hint: 'Musiques de films, de dessins animés et génériques' },
    ] },
  ],
  create,
  onAction,
  stateFor,
  _test: { SONGS },
};
