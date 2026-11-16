// ─────────────────────────────────────────────────────────────────────────────
// 🚩 La Course au drapeau — on SECOUE son téléphone pour faire courir son perso.
// Le téléphone mesure la force des secousses (accéléromètre) et envoie l'énergie
// au serveur plusieurs fois par seconde ; le serveur fait avancer chacun (avec
// une vitesse maximale, pour éviter la triche) et renvoie l'état 4 fois par seconde.
// 3 manches, 3 façons de courir :
//   🏃 Le sprint     — le premier au drapeau gagne
//   🚦 Feu rouge     — on ne secoue qu'au vert ; secouer au rouge renvoie au départ
//   🧗 Le mât        — on grimpe au mât… et on glisse dès qu'on s'arrête
// ─────────────────────────────────────────────────────────────────────────────
const { gain, applyGains, awards, active, initScores, practiceReady, allReady } = require('./_utils');

const MODES = [
  { id: 'sprint', name: 'Le sprint', emoji: '🏃', len: 420, speed: 0.75, hint: 'Secoue comme un fou jusqu\'au drapeau !' },
  { id: 'feu', name: 'Feu rouge, feu vert', emoji: '🚦', len: 300, speed: 0.75, hint: 'Secoue au vert, STOP au rouge… sinon retour au départ !' },
  { id: 'mat', name: 'Le mât savonné', emoji: '🧗', len: 380, speed: 0.75, hint: 'Grimpe au mât… dès que tu t\'arrêtes, tu glisses !' },
];
const PLACE_PTS = [8, 5, 3, 2, 1];
const MAX_RATE = 32;        // énergie maximale par seconde (une secousse très forte ≈ 20–30)
const TICK = 250;           // le serveur renvoie l'état 4 fois par seconde
const COUNTDOWN = 3500;
const LIMIT = 120000;       // manche arrêtée au bout de 2 min

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['wins', 'energy', 'caught']);
  const n = ctx.rounds(MODES.length);
  return { scores, stats, round: 0, totalRounds: n, modes: MODES.slice(0, n), phase: 'intro', stamp: 0 };
}

// entraînement : une petite piste qui recommence à chaque drapeau, rien ne compte
const PRACTICE = { id: 'sprint', name: 'Entraînement', emoji: '🎯', len: 150, speed: 0.75, hint: 'Secoue pour essayer ! Ton perso repart au début à chaque drapeau.' };
function startPractice(ctx, g) {
  g.practice = true;
  g.ready = [];
  g.laps = {};
  setupRace(ctx, g, PRACTICE);
}

function startRound(ctx, g) {
  g.practice = false;
  g.ready = [];
  g.round++;
  setupRace(ctx, g, g.modes[g.round - 1]);
}

function setupRace(ctx, g, mode) {
  g.mode = mode;
  g.players = active(ctx, g).map((p) => p.id);
  g.pos = Object.fromEntries(g.players.map((id) => [id, 0]));
  g.budget = {};           // anti-triche : énergie encore autorisée pour chaque joueur
  g.last = {};
  g.rate = {};             // énergie récente (pour l'affichage de la jauge)
  g.finished = [];
  g.times = {};
  g.caughtAt = {};
  g.result = null;
  g.phase = 'race';
  g.goAt = Date.now() + COUNTDOWN;
  g.light = 'green'; g.lightAt = g.goAt; g.lightUntil = g.goAt + 2500 + Math.random() * 1500;
  const stamp = ++g.stamp;
  const tick = () => {
    if (g.stamp !== stamp || g.phase !== 'race') return;
    step(ctx, g);
    if (g.phase === 'race') ctx.schedule(TICK, tick, soft);
  };
  const soft = () => g.phase === 'race' && g.stamp === stamp;   // manche toujours en cours : simple mise à jour
  setImmediate(() => ctx.schedule(TICK, tick, soft));
}

function step(ctx, g) {
  const now = Date.now();
  if (now < g.goAt) return;
  const dt = TICK / 1000;
  if (g.mode.id === 'mat') {
    // on glisse le long du mât si on ne secoue plus assez
    for (const id of g.players) if (!g.finished.includes(id)) {
      const r = g.rate[id] || 0;
      if (r < 6) g.pos[id] = Math.max(0, g.pos[id] - (6 - r) * 1.6 * dt);
    }
  }
  if (g.mode.id === 'feu' && now > g.lightUntil) {
    // rythme imprévisible : vert très court ou très long, orange parfois éclair, rouge plus ou moins long
    const r = Math.random();
    if (g.light === 'green') { g.light = 'orange'; g.lightUntil = now + (Math.random() < 0.3 ? 350 + Math.random() * 200 : 650 + Math.random() * 500); }
    else if (g.light === 'orange') { g.light = 'red'; g.lightUntil = now + 1000 + Math.random() * 3500; }
    else { g.light = 'green'; g.lightUntil = now + (r < 0.25 ? 700 + Math.random() * 800 : r < 0.75 ? 2000 + Math.random() * 2500 : 4500 + Math.random() * 3500); }
    g.lightAt = now;
  }
  for (const id of g.players) g.rate[id] = (g.rate[id] || 0) * 0.5;   // la jauge retombe si on arrête
  if (g.practice) return;
  const need = Math.min(3, Math.max(1, g.players.length - 1));
  if (g.finished.length >= need || g.finished.length >= active(ctx, g).filter((p) => g.players.includes(p.id)).length || now - g.goAt > LIMIT) finishRound(ctx, g);
}

function finishRound(ctx, g) {
  if (g.phase !== 'race') return;
  const ranking = [...g.finished, ...g.players.filter((id) => !g.finished.includes(id)).sort((a, b) => g.pos[b] - g.pos[a])];
  const gains = {};
  // points aux premiers arrivés ; si le temps est écoulé, aux plus avancés
  ranking.forEach((id, i) => {
    if (!PLACE_PTS[i] || !(g.pos[id] > 0)) return;
    const done = g.finished.includes(id);
    gain(gains, id, PLACE_PTS[i], done ? (i === 0 ? `Premier au drapeau ${g.mode.emoji}` : `${i + 1}ᵉ au drapeau`) : `${i + 1}ᵉ (le plus avancé à la fin du temps)`);
  });
  if (g.finished[0]) g.stats[g.finished[0]].wins++;
  applyGains(g.scores, gains);
  g.result = { ranking, finished: g.finished.slice(), times: { ...g.times }, pos: { ...g.pos }, gains };
  g.phase = 'roundEnd';
  g.stamp++;
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };
  if (type === 'shake') {
    if (g.phase !== 'race' || !g.players.includes(pid) || g.finished.includes(pid)) return { quiet: true };
    const now = Date.now();
    if (now < g.goAt) return { quiet: true };
    // budget : MAX_RATE par seconde écoulée, avec une petite réserve (1 s)
    const since = Math.min(1, (now - (g.last[pid] || g.goAt)) / 1000);
    g.last[pid] = now;
    g.budget[pid] = Math.min(MAX_RATE, (g.budget[pid] ?? MAX_RATE * 0.5) + since * MAX_RATE);
    let e = Math.max(0, Math.min(Number(payload) || 0, g.budget[pid]));
    g.budget[pid] -= e;
    g.rate[pid] = (g.rate[pid] || 0) + e;
    g.stats[pid].energy += e;
    if (g.mode.id === 'feu' && g.light === 'red' && now - g.lightAt > 350 && e > 0.6) {
      // pris en train de bouger au rouge : retour à la case départ !
      g.pos[pid] = 0;
      if (!g.caughtAt[pid] || now - g.caughtAt[pid] > 1200) { g.caughtAt[pid] = now; g.stats[pid].caught++; ctx.buzz(pid, [250]); }
      return { quiet: true };
    }
    g.pos[pid] = Math.min(g.mode.len, g.pos[pid] + e * (g.mode.speed || 1));
    if (g.practice && g.pos[pid] >= g.mode.len) {          // entraînement : on repart au début
      g.pos[pid] = 0;
      g.laps[pid] = (g.laps[pid] || 0) + 1;
      ctx.buzz(pid, [80, 50, 80]);
      return {};
    }
    if (g.pos[pid] >= g.mode.len) {
      g.finished.push(pid);
      g.times[pid] = now - g.goAt;
      ctx.buzz(pid, [80, 50, 80, 50, 200]);
    }
    return { quiet: true };
  }
  if (type === 'ready') { if (practiceReady(ctx, g, pid)) startRound(ctx, g); return; }
  if (type === 'next' && isHost) {
    if (g.phase === 'intro') startPractice(ctx, g);
    else if (g.phase === 'race' && g.practice) startRound(ctx, g);
    else if (g.phase === 'race') finishRound(ctx, g);
    else if (g.phase === 'roundEnd') {
      if (g.round >= g.totalRounds) {
        g.phase = 'end';
        g.awards = awards(g.stats, [
          ['wins', 'Champion du drapeau', '🚩', 'a gagné le plus de manches'],
          ['energy', 'Shaker humain', '📳', 'a secoué le plus fort'],
          ['caught', 'Daltonien', '🚨', 's\'est fait prendre au feu rouge le plus souvent'],
        ]);
        ctx.endGame(g.scores);
      } else startRound(ctx, g);
    }
  }
}

function stateFor(ctx, g, pid) {
  const now = Date.now();
  const s = {
    phase: g.phase, round: g.round, totalRounds: g.totalRounds, scores: g.scores,
    participants: Object.keys(g.scores), modes: g.modes,
    mode: g.mode || g.modes[0], players: g.players || [],
    goIn: g.goAt ? Math.max(0, g.goAt - now) : 0,
    pos: g.pos || {}, finished: g.finished || [],
    rate: g.rate ? Object.fromEntries(Object.entries(g.rate).map(([k, v]) => [k, Math.round(v * 10) / 10])) : {},
    light: g.mode?.id === 'feu' ? g.light : null,
    caught: g.caughtAt ? Object.keys(g.caughtAt).filter((id) => now - g.caughtAt[id] < 1200) : [],
    me: pid && g.players ? (g.players.includes(pid) ? (g.finished.includes(pid) ? 'done' : 'race') : 'wait') : null,
    practice: !!g.practice, ready: g.ready || [], laps: g.practice ? g.laps : {},
  };
  if (g.phase === 'roundEnd') s.result = g.result;
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'drapeau',
  color: '#3fbf8f',
  name: 'La Course au drapeau',
  emoji: '🚩',
  tagline: 'Secoue ton téléphone le plus fort possible pour attraper le drapeau !',
  description: 'Course où l\'on secoue son téléphone pour courir : sprint, feu rouge / feu vert et mât savonné.',
  minPlayers: 2,
  maxPlayers: 12,
  duration: '5 min',
  create,
  onAction,
  onPlayersChanged(ctx, g) { if (g.practice && g.phase === 'race' && allReady(ctx, g)) startRound(ctx, g); },
  stateFor,
  _test: { MODES, MAX_RATE },
};
