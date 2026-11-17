// 🎶 La Fredonnette — affichage
(() => {
  const { esc, P, av, name } = UI;
  const step = (g) => `Chanson ${g.round} / ${g.totalRounds}`;
  const songCard = (s) => `<div class="card center keep fr-song"><div class="fr-t">🎵 ${esc(s.t)}</div><div class="muted">${esc(s.a)}</div></div>`;

  const screens = {
    intro: (S, g) => `${UI.header(1, 1, 'La Fredonnette', 'Hmm hmm hmmm 🎶')}<div class="card">${GAME.rules()}</div>${UI.hostButton('Premier fredonneur')}`,

    choose(S, g) {
      const c = g.cur;
      if (S.you !== c.hummer) {
        return `${UI.header(g.round, g.totalRounds, step(g), `Au tour de ${name(c.hummer)}`)}
          <div class="card center keep">${av(P(c.hummer), 'lg')}<h2>${name(c.hummer)} choisit sa chanson…</h2><p class="muted" style="margin:0">Tends l'oreille 👂</p></div>
          ${UI.forceLink('Choisir au hasard à sa place')}`;
      }
      return `${UI.header(g.round, g.totalRounds, step(g), 'À toi de fredonner ! 🎤')}
        <div class="card keep"><p style="margin-top:0"><b>Choisis la chanson</b> que tu connais le mieux :</p>
          ${c.cards.map((x, i) => `<button class="im2-pick" data-choose="${i}"><b>${esc(x.t)}</b><small>${esc(x.a)}</small></button>`).join('')}</div>`;
    },

    hum(S, g) {
      const c = g.cur;
      if (S.you !== c.hummer) {
        return `${UI.header(g.round, g.totalRounds, step(g), `${name(c.hummer)} fredonne… 🎶`)}
          <div class="card center keep">${av(P(c.hummer), 'lg')}<h2>Quelle est cette chanson ?</h2><p style="margin:0">Crie ta réponse <b>à voix haute</b> ! ${UI.timer(g.left)}</p></div>
          ${UI.forceLink('Personne ne trouve : révéler')}`;
      }
      const others = g.participants.filter((id) => id !== c.hummer && P(id));
      return `${UI.header(g.round, g.totalRounds, step(g), 'Fredonne ! 🎤')}
        ${songCard(c.song)}
        <div class="card keep center"><p style="margin-top:0"><b>Sans les paroles</b> : « hmm hmm », « na na na », sifflement… ${UI.timer(g.left)}</p>
          <p style="margin-bottom:6px"><b>Qui a trouvé ?</b></p>
          <div class="grid">${others.map((id) => `<button class="pick" data-found="${esc(id)}">${av(P(id))}<span>${name(id)}</span></button>`).join('')}</div>
          <button class="ghost full" data-found="" style="margin-top:10px">😶 Personne</button></div>`;
    },

    reveal(S, g) {
      const c = g.cur;
      return `${UI.header(g.round + 1, g.totalRounds + 1, step(g), c.finder ? `${name(c.finder)} a trouvé ! 🎉` : 'Personne n\'a trouvé 😶')}
        ${songCard(c.song)}
        ${c.finder ? `<div class="card center reveal">${av(P(c.finder), 'lg')}<h2>${name(c.finder)} a l'oreille !</h2></div>` : ''}
        <div class="card gains-card">${UI.gainsBlock(c.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(c.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Fredonneur suivant')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  const GAME = {
    rules: () => `<ol class="rules">
        <li>À tour de rôle, un joueur <b>choisit une chanson</b> parmi 3 (tubes, comptines, musiques de films…).</li>
        <li>Il la <b>fredonne sans les paroles</b> : « hmm hmm », « na na na », sifflement…</li>
        <li>Les autres crient leurs réponses <b>à voix haute</b>. Le fredonneur désigne qui a trouvé.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">Chanson trouvée : <b>+100</b> pour celui qui trouve, <b>+50</b> pour le fredonneur · 1 minute par chanson</div>`,
    tv: (S, g) => {
      if (g.phase === 'choose') return `${UI.header(g.round, g.totalRounds, step(g), `Au tour de ${name(g.cur.hummer)}`)}<div class="card center">${av(P(g.cur.hummer), 'lg')}<h2 class="tv-big">${name(g.cur.hummer)} choisit sa chanson…</h2></div>`;
      if (g.phase === 'hum') return `${UI.header(g.round, g.totalRounds, step(g), `${name(g.cur.hummer)} fredonne… 🎶`)}<div class="card center">${av(P(g.cur.hummer), 'lg')}<h2 class="tv-big">Quelle est cette chanson ?</h2><div class="tv-big">${UI.timer(g.left)}</div></div>`;
      return null;
    },
    key: (S, g) => [g.phase, g.round].join('|'),
    screen: (S, g) => screens[g.phase](S, g),
    bind: (S, g, root) => {
      root.querySelectorAll('[data-choose]').forEach((b) => b.addEventListener('click', () => UI.send('choose', Number(b.dataset.choose))));
      root.querySelectorAll('[data-found]').forEach((b) => b.addEventListener('click', () => { navigator.vibrate?.(30); UI.send('found', b.dataset.found || null); }));
    },
  };
  UI.registerGame('fredonnette', GAME);
})();
