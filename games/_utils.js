// Outils partagés par les modules de jeu
const shuffle = (a) => {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const sample = (a, n) => shuffle(a).slice(0, n);

// "Éléphants " → "elephant" (sans accents, minuscules, pluriel simple retiré)
const normalize = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '')
  .replace(/(s|x)$/, '');

// Ajoute des points avec une raison affichée au joueur
function gain(gains, pid, pts, label) {
  if (!gains[pid]) gains[pid] = { total: 0, reasons: [] };
  gains[pid].total += pts;
  gains[pid].reasons.push({ pts, label });
}

function applyGains(scores, gains) {
  for (const [pid, x] of Object.entries(gains)) if (pid in scores) scores[pid] += x.total;
}

// Trophées de fin : le(s) meilleur(s) sur une statistique
function awards(stats, defs) {
  const ids = Object.keys(stats);
  return defs.map(([key, title, emoji, desc]) => {
    const max = Math.max(0, ...ids.map((id) => stats[id][key] || 0));
    if (max <= 0) return null;
    return { title, emoji, desc, value: max, winners: ids.filter((id) => (stats[id][key] || 0) === max) };
  }).filter(Boolean);
}

// Participants de la partie encore connectés
const active = (ctx, g) => ctx.connected().filter((p) => p.id in g.scores);

const initScores = (ctx, statKeys) => {
  const scores = {}, stats = {};
  for (const p of ctx.players()) { // tous, même un téléphone en veille : il pourra revenir
    scores[p.id] = 0;
    stats[p.id] = Object.fromEntries(statKeys.map((k) => [k, 0]));
  }
  return { scores, stats };
};

module.exports = { shuffle, sample, normalize, gain, applyGains, awards, active, initScores };
