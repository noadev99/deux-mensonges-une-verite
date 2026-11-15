// ⛩️ Trombi manga — affichage
(() => {
  const { esc, P, av, name } = UI;
  let search = '';
  let draft = { q: '', g: '' };
  let shown = true;
  const FAME = { 3: '⭐⭐⭐ ultra connu', 2: '⭐⭐ connu', 1: '⭐ pour les experts' };

  // une couleur par série
  const SERIES = {};
  const PALETTE = ['#ffd43b', '#ff8fb5', '#69db7c', '#4dabf7', '#da77f2', '#ffa94d', '#38d9a9', '#748ffc', '#f783ac', '#a9e34b', '#ff6b6b', '#c8a165'];
  const colorOf = (series) => SERIES[series] || (SERIES[series] = PALETTE[Object.keys(SERIES).length % PALETTE.length]);

  // carte d'un perso (nom, série, symbole) — pas d'image officielle
  const card = (c, { big = false, pick = false } = {}) => {
    const tag = pick ? 'button' : 'div';
    return `<${tag} class="tb-card ${big ? 'big' : ''}" ${pick ? `data-pick="${c.i}"` : ''} style="--c:${colorOf(c.series)}">
      <span class="tb-emo">${c.emoji}</span><b>${esc(c.name)}</b><small>${esc(c.series)}</small></${tag}>`;
  };

  const logHtml = (g) => g.log.length ? g.log.slice().reverse().map((l) => l.kind === 'g'
    ? `<div class="tb-log">${av(P(l.asker), 'sm')}<span class="tb-lt">${name(l.asker)} propose <b>« ${esc(l.guess)} »</b></span>${l.ok ? '✅' : '❌'}</div>`
    : `<div class="tb-log">${av(P(l.asker), 'sm')}<span class="tb-lt">${l.q ? `« ${esc(l.q)} »` : '🎤 question à l\'oral'}</span><b class="tb-a ${l.a}">${l.a === 'oui' ? 'Oui' : l.a === 'non' ? 'Non' : 'Bof'}</b></div>`).join('')
    : '<div class="muted center">Pas encore de question…</div>';

  const head = (g, title) => UI.header(g.round, g.totalRounds, `Manche ${g.round} / ${g.totalRounds} · question ${Math.min(g.questions, g.maxQ)} / ${g.maxQ}`, title);
  const hotBanner = (g) => `<div class="card center tb-hot">${av(P(g.hot), 'lg')}<div class="muted" style="margin-top:6px">Sur la sellette</div><h2 style="margin:0">${name(g.hot)}</h2></div>`;

  // l'action du moment, selon qui je suis
  function action(S, g) {
    const c = g.current, me = S.you;
    if (g.phase === 'ask') {
      if (c.asker !== me) return `<div class="card center tb-turn">${av(P(c.asker), 'sm')} <b>${name(c.asker)}</b> prépare sa question… <span class="wait">🤔</span></div>`;
      return `<div class="card keep tb-turn"><h2 style="margin-top:0">À toi ! Pose une question à ${name(g.hot)}</h2>
        ${g.oral ? `<p style="margin:4px 0 10px">Pose-la <b>à voix haute</b> (réponse oui ou non), puis :</p><button class="full alt" data-ask>J'ai posé ma question ✅</button>`
          : `<div class="row"><input id="q" maxlength="140" placeholder="Il vient de One Piece ?" autocomplete="off" value="${esc(draft.q)}" /><button class="alt" data-ask style="flex:0 0 auto">Demander</button></div>`}
        <details class="tb-direct"><summary>🔎 Je sais déjà qui c'est !</summary>${guessBox()}</details></div>`;
    }
    if (g.phase === 'answer') {
      const q = c.q ? `« ${esc(c.q)} »` : '🎤 (question posée à l\'oral)';
      if (g.hot === me) {
        return `<div class="card keep tb-turn center"><h2 style="margin-top:0">${name(c.asker)} te demande :</h2><p class="tb-q">${q}</p>
          <div class="row"><button class="tb-yes" data-answer="oui">👍 Oui</button><button class="tb-no" data-answer="non">👎 Non</button></div>
          <p style="margin:8px 0 0"><a class="link" data-answer="bof">Je ne sais pas trop</a></p></div>`;
      }
      return `<div class="card center tb-turn">${av(P(c.asker), 'sm')} <b>${name(c.asker)}</b> demande :<p class="tb-q">${q}</p><span class="wait">🤔</span> ${name(g.hot)} répond…</div>`;
    }
    if (g.phase === 'decide') {
      const ans = `<b class="tb-a ${c.a}">${c.a === 'oui' ? 'OUI' : c.a === 'non' ? 'NON' : 'Bof…'}</b>`;
      if (c.asker === me) {
        return `<div class="card keep tb-turn"><p class="tb-q center" style="margin-top:0">${c.q ? `« ${esc(c.q)} »` : 'Ta question'} → ${ans}</p>
          <p style="margin:0 0 6px"><b>Tu as une idée ?</b> Tape le nom du perso :</p>${guessBox()}
          <p class="center" style="margin:10px 0 0"><a class="link" data-pass>Passer mon tour</a></p></div>`;
      }
      return `<div class="card center tb-turn">${name(g.hot)} a répondu ${ans}<p class="tb-q">${c.q ? `« ${esc(c.q)} »` : '🎤'}</p>${av(P(c.asker), 'sm')} ${name(c.asker)} réfléchit…</div>`;
    }
    return '';
  }
  const guessBox = () => `<div class="row"><input id="guess" maxlength="40" placeholder="Nom du perso (ex. Luffy)" autocomplete="off" autocapitalize="off" value="${esc(draft.g)}" />
    <button class="alt" data-guess style="flex:0 0 auto">Deviner</button></div>`;

  const myCard = (g) => g.mine ? `<button class="tb-secret keep ${shown ? 'shown' : ''}" data-flip style="--c:${colorOf(g.mine.series)}">
      ${shown ? `<span class="tb-emo">${g.mine.emoji}</span><span><b>${esc(g.mine.name)}</b><br><small>${esc(g.mine.series)} · ${FAME[g.mine.fame]}</small></span>`
        : '<span class="tb-emo tb-back">⛩️</span><span><b>Ton perso secret</b><br><small>Touche pour le revoir</small></span>'}</button>` : '';

  const screens = {
    choose(S, g) {
      if (g.hot !== S.you) {
        return `${head(g, `${name(g.hot)} choisit son perso… 🤫`)}${hotBanner(g)}
          <p class="center white">Prépare tes questions : réponse oui ou non uniquement !</p>`;
      }
      const q = search.trim().toLowerCase();
      const list = g.pool.filter((c) => !q || c.name.toLowerCase().includes(q) || c.series.toLowerCase().includes(q));
      const bySeries = {};
      for (const c of list) (bySeries[c.series] = bySeries[c.series] || []).push(c);
      return `${head(g, 'Choisis ton perso ⛩️')}
        <div class="card keep center"><p style="margin-top:0">Les autres vont devoir le deviner. Plus il est <b>connu</b> et plus il tient longtemps, plus tu marques !</p>
          <button class="full alt" data-pick="random">🎲 Un perso au hasard</button></div>
        <div class="card keep"><input id="search" placeholder="🔍 Chercher un perso ou une série…" autocomplete="off" value="${esc(search)}" />
          <div class="tb-choose">${Object.entries(bySeries).map(([series, cs]) => `<h3 class="tb-series" style="--c:${colorOf(series)}">${esc(series)}</h3>
            <div class="tb-grid">${cs.map((c) => card(c, { pick: true })).join('')}</div>`).join('') || '<p class="muted center">Aucun perso trouvé</p>'}</div></div>`;
    },

    play(S, g) {
      return `${head(g, g.hot === S.you ? 'Tu es sur la sellette 🔥' : `Qui est le perso de ${name(g.hot)} ?`)}
        ${g.hot === S.you ? myCard(g) : hotBanner(g)}
        ${S.spectator ? '' : action(S, g)}
        ${S.spectator ? action({ you: null }, g) : ''}
        <div class="card"><h2>Questions et essais</h2><div data-live="log"></div></div>
        ${UI.forceLink('Passer (joueur absent)')}`;
    },

    reveal(S, g) {
      const r = g.result;
      return `${head(g, r.finder ? `${name(r.finder)} a trouvé ! 🎉` : `Personne n'a trouvé ! 🥷`)}
        <div class="card center reveal"><div class="muted">Le perso de ${name(g.hot)} était</div><div class="tb-hero">${card(r.char, { big: true })}</div>
          <div class="muted">${FAME[r.char.fame]} · ${r.questions} question${r.questions > 1 ? 's' : ''}</div></div>
        <div class="card"><h2>Questions et essais</h2>${logHtml(g)}</div>
        <div class="card gains-card">${UI.gainsBlock(r.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(r.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Manche suivante')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };
  const screenOf = (g) => (g.phase === 'choose' ? 'choose' : g.phase === 'reveal' ? 'reveal' : g.phase === 'end' ? 'end' : 'play');

  UI.registerGame('trombi', {
    rules: () => `
      <ol class="rules">
        <li>Chaque manche, un joueur passe <b>sur la sellette</b> : il choisit un perso d'animé parmi <b>158</b> (ou au hasard).</li>
        <li>Les autres, chacun son tour, lui posent une <b>question oui/non</b> (« C'est un pirate ? »).</li>
        <li>Après la réponse, tu peux <b>taper le nom</b> du perso pour deviner. Les petites fautes et les surnoms connus (Killua, Ash, Frieza…) sont acceptés.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">🔎 Celui qui trouve : plus de points si le perso est <b>peu connu</b> et trouvé en <b>peu de questions</b><br>
      🛡️ Celui sur la sellette : plus de points si son perso est <b>très connu</b> et a <b>tenu longtemps</b> (20 questions maximum)</div>`,

    key: (S, g) => [g.phase, g.round, g.current?.asker, g.current?.a, shown, g.phase === 'choose' && g.hot === S.you ? search : ''].join('|'),

    onState: (S, g) => { if (g.phase === 'answer' && g.hot === S.you) navigator.vibrate?.(80); },

    screen: (S, g) => screens[screenOf(g)](S, g),
    tv: (S, g) => (screenOf(g) === 'end' ? null : screens[screenOf(g)](S, g)),

    live: { log: (S, g) => logHtml(g) },

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      on('[data-flip]', () => { shown = !shown; UI.refresh(); });
      on('[data-pick]', (e) => {
        const v = e.currentTarget.dataset.pick;
        if (v === 'random') return UI.send('choose', 'random');
        const c = g.pool[Number(v)];
        if (confirm(`Tu choisis ${c.name} (${c.series}) ?`)) { search = ''; UI.send('choose', Number(v)); }
      });
      const s = root.querySelector('#search');
      if (s) {
        s.addEventListener('input', () => { search = s.value; const pos = s.selectionStart; UI.refresh(); const n = document.querySelector('#search'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } });
      }
      const q = root.querySelector('#q');
      if (q) { q.addEventListener('input', () => { draft.q = q.value; }); q.addEventListener('keydown', (e) => e.key === 'Enter' && root.querySelector('[data-ask]').click()); }
      on('[data-ask]', () => { UI.send('ask', q ? q.value : ''); draft.q = ''; });
      on('[data-answer]', (e) => UI.send('answer', e.currentTarget.dataset.answer));
      on('[data-pass]', () => UI.send('pass'));
      root.querySelectorAll('#guess').forEach((inp) => {
        inp.addEventListener('input', () => { draft.g = inp.value; });
        inp.addEventListener('keydown', (e) => e.key === 'Enter' && inp.closest('.row').querySelector('[data-guess]').click());
      });
      on('[data-guess]', (e) => { const inp = e.currentTarget.closest('.row').querySelector('#guess'); if (inp.value.trim()) { UI.send('guess', inp.value); draft.g = ''; } });
    },
  });
})();
