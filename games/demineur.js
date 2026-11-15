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

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

const LEVELS = {
  normal: { modules: [3, 4, 5], time: [270, 330, 390], strikes: 3, penalty: 20000, speedUp: 1.2 },
  expert: { modules: [4, 5, 5], time: [240, 280, 320], strikes: 2, penalty: 30000, speedUp: 1.3 },
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

const MAKERS = { wires, dial, symbols, thermo, switches };

// ═══ Partie ═══
function create(ctx) {
  const { scores, stats } = initScores(ctx, ['solved', 'errors', 'defused']);
  const level = ctx.option('level') === 'expert' ? 'expert' : 'normal';
  const n = ctx.rounds(3);
  return { scores, stats, level, round: 0, totalRounds: Math.min(3, n), phase: 'intro', stamp: 0, result: null };
}

function startRound(ctx, g) {
  g.round++;
  const L = LEVELS[g.level], expert = g.level === 'expert';
  const i = Math.min(2, g.round - 1);
  const props = makeProps();
  const now = Date.now();
  const types = shuffle(Object.keys(MAKERS)).slice(0, L.modules[i]);
  g.props = props;
  g.modules = types.map((t, k) => ({ ...MAKERS[t](props, expert, now), label: 'ABCDE'[k], solved: false, by: null }));
  g.players = active(ctx, g).map((p) => p.id);
  // fiches du manuel, mélangées puis distribuées : personne n'a tout
  const cards = shuffle(g.modules.flatMap((m) => m.cards.map((c) => ({ ...c, mod: m.label }))));
  g.hands = Object.fromEntries(g.players.map((id) => [id, []]));
  const ids = shuffle(g.players);
  cards.forEach((c, k) => g.hands[ids[k % ids.length]].push(c));
  ids.forEach((id) => { if (!g.hands[id].length) g.hands[id].push(pick(cards)); });
  g.strikes = 0;
  g.maxStrikes = L.strikes;
  g.rem = L.time[i] * 1000; g.remAt = now; g.rate = 1;
  g.log = [];
  g.phase = 'bomb';
  g.result = null;
  armTimer(ctx, g);
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
  if (g.strikes >= g.maxStrikes || g.rem <= 0) return finish(ctx, g, false, 'strikes');
  armTimer(ctx, g);
}

function solved(ctx, g, m, pid) {
  m.solved = true; m.by = pid;
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
  const i = Math.floor(Number(p.i));
  if (m.type === 'wires' && type === 'cut') {
    const w = m.pub.list[i];
    if (!w || w.cut) return;
    w.cut = true;
    if (i === m.sol.target) solved(ctx, g, m, pid);
    else strike(ctx, g, pid, `${m.label} · mauvais câble`);
  } else if (m.type === 'dial' && type === 'dial') {
    m.pub.value = (m.pub.value + (Number(p.d) > 0 ? 1 : 9)) % 10;
  } else if (m.type === 'dial' && type === 'ok') {
    if (m.pub.value === m.sol.code) solved(ctx, g, m, pid); else strike(ctx, g, pid, `${m.label} · mauvais chiffre (${m.pub.value})`);
  } else if (m.type === 'symbols' && type === 'sym') {
    if (i < 0 || i >= m.pub.glyphs.length || m.pub.done.includes(i)) return;
    if (m.sol.order[m.pub.done.length] === GLYPHS.findIndex((x) => x[0] === m.pub.glyphs[i])) {
      m.pub.done.push(i);
      if (m.pub.done.length === m.pub.glyphs.length) solved(ctx, g, m, pid);
    } else { m.pub.done = []; strike(ctx, g, pid, `${m.label} · mauvais symbole`); }
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
      modules: g.modules.map((m) => ({ label: m.label, type: m.type, name: m.name, solved: m.solved, by: m.by, pub: m.pub })),
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
      text: m.type === 'wires' ? `couper le câble n°${m.sol.target + 1} (${m.pub.list[m.sol.target].c}${m.pub.list[m.sol.target].s ? ' rayé' : ''})`
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
  maxPlayers: 8,
  duration: '15 min',
  options: [
    { key: 'level', label: 'Difficulté', default: 'normal', choices: [
      { value: 'normal', label: 'Normal', hint: '3 erreurs permises, 3 à 5 modules' },
      { value: 'expert', label: 'Expert 💀', hint: '2 erreurs, moins de temps, pièges en plus, chrono plus rapide' },
    ] },
  ],
  create,
  onAction,
  stateFor,
  _test: { MAKERS, makeProps, serialInfo, GLYPHS },
};
