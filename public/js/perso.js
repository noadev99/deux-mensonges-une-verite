// ─────────────────────────────────────────────────────────────────────────────
// 😀 Bouille personnalisable : un rond coloré dessiné, on choisit le visage.
// look = { col, eyes, mouth, acc } (des numéros : on prend le reste de la
// division par la taille de chaque liste)
// ─────────────────────────────────────────────────────────────────────────────
const PERSO = (() => {
  const INK = '#1a0f2e';
  const COLS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7', '#748ffc', '#da77f2', '#f783ac', '#a9e34b', '#ffffff', '#c8a165'];
  const NAMES = {
    eyes: ['Points', 'Gros yeux', 'Endormi', 'Cyclope', 'Lunettes', 'Clin d\'œil', 'Sourcils froncés', 'Étoiles'],
    mouth: ['Sourire', 'Bouche ouverte', 'Grand sourire', 'Oh !', 'Langue tirée', 'En coin'],
    acc: ['Rien', 'Joues roses', 'Antenne', 'Nœud', 'Moustache', 'Cornes', 'Taches de rousseur', 'Haut-de-forme'],
  };
  const SIZES = { col: COLS.length, eyes: NAMES.eyes.length, mouth: NAMES.mouth.length, acc: NAMES.acc.length };
  const KEYS = ['col', 'eyes', 'mouth', 'acc'];
  const mod = (n, m) => ((Number(n) || 0) % m + m) % m;
  const norm = (look = {}) => Object.fromEntries(KEYS.map((k) => [k, mod(look?.[k], SIZES[k])]));
  const random = () => Object.fromEntries(KEYS.map((k) => [k, Math.floor(Math.random() * SIZES[k])]));
  const label = (key, n) => NAMES[key]?.[mod(n, SIZES[key])] ?? '';
  const color = (look) => COLS[norm(look).col];

  // le visage dessiné (le rond coloré est le fond de la pastille .av)
  const head = (look) => {
    const l = norm(look);
    const { EYES, MOUTHS, EXTRAS } = ICONS.parts;
    return `<svg class="face" viewBox="0 0 40 40" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${EXTRAS[l.acc]}${EYES[l.eyes]}${MOUTHS[l.mouth]}</svg>`;
  };

  return { KEYS, SIZES, COLS, norm, random, label, color, head };
})();
