// 🎙️ L'Imitateur — affichage
(() => {
  const { esc, P, av, name } = UI;
  const L = 'ABCDEF';
  let peek = false, peekRound = 0;   // carte secrète cachée par défaut (regards indiscrets)

  const step = (g) => `Tour ${g.round} / ${g.totalRounds}`;
  const sitCard = (g, big) => `<div class="card center keep im2-sit">
      <div class="muted">${name(g.cur.actor)} imite un personnage qui…</div>
      <div class="im2-sittxt ${big ? 'tv-big' : ''}">${esc(g.cur.situation)}</div></div>`;
  const hintTag = (g) => (g.cur.hint ? '<p class="center white"><b>💬 La phrase culte a été dite : les points baissent !</b></p>' : '');
  const voteCount = (g) => `<p class="center white">🗳️ ${g.cur.voted.length} réponse${g.cur.voted.length > 1 ? 's' : ''}</p>`;

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
            <p class="muted">Prépare-toi à l'écouter : tu devras deviner quel personnage est imité.</p></div>
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
          <p style="margin:10px 0">Joue la scène avec la voix, les gestes et les tics du personnage. <b>Sans dire son nom !</b></p>
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
              ? `<p class="im2-phrase">💬 ${esc(g.card.phrase)}</p><p class="muted">Indice donné : à toi de le jouer !</p>`
              : `<p class="muted" style="margin-bottom:6px">Personne ne trouve ? Lâche la phrase culte (ça rapporte moins de points) :</p>
                 <button class="ghost full" data-hint>💬 Voir et dire la phrase culte</button>`}
          </div>
          ${voteCount(g)}
          ${UI.forceLink('Révéler maintenant')}`;
      }
      const mine = g.cur.mine;
      return `
        ${UI.header(g.round, g.totalRounds, step(g), `${name(g.cur.actor)} imite… qui ?`)}
        <p class="center">${UI.timer(g.left)}</p>
        ${sitCard(g)}
        ${hintTag(g)}
        <div class="card keep">${mine != null ? `<p class="center" style="margin-top:0">Ta réponse : <b>${esc(g.cur.choices[mine])}</b> 🔒</p>` : `<p class="center" style="margin-top:0"><b>Qui est-ce ?</b> Une seule réponse ${g.cur.hint ? '(+75)' : '(+150 tant que la phrase culte n\'est pas dite)'}</p>`}
          ${g.cur.choices.map((t, i) => `<button class="anec im2-ch ${mine === i ? 'sel' : ''}" data-vote="${i}" ${mine != null ? 'disabled' : ''}><span class="l">${L[i]}</span>${esc(t)}</button>`).join('')}</div>
        ${voteCount(g)}
        ${UI.forceLink('Révéler maintenant')}`;
    },

    reveal(S, g) {
      const c = g.cur;
      const by = (i) => Object.entries(c.votes).filter(([, v]) => v.i === i).map(([id, v]) => `${av(P(id), 'sm')}<small>${name(id)}${v.hint ? ' 💬' : ''}</small>`).join('');
      return `
        ${UI.header(g.round + 1, g.totalRounds + 1, step(g), 'C\'était…')}
        <div class="card center reveal">${av(P(c.actor), 'lg')}
          <h2 style="margin:6px 0">${name(c.actor)} imitait <span class="im2-good">${esc(c.choices[c.good])}</span></h2>
          <p class="muted" style="margin:0">Situation : ${esc(c.situation)}<br>Phrase culte : ${esc(c.phrase)}</p></div>
        <div class="card">${c.choices.map((t, i) => `<div class="anec im2-res ${i === c.good ? 'true' : by(i) ? 'false' : ''}"><span class="l">${L[i]}</span><span class="t">${esc(t)}${i === c.good ? ' ✅' : ''}</span><span class="im2-by">${by(i)}</span></div>`).join('')}</div>
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
        <li>Les autres choisissent sur leur téléphone <b>qui il imite</b> parmi 6 noms. Une seule réponse !</li>
        <li>Personne ne trouve ? L'imitateur peut lâcher la <b>💬 phrase culte</b>… mais ça rapporte moins.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">Trouvé avant la phrase culte : <b>+150</b> · après : <b>+75</b> · l'imitateur gagne <b>+40</b> par joueur qui le reconnaît (<b>+20</b> après la phrase)</div>`,

    tv: (S, g) => {
      if (g.phase === 'ready') return `${UI.header(g.round, g.totalRounds, step(g), `Au tour de ${name(g.cur.actor)}`)}<div class="card center">${av(P(g.cur.actor), 'lg')}<h2 class="tv-big">${name(g.cur.actor)} se prépare…</h2></div>${sitCard(g, true)}`;
      if (g.phase === 'play') {
        return `${UI.header(g.round, g.totalRounds, step(g), `${name(g.cur.actor)} imite… qui ?`)}
          <div class="card center">${av(P(g.cur.actor), 'lg')}<div class="tv-big">${UI.timer(g.left)}</div></div>
          ${sitCard(g, true)}${hintTag(g)}
          <div class="card im2-tvch">${g.cur.choices.map((t, i) => `<div class="anec"><span class="l">${L[i]}</span>${esc(t)}</div>`).join('')}</div>
          ${voteCount(g)}`;
      }
      return null;
    },

    key: (S, g) => [g.phase, g.round, g.cur?.hint, g.cur?.mine, g.cur?.voted?.length, peek].join('|'),
    screen: (S, g) => screens[g.phase](S, g),

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      on('[data-peek]', () => { peek = !peek; UI.refresh(); });
      on('[data-go]', () => UI.send('go'));
      on('[data-hint]', () => { if (confirm('Dire la phrase culte ? Les autres gagneront moins de points (toi aussi).')) UI.send('hint'); });
      on('[data-vote]', (e) => { navigator.vibrate?.(30); UI.send('vote', Number(e.currentTarget.dataset.vote)); });
    },
  };
  UI.registerGame('imitateur', GAME);
})();
