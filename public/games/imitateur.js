// 🎙️ L'Imitateur — affichage
(() => {
  const { esc, P, av, name } = UI;
  let peek = false, peekRound = 0;   // carte secrète cachée par défaut (regards indiscrets)

  const step = (g) => `Tour ${g.round} / ${g.totalRounds}`;
  const sitCard = (g, big) => `<div class="card center keep im2-sit">
      <div class="muted">${name(g.cur.actor)} imite un personnage. Situation :</div>
      <div class="im2-sittxt ${big ? 'tv-big' : ''}">${esc(g.cur.situation)}</div></div>`;
  const hintTag = (g) => (g.cur.hint ? '<p class="center white"><b>💬 La phrase culte a été dite : les points baissent !</b></p>' : '');
  const foundBtns = (g, label = '✅ Quelqu\'un a trouvé ? Touche son nom :') => `<div class="mi-by"><div class="muted">${label}</div>
      ${g.cur.guessers.map((id) => `<button data-found="${esc(id)}">${av(P(id), 'sm')} ${name(id)}</button>`).join('')}</div>`;

  const screens = {
    intro(S, g) {
      return `
        ${UI.header(1, 1, 'L\'Imitateur', 'Qui suis-je ? 🎙️')}
        <div class="card">${GAME.rules()}</div>
        ${UI.hostButton('Premier imitateur')}`;
    },

    ready(S, g) {
      const me = S.you === g.cur.actor;
      if (peekRound !== g.round) { peekRound = g.round; peek = false; }
      if (!me) {
        return `
          ${UI.header(g.round, g.totalRounds, step(g), `Au tour de ${name(g.cur.actor)}`)}
          <div class="card center keep">${av(P(g.cur.actor), 'lg')}<h2>${name(g.cur.actor)} découvre son personnage…</h2>
            <p class="muted">Écoute bien et <b>crie ta réponse</b> dès que tu reconnais le personnage !</p></div>
          ${sitCard(g)}
          ${UI.forceLink('Lancer le chrono à sa place')}`;
      }
      return `
        ${UI.header(g.round, g.totalRounds, step(g), 'À toi d\'imiter ! 🎙️')}
        <div class="card center keep im2-card">
          <div class="muted">Ton personnage (ne montre pas ton écran !)</div>
          <button class="im2-secret ${peek ? 'on' : ''}" data-peek>${peek ? `<b>${esc(g.card.name)}</b>` : '👆 Touche pour voir'}</button>
          <div class="muted">La situation à jouer</div>
          <div class="im2-sittxt">${esc(g.cur.situation)}</div>
          <p style="margin:10px 0">Joue la scène avec la voix, les gestes et les tics du personnage. <b>Sans dire son nom !</b> Les autres crient leurs réponses.</p>
          <button class="full" data-go>🎬 Action ! (lancer le chrono)</button>
        </div>`;
    },

    play(S, g) {
      const me = S.you === g.cur.actor;
      if (me) {
        return `
          ${UI.header(g.round, g.totalRounds, step(g), 'Imite ! 🎙️')}
          <p class="center">${UI.timer(g.left)}</p>
          <div class="card center keep im2-card">
            <div class="muted">Tu imites</div><div class="im2-name">${esc(g.card.name)}</div>
            <div class="muted">Situation : <b>${esc(g.cur.situation)}</b></div>
            ${g.cur.hint
              ? `<p class="im2-phrase">💬 ${esc(g.card.phrase)}</p>`
              : `<button class="ghost full" data-hint style="margin-top:10px">💬 Personne ne trouve ? Voir la phrase culte</button>`}
          </div>
          <div class="card keep">${foundBtns(g)}</div>
          ${UI.forceLink('Personne n\'a trouvé : révéler')}`;
      }
      return `
        ${UI.header(g.round, g.totalRounds, step(g), `${name(g.cur.actor)} imite… qui ?`)}
        <p class="center">${UI.timer(g.left)}</p>
        ${sitCard(g)}
        ${hintTag(g)}
        <div class="card center keep"><h2>🗣️ Crie ta réponse !</h2>
          <p style="margin-bottom:0">Le premier qui donne le bon nom gagne <b>${g.cur.hint ? '+75' : '+150'}</b>. ${name(g.cur.actor)} touche ton nom sur son téléphone si c'est juste.</p></div>
        ${UI.isHost() ? `<div class="card">${foundBtns(g, `👑 Tu es l'hôte : si ${name(g.cur.actor)} oublie, tu peux aussi dire qui a trouvé :`)}</div>` : ''}
        ${UI.forceLink('Personne n\'a trouvé : révéler')}`;
    },

    reveal(S, g) {
      const c = g.cur;
      return `
        ${UI.header(g.round + 1, g.totalRounds + 1, step(g), 'C\'était…')}
        <div class="card center reveal">${av(P(c.actor), 'lg')}
          <h2 style="margin:6px 0">${name(c.actor)} imitait <span class="im2-good">${esc(c.name)}</span></h2>
          <p class="muted" style="margin:0">Situation : ${esc(c.situation)}<br>Phrase culte : ${esc(c.phrase)}</p></div>
        <div class="card center reveal">${c.winner ? `${av(P(c.winner), 'lg')}<h2 style="margin:6px 0">${name(c.winner)} a trouvé ! 🎉</h2>${c.hint ? '<p class="muted" style="margin:0">après la phrase culte</p>' : ''}` : '<h2>Personne n\'a trouvé 😶</h2>'}</div>
        <div class="card gains-card">${UI.gainsBlock(c.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(c.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Imitateur suivant')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  const GAME = {
    rules: () => `
      <ol class="rules">
        <li>À tour de rôle, un joueur reçoit en secret un <b>personnage</b> (Dark Vador, Shrek, Nabilla…) et une <b>situation</b> (« commande au fast-food »).</li>
        <li>Il joue la scène <b>en imitant le personnage</b> : voix, gestes, tics… sans dire son nom.</li>
        <li>Les autres <b>crient leurs réponses</b>. Le premier qui donne le bon nom gagne : l'imitateur touche son nom sur son téléphone.</li>
        <li>Personne ne trouve ? L'imitateur peut lâcher la <b>💬 phrase culte</b>… mais ça rapporte moins.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">Trouvé avant la phrase culte : <b>+150</b> (imitateur <b>+100</b>) · après : <b>+75</b> (imitateur <b>+50</b>) · 1 min 30 par tour</div>`,

    tv: (S, g) => {
      if (g.phase === 'ready') return `${UI.header(g.round, g.totalRounds, step(g), `Au tour de ${name(g.cur.actor)}`)}<div class="card center">${av(P(g.cur.actor), 'lg')}<h2 class="tv-big">${name(g.cur.actor)} se prépare…</h2></div>${sitCard(g, true)}`;
      if (g.phase === 'play') {
        return `${UI.header(g.round, g.totalRounds, step(g), `${name(g.cur.actor)} imite… qui ?`)}
          <div class="card center">${av(P(g.cur.actor), 'lg')}<div class="tv-big">${UI.timer(g.left)}</div><h2>🗣️ Criez vos réponses !</h2></div>
          ${sitCard(g, true)}${hintTag(g)}`;
      }
      return null;
    },

    key: (S, g) => [g.phase, g.round, g.cur?.hint, (g.cur?.guessers || []).join(','), peek].join('|'),
    screen: (S, g) => screens[g.phase](S, g),

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      on('[data-peek]', () => { peek = !peek; UI.refresh(); });
      on('[data-go]', () => UI.send('go'));
      on('[data-hint]', () => { if (confirm('Voir et dire la phrase culte ? Ça rapporte moins de points (à toi aussi).')) UI.send('hint'); });
      on('[data-found]', (e) => { navigator.vibrate?.(40); UI.send('found', e.currentTarget.dataset.found); });
    },
  };
  UI.registerGame('imitateur', GAME);
})();
