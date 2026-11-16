// ─────────────────────────────────────────────────────────────────────────────
// 🎙️ L'Imitateur — à tour de rôle, un joueur reçoit en secret un PERSONNAGE
// (film, dessin animé, personnalité…) et une SITUATION (« commande au fast-food »).
// Il joue la situation en imitant le personnage : voix, gestes, tics.
// Les autres choisissent sur leur téléphone qui il imite parmi 6 noms.
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
const N_CHOICES = 6;
const TURN_MS = 75000;
const PTS = { FAST: 150, HINT: 75, ACTOR_FAST: 40, ACTOR_HINT: 20 };

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
  const ch = pick(g.pool, g.usedChars);
  // les leurres : de la même famille de préférence
  const same = g.pool.filter((c) => c !== ch && c[1] === ch[1]);
  const other = g.pool.filter((c) => c !== ch && c[1] !== ch[1]);
  const decoys = [...shuffle(same), ...shuffle(other)].slice(0, N_CHOICES - 1);
  const choices = shuffle([ch, ...decoys]);
  g.cur = { actor, char: ch, situation: pick(SITUATIONS, g.usedSit), choices: choices.map((c) => c[0]), good: choices.indexOf(ch), hint: false, votes: {} };
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
  let fast = 0, slow = 0;
  for (const [id, v] of Object.entries(c.votes)) {
    if (v.i !== c.good) continue;
    g.stats[id].found++;
    if (v.hint) { slow++; gain(gains, id, PTS.HINT, 'Trouvé après la phrase culte'); }
    else { fast++; gain(gains, id, PTS.FAST, 'Trouvé sans la phrase culte 🎯'); }
  }
  if (c.actor in g.scores) {
    if (fast) gain(gains, c.actor, PTS.ACTOR_FAST * fast, `${fast} joueur${fast > 1 ? 's' : ''} t'${fast > 1 ? 'ont' : 'a'} reconnu sans la phrase 🎙️`);
    if (slow) gain(gains, c.actor, PTS.ACTOR_HINT * slow, `${slow} joueur${slow > 1 ? 's' : ''} t'${slow > 1 ? 'ont' : 'a'} reconnu avec la phrase`);
    g.stats[c.actor].imitated += fast + slow;
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
  if (type === 'vote' && g.phase === 'play') {
    if (pid === c.actor) return { quiet: true };
    if (c.votes[pid]) return { error: 'Tu as déjà répondu' };
    const i = Number(payload);
    if (!(i >= 0 && i < c.choices.length)) return { quiet: true };
    c.votes[pid] = { i, hint: c.hint, at: Date.now() };
    if (guessers(ctx, g).every((id) => c.votes[id])) reveal(ctx, g);
    return;
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'intro') return startRound(ctx, g);
    if (g.phase === 'ready') return startPlay(ctx, g);
    if (g.phase === 'play') return reveal(ctx, g);
    if (g.phase === 'reveal') {
      if (g.round < g.total) return startRound(ctx, g);
      g.phase = 'end';
      g.awards = awards(g.stats, [
        ['imitated', 'Roi de l\'imitation', '🎙️', 'a été reconnu par le plus de joueurs'],
        ['found', 'Oreille d\'or', '👂', 'a reconnu le plus de personnages'],
      ]);
      ctx.endGame(g.scores);
    }
  }
}

// l'imitateur s'en va pendant son tour, ou tout le monde a répondu
function onPlayersChanged(ctx, g) {
  if (g.phase !== 'play') return;
  const gs = guessers(ctx, g);
  if (gs.length && gs.every((id) => g.cur.votes[id])) reveal(ctx, g);
}

function stateFor(ctx, g, pid) {
  const c = g.cur;
  const s = {
    phase: g.phase, round: g.round, totalRounds: g.total, scores: g.scores, participants: Object.keys(g.scores),
    left: g.until ? Math.max(0, g.until - Date.now()) : 0,
  };
  if (!c) return s;
  s.cur = { actor: c.actor, situation: c.situation, choices: c.choices, hint: c.hint, voted: Object.keys(c.votes) };
  if (pid === c.actor && g.phase !== 'reveal') s.card = { name: c.char[0], phrase: c.char[2] };
  if (pid && c.votes[pid]) s.cur.mine = c.votes[pid].i;
  if (g.phase === 'reveal') {
    s.cur.good = c.good;
    s.cur.phrase = c.char[2];
    s.cur.votes = Object.fromEntries(Object.entries(c.votes).map(([id, v]) => [id, { i: v.i, hint: v.hint }]));
    s.cur.gains = c.gains;
  }
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'imitateur',
  color: '#ff8fb1',
  name: 'L\'Imitateur',
  emoji: '🎙️',
  tagline: 'Imite un personnage dans une situation absurde : les autres doivent te reconnaître !',
  description: 'À tour de rôle, imite un personnage culte (Dark Vador, Shrek, Nabilla…) dans une situation tirée au sort. Les autres devinent qui c\'est.',
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
