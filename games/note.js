// ─────────────────────────────────────────────────────────────────────────────
// 🎚️ Note secrète
// Chaque joueur reçoit un thème (« Raconte un rendez-vous amoureux ») et une
// note secrète de 0 à 10 sur une échelle (Catastrophe → Parfait).
// Il écrit une histoire qui « vaut » exactement cette note.
// Puis, histoire par histoire, les autres devinent la note.
// Mode « Interrogatoire » : à tour de rôle, un joueur reçoit une note secrète
// (ex. « Ta puissance : 7/10 »). Les autres lui posent chacun 2 questions
// (« Si tu étais une technique de Naruto ? ») et il répond selon sa note.
// Dans les deux modes, on choisit une note puis on la valide (modifiable
// jusqu'à la révélation) : on révèle quand tout le monde a validé.
// ─────────────────────────────────────────────────────────────────────────────
const PLUS = require('./contenu-plus');
const { shuffle, sample, gain, applyGains, awards, active, initScores } = require('./_utils');

const MAX_ROUNDS = 10;
const TIME = { write: 240000, guess: 75000, oral: 150000, gril: 300000 }; // à l'oral : le temps de raconter + voter
const MAX_ASK = 2; // questions par joueur en mode Interrogatoire
// points selon l'écart entre la note devinée et la vraie
const PTS = { 0: 100, 1: 60, 2: 30 };

// Thème Animé / Manga : « si tu étais un personnage… »
const ANIME = [
  ['Si tu étais un pirate dans One Piece, décris ton fruit du démon', 'Nul', 'Surpuissant'],
  ['Décris ta prime de pirate et comment tu l\'as obtenue', 'Quelques pièces', 'Prime record'],
  ['Décris ton équipage pirate', 'Bande de bras cassés', 'Équipage d\'Empereur'],
  ['Décris ta technique secrète de ninja (Naruto)', 'Ridicule', 'Légendaire'],
  ['Raconte ton examen pour devenir ninja', 'Recalé direct', 'Major de la promo'],
  ['Décris ta transformation façon Dragon Ball', 'Petit boost', 'Puissance divine'],
  ['Raconte ton tournoi d\'arts martiaux', 'Éliminé au 1er tour', 'Champion'],
  ['Raconte ton premier combat contre un démon (Demon Slayer)', 'Défaite humiliante', 'Victoire épique'],
  ['Décris ton Alter (My Hero Academia)', 'Inutile', 'Héros n°1'],
  ['Raconte ta première mission dans le Bataillon d\'exploration (L\'Attaque des Titans)', 'Panique totale', 'Héros de l\'humanité'],
  ['Décris ton équipe Pokémon', 'Équipe de débutant', 'Équipe de champion'],
  ['Raconte ton examen de Hunter (Hunter x Hunter)', 'Éliminé direct', 'Hunter légendaire'],
  ['Décris ta technique d\'exorcisme (Jujutsu Kaisen)', '4ᵉ classe', 'Classe spéciale'],
  ['Si tu trouvais un Death Note, raconte ce que tu ferais', 'Gentil', 'Machiavélique'],
  ['Raconte ton arrivée dans un autre monde (isekai)', 'Mort au bout de 5 min', 'Roi du nouveau monde'],
  ['Décris ton rival d\'anime', 'Pas menaçant du tout', 'Ennemi ultime'],
  ['Raconte ton entraînement avec un vieux maître', 'Abandon le 1er jour', 'Disciple prodige'],
  ['Décris ton cri d\'attaque spéciale', 'Gênant', 'Iconique'],
  ['Raconte ton combat final contre le grand méchant', 'Écrasé', 'Victoire légendaire'],
  ['Décris l\'opening de l\'anime de ta vie', 'Raté', 'Culte'],
  ['Décris ton robot géant', 'Tas de ferraille', 'Machine ultime'],
  ['Raconte ta scène de flashback tragique', 'Pas triste du tout', 'Tout le monde pleure'],
  ['Décris ton pouvoir de héros de shōnen', 'Pouvoir inutile', 'Pouvoir cheaté'],
  ['Décris ta créature magique de compagnie', 'Ridicule', 'Terrifiante'],
  ['Raconte ton arc d\'entraînement dans la montagne', 'Vacances', 'Transformation totale'],
  ['Décris ton uniforme de héros', 'Pyjama', 'Tenue légendaire'],
  ['Raconte comment tu sauves tes amis au dernier moment', 'Trop tard', 'Entrée mythique'],
  ['Décris ton école de magie / académie de héros', 'École pourrie', 'Académie d\'élite'],
];

const PROMPTS = [
  ['Raconte un rendez-vous amoureux', 'Catastrophe', 'Parfait'],
  ['Raconte ton dernier repas au resto', 'Immangeable', 'Délicieux'],
  ['Raconte une soirée entre amis', 'Ennui total', 'Soirée de l\'année'],
  ['Raconte un voyage en avion', 'Cauchemar', 'Rêve'],
  ['Raconte ton premier jour dans un nouveau travail', 'Horrible', 'Génial'],
  ['Raconte un film que tu as vu', 'Navet', 'Chef-d\'œuvre'],
  ['Raconte une rencontre avec une célébrité', 'Gênante', 'Incroyable'],
  ['Raconte tes dernières vacances', 'Désastre', 'Paradis'],
  ['Raconte un cadeau que tu as reçu', 'Nul', 'Parfait'],
  ['Raconte un réveil un matin', 'Infernal', 'Merveilleux'],
  ['Décris ton voisin', 'Insupportable', 'Adorable'],
  ['Raconte une dispute', 'Minuscule', 'Énorme'],
  ['Raconte un plat que tu as cuisiné', 'Raté', 'Digne d\'un chef'],
  ['Raconte un entretien d\'embauche', 'Raté', 'Parfait'],
  ['Raconte une blague que tu as faite', 'Gros flop', 'Fou rire général'],
  ['Raconte une fête d\'anniversaire', 'Triste', 'Mémorable'],
  ['Décris ton niveau en danse', 'Pied de plomb', 'Danseur pro'],
  ['Raconte un trajet en transports', 'Galère', 'Tranquille'],
  ['Raconte une surprise qu\'on t\'a faite', 'Ratée', 'Réussie'],
  ['Raconte un concert', 'Horrible', 'Inoubliable'],
  ['Raconte une nuit de sommeil', 'Nuit blanche', 'Nuit parfaite'],
  ['Raconte une rencontre avec un animal', 'Terrifiante', 'Adorable'],
  ['Raconte un moment gênant en public', 'Petite gêne', 'Honte absolue'],
  ['Raconte un week-end en camping', 'Calvaire', 'Génial'],
  ['Raconte une soirée karaoké', 'Massacre', 'Star du micro'],
  ['Raconte un examen', 'Catastrophe', 'Major de promo'],
  ['Raconte une coupe de cheveux', 'Ratée', 'Sublime'],
  ['Raconte un repas de famille', 'Tendu', 'Parfait'],
  ['Raconte une séance de sport', 'Abandon', 'Record battu'],
  ['Raconte un premier message envoyé à un crush', 'Gênant', 'Irrésistible'],
];

// Histoires : thèmes classiques et animé mélangés
const HISTOIRES = [...PROMPTS, ...PLUS.NOTE, ...ANIME, ...PLUS.NOTE_ANIME];

// Interrogatoire : [ce qui est noté, note 0, note 10]
const GRIL = [
  ['Ta puissance', 'Ridicule', 'Invincible'], ['Ta méchanceté', 'Gentil comme tout', 'Grand méchant'],
  ['Ton intelligence', 'Pas très malin', 'Génie'], ['Ton courage', 'Froussard', 'Héros sans peur'],
  ['Ton charisme', 'Transparent', 'Leader né'], ['Ta richesse', 'Fauché', 'Milliardaire'],
  ['Ta célébrité', 'Inconnu', 'Légende vivante'], ['Ta vitesse', 'Escargot', 'Éclair'],
  ['Ta loyauté', 'Traître', 'Fidèle jusqu\'à la mort'], ['Ton humour', 'Sinistre', 'Clown absolu'],
  ['Ton style', 'Ringard', 'Ultra stylé'], ['Ton sens de l\'orientation', 'Perdu comme Zoro', 'GPS humain'],
  ['Ta chance', 'Maudit', 'Béni des dieux'], ['Ton appétit', 'Mange comme un oiseau', 'Estomac sans fond'],
  ['Ton calme', 'Explosif', 'Zen absolu'], ['Ta force physique', 'Brindille', 'Montagne de muscles'],
  ['Ton côté romantique', 'Cœur de pierre', 'Grand romantique'], ['Ta discrétion', 'Éléphant', 'Ninja de l\'ombre'],
  ['Ta paresse', 'Hyperactif', 'Roi de la sieste'], ['Ta folie', 'Très raisonnable', 'Complètement fou'],
];

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['exact', 'close', 'readable']);
  const ids = Object.keys(scores);
  const mode = ctx.option('mode') === 'gril' ? 'gril' : 'histoire';
  const prompts = ctx.fresh(mode === 'gril' ? GRIL : HISTOIRES, ids.length);
  const tasks = {};
  let last = -1;
  ids.forEach((id, i) => {
    let n;
    do n = Math.floor(Math.random() * 11); while (n === last); // varie les notes
    last = n;
    const [q, low, high] = prompts[i % prompts.length];
    tasks[id] = { q, low, high, number: n };
  });
  const g = { maxRounds: ctx.rounds(MAX_ROUNDS), scores, stats, tasks, mode, stories: {}, order: [], round: 0, guesses: {}, locked: {}, qa: [], oral: ctx.oral() };
  if (mode === 'gril') {
    // chacun passe à son tour sur le gril
    g.order = shuffle(ids).slice(0, g.maxRounds);
    startRound(ctx, g, 0);
  } else if (g.oral) {
    // à l'oral : pas d'écriture, chacun raconte à son tour à voix haute
    g.order = shuffle(ids).slice(0, g.maxRounds);
    startRound(ctx, g, 0);
  } else setPhase(ctx, g, 'write', TIME.write, () => { if (Object.keys(g.stories).length) startRounds(ctx, g); });
  return g;
}

function setPhase(ctx, g, phase, ms, onTimeout) {
  g.phase = phase;
  g.deadline = ms ? Date.now() + ms : null;
  if (!ms) return;
  const stamp = (g.stamp = (g.stamp || 0) + 1);
  setImmediate(() => ctx.schedule(ms + 1000, () => { if (g.stamp === stamp) onTimeout(); }));
}

function startRounds(ctx, g) {
  g.order = shuffle(Object.keys(g.stories)).slice(0, g.maxRounds);
  startRound(ctx, g, 0);
}

function startRound(ctx, g, i) {
  g.round = i;
  g.guesses = {};
  g.locked = {}; // notes validées (modifiables jusqu'à la révélation)
  g.qa = [];     // Interrogatoire : [{ from, q, a }]
  g.result = null;
  setPhase(ctx, g, 'guess', g.mode === 'gril' ? TIME.gril : g.oral ? TIME.oral : TIME.guess, () => reveal(ctx, g));
}

const authorOf = (g) => g.order[g.round];

function reveal(ctx, g) {
  const author = authorOf(g);
  const truth = g.tasks[author].number;
  const gains = {};
  const earned = [];
  for (const [pid, n] of Object.entries(g.guesses)) {
    const d = Math.abs(n - truth);
    const pts = PTS[d] || 0;
    earned.push(pts);
    if (d === 0) { gain(gains, pid, pts, 'Dans le mille ! 🎯'); g.stats[pid].exact++; }
    else if (pts) { gain(gains, pid, pts, `À ${d} près 👌`); g.stats[pid].close++; }
  }
  // l'auteur gagne la moyenne des points des autres : plus son histoire est « lisible », plus il marque
  const avg = earned.length ? Math.round(earned.reduce((a, b) => a + b, 0) / earned.length) : 0;
  if (avg) { gain(gains, author, avg, g.mode === 'gril' ? 'Réponses bien dosées : la moyenne des autres 🔥' : 'Histoire bien dosée : la moyenne des autres ✍️'); g.stats[author].readable += avg; }
  applyGains(g.scores, gains);
  g.result = { gains, truth };
  setPhase(ctx, g, 'reveal');
}

const pendingQuestions = (g) => (g.mode === 'gril' && !g.oral ? g.qa.filter((x) => x.a == null).length : 0);
const NOTE_RE = /\b(10|[0-9])\s*(\/|sur)\s*10\b/i;

function autoAdvance(ctx, g) {
  const act = active(ctx, g);
  if (!act.length) return;
  if (g.phase === 'write' && act.every((p) => p.id in g.stories)) startRounds(ctx, g);
  else if (g.phase === 'guess') {
    const voters = act.filter((p) => p.id !== authorOf(g));
    // on attend que chacun ait VALIDÉ sa note (et, à l'écrit, que toutes les questions aient une réponse)
    if (voters.length && voters.every((p) => g.locked[p.id] && p.id in g.guesses) && !pendingQuestions(g)) reveal(ctx, g);
  }
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };

  if (type === 'story') {
    if (g.phase !== 'write') return;
    const text = String(payload || '').trim().replace(/\s+/g, ' ').slice(0, 320);
    if (text.length < 10) return { error: 'Écris une vraie petite histoire 😉' };
    if (NOTE_RE.test(text)) return { error: 'Interdit de donner ta note dans l\'histoire 😏' };
    g.stories[pid] = text;
    return autoAdvance(ctx, g);
  }
  if (type === 'edit') { if (g.phase === 'write') delete g.stories[pid]; return; }

  if (type === 'guess') {
    const n = Number(payload);
    if (g.phase !== 'guess' || pid === authorOf(g) || !Number.isInteger(n) || n < 0 || n > 10) return;
    if (g.locked[pid]) return { error: 'Touche « Changer » pour modifier ta note' };
    g.guesses[pid] = n; // simple hypothèse : il faut encore la valider
    return;
  }
  if (type === 'lock') {
    if (g.phase !== 'guess' || pid === authorOf(g) || !(pid in g.guesses)) return;
    g.locked[pid] = true;
    return autoAdvance(ctx, g);
  }
  if (type === 'unlock') { if (g.phase === 'guess') delete g.locked[pid]; return; }

  // Interrogatoire : poser une question (2 par joueur) / y répondre
  if (type === 'ask') {
    if (g.mode !== 'gril' || g.phase !== 'guess' || pid === authorOf(g)) return;
    if (g.qa.filter((x) => x.from === pid).length >= MAX_ASK) return { error: `Tu as déjà posé tes ${MAX_ASK} questions` };
    const q = String(payload || '').trim().replace(/\s+/g, ' ').slice(0, 140);
    if (!g.oral && q.length < 3) return { error: 'Écris ta question' };
    g.qa.push({ from: pid, q: q || null, a: null });
    return;
  }
  if (type === 'reply') {
    if (g.mode !== 'gril' || g.oral || g.phase !== 'guess' || pid !== authorOf(g)) return;
    const { i, text } = payload || {};
    const item = g.qa[i];
    if (!item || item.a != null) return;
    const a = String(text || '').trim().replace(/\s+/g, ' ').slice(0, 200);
    if (a.length < 1) return { error: 'Écris ta réponse' };
    if (NOTE_RE.test(a)) return { error: 'Interdit de donner ta note 😏' };
    item.a = a;
    return autoAdvance(ctx, g);
  }

  if (type === 'next' && isHost) {
    if (g.phase === 'write') {
      if (!Object.keys(g.stories).length) return { error: 'Personne n\'a encore écrit' };
      startRounds(ctx, g);
    } else if (g.phase === 'guess') reveal(ctx, g);
    else if (g.phase === 'reveal') {
      if (g.round + 1 >= g.order.length) {
        setPhase(ctx, g, 'end');
        g.awards = awards(g.stats, [
          ['exact', 'Télépathe', '🎯', 'a trouvé la note exacte le plus souvent'],
          ['close', 'Pas loin', '👌', 'a été tout près le plus souvent'],
          ['readable', 'Conteur', '✍️', 'a écrit les histoires les mieux dosées'],
        ]);
        ctx.endGame(g.scores);
      } else startRound(ctx, g, g.round + 1);
    }
  }
}

function stateFor(ctx, g, pid) {
  const act = active(ctx, g);
  const s = {
    phase: g.phase, scores: g.scores, participants: Object.keys(g.scores),
    remaining: g.deadline ? Math.max(0, g.deadline - Date.now()) : 0,
    round: g.round + 1, totalRounds: g.order.length,
  };
  if (g.phase === 'write') {
    s.myTask = g.tasks[pid] || null;
    s.myStory = g.stories[pid] ?? null;
    s.written = Object.keys(g.stories);
  }
  if (g.phase === 'guess' || g.phase === 'reveal') {
    const author = authorOf(g);
    const t = g.tasks[author];
    s.current = { authorId: author, isAuthor: author === pid, q: t.q, low: t.low, high: t.high, story: g.stories[author] ?? null };
    s.oral = g.oral;
    s.mode = g.mode;
    s.qa = g.qa;
    s.maxAsk = MAX_ASK;
    s.myAsked = g.qa.filter((x) => x.from === pid).length;
    s.pending = pendingQuestions(g);
    if (author === pid || g.phase === 'reveal') s.current.number = t.number;
    if (g.phase === 'guess') {
      const voters = act.filter((p) => p.id !== author);
      s.myGuess = g.guesses[pid] ?? null;
      s.myLocked = !!g.locked[pid];
      s.guessed = voters.filter((p) => g.locked[p.id] && p.id in g.guesses).map((p) => p.id); // notes validées
      s.needed = voters.length;
    } else {
      s.guesses = g.guesses;
      s.result = g.result;
    }
  }
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'note',
  color: '#9be15d',
  name: 'Note secrète',
  emoji: '🎚️',
  tagline: 'Raconte (ou réponds) pile à la hauteur de ta note.',
  description: 'Une note secrète de 0 à 10 : une histoire à doser, ou un interrogatoire où tu réponds selon ta note. Les autres devinent.',
  minPlayers: 3,
  maxPlayers: 12,
  duration: '15–25 min',
  oral: true, // version « on raconte à voix haute »
  // thème des histoires, choisi par l'hôte dans le salon
  options: [{
    key: 'mode', label: 'Mode', default: 'histoire',
    choices: [
      { value: 'histoire', label: 'Histoires ✍️', hint: 'Une histoire à doser : rendez-vous, vacances… et thèmes animé (One Piece, Naruto…)' },
      { value: 'gril', label: 'Interrogatoire 🔥', hint: 'Un joueur reçoit une note (ex. sa puissance), les autres lui posent 2 questions chacun : « Si tu étais une technique de Naruto ? »' },
    ],
  }],
  create,
  onAction,
  onPlayersChanged: autoAdvance,
  stateFor,
};
