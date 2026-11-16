// ─────────────────────────────────────────────────────────────────────────────
// 🎙️ L'Imitateur — à tour de rôle, un joueur choisit un PERSONNAGE parmi 3
// (Gollum, Scooby-Doo, Dark Vador…) et l'imite devant tout le monde : sa phrase
// culte, sa voix, ses gestes. Une idée de scène est proposée pour l'aider.
// Ensuite, chacun note la prestation sur 10. L'imitateur marque sa moyenne × 10 ;
// ceux qui ont noté proche de la moyenne gagnent un petit bonus.
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, gain, applyGains, awards, active, initScores } = require('./_utils');

// [nom, famille, phrase culte ou signe distinctif]  — film : films, séries, dessins animés, jeux vidéo · star : personnalités
const CHARS = [
  ['Dark Vador', 'film', '« Je suis ton père. » (avec la respiration !)'],
  ['Maître Yoda', 'film', '« Que la Force avec toi soit. » (il parle à l\'envers)'],
  ['Gollum', 'film', '« Mon précieux… »'],
  ['Terminator', 'film', '« Hasta la vista, baby. »'],
  ['Shrek', 'film', '« Les ogres, c\'est comme les oignons ! »'],
  ['Le Joker', 'film', '« Pourquoi tant de sérieux ? »'],
  ['Buzz l\'Éclair', 'film', '« Vers l\'infini et au-delà ! »'],
  ['Forrest Gump', 'film', '« Cours, Forrest, cours ! »'],
  ['E.T.', 'film', '« E.T. téléphone maison. »'],
  ['Hulk', 'film', '« Hulk écrase ! »'],
  ['Homer Simpson', 'film', '« D\'oh ! »'],
  ['Bob l\'éponge', 'film', '« Je suis prêt, je suis prêt ! »'],
  ['Scooby-Doo', 'film', '« Scooby-Doo bi-dou ! »'],
  ['Sangoku', 'film', '« Kaméhaméha ! »'],
  ['Luffy', 'film', '« Je serai le roi des pirates ! »'],
  ['Pikachu', 'film', '« Pika… pikaaa ! »'],
  ['Mario', 'film', '« C\'est moi, Mario ! » (avec l\'accent)'],
  ['Obélix', 'film', '« Je ne suis pas gros ! »'],
  ['Astérix', 'film', '« Ils sont fous, ces Romains ! »'],
  ['Jacquouille la Fripouille', 'film', '« Okayyy ! »'],
  ['OSS 117', 'film', '« Comment est votre blanquette ? »'],
  ['Perceval (Kaamelott)', 'film', '« C\'est pas faux ! »'],
  ['Brice de Nice', 'film', '« Cassé ! »'],
  ['François Pignon (Le Dîner de cons)', 'film', '« Il s\'appelle Juste Leblanc. »'],
  ['Jack (Titanic)', 'film', '« Je suis le roi du monde ! » (bras écartés)'],
  ['Timon et Pumbaa', 'film', '« Hakuna Matata ! »'],
  ['Spider-Man', 'film', '« Un grand pouvoir implique de grandes responsabilités. »'],
  ['Batman', 'film', '« Je suis Batman. » (voix très grave)'],
  ['James Bond', 'film', '« Bond. James Bond. »'],
  ['Hagrid', 'film', '« Tu es un sorcier, Harry. »'],
  ['Gandalf', 'film', '« Vous ne passerez pas ! »'],
  ['Jack Sparrow', 'film', '« Je suis le capitaine Jack Sparrow ! » (démarche qui tangue)'],
  ['Rocky', 'film', '« Adrienne ! »'],
  ['Le Parrain', 'film', '« Je vais lui faire une offre qu\'il ne pourra pas refuser. »'],
  ['Sherlock Holmes', 'film', '« Élémentaire, mon cher Watson. »'],
  ['Inspecteur Gadget', 'film', '« Go go gadgeto ! »'],
  ['Columbo', 'film', '« Juste une dernière petite question… »'],
  ['Stitch', 'film', '« Ohana, ça veut dire famille ! »'],
  ['Dory (Le Monde de Nemo)', 'film', '« Continuer de nager ! »'],
  ['Mr Bean', 'film', 'Aucun mot : grimaces et petits bruits'],
  ['Tarzan', 'film', 'Le grand cri en se tapant la poitrine'],
  ['Chewbacca', 'film', 'Le rugissement'],
  ['Le Génie d\'Aladdin', 'film', '« Tes désirs sont des ordres ! »'],
  ['Elsa (La Reine des neiges)', 'film', 'Elle fait tout geler autour d\'elle d\'un geste'],
  ['Rabbi Jacob', 'film', 'Danse en levant les jambes, et « Salomon ! »'],
  ['Donald Duck', 'film', 'La voix de canard qui s\'énerve'],
  ['Bourriquet', 'film', '« Merci de t\'en préoccuper… » (voix toute triste)'],
  ['Tigrou', 'film', '« Ce que les tigres adorent, c\'est rebondir ! »'],
  ['Patrick l\'étoile de mer', 'film', '« Est-ce que la mayonnaise est un instrument ? »'],
  ['Un Minion', 'film', '« Banana ! » et un rire aigu'],
  ['Gru (Moi, moche et méchant)', 'film', 'Accent bizarre : « Les Minions ! Lumière ! »'],
  ['Un Lapin Crétin', 'film', '« BWAAAAH ! »'],
  ['Sid (L\'Âge de glace)', 'film', 'Le zozotement et la langue qui dépasse'],
  ['Kermit la grenouille', 'film', 'Voix nasillarde, bras qui s\'agitent'],
  ['Sammy (Scooby-Doo)', 'film', '« Zoinks ! Scoob, on se tire ! »'],
  ['Jean-Claude Van Damme', 'star', 'Parle de « l\'aware » et de l\'eau, très philosophe'],
  ['Nabilla', 'star', '« Allô ? Non mais allô, quoi ! »'],
  ['Jacques Chirac', 'star', 'Grande voix de président, adore la tête de veau'],
  ['Emmanuel Macron', 'star', '« Parce que c\'est notre projet ! »'],
  ['Donald Trump', 'star', '« You\'re fired ! » (et les mains qui bougent)'],
  ['Michael Jackson', 'star', '« Hee-hee ! » et le moonwalk'],
  ['Johnny Hallyday', 'star', '« Ah que coucou ! » (voix rauque)'],
  ['Céline Dion', 'star', 'Accent québécois et grand rire'],
  ['Zinedine Zidane', 'star', 'Parle tout doucement… puis un coup de tête'],
  ['Gordon Ramsay', 'star', '« C\'est CRU ! » (il crie sur les cuisiniers)'],
  ['Philippe Etchebest', 'star', 'Chef qui hurle en cuisine : « On est où là ? »'],
  ['Fabrice Luchini', 'star', 'Parle comme au théâtre, avec de très grands mots'],
  ['Squeezie', 'star', '« Salut tout le monde, c\'est Squeezie ! »'],
  ['Un commentateur de foot', 'star', '« Et c\'est le buuuut ! »'],
  ['Un présentateur météo', 'star', '« Sortez les parapluies ! »'],
];
const SITUATIONS = [
  'commande au fast-food', 'présente la météo', 'fait un discours de mariage', 'appelle le service client', 'commente un match de foot',
  'fait une pub pour un shampoing', 'annonce qu\'il quitte la soirée', 'réveille quelqu\'un le matin', 'fait un tuto de cuisine', 'drague à la soirée',
  'passe un entretien d\'embauche', 'lit une histoire pour enfants', 'fait un selfie', 'répond au téléphone', 'vend un aspirateur',
  'fait le GPS de la voiture', 'raconte ses vacances', 'rate son gâteau', 'gagne au loto', 'donne un cours de sport',
  'arrive en retard au travail', 'fait la queue à la boulangerie', 'présente le journal de 20 h', 'chante joyeux anniversaire', 'cherche ses clés',
];
const SHOW_MS = 60000;     // temps pour imiter
const RATE_MS = 30000;     // temps pour noter
const N_CARDS = 3;         // l'imitateur choisit parmi 3 personnages
const FAIR_PTS = 20;       // juge juste : note à 1 point ou moins de la moyenne

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['best', 'fair']);
  const theme = ctx.option('theme') || 'tout';
  const pool = CHARS.filter((c) => theme === 'tout' || c[1] === theme);
  const order = shuffle(active(ctx, { scores }).map((p) => p.id));
  const total = ctx.rounds(Math.min(10, Math.max(order.length, 4)));
  return { scores, stats, pool, order, total, round: 0, phase: 'intro', tok: 0, usedChars: [], usedSit: [] };
}

function pick(list, used, n = 1) {
  let free = list.filter((x) => !used.includes(x));
  if (free.length < n) free = list;
  const v = shuffle(free).slice(0, n);
  used.push(...v);
  return v;
}

function startRound(ctx, g) {
  g.round++;
  const on = new Set(active(ctx, g).map((p) => p.id));
  // prochain imitateur encore là (on tourne dans l'ordre de départ)
  let actor = null;
  for (let k = 0; k < g.order.length; k++) {
    const id = g.order[(g.round - 1 + k) % g.order.length];
    if (on.has(id)) { actor = id; break; }
  }
  g.cur = { actor, cards: pick(g.pool, g.usedChars, N_CARDS), situation: pick(SITUATIONS, g.usedSit)[0], char: null, notes: {} };
  g.phase = 'choose';
}

function timer(ctx, g, ms, fn) {
  g.until = Date.now() + ms;
  const tok = ++g.tok;
  ctx.schedule(ms, () => { if (g.tok === tok) fn(); });
}

function choose(ctx, g, i) {
  g.cur.char = g.cur.cards[i] || g.cur.cards[0];
  g.phase = 'show';
  timer(ctx, g, SHOW_MS, () => startRate(ctx, g));
}

function startRate(ctx, g) {
  if (g.phase !== 'show') return;
  g.phase = 'rate';
  timer(ctx, g, RATE_MS, () => reveal(ctx, g));
}

const judges = (ctx, g) => active(ctx, g).map((p) => p.id).filter((id) => id !== g.cur.actor);

function reveal(ctx, g) {
  if (g.phase !== 'rate') return;
  g.tok++;
  const c = g.cur, gains = {};
  const vals = Object.values(c.notes);
  c.avg = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  if (c.avg != null) {
    const pts = Math.round(c.avg * 10);
    if (c.actor in g.scores) {
      gain(gains, c.actor, pts, `Imitation notée ${String(c.avg).replace('.', ',')}/10 🎙️`);
      g.stats[c.actor].best = Math.max(g.stats[c.actor].best, pts);
    }
    for (const [id, v] of Object.entries(c.notes)) {
      if (Math.abs(v - c.avg) <= 1) { gain(gains, id, FAIR_PTS, 'Juge juste : proche de la moyenne ⚖️'); g.stats[id].fair++; }
    }
  }
  applyGains(g.scores, gains);
  c.gains = gains;
  g.phase = 'reveal';
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  const c = g.cur;
  if (type === 'choose' && g.phase === 'choose' && (pid === c.actor || isHost)) return choose(ctx, g, Number(payload) || 0);
  if (type === 'done' && g.phase === 'show' && (pid === c.actor || isHost)) return startRate(ctx, g);
  if (type === 'note' && g.phase === 'rate') {
    if (pid === c.actor) return { error: 'Tu ne peux pas te noter toi-même 😉' };
    const v = Math.round(Number(payload));
    if (!(v >= 0 && v <= 10)) return { quiet: true };
    c.notes[pid] = v;
    if (judges(ctx, g).every((id) => c.notes[id] != null)) reveal(ctx, g);
    return;
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'intro') return startRound(ctx, g);
    if (g.phase === 'choose') return choose(ctx, g, 0);
    if (g.phase === 'show') return startRate(ctx, g);
    if (g.phase === 'rate') return reveal(ctx, g);
    if (g.phase === 'reveal') {
      if (g.round < g.total) return startRound(ctx, g);
      g.phase = 'end';
      g.awards = awards(g.stats, [
        ['best', 'Roi de l\'imitation', '🎙️', 'a eu la meilleure note'],
        ['fair', 'Juge impartial', '⚖️', 'a noté le plus souvent comme tout le monde'],
      ]);
      ctx.endGame(g.scores);
    }
  }
}

// quelqu'un part pendant les notes : on n'attend plus que les présents
function onPlayersChanged(ctx, g) {
  if (g.phase !== 'rate') return;
  const js = judges(ctx, g);
  if (js.length && js.every((id) => g.cur.notes[id] != null)) reveal(ctx, g);
}

function stateFor(ctx, g, pid) {
  const c = g.cur;
  const s = {
    phase: g.phase, round: g.round, totalRounds: g.total, scores: g.scores, participants: Object.keys(g.scores),
    left: g.until ? Math.max(0, g.until - Date.now()) : 0,
  };
  if (!c) return s;
  s.cur = { actor: c.actor, situation: c.situation };
  if (g.phase === 'choose' && pid === c.actor) s.cur.cards = c.cards.map((x) => ({ name: x[0], phrase: x[2] }));
  if (c.char) Object.assign(s.cur, { name: c.char[0], phrase: c.char[2] });   // tout le monde sait qui est imité
  if (g.phase === 'rate') { s.cur.done = Object.keys(c.notes); s.cur.judges = judges(ctx, g); if (pid in c.notes) s.cur.mine = c.notes[pid]; }
  if (g.phase === 'reveal') Object.assign(s.cur, { notes: c.notes, avg: c.avg, gains: c.gains });
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'imitateur',
  color: '#ff8fb1',
  name: 'L\'Imitateur',
  emoji: '🎙️',
  tagline: 'Imite Gollum, Scooby-Doo ou Dark Vador… et les autres notent ta prestation sur 10 !',
  description: 'À tour de rôle, imite un personnage culte avec sa phrase culte, sa voix et ses tics. Les autres notent la prestation sur 10.',
  minPlayers: 2,
  maxPlayers: 16,
  duration: '10–15 min',
  options: [
    { key: 'theme', label: 'Personnages', default: 'tout', choices: [
      { value: 'tout', label: 'Tout mélangé', hint: 'Films, dessins animés et personnalités' },
      { value: 'film', label: 'Films et dessins animés', hint: 'Dark Vador, Shrek, Bob l\'éponge…' },
      { value: 'star', label: 'Personnalités', hint: 'Chanteurs, sportifs, présentateurs…' },
    ] },
  ],
  create,
  onAction,
  onPlayersChanged,
  stateFor,
  _test: { CHARS, SITUATIONS },
};
