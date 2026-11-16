// 🔔 Le Buzzer — affichage
(() => {
  const { esc, P, av, name } = UI;
  let said = { key: '', text: '' };
  let survey = { key: '', ans: {} };
  let draft = { round: 0, text: '' };

  const step = (g) => `Question ${g.round} / ${g.totalRounds}${g.double ? ' · 💰 double mise' : ''}`;
  const kindLabel = (c) => (c.kind === 'est' ? '📏 Estimation' : c.kind === 'about' ? '🙋 Question sur nous' : '🧠 Culture générale');
  const qTitle = (c) => (c.kind === 'about' ? `${name(c.about)} : ${esc(c.q)}` : esc(c.q));

  const qCard = (g, big) => `<div class="card center reveal ${big ? '' : 'keep'}">
      <div class="muted">${kindLabel(g.cur)}${g.cur.hard ? ' · <b class="bz-hard">🔥 difficile</b>' : ''}${g.double ? ' · <b>💰 points doublés</b>' : ''}</div>
      <div class="bz-q ${big ? 'tv-big' : ''}">${qTitle(g.cur)}</div>
      ${g.cur.kind === 'about' ? `<div class="muted">${name(g.cur.about)} ne peut pas buzzer sur sa propre question 😉</div>` : ''}
    </div>`;

  // la bonne réponse, visible du maître du jeu (et de tous à la révélation)
  const answerCard = (c, tv) => `<div class="card center keep bz-ans"><div class="muted">${tv ? 'La réponse' : '🔒 Réponse attendue (toi seul la vois)'}</div><div class="bz-q">${esc(c.answer)}</div></div>`;
  const saidLine = (c) => c.said ? `<p class="bz-said">« ${esc(c.said)} »</p>` : '';
  const triesList = (c) => c.tries.length ? `<div class="card">${c.tries.map((t) => `<div class="score">${av(P(t.id))}<span class="n">${name(t.id)}${t.said ? ` : « ${esc(t.said)} »` : ''}</span><span>${t.ok ? '✅' : '❌'}</span></div>`).join('')}</div>` : '';


  const screens = {
    survey(S, g) {
      if (S.you === g.mj) {
        return `
          ${UI.header(1, 1, 'Avant de commencer', 'Questions sur eux 🙋')}
          <div class="card center keep"><h2>🎙️ Tu es le maître du jeu</h2><p class="muted" style="margin:0">Les joueurs répondent en secret à 3 petites questions. Ensuite, tu liras chaque question et tu valideras les réponses.</p></div>
          <div class="card"><div data-live="survey"></div></div>
          ${UI.forceLink('Commencer le quiz sans les retardataires')}`;
      }
      const key = g.mySurvey.map((x) => x.qi).join(',');
      if (survey.key !== key) survey = { key, ans: {} };
      const ready = g.mySurvey.every((x) => survey.ans[x.qi] != null);
      return `
        ${UI.header(1, 1, 'Avant de commencer', 'Questions sur toi 🙋')}
        ${g.surveyDone ? `<div class="card center keep"><h2>C'est noté ✅</h2><p class="muted">Tes réponses sont secrètes. Pendant le quiz, les autres devront deviner ce que tu as répondu !</p></div>`
          : `<div class="card keep"><p class="muted" style="margin-top:0">Réponds sincèrement : les autres devront deviner tes réponses pendant le quiz.</p>
            ${g.mySurvey.map((x) => `<div class="bz-sv"><b>${esc(x.q)}</b><div class="row">
              <button class="${survey.ans[x.qi] === 0 ? '' : 'ghost'}" data-sv="${x.qi}|0">${esc(x.A)}</button>
              <button class="${survey.ans[x.qi] === 1 ? '' : 'ghost'}" data-sv="${x.qi}|1">${esc(x.B)}</button></div></div>`).join('')}
            <button class="full" data-sv-send ${ready ? '' : 'disabled'}>Valider 🔒</button></div>`}
        <div class="card"><div data-live="survey"></div></div>
        ${UI.forceLink('Commencer le quiz sans les retardataires')}`;
    },

    intro(S, g) {
      return `
        ${UI.header(1, 1, 'Le Buzzer', 'Prêts à buzzer ? 🔔')}
        <div class="card">${GAME.rules()}</div>
        ${UI.hostButton('Première question')}`;
    },

    q(S, g) {
      const c = g.cur, me = S.you, host = UI.isHost();
      const k = `${g.round}|${c.buzzer}|${c.tries.length}`;
      if (said.key !== k) said = { key: k, text: '' };
      let action;
      if (c.buzzer === me) {
        action = `<div class="card keep bz-mine center"><h2>🎤 À toi ! Dis ta réponse à voix haute</h2>
          <p class="muted" style="margin-top:0">…ou écris-la si c'est plus simple :</p>
          <div class="row bz-estrow"><input id="bz-say" maxlength="60" placeholder="Ta réponse" value="${esc(said.text)}"><button data-say>Envoyer</button></div>
          ${c.said ? `<p class="muted">Envoyé : « ${esc(c.said)} »</p>` : ''}
          ${!host ? '<p class="muted" style="margin-bottom:0">Le maître du jeu va valider ✅ ou refuser ❌</p>'
            : c.answer == null ? '<button class="full ghost" data-peek>J\'ai dit ma réponse : voir la bonne 👀</button>' : ''}</div>`;
      } else if (c.buzzer) {
        action = `<div class="card center keep"><div class="bz-who">${av(P(c.buzzer), 'lg')}<h2>${name(c.buzzer)} a buzzé !</h2></div>
          ${saidLine(c) || '<p class="muted">Il ou elle répond à voix haute…</p>'}</div>`;
      } else if (me === g.mj) {
        action = `<div class="card center keep"><h2>🎙️ Tu es le maître du jeu</h2><p class="muted" style="margin:0">Lis la question à voix haute. Quand quelqu'un buzze, écoute sa réponse et tranche. ${UI.timer(g.left)}</p></div>`;
      } else if (c.locked.includes(me) || c.wrong.includes(me)) {
        const why = c.wrong.includes(me) ? '❌ Raté !' : c.about === me ? '🤐 C\'est ta question' : '👀 Tu as vu la réponse';
        action = `<div class="card center keep"><h2>${why}</h2><p class="muted">Tu ne peux plus buzzer sur cette question. ${UI.timer(g.left)}</p></div>`;
      } else {
        action = `<div class="center keep bz-zone"><button class="bz-btn" data-buzz>BUZZ</button><p class="white" style="margin:8px 0 0">${UI.timer(g.left)}</p></div>`;
      }
      const judge = host && c.buzzer && c.answer != null ? `<div class="card center keep"><h2 style="margin-top:0">${c.buzzer === me ? 'Ta réponse est-elle bonne ?' : `La réponse de ${name(c.buzzer)} est…`}</h2>
          <div class="row"><button class="bz-ok" data-judge="1">✅ Bonne</button><button class="bz-ko" data-judge="0">❌ Fausse</button></div></div>` : '';
      return `
        ${UI.header(g.round, g.totalRounds, step(g), c.buzzer ? `${name(c.buzzer)} répond… 🎤` : 'Buzzez ! 🔔')}
        ${qCard(g)}
        ${c.answer != null ? answerCard(c) : ''}
        ${action}
        ${judge}
        ${triesList(c)}
        ${UI.forceLink('Révéler la réponse')}`;
    },

    est(S, g) {
      const c = g.cur;
      if (S.you === g.mj) {
        return `
          ${UI.header(g.round, g.totalRounds, step(g), 'Estimation 📏')}
          ${qCard(g)}
          <div class="card center keep"><div class="muted">🔒 Réponse (toi seul la vois)</div><div class="bz-q">${Number(c.value).toLocaleString('fr-FR')} ${esc(c.unit)}</div>
            <p class="muted" style="margin-bottom:0">Les joueurs tapent un nombre : le plus proche gagne, c'est automatique. ${UI.timer(g.left)}</p></div>
          <div class="card"><div data-live="est"></div></div>
          ${UI.forceLink('Révéler maintenant')}`;
      }
      if (draft.round !== g.round) draft = { round: g.round, text: '' };
      return `
        ${UI.header(g.round, g.totalRounds, step(g), 'Estimation 📏')}
        ${qCard(g)}
        <div class="card keep stack">
          ${c.mine != null ? `<p class="center">Ta réponse : <b>${c.mine.toLocaleString('fr-FR')} ${esc(c.unit)}</b> ✅<br><small class="muted">Tu peux encore la changer</small></p>` : '<p class="muted center" style="margin:0">Tape ton estimation : le plus proche gagne !</p>'}
          <div class="row bz-estrow"><input id="bz-est" inputmode="numeric" placeholder="Ton nombre${c.unit ? ` (${esc(c.unit)})` : ''}" value="${esc(draft.text)}"><button data-est>OK</button></div>
          <p class="center">${UI.timer(g.left)}</p>
        </div>
        <div class="card"><div data-live="est"></div></div>
        ${UI.forceLink('Révéler maintenant')}`;
    },

    reveal(S, g) {
      const c = g.cur;
      let res;
      if (c.kind === 'est') {
        res = `<div class="card center reveal"><div class="muted">La bonne réponse</div><div class="bz-q tv-big">${Number(c.value).toLocaleString('fr-FR')} ${esc(c.unit)}</div></div>
          <div class="card">${(c.ranking || []).map((x, i) => `<div class="score"><b>${i + 1}</b>${av(P(x.id))}<span class="n">${name(x.id)}</span><span class="p">${x.v.toLocaleString('fr-FR')}</span></div>`).join('') || '<p class="muted center">Personne n\'a répondu</p>'}</div>`;
      } else {
        res = `${answerCard(c, true)}${triesList(c)}
          <div class="card center reveal">${c.winner ? `${av(P(c.winner), 'lg')}<h2>${name(c.winner)} a trouvé ! 🎉</h2>` : '<h2>Personne n\'a trouvé 😶</h2>'}
          </div>`;
      }
      return `
        ${UI.header(g.round + 1, g.totalRounds, step(g), 'La réponse')}
        <div class="card center keep"><div class="bz-q">${qTitle(c)}</div></div>
        ${res}
        <div class="card gains-card">${UI.gainsBlock(c.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(c.gains))}</div>
        ${g.nextDouble ? '<p class="center white"><b>💰 Attention : les 3 dernières questions valent DOUBLE !</b></p>' : ''}
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Question suivante')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  const GAME = {
    rules: () => `
      <ol class="rules">
        <li>Une question s'affiche, <b>sans propositions</b>. Le premier qui buzze sur son téléphone <b>répond à voix haute</b> (ou l'écrit).</li>
        <li>Le <b>maître du jeu</b> (l'hôte) voit la bonne réponse et tranche : ✅ <b>+100</b>, ❌ <b>−50</b> et tu ne peux plus buzzer, les autres reprennent la main.</li>
        <li>📏 Estimations : tout le monde tape un nombre, le plus proche gagne.</li>
        <li>🙋 Questions sur vous : devinez ce qu'un ami a répondu au début de la partie.</li>
        <li>💰 Les 3 dernières questions valent <b>double</b>.</li>
      </ol>`,

    tv: (S, g) => {
      if (g.phase === 'q') {
        const c = g.cur;
        return `${UI.header(g.round, g.totalRounds, step(g), 'Buzzez ! 🔔')}
          ${qCard(g, true)}
          <div class="card center">${c.buzzer ? `<div class="bz-who">${av(P(c.buzzer), 'lg')}<h2 class="tv-big">${name(c.buzzer)} a buzzé !</h2></div>${saidLine(c)}<p class="muted">Le maître du jeu tranche…</p>` : `<h2>Le premier qui buzze répond à voix haute…</h2>${UI.timer(g.left)}`}</div>
          ${triesList(c)}`;
      }
      if (g.phase === 'est') return `${UI.header(g.round, g.totalRounds, step(g), 'Estimation 📏')}${qCard(g, true)}<div class="card center">${UI.timer(g.left)}<div data-live="est"></div></div>`;
      if (g.phase === 'survey') return `${UI.header(1, 1, 'Avant de commencer', 'Chacun répond en secret sur son téléphone 🙋')}<div class="card">${GAME.rules()}</div><div class="card"><div data-live="survey"></div></div>`;
      return null;
    },

    key: (S, g) => [g.phase, g.round, g.surveyDone, g.cur?.buzzer, g.cur?.said, g.cur?.tries?.length, g.cur?.answer != null, g.cur?.mine, JSON.stringify(survey.ans)].join('|'),
    screen: (S, g) => screens[g.phase](S, g),

    live: {
      survey: (S, g) => `<div class="muted" style="margin-bottom:8px">${g.done.length} / ${g.needed} ont répondu</div>
        <div class="players">${g.participants.filter((id) => P(id)?.connected).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} ${g.done.includes(id) ? '✅' : '<span class="wait">🤔</span>'}</span></div>`).join('')}</div>`,
      est: (S, g) => `<div class="players">${g.participants.filter((id) => P(id)?.connected).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} ${g.cur.done.includes(id) ? '✅' : '<span class="wait">🤔</span>'}</span></div>`).join('')}</div>`,
    },

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      on('[data-sv]', (e) => { const [qi, v] = e.currentTarget.dataset.sv.split('|'); survey.ans[qi] = Number(v); UI.refresh(); });
      on('[data-sv-send]', () => UI.send('survey', survey.ans));
      on('[data-buzz]', (e) => { e.currentTarget.classList.add('hit'); navigator.vibrate?.(60); UI.send('buzz'); });
      on('[data-peek]', () => UI.send('peek'));
      on('[data-judge]', (e) => { navigator.vibrate?.(30); UI.send('judge', e.currentTarget.dataset.judge === '1'); });
      const say = root.querySelector('#bz-say');
      if (say) {
        say.addEventListener('input', () => { said.text = say.value; });
        const go = () => { if (say.value.trim()) UI.send('say', say.value); };
        on('[data-say]', go);
        say.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      }
      const inp = root.querySelector('#bz-est');
      if (inp) {
        inp.addEventListener('input', () => { draft.text = inp.value; });
        const go = () => { if (inp.value.trim()) UI.send('estimate', inp.value); };
        on('[data-est]', go);
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      }
    },
  };
  UI.registerGame('buzzer', GAME);
})();
