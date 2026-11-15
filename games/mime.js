// ─────────────────────────────────────────────────────────────────────────────
// 🎭 Fais deviner — deux équipes, un paquet de mots, trois manches.
// À chaque tour, un joueur voit des mots sur son téléphone et doit en faire deviner
// le plus possible à son équipe avant la fin du chrono. L'équipe adverse voit aussi
// le mot et peut crier à la triche. Les MÊMES mots reviennent à chaque manche :
//   1. 🗣️ on parle librement (sans dire le mot)
//   2. ☝️ un seul mot d'indice
//   3. 🤸 on mime, sans un bruit
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, gain, applyGains, awards, active, initScores } = require('./_utils');

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

const MANCHES = [
  { id: 'parle', name: 'Parle librement', emoji: '🗣️', rule: 'Dis tout ce que tu veux… sauf le mot lui-même (ni un morceau, ni une traduction).' },
  { id: 'un', name: 'Un seul mot', emoji: '☝️', rule: 'Tu n\'as droit qu\'à UN SEUL mot d\'indice par mot à faire deviner. Les mots sont les mêmes qu\'à la manche 1 !' },
  { id: 'mime', name: 'Mime', emoji: '🤸', rule: 'Aucun mot, aucun bruit : tu mimes ! Toujours les mêmes mots.' },
];
const TEAMS = [
  { name: 'Les Rouges', emoji: '🔴', color: '#ff5d5d' },
  { name: 'Les Bleus', emoji: '🔵', color: '#4d8bff' },
];
const PTS = { TEAM: 10, GIVER: 5, CHEAT: 10 };

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['found', 'cheat', 'caught']);
  const ids = shuffle(active(ctx, { scores }).map((p) => p.id));
  const teams = [[], []];
  ids.forEach((id, i) => teams[i % 2].push(id));
  const nWords = Math.max(18, Math.min(36, 6 + 3 * ids.length));
  const words = ctx.fresh(WORDS, nWords);
  return {
    scores, stats, teams, words, turnMs: Number(ctx.option('time')) * 1000 || 45000,
    manche: 0, totalManches: ctx.rounds(3), teamPts: [0, 0], next: [0, 0], team: Math.random() < 0.5 ? 0 : 1,
    phase: 'teams', tok: 0, log: [],
  };
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
    g.team = 1 - g.team; // personne de connecté dans cette équipe : l'autre joue
  }
  g.giver = null;
  g.phase = 'ready';
}

function startTurn(ctx, g) {
  g.phase = 'turn';
  g.found = [];
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
  if (n) {
    for (const id of g.teams[g.team]) gain(gains, id, PTS.TEAM * n, `${n} mot${n > 1 ? 's' : ''} trouvé${n > 1 ? 's' : ''} par ton équipe`);
    gain(gains, g.giver, PTS.GIVER * n, 'Bonus du faiseur 🎭');
  }
  if (g.cheats.length) gain(gains, g.giver, -PTS.CHEAT * g.cheats.length, 'Pris à tricher 🚨');
  applyGains(g.scores, gains);
  g.teamPts[g.team] += n - g.cheats.length;
  g.last = { team: g.team, giver: g.giver, found: g.found, cheats: g.cheats, gains, mancheOver: !g.remaining.length };
  g.phase = 'turnEnd';
  g.team = 1 - g.team;
}

function nextWord(g) {
  g.word = g.remaining.shift() || null;
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  if (['found', 'pass', 'cheat'].includes(type) && (g.phase !== 'turn' || payload !== g.word)) return { quiet: true }; // clic sur un mot déjà passé
  if (type === 'found' && g.phase === 'turn' && pid === g.giver) {
    g.found.push(g.word);
    g.stats[pid].found++;
    nextWord(g);
    if (!g.word) endTurn(ctx, g); // paquet vide : fin de la manche
    return;
  }
  if (type === 'pass' && g.phase === 'turn' && pid === g.giver) {
    if (g.remaining.length) { g.remaining.push(g.word); nextWord(g); }
    return;
  }
  if (type === 'cheat' && g.phase === 'turn' && teamOf(g, pid) === 1 - g.team) {
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
        if (a !== b) for (const id of g.teams[a > b ? 0 : 1]) gain(gains, id, 30, 'Équipe gagnante 🏆');
        applyGains(g.scores, gains);
        g.finalGains = gains;
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['found', 'Star de la scène', '🎭', 'a fait deviner le plus de mots'],
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

function stateFor(ctx, g, pid) {
  const my = teamOf(g, pid);
  const s = {
    phase: g.phase, scores: g.scores, participants: Object.keys(g.scores), teams: g.teams, teamInfo: TEAMS,
    teamPts: g.teamPts, manche: g.manche, totalManches: g.totalManches, mancheInfo: MANCHES[Math.max(0, g.manche - 1)], manches: MANCHES,
    team: g.team, giver: g.giver, myTeam: my, left: g.until ? Math.max(0, g.until - Date.now()) : 0,
    remaining: g.remaining ? g.remaining.length : g.words.length, total: g.words.length,
  };
  if (g.phase === 'turn') {
    s.found = g.found;
    s.cheats = g.cheats.length;
    // le mot : au faiseur et à l'équipe adverse (qui surveille), jamais à l'équipe qui devine ni à la télé
    if (pid === g.giver || (my >= 0 && my !== g.team)) s.word = g.word;
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
  tagline: 'En équipes : fais deviner des mots en parlant, en un seul mot, puis en mimant !',
  description: 'Deux équipes, un paquet de mots qui revient sur trois manches : parler librement, un seul mot, puis mime.',
  minPlayers: 4,
  maxPlayers: 16,
  duration: '20 min',
  options: [
    { key: 'time', label: 'Durée d\'un tour', default: '45', choices: [
      { value: '30', label: '30 s', hint: 'Très nerveux' },
      { value: '45', label: '45 s', hint: 'Le bon rythme' },
      { value: '60', label: '60 s', hint: 'Plus détendu' },
    ] },
  ],
  create,
  onAction,
  stateFor,
  _test: { WORDS },
};
