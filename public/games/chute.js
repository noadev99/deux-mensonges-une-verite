// ✍️ La Chute — affichage
(() => {
  const { esc, P, av, name } = UI;
  let draft = { round: 0, text: '' };

  // la phrase avec le trou mis en valeur (ou rempli par une réponse)
  const phrase = (prompt, fill) => {
    const [a, b] = esc(prompt).split('___');
    const hole = fill != null ? `<mark class="ch-fill">${esc(fill)}</mark>` : '<span class="ch-hole"></span>';
    return `${a}${hole}${b ?? ''}`;
  };

  const promptCard = (g) => `<div class="card center reveal"><p class="ch-prompt">${phrase(g.prompt)}</p></div>`;

  const screens = {
    write(S, g) {
      if (draft.round !== g.round) draft = { round: g.round, text: '' };
      const step = `Phrase ${g.round} sur ${g.totalRounds}`;
      if (g.myAnswer) {
        return `
          ${UI.header(g.round, g.totalRounds, step, 'Réponse envoyée 🤫')}
          <div class="card center"><p class="ch-prompt">${phrase(g.prompt, g.myAnswer)}</p>
            <button class="ghost" data-edit>✏️ Modifier</button></div>
          <div class="card"><div data-live="writing"></div></div>
          ${UI.forceLink('Passer au vote sans les retardataires')}`;
      }
      return `
        ${UI.header(g.round, g.totalRounds, step, 'Complète la phrase')}
        ${promptCard(g)}
        <div class="card stack">
          <textarea id="answer" maxlength="120" placeholder="Ta réponse la plus drôle…">${esc(draft.text)}</textarea>
          <button class="full" data-answer>Envoyer</button>
        </div>
        <div class="card"><div data-live="writing"></div></div>`;
    },

    vote(S, g) {
      return `
        ${UI.header(g.round, g.totalRounds, `Phrase ${g.round} sur ${g.totalRounds}`, 'La plus drôle ? 😂')}
        <div class="card center"><p class="ch-prompt" style="margin:0">${phrase(g.prompt)}</p></div>
        ${g.options.map((o, i) => o.mine
          ? `<div class="anec ch-opt dico-mine">${esc(o.text)}<div class="muted" style="font-size:.85rem;margin-top:4px">Ta réponse</div></div>`
          : `<button class="anec ch-opt ${g.myVote === i ? 'sel' : ''}" data-opt="${i}">${esc(o.text)}</button>`).join('')}
        <p class="center" data-live="voteCount"></p>
        ${UI.forceLink('Révéler maintenant')}`;
    },

    reveal(S, g) {
      const r = g.result;
      const best = g.options[0];
      return `
        ${UI.header(g.round, g.totalRounds, `Phrase ${g.round} sur ${g.totalRounds}`, r.winners.length ? 'Et la meilleure est…' : 'Aucun vote')}
        ${best && r.winners.length ? `<div class="card center reveal ch-winner">
          ${av(P(best.author), 'lg')}
          <p class="ch-prompt">${phrase(g.prompt, best.text)}</p>
          <div class="muted">par <b>${name(best.author)}</b>${r.winners.length > 1 ? ' (ex æquo)' : ''}</div></div>` : ''}
        <div class="card">
          ${g.options.map((o) => `
            <div class="score">${av(P(o.author))}<span class="n">${esc(o.text)}<br><span class="muted" style="font-size:.85rem">${name(o.author)}</span></span>
              <span class="ch-votes">${o.voters.map((v) => av(P(v), 'sm')).join('')}</span></div>`).join('')}
        </div>
        <div class="card gains-card">${UI.gainsBlock(r.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(r.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Phrase suivante')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  UI.registerGame('chute', {
    rules: () => `
      <ol class="rules">
        <li>Une <b>phrase à trou</b> s'affiche.</li>
        <li>Chacun la complète en secret avec la réponse la plus drôle possible.</li>
        <li>Toutes les réponses s'affichent <b>sans les noms</b> : vote pour ta préférée (pas la tienne).</li>
      </ol>
      <div class="muted" style="font-size:.92rem">😂 Chaque vote reçu : <b>+100</b> · 👑 Tout le monde a voté pour toi : <b>+200</b><br>👌 Tu as voté pour la gagnante : <b>+25</b></div>`,

    key: (S, g) => [g.phase, g.round, !!g.myAnswer, g.myVote].join('|'),

    screen: (S, g) => screens[g.phase](S, g),

    live: {
      writing: (S, g) => `<div class="muted" style="margin-bottom:8px">${g.written.length} sur ${g.needed} ont répondu</div>
        <div class="players">${g.participants.filter((id) => P(id)?.connected).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} ${g.written.includes(id) ? '✅' : '<span class="wait">✍️</span>'}</span></div>`).join('')}</div>`,
      voteCount: (S, g) => `<span class="pill">🗳️ ${g.voted.length} votes</span>`,
    },

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      const ta = root.querySelector('#answer');
      if (ta) ta.addEventListener('input', () => { draft.text = ta.value; });
      on('[data-answer]', () => UI.send('answer', draft.text));
      on('[data-edit]', () => { draft.text = g.myAnswer; UI.send('edit'); });
      on('[data-opt]', (e) => UI.send('vote', Number(e.currentTarget.dataset.opt)));
    },
  });
})();
