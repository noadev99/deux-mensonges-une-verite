// ─────────────────────────────────────────────────────────────────────────────
// 🎙️ L'Imitateur — à tour de rôle, un joueur reçoit en secret un PERSONNAGE
// (film, dessin animé, personnalité…) et une SITUATION (« commande au fast-food »).
// Il joue la situation en imitant le personnage : voix, gestes, tics.
// Les autres crient leurs réponses à voix haute ; le premier qui trouve gagne :
// l'imitateur touche son nom sur son téléphone.
// Trop dur ? Il peut lâcher la PHRASE CULTE du personnage, mais les points baissent.
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
const TURN_MS = 90000;
const PTS = { FAST: 150, HINT: 75, ACTOR_FAST: 100, ACTOR_HINT: 50 };

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['found', 'imitated']);
  const theme = ctx.option('theme') || 'tout';
  const pool = CHARS.filter((c) => theme === 'tout' || c[1] === theme);
  const order = shuffle(active(ctx, { scores }).map((p) => p.id));
  const total = ctx.rounds(Math.min(10, Math.max(order.length, 4)));
  return { scores, stats, pool, order, total, round: 0, phase: 'intro', tok: 0, usedChars: [], usedSit: [] };
}

function pick(list, used) {
  const free = list.filter((x) => !used.includes(x));
  const v = shuffle(free.length ? free : list)[0];
  used.push(v);
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
  g.cur = { actor, char: pick(g.pool, g.usedChars), situation: pick(SITUATIONS, g.usedSit), hint: false, winner: null };
  g.phase = 'ready';
}

function startPlay(ctx, g) {
  g.phase = 'play';
  g.until = Date.now() + TURN_MS;
  const tok = ++g.tok;
  ctx.schedule(TURN_MS, () => { if (g.tok === tok) reveal(ctx, g); });
}

const guessers = (ctx, g) => active(ctx, g).map((p) => p.id).filter((id) => id !== g.cur.actor);

function reveal(ctx, g) {
  if (g.phase !== 'play') return;
  g.tok++;
  const c = g.cur, gains = {};
  if (c.winner) {
    g.stats[c.winner].found++;
    gain(gains, c.winner, c.hint ? PTS.HINT : PTS.FAST, c.hint ? 'Trouvé après la phrase culte' : 'Trouvé sans la phrase culte 🎯');
    if (c.actor in g.scores) {
      gain(gains, c.actor, c.hint ? PTS.ACTOR_HINT : PTS.ACTOR_FAST, c.hint ? 'Reconnu grâce à la phrase culte' : 'Reconnu sans la phrase culte 🎙️');
      g.stats[c.actor].imitated++;
    }
  }
  applyGains(g.scores, gains);
  c.gains = gains;
  g.phase = 'reveal';
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  const c = g.cur;
  if (type === 'go' && g.phase === 'ready' && (pid === c.actor || isHost)) return startPlay(ctx, g);
  if (type === 'hint' && g.phase === 'play' && pid === c.actor) { c.hint = true; return; }
  // l'imitateur (ou l'hôte) désigne celui qui a trouvé
  if (type === 'found' && g.phase === 'play' && (pid === c.actor || isHost)) {
    if (!guessers(ctx, g).includes(payload)) return { quiet: true };
    c.winner = payload;
    ctx.buzz(payload, [60, 40, 60]);
    return reveal(ctx, g);
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'intro') return startRound(ctx, g);
    if (g.phase === 'ready') return startPlay(ctx, g);
    if (g.phase === 'play') return reveal(ctx, g);
    if (g.phase === 'reveal') {
      if (g.round < g.total) return startRound(ctx, g);
      g.phase = 'end';
      g.awards = awards(g.stats, [
        ['imitated', 'Roi de l\'imitation', '🎙️', 'a été reconnu le plus souvent'],
        ['found', 'Oreille d\'or', '👂', 'a reconnu le plus de personnages'],
      ]);
      ctx.endGame(g.scores);
    }
  }
}

function stateFor(ctx, g, pid) {
  const c = g.cur;
  const s = {
    phase: g.phase, round: g.round, totalRounds: g.total, scores: g.scores, participants: Object.keys(g.scores),
    left: g.until ? Math.max(0, g.until - Date.now()) : 0,
  };
  if (!c) return s;
  s.cur = { actor: c.actor, situation: c.situation, hint: c.hint };
  if (pid === c.actor && g.phase !== 'reveal') s.card = { name: c.char[0], phrase: c.char[2] };
  if (g.phase === 'play') s.cur.guessers = guessers(ctx, g);
  if (g.phase === 'reveal') Object.assign(s.cur, { name: c.char[0], phrase: c.char[2], winner: c.winner, gains: c.gains });
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'imitateur',
  color: '#ff8fb1',
  name: 'L\'Imitateur',
  emoji: '🎙️',
  tagline: 'Imite un personnage dans une situation absurde : les autres doivent te reconnaître !',
  description: 'À tour de rôle, imite un personnage culte (Dark Vador, Shrek, Nabilla…) dans une situation tirée au sort. Les autres crient leurs réponses pour le reconnaître.',
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
  stateFor,
  _test: { CHARS, SITUATIONS },
};
