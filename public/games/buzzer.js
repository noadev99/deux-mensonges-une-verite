// 🔔 Le Buzzer — affichage
(() => {
  const { esc, P, av, name } = UI;
  const L = 'ABCD';
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

  const choiceList = (g, reveal) => `<div class="card">${g.cur.choices.map((t, i) => {
    const cls = reveal ? (i === g.cur.good ? 'true' : g.cur.tried.includes(i) ? 'false' : '') : g.cur.tried.includes(i) ? 'false' : '';
    return `<div class="anec bz-ch ${cls}"><span class="l">${L[i]}</span>${esc(t)}${reveal && i === g.cur.good ? ' ✅' : ''}</div>`;
  }).join('')}</div>`;

  const wrongLine = (g) => g.cur.wrong.length ? `<p class="center muted">❌ Déjà tenté : ${g.cur.wrong.map(name).join(', ')}</p>` : '';

  const screens = {
    survey(S, g) {
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
      const c = g.cur, me = S.you;
      let action;
      if (c.buzzer === me) {
        action = `<div class="card keep bz-mine"><h2>À toi ! Choisis vite ${UI.timer(g.left)}</h2>
          ${c.choices.map((t, i) => c.tried.includes(i) ? '' : `<button class="anec bz-pick" data-pick="${i}"><span class="l">${L[i]}</span>${esc(t)}</button>`).join('')}</div>`;
      } else if (c.buzzer) {
        action = `<div class="card center keep"><div class="bz-who">${av(P(c.buzzer), 'lg')}<h2>${name(c.buzzer)} a buzzé !</h2></div><p class="muted">Il/elle choisit sa réponse… ${UI.timer(g.left)}</p></div>`;
      } else if (c.locked.includes(me) || c.wrong.includes(me)) {
        action = `<div class="card center keep"><h2>${c.wrong.includes(me) ? '❌ Raté !' : '🤐 C\'est ta question'}</h2><p class="muted">Tu ne peux plus buzzer sur cette question. ${UI.timer(g.left)}</p></div>`;
      } else {
        action = `<div class="center keep bz-zone"><button class="bz-btn" data-buzz>BUZZ</button><p class="white" style="margin:8px 0 0">${UI.timer(g.left)}</p></div>`;
      }
      return `
        ${UI.header(g.round, g.totalRounds, step(g), 'Buzzez ! 🔔')}
        ${qCard(g)}
        ${action}
        ${wrongLine(g)}
        ${c.buzzer === me ? '' : choiceList(g, false)}
        ${UI.forceLink('Révéler la réponse')}`;
    },

    est(S, g) {
      const c = g.cur;
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
        res = `${choiceList(g, true)}
          <div class="card center reveal">${c.winner ? `${av(P(c.winner), 'lg')}<h2>${name(c.winner)} a trouvé ! 🎉</h2>` : '<h2>Personne n\'a trouvé 😶</h2>'}
          ${c.kind === 'about' ? `<p class="muted">${name(c.about)} avait répondu : <b>${esc(c.choices[c.good])}</b></p>` : ''}</div>`;
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
        <li>Une question et ses réponses s'affichent : <b>le premier qui buzze</b> sur son téléphone répond.</li>
        <li>Bonne réponse : <b>+100</b>. Mauvaise : <b>−50</b> et tu ne peux plus buzzer, les autres reprennent la main.</li>
        <li>📏 Estimations : tout le monde tape un nombre, le plus proche gagne.</li>
        <li>🙋 Questions sur vous : devinez ce qu'un ami a répondu au début de la partie.</li>
        <li>💰 Les 3 dernières questions valent <b>double</b>.</li>
      </ol>`,

    tv: (S, g) => {
      if (g.phase === 'q') {
        const c = g.cur;
        return `${UI.header(g.round, g.totalRounds, step(g), 'Buzzez ! 🔔')}
          ${qCard(g, true)}${choiceList(g, false)}
          <div class="card center">${c.buzzer ? `<div class="bz-who">${av(P(c.buzzer), 'lg')}<h2 class="tv-big">${name(c.buzzer)} a buzzé !</h2></div>` : '<h2>Le premier qui buzze répond…</h2>'} ${UI.timer(g.left)}</div>
          ${wrongLine(g)}`;
      }
      if (g.phase === 'est') return `${UI.header(g.round, g.totalRounds, step(g), 'Estimation 📏')}${qCard(g, true)}<div class="card center">${UI.timer(g.left)}<div data-live="est"></div></div>`;
      if (g.phase === 'survey') return `${UI.header(1, 1, 'Avant de commencer', 'Chacun répond en secret sur son téléphone 🙋')}<div class="card">${GAME.rules()}</div><div class="card"><div data-live="survey"></div></div>`;
      return null;
    },

    key: (S, g) => [g.phase, g.round, g.surveyDone, g.cur?.buzzer, g.cur?.wrong?.length, g.cur?.mine, JSON.stringify(survey.ans)].join('|'),
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
      on('[data-pick]', (e) => UI.send('pick', Number(e.currentTarget.dataset.pick)));
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
