// 🕵️ L'Intrus — affichage
(() => {
  const { esc, P, av, name } = UI;

  const roleCard = (g) => g.isIntruder
    ? `<div class="card center intr-role intr-bad keep"><div class="muted">Ton rôle</div><h2>🕵️ Tu es l'intrus !</h2>
        <div class="muted">Tu ne connais pas le mot. Écoute les indices, fonds-toi dans la masse…</div></div>`
    : `<div class="card center intr-role keep"><div class="muted">Le mot secret</div><div class="intr-word">${esc(g.word)}</div>
        <div class="muted">Donne un indice assez clair pour les autres… mais pas trop pour l'intrus !</div></div>`;

  const cluesCard = (g) => `<div class="card"><h2>Indices</h2><div data-live="clues"></div></div>`;

  const cluesList = (g, showSpeaker = true) => {
    const rows = [];
    for (let tour = 1; tour <= g.tours; tour++) {
      g.order.filter(P).forEach((id, i) => {
        const c = g.clues.find((x) => x.pid === id && x.tour === tour);
        const isNow = showSpeaker && g.speaker === id && g.tour === tour;
        if (!c && !isNow && tour > g.tour) return;
        rows.push(`<div class="score ${isNow ? 'intr-now' : ''}">${av(P(id))}<span class="n">${name(id)}</span>
          ${c ? (c.text == null ? '<b class="intr-clue">🎤 dit</b>' : `<b class="intr-clue">${esc(c.text)}</b>`) : isNow ? '<span class="wait">✍️</span>' : '<span class="muted">—</span>'}</div>`);
      });
      if (tour < g.tours && g.tour > tour) rows.push('<div class="muted center" style="font-size:.8rem;padding:4px">— tour 2 —</div>');
    }
    return rows.join('');
  };

  const screens = {
    clues(S, g) {
      const myTurn = g.speaker === S.you;
      return `
        ${UI.header(g.round, g.totalRounds, `Manche ${g.round} / ${g.totalRounds} · Tour ${g.tour} / ${g.tours}`, myTurn ? "À toi ! ✍️" : `${name(g.speaker)} réfléchit…`)}
        ${roleCard(g)}
        ${myTurn ? (g.oral
          ? `<div class="card center keep"><p style="margin:0 0 10px">Dis ton indice <b>à voix haute</b> (un seul mot), puis :</p><button class="full alt" data-said>C'est dit ✅</button></div>`
          : `<div class="card stack">
            <input id="clue" maxlength="30" placeholder="Ton indice (un mot)" autocomplete="off" />
            <button class="full" data-clue>Envoyer</button></div>`) : ''}
        ${cluesCard(g)}
        ${UI.forceLink(`Passer le tour de ${name(g.speaker)}`)}`;
    },

    vote(S, g) {
      const others = g.participants.filter((id) => id !== S.you);
      return `
        ${UI.header(g.round, g.totalRounds, `Manche ${g.round} / ${g.totalRounds} · Vote`, "Qui est l'intrus ? 🔎")}
        ${roleCard(g)}
        <div class="card"><h2>Indices</h2>${cluesList(g, false)}</div>
        <div class="card">
          <h2>${g.isIntruder ? 'Accuse quelqu\'un pour faire diversion' : 'Ton suspect'}</h2>
          ${UI.playerGrid(others, g.myVote, 'vote')}
          <p class="center" data-live="voteCount"></p>
        </div>
        ${UI.forceLink('Révéler maintenant')}`;
    },

    guess(S, g) {
      if (g.isIntruder) {
        return `
          ${UI.header(g.round, g.totalRounds, `Manche ${g.round} / ${g.totalRounds}`, 'Démasqué ! 😱')}
          <div class="card center"><h2>Dernière chance</h2><div class="muted">Devine le mot secret pour voler la victoire.</div></div>
          <div class="card"><h2>Indices</h2>${cluesList(g, false)}</div>
          <div class="card stack"><input id="guess" maxlength="40" placeholder="Le mot secret est…" autocomplete="off" />
            <button class="full" data-guess>C'est mon dernier mot</button></div>`;
      }
      return `
        ${UI.header(g.round, g.totalRounds, `Manche ${g.round} / ${g.totalRounds}`, 'Démasqué ! 🎉')}
        <div class="card center reveal">${av(P(g.intruderId), 'lg')}<h2 style="margin:10px 0 4px">${name(g.intruderId)} était l'intrus</h2>
          <div class="muted">Il/elle tente de deviner le mot <b>${esc(g.word)}</b>… <span class="wait">🤞</span></div></div>
        ${UI.forceLink('Il/elle ne trouve pas — passer')}`;
    },

    reveal(S, g) {
      const r = g.result;
      const title = !g.caught ? "L'intrus s'en sort ! 🥷" : r.stole ? "Démasqué… mais il a volé le mot ! 🧠" : "L'équipe gagne ! 🎉";
      return `
        ${UI.header(g.round, g.totalRounds, `Manche ${g.round} / ${g.totalRounds} · Verdict`, title)}
        <div class="card center reveal">
          <div class="muted">L'intrus était</div>${av(P(g.intruderId), 'lg')}<h2 style="margin:8px 0">${name(g.intruderId)}</h2>
          <div class="muted">Le mot : <b>${esc(g.word)}</b>${g.guess != null ? ` · Sa proposition : <b>${esc(g.guess) || '…'}</b> ${r.stole ? '✅' : '❌'}` : ''}</div>
        </div>
        <div class="card"><h2>Les votes</h2>
          ${Object.entries(g.votes).filter(([v]) => P(v)).map(([v, t]) => `<div class="score">${av(P(v))}<span class="n">${name(v)} → ${av(P(t), 'sm')} ${name(t)}</span>${t === g.intruderId ? '✅' : '❌'}</div>`).join('') || '<span class="muted">Aucun vote</span>'}
        </div>
        <div class="card gains-card">${UI.gainsBlock(r.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(r.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Manche suivante')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  UI.registerGame('intrus', {
    rules: () => `
      <ol class="rules">
        <li>Tout le monde reçoit le même <b>mot secret</b>… sauf <b>l'intrus</b>, qui ne le connaît pas.</li>
        <li>Chacun son tour, on donne <b>un indice d'un mot</b> (2 tours). Trop précis : l'intrus devine. Trop vague : on te soupçonne !</li>
        <li>On vote pour démasquer l'intrus. S'il est démasqué, il a <b>une chance de deviner le mot</b> pour voler la victoire.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">👃 Voter pour l'intrus : <b>+100</b> · 🤝 Intrus démasqué sans voler le mot : <b>+50</b> pour toute l'équipe<br>
      🥷 Intrus jamais démasqué : <b>+200</b> · 🧠 Démasqué mais devine le mot : <b>+150</b></div>`,

    tv: (S, g) => {
      if (g.phase === 'clues') {
        return `${UI.header(g.round, g.totalRounds, `Manche ${g.round} sur ${g.totalRounds} · Tour ${g.tour} sur ${g.tours}`, `${name(g.speaker)} ${g.oral ? 'parle' : 'réfléchit'}… ${g.oral ? '🎤' : '✍️'}`)}
          <div class="card center"><div class="muted">Le mot secret</div><div class="tv-big">🤫 caché</div><p class="muted" style="margin-bottom:0">Tout le monde le connaît… sauf l'intrus.</p></div>
          ${cluesCard(g)}`;
      }
      if (g.phase === 'vote') {
        return `${UI.header(g.round, g.totalRounds, `Manche ${g.round} sur ${g.totalRounds} · Vote`, "Qui est l'intrus ? 🔎")}
          <div class="card"><h2>Indices</h2>${cluesList(g, false)}</div>
          <p class="center white tv-big" data-live="voteCount"></p>`;
      }
      if (g.phase === 'guess') {
        return `${UI.header(g.round, g.totalRounds, `Manche ${g.round} sur ${g.totalRounds}`, 'Démasqué ! 😱')}
          <div class="card center reveal">${av(P(g.intruderId), 'lg')}<h2 style="margin:10px 0 4px">${name(g.intruderId)} était l'intrus</h2>
          <div class="muted">Dernière chance : il/elle essaie de deviner le mot… <span class="wait">🤞</span></div></div>`;
      }
      return null;
    },

    key: (S, g) => [g.phase, g.round, g.speaker === S.you, g.phase === 'clues' ? g.speaker : '', g.myVote].join('|'),

    screen: (S, g) => screens[g.phase](S, g),

    live: {
      clues: (S, g) => cluesList(g),
      voteCount: (S, g) => `<span class="pill">🗳️ ${g.voted.length} / ${g.needed} votes</span>`,
    },

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      const submitOnEnter = (id, fn) => { const el = root.querySelector('#' + id); if (el) { el.focus(); el.addEventListener('keydown', (e) => e.key === 'Enter' && fn()); } };
      const sendClue = () => UI.send('clue', root.querySelector('#clue').value);
      const sendGuess = () => UI.send('guess', root.querySelector('#guess').value);
      on('[data-clue]', sendClue);
      on('[data-said]', () => UI.send('clue', ''));
      on('[data-guess]', sendGuess);
      submitOnEnter('clue', sendClue);
      submitOnEnter('guess', sendGuess);
      on('[data-vote]', (e) => UI.send('vote', e.currentTarget.dataset.vote));
    },
  });
})();
