// 📊 Le Sondage — affichage
(() => {
  const { esc, P, av, name } = UI;
  let draft = { round: 0, yes: null, guess: null };

  const step = (g) => `Question ${g.round} / ${g.totalRounds}`;
  const qCard = (g, big) => `<div class="card center keep">
      <div class="muted">Combien d'entre nous ont déjà…</div>
      <div class="so-q ${big ? 'tv-big' : ''}">${esc(g.cur.q)} ?</div></div>`;
  const progress = (g) => `<div class="muted" style="margin-bottom:8px">${g.cur.done.length} / ${g.participants.filter((id) => P(id)?.connected).length} ont répondu</div>
    <div class="players">${g.participants.filter((id) => P(id)?.connected).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} ${g.cur.done.includes(id) ? '✅' : '<span class="wait">🤔</span>'}</span></div>`).join('')}</div>`;

  const screens = {
    intro: (S, g) => `${UI.header(1, 1, 'Le Sondage', 'Soyez honnêtes 🤫')}<div class="card">${GAME.rules()}</div>${UI.hostButton('Première question')}`,

    vote(S, g) {
      if (draft.round !== g.round) draft = { round: g.round, yes: null, guess: null };
      const c = g.cur;
      if (c.mine) {
        return `${UI.header(g.round, g.totalRounds, step(g), 'Réponse envoyée 🔒')}
          ${qCard(g)}
          <div class="card center keep"><p style="margin-top:0">Toi : <b>${c.mine.yes ? '✅ Oui' : '❌ Non'}</b> · ton pari : <b>${c.mine.guess} « oui »</b></p>
            <button class="ghost" data-edit>✏️ Modifier</button></div>
          <div class="card"><div data-live="progress"></div><p class="center">${UI.timer(g.left)}</p></div>
          ${UI.forceLink('Révéler maintenant')}`;
      }
      const nums = Array.from({ length: c.max + 1 }, (_, i) => `<button class="so-n ${draft.guess === i ? 'sel' : ''}" data-guess="${i}">${i}</button>`).join('');
      return `${UI.header(g.round, g.totalRounds, step(g), 'Réponds en secret 🤫')}
        ${qCard(g)}
        <div class="card keep">
          <p style="margin-top:0"><b>1. Et toi ?</b> As-tu déjà ${esc(c.q)} ?</p>
          <div class="row"><button class="${draft.yes === true ? '' : 'ghost'}" data-yes="1">✅ Oui</button><button class="${draft.yes === false ? '' : 'ghost'}" data-yes="0">❌ Non</button></div>
          <p><b>2. Ton pari :</b> combien de « oui » en tout, sur ${c.max} joueurs (toi compris) ?</p>
          <div class="so-nums">${nums}</div>
          <button class="full" data-send ${draft.yes == null || draft.guess == null ? 'disabled' : ''}>Valider 🔒</button>
          <p class="center muted" style="margin-bottom:0">Personne ne saura ce que tu as répondu. ${UI.timer(g.left)}</p>
        </div>
        <div class="card"><div data-live="progress"></div></div>
        ${UI.forceLink('Révéler maintenant')}`;
    },

    reveal(S, g) {
      const c = g.cur;
      const list = Object.entries(c.guesses).sort((a, b) => Math.abs(a[1] - c.count) - Math.abs(b[1] - c.count));
      return `${UI.header(g.round + 1, g.totalRounds + 1, step(g), 'Le résultat')}
        <div class="card center reveal"><div class="muted">Combien d'entre nous ont déjà ${esc(c.q)} ?</div>
          <div class="so-big">${c.count}<small> oui</small></div><div class="muted">sur ${c.total} réponse${c.total > 1 ? 's' : ''}</div>
          <div class="so-bar"><i style="width:${c.total ? (c.count / c.total) * 100 : 0}%"></i></div></div>
        <div class="card"><h2>Les paris</h2>${list.map(([id, v]) => `<div class="score">${av(P(id))}<span class="n">${name(id)}</span><span class="p">${v}${v === c.count ? ' 🎯' : ''}</span></div>`).join('') || '<p class="muted">Personne n\'a parié</p>'}</div>
        <div class="card gains-card">${UI.gainsBlock(c.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(c.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Question suivante')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  const GAME = {
    rules: () => `<ol class="rules">
        <li>Une question s'affiche : « Combien d'entre nous ont déjà <b>dormi à la belle étoile</b> ? »</li>
        <li>Chacun répond <b>oui ou non en secret</b>, puis <b>parie</b> sur le nombre total de « oui ».</li>
        <li>On ne révèle que le total : personne ne sait qui a dit oui 🤫</li>
      </ol>
      <div class="muted" style="font-size:.92rem">Nombre exact : <b>+100</b> · à 1 près : <b>+50</b></div>`,
    tv: (S, g) => (g.phase === 'vote' ? `${UI.header(g.round, g.totalRounds, step(g), 'Répondez en secret 🤫')}${qCard(g, true)}<div class="card">${progress(g)}<p class="center">${UI.timer(g.left)}</p></div>` : null),
    key: (S, g) => [g.phase, g.round, JSON.stringify(g.cur?.mine), draft.yes, draft.guess].join('|'),
    screen: (S, g) => screens[g.phase](S, g),
    live: { progress: (S, g) => progress(g) },
    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      on('[data-yes]', (e) => { draft.yes = e.currentTarget.dataset.yes === '1'; UI.refresh(); });
      on('[data-guess]', (e) => { draft.guess = Number(e.currentTarget.dataset.guess); UI.refresh(); });
      on('[data-send]', () => UI.send('answer', { yes: draft.yes, guess: draft.guess }));
      on('[data-edit]', () => { draft = { round: g.round, yes: g.cur.mine.yes, guess: g.cur.mine.guess }; UI.send('edit'); });
    },
  };
  UI.registerGame('sondage', GAME);
})();
