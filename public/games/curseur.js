// 🎚️ Le Curseur — affichage
(() => {
  const { esc, P, av, name } = UI;
  let draft = { round: 0, clue: '', v: 50 };

  const step = (g) => `Manche ${g.round} / ${g.totalRounds}`;
  // l'échelle : marqueurs optionnels [{v, label, cls}] et zones de points autour de la cible
  const scale = (g, { target, marks = [], zones = false, big = false } = {}) => {
    const [a, b] = g.cur.scale;
    const zone = (w, cls) => `<i class="cu-zone ${cls}" style="left:${Math.max(0, target - w)}%;width:${Math.min(100, target + w) - Math.max(0, target - w)}%"></i>`;
    return `<div class="cu-wrap ${big ? 'big' : ''}">
      <div class="cu-ends"><span>⬅️ ${esc(a)}</span><span>${esc(b)} ➡️</span></div>
      <div class="cu-bar">
        ${zones && target != null ? zone(18, 'z3') + zone(10, 'z2') + zone(4, 'z1') : ''}
        ${target != null ? `<b class="cu-target" style="left:${target}%">🎯</b>` : ''}
        ${marks.map((m) => `<span class="cu-mark ${m.cls || ''}" style="left:${m.v}%">${m.label}</span>`).join('')}
      </div></div>`;
  };
  const clueCard = (g, big) => `<div class="card center keep"><div class="muted">Indice de ${name(g.cur.giver)}</div><div class="cu-clue ${big ? 'tv-big' : ''}">« ${esc(g.cur.clue)} »</div></div>`;
  const progress = (g) => `<div class="muted" style="margin-bottom:8px">${g.cur.done.length} / ${g.cur.needed} ont placé leur curseur</div>
    <div class="players">${g.participants.filter((id) => P(id)?.connected && id !== g.cur.giver).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} ${g.cur.done.includes(id) ? '✅' : '<span class="wait">🤔</span>'}</span></div>`).join('')}</div>`;

  const screens = {
    intro: (S, g) => `${UI.header(1, 1, 'Le Curseur', 'Un indice, une échelle 🎚️')}<div class="card">${GAME.rules()}</div>${UI.hostButton('Première manche')}`,

    clue(S, g) {
      if (draft.round !== g.round) draft = { round: g.round, clue: '', v: 50 };
      const c = g.cur;
      if (S.you !== c.giver) {
        return `${UI.header(g.round, g.totalRounds, step(g), `${name(c.giver)} cherche un indice…`)}
          <div class="card keep">${scale(g)}</div>
          <div class="card center keep">${av(P(c.giver), 'lg')}<p>${name(c.giver)} voit une cible secrète sur cette échelle et va donner <b>un seul indice</b>.</p>${UI.timer(g.left)}</div>
          ${UI.forceLink('Indice donné à l\'oral : passer au vote')}`;
      }
      return `${UI.header(g.round, g.totalRounds, step(g), 'À toi de donner l\'indice 💡')}
        <div class="card keep"><p class="center" style="margin-top:0">🔒 <b>Toi seul</b> vois la cible :</p>${scale(g, { target: c.target, zones: true })}</div>
        <div class="card keep stack">
          <p style="margin-top:0">Donne <b>une chose, une personne, un film…</b> qui se place à peu près là entre <b>${esc(c.scale[0])}</b> et <b>${esc(c.scale[1])}</b>.</p>
          <div class="row bz-estrow"><input id="cu-clue" maxlength="50" placeholder="Ex. : un café, Dark Vador…" value="${esc(draft.clue)}"><button data-clue>Envoyer</button></div>
          <p class="muted center" style="margin-bottom:0">Pas de chiffre ni de « un peu », juste un exemple ! ${UI.timer(g.left)}</p>
        </div>`;
    },

    guess(S, g) {
      if (draft.round !== g.round) draft = { round: g.round, clue: '', v: 50 };
      const c = g.cur;
      if (S.you === c.giver) {
        return `${UI.header(g.round, g.totalRounds, step(g), 'Les autres placent le curseur…')}
          ${clueCard(g)}<div class="card keep">${scale(g, { target: c.target, zones: true })}</div>
          <div class="card"><div data-live="progress"></div><p class="center">${UI.timer(g.left)}</p></div>
          ${UI.forceLink('Révéler maintenant')}`;
      }
      const v = c.mine ?? draft.v;
      return `${UI.header(g.round, g.totalRounds, step(g), 'Place le curseur 🎚️')}
        ${clueCard(g)}
        <div class="card keep">${scale(g, { marks: [{ v, label: '▼', cls: 'me' }] })}
          <input type="range" class="cu-range" id="cu-range" min="0" max="100" value="${v}">
          <button class="full" data-guess>${c.mine != null ? '✅ Envoyé, renvoyer ma position' : 'Valider ma position'}</button></div>
        <div class="card"><div data-live="progress"></div><p class="center">${UI.timer(g.left)}</p></div>
        ${UI.forceLink('Révéler maintenant')}`;
    },

    reveal(S, g) {
      const c = g.cur;
      const marks = Object.entries(c.guesses).map(([id, v]) => ({ v, label: av(P(id), 'sm'), cls: 'who' }));
      const list = Object.entries(c.guesses).sort((a, b) => Math.abs(a[1] - c.target) - Math.abs(b[1] - c.target));
      return `${UI.header(g.round + 1, g.totalRounds + 1, step(g), 'Où était la cible ?')}
        ${clueCard(g)}
        <div class="card reveal">${scale(g, { target: c.target, zones: true, marks })}</div>
        <div class="card">${list.map(([id, v]) => `<div class="score">${av(P(id))}<span class="n">${name(id)}</span><span class="p">à ${Math.abs(v - c.target)} ${Math.abs(v - c.target) <= 4 ? '🎯' : ''}</span></div>`).join('') || '<p class="muted center">Personne n\'a joué</p>'}</div>
        <div class="card gains-card">${UI.gainsBlock(c.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(c.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Manche suivante')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  const GAME = {
    rules: () => `<ol class="rules">
        <li>Une échelle entre deux extrêmes s'affiche, par exemple <b>Froid ↔ Chaud</b>.</li>
        <li>Le donneur voit une <b>cible secrète</b> sur l'échelle et donne <b>un seul indice</b> (« un café » pour une cible plutôt chaude).</li>
        <li>Les autres <b>placent le curseur</b> là où ils pensent que la cible se trouve.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">🎯 Dans le mille : <b>+100</b> · tout près : <b>+60</b> · pas loin : <b>+30</b><br>💡 Le donneur gagne la moyenne des autres : sois clair !</div>`,
    tv: (S, g) => {
      if (g.phase === 'clue') return `${UI.header(g.round, g.totalRounds, step(g), `${name(g.cur.giver)} cherche un indice…`)}<div class="card">${scale(g, { big: true })}</div><p class="center">${UI.timer(g.left)}</p>`;
      if (g.phase === 'guess') return `${UI.header(g.round, g.totalRounds, step(g), 'Placez le curseur 🎚️')}${clueCard(g, true)}<div class="card">${scale(g, { big: true })}</div><div class="card">${progress(g)}<p class="center">${UI.timer(g.left)}</p></div>`;
      return null;
    },
    key: (S, g) => [g.phase, g.round, g.cur?.mine, g.cur?.clue].join('|'),
    screen: (S, g) => screens[g.phase](S, g),
    live: { progress: (S, g) => progress(g) },
    bind: (S, g, root) => {
      const clue = root.querySelector('#cu-clue');
      if (clue) {
        clue.addEventListener('input', () => { draft.clue = clue.value; });
        const go = () => { if (clue.value.trim()) UI.send('clue', clue.value); };
        root.querySelector('[data-clue]')?.addEventListener('click', go);
        clue.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      }
      const range = root.querySelector('#cu-range');
      if (range) {
        const mark = root.querySelector('.cu-mark.me');
        range.addEventListener('input', () => { draft.v = Number(range.value); if (mark) mark.style.left = `${draft.v}%`; });
        root.querySelector('[data-guess]')?.addEventListener('click', () => { navigator.vibrate?.(20); UI.send('guess', Number(range.value)); });
      }
    },
  };
  UI.registerGame('curseur', GAME);
})();
