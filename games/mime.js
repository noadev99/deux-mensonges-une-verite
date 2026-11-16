// ─────────────────────────────────────────────────────────────────────────────
// 🎭 Fais deviner — un paquet de mots, trois manches.
// En équipes dès 4 joueurs ; à 2 ou 3 (ou si l'hôte le choisit) : chacun pour soi,
// un joueur fait deviner et tous les autres devinent.
// Paquet au choix : mots du jeu, personnalités célèbres, ou mots écrits par les joueurs.
// À chaque tour, un joueur voit des mots sur son téléphone et doit en faire deviner
// le plus possible à son équipe avant la fin du chrono. L'équipe adverse voit aussi
// le mot et peut crier à la triche. Les MÊMES mots reviennent à chaque manche :
//   1. 🗣️ on parle librement (sans dire le mot)
//   2. ☝️ un seul mot d'indice
//   3. 🤸 on mime, sans un bruit
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, gain, applyGains, awards, active, initScores, normalize } = require('./_utils');

const WORDS = [
  'pirate', 'vampire', 'astronaute', 'pompier', 'magicien', 'cow-boy', 'sirène', 'robot', 'momie', 'chevalier',
  'ninja', 'clown', 'Père Noël', 'fantôme', 'sorcière', 'dentiste', 'boulanger', 'facteur', 'chirurgien', 'arbitre',
  'jardinier', 'plombier', 'détective', 'pilote de course', 'professeur', 'coiffeur', 'serveur', 'policier', 'chef d\'orchestre', 'photographe',
  'kangourou', 'pingouin', 'girafe', 'pieuvre', 'crocodile', 'singe', 'éléphant', 'escargot', 'paon', 'gorille',
  'serpent', 'poule', 'dauphin', 'hérisson', 'chauve-souris', 'flamant rose', 'grenouille', 'abeille', 'requin', 'paresseux',
  'brosse à dents', 'parapluie', 'aspirateur', 'trampoline', 'tondeuse', 'machine à laver', 'grille-pain', 'sèche-cheveux', 'micro-ondes', 'cerf-volant',
  'skateboard', 'boussole', 'ventilateur', 'téléphérique', 'montgolfière', 'sous-marin', 'hélicoptère', 'trottinette', 'tracteur', 'ascenseur',
  'appareil photo', 'casque de moto', 'ballon de baudruche', 'fer à repasser', 'tire-bouchon', 'escalier', 'balançoire', 'toboggan', 'bougie', 'cadenas',
  'spaghetti', 'barbe à papa', 'fondue', 'pop-corn', 'crêpe', 'glace', 'raclette', 'sushi', 'croissant', 'pastèque',
  'banane', 'chewing-gum', 'omelette', 'hamburger', 'citron', 'oignon', 'baguette', 'chocolat chaud', 'soupe', 'fraise',
  'bowling', 'ski', 'surf', 'boxe', 'tennis', 'escalade', 'plongée', 'yoga', 'karaté', 'patinage',
  'golf', 'pêche', 'tir à l\'arc', 'danse classique', 'haltérophilie', 'saut à la perche', 'billard', 'curling', 'sumo', 'équitation',
  'mariage', 'anniversaire', 'éternuement', 'hoquet', 'selfie', 'embouteillage', 'camping', 'déménagement', 'coup de soleil', 'karaoké',
  'feu d\'artifice', 'tempête', 'arc-en-ciel', 'volcan', 'tremblement de terre', 'bonhomme de neige', 'château fort', 'pyramide', 'phare', 'igloo',
  'zombie', 'super-héros', 'licorne', 'dragon', 'extraterrestre', 'fée', 'loup-garou', 'géant', 'lutin', 'yéti',
  'ronfler', 'bâiller', 'se brosser les dents', 'faire la vaisselle', 'jongler', 'tricoter', 'se maquiller', 'faire du vélo', 'pleurer', 'chatouiller',
  'cuisiner', 'nager', 'conduire', 'se raser', 'faire un câlin', 'applaudir', 's\'endormir', 'courir après le bus', 'faire ses lacets', 'promener son chien',
];


// personnalités et personnages connus (paquet « Célébrités »)
const CELEBS = [
  'Zinedine Zidane', 'Kylian Mbappé', 'Lionel Messi', 'Cristiano Ronaldo', 'Michael Jordan', 'Usain Bolt', 'Teddy Riner', 'Serena Williams', 'Rafael Nadal', 'Muhammad Ali',
  'Léon Marchand', 'Antoine Griezmann', 'Tony Parker', 'Mike Tyson', 'Napoléon', 'Jeanne d\'Arc', 'Louis XIV', 'Cléopâtre', 'Jules César', 'Charles de Gaulle',
  'Marie Curie', 'Albert Einstein', 'Isaac Newton', 'Léonard de Vinci', 'Picasso', 'Van Gogh', 'Mozart', 'Beethoven', 'Molière', 'Victor Hugo',
  'Shakespeare', 'Christophe Colomb', 'Neil Armstrong', 'Thomas Pesquet', 'Gandhi', 'Nelson Mandela', 'Martin Luther King', 'Coco Chanel', 'Gustave Eiffel', 'Walt Disney',
  'Steve Jobs', 'Elon Musk', 'Barack Obama', 'la reine d\'Angleterre', 'Michael Jackson', 'Beyoncé', 'Rihanna', 'Taylor Swift', 'Elvis Presley', 'Madonna',
  'Freddie Mercury', 'Bob Marley', 'Johnny Hallyday', 'Édith Piaf', 'Céline Dion', 'Stromae', 'Aya Nakamura', 'Charlie Chaplin', 'Marilyn Monroe', 'Louis de Funès',
  'Omar Sy', 'Jean Dujardin', 'Leonardo DiCaprio', 'Brad Pitt', 'Squeezie', 'Harry Potter', 'Dark Vador', 'Yoda', 'Spider-Man', 'Batman',
  'Superman', 'Wonder Woman', 'Hulk', 'Iron Man', 'le Joker', 'Shrek', 'Pikachu', 'Mario', 'Sonic', 'Astérix',
  'Obélix', 'Tintin', 'Bob l\'éponge', 'Homer Simpson', 'Mickey', 'Cendrillon', 'Blanche-Neige', 'la Reine des neiges', 'Tarzan', 'Peter Pan',
  'le capitaine Crochet', 'Pinocchio', 'Gollum', 'Gandalf', 'James Bond', 'Sherlock Holmes', 'Indiana Jones', 'Rocky', 'Terminator', 'Zorro',
  'Robin des bois', 'le Petit Prince', 'Dracula', 'Frankenstein', 'King Kong', 'Godzilla', 'E.T.', 'Jack Sparrow', 'Lara Croft', 'Hercule',
  'Goku', 'Naruto', 'Luffy', 'Garfield', 'Scooby-Doo', 'un Schtroumpf', 'Winnie l\'ourson', 'Le Roi Lion', 'Dora l\'exploratrice', 'Mr Bean',
];

const MANCHES = [
  { id: 'parle', name: 'Parle librement', emoji: '🗣️', rule: 'Dis tout ce que tu veux… sauf le mot lui-même (ni un morceau, ni une traduction).' },
  { id: 'un', name: 'Un seul mot', emoji: '☝️', rule: 'Tu n\'as droit qu\'à UN SEUL mot d\'indice par mot à faire deviner. Les mots sont les mêmes qu\'à la manche 1 !' },
  { id: 'mime', name: 'Mime', emoji: '🤸', rule: 'Aucun mot, aucun bruit : tu mimes ! Toujours les mêmes mots.' },
];
const TEAMS = [
  { name: 'Les Rouges', emoji: '🔴', color: '#ff5d5d' },
  { name: 'Les Bleus', emoji: '🔵', color: '#4d8bff' },
];
const PTS = { TEAM: 10, GIVER: 5, CHEAT: 10, FINDER: 10 };
const WRITE_N = 4;             // mots écrits par chaque joueur (paquet « nos mots »)
const SOLO_UNDER = 4;          // en dessous de 4 joueurs : chacun pour soi

const deckSize = (n) => Math.max(15, Math.min(36, 6 + 3 * n));

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['found', 'guessed', 'cheat', 'caught']);
  const ids = shuffle(active(ctx, { scores }).map((p) => p.id));
  const solo = ctx.option('mode') === 'solo' || ids.length < SOLO_UNDER;
  const teams = [[], []];
  if (solo) teams[0] = ids;                 // chacun pour soi : une seule « équipe », l'ordre de passage
  else ids.forEach((id, i) => teams[i % 2].push(id));
  const deck = ctx.option('deck') || 'mots';
  const g = {
    scores, stats, teams, solo, deck, words: [], turnMs: Number(ctx.option('time')) * 1000 || 45000,
    manche: 0, totalManches: ctx.rounds(3), teamPts: [0, 0], next: [0, 0], team: solo ? 0 : Math.random() < 0.5 ? 0 : 1,
    phase: 'teams', tok: 0, written: {},
  };
  if (deck === 'perso') g.phase = 'write';
  else g.words = ctx.fresh(deck === 'celeb' ? CELEBS : WORDS, deckSize(ids.length));
  return g;
}

// paquet « nos mots » : les mots écrits par tout le monde (sans doublons), complétés si besoin
function buildWritten(ctx, g) {
  const seen = new Set(), list = [];
  for (const arr of Object.values(g.written)) for (const w of arr) {
    const k = normalize(w);
    if (k && !seen.has(k)) { seen.add(k); list.push(w); }
  }
  const min = Math.max(10, Object.keys(g.scores).length * 3);
  if (list.length < min) for (const w of ctx.fresh(WORDS, min)) if (list.length < min && !seen.has(normalize(w))) { seen.add(normalize(w)); list.push(w); }
  g.words = shuffle(list);
  g.phase = 'teams';
}

const teamOf = (g, pid) => (g.teams[0].includes(pid) ? 0 : g.teams[1].includes(pid) ? 1 : -1);

function startManche(g) {
  g.manche++;
  g.remaining = shuffle(g.words);
}

// prochain joueur de l'équipe qui a la main (en sautant les déconnectés)
function prepareTurn(ctx, g) {
  const on = new Set(active(ctx, g).map((p) => p.id));
  for (let k = 0; k < 2; k++) {
    const t = g.teams[g.team];
    for (let i = 0; i < t.length; i++) {
      const id = t[(g.next[g.team] + i) % t.length];
      if (on.has(id)) { g.next[g.team] = (g.next[g.team] + i + 1) % t.length; g.giver = id; g.phase = 'ready'; return; }
    }
    if (!g.solo) g.team = 1 - g.team; // personne de connecté dans cette équipe : l'autre joue
  }
  g.giver = null;
  g.phase = 'ready';
}

function startTurn(ctx, g) {
  g.phase = 'turn';
  g.found = [];
  g.foundBy = [];
  g.cheats = [];
  g.word = g.remaining.shift();
  g.until = Date.now() + g.turnMs;
  const tok = ++g.tok;
  ctx.schedule(g.turnMs, () => { if (g.tok === tok) endTurn(ctx, g); });
}

function endTurn(ctx, g) {
  if (g.phase !== 'turn') return;
  g.tok++;
  if (g.word) g.remaining.push(g.word);
  g.word = null;
  const gains = {};
  const n = g.found.length;
  if (n && g.solo) {
    const per = {};
    for (const by of g.foundBy) if (by) per[by] = (per[by] || 0) + 1;
    for (const [id, k] of Object.entries(per)) gain(gains, id, PTS.FINDER * k, `${k} mot${k > 1 ? 's' : ''} deviné${k > 1 ? 's' : ''}`);
    gain(gains, g.giver, PTS.GIVER * n, `${n} mot${n > 1 ? 's' : ''} fait${n > 1 ? 's' : ''} deviner 🎭`);
  } else if (n) {
    for (const id of g.teams[g.team]) gain(gains, id, PTS.TEAM * n, `${n} mot${n > 1 ? 's' : ''} trouvé${n > 1 ? 's' : ''} par ton équipe`);
    gain(gains, g.giver, PTS.GIVER * n, 'Bonus du faiseur 🎭');
  }
  if (g.cheats.length) gain(gains, g.giver, -PTS.CHEAT * g.cheats.length, 'Pris à tricher 🚨');
  applyGains(g.scores, gains);
  g.teamPts[g.team] += n - g.cheats.length;
  g.last = { team: g.team, giver: g.giver, found: g.found, foundBy: g.foundBy, cheats: g.cheats, gains, mancheOver: !g.remaining.length };
  g.phase = 'turnEnd';
  if (!g.solo) g.team = 1 - g.team;
}

function nextWord(g) {
  g.word = g.remaining.shift() || null;
}

// les joueurs qui devinent pendant ce tour (chacun pour soi : tous sauf le faiseur)
const guessers = (ctx, g) => (g.solo ? active(ctx, g).map((p) => p.id).filter((id) => id !== g.giver && g.teams[0].includes(id)) : []);

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  if (type === 'write' && g.phase === 'write') {
    const arr = (Array.isArray(payload) ? payload : []).map((w) => String(w || '').trim().replace(/\s+/g, ' ').slice(0, 40)).filter(Boolean).slice(0, WRITE_N);
    if (arr.length < WRITE_N) return { error: `Écris ${WRITE_N} mots` };
    g.written[pid] = arr;
    if (active(ctx, g).every((p) => g.written[p.id])) buildWritten(ctx, g);
    return;
  }
  const word = payload && typeof payload === 'object' ? payload.w : payload;
  if (['found', 'pass', 'cheat'].includes(type) && (g.phase !== 'turn' || word !== g.word)) return { quiet: true }; // clic sur un mot déjà passé
  if (type === 'found' && pid === g.giver) {
    let by = null;
    if (g.solo) {
      const gs = guessers(ctx, g);
      by = gs.includes(payload?.by) ? payload.by : gs.length === 1 ? gs[0] : null;
      if (by) g.stats[by].guessed++;
    }
    g.found.push(g.word);
    g.foundBy.push(by);
    g.stats[pid].found++;
    nextWord(g);
    if (!g.word) endTurn(ctx, g); // paquet vide : fin de la manche
    return;
  }
  if (type === 'pass' && pid === g.giver) {
    if (g.remaining.length) { g.remaining.push(g.word); nextWord(g); }
    return;
  }
  if (type === 'cheat' && !g.solo && teamOf(g, pid) === 1 - g.team) {
    g.cheats.push({ word: g.word, by: pid });
    g.stats[pid].caught++;
    g.stats[g.giver].cheat++;
    ctx.buzz(g.giver, [200, 80, 200]);
    g.remaining.push(g.word);
    nextWord(g);
    return;
  }
  if (type === 'go' && g.phase === 'ready' && (pid === g.giver || isHost)) return startTurn(ctx, g);
  if (type === 'next' && isHost) {
    if (g.phase === 'write') { if (!Object.keys(g.written).length) return { error: 'Personne n\'a encore écrit ses mots' }; buildWritten(ctx, g); return; }
    if (g.phase === 'teams') { startManche(g); g.phase = 'mancheIntro'; return; }
    if (g.phase === 'mancheIntro') return prepareTurn(ctx, g);
    if (g.phase === 'ready') return startTurn(ctx, g);
    if (g.phase === 'turn') return endTurn(ctx, g);
    if (g.phase === 'turnEnd') {
      if (g.remaining.length) return prepareTurn(ctx, g);
      g.phase = 'mancheEnd';
      return;
    }
    if (g.phase === 'mancheEnd') {
      if (g.manche >= g.totalManches) {
        // l'équipe gagnante reçoit un bonus
        const gains = {};
        const [a, b] = g.teamPts;
        if (!g.solo && a !== b) for (const id of g.teams[a > b ? 0 : 1]) gain(gains, id, 30, 'Équipe gagnante 🏆');
        applyGains(g.scores, gains);
        g.finalGains = gains;
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['found', 'Star de la scène', '🎭', 'a fait deviner le plus de mots'],
          ['guessed', 'Devin', '🔮', 'a deviné le plus de mots'],
          ['caught', 'Œil de l\'arbitre', '🚨', 'a pris le plus de tricheurs'],
          ['cheat', 'Petit tricheur', '😈', 's\'est fait prendre le plus souvent'],
        ]);
        ctx.endGame(g.scores);
        return;
      }
      startManche(g);
      g.phase = 'mancheIntro';
    }
  }
}

// quelqu'un part pendant l'écriture : on n'attend plus que les présents
function onPlayersChanged(ctx, g) {
  if (g.phase === 'write' && Object.keys(g.written).length && active(ctx, g).every((p) => g.written[p.id])) buildWritten(ctx, g);
}

function stateFor(ctx, g, pid) {
  const my = g.solo ? (g.teams[0].includes(pid) ? 0 : -1) : teamOf(g, pid);
  const s = {
    phase: g.phase, scores: g.scores, participants: Object.keys(g.scores), teams: g.teams, teamInfo: TEAMS, solo: g.solo, deck: g.deck,
    teamPts: g.teamPts, manche: g.manche, totalManches: g.totalManches, mancheInfo: MANCHES[Math.max(0, g.manche - 1)], manches: MANCHES,
    team: g.team, giver: g.giver, myTeam: my, left: g.until ? Math.max(0, g.until - Date.now()) : 0,
    remaining: g.remaining ? g.remaining.length : g.words.length, total: g.words.length,
  };
  if (g.phase === 'write') {
    s.writeN = WRITE_N;
    s.done = Object.keys(g.written);
    s.mine = g.written[pid] || null;
  }
  if (g.phase === 'turn') {
    s.found = g.found;
    s.foundBy = g.foundBy;
    s.cheats = g.cheats.length;
    if (g.solo) s.guessers = guessers(ctx, g);
    // le mot : au faiseur et à l'équipe adverse (qui surveille), jamais à ceux qui devinent ni à la télé
    if (pid === g.giver || (!g.solo && my >= 0 && my !== g.team)) s.word = g.word;
  }
  if (g.phase === 'turnEnd') s.last = g.last;
  if (g.phase === 'end') { s.awards = g.awards; s.finalGains = g.finalGains; }
  return s;
}

module.exports = {
  id: 'mime',
  color: '#c86bff',
  name: 'Fais deviner',
  emoji: '🎭',
  tagline: 'Les mêmes mots sur 3 manches : en parlant, en un seul mot, puis en mimant !',
  description: 'Un paquet de mots qui revient sur trois manches : parler librement, un seul mot, puis mime. En équipes dès 4, chacun pour soi à 2 ou 3.',
  minPlayers: 2,
  maxPlayers: 16,
  duration: '20 min',
  options: [
    { key: 'deck', label: 'Les mots', default: 'mots', choices: [
      { value: 'mots', label: 'Mots du jeu', hint: 'Animaux, métiers, objets, sports…' },
      { value: 'celeb', label: 'Célébrités', hint: 'Personnalités et personnages connus' },
      { value: 'perso', label: 'Nos mots', hint: `Chacun écrit ${WRITE_N} mots en secret au début` },
    ] },
    { key: 'mode', label: 'Équipes', default: 'auto', choices: [
      { value: 'auto', label: 'Automatique', hint: 'Deux équipes dès 4 joueurs, sinon chacun pour soi' },
      { value: 'solo', label: 'Chacun pour soi', hint: 'Un joueur fait deviner, tous les autres devinent' },
    ] },
    { key: 'time', label: 'Durée d\'un tour', default: '45', choices: [
      { value: '30', label: '30 s', hint: 'Très nerveux' },
      { value: '45', label: '45 s', hint: 'Le bon rythme' },
      { value: '60', label: '60 s', hint: 'Plus détendu' },
    ] },
  ],
  create,
  onAction,
  onPlayersChanged,
  stateFor,
  _test: { WORDS, CELEBS },
};
