// ─────────────────────────────────────────────────────────────────────────────
// 🎨 Dessin en chaîne
// Chacun écrit une phrase. Le suivant la dessine, le suivant devine le dessin,
// le suivant dessine la devinette… Chaque phrase devient une chaîne.
// À la fin, on feuillette les chaînes ensemble et on distribue des cœurs.
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, applyGains, gain, awards, active, initScores } = require('./_utils');

const MAX_STEPS = 10;                       // au-delà, les chaînes deviennent trop longues
const TIME = { text: 45000, draw: 90000, guess: 40000 }; // durée de chaque étape (ms)
const PTS = { HEART: 100 };
const MAX_IMG = 450000;                     // taille max d'un dessin (data URL)

// Type d'étape : 0 = écrire la phrase de départ, puis dessiner / deviner en alternance
const stepType = (k) => (k === 0 ? 'text' : k % 2 === 1 ? 'draw' : 'guess');

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['hearts', 'heartsDraw', 'heartsGuess']);
  const order = shuffle(Object.keys(scores));
  const n = order.length;
  const g = {
    scores, stats, order, n,
    steps: Math.min(n, MAX_STEPS),
    chains: Array.from({ length: n }, () => []), // chains[c][k] = { pid, type, content, auto }
    step: -1,
    phase: 'play',
    hearts: {},                                  // "c:k" → [pid…]
  };
  startStep(ctx, g, 0);
  return g;
}

// À l'étape k, le joueur d'indice i travaille sur la chaîne (i + k) % n
const chainOf = (g, pid, k = g.step) => (g.order.indexOf(pid) + k) % g.n;
const authorOf = (g, c, k) => g.order[((c - k) % g.n + g.n) % g.n];

function startStep(ctx, g, k) {
  g.step = k;
  g.type = stepType(k);
  g.deadline = Date.now() + TIME[g.type];
  const step = k;
  // le minuteur est lancé au tour suivant de la boucle (la partie doit être enregistrée)
  setImmediate(() => ctx.schedule(TIME[g.type] + 1500, () => { if (g.phase === 'play' && g.step === step) endStep(ctx, g); }));
}

const done = (g, pid) => !!g.chains[chainOf(g, pid)][g.step];

// Complète les cases manquantes (joueur absent ou trop lent) pour que la chaîne continue
function fillMissing(g) {
  for (let c = 0; c < g.n; c++) {
    if (g.chains[c][g.step]) continue;
    const pid = authorOf(g, c, g.step);
    if (g.type === 'draw') g.chains[c][g.step] = { pid, type: 'draw', content: null, auto: true };
    else {
      // pas de réponse : on reprend la dernière phrase de la chaîne pour que le suivant ait quelque chose
      const lastText = [...g.chains[c]].reverse().find((e) => e && e.type !== 'draw' && e.content);
      g.chains[c][g.step] = { pid, type: g.type, content: lastText ? lastText.content : 'Un chat qui fait du ski', auto: true };
    }
  }
}

function endStep(ctx, g) {
  fillMissing(g);
  if (g.step + 1 < g.steps) startStep(ctx, g, g.step + 1);
  else {
    g.phase = 'album';
    g.album = { chain: 0, shown: 1 };
    g.deadline = null;
  }
}

function autoAdvance(ctx, g) {
  if (g.phase !== 'play') return;
  const act = active(ctx, g);
  if (act.length && act.every((p) => done(g, p.id))) endStep(ctx, g);
}

function finish(ctx, g) {
  const gains = {};
  for (const [key, pids] of Object.entries(g.hearts)) {
    const [c, k] = key.split(':').map(Number);
    const e = g.chains[c][k];
    if (!e || !pids.length) continue;
    for (const from of pids) {
      gain(gains, e.pid, PTS.HEART, 'Cœur reçu');
      g.stats[e.pid].hearts++;
      g.stats[e.pid][e.type === 'draw' ? 'heartsDraw' : 'heartsGuess']++;
    }
  }
  applyGains(g.scores, gains);
  g.phase = 'end';
  g.awards = awards(g.stats, [
    ['hearts', 'Coup de cœur', '❤️', 'a reçu le plus de cœurs'],
    ['heartsDraw', 'Picasso', '🎨', 'a fait les dessins les plus aimés'],
    ['heartsGuess', 'Interprète', '🔎', 'a fait les devinettes les plus aimées'],
  ]);
  ctx.endGame(g.scores);
}

function onAction(ctx, g, pid, type, payload, { isHost }) {
  if (!(pid in g.scores)) return { error: 'Tu ne participes pas à cette partie' };

  if (type === 'submit') {
    if (g.phase !== 'play') return;
    const c = chainOf(g, pid);
    if (g.chains[c][g.step]) return; // déjà rendu
    if (g.type === 'draw') {
      const img = typeof payload === 'string' && payload.length < MAX_IMG && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(payload) ? payload : null;
      g.chains[c][g.step] = { pid, type: 'draw', content: img };
    } else {
      const text = String(payload || '').trim().replace(/\s+/g, ' ').slice(0, 100);
      if (!text) {
        // envoi automatique à la fin du temps sans rien écrit : on laisse fillMissing s'en charger
        return;
      }
      g.chains[c][g.step] = { pid, type: g.type, content: text };
    }
    return autoAdvance(ctx, g);
  }

  if (type === 'heart') {
    if (g.phase !== 'album') return;
    const { chain, step } = payload || {};
    const e = g.chains[chain]?.[step];
    if (!e || e.pid === pid || chain !== g.album.chain || step >= g.album.shown) return;
    const key = `${chain}:${step}`;
    const list = g.hearts[key] || (g.hearts[key] = []);
    const i = list.indexOf(pid);
    if (i >= 0) list.splice(i, 1); else list.push(pid); // re-toucher retire le cœur
    return;
  }

  if (type === 'next' && isHost) {
    if (g.phase === 'play') return endStep(ctx, g);            // passer l'étape (retardataires)
    if (g.phase === 'album') {
      const a = g.album;
      if (a.shown < g.chains[a.chain].length) a.shown++;       // carte suivante de la chaîne
      else if (a.chain + 1 < g.n) g.album = { chain: a.chain + 1, shown: 1 }; // chaîne suivante
      else finish(ctx, g);
    }
  }
}

function stateFor(ctx, g, pid) {
  const act = active(ctx, g);
  const s = {
    phase: g.phase, scores: g.scores, participants: g.order,
    step: g.step, steps: g.steps, type: g.type,
    remaining: g.deadline ? Math.max(0, g.deadline - Date.now()) : 0,
  };
  if (g.phase === 'play' && pid in g.scores) {
    const c = chainOf(g, pid);
    s.done = done(g, pid);
    s.prev = g.step > 0 ? g.chains[c][g.step - 1] : null; // ce qu'il faut dessiner / deviner
    s.finished = act.filter((p) => done(g, p.id)).map((p) => p.id);
    s.needed = act.length;
  } else if (g.phase === 'play') { // écran partagé : seulement l'avancement
    s.finished = act.filter((p) => done(g, p.id)).map((p) => p.id);
    s.needed = act.length;
  }
  if (g.phase === 'album') {
    const a = g.album;
    s.album = {
      chain: a.chain, chains: g.n, shown: a.shown, length: g.chains[a.chain].length,
      owner: g.chains[a.chain][0]?.pid,
      entries: g.chains[a.chain].slice(0, a.shown).map((e, k) => ({
        ...e, step: k, hearts: (g.hearts[`${a.chain}:${k}`] || []).length, mine: (g.hearts[`${a.chain}:${k}`] || []).includes(pid),
      })),
    };
  }
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'dessin',
  color: '#35c2f0',
  name: 'Dessin en chaîne',
  emoji: '🎨',
  tagline: 'Dessine, devine, redessine… et regarde le message dériver.',
  description: "Chaque phrase passe de main en main : dessinée, devinée, redessinée. À la fin, on feuillette les chaînes.",
  minPlayers: 3,
  maxPlayers: 10,
  duration: '15–25 min',
  create,
  onAction,
  onPlayersChanged: autoAdvance,
  stateFor,
};
