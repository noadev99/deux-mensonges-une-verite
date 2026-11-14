// 💣 Patate chaude — affichage
(() => {
  const { esc, P, av, name } = UI;
  let lastHolder = null;
  let fuseTimer = null;
  let litAt = 0; // heure locale estimée de l'allumage

  const bomb = (cls = '') => `
    <div class="pt-bomb ${cls}">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <path class="pt-fuse" d="M78 30c6-10 14-16 26-14" fill="none" stroke="#1a0f2e" stroke-width="5" stroke-linecap="round"/>
        <rect x="62" y="26" width="22" height="16" rx="4" transform="rotate(30 73 34)" fill="#3c2a5c" stroke="#1a0f2e" stroke-width="4"/>
        <circle cx="54" cy="70" r="38" fill="#3c2a5c" stroke="#1a0f2e" stroke-width="5"/>
        <path d="M34 58a22 22 0 0 1 16-14" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55"/>
        <g class="pt-spark"><circle cx="105" cy="16" r="7" fill="#ffc23d" stroke="#1a0f2e" stroke-width="3"/><path d="M105 2v6M119 16h-6M115 6l-4 4M95 6l4 4" stroke="#ff6fa3" stroke-width="3" stroke-linecap="round"/></g>
      </svg>
    </div>`;

  const answersList = (g) => g.oral
    ? `<div class="center"><span class="tv-big">${g.answers.length}</span><div class="muted">réponse${g.answers.length > 1 ? 's' : ''} criée${g.answers.length > 1 ? 's' : ''} 🎤</div></div>`
    : g.answers.length
    ? `<div class="pt-answers">${g.answers.slice().reverse().map((a, i) => `<span class="pt-ans ${i === 0 ? 'reveal' : ''}">${av(P(a.pid), 'sm')} ${esc(a.text)}</span>`).join('')}</div>`
    : '<div class="muted center">Aucune réponse pour l\'instant</div>';

  // La mèche brûle de plus en plus vite (sans révéler quand la bombe explose)
  function startFuse() {
    clearInterval(fuseTimer);
    fuseTimer = setInterval(() => {
      const el = document.querySelector('.pt-bomb');
      if (!el) return clearInterval(fuseTimer);
      const t = (Date.now() - litAt) / 1000;
      el.style.setProperty('--shake', `${Math.max(.12, .9 - t / 45)}s`);
    }, 500);
  }

  const screens = {
    ready(S, g) {
      return `
        ${UI.header(g.round, g.totalRounds, `Manche ${g.round} sur ${g.totalRounds}`, 'Prépare-toi…')}
        <div class="card center reveal">
          <div class="muted">La catégorie</div>
          <div class="pt-cat">${esc(g.category)}</div>
          <div class="muted">${av(P(g.holder), 'sm')} <b>${name(g.holder)}</b> commence avec la bombe</div>
        </div>
        ${bomb('pt-off')}
        <p class="center white">Quand la mèche est allumée : réponds vite et la bombe passe au suivant. Pas de doublons !</p>
        ${UI.hostButton('Allumer la mèche 🔥')}`;
    },

    playing(S, g) {
      const mine = g.holder === S.you;
      return `
        <div class="card center pt-catbar"><div class="pt-cat sm">${esc(g.category)}</div></div>
        ${bomb(mine ? 'pt-mine' : '')}
        <div class="phase"><div class="t">${mine ? 'C\'est toi ! Vite !' : `${name(g.holder)} a la bombe`}</div></div>
        ${mine ? (g.oral
          ? `<div class="card center pt-input keep"><p style="margin:0 0 10px">Crie ta réponse, puis :</p><button class="full alt pt-pass" data-pass>💣 Passer la bombe !</button></div>`
          : `<div class="card stack pt-input">
            <input id="ans" maxlength="40" placeholder="Ta réponse…" autocomplete="off" autocapitalize="off" enterkeyhint="send" />
            <button class="full alt" data-ans>Passer la bombe</button></div>`) : ''}
        <div class="card"><div data-live="answers"></div></div>`;
    },

    boom(S, g) {
      const r = g.result;
      return `
        ${UI.header(g.round, g.totalRounds, `Manche ${g.round} sur ${g.totalRounds}`, 'BOUM ! 💥')}
        <div class="card center reveal pt-boom">
          ${av(P(r.victim), 'lg')}
          <h2 style="margin:10px 0 0">${name(r.victim)} a explosé</h2>
          <div class="muted">au bout de ${Math.round(r.duration / 1000)} secondes et ${g.answers.length} réponses</div>
        </div>
        <div class="card"><h2>${esc(g.category)}</h2>${answersList(g)}</div>
        <div class="card gains-card">${UI.gainsBlock(r.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(r.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Manche suivante')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  UI.registerGame('patate', {
    rules: () => `
      <ol class="rules">
        <li>Une <b>catégorie</b> s'affiche (ex. : des fruits).</li>
        <li>Celui qui a la bombe tape une réponse (ou la crie, en mode oral) : la bombe passe au joueur suivant. <b>Pas de doublons !</b></li>
        <li>La bombe explose au bout d'un <b>temps secret</b>. Celui qui la tient à ce moment-là ne marque pas.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">💬 Chaque réponse : <b>+10</b> · 😮‍💨 Survivre à l'explosion : <b>+100</b><br>Astuce : râlez à voix haute si une réponse est bidon, c'est la table qui juge !</div>`,

    key: (S, g) => [g.phase, g.round, g.holder === S.you, g.phase === 'playing' ? g.holder : ''].join('|'),

    onState: (S, g) => {
      if (g.phase === 'playing') {
        if (!litAt || g.elapsed < 1500) litAt = Date.now() - g.elapsed;
        if (g.holder === S.you && lastHolder !== S.you) navigator.vibrate?.(150);
      } else litAt = 0;
      if (g.phase === 'boom' && lastHolder !== null) navigator.vibrate?.([300, 80, 300]);
      lastHolder = g.phase === 'playing' ? g.holder : null;
    },

    screen: (S, g) => screens[g.phase](S, g),

    live: { answers: (S, g) => answersList(g) },

    bind: (S, g, root) => {
      if (g.phase === 'playing') startFuse();
      root.querySelector('[data-pass]')?.addEventListener('click', () => UI.send('answer', ''));
      const input = root.querySelector('#ans');
      const send = () => { if (input.value.trim()) UI.send('answer', input.value); };
      if (input) {
        input.focus();
        input.addEventListener('keydown', (e) => e.key === 'Enter' && send());
        root.querySelector('[data-ans]').addEventListener('click', send);
      }
    },
  });
})();
