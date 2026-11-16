// 🎙️ L'Imitateur — affichage
(() => {
  const { esc, P, av, name } = UI;

  const step = (g) => `Tour ${g.round} / ${g.totalRounds}`;
  const charCard = (g, big) => `<div class="card center keep im2-card">
      <div class="muted">${name(g.cur.actor)} imite</div>
      <div class="im2-name ${big ? 'tv-big' : ''}">${esc(g.cur.name)}</div>
      <p class="im2-phrase">💬 ${esc(g.cur.phrase)}</p></div>`;
  const fmt = (v) => String(v).replace('.', ',');
  const noteColor = (v) => `hsl(${Math.round(v * 12)}, 75%, 55%)`;

  const screens = {
    intro(S, g) {
      return `
        ${UI.header(1, 1, 'L\'Imitateur', 'À vos voix ! 🎙️')}
        <div class="card">${GAME.rules()}</div>
        ${UI.hostButton('Premier imitateur')}`;
    },

    choose(S, g) {
      if (S.you !== g.cur.actor) {
        return `
          ${UI.header(g.round, g.totalRounds, step(g), `Au tour de ${name(g.cur.actor)}`)}
          <div class="card center keep">${av(P(g.cur.actor), 'lg')}<h2>${name(g.cur.actor)} choisit son personnage…</h2>
            <p class="muted">Prépare-toi à noter son imitation sur 10 !</p></div>
          ${UI.forceLink('Choisir au hasard à sa place')}`;
      }
      return `
        ${UI.header(g.round, g.totalRounds, step(g), 'À toi d\'imiter ! 🎙️')}
        <div class="card keep"><p style="margin-top:0"><b>Choisis le personnage</b> que tu sais le mieux imiter :</p>
          ${g.cur.cards.map((c, i) => `<button class="im2-pick" data-choose="${i}"><b>${esc(c.name)}</b><small>💬 ${esc(c.phrase)}</small></button>`).join('')}
        </div>`;
    },

    show(S, g) {
      const me = S.you === g.cur.actor;
      return `
        ${UI.header(g.round, g.totalRounds, step(g), me ? 'Imite ! 🎙️' : `${name(g.cur.actor)} imite…`)}
        <p class="center">${UI.timer(g.left)}</p>
        ${charCard(g)}
        ${me ? `<div class="card center keep"><p style="margin-top:0">Lève-toi et fais ta meilleure imitation : <b>la phrase culte</b>, la voix, les gestes, les tics…</p>
            <p class="muted">💡 Idée de scène si tu veux : ton personnage ${esc(g.cur.situation)}</p>
            <button class="full" data-done>✅ J'ai fini : place aux notes !</button></div>`
          : `<div class="card center keep"><h2>👀 Regarde bien !</h2><p style="margin:0">Juste après, tu noteras l'imitation sur 10.</p></div>
            ${UI.forceLink('Passer aux notes')}`}`;
    },

    rate(S, g) {
      const me = S.you === g.cur.actor;
      const count = `<p class="center white">🗳️ ${g.cur.done.length} / ${g.cur.judges.length} ont noté · ${UI.timer(g.left)}</p>`;
      if (me) {
        return `
          ${UI.header(g.round, g.totalRounds, step(g), 'Les juges notent… 😬')}
          ${charCard(g)}
          <div class="card center keep"><h2>Suspense…</h2><p style="margin:0">Les autres te notent sur 10.</p></div>
          ${count}${UI.forceLink('Révéler les notes')}`;
      }
      const mine = g.cur.mine;
      return `
        ${UI.header(g.round, g.totalRounds, step(g), 'Ta note sur 10 ⭐')}
        <div class="card center keep"><div class="muted">${name(g.cur.actor)} a imité</div><div class="im2-sittxt">${esc(g.cur.name)}</div></div>
        <div class="card keep">
          <p class="center" style="margin-top:0">${mine != null ? `Ta note : <b>${mine}/10</b> ✅ <small class="muted">(tu peux encore changer)</small>` : '<b>Ressemblant ? Drôle ? Note la prestation :</b>'}</p>
          <div class="im2-notes">${Array.from({ length: 11 }, (_, v) => `<button class="im2-n ${mine === v ? 'sel' : ''}" style="--nc:${noteColor(v)}" data-note="${v}">${v}</button>`).join('')}</div>
          <div class="im2-scale"><span>😬 raté</span><span>🤩 bluffant</span></div>
        </div>
        ${count}${UI.forceLink('Révéler les notes')}`;
    },

    reveal(S, g) {
      const c = g.cur;
      const list = Object.entries(c.notes).sort((a, b) => b[1] - a[1]);
      return `
        ${UI.header(g.round + 1, g.totalRounds + 1, step(g), 'Les notes !')}
        <div class="card center reveal">${av(P(c.actor), 'lg')}
          <h2 style="margin:6px 0">${name(c.actor)} en ${esc(c.name)}</h2>
          ${c.avg != null ? `<div class="im2-avg" style="--nc:${noteColor(c.avg)}">${fmt(c.avg)}<small>/10</small></div>` : '<p class="muted">Personne n\'a noté 😶</p>'}</div>
        ${list.length ? `<div class="card">${list.map(([id, v]) => `<div class="score">${av(P(id))}<span class="n">${name(id)}</span><span class="im2-chip" style="--nc:${noteColor(v)}">${v}/10</span></div>`).join('')}</div>` : ''}
        <div class="card gains-card">${UI.gainsBlock(c.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(c.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Imitateur suivant')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  const GAME = {
    rules: () => `
      <ol class="rules">
        <li>À tour de rôle, un joueur <b>choisit un personnage</b> parmi 3 (Gollum, Scooby-Doo, Dark Vador…).</li>
        <li>Tout le monde voit qui il imite. Il se lance : <b>la phrase culte</b>, la voix, les gestes, les tics…</li>
        <li>Ensuite, chacun <b>note la prestation sur 10</b>, en secret sur son téléphone.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">L'imitateur marque sa <b>moyenne × 10</b> (7,5/10 → +75) · note à 1 point ou moins de la moyenne : <b>+20</b> (juge juste)</div>`,

    tv: (S, g) => {
      if (g.phase === 'choose') return `${UI.header(g.round, g.totalRounds, step(g), `Au tour de ${name(g.cur.actor)}`)}<div class="card center">${av(P(g.cur.actor), 'lg')}<h2 class="tv-big">${name(g.cur.actor)} choisit son personnage…</h2></div>`;
      if (g.phase === 'show') return `${UI.header(g.round, g.totalRounds, step(g), `${name(g.cur.actor)} imite…`)}<div class="center tv-big">${UI.timer(g.left)}</div>${charCard(g, true)}`;
      if (g.phase === 'rate') return `${UI.header(g.round, g.totalRounds, step(g), 'Notez sur vos téléphones ⭐')}${charCard(g, true)}<p class="center white tv-big">🗳️ ${g.cur.done.length} / ${g.cur.judges.length} · ${UI.timer(g.left)}</p>`;
      return null;
    },

    key: (S, g) => [g.phase, g.round, g.cur?.mine, g.cur?.done?.length].join('|'),
    screen: (S, g) => screens[g.phase](S, g),

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      on('[data-choose]', (e) => UI.send('choose', Number(e.currentTarget.dataset.choose)));
      on('[data-done]', () => UI.send('done'));
      on('[data-note]', (e) => { navigator.vibrate?.(25); UI.send('note', Number(e.currentTarget.dataset.note)); });
    },
  };
  UI.registerGame('imitateur', GAME);
})();
