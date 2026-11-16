// 🎭 Fais deviner — affichage
(() => {
  const { esc, P, av, name } = UI;
  let draft = { n: 0, words: [] };   // mots en cours d'écriture (paquet « nos mots »)

  const T = (g, i) => g.teamInfo[i];
  const teamTag = (g, i) => `<span class="mi-team" style="--t:${T(g, i).color}">${T(g, i).emoji} ${esc(T(g, i).name)}</span>`;
  const teamScores = (g) => g.solo ? '' : `<div class="mi-scores">${[0, 1].map((i) => `<div class="mi-sc ${g.team === i && ['ready', 'turn'].includes(g.phase) ? 'on' : ''}" style="--t:${T(g, i).color}">
      <span>${T(g, i).emoji} ${esc(T(g, i).name)}</span><b>${g.teamPts[i]}</b></div>`).join('')}</div>`;
  const teamList = (g, i) => `<div class="mi-col" style="--t:${T(g, i).color}"><h3>${T(g, i).emoji} ${esc(T(g, i).name)}</h3>
      ${g.teams[i].filter(P).map((id) => `<div class="player">${av(P(id), 'sm')}<span>${name(id)}${id === UI.state.you ? ' (toi)' : ''}</span></div>`).join('')}</div>`;
  const mancheCard = (g, big) => `<div class="card center keep mi-manche">
      <div class="muted">Manche ${g.manche} / ${g.totalManches}</div>
      <div class="mi-mname ${big ? 'tv-big' : ''}">${g.mancheInfo.emoji} ${esc(g.mancheInfo.name)}</div>
      <p style="margin:6px 0 0">${esc(g.mancheInfo.rule)}</p></div>`;
  const left = (g) => `<p class="center muted">${g.remaining} mot${g.remaining > 1 ? 's' : ''} encore dans le paquet</p>`;
  const step = (g) => (g.manche ? `Manche ${g.manche} / ${g.totalManches} · ${g.mancheInfo.emoji} ${g.mancheInfo.name}` : 'Fais deviner');
  const who = (g) => (g.solo ? 'aux autres joueurs' : `à l'équipe ${teamTag(g, g.team)}`);
  const foundCard = (g, list, by) => `<div class="card"><div class="mi-found">✅ ${list.length} trouvé${list.length > 1 ? 's' : ''}${g.cheats ? ` · 🚨 ${g.cheats} triche${g.cheats > 1 ? 's' : ''}` : ''}</div>
      ${list.length ? `<div class="mi-chips">${list.map((w, i) => `<span>${esc(w)}${by?.[i] && g.solo ? ` <small>· ${name(by[i])}</small>` : ''}</span>`).join('')}</div>` : ''}</div>`;

  const screens = {
    write(S, g) {
      const n = g.writeN;
      if (draft.n !== n) draft = { n, words: Array(n).fill('') };
      return `
        ${UI.header(1, 1, 'Avant de commencer', 'Écris tes mots ✍️')}
        ${g.mine ? `<div class="card center keep"><h2>C'est noté ✅</h2><p class="muted">Tes mots vont dans le paquet, mélangés avec ceux des autres. Tu devras peut-être les faire deviner toi-même !</p></div>`
          : `<div class="card keep stack"><p style="margin:0">Écris <b>${n} mots</b> à faire deviner : des personnes connues, des objets, des films, des amis communs… <b>Garde-les secrets !</b></p>
            ${draft.words.map((w, i) => `<input class="mi-w" data-w="${i}" maxlength="40" placeholder="Mot ${i + 1}" value="${esc(w)}" autocomplete="off">`).join('')}
            <button class="full" data-write>Valider mes ${n} mots 🔒</button></div>`}
        <div class="card"><div data-live="write"></div></div>
        ${UI.forceLink('Commencer sans attendre les retardataires')}`;
    },

    teams(S, g) {
      const body = g.solo
        ? `<div class="card"><h2>Chacun pour soi 🎯</h2><p class="muted" style="margin-top:0">À tour de rôle, un joueur fait deviner et <b>tous les autres devinent</b>. Celui qui trouve marque des points, celui qui fait deviner aussi.</p>
            <div class="players">${g.teams[0].filter(P).map((id, i) => `<div class="player">${av(P(id), 'sm')}<span>${i + 1}. ${name(id)}${id === S.you ? ' (toi)' : ''}</span></div>`).join('')}</div></div>`
        : `<div class="card"><div class="mi-cols">${teamList(g, 0)}${teamList(g, 1)}</div></div>
          ${g.myTeam >= 0 ? `<p class="center white">Tu es dans l'équipe ${teamTag(g, g.myTeam)}</p>` : ''}`;
      return `
        ${UI.header(1, 1, 'Fais deviner', g.solo ? 'Qui commence ? 🎭' : 'Les équipes 🎭')}
        ${body}
        <div class="card">${GAME.rules()}</div>
        ${UI.hostButton('C\'est parti : manche 1')}`;
    },

    mancheIntro(S, g) {
      return `
        ${UI.header(g.manche, g.totalManches, step(g), 'Nouvelle manche')}
        ${mancheCard(g)}
        ${teamScores(g)}
        ${g.solo ? `<div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores)}</div>` : ''}
        ${UI.hostButton('Premier tour')}`;
    },

    ready(S, g) {
      const me = S.you === g.giver;
      return `
        ${UI.header(g.manche, g.totalManches, step(g), me ? 'À toi de faire deviner !' : `Au tour de ${name(g.giver)}`)}
        ${teamScores(g)}
        <div class="card center keep">${av(P(g.giver), 'lg')}<h2>${name(g.giver)} fait deviner</h2>
          <p>${who(g)}</p>
          ${me ? `<p class="muted">Mets-toi face aux autres. Ne montre pas ton écran ! Quand tu es prêt(e) :</p><button class="full" data-go>▶ C'est parti !</button>` : ''}
        </div>
        ${mancheCard(g)}
        ${left(g)}
        ${me ? '' : UI.forceLink('Lancer le chrono à sa place')}`;
    },

    turn(S, g) {
      const me = S.you === g.giver;
      const opp = !g.solo && g.myTeam >= 0 && g.myTeam !== g.team;
      let main;
      if (me) {
        // chacun pour soi à 3 ou plus : on touche le nom de celui qui a trouvé
        const many = g.solo && (g.guessers || []).length > 1;
        const foundBtns = many
          ? `<div class="mi-by"><div class="muted">✅ Trouvé par :</div>${g.guessers.map((id) => `<button data-found="${esc(id)}">${av(P(id), 'sm')} ${name(id)}</button>`).join('')}</div>
             <button class="ghost full" data-pass>⏭ Passer ce mot</button>`
          : `<div class="row"><button class="ghost" data-pass>⏭ Passer</button><button data-found>✅ Trouvé !</button></div>`;
        main = `<div class="card center keep mi-word-card"><div class="muted">Fais deviner :</div><div class="mi-word">${esc(g.word || '')}</div>
            ${foundBtns}
            <p class="muted" style="margin:8px 0 0">${g.mancheInfo.emoji} ${esc(g.mancheInfo.rule)}</p></div>`;
      } else if (opp) {
        main = `<div class="card center keep"><div class="muted">Tu surveilles ${name(g.giver)}. Le mot :</div><div class="mi-word sm">${esc(g.word || '')}</div>
            <button class="mi-cheat" data-cheat>🚨 Triche !</button>
            <p class="muted" style="margin:8px 0 0">Appuie si ${name(g.giver)} ne respecte pas la règle : ${esc(g.mancheInfo.rule)}</p></div>`;
      } else {
        main = `<div class="card center keep"><h2>Devine ! 🗣️</h2><p>${name(g.giver)} te fait deviner des mots. <b>Crie tes réponses !</b></p>
            <p class="muted" style="margin-bottom:0">${g.mancheInfo.emoji} ${esc(g.mancheInfo.rule)}</p></div>`;
      }
      return `
        ${UI.header(g.manche, g.totalManches, step(g), `${name(g.giver)} fait deviner`)}
        <p class="center">${UI.timer(g.left)}</p>
        ${main}
        ${foundCard(g, g.found, g.foundBy)}
        ${left(g)}
        ${UI.forceLink('Arrêter le tour')}`;
    },

    turnEnd(S, g) {
      const l = g.last;
      const nextLabel = g.solo ? 'Tour suivant' : `Tour suivant : ${T(g, g.team).emoji} ${esc(T(g, g.team).name)}`;
      return `
        ${UI.header(g.manche, g.totalManches, step(g), 'Fin du tour')}
        <div class="card center reveal">${av(P(l.giver), 'lg')}<h2>${name(l.giver)} a fait deviner ${l.found.length} mot${l.found.length > 1 ? 's' : ''}</h2>
          ${l.found.length ? `<div class="mi-chips">${l.found.map((w, i) => `<span>${esc(w)}${g.solo && l.foundBy?.[i] ? ` <small>· ${name(l.foundBy[i])}</small>` : ''}</span>`).join('')}</div>` : ''}
          ${l.cheats.length ? `<p class="bad-txt">🚨 Triche sur : ${l.cheats.map((c) => `<b>${esc(c.word)}</b> (vu par ${name(c.by)})`).join(', ')}</p>` : ''}</div>
        ${teamScores(g)}
        ${l.mancheOver ? '<p class="center white"><b>📦 Le paquet est vide : fin de la manche !</b></p>' : left(g)}
        <div class="card gains-card">${UI.gainsBlock(l.gains)}</div>
        ${UI.hostButton(l.mancheOver ? 'Voir le bilan de la manche' : nextLabel)}`;
    },

    mancheEnd(S, g) {
      const last = g.manche >= g.totalManches;
      return `
        ${UI.header(g.manche + 1, g.totalManches, step(g), `Fin de la manche ${g.manche}`)}
        ${teamScores(g)}
        ${last ? '' : `<div class="card center"><div class="muted">Manche suivante : les mêmes mots, mais…</div><div class="mi-mname">${g.manches[g.manche].emoji} ${esc(g.manches[g.manche].name)}</div><p>${esc(g.manches[g.manche].rule)}</p></div>`}
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores)}</div>
        ${UI.hostButton(last ? 'Voir le podium 🏆' : `Manche ${g.manche + 1}`)}`;
    },

    end: (S, g) => `${teamScores(g)}${UI.endScreen(g)}`,
  };

  const GAME = {
    rules: () => `
      <ol class="rules">
        <li>À tour de rôle, un joueur voit des mots sur son téléphone et en fait deviner <b>le plus possible</b> avant la fin du chrono.</li>
        <li>Les <b>mêmes mots</b> reviennent à chaque manche : 🗣️ on parle librement, puis ☝️ un seul mot d'indice, puis 🤸 on mime !</li>
        <li><b>Dès 4 joueurs</b> : deux équipes, et l'équipe adverse voit le mot pour appuyer sur <b>🚨 Triche</b>.<br><b>À 2 ou 3</b> : chacun pour soi, tous les autres devinent.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">En équipes : mot trouvé <b>+10</b> pour toute l'équipe, <b>+5</b> pour celui qui fait deviner, triche <b>−10</b>, équipe gagnante <b>+30</b>.<br>Chacun pour soi : <b>+10</b> pour celui qui trouve, <b>+5</b> pour celui qui fait deviner.</div>`,

    tv: (S, g) => {
      if (g.phase === 'turn') {
        return `${UI.header(g.manche, g.totalManches, step(g), `${name(g.giver)} fait deviner`)}
          ${teamScores(g)}
          <div class="card center">${av(P(g.giver), 'lg')}<div class="tv-big">${UI.timer(g.left)}</div><p>${g.mancheInfo.emoji} ${esc(g.mancheInfo.rule)}</p></div>
          ${foundCard(g, g.found, g.foundBy)}${left(g)}`;
      }
      if (g.phase === 'ready') return `${UI.header(g.manche, g.totalManches, step(g), `Au tour de ${name(g.giver)}`)}${teamScores(g)}${mancheCard(g, true)}${left(g)}`;
      if (g.phase === 'write') return `${UI.header(1, 1, 'Avant de commencer', 'Chacun écrit ses mots en secret ✍️')}<div class="card">${GAME.rules()}</div><div class="card"><div data-live="write"></div></div>`;
      return null;
    },

    key: (S, g) => [g.phase, g.manche, g.giver, g.word, g.found?.length, g.cheats, g.teamPts.join(','), (g.guessers || []).join(','), !!g.mine].join('|'),
    screen: (S, g) => screens[g.phase](S, g),

    live: {
      write: (S, g) => `<div class="muted" style="margin-bottom:8px">${g.done.length} / ${g.participants.filter((id) => P(id)?.connected).length} ont écrit leurs mots</div>
        <div class="players">${g.participants.filter((id) => P(id)?.connected).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} ${g.done.includes(id) ? '✅' : '<span class="wait">✍️</span>'}</span></div>`).join('')}</div>`,
    },

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      root.querySelectorAll('[data-w]').forEach((inp) => inp.addEventListener('input', () => { draft.words[Number(inp.dataset.w)] = inp.value; }));
      on('[data-write]', () => {
        const words = draft.words.map((w) => w.trim()).filter(Boolean);
        if (words.length < g.writeN) return UI.toast(`Écris ${g.writeN} mots`);
        UI.send('write', words);
      });
      on('[data-go]', () => UI.send('go'));
      on('[data-found]', (e) => { navigator.vibrate?.(40); UI.send('found', { w: g.word, by: e.currentTarget.dataset.found || null }); });
      on('[data-pass]', () => UI.send('pass', g.word));
      on('[data-cheat]', () => { if (confirm(`Signaler une triche sur « ${g.word} » ?`)) UI.send('cheat', g.word); });
    },
  };
  UI.registerGame('mime', GAME);
})();
