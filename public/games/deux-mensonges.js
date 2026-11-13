// 🎭 2 Mensonges, 1 Vérité — affichage
(() => {
  const { esc, P, av, name } = UI;
  const L = ['A', 'B', 'C'];
  const DRAFT = 'draft-deux-mensonges';
  let draft = JSON.parse(localStorage.getItem(DRAFT) || 'null') || { texts: ['', '', ''], trueIndex: null };
  const saveDraft = () => localStorage.setItem(DRAFT, JSON.stringify(draft));

  const header = (g, step, title) => `
    <div class="progress"><div style="width:${g.totalRounds ? ((g.round - 1) / g.totalRounds) * 100 : 0}%"></div></div>
    <div class="phase"><div class="step">${step}</div><div class="t">${title}</div></div>`;
  const roundLabel = (g, s) => `Manche ${g.round} / ${g.totalRounds} · ${s}`;

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

  function gainsBlock(gains) {
    const ids = Object.keys(gains || {}).sort((a, b) => gains[b].total - gains[a].total);
    if (!ids.length) return '<div class="muted">Personne ne marque de points cette fois.</div>';
    return `<div class="gains">${ids.map((id) => `
      <div class="g"><div style="display:flex;align-items:center;gap:10px">${av(P(id))}<b style="flex:1">${name(id)}</b><span class="plus">+${gains[id].total}</span></div>
      <ul>${gains[id].reasons.map((r) => `<li>+${r.pts} · ${esc(r.label)}</li>`).join('')}</ul></div>`).join('')}</div>`;
  }

  const sumGains = (...list) => {
    const d = {};
    for (const g of list) if (g) for (const [id, x] of Object.entries(g)) d[id] = (d[id] || 0) + x.total;
    return d;
  };

  // ─── Écrans ────────────────────────────────────────────────────────────────
  const screens = {
    writing(S, g) {
      if (g.submitted.includes(S.you)) {
        return `
          <div class="phase"><div class="step">Préparation</div><div class="t">C'est envoyé ! 🤫</div></div>
          <div class="card"><div data-live="writingStatus"></div></div>
          <button class="full ghost" data-edit>✏️ Modifier mes anecdotes</button>
          <div style="height:10px"></div>
          ${UI.forceLink('Commencer sans les retardataires')}`;
      }
      return `
        <div class="phase"><div class="step">Préparation</div><div class="t">Écris tes 3 anecdotes</div></div>
        <div class="card">
          <p class="muted" style="margin-top:0">2 fausses, 1 vraie. Coche la vraie. 💡 Astuce : imite le style d'un autre pour brouiller les pistes…</p>
          ${[0, 1, 2].map((i) => `
            <textarea data-t="${i}" maxlength="280" placeholder="Anecdote ${L[i]}…">${esc(draft.texts[i] || '')}</textarea>
            <label class="truth"><input type="radio" name="truth" value="${i}" ${draft.trueIndex === i ? 'checked' : ''}/> C'est la vraie</label>`).join('')}
          <button class="full" data-submit>Valider 🔒</button>
        </div>
        <div class="card"><div data-live="writingStatus"></div></div>`;
    },

    guessAuthor(S, g) {
      const c = g.current;
      const others = g.participants.filter((id) => id !== S.you && P(id));
      return `
        ${header(g, roundLabel(g, 'Étape 1'), 'Qui a écrit ça ? 🕵️')}
        <div class="card">
          ${c.isAuthor ? `<p style="margin-top:0"><b>🤫 C'est toi !</b> Fais comme si de rien n'était et vote pour quelqu'un d'autre.</p>` : ''}
          ${anecList(g)}
        </div>
        <div class="card">
          <h2>${c.isAuthor ? 'Vote pour faire diversion' : 'Ton suspect'}</h2>
          <div class="grid">${others.map((id) => `<button class="pick ${c.myVote === id ? 'sel' : ''}" data-author="${id}">${av(P(id))}<span>${name(id)}</span></button>`).join('')}</div>
          <p class="center" data-live="voteCount"></p>
        </div>
        ${UI.forceLink('Révéler maintenant')}`;
    },

    revealAuthor(S, g) {
      const c = g.current;
      const votes = Object.entries(c.authorVotes || {});
      return `
        ${header(g, roundLabel(g, 'Révélation'), "C'était…")}
        <div class="card center reveal">${av(P(c.authorId), 'lg')}<h2 style="margin:10px 0 0;font-size:1.8rem">${name(c.authorId)} !</h2></div>
        <div class="card">
          <h2>Les votes</h2>
          ${votes.map(([v, t]) => `<div class="score">${av(P(v))}<span class="n">${name(v)} → ${av(P(t), 'sm')} ${name(t)}</span>${t === c.authorId ? '✅' : '❌'}</div>`).join('') || '<span class="muted">Aucun vote</span>'}
        </div>
        <div class="card"><h2>Points</h2>${gainsBlock(c.authorGains)}</div>
        ${UI.hostButton('Trouver la vraie anecdote')}`;
    },

    guessTrue(S, g) {
      const c = g.current;
      if (c.isAuthor) {
        return `
          ${header(g, roundLabel(g, 'Étape 2'), 'Regarde-les galérer 😈')}
          <div class="card">${anecList(g, { showTruth: true })}</div>
          <div class="card"><h2>Ils réfléchissent…</h2><div data-live="waitTrue"></div></div>
          ${UI.forceLink('Révéler maintenant')}`;
      }
      return `
        ${header(g, roundLabel(g, 'Étape 2'), 'Laquelle est vraie ? 🤔')}
        <div class="card">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">${av(P(c.authorId))}<b>${name(c.authorId)}</b> dit la vérité sur une seule :</div>
          ${anecList(g, { clickable: true })}
          <p class="center" data-live="voteCount"></p>
        </div>
        ${UI.forceLink('Révéler maintenant')}`;
    },

    revealTrue(S, g) {
      const c = g.current;
      const last = g.round >= g.totalRounds;
      return `
        ${header(g, roundLabel(g, 'Verdict'), `La vérité sur ${name(c.authorId)}`)}
        <div class="card reveal">${anecList(g, { showTruth: true, dimFalse: true, votes: c.trueVotes })}</div>
        <div class="card"><h2>Points</h2>${gainsBlock(c.trueGains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, sumGains(c.authorGains, c.trueGains))}</div>
        ${UI.hostButton(last ? 'Voir le podium 🏆' : 'Manche suivante')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  UI.registerGame('deux-mensonges', {
    rules: () => `
      <ol class="rules">
        <li>Chacun écrit <b>3 anecdotes</b> sur lui : <b>2 fausses, 1 vraie</b>.</li>
        <li>Les anecdotes d'un joueur s'affichent <b>sans son nom</b>. Tout le monde vote : <b>qui a écrit ça ?</b> (style, fautes, émojis… tout est indice). L'auteur vote aussi, pour brouiller les pistes.</li>
        <li>On révèle l'auteur… puis on vote : <b>laquelle est vraie ?</b></li>
      </ol>
      <div class="muted" style="font-size:.92rem">
        🔍 Auteur démasqué : <b>+100</b> · ✅ Vraie anecdote trouvée : <b>+100</b> · 🕵️ Les deux : <b>+50</b><br>
        🥸 Auteur : <b>+50</b> par joueur qui ne t'a pas reconnu, 👻 <b>+100</b> si personne<br>
        🤥 <b>+75</b> par joueur berné, 🎭 <b>+150</b> si personne ne trouve la vérité<br>
        🫣 Accusé à tort : <b>+25</b> par vote
      </div>`,

    key: (S, g) => [g.phase, g.round, g.current?.myVote, g.submitted.includes(S.you)].join('|'),

    onState: (S, g) => {
      if (g.phase === 'end' && draft.texts.some(Boolean)) { draft = { texts: ['', '', ''], trueIndex: null }; saveDraft(); }
      if (g.phase === 'writing' && g.myAnecdotes) draft = { texts: g.myAnecdotes.map((a) => a.text), trueIndex: g.myAnecdotes.findIndex((a) => a.isTrue) };
    },

    screen: (S, g) => screens[g.phase](S, g),

    live: {
      writingStatus: (S, g) => {
        const ids = g.participants.filter(P);
        const done = ids.filter((id) => g.submitted.includes(id)).length;
        return `<div class="muted" style="margin-bottom:8px">${done} / ${ids.filter((id) => P(id).connected).length} prêts</div>
          <div class="players">${ids.map((id) => `<div class="player ${P(id).connected ? '' : 'off'}">${av(P(id))}<span>${name(id)} ${g.submitted.includes(id) ? '✅' : '<span class="wait">✍️</span>'}</span></div>`).join('')}</div>`;
      },
      voteCount: (S, g) => `<span class="pill">🗳️ ${g.current.voted} / ${g.current.needed} votes</span>`,
      waitTrue: (S, g) => `<div class="players">${(g.current.waitingFor || []).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} <span class="wait">🤔</span></span></div>`).join('') || '<span class="muted">Tout le monde a voté !</span>'}</div>`,
    },

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      on('[data-author]', (e) => UI.send('voteAuthor', e.currentTarget.dataset.author));
      on('[data-true]', (e) => UI.send('voteTrue', Number(e.currentTarget.dataset.true)));
      on('[data-edit]', () => UI.send('edit'));
      root.querySelectorAll('[data-t]').forEach((el) => el.addEventListener('input', () => { draft.texts[+el.dataset.t] = el.value; saveDraft(); }));
      root.querySelectorAll('input[name=truth]').forEach((el) => el.addEventListener('change', () => { draft.trueIndex = +el.value; saveDraft(); }));
      on('[data-submit]', () => {
        if (draft.texts.some((t) => !t || t.trim().length < 3)) return UI.toast('Remplis les 3 anecdotes');
        if (draft.trueIndex == null || draft.trueIndex < 0) return UI.toast('Coche celle qui est vraie');
        UI.send('submit', draft);
      });
    },
  });
})();
