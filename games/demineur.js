// ─────────────────────────────────────────────────────────────────────────────
// 💣 Le Démineur collectif — jeu en équipe contre la montre.
// Une bombe (sur la télé et sur chaque téléphone) porte plusieurs modules.
// Le manuel de désamorçage est découpé en fiches réparties entre les joueurs :
// personne n'a tout, il faut se parler. Les règles sont TIRÉES AU HASARD à chaque
// bombe (impossible de les apprendre par cœur).
// Chaque erreur : le chrono perd du temps ET se met à défiler plus vite.
// Modules : 🔌 câbles · 🎛️ cadran · 🔣 symboles · 🌡️ thermostat · 🎚️ interrupteurs
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, gain, applyGains, awards, active, initScores } = require('./_utils');

const pick = (a) => (a.length ? a[Math.floor(Math.random() * a.length)] : undefined);
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// modules : base selon la bombe (1, 2, 3), + 1 module tous les 2 joueurs au-delà de 3 (jusqu'à 8 joueurs)
// perMod : secondes accordées par module · hardP : chance qu'un module soit en version 💀
// twistP : chance d'un piège sur la bombe
const LEVELS = {
  normal: { modules: [3, 4, 5], perMod: [80, 75, 70], hardBonus: 45, strikes: 3, penalty: 20000, speedUp: 1.2, hardP: [0.15, 0.3, 0.45], twistP: [0, 0.5, 0.8] },
  expert: { modules: [4, 5, 6], perMod: [65, 60, 55], hardBonus: 35, strikes: 2, penalty: 30000, speedUp: 1.3, hardP: [0.4, 0.55, 0.7], twistP: [0.5, 0.8, 1] },
};
// ═══ Règles à 3 joueurs : une règle tirée au hasard à chaque bombe ═══
const TRIO = {
  proprio: { emoji: '🔒', name: 'Chacun ses modules', desc: 'chaque module n\'a qu\'un seul démineur… et ce n\'est jamais lui qui a ses fiches' },
  relais: { emoji: '🏃', name: 'Relais', desc: 'les modules se désamorcent dans l\'ordre (A, B, C…) et jamais deux de suite par la même personne' },
  capitaine: { emoji: '🧑‍✈️', name: 'Le capitaine', desc: 'un seul joueur peut toucher la bombe, et il n\'a aucune fiche : les deux autres le guident' },
  muet: { emoji: '🤐', name: 'Le muet', desc: 'un joueur n\'a pas le droit de parler : gestes et mimes uniquement !' },
  anonyme: { emoji: '🃏', name: 'Fiches anonymes', desc: 'les fiches ne disent plus à quel module elles servent : à vous de deviner' },
};
const MAX_SCALE = 8;      // au-delà de 8 joueurs, la bombe ne grossit plus
const TWISTS = {
  tournant: { emoji: '🔀', name: 'Fiches tournantes', desc: 'toutes les 60 s, chacun passe ses fiches au joueur suivant' },
  masque: { emoji: '🙈', name: 'Chrono masqué', desc: 'le chrono est caché jusqu\'aux 30 dernières secondes' },
  court: { emoji: '⚡', name: 'Court-circuit', desc: 'chaque erreur mélange aussi un autre module' },
};

// ═══ La bombe : numéro de série, piles, lampe ═══
const LETTERS = 'ABCDEFGHJKLMNPRSTUVXYZ', DIGITS = '23456789', VOWELS = 'AEUY';
function makeProps() {
  let s;
  do { s = Array.from({ length: 6 }, (_, i) => (i === 5 || Math.random() < 0.4 ? pick(DIGITS) : pick(LETTERS))).join(''); }
  while (!/[A-Z]/.test(s));
  return { serial: s, piles: rint(0, 4), lamp: pick(['rouge', 'verte', 'bleue', 'éteinte']) };
}
const serialInfo = (p) => {
  const ch = p.serial.split('');
  const digits = ch.filter((c) => /\d/.test(c));
  return {
    vowels: ch.filter((c) => VOWELS.includes(c)).length,
    digits: digits.length,
    consonants: ch.filter((c) => /[A-Z]/.test(c) && !VOWELS.includes(c)).length,
    last: Number(digits[digits.length - 1]),
    sum: digits.reduce((s, d) => s + Number(d), 0),
  };
};

// conditions sur la bombe, utilisées dans plusieurs fiches
const CONDS = [
  { t: 'la lampe est rouge', f: (p) => p.lamp === 'rouge' },
  { t: 'la lampe est verte', f: (p) => p.lamp === 'verte' },
  { t: 'la lampe est bleue', f: (p) => p.lamp === 'bleue' },
  { t: 'la lampe est éteinte', f: (p) => p.lamp === 'éteinte' },
  { t: 'la lampe est allumée (n\'importe quelle couleur)', f: (p) => p.lamp !== 'éteinte' },
  { t: 'la bombe a au moins 2 piles', f: (p) => p.piles >= 2 },
  { t: 'la bombe n\'a aucune pile', f: (p) => p.piles === 0 },
  { t: 'le nombre de piles est impair', f: (p) => p.piles % 2 === 1 },
  { t: 'le numéro de série finit par un chiffre pair', f: (p) => serialInfo(p).last % 2 === 0 },
  { t: 'le numéro de série contient au moins 2 voyelles (A, E, U, Y)', f: (p) => serialInfo(p).vowels >= 2 },
  { t: 'le numéro de série contient au moins 3 chiffres', f: (p) => serialInfo(p).digits >= 3 },
  { t: 'la somme des chiffres du numéro de série dépasse 12', f: (p) => serialInfo(p).sum > 12 },
];

// ═══ Modules ═══
const COLORS = ['rouge', 'bleu', 'jaune', 'vert', 'noir', 'blanc'];
const GLYPHS = [
  ['★', 'étoile'], ['☾', 'lune'], ['♣', 'trèfle'], ['✿', 'fleur'], ['⚓', 'ancre'], ['☂', 'parapluie'], ['♪', 'note'], ['✈', 'avion'],
  ['☯', 'yin-yang'], ['⌛', 'sablier'], ['✂', 'ciseaux'], ['☀', 'soleil'], ['♞', 'cavalier'], ['❄', 'flocon'], ['⚡', 'éclair'], ['♥', 'cœur'],
];

function wires(p, expert) {
  const n = expert ? rint(5, 7) : rint(4, 6);
  const values = Object.fromEntries(shuffle([0, 1, 2, 3, 4, 5]).map((v, i) => [COLORS[i], v]));
  const stripe = pick([
    { t: 'vaut le DOUBLE de sa couleur', f: (v) => v * 2 },
    { t: 'vaut sa couleur PLUS 3', f: (v) => v + 3 },
    { t: 'vaut ZÉRO, quelle que soit sa couleur', f: () => 0 },
  ]);
  const mode = pick(['max', 'min']);
  const tie = pick(CONDS);
  const list = Array.from({ length: n }, () => ({ c: pick(COLORS), s: Math.random() < 0.3, cut: false }));
  let neighbor = null;
  if (expert) neighbor = pick(['noir', 'blanc', 'rouge']);
  const val = (w, i) => {
    let v = w.s ? stripe.f(values[w.c]) : values[w.c];
    if (neighbor && ((list[i - 1] && list[i - 1].c === neighbor) || (list[i + 1] && list[i + 1].c === neighbor))) v += 1;
    return v;
  };
  const vals = list.map(val);
  const best = mode === 'max' ? Math.max(...vals) : Math.min(...vals);
  const idx = vals.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0);
  const target = tie.f(p) ? idx[idx.length - 1] : idx[0];
  const cards = [
    { title: '🔌 Câbles — valeur des couleurs', lines: COLORS.map((c) => `${c} : ${values[c]}`) },
    { title: '🔌 Câbles — câbles rayés', lines: [`Un câble rayé ${stripe.t}.`, ...(neighbor ? [`Tout câble juste au-dessus ou juste en dessous d'un câble ${neighbor} gagne +1 (à appliquer en dernier).`] : [])] },
    { title: '🔌 Câbles — lequel couper ?', lines: [`Coupe UN SEUL câble : celui qui a la ${mode === 'max' ? 'PLUS GRANDE' : 'PLUS PETITE'} valeur.`, `Égalité : si ${tie.t}, prends celui le plus en BAS (plus grand numéro) ; sinon celui le plus en HAUT (plus petit numéro).`, 'Les câbles sont numérotés de haut en bas.'] },
  ];
  return { type: 'wires', name: 'Câbles', pub: { list }, sol: { target }, cards };
}

function dial(p, expert) {
  const info = serialInfo(p);
  const base = pick([['voyelles (A, E, U, Y)', info.vowels], ['chiffres', info.digits], ['consonnes', info.consonants]]);
  const mult = rint(2, 4), per = rint(1, 3);
  const adj = { rouge: rint(1, 5), verte: -rint(1, 5), bleue: 'x2', éteinte: 0 };
  let v = base[1] * mult + p.piles * per;
  v = adj[p.lamp] === 'x2' ? v * 2 : v + adj[p.lamp];
  v = ((v % 10) + 10) % 10;
  let flip = null;
  if (expert) { flip = pick(CONDS); if (flip.f(p)) v = 9 - v; }
  const cards = [
    { title: '🎛️ Cadran — point de départ', lines: [`Compte les ${base[0]} du numéro de série et multiplie par ${mult}.`] },
    { title: '🎛️ Cadran — piles', lines: [`Ajoute ${per} par pile de la bombe.`] },
    { title: '🎛️ Cadran — lampe', lines: [`Lampe rouge : +${adj.rouge}`, `Lampe verte : ${adj.verte}`, 'Lampe bleue : multiplie par 2', 'Lampe éteinte : rien', 'Garde seulement le chiffre des unités (si c\'est négatif, ajoute 10).'] },
    ...(flip ? [{ title: '🎛️ Cadran — piège', lines: [`Tout à la fin : si ${flip.t}, remplace le chiffre par 9 moins ce chiffre.`] }] : []),
    { title: '🎛️ Cadran — validation', lines: ['Tourne le cadran sur le chiffre obtenu puis appuie sur « Valider ».'] },
  ];
  return { type: 'dial', name: 'Cadran', pub: { value: 0 }, sol: { code: v }, cards };
}

function symbols(p, expert) {
  const k = expert ? 5 : 4;
  const ranks = shuffle(GLYPHS.map((_, i) => i + 1));            // rang de chaque symbole (1 à 16)
  const shown = shuffle(GLYPHS.map((_, i) => i)).slice(0, k);
  const rev = pick(CONDS);
  const desc = rev.f(p);
  const order = shown.slice().sort((a, b) => (desc ? ranks[b] - ranks[a] : ranks[a] - ranks[b]));
  const all = shuffle(GLYPHS.map((g, i) => i));
  const parts = expert ? [all.slice(0, 6), all.slice(6, 11), all.slice(11)] : [all.slice(0, 8), all.slice(8)];
  const cards = parts.map((part, j) => ({
    title: `🔣 Symboles — rangs (${j + 1}/${parts.length})`,
    lines: part.sort((a, b) => ranks[a] - ranks[b]).map((i) => `${GLYPHS[i][0]} ${GLYPHS[i][1]} : rang ${ranks[i]}`),
  }));
  cards.push({ title: '🔣 Symboles — ordre', lines: [`Appuie sur les ${k} symboles dans l'ordre CROISSANT de leur rang.`, `Mais si ${rev.t} : ordre DÉCROISSANT.`, 'Une erreur remet le module à zéro.'] });
  return { type: 'symbols', name: 'Symboles', pub: { glyphs: shown.map((i) => GLYPHS[i][0]), done: [] }, sol: { order }, cards };
}

function thermo(p, expert, start) {
  const info = serialInfo(p);
  const pool = [
    { t: 'un nombre PAIR', f: (n) => n % 2 === 0 },
    { t: 'un nombre IMPAIR', f: (n) => n % 2 === 1 },
    { t: 'un multiple de 3', f: (n) => n % 3 === 0 },
    { t: 'un multiple de 4', f: (n) => n % 4 === 0 },
    { t: `un nombre qui contient le chiffre ${p.piles}`, f: (n) => String(n).includes(String(p.piles)) },
    { t: `un nombre qui contient le chiffre ${info.last}`, f: (n) => String(n).includes(String(info.last)) },
    { t: 'un nombre dont les deux chiffres font plus de 10 ensemble', f: (n) => Math.floor(n / 10) + (n % 10) > 10 },
    { t: 'un nombre dont les deux chiffres sont identiques', f: (n) => Math.floor(n / 10) === n % 10 },
  ];
  const tcolors = ['rouge', 'bleu', 'vert', 'jaune'];
  const map = Object.fromEntries(tcolors.map((c) => [c, pick(pool)]));
  const color = pick(tcolors);
  let cond = map[color];
  let extra = null;
  if (expert) { extra = pick(CONDS); }
  const ok = (n) => cond.f(n) && (!extra || !extra.f(p) || n > 50);
  // suite de températures : on s'assure qu'il y a régulièrement une bonne valeur
  const seq = [];
  for (let i = 0; i < 400; i++) {
    let n = rint(10, 99);
    if (i % 6 === 5 && !seq.slice(-5).some(ok)) { for (let t = 0; t < 200 && !ok(n); t++) n = rint(10, 99); }
    seq.push(n);
  }
  const period = expert ? 1200 : 1600;
  const cards = [
    { title: '🌡️ Thermostat — rouge et bleu', lines: [`Thermostat ROUGE : valide sur ${map.rouge.t}.`, `Thermostat BLEU : valide sur ${map.bleu.t}.`] },
    { title: '🌡️ Thermostat — vert et jaune', lines: [`Thermostat VERT : valide sur ${map.vert.t}.`, `Thermostat JAUNE : valide sur ${map.jaune.t}.`] },
    ...(extra ? [{ title: '🌡️ Thermostat — exception', lines: [`Si ${extra.t}, il faut EN PLUS que la température dépasse 50.`] }] : []),
  ];
  return { type: 'thermo', name: 'Thermostat', pub: { color, seq, period, t0: start }, sol: { ok }, cards };
}

function switches(p, expert) {
  const n = expert ? 6 : 5;
  const rules = shuffle(CONDS).slice(0, n).map((c) => ({ c, up: Math.random() < 0.5 }));   // une condition différente par interrupteur
  const target = rules.map((r) => (r.c.f(p) ? r.up : !r.up));
  let start;
  do { start = Array.from({ length: n }, () => Math.random() < 0.5); } while (start.every((v, i) => v === target[i]));
  const line = (r, i) => `N°${i + 1} : ${r.up ? 'en HAUT' : 'en BAS'} si ${r.c.t} ; sinon ${r.up ? 'en bas' : 'en haut'}.`;
  const cut = expert ? [[0, 2], [2, 4], [4, n]] : [[0, 3], [3, n]];
  const cards = cut.map(([a, b], j) => ({ title: `🎚️ Interrupteurs (${j + 1}/${cut.length})`, lines: rules.slice(a, b).map((r, k) => line(r, a + k)) }));
  cards[cards.length - 1].lines.push('Quand tout est en place, appuie sur « Valider ».');
  return { type: 'switches', name: 'Interrupteurs', pub: { state: start }, sol: { target }, cards };
}


// ─── Variantes supplémentaires (tirées au hasard) ───
// 🔌 Câbles « au numéro » : on calcule directement le numéro du câble à couper
function wiresPos(p, expert) {
  const n = expert ? rint(5, 7) : rint(4, 6);
  const list = Array.from({ length: n }, () => ({ c: pick(COLORS), s: Math.random() < 0.3, cut: false }));
  const col = pick(list).c;
  const k = list.filter((w) => w.c === col).length;
  const add = rint(1, 3), cond = pick(CONDS);
  let v = k + p.piles * add + (cond.f(p) ? 2 : 0);
  if (expert) v += list.filter((w) => w.s).length;
  const r = v % n, target = r === 0 ? n - 1 : r - 1;
  const cards = [
    { title: '🔌 Câbles — compte', lines: [`Compte les câbles ${col.toUpperCase()} (rayés compris).`] },
    { title: '🔌 Câbles — ajouts', lines: [`Ajoute ${add} par pile de la bombe.`, `Si ${cond.t}, ajoute encore 2.`, ...(expert ? ['Ajoute enfin 1 par câble rayé.'] : [])] },
    { title: '🔌 Câbles — numéro', lines: ['Divise le résultat par le nombre de câbles et garde le RESTE.', 'Reste 0 : coupe le DERNIER câble. Sinon coupe le câble de ce numéro (numérotés de haut en bas).'] },
  ];
  return { type: 'wires', name: 'Câbles', pub: { list }, sol: { target, text: `couper le câble n°${target + 1}` }, cards };
}

// 🔌💀 Câbles multiples : il faut couper TOUS les câbles dangereux, dans le bon ordre
function wiresMulti(p, expert) {
  for (let tries = 0; tries < 200; tries++) {
    const n = rint(6, expert ? 8 : 7);
    const list = Array.from({ length: n }, () => ({ c: pick(COLORS), s: Math.random() < 0.35, cut: false }));
    const danger = shuffle(COLORS.filter((c) => c !== 'blanc')).slice(0, 2);
    const never = expert ? pick(['blanc', 'jaune']) : 'blanc';
    const isDanger = (w) => w.c !== never && (danger.includes(w.c) !== w.s);
    const targets = list.map((w, i) => (isDanger(w) ? i : -1)).filter((i) => i >= 0);
    if (targets.length < 2 || targets.length > n - 2) continue;
    const up = pick(CONDS);
    const order = up.f(p) ? targets.slice().reverse() : targets;
    const cards = [
      { title: '🔌💀 Câbles multiples — couleurs dangereuses', lines: [`Un câble ${danger[0].toUpperCase()} ou ${danger[1].toUpperCase()} est dangereux.`] },
      { title: '🔌💀 Câbles multiples — rayures', lines: ['Une rayure INVERSE tout : un câble rayé de couleur dangereuse est sans danger, un câble rayé d\'une autre couleur devient dangereux.', `Exception : un câble ${never.toUpperCase()} n'est jamais dangereux.`] },
      { title: '🔌💀 Câbles multiples — ordre', lines: ['Coupe TOUS les câbles dangereux, un par un.', `Si ${up.t} : du plus BAS au plus HAUT. Sinon du plus HAUT au plus BAS.`, 'Un câble coupé à tort ou dans le désordre = erreur.'] },
    ];
    return { type: 'wires', hard: true, name: 'Câbles multiples 💀', pub: { list }, sol: { order, text: `couper ${order.map((i) => `n°${i + 1}`).join(' puis ')}` }, cards };
  }
  return wires(p, expert);
}

// 🔢💀 Le code à 4 chiffres : chaque chiffre a sa propre fiche
function code(p, expert, start, opts = {}) {
  const info = serialInfo(p);
  const m1 = rint(2, 3), a1 = rint(0, 4), c4 = pick(CONDS), c2 = pick(CONDS);
  const d1 = (p.piles * m1 + a1) % 10;
  const d2 = (info.last + (c2.f(p) ? 3 : 0)) % 10;
  const d3 = (opts.nMods || 3) % 10;
  let d4 = (d1 + d2 + d3) % 10;
  if (c4.f(p)) d4 = 9 - d4;
  let digits = [d1, d2, d3, d4];
  if (expert) { const sw = pick(CONDS); if (sw.f(p)) digits = [d2, d1, d4, d3]; var swap = sw; }
  const cards = [
    { title: '🔢💀 Code — 1er chiffre', lines: [`Nombre de piles × ${m1}, plus ${a1}. Garde les unités.`] },
    { title: '🔢💀 Code — 2e chiffre', lines: ['Le DERNIER chiffre du numéro de série.', `Si ${c2.t}, ajoute 3. Garde les unités.`] },
    { title: '🔢💀 Code — 3e chiffre', lines: ['Le nombre de MODULES sur la bombe (tous, même désamorcés). Garde les unités.'] },
    { title: '🔢💀 Code — 4e chiffre', lines: ['Additionne les trois premiers chiffres et garde les unités.', `Si ${c4.t}, remplace-le par 9 moins ce chiffre.`] },
    { title: '🔢💀 Code — saisie', lines: ['Tape les 4 chiffres puis « Valider ». « Effacer » recommence la saisie.', ...(swap ? [`Si ${swap.t} : échange le 1er et le 2e chiffre, et le 3e et le 4e (après les calculs).`] : [])] },
  ];
  const sol = digits.join('');
  return { type: 'code', hard: true, name: 'Code 💀', pub: { entry: '' }, sol: { code: sol, text: `le code ${sol}` }, cards };
}

// 🔣 L'intrus : un seul symbole n'apparaît dans aucune liste
function symbolsIntrus(p, expert) {
  const k = expert ? 7 : 6;
  const idx = shuffle(GLYPHS.map((_, i) => i));
  const shown = idx.slice(0, k), intruder = shown[rint(0, k - 1)];
  const pool = shuffle([...shown.filter((i) => i !== intruder), ...idx.slice(k, k + (expert ? 8 : 7))]);
  const parts = [pool.slice(0, 4), pool.slice(4, 8), pool.slice(8)];
  const cards = parts.map((part, j) => ({ title: `🔣 Symboles — liste ${j + 1}/3`, lines: part.map((i) => `${GLYPHS[i][0]} ${GLYPHS[i][1]}`) }));
  cards.push({ title: '🔣 Symboles — l\'intrus', lines: [`Parmi les ${k} symboles, un SEUL n'apparaît dans aucune des 3 listes.`, 'Appuie sur lui, et seulement lui.'] });
  return { type: 'symbols', name: 'Symboles (intrus)', pub: { glyphs: shown.map((i) => GLYPHS[i][0]), done: [] }, sol: { order: [intruder], text: `l'intrus ${GLYPHS[intruder][0]} (${GLYPHS[intruder][1]})` }, cards };
}

// 🌡️ Thermostat « chrono » : on valide quand le chiffre des secondes du chrono est le bon
function thermoChrono(p, expert) {
  const info = serialInfo(p);
  const a = rint(1, 3), cond = pick(CONDS);
  let x = (p.piles * a + info.vowels) % 10;
  if (cond.f(p)) x = 9 - x;
  const color = pick(['rouge', 'bleu', 'vert', 'jaune']);
  const cards = [
    { title: '🌡️ Thermostat — en panne', lines: ['Ce thermostat n\'affiche rien : il faut regarder le CHRONO de la bombe.', 'Valide quand le DERNIER chiffre des secondes affichées vaut X.'] },
    { title: '🌡️ Thermostat — calcul de X', lines: [`X = nombre de piles × ${a} + nombre de voyelles (A, E, U, Y) du numéro de série. Garde les unités.`, `Si ${cond.t}, X devient 9 moins X.`] },
  ];
  return { type: 'thermo', name: 'Thermostat', pub: { mode: 'chrono', color }, sol: { x, text: `valider quand les secondes finissent par ${x}` }, cards };
}

// 🎚️💀 Interrupteurs binaires : la position code un nombre
function switchesBinary(p, expert) {
  const info = serialInfo(p);
  const m = rint(2, 5), inv = pick(CONDS);
  let N = (info.sum + p.piles * m) % 32;
  if (N === 0) N = 31;
  let target = [16, 8, 4, 2, 1].map((b) => (N & b) > 0);
  if (expert && inv.f(p)) target = target.map((v) => !v);
  let start;
  do { start = Array.from({ length: 5 }, () => Math.random() < 0.5); } while (start.every((v, i) => v === target[i]));
  const cards = [
    { title: '🎚️💀 Interrupteurs binaires — le nombre', lines: ['N = somme des chiffres du numéro de série', `+ ${m} par pile de la bombe.`, 'Garde le reste de la division par 32 (si c\'est 0, prends 31).'] },
    { title: '🎚️💀 Interrupteurs binaires — la position', lines: ['Chaque interrupteur EN HAUT compte : n°1 = 16, n°2 = 8, n°3 = 4, n°4 = 2, n°5 = 1.', 'Mets en haut ceux dont la somme fait exactement N, les autres en bas, puis « Valider ».', ...(expert ? [`Si ${inv.t}, inverse TOUS les interrupteurs à la fin.`] : [])] },
  ];
  return { type: 'switches', hard: true, name: 'Interrupteurs binaires 💀', pub: { state: start }, sol: { target, text: `N = ${N} → ${target.map((v) => (v ? '⬆' : '⬇')).join(' ')}` }, cards };
}


// ─── Encore plus de variantes ───
const ensure = (list, color) => { if (!list.some((w) => w.c === color && !w.s)) { const k = rint(0, list.length - 1); list[k] = { c: color, s: false, cut: false }; } };

// 🔌 Câbles « couleur visée » : la lampe donne la couleur, une règle donne lequel
function wiresColor(p, expert) {
  const n = expert ? rint(5, 7) : rint(4, 6);
  const lamps = ['rouge', 'verte', 'bleue', 'éteinte'];
  const table = Object.fromEntries(lamps.map((l) => [l, pick(COLORS)]));
  const col = table[p.lamp];
  const list = Array.from({ length: n }, () => ({ c: pick(COLORS), s: Math.random() < 0.3, cut: false }));
  ensure(list, col);
  const cond = pick(CONDS);
  const ids = list.map((w, i) => (w.c === col && !w.s ? i : -1)).filter((i) => i >= 0);
  const target = cond.f(p) ? ids[ids.length - 1] : ids[0];
  const cards = [
    { title: '🔌 Câbles — couleur visée (1/2)', lines: [`Lampe rouge : ${table.rouge}`, `Lampe verte : ${table.verte}`] },
    { title: '🔌 Câbles — couleur visée (2/2)', lines: [`Lampe bleue : ${table.bleue}`, `Lampe éteinte : ${table['éteinte']}`] },
    { title: '🔌 Câbles — lequel ?', lines: ['Les câbles RAYÉS ne comptent pas.', 'Coupe le PREMIER câble de la couleur visée (en partant du haut).', `Si ${cond.t}, coupe plutôt le DERNIER.`] },
  ];
  return { type: 'wires', name: 'Câbles', pub: { list }, sol: { target, text: `couper le câble n°${target + 1} (${col})` }, cards };
}

// 🎛️ Cadran « tableau » : le chiffre se lit dans un tableau lampe × piles
function dialTable(p) {
  const lamps = ['rouge', 'verte', 'bleue', 'éteinte'];
  const cols = [['0 pile', (x) => x === 0], ['1 ou 2 piles', (x) => x >= 1 && x <= 2], ['3 ou 4 piles', (x) => x >= 3]];
  const tab = Object.fromEntries(lamps.map((l) => [l, cols.map(() => rint(0, 9))]));
  const cond = pick(CONDS), add = rint(2, 7);
  let v = tab[p.lamp][cols.findIndex((c) => c[1](p.piles))];
  if (cond.f(p)) v = (v + add) % 10;
  const row = (l) => `Lampe ${l} : ${cols.map((c, k) => `${c[0]} → ${tab[l][k]}`).join(' · ')}`;
  const cards = [
    { title: '🎛️ Cadran — tableau (1/2)', lines: [row('rouge'), row('verte')] },
    { title: '🎛️ Cadran — tableau (2/2)', lines: [row('bleue'), row('éteinte')] },
    { title: '🎛️ Cadran — ajustement', lines: [`Si ${cond.t}, ajoute ${add} (garde les unités).`, 'Puis tourne le cadran sur ce chiffre et « Valider ».'] },
  ];
  return { type: 'dial', name: 'Cadran', pub: { value: 0 }, sol: { code: v, text: `le chiffre ${v}` }, cards };
}

// 🔣 Symboles « familles » : appuyer sur tous ceux d'une même famille (dans n'importe quel ordre)
function symbolsFamilies(p, expert) {
  const fams = [0, 1, 2, 3].map(() => []);
  shuffle(GLYPHS.map((_, i) => i)).forEach((g, k) => fams[k % 4].push(g));
  const names = shuffle(['les ronds', 'les pointus', 'les doux', 'les bizarres']);
  const [A, B, C] = shuffle([0, 1, 2, 3]);
  const nA = rint(2, 3), nB = 2;
  const first = fams[A][0], last = fams[B][0];
  const mid = shuffle([...fams[A].slice(1, nA), ...fams[B].slice(1, nB), ...fams[C].slice(0, expert ? 2 : 1)]);
  const shown = [first, ...mid, last];
  const cond = pick(CONDS);
  const fam = cond.f(p) ? B : A;
  const set = shown.filter((g) => fams[fam].includes(g));
  const line = (f) => `Famille « ${names[f]} » : ${fams[f].map((g) => `${GLYPHS[g][0]} ${GLYPHS[g][1]}`).join(', ')}`;
  const cards = [
    { title: '🔣 Symboles — familles (1/2)', lines: [line(0), line(1)] },
    { title: '🔣 Symboles — familles (2/2)', lines: [line(2), line(3)] },
    { title: '🔣 Symboles — lesquels ?', lines: ['Appuie sur TOUS les symboles de la famille du PREMIER symbole (à gauche), dans n\'importe quel ordre.', `Mais si ${cond.t} : la famille du DERNIER symbole (à droite).`, 'Une erreur remet le module à zéro.'] },
  ];
  return { type: 'symbols', name: 'Symboles (familles)', pub: { glyphs: shown.map((i) => GLYPHS[i][0]), done: [] }, sol: { set, order: set, text: `${set.map((i) => GLYPHS[i][0]).join(' ')} (${names[fam]})` }, cards };
}

// 🌡️ Thermostat « fourchette » : valider quand la température est dans la bonne fourchette
function thermoRange(p, expert, start) {
  const lamps = ['rouge', 'verte', 'bleue', 'éteinte'];
  const rng = Object.fromEntries(lamps.map((l) => { const lo = rint(15, 70); return [l, [lo, lo + rint(10, 18)]]; }));
  const cond = pick(CONDS);
  let [lo, hi] = rng[p.lamp];
  if (cond.f(p)) { lo += 10; hi += 10; }
  const ok = (n) => n >= lo && n <= hi;
  const seq = [];
  for (let i = 0; i < 400; i++) { let n = rint(10, 99); if (i % 5 === 4 && !seq.slice(-4).some(ok)) n = rint(lo, Math.min(99, hi)); seq.push(n); }
  const r = (l) => `Lampe ${l} : entre ${rng[l][0]} et ${rng[l][1]} (compris)`;
  const cards = [
    { title: '🌡️ Thermostat — fourchettes (1/2)', lines: [r('rouge'), r('verte')] },
    { title: '🌡️ Thermostat — fourchettes (2/2)', lines: [r('bleue'), r('éteinte')] },
    { title: '🌡️ Thermostat — décalage', lines: [`Si ${cond.t}, les deux bornes montent de 10.`, 'Valide quand la température est dans la fourchette (la couleur du thermostat ne compte pas).'] },
  ];
  return { type: 'thermo', name: 'Thermostat', pub: { color: pick(['rouge', 'bleu', 'vert', 'jaune']), seq, period: expert ? 1200 : 1500, t0: start }, sol: { ok, text: `entre ${lo} et ${hi}` }, cards };
}

// 🎚️ Interrupteurs « combien » : un nombre exact d'interrupteurs levés, avec une contrainte
function switchesCount(p) {
  const info = serialInfo(p);
  const a = rint(1, 3);
  const K = ((p.piles + info.vowels * a) % 4) + 1;
  const down = (info.last % 5);
  const left = Math.random() < 0.5;
  const order = [0, 1, 2, 3, 4].filter((i) => i !== down);
  const ups = (left ? order : order.slice().reverse()).slice(0, K);
  const target = [0, 1, 2, 3, 4].map((i) => ups.includes(i));
  let start;
  do { start = Array.from({ length: 5 }, () => Math.random() < 0.5); } while (start.every((v, i) => v === target[i]));
  const cards = [
    { title: '🎚️ Interrupteurs — combien ?', lines: [`K = nombre de piles + ${a} × le nombre de voyelles (A, E, U, Y) du numéro de série.`, 'Garde le reste de la division par 4, puis ajoute 1 : il faut exactement K interrupteurs EN HAUT.'] },
    { title: '🎚️ Interrupteurs — lesquels ?', lines: ['L\'interrupteur dont le numéro = (dernier chiffre du numéro de série ÷ 5, le reste) + 1 doit rester EN BAS.', `Lève les K autres en partant de la ${left ? 'GAUCHE' : 'DROITE'}, puis « Valider ».`] },
  ];
  return { type: 'switches', name: 'Interrupteurs', pub: { state: start }, sol: { target, text: target.map((v) => (v ? '⬆' : '⬇')).join(' ') }, cards };
}

// 🔴 Le gros bouton : appuyer exactement N fois
const BTN_COLORS = ['rouge', 'bleu', 'jaune', 'vert', 'blanc'];
const BTN_WORDS = ['APPUIE', 'STOP', 'ATTENDS', 'BOUM', 'NON', 'VITE'];
function buttonTaps(p) {
  const color = pick(BTN_COLORS), word = pick(BTN_WORDS);
  const base = Object.fromEntries(BTN_COLORS.map((c) => [c, rint(1, 5)]));
  const mod = Object.fromEntries(BTN_WORDS.map((w) => [w, rint(-1, 3)]));
  const cond = pick(CONDS);
  let N = Math.max(1, base[color] + mod[word]);
  if (cond.f(p)) N += p.piles;
  N = Math.min(12, Math.max(1, N));
  const cards = [
    { title: '🔴 Bouton — couleur', lines: BTN_COLORS.map((c) => `Bouton ${c} : ${base[c]} appui${base[c] > 1 ? 's' : ''}`) },
    { title: '🔴 Bouton — mot écrit dessus', lines: [...BTN_WORDS.map((w) => `« ${w} » : ${mod[w] >= 0 ? '+' : ''}${mod[w]}`), 'Jamais moins de 1 appui.'] },
    { title: '🔴 Bouton — bonus', lines: [`Si ${cond.t}, ajoute un appui par pile (12 au maximum).`, 'Appuie exactement ce nombre de fois, puis « Valider ». « Recommencer » remet à zéro.'] },
  ];
  return { type: 'button', name: 'Gros bouton', pub: { color, word, count: 0, mode: 'taps' }, sol: { n: N, text: `${N} appui${N > 1 ? 's' : ''}` }, cards };
}

// 🔴 Le gros bouton « au bon moment » : appuyer quand le chrono affiche un certain chiffre
function buttonTimer(p) {
  const color = pick(BTN_COLORS), word = pick(BTN_WORDS);
  const dig = Object.fromEntries(BTN_COLORS.map((c) => [c, rint(0, 9)]));
  const cond = pick(CONDS);
  let d = dig[color];
  if (cond.f(p)) d = (d + 5) % 10;
  const cards = [
    { title: '🔴 Bouton — chiffre selon la couleur', lines: BTN_COLORS.map((c) => `Bouton ${c} : ${dig[c]}`) },
    { title: '🔴 Bouton — quand appuyer ?', lines: ['Le mot écrit sur le bouton ne veut rien dire : ignore-le !', `Si ${cond.t}, ajoute 5 au chiffre (garde les unités).`, 'Appuie UNE fois quand ce chiffre apparaît N\'IMPORTE OÙ dans le chrono.'] },
  ];
  return { type: 'button', name: 'Gros bouton', pub: { color, word, count: 0, mode: 'timer' }, sol: { d, text: `appuyer quand un ${d} est sur le chrono` }, cards };
}

// ⬆️💀 Les flèches : chaque caractère du numéro de série donne une direction
const ARROWS = ['⬆', '➡', '⬇', '⬅'];
function arrows(p, expert) {
  const chars = shuffle((LETTERS + DIGITS).split(''));
  const groups = [0, 1, 2, 3].map((k) => chars.filter((_, i) => i % 4 === k).sort());
  const dirOf = (ch) => ARROWS[groups.findIndex((g) => g.includes(ch))];
  const len = expert ? 5 : 4;
  const cond = pick(CONDS);
  let seq = p.serial.slice(0, len).split('').map(dirOf);
  if (cond.f(p)) seq = seq.reverse();
  const cards = [
    { title: '⬆️💀 Flèches — directions (1/2)', lines: [`${ARROWS[0]} pour : ${groups[0].join(' ')}`, `${ARROWS[1]} pour : ${groups[1].join(' ')}`] },
    { title: '⬆️💀 Flèches — directions (2/2)', lines: [`${ARROWS[2]} pour : ${groups[2].join(' ')}`, `${ARROWS[3]} pour : ${groups[3].join(' ')}`] },
    { title: '⬆️💀 Flèches — séquence', lines: [`Prends les ${len} PREMIERS caractères du numéro de série, chacun donne une flèche.`, `Si ${cond.t}, tape-les dans l'ordre INVERSE.`, 'Puis « Valider ». « Effacer » recommence.'] },
  ];
  return { type: 'arrows', hard: true, name: 'Flèches 💀', pub: { entry: [], len }, sol: { seq, text: seq.join(' ') }, cards };
}

// Variantes possibles pour chaque type de module ; « hard » = module très dur 💀
const VARIANTS = {
  wires: [{ f: wires }, { f: wiresPos }, { f: wiresColor }, { f: wiresMulti, hard: true }],
  dial: [{ f: dial }, { f: dialTable }, { f: code, hard: true }],
  symbols: [{ f: symbols }, { f: symbolsIntrus }, { f: symbolsFamilies }],
  thermo: [{ f: thermo }, { f: thermoRange }, { f: thermoChrono, noMask: true }],
  switches: [{ f: switches }, { f: switchesCount }, { f: switchesBinary, hard: true }],
  button: [{ f: buttonTaps }, { f: buttonTimer, noMask: true }],
  arrows: [{ f: arrows, hard: true }],
};

const MAKERS = { wires, dial, symbols, thermo, switches };

// ═══ Partie ═══
function create(ctx) {
  const { scores, stats } = initScores(ctx, ['solved', 'errors', 'defused']);
  const level = ctx.option('level') === 'expert' ? 'expert' : 'normal';
  const trioOn = ctx.option('trio') !== 'off';
  const n = ctx.rounds(3);
  return { scores, stats, level, trioOn, round: 0, totalRounds: Math.min(3, n), phase: 'intro', stamp: 0, result: null };
}

function startRound(ctx, g) {
  g.round++;
  const L = LEVELS[g.level], expert = g.level === 'expert';
  const i = Math.min(2, g.round - 1);
  const props = makeProps();
  const now = Date.now();
  g.players = active(ctx, g).map((p) => p.id);
  // la bombe grossit avec le nombre de joueurs (jusqu'à 8)
  const nP = Math.min(MAX_SCALE, g.players.length);
  const nMods = Math.min(8, L.modules[i] + Math.max(0, Math.floor((nP - 3) / 2)));
  // piège de bombe (au hasard)
  g.twist = Math.random() < L.twistP[i] ? pick(Object.keys(TWISTS)) : null;
  if (g.twist === 'tournant' && g.players.length < 2) g.twist = null;
  // types de modules : tous différents tant que possible, puis on recommence
  const pool = Object.keys(VARIANTS).filter((t) => t !== 'arrows' || Math.random() < L.hardP[i]);
  let types = [];
  while (types.length < nMods) types.push(...shuffle(pool));
  types = types.slice(0, nMods);
  g.props = props;
  g.modules = types.map((t, k) => {
    const label = 'ABCDEFGH'[k];
    let vs = VARIANTS[t].filter((v) => !(g.twist === 'masque' && v.noMask));
    const hard = vs.filter((v) => v.hard), easy = vs.filter((v) => !v.hard);
    const v = hard.length && (!easy.length || Math.random() < L.hardP[i]) ? pick(hard) : pick(easy);
    const m = v.f(props, expert, now, { nMods });
    // chaque fiche indique son module (il peut y avoir deux modules du même type)
    m.cards = m.cards.map((c) => ({ ...c, title: `${label} · ${c.title}` }));
    return { ...m, label, solved: false, by: null };
  });
  // règle à 3 joueurs (tirée au hasard ; les fiches anonymes seulement à partir de la 2e bombe)
  g.trio = null; g.captain = null; g.mute = null; g.lastSolver = null;
  if (g.trioOn && g.players.length === 3) {
    g.trio = pick(Object.keys(TRIO).filter((k) => k !== 'anonyme' || g.round > 1));
    if (g.trio === 'capitaine') g.captain = pick(g.players);
    if (g.trio === 'muet') g.mute = pick(g.players);
    if (g.trio === 'proprio') { const o = shuffle(g.players); g.modules.forEach((m, k) => { m.owner = o[k % 3]; }); }
  }
  // fiches du manuel, mélangées puis distribuées : personne n'a tout
  let cards = shuffle(g.modules.flatMap((m) => m.cards.map((c) => ({ ...c, mod: m.label, owner: m.owner }))));
  if (g.trio === 'anonyme') cards = cards.map((c, k) => ({ ...c, title: `🃏 Fiche mystère n°${k + 1}`, mod: '?' }));
  g.hands = Object.fromEntries(g.players.map((id) => [id, []]));
  const readers = g.captain ? g.players.filter((id) => id !== g.captain) : g.players;
  const ids = shuffle(readers);
  if (g.trio === 'proprio') {
    // jamais les fiches de son propre module : on les donne au moins chargé des deux autres
    for (const c of cards) {
      const others = ids.filter((id) => id !== c.owner).sort((a, b) => g.hands[a].length - g.hands[b].length);
      g.hands[others[0]].push(c);
    }
  } else cards.forEach((c, k) => g.hands[ids[k % ids.length]].push(c));
  ids.forEach((id) => { if (!g.hands[id].length) g.hands[id].push(pick(cards)); });
  for (const id of g.players) g.hands[id] = g.hands[id].map(({ owner, ...c }) => c);
  g.order = ids;
  g.strikes = 0;
  g.maxStrikes = L.strikes + (g.level === 'normal' && nP >= 6 ? 1 : 0);
  const secs = g.modules.reduce((sum, m) => sum + L.perMod[i] + (m.hard ? L.hardBonus : 0), 0);
  g.rem = secs * 1000; g.remAt = now; g.rate = 1;
  g.log = [];
  g.phase = 'bomb';
  g.result = null;
  armTimer(ctx, g);
  if (g.twist === 'tournant') rotateLater(ctx, g);
}

// 🔀 piège « fiches tournantes » : toutes les 60 s, les fiches passent au joueur suivant
function rotateLater(ctx, g) {
  const round = g.round;
  setImmediate(() => ctx.schedule(60000, () => {
    if (g.phase !== 'bomb' || g.round !== round) return;
    const ids = g.order;
    const prev = ids.map((id) => g.hands[id]);
    ids.forEach((id, k) => { g.hands[id] = prev[(k - 1 + ids.length) % ids.length]; });
    g.log.unshift({ t: Date.now(), pid: null, ok: true, what: '🔀 Les fiches ont tourné !' });
    for (const id of g.players) ctx.buzz(id, [60, 40, 60]);
    rotateLater(ctx, g);
  }));
}

const remaining = (g) => Math.max(0, g.rem - (Date.now() - g.remAt) * g.rate);

function armTimer(ctx, g) {
  const stamp = ++g.stamp;
  const ms = remaining(g) / g.rate;
  setImmediate(() => ctx.schedule(ms + 150, () => { if (g.stamp === stamp && g.phase === 'bomb') finish(ctx, g, false, 'time'); }));
}

function strike(ctx, g, pid, what) {
  const L = LEVELS[g.level];
  g.strikes++;
  g.stats[pid].errors++;
  g.rem = Math.max(0, remaining(g) - L.penalty); g.remAt = Date.now(); g.rate *= L.speedUp;
  g.log.unshift({ t: Date.now(), pid, ok: false, what });
  for (const id of g.players) ctx.buzz(id, [300]);
  if (g.twist === 'court') {
    // ⚡ court-circuit : un autre module encore actif est mélangé
    const m = pick(g.modules.filter((x) => !x.solved && ['dial', 'switches', 'symbols', 'code', 'button', 'arrows'].includes(x.type)));
    if (m) {
      if (m.type === 'dial') m.pub.value = rint(0, 9);
      if (m.type === 'switches') m.pub.state = m.pub.state.map(() => Math.random() < 0.5);
      if (m.type === 'symbols') m.pub.done = [];
      if (m.type === 'code') m.pub.entry = '';
      if (m.type === 'button') m.pub.count = 0;
      if (m.type === 'arrows') m.pub.entry = [];
      g.log.unshift({ t: Date.now(), pid: null, ok: false, what: `⚡ Court-circuit : le module ${m.label} est mélangé !` });
    }
  }
  if (g.strikes >= g.maxStrikes || g.rem <= 0) return finish(ctx, g, false, 'strikes');
  armTimer(ctx, g);
}

function solved(ctx, g, m, pid) {
  m.solved = true; m.by = pid; g.lastSolver = pid;
  g.stats[pid].solved++;
  g.log.unshift({ t: Date.now(), pid, ok: true, what: `${m.label} · ${m.name}` });
  ctx.buzz(pid, [40, 40, 40]);
  if (g.modules.every((x) => x.solved)) finish(ctx, g, true);
}

function finish(ctx, g, defused, why) {
  if (g.phase !== 'bomb') return;
  const left = Math.round(remaining(g) / 1000);
  const gains = {};
  const nSolved = g.modules.filter((m) => m.solved).length;
  for (const id of g.players) {
    if (defused) { gain(gains, id, 60 + Math.floor(left / 2), `Bombe désamorcée ! (${left} s restantes) 🎉`); g.stats[id].defused++; }
    else if (nSolved) gain(gains, id, nSolved * 8, `${nSolved} module${nSolved > 1 ? 's' : ''} désamorcé${nSolved > 1 ? 's' : ''} par l'équipe`);
  }
  for (const m of g.modules) if (m.solved && m.by && g.players.includes(m.by)) gain(gains, m.by, 15, `A désamorcé le module ${m.label} (${m.name})`);
  for (const e of g.log) if (!e.ok && g.players.includes(e.pid)) gain(gains, e.pid, -8, `Erreur : ${e.what}`);
  applyGains(g.scores, gains);
  g.result = { defused, why, left, gains, solved: nSolved };
  g.phase = 'boom';
  g.stamp++;
}

function onAction(ctx, g, pid, type, p, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  if (type === 'next' && isHost) {
    if (g.phase === 'intro') return startRound(ctx, g);
    if (g.phase === 'bomb') return finish(ctx, g, false, 'stop');
    if (g.phase === 'boom') {
      if (g.round >= g.totalRounds) {
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['solved', 'Artificier', '🧯', 'a désamorcé le plus de modules'],
          ['errors', 'Main qui tremble', '💥', 'a fait le plus d\'erreurs'],
        ]);
        ctx.endGame(g.scores);
      } else startRound(ctx, g);
    }
    return;
  }
  if (g.phase !== 'bomb' || !g.players.includes(pid)) return;
  const m = g.modules.find((x) => x.label === p?.m);
  if (!m || m.solved) return;
  // règles à 3 (si le joueur concerné est parti, la règle saute pour ne pas bloquer la bombe)
  const here = (id) => ctx.connected().some((x) => x.id === id);
  if (g.trio === 'capitaine' && pid !== g.captain && here(g.captain)) return { error: `🧑‍✈️ Seul le capitaine (${ctx.player(g.captain)?.name || '?'}) touche la bombe : guide-le !` };
  if (g.trio === 'proprio' && m.owner && pid !== m.owner && here(m.owner)) return { error: `🔒 Le module ${m.label} est à ${ctx.player(m.owner)?.name || '?'} : guide-le !` };
  if (g.trio === 'relais') {
    const first = g.modules.find((x) => !x.solved);
    if (first && first.label !== m.label) return { error: `🏃 Relais : d'abord le module ${first.label} !` };
    if (g.lastSolver && pid === g.lastSolver && here(g.lastSolver) && g.players.filter(here).length > 1) return { error: '🏃 Relais : tu viens de désamorcer, passe la main !' };
  }
  const i = Math.floor(Number(p.i));
  if (m.type === 'wires' && type === 'cut') {
    const w = m.pub.list[i];
    if (!w || w.cut) return;
    w.cut = true;
    if (m.sol.order) {               // câbles multiples : tous, dans l'ordre
      m.done = m.done || [];
      const next = m.sol.order[m.done.length];
      if (m.sol.order.includes(i)) m.done.push(i);
      if (i !== next) strike(ctx, g, pid, `${m.label} · ${m.sol.order.includes(i) ? 'mauvais ordre' : 'câble sans danger coupé'}`);
      if (g.phase === 'bomb' && m.sol.order.every((k) => m.pub.list[k].cut)) solved(ctx, g, m, pid);
    } else if (i === m.sol.target) solved(ctx, g, m, pid);
    else strike(ctx, g, pid, `${m.label} · mauvais câble`);
  } else if (m.type === 'dial' && type === 'dial') {
    m.pub.value = (m.pub.value + (Number(p.d) > 0 ? 1 : 9)) % 10;
  } else if (m.type === 'dial' && type === 'ok') {
    if (m.pub.value === m.sol.code) solved(ctx, g, m, pid); else strike(ctx, g, pid, `${m.label} · mauvais chiffre (${m.pub.value})`);
  } else if (m.type === 'symbols' && type === 'sym') {
    if (i < 0 || i >= m.pub.glyphs.length || m.pub.done.includes(i)) return;
    const gi = GLYPHS.findIndex((x) => x[0] === m.pub.glyphs[i]);
    if (m.sol.set ? m.sol.set.includes(gi) : m.sol.order[m.pub.done.length] === gi) {
      m.pub.done.push(i);
      if (m.pub.done.length === m.sol.order.length) solved(ctx, g, m, pid);
    } else { m.pub.done = []; strike(ctx, g, pid, `${m.label} · mauvais symbole`); }
  } else if (m.type === 'button' && type === 'press') {
    if (m.pub.mode === 'timer') {
      const digits = (ms) => { const t = Math.ceil(ms / 1000); return `${Math.floor(t / 60)}${String(t % 60).padStart(2, '0')}`; };
      const r = remaining(g);
      if (digits(r).includes(String(m.sol.d)) || digits(r + 350 * g.rate).includes(String(m.sol.d))) solved(ctx, g, m, pid);
      else strike(ctx, g, pid, `${m.label} · bouton au mauvais moment`);
    } else if (m.pub.count < 20) m.pub.count++;
  } else if (m.type === 'button' && type === 'clear') {
    m.pub.count = 0;
  } else if (m.type === 'button' && type === 'ok') {
    if (m.pub.count === m.sol.n) solved(ctx, g, m, pid);
    else { const c = m.pub.count; m.pub.count = 0; strike(ctx, g, pid, `${m.label} · ${c} appui${c > 1 ? 's' : ''}, mauvais compte`); }
  } else if (m.type === 'arrows' && type === 'arrow') {
    if (ARROWS.includes(p.d) && m.pub.entry.length < m.pub.len) m.pub.entry.push(p.d);
  } else if (m.type === 'arrows' && type === 'clear') {
    m.pub.entry = [];
  } else if (m.type === 'arrows' && type === 'ok') {
    if (m.pub.entry.join('') === m.sol.seq.join('')) solved(ctx, g, m, pid);
    else { m.pub.entry = []; strike(ctx, g, pid, `${m.label} · mauvaise séquence`); }
  } else if (m.type === 'thermo' && type === 'ok' && m.pub.mode === 'chrono') {
    // secondes affichées (arrondies au-dessus), avec une petite tolérance pour la latence
    const r = remaining(g);
    const sec = (ms) => Math.ceil(ms / 1000) % 10;
    if (sec(r) === m.sol.x || sec(r + 350 * g.rate) === m.sol.x) solved(ctx, g, m, pid);
    else strike(ctx, g, pid, `${m.label} · mauvais moment (…${sec(r)} s)`);
  } else if (m.type === 'code' && type === 'key') {
    const d = Math.floor(Number(p.d));
    if (d >= 0 && d <= 9 && m.pub.entry.length < 4) m.pub.entry += String(d);
  } else if (m.type === 'code' && type === 'clear') {
    m.pub.entry = '';
  } else if (m.type === 'code' && type === 'ok') {
    if (m.pub.entry === m.sol.code) solved(ctx, g, m, pid);
    else { const e = m.pub.entry; m.pub.entry = ''; strike(ctx, g, pid, `${m.label} · mauvais code (${e || 'vide'})`); }
  } else if (m.type === 'thermo' && type === 'ok') {
    const { seq, period, t0 } = m.pub;
    const el = Date.now() - t0, k = Math.floor(el / period);
    const now = seq[k % seq.length], prev = seq[(k - 1 + seq.length) % seq.length];
    // petite tolérance : on accepte la valeur d'avant si elle vient tout juste de changer (latence réseau)
    if (m.sol.ok(now) || (el - k * period < 400 && m.sol.ok(prev))) solved(ctx, g, m, pid);
    else strike(ctx, g, pid, `${m.label} · mauvaise température (${now})`);
  } else if (m.type === 'switches' && type === 'sw') {
    if (i >= 0 && i < m.pub.state.length) m.pub.state[i] = !m.pub.state[i];
  } else if (m.type === 'switches' && type === 'ok') {
    if (m.pub.state.every((v, k) => v === m.sol.target[k])) solved(ctx, g, m, pid);
    else strike(ctx, g, pid, `${m.label} · mauvaise position`);
  }
}

function stateFor(ctx, g, pid) {
  const s = {
    phase: g.phase, round: g.round, totalRounds: g.totalRounds, scores: g.scores, level: g.level,
    participants: Object.keys(g.scores), players: g.players || [], now: Date.now(),
  };
  if (g.modules) {
    s.bomb = {
      ...g.props, strikes: g.strikes, maxStrikes: g.maxStrikes, rem: remaining(g), rate: g.rate,
      twist: g.twist ? { id: g.twist, ...TWISTS[g.twist] } : null,
      trio: g.trio ? { id: g.trio, ...TRIO[g.trio], captain: g.captain, mute: g.mute, last: g.lastSolver } : null,
      modules: g.modules.map((m) => ({ label: m.label, type: m.type, name: m.name, hard: !!m.hard, owner: m.owner || null, solved: m.solved, by: m.by, pub: m.pub })),
    };
    s.hand = pid && g.hands ? g.hands[pid] || [] : [];
    s.handCount = g.hands ? Object.fromEntries(Object.entries(g.hands).map(([k, v]) => [k, v.length])) : {};
    s.log = (g.log || []).slice(0, 6);
    s.me = pid ? (g.players.includes(pid) ? 'in' : 'wait') : null;
  }
  if (g.phase === 'boom' && g.modules) {
    s.result = g.result;
    // solutions révélées après l'explosion (ou le désamorçage)
    s.solutions = g.modules.map((m) => ({
      label: m.label, name: m.name,
      text: m.sol.text ? m.sol.text : m.type === 'wires' ? `couper le câble n°${m.sol.target + 1} (${m.pub.list[m.sol.target].c}${m.pub.list[m.sol.target].s ? ' rayé' : ''})`
        : m.type === 'dial' ? `le chiffre ${m.sol.code}`
          : m.type === 'symbols' ? m.sol.order.map((i) => GLYPHS[i][0]).join(' → ')
            : m.type === 'switches' ? m.sol.target.map((v) => (v ? '⬆' : '⬇')).join(' ')
              : 'valider au bon moment',
    }));
  }
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'demineur',
  color: '#ff7a1a',
  name: 'Le Démineur',
  emoji: '💣',
  tagline: 'En équipe : désamorcez la bombe… chacun n\'a qu\'un bout du manuel !',
  description: 'Jeu coopératif contre la montre : la bombe a plusieurs modules, le manuel est découpé entre les joueurs. Parlez-vous, vite !',
  minPlayers: 2,
  maxPlayers: 10,
  duration: '15–20 min',
  options: [
    { key: 'trio', label: 'Règles spéciales à 3 joueurs', default: 'on', choices: [
      { value: 'on', label: 'Oui 🎲', hint: 'À 3 joueurs, chaque bombe tire une règle : chacun ses modules, relais, capitaine, muet, fiches anonymes' },
      { value: 'off', label: 'Non', hint: 'Règles normales même à 3' },
    ] },
    { key: 'level', label: 'Difficulté', default: 'normal', choices: [
      { value: 'normal', label: 'Normal', hint: '3 erreurs permises, 3 à 5 modules' },
      { value: 'expert', label: 'Expert 💀', hint: '2 erreurs, moins de temps, pièges en plus, chrono plus rapide' },
    ] },
  ],
  create,
  onAction,
  stateFor,
  _test: { TRIO, MAKERS, VARIANTS, makeProps, serialInfo, GLYPHS, LEVELS, ARROWS },
};
