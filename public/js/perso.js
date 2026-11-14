// ─────────────────────────────────────────────────────────────────────────────
// 🧍 Perso complet, des pieds à la tête, personnalisable avant d'entrer.
// look = { skin, hairColor, hair, eyes, mouth, acc, top, bottom, shoes, col }
// (des numéros : on prend le reste de la division par la taille de chaque liste)
// ─────────────────────────────────────────────────────────────────────────────
const PERSO = (() => {
  const INK = '#1a0f2e';
  const SKINS = ['#ffdcb8', '#f3c08e', '#d9a066', '#a86b3c', '#6e4527', '#43291a', '#9be15d', '#7ec8ff', '#c9a7ff', '#ff9ec4'];
  const HAIRS = ['#1a0f2e', '#5a3a1e', '#c27a35', '#f2d16b', '#e9e4ef', '#ff5fa2', '#3fa9f5', '#7ae582'];
  const COLS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7', '#748ffc', '#da77f2', '#f783ac', '#ffffff', '#2b2d42'];

  const r = (x, y, w, h, rx, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
  const c = (x, y, rad, fill, extra = '') => `<circle cx="${x}" cy="${y}" r="${rad}" fill="${fill}" ${extra}/>`;
  const pth = (d, fill = 'none', extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
  const sleevesShort = (col) => r(19, 61, 12, 17, 6, col) + r(69, 61, 12, 17, 6, col);
  const sleevesLong = (col, x = 19, w = 12) => r(x, 61, w, 40, 6, col) + r(100 - x - w, 61, w, 40, 6, col);
  const torso = (col) => r(31, 58, 38, 46, 11, col);
  const dots = (pts, fill, rad = 2.2) => pts.map(([x, y]) => c(x, y, rad, fill, 'stroke="none"')).join('');
  const heart = (x, y, fill) => `<text x="${x}" y="${y}" font-size="7" text-anchor="middle" fill="${fill}" stroke="none">♥</text>`;

  // ─── Hauts ───
  const TOPS = [
    ['T-shirt', (k) => torso(k) + sleevesShort(k) + pth('M44 58q6 6 12 0')],
    ['Chemise hawaïenne', () => torso('#ff8a4c') + sleevesShort('#ff8a4c')
      + dots([[38, 68], [60, 72], [43, 86], [62, 92], [37, 98], [55, 100], [24, 70], [75, 70]], '#ffc23d', 3)
      + dots([[38, 68], [60, 72], [43, 86], [62, 92], [37, 98], [55, 100]], '#fff', 1.2) + pth('M43 58l7 9 7-9z', '#fff') + pth('M50 67v36', 'none', 'stroke-width="1.5"')],
    ['Marcel taché', () => pth('M36 58h6q8 10 16 0h6v40q0 6-6 6h-16q-6 0-6-6z', '#fff')
      + `<ellipse cx="56" cy="84" rx="5" ry="3.5" fill="#c8a165" stroke="none"/>` + c(54, 91, 1.5, '#c8a165', 'stroke="none"') + c(45, 76, 2, '#e07a5f', 'stroke="none"')],
    ['Torse nu poilu', () => pth('M41 70q2-2 4 0q2 2 4 0M51 70q2-2 4 0q2 2 4 0M45 79q2-2 4 0q2 2 4 0M47 87q2-2 4 0', 'none', 'stroke-width="1.5"')
      + c(42, 73, 1.4, INK, 'stroke="none"') + c(58, 73, 1.4, INK, 'stroke="none"') + c(50, 97, 1.4, INK, 'stroke="none"')],
    ['Peignoir', (k, s) => sleevesLong('#ff9ec4', 17, 15) + pth('M31 70q0-12 11-12h16q11 0 11 12v70h-38z', '#ff9ec4')
      + pth('M44 58l6 22 6-22z', s) + pth('M48 66q1-1 2 0q1 1 2 0', 'none', 'stroke-width="1.2"') + r(31, 92, 38, 5, 2, '#ff6fa3') + pth('M50 97l-5 12M50 97l4 12', 'none', 'stroke="#ff6fa3" stroke-width="3"')],
    ['Costard cravate', () => sleevesLong('#2b2d42') + torso('#2b2d42') + pth('M42 58l8 17 8-17z', '#fff')
      + pth('M48.5 61h3l1.5 3-1.5 14-1.5 3-1.5-3-1.5-14z', '#f0506e') + c(50, 90, 1.5, '#fff', 'stroke="none"') + c(50, 98, 1.5, '#fff', 'stroke="none"')],
    ['Pull de Noël moche', () => sleevesLong('#d62828') + torso('#d62828')
      + pth('M31 72l4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4', 'none', 'stroke="#fff" stroke-width="2"')
      + pth('M45 82l-4-6M55 82l4-6', 'none', 'stroke="#8b5a2b" stroke-width="2"') + c(50, 88, 6, '#8b5a2b') + c(50, 91, 2.2, '#ff3b3b', 'stroke="none"') + dots([[37, 98], [63, 98], [25, 90], [75, 90]], '#fff', 1.6)],
    ['Crop top (bidou à l\'air)', (k) => r(31, 58, 38, 22, 10, k) + sleevesShort(k) + c(50, 95, 1.4, INK, 'stroke="none"') + pth('M44 90q6 3 12 0', 'none', 'stroke-width="1.2"')],
    ['Maillot de foot', (k) => torso(k) + sleevesShort(k) + pth('M43 58q7 7 14 0', 'none', 'stroke="#fff" stroke-width="3"')
      + `<text x="50" y="92" font-size="15" text-anchor="middle" fill="#fff" stroke="${INK}" stroke-width=".8" font-family="system-ui" font-weight="900">10</text>`],
    ['Costume de banane', () => sleevesShort('#ffe135') + pth('M34 62q16-12 32 0q8 40-6 82q-10 6-20 0q-14-42-6-82z', '#ffe135')
      + pth('M42 70q-4 30 4 66M58 70q4 30-4 66', 'none', 'stroke-width="1.4"') + pth('M45 143q5 5 10 0', '#6b4a1e')],
    ['Gilet jaune', (k) => sleevesShort(k) + torso('#d4ff3a') + r(31, 80, 38, 5, 0, '#cfd3d8') + r(31, 92, 38, 5, 0, '#cfd3d8') + pth('M50 58v46', 'none', 'stroke-width="1.5"')],
    ['Smoking à paillettes', () => sleevesLong('#b48cff') + torso('#b48cff')
      + dots([[36, 66], [44, 74], [60, 68], [64, 84], [38, 90], [56, 96], [47, 86], [24, 76], [76, 80], [25, 94], [75, 66]], '#fff', 1.3)
      + pth('M43 59l7 4-7 4zM57 59l-7 4 7 4z', INK)],
  ];

  // ─── Bas ───
  const BOTTOMS = [
    ['Jean', () => pth('M35 98h30v52h-13l-2-38-2 38h-13z', '#4a6fa5') + pth('M50 100v10', 'none', 'stroke-width="1.4"')],
    ['Short de bain à fleurs', () => pth('M35 98h30v24h-13l-2-10-2 10h-13z', '#35c2f0') + dots([[39, 104], [47, 116], [57, 104], [61, 116], [43, 110]], '#ffc23d', 2) + dots([[52, 110], [38, 117]], '#fff', 1.6)],
    ['Slip léopard', () => pth('M35 98h30v6q-9 2-15 10q-6-8-15-10z', '#e8b04b') + dots([[40, 101], [47, 104], [55, 101], [60, 103], [50, 108]], INK, 1)],
    ['Caleçon à cœurs', () => pth('M35 98h30v18h-13l-2-6-2 6h-13z', '#fff') + heart(40, 106, '#f0506e') + heart(55, 104, '#f0506e') + heart(61, 113, '#f0506e') + heart(45, 114, '#f0506e')],
    ['Tutu rose', () => pth('M35 98h30v6q-9 2-15 10q-6-8-15-10z', '#ff9ec4') + pth('M32 99h36l7 14-6-4-5 5-5-5-5 5-5-5-5 5-5-5-5 5-5-5-6 4z', '#ffc4dc')],
    ['Kilt écossais', () => pth('M34 98h32l4 30h-40z', '#c0392b') + pth('M40 98l-2 30M50 98v30M60 98l2 30M34 108h33M33 118h35', 'none', 'stroke-width="1" opacity=".55"') + r(46, 104, 8, 9, 3, '#8b5a2b')],
    ['Jogging', () => pth('M35 98h30v52h-13l-2-38-2 38h-13z', '#9aa0a6') + pth('M37.5 101v46M62.5 101v46', 'none', 'stroke="#fff" stroke-width="2"') + r(35, 98, 30, 5, 2, '#7d8389')],
    ['Pattes d\'eph', () => pth('M35 98h30l4 54h-16l-3-40-3 40h-16z', '#b5651d') + c(59, 126, 3, '#ffc23d') + c(59, 126, 1.2, '#fff', 'stroke="none"')],
    ['Mankini fluo', () => pth('M38 58L48 104M62 58L52 104', 'none', `stroke="${INK}" stroke-width="5.5"`) + pth('M38 58L48 104M62 58L52 104', 'none', 'stroke="#7CFC00" stroke-width="3"') + pth('M45 100h10l-5 8z', '#7CFC00')],
    ['Couche-culotte', () => pth('M34 98h32v8q-4 12-16 12q-12 0-16-12z', '#fff') + r(33, 99, 6, 5, 2, '#7ec8ff') + r(61, 99, 6, 5, 2, '#7ec8ff') + pth('M47 104h6', 'none', 'stroke="#9aa0a6" stroke-width="1.5"')],
    ['Jupe en paille', () => pth('M33 98h34l3 30h-40z', '#d9b65a') + pth('M37 100l-2 27M42 100l-1 27M47 100v27M52 100v27M57 100l1 27M62 100l2 27M67 100l2 26', 'none', 'stroke="#a07d2a" stroke-width="1.2"') + r(33, 97, 34, 4, 2, '#ff6fa3')],
    ['Short cycliste moulant', () => pth('M35 98h30v26h-13l-2-14-2 14h-13z', '#2b2d42') + pth('M36 102v20M64 102v20', 'none', 'stroke="#d4ff3a" stroke-width="2"')],
  ];

  // ─── Chaussures (pied gauche / pied droit) ───
  const L = 'M48 144v13h-18q0-7 7-8v-5z', R = 'M52 144v13h18q0-7-7-8v-5z';
  const SHOES = [
    ['Baskets', (k) => pth(L, '#fff') + pth(R, '#fff') + pth('M35 152q6 1 11-4M65 152q-6 1-11-4', 'none', `stroke="${k === '#ffffff' ? '#f0506e' : k}" stroke-width="2.4"`) + pth('M30 157h18M52 157h18', 'none', 'stroke-width="2.5"')],
    ['Claquettes-chaussettes', () => r(36, 128, 12, 24, 4, '#fff') + r(52, 128, 12, 24, 4, '#fff') + pth(L, '#fff') + pth(R, '#fff')
      + pth('M36 132h12M52 132h12', 'none', 'stroke="#f0506e" stroke-width="2"') + r(31, 148, 17, 5, 2, INK) + r(52, 148, 17, 5, 2, INK) + pth('M29 158h20M51 158h20', 'none', 'stroke-width="3"')],
    ['Talons rouges', () => pth(L, '#f0506e') + pth(R, '#f0506e') + pth('M46 157v6M54 157v6', 'none', 'stroke-width="3"')],
    ['Bottes de cowboy', () => pth('M36 126h12v31h-18q0-7 6-8z', '#8b5a2b') + pth('M52 126h12v23q6 1 6 8h-18z', '#8b5a2b')
      + pth('M38 132q4 4 8 0M54 132q4 4 8 0', 'none', 'stroke="#ffc23d" stroke-width="1.4"') + c(47, 156, 2.5, '#cfd3d8') + c(53, 156, 2.5, '#cfd3d8')],
    ['Pieds nus', (k, s) => pth(L, s) + pth(R, s) + dots([[31, 155], [34, 155], [37, 155], [69, 155], [66, 155], [63, 155]], INK, .9)],
    ['Chaussons lapin', () => `<ellipse cx="34" cy="142" rx="3" ry="8" fill="#ffd1e3"/><ellipse cx="66" cy="142" rx="3" ry="8" fill="#ffd1e3"/>`
      + pth(L, '#ffd1e3') + pth(R, '#ffd1e3') + dots([[34, 151], [38, 151], [62, 151], [66, 151]], INK, 1) + c(31, 154, 1.6, '#ff6fa3', 'stroke="none"') + c(69, 154, 1.6, '#ff6fa3', 'stroke="none"')],
    ['Palmes', () => pth('M48 144v7l-6 13h-18l8-13v-7z', '#35c2f0') + pth('M52 144v7l6 13h18l-8-13v-7z', '#35c2f0') + pth('M33 156l-3 6M39 156l-1 7M67 156l3 6M61 156l1 7', 'none', 'stroke-width="1.2"')],
    ['Crocs', () => pth(L, '#69db7c') + pth(R, '#69db7c') + dots([[36, 151], [40, 149], [43, 152], [64, 151], [60, 149], [57, 152]], INK, 1) + pth('M45 146q3 4 3 9M55 146q-3 4-3 9', 'none', 'stroke-width="1.5"')],
  ];

  // ─── Cheveux et chapeaux : [nom, derrière la tête, devant] ───
  const SHORT = 'M29.5 32C29 16 40 12 50 12s21 5 20.5 20c-3.5-8-8.5-12-14.5-11-6 3-14 2-18-1-5 3-7 7-8.5 12z';
  const HATS = [
    ['Chauve', '', () => pth('M41 19q4-3 8-3', 'none', 'stroke="#fff" stroke-width="2.5" opacity=".8"')],
    ['Cheveux courts', '', (h) => pth(SHORT, h)],
    ['Crête punk', '', (h) => pth('M41 18L43 1l5 13 2-16 3 16 4-13 2 17z', h)],
    ['Afro', (h) => c(50, 28, 29, h) + c(27, 40, 9, h) + c(73, 40, 9, h), (h) => pth('M30 30q2-14 20-16q18 2 20 16q-8-6-20-6t-20 6z', h)],
    ['Couettes', (h) => c(24, 42, 9, h) + c(76, 42, 9, h) + c(31, 38, 3, '#ff6fa3') + c(69, 38, 3, '#ff6fa3'), (h) => pth(SHORT, h)],
    ['Coupe mulet', (h) => pth('M31 34q-3 24 5 30h28q8-6 5-30z', h), (h) => pth(SHORT, h)],
    ['Casquette à l\'envers', (h, k) => pth('M36 15q14-14 28 0l-4 4q-10-8-20 0z', k), (h, k) => pth('M29 31q0-19 21-19t21 19z', k) + c(50, 12.5, 2, INK)],
    ['Bonnet de bain à fleurs', '', () => pth('M28 37q0-25 22-25t22 25q-22-7-44 0z', '#fff') + dots([[38, 20], [52, 17], [63, 25], [44, 29], [58, 31]], '#ff6fa3', 2.6) + dots([[38, 20], [52, 17], [63, 25], [44, 29], [58, 31]], '#ffc23d', 1)],
    ['Couronne', '', (h) => pth(SHORT, h) + pth('M35 17l2-13 6 7 7-10 7 10 6-7 2 13z', '#ffc23d') + c(50, 12, 2, '#f0506e') + c(41, 14, 1.5, '#35c2f0') + c(59, 14, 1.5, '#35c2f0')],
    ['Chapeau de cowboy', '', () => pth('M34 20q0-16 6-16q4 2 10 2t10-2q6 0 6 16z', '#a0703c') + pth('M34 15h32', 'none', 'stroke="#f0506e" stroke-width="3"') + pth('M16 18q34 12 68 0q-4 9-34 9t-34-9z', '#8b5a2b')],
    ['Casque viking', '', () => pth('M30 23q-13-4-13-19q7 9 15 11z', '#fff') + pth('M70 23q13-4 13-19q-7 9-15 11z', '#fff') + pth('M28 30q0-19 22-19t22 19z', '#9aa0a6') + pth('M28 30h44', 'none', 'stroke-width="3"') + dots([[36, 27], [50, 27], [64, 27]], '#e9e4ef', 1.5)],
    ['Perruque de star', (h) => pth('M27 32q-3 34 4 42h38q7-8 4-42q-2-22-23-22t-23 22z', h), (h) => pth('M29 33q4-21 21-21 16 0 21 18-14-10-30-4-6 2-12 7z', h)],
    ['Chignon', (h) => c(50, 10, 9, h), (h) => pth('M29.5 31q1-19 20.5-19t20.5 19q-8-10-20.5-10t-20.5 10z', h) + pth('M44 6q6 3 12 0', 'none', 'stroke="#ff6fa3" stroke-width="2.5"')],
    ['Antennes', '', (h, k) => pth('M43 14L37 -1M57 14L63 -1', 'none', 'stroke-width="2.2"') + c(37, -2, 4, '#ff6fa3') + c(63, -2, 4, '#ff6fa3') + pth('M31 26q19-17 38 0', 'none', `stroke="${k}" stroke-width="3.5"`)],
    ['Bob de pêcheur', '', () => pth('M33 22q0-14 17-14t17 14z', '#d9b65a') + pth('M24 25q26 9 52 0l-8-5h-36z', '#d9b65a') + pth('M33 20h34', 'none', 'stroke="#6b4a1e" stroke-width="2.5"')],
  ];

  // ─── Accessoires du visage ───
  const ACCS = [
    ['Rien', () => ''],
    ['Lunettes de soleil', () => pth('M36 27h12v5q0 4-6 4t-6-4zM52 27h12v5q0 4-6 4t-6-4z', INK) + pth('M48 29h4M36 28l-6-2M64 28l6-2', 'none', 'stroke-width="2"') + pth('M39 29l3 0', 'none', 'stroke="#fff" stroke-width="1.5"')],
    ['Moustache', (h) => pth('M40 41q5-5 10-1q5-4 10 1q-5 3-10 0q-5 3-10 0z', h)],
    ['Barbe', (h) => pth('M31 37q1 21 19 21t19-21q-3 5-8 7q-3 4-11 4t-11-4q-5-2-8-7z', h)],
    ['Nez de clown', () => c(50, 36, 4.5, '#ff3b3b') + c(48.5, 34.5, 1.2, '#fff', 'stroke="none"')],
    ['Monocle', () => c(57.6, 31, 6, 'rgba(255,255,255,.35)') + pth('M63 33q5 10 1 19', 'none', 'stroke="#ffc23d" stroke-width="1.5"')],
    ['Bandeau de pirate', () => pth('M29 25L71 37', 'none', 'stroke-width="2.2"') + `<ellipse cx="57.6" cy="31.5" rx="6.5" ry="5.5" fill="${INK}"/>`],
    ['Lunettes de piscine', () => pth('M29 30h9M62 30h9', 'none', 'stroke="#35c2f0" stroke-width="3"') + c(43.4, 31, 5.5, 'rgba(126,200,255,.75)') + c(57.6, 31, 5.5, 'rgba(126,200,255,.75)')],
    ['Sucette', () => pth('M54 42L64 49', 'none', 'stroke="#fff" stroke-width="3"') + c(67, 50, 5.5, '#ff6fa3') + pth('M67 50m-2.5 0a2.5 2.5 0 1 1 2.5 2.5', 'none', 'stroke="#fff" stroke-width="1.4"')],
    ['Joues roses', () => c(37.5, 38, 3.5, '#ff9ec4', 'stroke="none" opacity=".9"') + c(62.5, 38, 3.5, '#ff9ec4', 'stroke="none" opacity=".9"')],
    ['Pansement', () => `<rect x="44" y="33" width="12" height="4.5" rx="2.2" fill="#f2c79a" transform="rotate(-25 50 35)"/>` + dots([[48.5, 36], [51.5, 34.6]], INK, .6)],
    ['Collier bling-bling', () => pth('M40 55q10 12 20 0', 'none', 'stroke="#ffc23d" stroke-width="3"') + c(50, 64, 5, '#ffc23d') + `<text x="50" y="66.5" font-size="7" text-anchor="middle" fill="${INK}" stroke="none" font-family="system-ui" font-weight="900">$</text>`],
  ];

  const LISTS = {
    hair: HATS, top: TOPS, bottom: BOTTOMS, shoes: SHOES, acc: ACCS,
    eyes: Array.from({ length: 8 }, (_, i) => [`Yeux ${i + 1}`]),
    mouth: Array.from({ length: 6 }, (_, i) => [`Bouche ${i + 1}`]),
  };
  const SIZES = { skin: SKINS.length, hairColor: HAIRS.length, col: COLS.length, ...Object.fromEntries(Object.entries(LISTS).map(([k, v]) => [k, v.length])) };
  const KEYS = ['skin', 'hairColor', 'hair', 'eyes', 'mouth', 'acc', 'top', 'bottom', 'shoes', 'col'];
  const mod = (n, m) => ((Number(n) || 0) % m + m) % m;
  const norm = (look = {}) => Object.fromEntries(KEYS.map((k) => [k, mod(look[k], SIZES[k])]));
  const random = () => Object.fromEntries(KEYS.map((k) => [k, Math.floor(Math.random() * SIZES[k])]));
  const label = (key, n) => LISTS[key]?.[mod(n, SIZES[key])]?.[0] ?? '';

  function layers(look, { body = true } = {}) {
    const l = norm(look);
    const s = SKINS[l.skin], h = HAIRS[l.hairColor], k = COLS[l.col];
    const [, hairBack, hairFront] = HATS[l.hair];
    const call = (f, ...a) => (typeof f === 'function' ? f(...a) : f || '');
    const face = `<g transform="translate(28 12) scale(1.1)" stroke-width="2">${ICONS.parts.EYES[l.eyes]}${ICONS.parts.MOUTHS[l.mouth]}</g>`;
    const bodyPart = body ? [
      r(45, 50, 10, 10, 3, s),                                        // cou
      r(19, 61, 12, 40, 6, s) + r(69, 61, 12, 40, 6, s),              // bras
      r(36, 100, 12, 50, 5, s) + r(52, 100, 12, 50, 5, s),            // jambes
      r(31, 58, 38, 46, 11, s),                                       // torse
      BOTTOMS[l.bottom][1](k, s),
      SHOES[l.shoes][1](k, s),
      TOPS[l.top][1](k, s),
      c(25, 103, 6.5, s) + c(75, 103, 6.5, s),                        // mains
    ].join('') : '';
    return bodyPart + call(hairBack, h, k) + c(50, 34, 21, s) + face + ACCS[l.acc][1](h, k) + call(hairFront, h, k);
  }

  const g = (inner) => `<g stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">${inner}</g>`;
  // perso entier
  const body = (look, cls = 'perso-body') => `<svg class="${cls}" viewBox="10 -8 80 172" aria-hidden="true">${g(layers(look))}</svg>`;
  // tête seule (pour les petites pastilles rondes)
  const head = (look) => `<svg class="face perso-head" viewBox="21 6 58 58" aria-hidden="true">${g(layers(look, { body: false }))}</svg>`;

  return { KEYS, SIZES, SKINS, HAIRS, COLS, norm, random, label, body, head };
})();
