// 🎭 2 Mensonges, 1 Vérité — affichage
(() => {
  const { esc, P, av, name } = UI;
  const L = ['A', 'B', 'C'];
  const DRAFT = 'draft-deux-mensonges';
  let draft = JSON.parse(localStorage.getItem(DRAFT) || 'null') || { texts: ['', '', ''], trueIndex: null };
  const saveDraft = () => localStorage.setItem(DRAFT, JSON.stringify(draft));
  let match = {};          // association en cours : { indexSérie: idJoueur }
  let autoSent = '';       // phase déjà envoyée automatiquement à la fin du chrono

  const STARTERS = [
    'Petit(e), j\'ai ', 'Je n\'ai jamais ', 'Un jour, au travail, ', 'Ma pire honte : ', 'J\'ai déjà ',
    'En vacances, j\'ai ', 'Je suis allergique ', 'J\'ai rencontré ', 'À l\'école, j\'ai ', 'Mon premier job, c\'était ',
    'J\'ai peur ', 'Je sais ', 'Une fois, je me suis retrouvé(e) ', 'Je collectionne ', 'J\'ai été viré(e) ',
  ];

  const anecList = (g, opts = {}) => g.current.items.map((t, i) => {
    const c = g.current;
    let cls = 'anec', badge = '', voters = '';
    if (opts.showTruth && c.trueIndex != null) {
      cls += i === c.trueIndex ? ' true' : (opts.dimFalse ? ' false' : '');
      badge = i === c.trueIndex ? '<span class="badge t">VRAIE</span>' : '<span class="badge f">FAUSSE</span>';
    }
    if (opts.votes) {
      const v = Object.entries(opts.votes).filter(([, idx]) => idx === i).map(([pid]) => av(P(pid), 'sm')).join('');
      voters = v ? `<div class="voters">${v}</div>` : '';
    }
    if (opts.clickable) {
      if (c.myVote === i) cls += ' sel';
      return `<button class="${cls}" data-true="${i}"><span class="l">${L[i]}</span>${esc(t)}</button>`;
    }
    return `<div class="${cls}">${badge}<span class="l">${L[i]}</span>${esc(t)}${voters}</div>`;
  }).join('');

  const sumGains = (...list) => {
    const d = {};
    for (const x of list) if (x) for (const [id, v] of Object.entries(x)) d[id] = (d[id] || 0) + v.total;
    return d;
  };

  const phaseHead = (step, title, g) => `<div class="phase"><div class="step">${step} ${UI.timer(g.remaining)}</div><div class="t">${title}</div></div>`;
  const progress = (g) => `<div class="progress"><div style="width:${((g.round - 1) / g.totalRounds) * 100}%"></div></div>`;
  const roundStep = (g) => `Série ${g.current.label} · ${g.round} sur ${g.totalRounds}`;

  // ─── Écrans ────────────────────────────────────────────────────────────────
  const screens = {
    writing(S, g) {
      if (g.submitted.includes(S.you)) {
        return `
          ${phaseHead('Préparation', 'C\'est envoyé ! 🤫', g)}
          <div class="card"><div data-live="writingStatus"></div></div>
          <button class="full ghost" data-edit>✏️ Modifier mes anecdotes</button>
          <div style="height:10px"></div>
          ${UI.forceLink('Commencer sans les retardataires')}`;
      }
      return `
        ${phaseHead('Préparation', 'Écris tes 3 anecdotes', g)}
        <div class="card">
          <p class="muted" style="margin-top:0">2 fausses, 1 vraie : coche la vraie.<br>💡 Choisis une vérité que tes amis <b>ne connaissent pas</b>, sinon ils la trouveront tout de suite. Et tu peux imiter le style d'un autre pour brouiller les pistes…</p>
          <button class="ghost dm-inspi" data-inspi>💡 Inspiration</button>
          ${[0, 1, 2].map((i) => `
            <textarea data-t="${i}" maxlength="200" placeholder="Anecdote ${L[i]}…">${esc(draft.texts[i] || '')}</textarea>
            <label class="truth"><input type="radio" name="truth" value="${i}" ${draft.trueIndex === i ? 'checked' : ''}/> C'est la vraie</label>`).join('')}
          <button class="full alt" data-submit>Valider 🔒</button>
          <p class="muted" style="font-size:.85rem;margin-bottom:0">À la fin du chrono, tes anecdotes sont envoyées si elles sont complètes.</p>
        </div>
        <div class="card"><div data-live="writingStatus"></div></div>`;
    },

    match(S, g) {
      const todo = g.sets.map((x, i) => ({ ...x, i })).filter((x) => !x.mine);
      if (g.myMatch) {
        return `
          ${phaseHead('Le grand jeu d\'association', 'C\'est envoyé ✅', g)}
          <div class="card">${todo.map((x) => `<div class="score"><b class="dm-label">${x.label}</b><span class="n">${esc(x.items[0])}…</span>${g.myMatch[x.i] ? `${av(P(g.myMatch[x.i]), 'sm')} ${name(g.myMatch[x.i])}` : '<span class="muted">—</span>'}</div>`).join('')}
            <div style="height:10px"></div><button class="ghost" data-edit>✏️ Modifier</button></div>
          <div class="card"><div data-live="matchStatus"></div></div>
          ${UI.forceLink('Révéler maintenant')}`;
      }
      const used = Object.entries(match); // [indexSérie, idJoueur]
      const complete = todo.every((x) => match[x.i]);
      return `
        ${phaseHead('Le grand jeu d\'association', 'Qui a écrit quoi ? 🕵️', g)}
        <p class="center white" style="margin-top:-6px">Associe chaque série à son auteur. Chaque joueur n'a écrit qu'une série.</p>
        ${g.sets.map((x, i) => x.mine ? `
          <div class="card dm-set dm-mine"><div class="dm-sethead"><b class="dm-label">${x.label}</b><span class="muted">C'est ta série 🤫</span></div></div>` : `
          <div class="card dm-set">
            <div class="dm-sethead"><b class="dm-label">${x.label}</b><span class="muted">Série ${x.label}</span></div>
            <ul class="dm-items">${x.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
            <div class="dm-who">${g.candidates.filter(P).map((id) => {
              const elsewhere = used.find(([si, pid]) => pid === id && Number(si) !== i);
              return `<button class="dm-chip ${match[i] === id ? 'sel' : ''} ${elsewhere ? 'used' : ''}" data-set="${i}" data-pid="${id}">${av(P(id), 'sm')} ${name(id)}${elsewhere ? ` <small>(${g.sets[elsewhere[0]].label})</small>` : ''}</button>`;
            }).join('')}</div>
          </div>`).join('')}
        <div class="dock"><button class="alt" data-match ${complete ? '' : 'disabled'}>${complete ? 'Valider mes choix' : `Encore ${todo.filter((x) => !match[x.i]).length} série(s) à attribuer`}</button></div>`;
    },

    matchReveal(S, g) {
      const myGood = g.sets.filter((x) => !x.mine && x.myGuess === x.authorId).length;
      const myTotal = g.sets.filter((x) => !x.mine).length;
      return `
        <div class="phase"><div class="step">La révélation</div><div class="t">Qui a écrit quoi ?</div></div>
        ${myTotal ? `<p class="center white">Tu as trouvé <b>${myGood} sur ${myTotal}</b> ${myGood === myTotal ? '🎉' : ''}</p>` : ''}
        ${g.sets.map((x, i) => `
          <div class="card dm-set reveal" style="animation-delay:${i * 0.15}s">
            <div class="dm-sethead"><b class="dm-label">${x.label}</b>${av(P(x.authorId))}<b style="flex:1">${name(x.authorId)}</b>
              ${x.mine ? '<span class="muted">ta série</span>' : x.myGuess ? (x.myGuess === x.authorId ? '✅' : `❌ <span class="muted" style="font-size:.85rem">tu as dit ${name(x.myGuess)}</span>`) : ''}</div>
            <ul class="dm-items">${x.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
            <div class="muted" style="font-size:.9rem">${x.found.length ? `Reconnu par ${x.found.map((id) => `${av(P(id), 'sm')} ${name(id)}`).join(', ')}` : 'Personne ne l\'a reconnu 👻'}</div>
          </div>`).join('')}
        <div class="card gains-card">${UI.gainsBlock(g.matchGains)}</div>
        ${UI.hostButton('Trouver les vérités')}`;
    },

    guessTrue(S, g) {
      const c = g.current;
      if (c.isAuthor) {
        return `
          ${progress(g)}
          ${phaseHead(roundStep(g), 'Regarde-les galérer 😈', g)}
          <div class="card">${anecList(g, { showTruth: true })}</div>
          <div class="card"><h2>Ils réfléchissent…</h2><div data-live="waitTrue"></div></div>
          ${UI.forceLink('Révéler maintenant')}`;
      }
      return `
        ${progress(g)}
        ${phaseHead(roundStep(g), 'Laquelle est vraie ? 🤔', g)}
        <div class="card">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">${av(P(c.authorId))}<b>${name(c.authorId)}</b> dit la vérité sur une seule :</div>
          ${anecList(g, { clickable: true })}
          <p class="center" data-live="voteCount"></p>
        </div>
        ${UI.forceLink('Révéler maintenant')}`;
    },

    revealTrue(S, g) {
      const c = g.current;
      return `
        ${progress(g)}
        <div class="phase"><div class="step">${roundStep(g)}</div><div class="t">La vérité sur ${name(c.authorId)}</div></div>
        <div class="card reveal">${anecList(g, { showTruth: true, dimFalse: true, votes: c.trueVotes })}</div>
        <div class="card gains-card">${UI.gainsBlock(c.trueGains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, sumGains(c.trueGains))}</div>
        ${UI.hostButton(`🎤 ${name(c.authorId)}, raconte !`)}`;
    },

    story(S, g) {
      const c = g.current;
      const last = g.round >= g.totalRounds;
      return `
        <div class="phase"><div class="step">${roundStep(g)}</div><div class="t">${c.isAuthor ? 'À toi de raconter ! 🎤' : 'Raconte ! 🎤'}</div></div>
        <div class="card center reveal dm-story">
          ${av(P(c.authorId), 'lg')}
          <h2 style="margin:12px 0 4px">${c.isAuthor ? 'Raconte-leur l\'histoire vraie' : `${name(c.authorId)} raconte l'histoire vraie`}</h2>
          <div class="dm-truth">${esc(c.items[c.trueIndex])}</div>
          <p class="muted" style="margin-bottom:0">${c.isAuthor ? 'Quand, où, comment… les autres veulent tous les détails !' : 'Pose-lui toutes tes questions 👀'}</p>
        </div>
        ${UI.hostButton(last ? 'Voir le podium 🏆' : 'Série suivante')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  // Envoi automatique juste avant la fin du chrono (ce qui est prêt n'est pas perdu)
  setInterval(() => {
    const S = UI.state;
    if (!S || S.gameId !== 'deux-mensonges' || !S.game) return;
    const g = S.game;
    const key = `${g.phase}|${g.round}`;
    if (autoSent === key || UI.timeLeft() > 1500) return;
    if (g.phase === 'writing' && !g.submitted.includes(S.you)
      && draft.texts.every((t) => t && t.trim().length >= 3) && draft.trueIndex != null && draft.trueIndex >= 0) {
      autoSent = key; UI.send('submit', draft);
    }
    if (g.phase === 'match' && !g.myMatch && Object.keys(match).length) { autoSent = key; UI.send('match', match); }
  }, 500);

  UI.registerGame('deux-mensonges', {
    rules: () => `
      <ol class="rules">
        <li>Chacun écrit <b>3 anecdotes</b> sur lui : <b>2 fausses, 1 vraie</b> (3 min).</li>
        <li><b>Le grand jeu d'association :</b> toutes les séries s'affichent sans les noms. Associe chaque série à son auteur (style, fautes, émojis… tout est indice).</li>
        <li>On révèle tous les auteurs d'un coup. Puis, série par série : <b>laquelle est vraie ?</b></li>
        <li>🎤 L'auteur <b>raconte</b> l'histoire vraie !</li>
      </ol>
      <div class="muted" style="font-size:.92rem">
        🔍 Auteur reconnu : <b>+100</b> · ✅ Vraie anecdote trouvée : <b>+100</b> · 🕵️ Les deux sur la même série : <b>+50</b><br>
        🥸 Ta série : <b>+50</b> par joueur qui ne t'a pas reconnu, 👻 <b>+100</b> si personne<br>
        🤥 <b>+75</b> par joueur berné, 🎭 <b>+150</b> si personne ne trouve la vérité
      </div>`,

    key: (S, g) => [g.phase, g.round, g.current?.myVote, (g.submitted || []).includes(S.you), !!g.myMatch, JSON.stringify(match)].join('|'),

    onState: (S, g) => {
      if (g.phase === 'end' && draft.texts.some(Boolean)) { draft = { texts: ['', '', ''], trueIndex: null }; saveDraft(); }
      if (g.phase === 'writing' && g.myAnecdotes) draft = { texts: g.myAnecdotes.map((a) => a.text), trueIndex: g.myAnecdotes.findIndex((a) => a.isTrue) };
      if (g.phase === 'match' && g.myMatch && !Object.keys(match).length) match = { ...g.myMatch };
      if (g.phase !== 'match') match = {};
    },

    screen: (S, g) => screens[g.phase](S, g),

    live: {
      writingStatus: (S, g) => {
        const ids = g.participants.filter(P);
        const done = ids.filter((id) => g.submitted.includes(id)).length;
        return `<div class="muted" style="margin-bottom:8px">${done} sur ${ids.filter((id) => P(id).connected).length} prêts</div>
          <div class="players">${ids.map((id) => `<div class="player ${P(id).connected ? '' : 'off'}">${av(P(id))}<span>${name(id)} ${g.submitted.includes(id) ? '✅' : '<span class="wait">✍️</span>'}</span></div>`).join('')}</div>`;
      },
      matchStatus: (S, g) => `<div class="muted" style="margin-bottom:8px">${g.matched.length} sur ${g.needed} ont fini</div>
        <div class="players">${g.participants.filter((id) => P(id)?.connected).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} ${g.matched.includes(id) ? '✅' : '<span class="wait">🤔</span>'}</span></div>`).join('')}</div>`,
      voteCount: (S, g) => `<span class="pill">🗳️ ${g.current.voted} sur ${g.current.needed} votes</span>`,
      waitTrue: (S, g) => `<div class="players">${(g.current.waitingFor || []).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} <span class="wait">🤔</span></span></div>`).join('') || '<span class="muted">Tout le monde a voté !</span>'}</div>`,
    },

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      on('[data-true]', (e) => UI.send('voteTrue', Number(e.currentTarget.dataset.true)));
      on('[data-edit]', () => UI.send('edit'));
      root.querySelectorAll('[data-t]').forEach((el) => el.addEventListener('input', () => { draft.texts[+el.dataset.t] = el.value; saveDraft(); }));
      root.querySelectorAll('input[name=truth]').forEach((el) => el.addEventListener('change', () => { draft.trueIndex = +el.value; saveDraft(); }));
      on('[data-inspi]', () => {
        // remplit la première case vide avec un début de phrase au hasard
        const areas = [...root.querySelectorAll('[data-t]')];
        const target = areas.find((a) => !a.value.trim()) || areas[0];
        const start = STARTERS[Math.floor(Math.random() * STARTERS.length)];
        target.value = target.value.trim() ? target.value : start;
        draft.texts[+target.dataset.t] = target.value; saveDraft();
        target.focus();
        target.setSelectionRange(target.value.length, target.value.length);
      });
      on('[data-submit]', () => {
        if (draft.texts.some((t) => !t || t.trim().length < 3)) return UI.toast('Remplis les 3 anecdotes');
        if (draft.trueIndex == null || draft.trueIndex < 0) return UI.toast('Coche celle qui est vraie');
        UI.send('submit', draft);
      });
      // association : toucher un joueur l'attribue à la série (et le retire d'une autre série)
      on('[data-set]', (e) => {
        const i = Number(e.currentTarget.dataset.set), pid = e.currentTarget.dataset.pid;
        if (match[i] === pid) delete match[i];
        else {
          for (const k of Object.keys(match)) if (match[k] === pid) delete match[k];
          match[i] = pid;
        }
        const y = window.scrollY;
        UI.refresh();
        window.scrollTo(0, y); // garde la position de lecture
      });
      on('[data-match]', () => UI.send('match', match));
    },
  });
})();
