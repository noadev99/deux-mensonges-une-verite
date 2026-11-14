// ─────────────────────────────────────────────────────────────────────────────
// 📖 Le Dico des menteurs
// Un vrai mot rare s'affiche. Chacun invente une fausse définition. Toutes sont
// mélangées avec la vraie : trouve la bonne, et piège les autres avec la tienne.
// ─────────────────────────────────────────────────────────────────────────────
const { packOption, byPack, shuffle, sample, gain, applyGains, awards, active, initScores } = require('./_utils');
const ANIME = require('./packs-anime');
const PLUS = require('./contenu-plus');


const ROUNDS = 5;
const PTS = { FOUND: 100, FOOLED: 50 };

const ENTRIES = [
  ['Callipyge', 'Qui a de belles fesses.'],
  ['Pétrichor', "Odeur caractéristique de la terre sèche après la pluie."],
  ['Ripisylve', "Ensemble des arbres et de la végétation qui bordent un cours d'eau."],
  ['Apophtegme', 'Parole mémorable, maxime exprimée de façon concise.'],
  ['Pandiculation', "Action de s'étirer les bras et les jambes, souvent en bâillant."],
  ['Borborygme', "Bruit produit par les gaz qui se déplacent dans l'intestin."],
  ['Hypocoristique', 'Mot ou surnom qui exprime une intention affectueuse (ex. : « mon chou »).'],
  ['Coquecigrue', 'Chose absurde, baliverne.'],
  ['Zinzinuler', 'Chanter, en parlant de la mésange.'],
  ['Atrabilaire', "D'humeur sombre, facilement irritable."],
  ['Paréidolie', "Fait de percevoir une forme familière (un visage…) dans un objet ou un nuage."],
  ['Nyctalope', "Qui voit dans l'obscurité."],
  ['Thuriféraire', "Personne qui porte l'encensoir ; par extension, flatteur zélé."],
  ['Cacochyme', "D'une santé faible et chancelante."],
  ['Galimatias', 'Discours embrouillé et incompréhensible.'],
  ['Pusillanime', 'Qui manque de courage, craint de prendre des risques.'],
  ['Ataraxie', "Tranquillité de l'âme, absence de trouble."],
  ['Chafouin', "Qui a une mine rusée et sournoise."],
  ['Hapax', "Mot ou expression dont on ne connaît qu'une seule occurrence."],
  ['Logorrhée', 'Flot de paroles excessif et incontrôlé.'],
  ['Sycophante', 'Délateur, dénonciateur.'],
  ['Turpitude', 'Conduite ou action honteuse, indigne.'],
  ['Vespéral', 'Qui se rapporte au soir.'],
  ['Bisbille', 'Petite querelle pour des motifs futiles.'],
  ['Escarcelle', "Grande bourse qu'on portait suspendue à la ceinture."],
  ['Fanfreluche', 'Ornement léger de toilette (ruban, dentelle, pompon…).'],
  ['Lambrequin', "Bordure d'étoffe ou de bois découpée qui décore le haut d'une fenêtre ou d'un dais."],
  ['Palinodie', "Changement brusque et complet d'opinion."],
  ['Rhinotillexomanie', 'Habitude compulsive de se mettre les doigts dans le nez.'],
  ['Uchronie', "Récit qui réécrit l'Histoire à partir d'un événement qui se serait passé autrement."],
  ['Billevesée', 'Idée creuse, propos vide de sens.'],
  ['Calembredaine', 'Propos extravagant, plaisanterie sans valeur.'],
  ['Esbroufe', 'Étalage de manières prétentieuses pour impressionner.'],
  ['Godelureau', 'Jeune homme qui fait le joli cœur auprès des femmes.'],
  ['Jactance', "Attitude d'une personne qui se vante."],
  ['Margoulin', 'Commerçant ou homme d\'affaires peu scrupuleux.'],
  ['Pétaudière', 'Assemblée ou lieu où règnent la confusion et le désordre.'],
  ['Mirliflore', 'Jeune élégant, content de lui.'],
  ['Omphaloscopie', 'Fait de contempler son nombril ; par extension, égocentrisme.'],
  ['Apocope', "Suppression d'une ou plusieurs syllabes à la fin d'un mot (ex. : « ciné » pour « cinéma »)."],
  ['Pignocher', 'Manger sans appétit, du bout des dents.'],
  ['Brimborion', 'Petit objet de peu de valeur.'],
  ['Croquignolet', 'Mignon, charmant (familier).'],
  ['Emberlificoter', 'Embrouiller quelqu\'un pour le tromper.'],
  ['Vitupérer', 'Blâmer violemment, protester avec vigueur.'],
  ['Trichotillomanie', "Besoin compulsif de s'arracher les cheveux ou les poils."],
  ['Faribole', 'Propos frivole, sans valeur.'],
  ['Vétille', 'Chose insignifiante, détail sans importance.'],
];

const ALL = [...ENTRIES, ...PLUS.DICO];
const ALL_ANIME = [...ANIME.ENTRIES, ...PLUS.DICO_ANIME];

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['found', 'fooled']);
  const g = { scores, stats, round: 0, totalRounds: ROUNDS, entries: ctx.fresh(byPack(ctx, ALL, ALL_ANIME), ROUNDS) };
  newRound(g);
  return g;
}

function newRound(g) {
  g.round++;
  const [word, def] = g.entries[g.round - 1];
  g.word = word;
  g.realDef = def;
  g.defs = {};
  g.options = null;
  g.votes = {};
  g.result = null;
  g.phase = 'write';
}

function startVote(g) {
  g.options = shuffle([
    { author: null, text: g.realDef },
    ...Object.entries(g.defs).map(([author, text]) => ({ author, text })),
  ]);
  g.phase = 'vote';
}

function reveal(ctx, g) {
  const gains = {};
  for (const [voter, idx] of Object.entries(g.votes)) {
    const opt = g.options[idx];
    if (!opt) continue;
    if (opt.author === null) { gain(gains, voter, PTS.FOUND, 'A trouvé la vraie définition 📚'); g.stats[voter].found++; }
    else if (opt.author !== voter) {
      gain(gains, opt.author, PTS.FOOLED, `A piégé ${ctx.player(voter)?.name ?? '?'} 🪤`);
      g.stats[opt.author].fooled++;
    }
  }
  applyGains(g.scores, gains);
  g.result = { gains };
  g.phase = 'reveal';
}

// joueurs qui doivent voter : connectés, et il existe au moins une option qui n'est pas la leur
const voters = (ctx, g) => active(ctx, g);

function autoAdvance(ctx, g) {
  const act = active(ctx, g);
  if (g.phase === 'write' && act.length && act.every((p) => p.id in g.defs)) startVote(g);
  else if (g.phase === 'vote' && voters(ctx, g).every((p) => p.id in g.votes)) reveal(ctx, g);
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  if (type === 'define') {
    if (g.phase !== 'write') return;
    const text = String(payload || '').trim().replace(/\s+/g, ' ').slice(0, 200);
    if (text.length < 5) return { error: 'Écris une vraie définition 😉' };
    g.defs[pid] = text.charAt(0).toUpperCase() + text.slice(1) + (/[.!?…]$/.test(text) ? '' : '.');
    return autoAdvance(ctx, g);
  }
  if (type === 'edit') {
    if (g.phase === 'write') delete g.defs[pid];
    return;
  }
  if (type === 'vote') {
    if (g.phase !== 'vote') return;
    const opt = g.options[payload];
    if (!opt || opt.author === pid) return;
    g.votes[pid] = payload;
    return autoAdvance(ctx, g);
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'write') {
      if (!Object.keys(g.defs).length) return { error: 'Personne n\'a encore écrit' };
      startVote(g);
    } else if (g.phase === 'vote') reveal(ctx, g);
    else if (g.phase === 'reveal') {
      if (g.round >= g.totalRounds) {
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['found', 'Académicien', '📚', 'a trouvé le plus de vraies définitions'],
          ['fooled', 'Grand Bluffeur', '🪤', 'a piégé le plus de joueurs'],
        ]);
        ctx.endGame(g.scores);
      } else newRound(g);
    }
  }
}

function stateFor(ctx, g, pid) {
  const act = active(ctx, g);
  const s = {
    phase: g.phase, round: g.round, totalRounds: g.totalRounds, scores: g.scores,
    participants: Object.keys(g.scores),
    word: g.word,
    myDef: g.defs[pid] ?? null,
    written: Object.keys(g.defs),
    needed: act.length,
  };
  if (g.phase === 'vote') {
    s.options = g.options.map((o) => ({ text: o.text, mine: o.author === pid }));
    s.myVote = g.votes[pid] ?? null;
    s.voted = act.filter((p) => p.id in g.votes).map((p) => p.id);
  }
  if (g.phase === 'reveal') {
    s.options = g.options.map((o, i) => ({
      text: o.text, author: o.author, real: o.author === null,
      voters: Object.keys(g.votes).filter((v) => g.votes[v] === i),
    }));
    s.result = g.result;
  }
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'dico',
  color: '#6d8bff',
  name: 'Le Dico des menteurs',
  emoji: '📖',
  tagline: 'Invente une fausse définition, trouve la vraie.',
  description: 'Un vrai mot rare, des définitions inventées par tout le monde : trouve la vraie et piège les autres.',
  minPlayers: 3,
  maxPlayers: 12,
  duration: '15 min',
  options: [packOption('Mots rares de la langue française', 'Vrais mots japonais : tsundere, senpai…')],
  create,
  onAction,
  onPlayersChanged: autoAdvance,
  stateFor,
};
