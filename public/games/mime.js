// 🎭 Fais deviner — affichage
(() => {
  const { esc, P, av, name } = UI;

  const T = (g, i) => g.teamInfo[i];
  const teamTag = (g, i) => `<span class="mi-team" style="--t:${T(g, i).color}">${T(g, i).emoji} ${esc(T(g, i).name)}</span>`;
  const teamScores = (g) => `<div class="mi-scores">${[0, 1].map((i) => `<div class="mi-sc ${g.team === i && ['ready', 'turn'].includes(g.phase) ? 'on' : ''}" style="--t:${T(g, i).color}">
      <span>${T(g, i).emoji} ${esc(T(g, i).name)}</span><b>${g.teamPts[i]}</b></div>`).join('')}</div>`;
  const teamList = (g, i) => `<div class="mi-col" style="--t:${T(g, i).color}"><h3>${T(g, i).emoji} ${esc(T(g, i).name)}</h3>
      ${g.teams[i].filter(P).map((id) => `<div class="player">${av(P(id), 'sm')}<span>${name(id)}${id === UI.state.you ? ' (toi)' : ''}</span></div>`).join('')}</div>`;
  const mancheCard = (g, big) => `<div class="card center keep mi-manche">
      <div class="muted">Manche ${g.manche} / ${g.totalManches}</div>
      <div class="mi-mname ${big ? 'tv-big' : ''}">${g.mancheInfo.emoji} ${esc(g.mancheInfo.name)}</div>
      <p style="margin:6px 0 0">${esc(g.mancheInfo.rule)}</p></div>`;
  const left = (g) => `<p class="center muted">${g.remaining} mot${g.remaining > 1 ? 's' : ''} encore dans le paquet</p>`;
  const step = (g) => (g.manche ? `Manche ${g.manche} / ${g.totalManches} · ${g.mancheInfo.emoji} ${g.mancheInfo.name}` : 'Fais deviner');

  const screens = {
    teams(S, g) {
      return `
        ${UI.header(1, 1, 'Fais deviner', 'Les équipes 🎭')}
        <div class="card"><div class="mi-cols">${teamList(g, 0)}${teamList(g, 1)}</div></div>
        ${g.myTeam >= 0 ? `<p class="center white">Tu es dans l'équipe ${teamTag(g, g.myTeam)}</p>` : ''}
        <div class="card">${GAME.rules()}</div>
        ${UI.hostButton('C\'est parti : manche 1')}`;
    },

    mancheIntro(S, g) {
      return `
        ${UI.header(g.manche, g.totalManches, step(g), 'Nouvelle manche')}
        ${mancheCard(g)}
        ${teamScores(g)}
        ${UI.hostButton('Premier tour')}`;
    },

    ready(S, g) {
      const me = S.you === g.giver;
      return `
        ${UI.header(g.manche, g.totalManches, step(g), me ? 'À toi de faire deviner !' : `Au tour de ${name(g.giver)}`)}
        ${teamScores(g)}
        <div class="card center keep">${av(P(g.giver), 'lg')}<h2>${name(g.giver)} fait deviner</h2>
          <p>à l'équipe ${teamTag(g, g.team)}</p>
          ${me ? `<p class="muted">Mets-toi face à ton équipe. Quand tu es prêt(e) :</p><button class="full" data-go>▶ C'est parti !</button>` : ''}
        </div>
        ${mancheCard(g)}
        ${left(g)}
        ${me ? '' : UI.forceLink('Lancer le chrono à sa place')}`;
    },

    turn(S, g) {
      const me = S.you === g.giver;
      const opp = g.myTeam >= 0 && g.myTeam !== g.team;
      let main;
      if (me) {
        main = `<div class="card center keep mi-word-card"><div class="muted">Fais deviner :</div><div class="mi-word">${esc(g.word || '')}</div>
            <div class="row"><button class="ghost" data-pass>⏭ Passer</button><button data-found>✅ Trouvé !</button></div>
            <p class="muted" style="margin:8px 0 0">${g.mancheInfo.emoji} ${esc(g.mancheInfo.rule)}</p></div>`;
      } else if (opp) {
        main = `<div class="card center keep"><div class="muted">Tu surveilles ${name(g.giver)}. Le mot :</div><div class="mi-word sm">${esc(g.word || '')}</div>
            <button class="mi-cheat" data-cheat>🚨 Triche !</button>
            <p class="muted" style="margin:8px 0 0">Appuie si ${name(g.giver)} ne respecte pas la règle : ${esc(g.mancheInfo.rule)}</p></div>`;
      } else {
        main = `<div class="card center keep"><h2>Devine ! 🗣️</h2><p>${name(g.giver)} te fait deviner des mots. Crie tes réponses !</p></div>`;
      }
      return `
        ${UI.header(g.manche, g.totalManches, step(g), `${name(g.giver)} fait deviner`)}
        <p class="center">${UI.timer(g.left)}</p>
        ${main}
        <div class="card"><div class="mi-found">✅ ${g.found.length} trouvé${g.found.length > 1 ? 's' : ''}${g.cheats ? ` · 🚨 ${g.cheats} triche${g.cheats > 1 ? 's' : ''}` : ''}</div>
          ${g.found.length ? `<div class="mi-chips">${g.found.map((w) => `<span>${esc(w)}</span>`).join('')}</div>` : ''}</div>
        ${left(g)}
        ${UI.forceLink('Arrêter le tour')}`;
    },

    turnEnd(S, g) {
      const l = g.last;
      return `
        ${UI.header(g.manche, g.totalManches, step(g), 'Fin du tour')}
        <div class="card center reveal">${av(P(l.giver), 'lg')}<h2>${name(l.giver)} a fait deviner ${l.found.length} mot${l.found.length > 1 ? 's' : ''}</h2>
          ${l.found.length ? `<div class="mi-chips">${l.found.map((w) => `<span>${esc(w)}</span>`).join('')}</div>` : ''}
          ${l.cheats.length ? `<p class="bad-txt">🚨 Triche sur : ${l.cheats.map((c) => `<b>${esc(c.word)}</b> (vu par ${name(c.by)})`).join(', ')}</p>` : ''}</div>
        ${teamScores(g)}
        ${l.mancheOver ? '<p class="center white"><b>📦 Le paquet est vide : fin de la manche !</b></p>' : left(g)}
        <div class="card gains-card">${UI.gainsBlock(l.gains)}</div>
        ${UI.hostButton(l.mancheOver ? 'Voir le bilan de la manche' : `Tour suivant : ${T(g, g.team).emoji} ${esc(T(g, g.team).name)}`)}`;
    },

    mancheEnd(S, g) {
      const last = g.manche >= g.totalManches;
      return `
        ${UI.header(g.manche + 1, g.totalManches, step(g), `Fin de la manche ${g.manche}`)}
        ${teamScores(g)}
        ${last ? '' : `<div class="card center"><div class="muted">Manche suivante</div><div class="mi-mname">${g.manches[g.manche].emoji} ${esc(g.manches[g.manche].name)}</div><p>${esc(g.manches[g.manche].rule)}</p></div>`}
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores)}</div>
        ${UI.hostButton(last ? 'Voir le podium 🏆' : `Manche ${g.manche + 1}`)}`;
    },

    end: (S, g) => `${teamScores(g)}${UI.endScreen(g)}`,
  };

  const GAME = {
    rules: () => `
      <ol class="rules">
        <li>Deux équipes. À tour de rôle, un joueur voit des mots sur son téléphone et en fait deviner <b>le plus possible</b> à son équipe avant la fin du chrono.</li>
        <li>Les <b>mêmes mots</b> reviennent à chaque manche : 🗣️ on parle librement, puis ☝️ un seul mot d'indice, puis 🤸 on mime !</li>
        <li>L'équipe adverse voit le mot et peut appuyer sur <b>🚨 Triche</b> si la règle n'est pas respectée.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">Mot trouvé : <b>+10</b> pour toute l'équipe, <b>+5</b> pour celui qui fait deviner · Triche : <b>−10</b> · Équipe gagnante : <b>+30</b></div>`,

    tv: (S, g) => {
      if (g.phase === 'turn') {
        return `${UI.header(g.manche, g.totalManches, step(g), `${name(g.giver)} fait deviner`)}
          ${teamScores(g)}
          <div class="card center">${av(P(g.giver), 'lg')}<div class="tv-big">${UI.timer(g.left)}</div><p>${g.mancheInfo.emoji} ${esc(g.mancheInfo.rule)}</p></div>
          <div class="card"><div class="mi-found">✅ ${g.found.length} trouvé${g.found.length > 1 ? 's' : ''}${g.cheats ? ` · 🚨 ${g.cheats}` : ''}</div>
          ${g.found.length ? `<div class="mi-chips">${g.found.map((w) => `<span>${esc(w)}</span>`).join('')}</div>` : ''}</div>${left(g)}`;
      }
      if (g.phase === 'ready') return `${UI.header(g.manche, g.totalManches, step(g), `Au tour de ${name(g.giver)}`)}${teamScores(g)}${mancheCard(g, true)}${left(g)}`;
      return null;
    },

    key: (S, g) => [g.phase, g.manche, g.giver, g.word, g.found?.length, g.cheats, g.teamPts.join(',')].join('|'),
    screen: (S, g) => screens[g.phase](S, g),

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      on('[data-go]', () => UI.send('go'));
      on('[data-found]', () => { navigator.vibrate?.(40); UI.send('found', g.word); });
      on('[data-pass]', () => UI.send('pass', g.word));
      on('[data-cheat]', () => { if (confirm(`Signaler une triche sur « ${g.word} » ?`)) UI.send('cheat', g.word); });
    },
  };
  UI.registerGame('mime', GAME);
})();
