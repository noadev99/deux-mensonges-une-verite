// 🎚️ Note secrète — affichage
(() => {
  const { esc, P, av, name } = UI;
  // dégradé de l'échelle : rouge (0) → jaune (5) → vert (10)
  const SCALE = ['#f0506e', '#f2665f', '#f57d52', '#f89547', '#fbad3f', '#ffc23d', '#d9cc45', '#b3d64f', '#8bdc63', '#5fd884', '#2fd3a7'];
  let draft = { key: '', text: '' };
  let animatedFor = '';   // révélation déjà jouée pour cette manche
  let revealTimer = null;

  const promptCard = (c, extra = '', keep = false) => `
    <div class="card center nt-prompt ${keep ? 'keep' : ''}">
      <div class="nt-q">${esc(c.q)}</div>
      <div class="nt-ends"><span>0 · ${esc(c.low)}</span><span>${esc(c.high)} · 10</span></div>
      ${extra}
    </div>`;

  // échelle 0 → 10 ; mode : 'show' (note marquée), 'pick' (boutons), 'reveal' (avatars des devinettes)
  function scale(mode, { mine = null, picked = null, guesses = {} } = {}) {
    const cells = SCALE.map((col, i) => {
      if (mode === 'pick') return `<button class="nt-cell ${picked === i ? 'sel' : ''}" data-n="${i}" style="--c:${col}">${i}</button>`;
      const who = mode === 'reveal' ? Object.entries(guesses).filter(([, n]) => n === i).map(([id]) => av(P(id), 'sm')).join('') : '';
      return `<div class="nt-cell ${mine === i ? 'mine' : ''}" data-cell="${i}" style="--c:${col}">
        ${mode === 'reveal' ? `<div class="nt-who">${who}</div>` : ''}<span>${i}</span></div>`;
    }).join('');
    return `<div class="nt-scale ${mode}">${mode === 'reveal' ? '<div class="nt-fill"></div>' : ''}${cells}</div>`;
  }

  const screens = {
    write(S, g) {
      const t = g.myTask;
      if (!t) return '<div class="card">Tu ne participes pas à cette manche.</div>';
      if (draft.key !== t.q) draft = { key: t.q, text: '' };
      if (g.myStory) {
        return `
          <div class="phase"><div class="step">Écriture ${UI.timer(g.remaining)}</div><div class="t">Histoire envoyée 🤫</div></div>
          <div class="card"><p class="nt-story" style="margin-top:0">${esc(g.myStory)}</p><button class="ghost" data-edit>✏️ Modifier</button></div>
          <div class="card"><div data-live="writing"></div></div>
          ${UI.forceLink('Commencer sans les retardataires')}`;
      }
      return `
        <div class="phase"><div class="step">Écriture ${UI.timer(g.remaining)}</div><div class="t">Ta note secrète : ${t.number} / 10</div></div>
        ${promptCard(t, scale('show', { mine: t.number }), true)}
        <div class="card stack">
          <p class="muted" style="margin:0">Écris une histoire qui vaut <b>${t.number} sur 10</b> sur cette échelle. Elle peut être vraie ou inventée. Ne donne pas le chiffre : les autres doivent le deviner !</p>
          <textarea id="story" maxlength="320" placeholder="Il était une fois…">${esc(draft.text)}</textarea>
          <button class="full alt" data-story>Envoyer</button>
        </div>
        <div class="card"><div data-live="writing"></div></div>`;
    },

    guess(S, g) {
      const c = g.current;
      const step = `Histoire ${g.round} sur ${g.totalRounds} ${UI.timer(g.remaining)}`;
      const storyCard = c.story
        ? `<div class="card"><div class="nt-by">${av(P(c.authorId))}<b>${name(c.authorId)}</b><span class="muted">raconte…</span></div><p class="nt-story">${esc(c.story)}</p></div>`
        : `<div class="card center nt-oral"><div>${av(P(c.authorId), 'lg')}</div><div class="nt-q" style="margin-top:10px">🎤 ${name(c.authorId)} raconte à voix haute</div><p class="muted" style="margin-bottom:0">Écoute bien, puis donne ta note.</p></div>`;
      if (c.isAuthor) {
        if (!c.story) {
          return `
            <div class="phase"><div class="step">${step}</div><div class="t">À toi de raconter ! 🎤</div></div>
            ${promptCard(c, scale('show', { mine: c.number }), true)}
            <div class="card keep center"><p style="margin:0">Raconte à voix haute une histoire, vraie ou inventée, qui vaut <b>${c.number} sur 10</b>.<br><span class="muted">Ne dis pas le chiffre !</span></p></div>
            <div class="card"><div data-live="guessing"></div></div>
            ${UI.forceLink('Révéler maintenant')}`;
        }
        return `
          <div class="phase"><div class="step">${step}</div><div class="t">Ils devinent ta note 😈</div></div>
          ${promptCard(c, scale('show', { mine: c.number }), true)}
          ${storyCard}
          <div class="card"><div data-live="guessing"></div></div>
          ${UI.forceLink('Révéler maintenant')}`;
      }
      return `
        <div class="phase"><div class="step">${step}</div><div class="t">Quelle note ? 🤔</div></div>
        ${promptCard(c)}
        ${storyCard}
        <div class="card">
          <div class="nt-pickhead">${g.myGuess != null ? `Ta réponse : <b>${g.myGuess} / 10</b>` : 'Touche une note'}</div>
          ${scale('pick', { picked: g.myGuess })}
          <p class="center" data-live="count" style="margin-bottom:0"></p>
        </div>
        ${UI.forceLink('Révéler maintenant')}`;
    },

    reveal(S, g) {
      const c = g.current;
      const last = g.round >= g.totalRounds;
      return `
        <div class="phase"><div class="step">Histoire ${g.round} sur ${g.totalRounds}</div><div class="t">La note de ${name(c.authorId)}…</div></div>
        ${promptCard(c)}
        <div class="card nt-revealcard">
          <div class="nt-counter"><span class="nt-num">?</span><small>/ 10</small></div>
          ${scale('reveal', { guesses: g.guesses })}
        </div>
        <div class="nt-after">
          ${c.story ? `<div class="card"><div class="nt-by">${av(P(c.authorId))}<b>${name(c.authorId)}</b></div><p class="nt-story">${esc(c.story)}</p></div>` : ''}
          <div class="card gains-card">${UI.gainsBlock(g.result.gains)}</div>
          <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(g.result.gains))}</div>
        </div>
        ${UI.hostButton(last ? 'Voir le podium 🏆' : 'Histoire suivante')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  // ─── La révélation : la jauge monte case par case, de plus en plus lentement ──
  function playReveal(root, g) {
    clearTimeout(revealTimer);
    const truth = g.result.truth;
    const card = root.querySelector('.nt-revealcard');
    const fill = root.querySelector('.nt-fill');
    const num = root.querySelector('.nt-num');
    const after = root.querySelector('.nt-after');
    if (!card) return;
    const dock = root.querySelector('.dock');
    if (dock) dock.style.visibility = 'hidden'; // le bouton « suivant » attend la fin du suspense
    const setTo = (i) => {
      fill.style.width = `${((i + 1) / 11) * 100}%`;
      fill.style.background = SCALE[i];
      num.textContent = i;
      root.querySelectorAll('.nt-cell').forEach((c) => c.classList.toggle('lit', Number(c.dataset.cell) <= i));
    };
    const finish = () => {
      setTo(truth);
      card.classList.add('done');
      root.querySelector(`.nt-cell[data-cell="${truth}"]`)?.classList.add('hit');
      after.classList.add('shown');
      if (dock) dock.style.visibility = '';
      navigator.vibrate?.(120);
    };
    const key = `${g.round}`;
    if (animatedFor === key || matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
    animatedFor = key;
    let i = 0;
    const tick = () => {
      setTo(i);
      if (i >= truth) { revealTimer = setTimeout(finish, 450); return; }
      i++;
      // les derniers pas sont de plus en plus lents : suspense
      const progress = truth ? i / truth : 1;
      revealTimer = setTimeout(tick, 140 + Math.pow(progress, 3) * 650);
    };
    revealTimer = setTimeout(tick, 900); // laisse le temps de voir les devinettes
  }

  UI.registerGame('note', {
    rules: () => `
      <ol class="rules">
        <li>Chacun reçoit un <b>thème</b> (ex. : « Raconte un rendez-vous amoureux ») et une <b>note secrète de 0 à 10</b> sur une échelle (Catastrophe → Parfait).</li>
        <li>Tu écris une histoire, vraie ou inventée, qui vaut <b>exactement ta note</b>. Interdit de donner le chiffre !</li>
        <li>Histoire par histoire, les autres <b>devinent la note</b>. Puis la jauge révèle la vraie.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">🎯 Note exacte : <b>+100</b> · À 1 près : <b>+60</b> · À 2 près : <b>+30</b><br>✍️ L'auteur gagne la moyenne des points des autres : dose bien ton histoire !</div>`,

    // écran partagé : pendant l'écriture et les devinettes, on n'affiche que le public
    tv: (S, g) => {
      if (g.phase === 'write') {
        return `<div class="phase"><div class="step">Écriture ${UI.timer(g.remaining)}</div><div class="t">Chacun écrit son histoire ✍️</div></div>
          <div class="card center"><p class="tv-big" style="margin:0">Une note secrète de 0 à 10, une histoire à doser…</p></div>
          <div class="card"><div data-live="writing"></div></div>`;
      }
      if (g.phase === 'guess') {
        const c = g.current;
        return `<div class="phase"><div class="step">Histoire ${g.round} sur ${g.totalRounds} ${UI.timer(g.remaining)}</div><div class="t">Quelle note ? 🤔</div></div>
          ${promptCard(c, scale('show'))}
          ${c.story ? `<div class="card"><div class="nt-by">${av(P(c.authorId))}<b>${name(c.authorId)}</b><span class="muted">raconte…</span></div><p class="nt-story tv-big" style="font-size:1.6rem">${esc(c.story)}</p></div>`
            : `<div class="card center nt-oral"><div>${av(P(c.authorId), 'lg')}</div><div class="tv-big" style="margin-top:12px">🎤 ${name(c.authorId)} raconte…</div></div>`}
          <div class="card"><div data-live="guessing"></div></div>`;
      }
      return null; // les autres écrans sont les mêmes que sur les téléphones
    },

    key: (S, g) => [g.phase, g.round, !!g.myStory, g.myGuess].join('|'),

    screen: (S, g) => screens[g.phase](S, g),

    live: {
      writing: (S, g) => `<div class="muted" style="margin-bottom:8px">${g.written.length} sur ${g.participants.filter((id) => P(id)?.connected).length} ont écrit</div>
        <div class="players">${g.participants.filter((id) => P(id)?.connected).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} ${g.written.includes(id) ? '✅' : '<span class="wait">✍️</span>'}</span></div>`).join('')}</div>`,
      guessing: (S, g) => `<div class="muted" style="margin-bottom:8px">${g.guessed.length} sur ${g.needed} ont répondu</div>
        <div class="players">${g.participants.filter((id) => id !== g.current.authorId && P(id)?.connected).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} ${g.guessed.includes(id) ? '✅' : '<span class="wait">🤔</span>'}</span></div>`).join('')}</div>`,
      count: (S, g) => `<span class="pill">🗳️ ${g.guessed.length} sur ${g.needed} réponses</span>`,
    },

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      const ta = root.querySelector('#story');
      if (ta) ta.addEventListener('input', () => { draft.text = ta.value; });
      on('[data-story]', () => { if (draft.text.trim().length < 10) return UI.toast('Écris une vraie petite histoire 😉'); UI.send('story', draft.text); });
      on('[data-edit]', () => { draft.text = g.myStory; UI.send('edit'); });
      on('[data-n]', (e) => UI.send('guess', Number(e.currentTarget.dataset.n)));
      if (g.phase === 'reveal') playReveal(root, g);
    },
  });
})();
