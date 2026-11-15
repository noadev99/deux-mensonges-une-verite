// ─────────────────────────────────────────────────────────────────────────────
// ⛩️ Trombi manga — un jeu de déduction façon trombinoscope, dès 2 joueurs.
// Un plateau de 24 personnages d'animés (cartes illustrées : nom, série, symbole).
// Chaque joueur reçoit en secret un des 24. À ton tour :
//   1. tu poses une question fermée (oui / non) à un joueur
//   2. il répond Oui / Non sur son téléphone
//   3. tu peux tenter de deviner son personnage (ou passer)
// Trouver vite rapporte gros. Le dernier jamais démasqué est « insaisissable ».
// (Pas d'images officielles : les personnages sont protégés, on utilise des cartes.)
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, gain, applyGains, awards, active, initScores } = require('./_utils');

const BOARD = 24;
const PTS = { FIND_MAX: 150, FIND_MIN: 50, PER_QUESTION: 15, ELUSIVE: 100 };
const TURNS_PER_PLAYER = 10;   // sécurité : la partie s'arrête au bout d'un moment

// [nom, série, symbole] — 158 personnages, 24 tirés au hasard à chaque partie
const CHARACTERS = [
  ['Luffy', 'One Piece', '👒'], ['Zoro', 'One Piece', '⚔️'], ['Nami', 'One Piece', '🍊'], ['Sanji', 'One Piece', '🍳'], ['Chopper', 'One Piece', '🦌'], ['Robin', 'One Piece', '🌸'], ['Usopp', 'One Piece', '🎯'], ['Ace', 'One Piece', '🔥'], ['Shanks', 'One Piece', '🍺'], ['Law', 'One Piece', '💉'], ['Boa Hancock', 'One Piece', '🐍'], ['Jinbe', 'One Piece', '🌊'], ['Franky', 'One Piece', '🤖'], ['Brook', 'One Piece', '💀'], ['Buggy', 'One Piece', '🤡'], ['Doflamingo', 'One Piece', '🦩'], ['Mihawk', 'One Piece', '🦅'],
  ['Naruto', 'Naruto', '🍥'], ['Sasuke', 'Naruto', '⚡'], ['Sakura', 'Naruto', '💪'], ['Kakashi', 'Naruto', '📖'], ['Itachi', 'Naruto', '🔴'], ['Gaara', 'Naruto', '🏜️'], ['Hinata', 'Naruto', '👁️'], ['Jiraiya', 'Naruto', '🐸'], ['Tsunade', 'Naruto', '🎰'], ['Orochimaru', 'Naruto', '🐍'], ['Minato', 'Naruto', '🟡'], ['Obito', 'Naruto', '🌀'], ['Madara', 'Naruto', '🍂'], ['Rock Lee', 'Naruto', '🥋'], ['Neji', 'Naruto', '☯️'], ['Shikamaru', 'Naruto', '♟️'], ['Pain', 'Naruto', '🌧️'],
  ['Goku', 'Dragon Ball', '☁️'], ['Vegeta', 'Dragon Ball', '👑'], ['Bulma', 'Dragon Ball', '🔧'], ['Piccolo', 'Dragon Ball', '🟢'], ['Freezer', 'Dragon Ball', '❄️'], ['Gohan', 'Dragon Ball', '📚'], ['Trunks', 'Dragon Ball', '🗡️'], ['Krillin', 'Dragon Ball', '🥚'], ['Cell', 'Dragon Ball', '🪲'], ['Majin Buu', 'Dragon Ball', '🍬'],
  ['Tanjirō', 'Demon Slayer', '🌊'], ['Nezuko', 'Demon Slayer', '🎋'], ['Zenitsu', 'Demon Slayer', '⚡'], ['Inosuke', 'Demon Slayer', '🐗'], ['Rengoku', 'Demon Slayer', '🔥'],
  ['Deku', 'My Hero Academia', '💪'], ['Bakugo', 'My Hero Academia', '💥'], ['Todoroki', 'My Hero Academia', '🧊'], ['All Might', 'My Hero Academia', '🦸'], ['Uraraka', 'My Hero Academia', '🪐'],
  ['Eren', 'L\'Attaque des Titans', '🗝️'], ['Mikasa', 'L\'Attaque des Titans', '🧣'], ['Levi', 'L\'Attaque des Titans', '🧹'], ['Armin', 'L\'Attaque des Titans', '📘'],
  ['Gojo', 'Jujutsu Kaisen', '🕶️'], ['Itadori', 'Jujutsu Kaisen', '👊'], ['Sukuna', 'Jujutsu Kaisen', '👹'], ['Megumi', 'Jujutsu Kaisen', '🐺'],
  ['Light', 'Death Note', '📓'], ['L', 'Death Note', '🍰'], ['Ryuk', 'Death Note', '🍎'],
  ['Gon', 'Hunter x Hunter', '🎣'], ['Kirua', 'Hunter x Hunter', '🛹'], ['Kurapika', 'Hunter x Hunter', '⛓️'], ['Hisoka', 'Hunter x Hunter', '🃏'],
  ['Sacha', 'Pokémon', '🧢'], ['Pikachu', 'Pokémon', '⚡'],
  ['Ichigo', 'Bleach', '🗡️'], ['Rukia', 'Bleach', '❄️'], ['Renji', 'Bleach', '🐒'], ['Byakuya', 'Bleach', '🌸'], ['Toshiro', 'Bleach', '🐉'], ['Aizen', 'Bleach', '👓'], ['Grimmjow', 'Bleach', '🐆'], ['Ulquiorra', 'Bleach', '🦇'], ['Yoruichi', 'Bleach', '🐈'], ['Kisuke', 'Bleach', '🎩'],
  ['Edward Elric', 'Fullmetal Alchemist', '🦾'], ['Alphonse Elric', 'Fullmetal Alchemist', '🛡️'],
  ['Anya', 'Spy x Family', '🥜'], ['Loid', 'Spy x Family', '🕵️'],
  ['Denji', 'Chainsaw Man', '🪚'], ['Power', 'Chainsaw Man', '😈'],
  ['Saitama', 'One Punch Man', '🥚'], ['Genos', 'One Punch Man', '🦾'], ['Tatsumaki', 'One Punch Man', '🌪️'], ['Fubuki', 'One Punch Man', '🍃'], ['Bang', 'One Punch Man', '🥋'], ['King', 'One Punch Man', '🎮'], ['Garou', 'One Punch Man', '🐺'], ['Metal Bat', 'One Punch Man', '🏏'],
  ['Asta', 'Black Clover', '⚔️'], ['Yuno', 'Black Clover', '🌪️'], ['Noelle', 'Black Clover', '💧'], ['Yami', 'Black Clover', '🌑'], ['Fuegoleon', 'Black Clover', '🦁'], ['Mereoleona', 'Black Clover', '🔥'], ['Luck', 'Black Clover', '⚡'], ['Magna', 'Black Clover', '🧨'],
  ['Senku', 'Dr. Stone', '🧪'], ['Chrome', 'Dr. Stone', '🪨'], ['Kohaku', 'Dr. Stone', '🏹'], ['Tsukasa', 'Dr. Stone', '🦴'], ['Gen', 'Dr. Stone', '🎭'], ['Suika', 'Dr. Stone', '🍉'], ['Ryusui', 'Dr. Stone', '⛵'], ['Xeno', 'Dr. Stone', '🚀'],
  ['Natsu', 'Fairy Tail', '🐉'], ['Lucy', 'Fairy Tail', '🗝️'], ['Gray', 'Fairy Tail', '🧊'], ['Erza', 'Fairy Tail', '⚔️'], ['Wendy', 'Fairy Tail', '🌬️'], ['Gajeel', 'Fairy Tail', '🔩'], ['Juvia', 'Fairy Tail', '💧'], ['Laxus', 'Fairy Tail', '⚡'],
  ['Subaru', 'Re:Zero', '🔁'], ['Emilia', 'Re:Zero', '❄️'], ['Rem', 'Re:Zero', '💙'], ['Ram', 'Re:Zero', '💗'],
  ['Meliodas', 'Seven Deadly Sins', '🐉'], ['Elizabeth', 'Seven Deadly Sins', '🌼'], ['Ban', 'Seven Deadly Sins', '🦊'], ['King', 'Seven Deadly Sins', '🧸'], ['Diane', 'Seven Deadly Sins', '🌍'], ['Gowther', 'Seven Deadly Sins', '🪞'], ['Escanor', 'Seven Deadly Sins', '☀️'],
  ['Sung Jin-Woo', 'Solo Leveling', '🗡️'], ['Cha Hae-In', 'Solo Leveling', '🌸'], ['Go Gun-Hee', 'Solo Leveling', '🏛️'], ['Beru', 'Solo Leveling', '🐜'], ['Igris', 'Solo Leveling', '🛡️'], ['Thomas Andre', 'Solo Leveling', '💪'], ['Baek Yoon-Ho', 'Solo Leveling', '🐯'], ['Choi Jong-In', 'Solo Leveling', '🔥'],
  ['Kaneki', 'Tokyo Ghoul', '🦑'], ['Touka', 'Tokyo Ghoul', '🦋'], ['Hide', 'Tokyo Ghoul', '🎧'], ['Arima', 'Tokyo Ghoul', '♠️'], ['Uta', 'Tokyo Ghoul', '🎨'], ['Ayato', 'Tokyo Ghoul', '🐰'], ['Eto', 'Tokyo Ghoul', '✒️'], ['Yoshimura', 'Tokyo Ghoul', '☕'],
  ['Thorfinn', 'Vinland Saga', '🗡️'], ['Askeladd', 'Vinland Saga', '🛡️'], ['Canute', 'Vinland Saga', '👑'], ['Einar', 'Vinland Saga', '🌾'], ['Leif', 'Vinland Saga', '⛵'], ['Hild', 'Vinland Saga', '🏹'], ['Snake', 'Vinland Saga', '🐍'], ['Bjorn', 'Vinland Saga', '🐻'],
  ['Totoro', 'Mon voisin Totoro', '🌳'],
  ['Chihiro', 'Le Voyage de Chihiro', '🛁'],
  ['Usagi', 'Sailor Moon', '🌙'],
  ['Jotaro', 'JoJo\'s Bizarre Adventure', '⭐'],
];

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['found', 'questions', 'elusive']);
  const ids = Object.keys(scores);
  const board = ctx.fresh(CHARACTERS, BOARD).map(([n, s, e]) => ({ name: n, series: s, emoji: e }));
  const picks = shuffle(board.map((_, i) => i));
  const secrets = Object.fromEntries(ids.map((id, i) => [id, picks[i]])); // un personnage différent par joueur
  const g = {
    scores, stats, board, secrets,
    order: shuffle(ids), turnIdx: 0, turns: 0, maxTurns: TURNS_PER_PLAYER * ids.length,
    found: {},              // pid → par qui il a été trouvé
    asked: {},              // "asker|target" → nombre de questions posées
    log: [],                // historique : { asker, target, q, a, guess, ok }
    oral: ctx.oral(),
    phase: 'ask', current: null,
  };
  startTurn(ctx, g, true);
  return g;
}

const alive = (g) => Object.keys(g.scores).filter((id) => !g.found[id]);
// cibles possibles pour un joueur : les autres joueurs pas encore démasqués
const targetsOf = (g, pid) => alive(g).filter((id) => id !== pid);

function startTurn(ctx, g, first = false) {
  const present = new Set(active(ctx, g).map((p) => p.id));
  if (!first) g.turnIdx++;
  // prochain joueur présent qui a encore quelqu'un à chercher
  for (let k = 0; k < g.order.length; k++) {
    const id = g.order[g.turnIdx % g.order.length];
    if (present.has(id) && targetsOf(g, id).length) break;
    g.turnIdx++;
  }
  g.current = { asker: g.order[g.turnIdx % g.order.length], target: null, q: null, a: null, guessed: false };
  g.phase = 'ask';
}

function endTurn(ctx, g) {
  g.turns++;
  if (alive(g).length <= 1 || g.turns >= g.maxTurns) return finish(ctx, g);
  startTurn(ctx, g);
}

function finish(ctx, g) {
  const gains = {};
  for (const id of alive(g)) { gain(gains, id, PTS.ELUSIVE, 'Insaisissable : jamais démasqué 🥷'); g.stats[id].elusive++; }
  applyGains(g.scores, gains);
  g.final = { gains };
  g.phase = 'end';
  g.awards = awards(g.stats, [
    ['found', 'Détective', '🔎', 'a trouvé le plus de personnages'],
    ['elusive', 'Insaisissable', '🥷', 'n\'a jamais été démasqué'],
    ['questions', 'Curieux', '❓', 'a posé le plus de questions'],
  ]);
  ctx.endGame(g.scores);
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  const c = g.current;
  if (type === 'ask') {                                // le joueur actif pose sa question
    if (g.phase !== 'ask' || pid !== c.asker) return;
    const { target, q } = payload || {};
    if (!targetsOf(g, pid).includes(target)) return { error: 'Choisis à qui tu poses la question' };
    const text = String(q || '').trim().replace(/\s+/g, ' ').slice(0, 140);
    if (!g.oral && text.length < 3) return { error: 'Écris ta question (réponse oui ou non)' };
    c.target = target; c.q = text || null;
    const k = `${pid}|${target}`;
    g.asked[k] = (g.asked[k] || 0) + 1;
    g.stats[pid].questions++;
    g.phase = 'answer';
    return;
  }
  if (type === 'answer') {                             // la cible répond
    if (g.phase !== 'answer' || pid !== c.target || !['oui', 'non', 'bof'].includes(payload)) return;
    c.a = payload;
    g.log.push({ asker: c.asker, target: c.target, q: c.q, a: c.a });
    g.phase = 'decide';
    return;
  }
  if (type === 'guess') {                              // le joueur actif tente sa chance
    if ((g.phase !== 'decide' && g.phase !== 'ask') || pid !== c.asker) return;
    const { target, card } = payload || {};
    const t = target || c.target;
    const i = Number(card);
    if (!targetsOf(g, pid).includes(t) || !Number.isInteger(i) || i < 0 || i >= g.board.length) return;
    const ok = g.secrets[t] === i;
    const gains = {};
    if (ok) {
      const n = g.asked[`${pid}|${t}`] || 0;
      const pts = Math.max(PTS.FIND_MIN, PTS.FIND_MAX - n * PTS.PER_QUESTION);
      gain(gains, pid, pts, `A trouvé ${g.board[i].name} (${n} question${n > 1 ? 's' : ''}) 🔎`);
      g.found[t] = pid;
      g.stats[pid].found++;
      applyGains(g.scores, gains);
      ctx.buzz?.(t, [200, 80, 200]);
    }
    g.log.push({ asker: pid, target: t, guess: i, ok });
    c.guessResult = { target: t, card: i, ok, gains };
    g.phase = 'guessed';
    return;
  }
  if (type === 'pass') {                               // pas de devinette : au suivant
    if (g.phase !== 'decide' || pid !== c.asker) return;
    return endTurn(ctx, g);
  }
  if (type === 'next') {
    if (g.phase === 'guessed' && (pid === c.asker || isHost)) return endTurn(ctx, g);
    if (isHost && (g.phase === 'ask' || g.phase === 'answer' || g.phase === 'decide')) return endTurn(ctx, g); // joueur absent : on passe
  }
}

function onPlayersChanged(ctx, g) {
  if (g.phase === 'ask' && !ctx.player(g.current.asker)?.connected) startTurn(ctx, g);
}

function stateFor(ctx, g, pid) {
  const over = g.phase === 'end';
  const s = {
    phase: g.phase, scores: g.scores, participants: Object.keys(g.scores), oral: g.oral,
    round: Math.min(g.turns + 1, g.maxTurns), totalRounds: g.maxTurns,
    board: g.board,
    mySecret: pid in g.scores ? g.secrets[pid] : null,            // chacun ne connaît que le sien
    current: g.current, found: g.found,
    // personnages démasqués : révélés à tous
    revealed: Object.fromEntries(Object.keys(g.found).map((id) => [id, g.secrets[id]])),
    alive: alive(g),
    myTargets: pid in g.scores ? targetsOf(g, pid) : [],
    asked: g.asked,
    log: g.log.slice(-30),
  };
  if (over) { s.secrets = g.secrets; s.final = g.final; s.awards = g.awards; }
  return s;
}

module.exports = {
  id: 'trombi',
  color: '#ff7aa8',
  name: 'Trombi manga',
  emoji: '⛩️',
  tagline: 'Pose des questions oui/non et devine le perso d\'animé des autres.',
  description: '24 personnages d\'animés au tableau, chacun en a un secret. Questions oui/non, élimination… et devinette ! Dès 2 joueurs.',
  minPlayers: 2,
  maxPlayers: 8,
  duration: '10–20 min',
  oral: true,
  create,
  onAction,
  onPlayersChanged,
  stateFor,
};
