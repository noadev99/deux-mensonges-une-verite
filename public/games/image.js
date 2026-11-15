// 🖼️ L'Image cachée — affichage
(() => {
  const { esc, P, av, name } = UI;
  let shown = false; // carte secrète retournée (on la regarde en cachette)
  let shownRound = 0;

  // la grille des 10 images ; mark = image à mettre en avant, pick = boutons pour deviner
  const grid = (g, { mark = null, pick = false, wrong = null } = {}) => `
    <div class="im-grid">${g.items.map((it, i) => {
      const tag = pick ? 'button' : 'div';
      return `<${tag} class="im-tile ${i === mark ? 'mark' : ''} ${i === wrong ? 'wrong' : ''}" ${pick ? `data-guess="${i}"` : ''} style="--i:${i}">
        <span class="im-n">${i + 1}</span><span class="im-img">${it.img}</span><span class="im-l">${esc(it.label)}</span></${tag}>`;
    }).join('')}</div>`;

  // la carte secrète du joueur (face cachée tant qu'on ne la touche pas)
  const secretCard = (g) => {
    if (!g.role) return '';
    const blank = g.role === 'blank';
    const it = blank ? null : g.items[g.mySecret];
    return `<button class="im-card keep ${shown ? 'shown' : ''} ${blank ? 'blank' : ''}" data-flip>
      ${shown
        ? (blank
          ? '<span class="im-big">❔</span><span><b>Tu n\'as rien !</b><br><small>Écoute les indices, devine l\'image… et bluffe.</small></span>'
          : `<span class="im-big">${it.img}</span><span><b>${esc(it.label)}</b><br><small>C'est ton image. Donne un indice sans la nommer.</small></span>`)
        : '<span class="im-big im-back">★</span><span><b>Ta carte secrète</b><br><small>Touche pour la regarder (en cachette !)</small></span>'}
    </button>`;
  };

  const cluesList = (g) => g.order.filter(P).map((id) => {
    const c = g.clues.find((x) => x.pid === id);
    const now = g.speaker === id;
    return `<div class="score ${now ? 'intr-now' : ''}">${av(P(id))}<span class="n">${name(id)}</span>
      ${c ? (c.text == null ? '<b class="intr-clue">🎤 dit</b>' : `<b class="intr-clue">${esc(c.text)}</b>`) : now ? '<span class="wait">✍️</span>' : '<span class="muted">—</span>'}</div>`;
  }).join('');

  const head = (g, title) => UI.header(g.round, g.totalRounds, `Manche ${g.round} / ${g.totalRounds} · ${esc(g.family)}`, title);

  const screens = {
    clues(S, g) {
      const mine = g.speaker === S.you;
      if (S.spectator) {
        return `${head(g, `${name(g.speaker)} ${g.oral ? 'parle' : 'réfléchit'}… ${g.oral ? '🎤' : '✍️'}`)}
          <div class="card im-board"><h2>${esc(g.family)}</h2>${grid(g)}<p class="muted center" style="margin-bottom:0">Tout le monde a la même image… sauf un joueur, qui n'a rien 🤫</p></div>
          <div class="card"><h2>Indices</h2><div data-live="clues"></div></div>`;
      }
      return `${head(g, mine ? 'À toi ! ✍️' : `${name(g.speaker)} réfléchit…`)}
        ${secretCard(g)}
        ${mine ? (g.oral
          ? '<div class="card center keep"><p style="margin:0 0 10px">Dis ton indice <b>à voix haute</b> (un mot), puis :</p><button class="full alt" data-said>C\'est dit ✅</button></div>'
          : '<div class="card stack keep"><input id="clue" maxlength="30" placeholder="Ton indice (un mot)" autocomplete="off" /><button class="full" data-clue>Envoyer</button></div>') : ''}
        <div class="card im-board"><h2>${esc(g.family)}</h2>${grid(g, { mark: shown && g.role === 'seer' ? g.mySecret : null })}</div>
        <div class="card"><h2>Indices</h2><div data-live="clues"></div></div>
        ${UI.forceLink(`Passer le tour de ${name(g.speaker)}`)}`;
    },

    vote(S, g) {
      const others = g.participants.filter((id) => id !== S.you);
      return `${head(g, 'Qui n\'a rien ? 🔎')}
        ${S.spectator ? '' : secretCard(g)}
        <div class="card im-board">${grid(g, { mark: !S.spectator && shown && g.role === 'seer' ? g.mySecret : null })}</div>
        <div class="card"><h2>Indices</h2>${cluesList(g)}</div>
        ${S.spectator ? '<p class="center white tv-big" data-live="voteCount"></p>' : `
        <div class="card keep"><h2>${g.role === 'blank' ? 'Accuse quelqu\'un pour faire diversion' : 'Ton suspect'}</h2>
          ${UI.playerGrid(others, g.myVote, 'vote')}<p class="center" data-live="voteCount"></p></div>`}
        ${UI.forceLink('Révéler maintenant')}`;
    },

    guess(S, g) {
      if (g.role === 'blank') {
        return `${head(g, 'Démasqué ! 😱')}
          <div class="card center keep"><h2>Dernière chance</h2><div class="muted">Touche l'image que tout le monde avait pour voler la victoire.</div></div>
          <div class="card im-board keep">${grid(g, { pick: true })}</div>
          <div class="card"><h2>Indices</h2>${cluesList(g)}</div>`;
      }
      return `${head(g, 'Démasqué ! 🎉')}
        <div class="card center reveal">${av(P(g.blank), 'lg')}<h2 style="margin:10px 0 4px">${name(g.blank)} n'avait rien</h2>
          <div class="muted">Il/elle essaie de deviner l'image… <span class="wait">🤞</span></div></div>
        <div class="card im-board">${grid(g)}</div>
        ${UI.forceLink('Il/elle ne trouve pas — passer')}`;
    },

    reveal(S, g) {
      const r = g.result;
      const it = g.items[g.secret];
      const title = !g.caught ? 'Il s\'en sort sans rien savoir ! 🥷' : r.stole ? 'Démasqué… mais il a trouvé l\'image ! 🧠' : 'L\'équipe gagne ! 🎉';
      return `${head(g, title)}
        <div class="card center reveal"><div class="muted">L'image était</div><div class="im-answer">${it.img}<b>${esc(it.label)}</b></div>
          <div class="muted">${av(P(g.blank), 'sm')} <b>${name(g.blank)}</b> n'avait rien${g.guess != null ? ` · sa proposition : <b>${esc(g.items[g.guess].label)}</b> ${r.stole ? '✅' : '❌'}` : ''}</div></div>
        <div class="card im-board">${grid(g, { mark: g.secret, wrong: g.guess != null && g.guess !== g.secret ? g.guess : null })}</div>
        <div class="card"><h2>Les votes</h2>${Object.entries(g.votes).filter(([v]) => P(v)).map(([v, t]) => `<div class="score">${av(P(v))}<span class="n">${name(v)} → ${av(P(t), 'sm')} ${name(t)}</span>${t === g.blank ? '✅' : '❌'}</div>`).join('') || '<span class="muted">Aucun vote</span>'}</div>
        <div class="card gains-card">${UI.gainsBlock(r.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(r.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Manche suivante')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  UI.registerGame('image', {
    rules: () => `
      <ol class="rules">
        <li>L'écran montre <b>10 images d'une même famille</b> (10 fruits, 10 animaux…).</li>
        <li>Tout le monde reçoit en secret <b>la même image</b>… sauf <b>un joueur, qui n'a rien</b>. Regarde ta carte en cachette.</li>
        <li>Chacun son tour, on donne <b>un indice d'un mot</b> (à l'écrit ou à voix haute). Trop précis : celui qui n'a rien devine l'image. Trop vague : on te soupçonne !</li>
        <li>On vote. Démasqué, celui qui n'avait rien peut encore <b>deviner l'image</b> pour voler la victoire.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">👃 Voter pour lui : <b>+100</b> · 🤝 Démasqué sans trouver l'image : <b>+50</b> pour toute l'équipe<br>
      🥷 Jamais démasqué : <b>+200</b> · 🧠 Démasqué mais trouve l'image : <b>+150</b></div>`,

    key: (S, g) => [g.phase, g.round, g.speaker === S.you, g.phase === 'clues' ? g.speaker : '', g.myVote, shown].join('|'),

    onState: (S, g) => { if (g.round !== shownRound) { shownRound = g.round; shown = false; } }, // nouvelle manche : carte recachée

    screen: (S, g) => screens[g.phase](S, g),
    tv: (S, g) => screens[g.phase](S, g),

    live: {
      clues: (S, g) => cluesList(g),
      voteCount: (S, g) => `<span class="pill">🗳️ ${g.voted.length} / ${g.needed} votes</span>`,
    },

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      on('[data-flip]', () => { shown = !shown; UI.refresh(); });
      const clue = root.querySelector('#clue');
      const sendClue = () => UI.send('clue', clue.value);
      if (clue) { clue.focus(); clue.addEventListener('keydown', (e) => e.key === 'Enter' && sendClue()); }
      on('[data-clue]', sendClue);
      on('[data-said]', () => UI.send('clue', ''));
      on('[data-vote]', (e) => UI.send('vote', e.currentTarget.dataset.vote));
      on('[data-guess]', (e) => UI.send('guess', Number(e.currentTarget.dataset.guess)));
    },
  });
})();
