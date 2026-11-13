// 📖 Le Dico des menteurs — affichage
(() => {
  const { esc, P, av, name } = UI;
  const L = 'ABCDEFGHIJKLMNOP';
  let draft = { round: 0, text: '' };

  const wordCard = (g) => `<div class="card center reveal"><div class="muted">Le mot</div><div class="dico-word">${esc(g.word)}</div></div>`;

  const screens = {
    write(S, g) {
      if (draft.round !== g.round) draft = { round: g.round, text: '' };
      const step = `Mot ${g.round} / ${g.totalRounds}`;
      if (g.myDef) {
        return `
          ${UI.header(g.round, g.totalRounds, step, 'Définition envoyée 🤫')}
          ${wordCard(g)}
          <div class="card"><div class="muted">Ta définition :</div><p class="dico-def">${esc(g.myDef)}</p>
            <button class="ghost" data-edit>✏️ Modifier</button></div>
          <div class="card"><div data-live="writing"></div></div>
          ${UI.forceLink('Passer au vote sans les retardataires')}`;
      }
      return `
        ${UI.header(g.round, g.totalRounds, step, 'Invente une définition ✍️')}
        ${wordCard(g)}
        <div class="card stack">
          <p class="muted" style="margin:0">Écris une fausse définition crédible. 💡 Imite le style d'un dictionnaire pour piéger les autres.</p>
          <textarea id="def" maxlength="200" placeholder="Nom masculin. …">${esc(draft.text)}</textarea>
          <button class="full" data-define>Valider 🔒</button>
        </div>
        <div class="card"><div data-live="writing"></div></div>`;
    },

    vote(S, g) {
      return `
        ${UI.header(g.round, g.totalRounds, `Mot ${g.round} / ${g.totalRounds}`, 'Quelle est la vraie ? 🧐')}
        ${wordCard(g)}
        <div class="card">
          ${g.options.map((o, i) => o.mine
            ? `<div class="anec dico-mine"><span class="l">${L[i]}</span>${esc(o.text)}<div class="muted" style="font-size:.85rem;margin-top:4px">(ta définition)</div></div>`
            : `<button class="anec ${g.myVote === i ? 'sel' : ''}" data-opt="${i}"><span class="l">${L[i]}</span>${esc(o.text)}</button>`).join('')}
          <p class="center" data-live="voteCount"></p>
        </div>
        ${UI.forceLink('Révéler maintenant')}`;
    },

    reveal(S, g) {
      const r = g.result;
      return `
        ${UI.header(g.round, g.totalRounds, `Mot ${g.round} / ${g.totalRounds} · Verdict`, esc(g.word))}
        <div class="card reveal">
          ${g.options.map((o, i) => `
            <div class="anec ${o.real ? 'true' : 'false'}" style="opacity:1">
              <span class="badge ${o.real ? 't' : 'f'}">${o.real ? 'VRAIE' : `par ${name(o.author)}`}</span>
              <span class="l">${L[i]}</span>${esc(o.text)}
              ${o.voters.length ? `<div class="voters">${o.voters.map((v) => av(P(v), 'sm')).join('')}</div>` : ''}
            </div>`).join('')}
        </div>
        <div class="card"><h2>Points</h2>${UI.gainsBlock(r.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(r.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Mot suivant →')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  UI.registerGame('dico', {
    rules: () => `
      <ol class="rules">
        <li>Un <b>vrai mot rare</b> de la langue française s'affiche.</li>
        <li>Chacun invente une <b>fausse définition</b> crédible.</li>
        <li>Toutes les définitions sont mélangées avec la vraie : <b>vote pour la vraie</b>.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">📚 Trouver la vraie : <b>+100</b> · 🪤 Chaque joueur piégé par ta définition : <b>+50</b></div>`,

    key: (S, g) => [g.phase, g.round, !!g.myDef, g.myVote].join('|'),

    screen: (S, g) => screens[g.phase](S, g),

    live: {
      writing: (S, g) => `<div class="muted" style="margin-bottom:8px">${g.written.length} / ${g.needed} ont écrit</div>
        <div class="players">${g.participants.filter((id) => P(id)?.connected).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} ${g.written.includes(id) ? '✅' : '<span class="wait">✍️</span>'}</span></div>`).join('')}</div>`,
      voteCount: (S, g) => `<span class="pill">🗳️ ${g.voted.length} / ${g.needed} votes</span>`,
    },

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      const ta = root.querySelector('#def');
      if (ta) ta.addEventListener('input', () => { draft.text = ta.value; });
      on('[data-define]', () => UI.send('define', draft.text));
      on('[data-edit]', () => { draft.text = g.myDef; UI.send('edit'); });
      on('[data-opt]', (e) => UI.send('vote', Number(e.currentTarget.dataset.opt)));
    },
  });
})();
