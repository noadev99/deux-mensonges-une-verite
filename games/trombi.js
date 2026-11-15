// ─────────────────────────────────────────────────────────────────────────────
// ⛩️ Trombi manga — devine le perso d'animé, dès 2 joueurs.
// Chaque manche, un joueur passe « sur la sellette » : il choisit un personnage
// d'animé (dans la liste ou au hasard). Les autres, chacun son tour, lui posent
// une question fermée (oui / non), puis peuvent tenter leur chance en tapant
// le NOM du perso (petites fautes et surnoms connus acceptés).
// Points :
//  • celui qui trouve marque plus si le perso est peu connu et trouvé en peu de questions ;
//  • celui sur la sellette marque plus si son perso est très connu et a tenu longtemps.
// (Pas d'images officielles : les persos sont protégés, on utilise des cartes.)
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, normalize, gain, applyGains, awards, active, initScores } = require('./_utils');

const MAX_Q = 20;   // au-delà, le perso a « tenu » : la manche s'arrête

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

// Notoriété : séries très connues / connues / plus confidentielles
const SERIES_TIER = {
  'One Piece': 3, 'Naruto': 3, 'Dragon Ball': 3, 'Pokémon': 3, 'Demon Slayer': 3, "L'Attaque des Titans": 3, 'Death Note': 3,
  'My Hero Academia': 3, 'Jujutsu Kaisen': 3, 'One Punch Man': 3, 'Mon voisin Totoro': 3, 'Le Voyage de Chihiro': 3, 'Sailor Moon': 3,
  'Hunter x Hunter': 2, 'Bleach': 2, 'Fullmetal Alchemist': 2, 'Spy x Family': 2, 'Chainsaw Man': 2, "JoJo's Bizarre Adventure": 2,
  'Fairy Tail': 2, 'Tokyo Ghoul': 2, 'Black Clover': 2, 'Solo Leveling': 2,
  'Dr. Stone': 1, 'Re:Zero': 1, 'Seven Deadly Sins': 1, 'Vinland Saga': 1,
};
// Persos principaux (très connus même hors de leur série)
const STARS = new Set(['Luffy', 'Zoro', 'Nami', 'Sanji', 'Chopper', 'Ace', 'Shanks', 'Naruto', 'Sasuke', 'Sakura', 'Kakashi', 'Itachi', 'Goku', 'Vegeta', 'Bulma', 'Piccolo', 'Freezer', 'Gohan',
  'Tanjirō', 'Nezuko', 'Zenitsu', 'Inosuke', 'Deku', 'Bakugo', 'All Might', 'Eren', 'Mikasa', 'Levi', 'Gojo', 'Itadori', 'Sukuna', 'Light', 'L', 'Ryuk', 'Gon', 'Kirua', 'Sacha', 'Pikachu',
  'Saitama', 'Totoro', 'Chihiro', 'Usagi', 'Ichigo', 'Edward Elric', 'Anya', 'Denji', 'Jotaro', 'Natsu', 'Kaneki', 'Asta', 'Sung Jin-Woo', 'Senku', 'Subaru', 'Meliodas', 'Thorfinn']);
// notoriété du perso : 3 = ultra connu … 1 = pour les experts
const fameOf = ([name, series]) => {
  const t = SERIES_TIER[series] || 1;
  return STARS.has(name) ? Math.min(3, t + 1) : Math.max(1, t - 1);
};
// Surnoms et autres orthographes acceptés
const ALIASES = {
  'Luffy': ['monkey d luffy', 'mugiwara'], 'Zoro': ['roronoa zoro', 'roronoa'], 'Law': ['trafalgar law', 'trafalgar'], 'Ace': ['portgas d ace', 'portgas'],
  'Boa Hancock': ['hancock', 'boa'], 'Jinbe': ['jinbei'], 'Doflamingo': ['donquixote doflamingo'], 'Mihawk': ['dracule mihawk'],
  'Kirua': ['killua', 'killua zoldyck'], 'Sacha': ['ash', 'ash ketchum', 'satoshi'], 'Freezer': ['frieza', 'freeza', 'frieza'], 'Krillin': ['krilin', 'kuririn'],
  'Majin Buu': ['buu', 'boo', 'majin boo'], 'Deku': ['izuku', 'izuku midoriya', 'midoriya'], 'Bakugo': ['bakugou', 'katsuki', 'kacchan'],
  'Todoroki': ['shoto', 'shoto todoroki'], 'Uraraka': ['ochaco', 'ochako'], 'Tanjirō': ['tanjiro', 'tanjiro kamado'], 'Nezuko': ['nezuko kamado'],
  'Gojo': ['satoru gojo', 'satoru'], 'Itadori': ['yuji', 'yuji itadori'], 'Megumi': ['fushiguro', 'megumi fushiguro'], 'L': ['lawliet', 'ryuzaki'],
  'Light': ['light yagami', 'yagami', 'kira'], 'Eren': ['eren jaeger', 'eren yeager'], 'Levi': ['livai', 'rivaille', 'levi ackerman'], 'Mikasa': ['mikasa ackerman'],
  'Armin': ['armin arlert'], 'Edward Elric': ['edward', 'ed'], 'Alphonse Elric': ['alphonse', 'al'], 'Usagi': ['sailor moon', 'bunny', 'usagi tsukino'],
  'Jotaro': ['jotaro kujo', 'jojo'], 'Saitama': ['one punch man'], 'Pain': ['pein', 'nagato'], 'Obito': ['tobi', 'obito uchiwa'], 'Madara': ['madara uchiwa'],
  'Itachi': ['itachi uchiwa'], 'Sasuke': ['sasuke uchiwa'], 'Naruto': ['naruto uzumaki'], 'Minato': ['minato namikaze'], 'Rock Lee': ['lee'],
  'Ichigo': ['ichigo kurosaki'], 'Toshiro': ['hitsugaya', 'toshiro hitsugaya'], 'Kisuke': ['urahara', 'kisuke urahara'], 'Aizen': ['sosuke aizen'],
  'Sung Jin-Woo': ['jin woo', 'jinwoo', 'sung jinwoo'], 'Cha Hae-In': ['cha haein', 'hae in'], 'Thomas Andre': ['thomas'], 'Baek Yoon-Ho': ['baek'], 'Choi Jong-In': ['choi'],
  'Go Gun-Hee': ['go gunhee'], 'Kaneki': ['ken kaneki'], 'Loid': ['loid forger', 'twilight'], 'Anya': ['anya forger'], 'Gon': ['gon freecss'],
  'Kurapika': ['kurapika kurta'], 'Senku': ['senku ishigami'], 'Natsu': ['natsu dragneel'], 'Erza': ['erza scarlet'], 'Lucy': ['lucy heartfilia'],
  'Asta': [], 'Meliodas': [], 'Escanor': [], 'Thorfinn': ['thorfinn karlsefni'], 'All Might': ['allmight', 'toshinori yagi'], 'Tatsumaki': ['tornado'], 'Garou': [],
};
const POOL = CHARACTERS.map((c, i) => ({ i, name: c[0], series: c[1], emoji: c[2], fame: fameOf(c) }));
const lev = (a, b) => {
  const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9;
  const d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
};
const clean = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// le nom tapé correspond-il au perso secret ? (nom, morceau unique du nom, surnom, 1 faute permise)
function matches(typed, c) {
  const t = clean(typed); if (!t) return false;
  const names = [c.name, ...(ALIASES[c.name] || [])].map(clean);
  for (const w of clean(c.name).split(' ')) if (w.length >= 4 && !POOL.some((o) => o !== c && clean(o.name).split(' ').includes(w))) names.push(w);
  return names.some((n) => n === t || n.replace(/ /g, '') === t.replace(/ /g, '') || (n.length >= 5 && lev(n.replace(/ /g, ''), t.replace(/ /g, '')) <= 1));
}

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['found', 'resisted', 'questions']);
  const ids = shuffle(Object.keys(scores));
  const g = { scores, stats, seats: ids.length === 2 ? [...ids, ...ids] : ids, round: 0, oral: ctx.oral() };
  // soirée enchaînée : moins de manches (à 2 joueurs, on garde un nombre pair pour l'équité)
  let n = ctx.rounds(g.seats.length);
  if (ids.length === 2 && n % 2) n = Math.max(2, n - 1);
  g.seats = g.seats.slice(0, n);
  g.totalRounds = g.seats.length;
  newRound(ctx, g);
  return g;
}

function newRound(ctx, g) {
  g.round++;
  g.hot = g.seats[g.round - 1];
  g.secret = null;
  g.questions = 0;
  g.log = [];
  g.askers = shuffle(Object.keys(g.scores).filter((id) => id !== g.hot));
  g.askIdx = -1;
  g.current = null;
  g.result = null;
  g.phase = 'choose';
  if (!ctx.player(g.hot)?.connected) g.secret = Math.floor(Math.random() * POOL.length); // absent : perso au hasard
  if (g.secret != null) nextAsker(ctx, g);
}

function nextAsker(ctx, g) {
  const present = new Set(active(ctx, g).map((p) => p.id));
  for (let k = 0; k < g.askers.length; k++) {
    g.askIdx = (g.askIdx + 1) % g.askers.length;
    if (present.has(g.askers[g.askIdx])) break;
  }
  g.current = { asker: g.askers[g.askIdx], q: null, a: null };
  g.phase = 'ask';
}

function finishRound(ctx, g, finder) {
  const c = POOL[g.secret];
  const q = g.questions;
  const gains = {};
  if (finder) {
    const rare = { 3: 1, 2: 1.3, 1: 1.6 }[c.fame];
    gain(gains, finder, Math.round(Math.max(30, 130 - 8 * q) * rare), `A trouvé ${c.name} en ${q} question${q > 1 ? 's' : ''} 🔎`);
    g.stats[finder].found++;
  }
  const famous = { 3: 1.6, 2: 1.3, 1: 1 }[c.fame];
  const held = Math.round(q * 8 * famous) + (finder ? 0 : 50);
  if (held) gain(gains, g.hot, held, finder ? `A tenu ${q} question${q > 1 ? 's' : ''} avec ${c.name} 🛡️` : `Jamais trouvé : ${c.name} a tenu ${q} questions 🥷`);
  g.stats[g.hot].resisted += q;
  applyGains(g.scores, gains);
  g.result = { finder: finder || null, questions: q, gains, char: c };
  g.phase = 'reveal';
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  const c = g.current;
  if (type === 'choose') {
    if (g.phase !== 'choose' || pid !== g.hot) return;
    const i = payload === 'random' ? Math.floor(Math.random() * POOL.length) : Number(payload);
    if (!Number.isInteger(i) || !POOL[i]) return;
    g.secret = i;
    return nextAsker(ctx, g);
  }
  if (type === 'ask') {
    if (g.phase !== 'ask' || pid !== c.asker) return;
    const text = String(payload || '').trim().replace(/\s+/g, ' ').slice(0, 140);
    if (!g.oral && text.length < 3) return { error: 'Écris ta question (réponse oui ou non)' };
    c.q = text || null;
    g.questions++;
    g.stats[pid].questions++;
    g.phase = 'answer';
    return;
  }
  if (type === 'answer') {
    if (g.phase !== 'answer' || pid !== g.hot || !['oui', 'non', 'bof'].includes(payload)) return;
    c.a = payload;
    g.log.push({ kind: 'q', asker: c.asker, q: c.q, a: c.a });
    g.phase = 'decide';
    return;
  }
  if (type === 'guess') {                       // on tape le nom du perso
    if ((g.phase !== 'decide' && g.phase !== 'ask') || pid !== c.asker) return;
    const typed = String(payload || '').trim().slice(0, 40);
    if (!typed) return { error: 'Tape le nom du perso' };
    const ok = matches(typed, POOL[g.secret]);
    g.log.push({ kind: 'g', asker: pid, guess: typed, ok });
    if (ok) return finishRound(ctx, g, pid);
    if (g.questions >= MAX_Q) return finishRound(ctx, g, null);
    return nextAsker(ctx, g);
  }
  if (type === 'pass') {
    if (g.phase !== 'decide' || pid !== c.asker) return;
    if (g.questions >= MAX_Q) return finishRound(ctx, g, null);
    return nextAsker(ctx, g);
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'choose') { g.secret = Math.floor(Math.random() * POOL.length); return nextAsker(ctx, g); } // joueur absent
    if (g.phase === 'ask' || g.phase === 'decide') return g.questions >= MAX_Q ? finishRound(ctx, g, null) : nextAsker(ctx, g);
    if (g.phase === 'answer') { c.a = 'bof'; g.log.push({ kind: 'q', asker: c.asker, q: c.q, a: 'bof' }); return nextAsker(ctx, g); }
    if (g.phase === 'reveal') {
      if (g.round >= g.totalRounds) {
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['found', 'Détective', '🔎', 'a trouvé le plus de persos'],
          ['resisted', 'Mur', '🛡️', 'a tenu le plus de questions sur la sellette'],
          ['questions', 'Curieux', '❓', 'a posé le plus de questions'],
        ]);
        ctx.endGame(g.scores);
      } else newRound(ctx, g);
    }
  }
}

function onPlayersChanged(ctx, g) {
  if (g.phase === 'ask' && !ctx.player(g.current.asker)?.connected) nextAsker(ctx, g);
}

function stateFor(ctx, g, pid) {
  const hot = pid === g.hot;
  const s = {
    phase: g.phase, round: g.round, totalRounds: g.totalRounds, scores: g.scores, participants: Object.keys(g.scores), oral: g.oral,
    hot: g.hot, questions: g.questions, maxQ: MAX_Q, current: g.current, log: g.log,
    // la liste des persos n'est envoyée qu'à celui qui choisit
    pool: g.phase === 'choose' && hot ? POOL : null,
    mine: hot && g.secret != null ? POOL[g.secret] : null,
  };
  if (g.phase === 'reveal') s.result = g.result;
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'trombi',
  color: '#ff7aa8',
  name: 'Trombi manga',
  emoji: '⛩️',
  tagline: 'Choisis un perso d\'animé, les autres doivent deviner son nom.',
  description: 'Un joueur choisit un perso parmi 158 (ou au hasard), les autres posent des questions oui/non et tapent le nom pour gagner. Dès 2 joueurs.',
  minPlayers: 2,
  maxPlayers: 10,
  duration: '15–25 min',
  oral: true,
  create,
  onAction,
  onPlayersChanged,
  stateFor,
  _test: { matches, POOL }, // pour les tests
};
