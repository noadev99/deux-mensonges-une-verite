// ─────────────────────────────────────────────────────────────────────────────
// Icônes dessinées au trait encre (même style que les contours des cartes).
// ICONS.game(id) → illustration d'un jeu · ICONS.ui[nom] → petite icône d'interface
// ─────────────────────────────────────────────────────────────────────────────
const ICONS = (() => {
  const INK = '#1a0f2e';
  const art = (body) => `<svg class="art" viewBox="0 0 64 64" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const ico = (body) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const mask = 'M0 0c8-4 20-4 28 0v12c0 10-6 18-14 18S0 22 0 12z';

  const GAMES = {
    // 🎭 deux masques : un qui sourit (la vérité), un qui fait la moue (les mensonges)
    'deux-mensonges': art(`
      <g transform="translate(6 12) rotate(-12 14 14)">
        <path d="${mask}" fill="#fff"/>
        <path d="M6 9.5q2.5-2.5 5 0M17 9.5q2.5-2.5 5 0"/>
        <path d="M8 18q6 6 12 0" />
      </g>
      <g transform="translate(30 18) rotate(12 14 14)">
        <path d="${mask}" fill="#ffc23d"/>
        <ellipse cx="8.5" cy="10" rx="2" ry="2.6" fill="${INK}" stroke="none"/>
        <ellipse cx="19.5" cy="10" rx="2" ry="2.6" fill="${INK}" stroke="none"/>
        <path d="M8.5 22q5.5-5 11 0"/>
      </g>`),

    // 🗳️ une urne et un bulletin qui y tombe
    'qui-de-nous': art(`
      <g transform="rotate(-10 34 16)"><rect x="24" y="4" width="20" height="24" rx="3" fill="#fff"/><path d="M29 15l4 4 7-8"/></g>
      <path d="M10 30h44v26a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z" fill="#ff6fa3"/>
      <path d="M10 30l5-8h34l5 8" fill="#fff"/>
      <path d="M22 30h20" stroke-width="4"/>
      <path d="M24 44h16"/>`),

    // 🕵️ lunettes-nez-moustache : le déguisement de l'intrus
    intrus: art(`
      <path d="M14 18q6-5 12 0M38 18q6-5 12 0"/>
      <circle cx="21" cy="28" r="8" fill="#fff"/>
      <circle cx="43" cy="28" r="8" fill="#fff"/>
      <path d="M29 27q3-3 6 0"/>
      <path d="M32 30c-4 6-6 12-2 14s8 0 6-4" fill="#ffb4c6"/>
      <path d="M32 48c-6-4-14-3-18 1 5 4 12 3 18-1 6 4 13 5 18 1-4-4-12-5-18-1z" fill="${INK}"/>
      <circle cx="21" cy="28" r="2.2" fill="${INK}" stroke="none"/>
      <circle cx="43" cy="28" r="2.2" fill="${INK}" stroke="none"/>`),

    // 📖 un dictionnaire ouvert… avec un mot qui ment (nez de Pinocchio)
    dico: art(`
      <path d="M32 18c-7-5-16-6-24-4v36c8-2 17-1 24 4z" fill="#fff"/>
      <path d="M32 18c7-5 16-6 24-4v36c-8-2-17-1-24 4z" fill="#fff"/>
      <path d="M32 18v36"/>
      <path d="M14 24c4-1 8-1 12 1M14 31c4-1 8-1 12 1M14 38c4-1 8-1 12 1"/>
      <circle cx="44" cy="28" r="6" fill="#ffc23d"/>
      <circle cx="42" cy="27" r="1.2" fill="${INK}" stroke="none"/>
      <path d="M49 29h9"/>
      <path d="M40 41c3 2 7 2 10 0"/>`),

    // ✍️ une bulle avec un trou à compléter, et un crayon
    chute: art(`
      <path d="M8 12h40a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H26l-10 9v-9H8a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z" fill="#fff"/>
      <path d="M13 22h12M13 30h6"/>
      <path d="M23 30h14" stroke-dasharray="3 4"/>
      <g transform="rotate(40 48 38)"><rect x="43" y="22" width="10" height="28" rx="2" fill="#ffc23d"/><path d="M43 50l5 8 5-8z" fill="#fff"/><path d="M43 27h10"/></g>`),

    // 💣 la bombe et sa mèche qui crépite
    patate: art(`
      <path d="M40 18c4-6 10-9 16-7" />
      <rect x="31" y="15" width="13" height="10" rx="2" transform="rotate(30 37 20)" fill="#3c2a5c"/>
      <circle cx="28" cy="40" r="18" fill="#3c2a5c"/>
      <path d="M18 33a11 11 0 0 1 8-7" stroke="#fff" opacity=".6"/>
      <circle cx="57" cy="10" r="4.5" fill="#ffc23d"/>
      <path d="M57 1v3M63 10h2M61 4l2-2M51 4l-2-2" stroke-width="2.5"/>`),

    // 🎨 un cadre avec un gribouillis, un pinceau et une bulle : dessiner puis deviner
    dessin: art(`
      <rect x="6" y="10" width="38" height="34" rx="4" fill="#fff"/>
      <path d="M13 34c4-10 8-12 11-6s7 4 12-8" stroke="#f0506e"/>
      <circle cx="16" cy="19" r="3" fill="#ffc23d" stroke-width="2.5"/>
      <g transform="rotate(35 48 30)"><rect x="44" y="14" width="8" height="24" rx="2" fill="#6d8bff"/><path d="M44 38c0 6 8 6 8 0z" fill="${INK}"/></g>
      <path d="M36 48h20a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H44l-6 4v-4h-2a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3z" fill="#ffc23d"/>
      <path d="M41 54h1M46 54h1M51 54h1" stroke-width="3.5"/>`),

    // 🎚️ une jauge de 0 à 10 avec son curseur et un point d'interrogation
    note: art(`
      <rect x="6" y="34" width="52" height="14" rx="7" fill="#fff"/>
      <path d="M13 34v14" stroke="#f0506e" stroke-width="6"/>
      <rect x="6" y="34" width="30" height="14" rx="7" fill="#9be15d"/>
      <path d="M36 28v26" stroke-width="4"/>
      <circle cx="36" cy="22" r="7" fill="#ffc23d"/>
      <path d="M33.5 20.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7" stroke-width="2.2"/>
      <circle cx="36" cy="27" r=".6" fill="${INK}"/>
      <path d="M10 56h4M50 56h4" stroke-width="2.5"/>`),

    // 🏅 un podium avec une étoile sur la première marche
    classement: art(`
      <rect x="24" y="26" width="16" height="30" fill="#ffc23d"/>
      <rect x="8" y="36" width="16" height="20" fill="#fff"/>
      <rect x="40" y="42" width="16" height="14" fill="#ff8fb5"/>
      <path d="M32 6l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="#fff"/>
      <path d="M30 37l3-2v12"/>`),

    // 💰 un coffre au trésor qui déborde de pièces
    butin: art(`
      <circle cx="22" cy="20" r="6" fill="#ffc23d"/><circle cx="34" cy="15" r="6" fill="#ffd96b"/><circle cx="45" cy="21" r="6" fill="#ffc23d"/>
      <path d="M8 32q0-12 24-12t24 12z" fill="#c98d4a"/>
      <rect x="8" y="32" width="48" height="24" rx="3" fill="#a0703c"/>
      <path d="M8 40h48" /><path d="M18 32v24M46 32v24" stroke="#ffc23d" stroke-width="4"/><path d="M18 32v24M46 32v24" stroke-width="1.5"/>
      <rect x="27" y="36" width="10" height="11" rx="2" fill="#ffc23d"/><circle cx="32" cy="41" r="1.4" fill="${INK}" stroke="none"/>`),

    // 🗡️ un loup (masque) et une dague
    complot: art(`
      <path d="M38 6l4 4-22 30-6 2 2-6z" fill="#e9e4ef"/>
      <path d="M12 38l8 8" stroke-width="5"/><path d="M12 38l8 8" stroke="#8f5bd6" stroke-width="2.5"/>
      <circle cx="9" cy="49" r="3" fill="#ffc23d"/>
      <path d="M18 40q14-8 28-6 12 2 14 8-2 10-14 10-6 0-9-5-3 5-9 5-8 0-10-12z" fill="#8f5bd6"/>
      <ellipse cx="29" cy="45" rx="4.5" ry="3" fill="#fff"/><ellipse cx="47" cy="44" rx="4.5" ry="3" fill="#fff"/>
      <circle cx="29" cy="45" r="1.6" fill="${INK}" stroke="none"/><circle cx="47" cy="44" r="1.6" fill="${INK}" stroke="none"/>`),

    // 🤝 deux alliances (anneaux) entrelacées… et une petite dague cachée
    alliances: art(`
      <path d="M50 8l4 4-10 12-4 1 1-4z" fill="#e9e4ef" stroke-width="2.5"/>
      <circle cx="24" cy="36" r="13" stroke-width="9"/><circle cx="24" cy="36" r="13" stroke="#ffc23d" stroke-width="5"/>
      <circle cx="40" cy="36" r="13" stroke-width="9"/><circle cx="40" cy="36" r="13" stroke="#3fbf8f" stroke-width="5"/>
      <path d="M33 25.5a13 13 0 0 1 0 21" stroke-width="9"/><path d="M33 25.5a13 13 0 0 1 0 21" stroke="#ffc23d" stroke-width="5"/>
      <path d="M14 14l2 4M10 20l4 1M20 12l0 4" stroke-width="2.5"/>`),

    // 🧼 une savonnette qui glisse sur la glace, avec des bulles
    ring: art(`
      <ellipse cx="32" cy="50" rx="26" ry="8" fill="#d4f1ff"/>
      <path d="M14 34c0-8 8-14 18-14s18 6 18 14-8 12-18 12-18-4-18-12z" fill="#ff8fb5"/>
      <path d="M22 28q6-4 14-2" stroke="#fff" stroke-width="3"/>
      <circle cx="48" cy="14" r="5" fill="#fff"/><circle cx="56" cy="24" r="3" fill="#fff"/><circle cx="12" cy="18" r="4" fill="#fff"/>
      <path d="M2 42h8M4 48h6" stroke-width="2.5"/>`),

    // 🖼️ une grille d'images… dont une case vide avec un point d'interrogation
    image: art(`
      <rect x="6" y="8" width="16" height="16" rx="3" fill="#ffd43b"/><rect x="24" y="8" width="16" height="16" rx="3" fill="#69db7c"/><rect x="42" y="8" width="16" height="16" rx="3" fill="#ff8fb5"/>
      <rect x="6" y="26" width="16" height="16" rx="3" fill="#4dabf7"/><rect x="24" y="26" width="16" height="16" rx="3" fill="#fff" stroke-dasharray="4 3"/><rect x="42" y="26" width="16" height="16" rx="3" fill="#da77f2"/>
      <path d="M29.5 31a2.6 2.6 0 1 1 3.6 2.4c-.8.4-1.1.9-1.1 1.8" stroke-width="2.4"/><circle cx="32" cy="38.2" r=".9" fill="${INK}" stroke="none"/>
      <path d="M10 50l8 6M30 48v8M50 50l-8 6" stroke-width="2.5"/>`),

    // ⛩️ un torii devant une carte de personnage avec un point d'interrogation
    trombi: art(`
      <rect x="30" y="18" width="26" height="36" rx="4" fill="#fff" transform="rotate(8 43 36)"/>
      <path d="M40 30a3.4 3.4 0 1 1 4.6 3.2c-1 .5-1.4 1.1-1.4 2.3" stroke-width="2.6" transform="rotate(8 43 36)"/><circle cx="42.6" cy="41" r="1.1" fill="${INK}" stroke="none"/>
      <path d="M6 14h34" stroke-width="5"/><path d="M6 14h34" stroke="#f0506e" stroke-width="2.5"/>
      <path d="M9 21h28" stroke="#f0506e" stroke-width="4"/>
      <path d="M13 14v42M33 14v42" stroke-width="6"/><path d="M13 14v42M33 14v42" stroke="#f0506e" stroke-width="3"/>`),

    // 💣 une bombe ronde avec sa mèche et un écran de chrono
    demineur: art(`
      <circle cx="30" cy="38" r="20" fill="#3b3450"/>
      <rect x="18" y="32" width="24" height="11" rx="2" fill="#1a0f2e" stroke-width="2"/>
      <path d="M22 37.5h3M28 37.5h3M34 37.5h3" stroke="#ff5d5d" stroke-width="2.5"/>
      <path d="M40 20l5-5" stroke-width="5"/><path d="M45 15c3-4 7-4 9-2" stroke-width="2.5"/>
      <path d="M56 8l2-3M58 14h3M53 6l-1-3" stroke="#ffc23d" stroke-width="2.5"/>
      <path d="M22 26q4-4 9-4" stroke="#fff" stroke-width="2.5"/>`),

    // 🚩 un drapeau planté au bout de la piste, et un téléphone qui tremble
    drapeau: art(`
      <path d="M40 58V8" stroke-width="3.5"/><path d="M40 8l18 7-18 7z" fill="#ff5d5d"/>
      <rect x="8" y="24" width="18" height="30" rx="4" fill="#fff" transform="rotate(-12 17 39)"/>
      <rect x="11" y="28" width="12" height="18" rx="2" fill="#9fdcff" transform="rotate(-12 17 39)"/>
      <path d="M4 22l-3-3M30 20l3-4M2 50l-2 3M32 52l3 3" stroke-width="2.5"/>`),

    // 🔔 un gros buzzer rouge sur son socle, qui sonne
    buzzer: art(`
      <path d="M10 46h44v8a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z" fill="#3b3450"/>
      <path d="M16 46c0-12 7-20 16-20s16 8 16 20z" fill="#ff5d5d"/>
      <path d="M24 36q3-5 8-6" stroke="#fff" stroke-width="2.5"/>
      <path d="M32 18v-8M18 21l-4-6M46 21l4-6M10 30l-6-2M54 30l6-2" stroke="#ffc23d" stroke-width="3"/>`),

    // 🎭 un mime en marinière qui fait deviner, avec des bulles « ? »
    mime: art(`
      <circle cx="26" cy="20" r="10" fill="#fff"/>
      <path d="M22 19h0M30 19h0" stroke-width="3.5"/><path d="M22 25q4 3 8 0"/>
      <path d="M14 58c0-14 5-24 12-24s12 10 12 24z" fill="#fff"/>
      <path d="M17 44h18M16 50h20M15 56h22" stroke="#4d8bff" stroke-width="3"/>
      <path d="M36 38l10-10" stroke-width="3.5"/><circle cx="48" cy="26" r="3" fill="#fff"/>
      <path d="M48 8a5 5 0 1 1 6 5c-1.5.7-2 1.6-2 3" stroke="#c86bff" stroke-width="2.8"/><circle cx="52" cy="20" r="1.2" fill="#c86bff" stroke="none"/>`),

    // 🎙️ un micro de scène, avec des notes de voix qui s'envolent
    imitateur: art(`
      <rect x="20" y="6" width="18" height="28" rx="9" fill="#ff8fb1"/>
      <path d="M24 14h10M24 20h10M24 26h10" stroke-width="2"/>
      <path d="M14 26c0 10 7 16 15 16s15-6 15-16" stroke-width="3"/>
      <path d="M29 42v10M19 56h20" stroke-width="3.5"/>
      <path d="M48 10q5 2 4 8M52 6q8 4 6 14" stroke="#c86bff" stroke-width="2.5"/>
      <path d="M8 10q-4 3-2 8" stroke="#c86bff" stroke-width="2.5"/>`),

    // 📊 un camembert de sondage avec une part qui se détache
    sondage: art(`
      <path d="M30 34V10a24 24 0 1 0 22 32z" fill="#4fc3f7"/>
      <path d="M36 28V4a24 24 0 0 1 22 32z" fill="#ffc23d"/>
      <path d="M14 40l6-6 5 5 8-10" stroke="#fff" stroke-width="3"/>`),

    // 🏷️ une étiquette de prix accrochée par une ficelle
    etiquette: art(`
      <path d="M8 8c6 2 10 6 12 12" stroke-width="2.5"/>
      <path d="M22 18h22l14 14-22 22-14-14z" fill="#ffb84d"/>
      <circle cx="28" cy="24" r="3.5" fill="#fff"/>
      <path d="M33 40l10-10M38 44l6-6" stroke-width="2.5"/>`),

    // 🎚️ une réglette avec un curseur et une cible
    curseur: art(`
      <rect x="6" y="26" width="52" height="12" rx="6" fill="#fff"/>
      <rect x="6" y="26" width="30" height="12" rx="6" fill="#7c9cff"/>
      <rect x="31" y="18" width="10" height="28" rx="4" fill="#ffc23d"/>
      <circle cx="50" cy="12" r="6" fill="#ff6fa3"/><circle cx="50" cy="12" r="2" fill="#fff"/>
      <path d="M12 52h4M24 52h4M36 52h4M48 52h4" stroke-width="2.5"/>`),

    // 🔤 une feuille de petit bac avec une grosse lettre et un crayon
    petitbac: art(`
      <rect x="8" y="8" width="36" height="48" rx="4" fill="#fff"/>
      <path d="M14 30h24M14 38h24M14 46h16" stroke-width="2.5"/>
      <path d="M17 24l5-12 5 12M19 20h6" stroke="#5ed39a" stroke-width="3.5"/>
      <path d="M46 52l12-24 4 2-12 24-5 2z" fill="#ffc23d"/>`),

    // 🧳 une valise avec des étiquettes de voyage
    valise: art(`
      <path d="M24 16v-6h16v6" stroke-width="3"/>
      <rect x="8" y="16" width="48" height="38" rx="6" fill="#c99a6b"/>
      <path d="M8 30h48" stroke-width="2.5"/>
      <rect x="28" y="26" width="8" height="8" rx="2" fill="#ffc23d"/>
      <circle cx="18" cy="44" r="4" fill="#ff6fa3"/><rect x="38" y="40" width="12" height="8" rx="2" fill="#4fc3f7"/>`),

    // 🎶 un visage qui fredonne, bouche fermée, avec des notes
    fredonnette: art(`
      <circle cx="26" cy="34" r="18" fill="#ffe0b8"/>
      <path d="M18 30q2-2 4 0M30 30q2-2 4 0" stroke-width="2.5"/>
      <path d="M21 41q5 3 10 0" stroke-width="3"/>
      <path d="M46 26V8l10-3v18" stroke-width="3"/><circle cx="43" cy="26" r="4" fill="#ff7eb6"/><circle cx="53" cy="23" r="4" fill="#ff7eb6"/>`),

    // 🤠 un chapeau de cowboy et un éclair (réflexe)
    duel: art(`
      <path d="M6 40c10 6 42 6 52 0-4 8-48 8-52 0z" fill="#d98a3a"/>
      <path d="M18 40c0-14 4-26 14-26s14 12 14 26" fill="#d98a3a"/>
      <path d="M18 34q14 4 28 0" stroke="#fff" stroke-width="3"/>
      <path d="M50 6l-6 10h6l-6 10" stroke="#ffc23d" stroke-width="3.5"/>`),

    // 🎪 un plateau rond avec une bille et du vent
    funambule: art(`
      <ellipse cx="32" cy="40" rx="26" ry="10" fill="#9c6bff"/>
      <ellipse cx="32" cy="38" rx="26" ry="10" fill="#f6efe2"/>
      <circle cx="38" cy="34" r="6" fill="#ff6fa3"/>
      <path d="M4 14q8-4 16 0t16 0M10 22q6-3 12 0" stroke="#4fc3f7" stroke-width="3"/>`),

    // 🏎️ un petit bolide vu de profil qui file, avec un drapeau à damier
    bolides: art(`
      <path d="M44 6v20" stroke-width="2.5"/><rect x="44" y="6" width="14" height="10" fill="#fff"/>
      <path d="M44 6h4v5h-4zM51 6h4v5h-4zM48 11h3v5h-3zM55 11h3v5h-3z" fill="${INK}" stroke="none"/>
      <path d="M8 44c0-6 4-10 10-10h6l6-8h12l8 8h4c4 0 6 3 6 7v3H8z" fill="#ff5d5d"/>
      <path d="M31 28h10l5 6H27z" fill="#bfe9ff"/>
      <circle cx="20" cy="46" r="7" fill="#3b3450"/><circle cx="20" cy="46" r="2.5" fill="#fff"/>
      <circle cx="48" cy="46" r="7" fill="#3b3450"/><circle cx="48" cy="46" r="2.5" fill="#fff"/>
      <path d="M2 34h4M1 40h4M4 52h8" stroke-width="2.5"/>`),
  };

  // ─── Pièces de plateau (cartes, jetons…) pour les jeux de trahison ───
  const big = (body, vb = '0 0 64 64') => `<svg class="bart" viewBox="${vb}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const board = {
    coin: (label = '') => big(`<circle cx="32" cy="32" r="26" fill="#ffc23d"/><circle cx="32" cy="32" r="19" stroke="#c98d1a" stroke-width="2.5"/>
      <text x="32" y="40" font-size="22" text-anchor="middle" fill="${INK}" stroke="none" font-family="system-ui" font-weight="900">${label}</text>`),
    share: big(`<circle cx="20" cy="40" r="11" fill="#ffc23d"/><circle cx="20" cy="40" r="6" stroke="#c98d1a" stroke-width="2"/>
      <circle cx="44" cy="40" r="11" fill="#ffc23d"/><circle cx="44" cy="40" r="6" stroke="#c98d1a" stroke-width="2"/>
      <path d="M14 18q18-12 36 0" stroke-width="3"/><path d="M44 12l6 6-8 2" stroke-width="3"/>`),
    betray: big(`<path d="M44 6l6 6-26 30-8 3 3-8z" fill="#e9e4ef"/><path d="M28 34l4 4" stroke-width="2"/>
      <path d="M12 38l12 12" stroke-width="7"/><path d="M12 38l12 12" stroke="#f0506e" stroke-width="3.5"/>
      <circle cx="9" cy="53" r="4" fill="#ffc23d"/>`),
    chest: (open = false) => big(open
      ? `<path d="M8 26l6-14h36l6 14z" fill="#c98d4a"/><circle cx="24" cy="27" r="6" fill="#ffc23d"/><circle cx="36" cy="25" r="6" fill="#ffd96b"/><circle cx="44" cy="29" r="5" fill="#ffc23d"/>
         <rect x="8" y="30" width="48" height="24" rx="3" fill="#a0703c"/><path d="M18 30v24M46 30v24" stroke="#ffc23d" stroke-width="4"/>`
      : `<path d="M8 30q0-14 24-14t24 14z" fill="#c98d4a"/><rect x="8" y="30" width="48" height="24" rx="3" fill="#a0703c"/>
         <path d="M8 38h48"/><path d="M18 30v24M46 30v24" stroke="#ffc23d" stroke-width="4"/>
         <rect x="27" y="34" width="10" height="11" rx="2" fill="#ffc23d"/><circle cx="32" cy="39" r="1.4" fill="${INK}" stroke="none"/>`),
    shield: big(`<path d="M32 6l22 8v16c0 14-10 24-22 28C20 54 10 44 10 30V14z" fill="#4dabf7"/><path d="M22 31l7 7 13-14" stroke="#fff" stroke-width="5"/><path d="M22 31l7 7 13-14" stroke-width="1.5"/>`),
    sabotage: big(`<path d="M32 6l22 8v16c0 14-10 24-22 28C20 54 10 44 10 30V14z" fill="#f0506e"/><path d="M33 8l-6 16 9 6-8 12 4 14" stroke-width="3" stroke="#1a0f2e"/>`),
    hood: big(`<path d="M10 58q0-30 22-46 22 16 22 46z" fill="#3c2a5c"/><path d="M20 58q0-22 12-30 12 8 12 30z" fill="${INK}"/>
      <ellipse cx="27" cy="40" rx="3" ry="2" fill="#f0506e" stroke="none"/><ellipse cx="37" cy="40" rx="3" ry="2" fill="#f0506e" stroke="none"/>`),
    knight: big(`<path d="M10 58q0-24 22-30 22 6 22 30z" fill="#4dabf7"/><circle cx="32" cy="22" r="13" fill="#ffd9b0"/>
      <path d="M19 20q0-14 13-14t13 14z" fill="#cfd3d8"/><path d="M32 6v-2M26 36q6 4 12 0"/><circle cx="27" cy="23" r="1.6" fill="${INK}" stroke="none"/><circle cx="37" cy="23" r="1.6" fill="${INK}" stroke="none"/>`),
    crown: big(`<path d="M8 50l4-30 12 12 8-18 8 18 12-12 4 30z" fill="#ffc23d"/><circle cx="32" cy="40" r="4" fill="#f0506e"/>`),
    rings: big(`<circle cx="24" cy="34" r="13" stroke-width="9"/><circle cx="24" cy="34" r="13" stroke="#ffc23d" stroke-width="5"/>
      <circle cx="40" cy="34" r="13" stroke-width="9"/><circle cx="40" cy="34" r="13" stroke="#3fbf8f" stroke-width="5"/>`),
    heartbreak: big(`<path d="M32 54L10 32a12 12 0 0 1 22-14 12 12 0 0 1 22 14z" fill="#ff8fb5"/><path d="M32 18l-4 10 7 6-5 8 2 10" stroke-width="3"/>`),
  };

  const ui = {
    players: ico('<circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 13.6c2.6.2 4.5 2.1 4.5 4.9"/>'),
    clock: ico('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2"/><path d="M9.5 2.5h5"/>'),
    crown: ico('<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#ffc23d"/>'),
    send: ico('<path d="M21 3L3 10.5l7 3 3 7z" fill="#fff"/><path d="M21 3L10 13.5"/>'),
    again: ico('<path d="M4 12a8 8 0 0 1 13.7-5.6L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15"/><path d="M4 20v-5h5"/>'),
    dice: ico('<rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="#fff"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>'),
    trophy: ico('<path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="#ffc23d"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 21h8M9 18h6"/>'),
  };

  // ─── Avatars : petites bouilles dessinées (le rond coloré est le visage) ───
  const W = '#fff', PINK = '#ff8fb5';
  const EYES = [
    // points
    `<circle cx="14" cy="17" r="2.4" fill="${INK}" stroke="none"/><circle cx="26" cy="17" r="2.4" fill="${INK}" stroke="none"/>`,
    // gros yeux ronds
    `<circle cx="14" cy="16" r="4.6" fill="${W}"/><circle cx="26" cy="16" r="4.6" fill="${W}"/><circle cx="15" cy="17" r="2" fill="${INK}" stroke="none"/><circle cx="27" cy="17" r="2" fill="${INK}" stroke="none"/>`,
    // endormi
    `<path d="M10.5 17q3.5 3 7 0M22.5 17q3.5 3 7 0"/>`,
    // cyclope
    `<circle cx="20" cy="15.5" r="6.2" fill="${W}"/><circle cx="21" cy="16.5" r="2.8" fill="${INK}" stroke="none"/>`,
    // lunettes
    `<circle cx="13.5" cy="17" r="4.6" fill="${W}"/><circle cx="26.5" cy="17" r="4.6" fill="${W}"/><path d="M18.1 17h3.8"/><circle cx="13.5" cy="17.5" r="1.7" fill="${INK}" stroke="none"/><circle cx="26.5" cy="17.5" r="1.7" fill="${INK}" stroke="none"/>`,
    // clin d'œil
    `<circle cx="14" cy="17" r="2.4" fill="${INK}" stroke="none"/><path d="M23 17.5q3-2.5 6 0"/>`,
    // sourcils froncés (faux méchant)
    `<path d="M10.5 12.5l6 2M29.5 12.5l-6 2"/><circle cx="14" cy="18" r="2.2" fill="${INK}" stroke="none"/><circle cx="26" cy="18" r="2.2" fill="${INK}" stroke="none"/>`,
    // yeux étoiles
    `<path d="M14 13.5l1.1 2.4 2.5.3-1.9 1.7.5 2.5-2.2-1.3-2.2 1.3.5-2.5-1.9-1.7 2.5-.3zM26 13.5l1.1 2.4 2.5.3-1.9 1.7.5 2.5-2.2-1.3-2.2 1.3.5-2.5-1.9-1.7 2.5-.3z" fill="${W}" stroke-width="1.4"/>`,
  ];
  const MOUTHS = [
    `<path d="M14 25q6 6 12 0"/>`,                                                         // sourire
    `<path d="M15 25q5 7 10 0z" fill="${INK}"/><path d="M17.5 28.5q2.5-1.6 5 0" stroke="${PINK}" stroke-width="2"/>`, // bouche ouverte
    `<rect x="14" y="24" width="12" height="5" rx="2.5" fill="${W}"/><path d="M18 24v5M22 24v5" stroke-width="1.6"/>`, // grand sourire dents
    `<circle cx="20" cy="26.5" r="2.4" fill="${INK}" stroke="none"/>`,                    // « oh »
    `<path d="M14 25q6 5 12 0"/><path d="M18 27.5v2.5a2 2 0 0 0 4 0v-2" fill="${PINK}" stroke-width="1.8"/>`, // langue tirée
    `<path d="M15 27q5 1.5 10-2.5"/>`,                                                     // en coin
  ];
  const EXTRAS = [
    '',
    `<circle cx="10" cy="23" r="2.6" fill="${PINK}" stroke="none" opacity=".8"/><circle cx="30" cy="23" r="2.6" fill="${PINK}" stroke="none" opacity=".8"/>`, // joues
    `<path d="M20 4V-2" /><circle cx="20" cy="-3.5" r="2.6" fill="${W}"/>`,                 // antenne
    `<path d="M14.5 2.5l5.5 3 5.5-3v6l-5.5-3-5.5 3z" fill="${PINK}" stroke-width="1.8"/>`, // nœud
    `<path d="M12 31q4-3 8-.5 4-2.5 8 .5-4 2-8 0-4 2-8 0z" fill="${INK}"/>`,               // moustache
    `<path d="M9 7l2-7 5 4.5M31 7l-2-7-5 4.5" fill="${W}" stroke-width="2"/>`,              // cornes
    `<circle cx="11" cy="22" r=".9" fill="${INK}" stroke="none"/><circle cx="9" cy="24" r=".9" fill="${INK}" stroke="none"/><circle cx="29" cy="22" r=".9" fill="${INK}" stroke="none"/><circle cx="31" cy="24" r=".9" fill="${INK}" stroke="none"/>`, // taches de rousseur
    `<path d="M12.5 5V-6h15V5z" fill="${INK}"/><path d="M12.5 1h15" stroke="${PINK}" stroke-width="2.4"/><path d="M6 5.5h28" stroke-width="3"/>`, // chapeau haut-de-forme
  ];
  // 16 combinaisons choisies à la main [yeux, bouche, accessoire]
  const FACES = [
    [0, 0, 1], [1, 1, 0], [2, 0, 3], [3, 3, 2], [4, 5, 4], [5, 4, 1], [6, 2, 5], [7, 1, 1],
    [1, 2, 7], [0, 4, 6], [3, 0, 5], [2, 5, 6], [4, 0, 3], [6, 3, 7], [5, 2, 2], [7, 0, 4],
  ];
  const avatar = (n) => {
    const [e, m, x] = FACES[((n % FACES.length) + FACES.length) % FACES.length];
    return `<svg class="face" viewBox="0 0 40 40" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${EXTRAS[x]}${EYES[e]}${MOUTHS[m]}</svg>`;
  };

  return {
    game: (id) => GAMES[id] || '',
    avatar,
    ui,
    parts: { EYES, MOUTHS, EXTRAS },
    board, // bouilles personnalisables (perso.js)
  };
})();
