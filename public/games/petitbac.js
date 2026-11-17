// 🔤 Le Petit Bac express — affichage
(() => {
  const { esc, P, av, name } = UI;
  let draft = { round: 0, list: ['', '', '', '', ''] };
  let sendT = 0;

  const step = (g) => `Manche ${g.round} / ${g.totalRounds}`;
  const letterBig = (g) => `<div class="pb-letter">${esc(g.cur.letter)}</div>`;
  const sendDraft = () => { clearTimeout(sendT); sendT = setTimeout(() => UI.send('draft', draft.list), 400); };

  const screens = {
    intro: (S, g) => `${UI.header(1, 1, 'Le Petit Bac express', 'À vos stylos… ou presque ✍️')}<div class="card">${GAME.rules()}</div>${UI.hostButton('Tirer la première lettre')}`,

    write(S, g) {
      const c = g.cur;
      if (draft.round !== g.round) draft = { round: g.round, list: (c.mine || ['', '', '', '', '']).slice() };
      const full = draft.list.every((w) => w.trim());
      return `${UI.header(g.round, g.totalRounds, step(g), `Des mots en ${esc(c.letter)} !`)}
        <div class="card center keep pb-top">${letterBig(g)}<div>${UI.timer(g.left)}${c.stopBy ? `<p class="pb-stop">✋ ${name(c.stopBy)} a crié STOP !</p>` : ''}</div></div>
        <div class="card keep stack">
          ${c.cats.map((cat, i) => `<label class="pb-field"><span>${esc(cat)}</span><input data-i="${i}" maxlength="30" autocomplete="off" autocapitalize="sentences" placeholder="${esc(c.letter)}…" value="${esc(draft.list[i])}"></label>`).join('')}
          <button class="full pb-stopbtn" data-stop ${c.stopBy ? 'disabled' : ''}>${c.stopBy ? 'STOP déjà crié' : full ? '✋ STOP ! (tout est rempli)' : '✋ STOP (remplis les 5 cases)'}</button>
          <p class="muted center" style="margin-bottom:0">Tes réponses sont enregistrées au fur et à mesure.</p>
        </div>
        ${UI.forceLink('Arrêter le chrono et vérifier')}`;
    },

    check(S, g) {
      const c = g.cur;
      const owners = Object.keys(c.answers).filter(P);
      return `${UI.header(g.round, g.totalRounds, step(g), 'On vérifie ! 🧐')}
        <div class="card center keep">${letterBig(g)}<p class="muted" style="margin:0">Touche une réponse d'un autre joueur pour la <b>contester</b> ❌. Refusée si la majorité conteste.</p></div>
        ${c.cats.map((cat, ci) => `<div class="card keep"><h2>${esc(cat)}</h2>${owners.map((id) => {
          const w = c.answers[id][ci], k = `${id}|${ci}`;
          if (!w) return `<div class="score pb-row">${av(P(id), 'sm')}<span class="n muted">${name(id)} : —</span></div>`;
          const votes = (c.votes[k] || []).length, mine = (c.votes[k] || []).includes(S.you);
          const bad = c.badLetter[k];
          return `<button class="score pb-row ${c.refused[k] ? 'refused' : ''} ${mine ? 'mine' : ''}" ${id === S.you || bad ? 'disabled' : `data-contest="${k}"`}>${av(P(id), 'sm')}<span class="n">${esc(w)} <small class="muted">· ${name(id)}</small></span>
            <span>${bad ? '🚫 mauvaise lettre' : votes ? `❌ ${votes}` : ''}${c.refused[k] && !bad ? ' refusée' : ''}</span></button>`;
        }).join('')}</div>`).join('')}
        ${UI.hostButton('Compter les points')}`;
    },

    reveal(S, g) {
      const c = g.cur;
      const owners = Object.keys(c.answers).filter(P);
      return `${UI.header(g.round + 1, g.totalRounds + 1, step(g), 'Les points')}
        <div class="card"><table class="pb-table"><tr><th></th>${c.cats.map((x) => `<th>${esc(x)}</th>`).join('')}</tr>
          ${owners.map((id) => `<tr><td>${av(P(id), 'sm')}</td>${c.cats.map((_, ci) => { const w = c.answers[id][ci], r = c.result[`${id}|${ci}`]; return `<td class="${r === 10 ? 'u' : r === 5 ? 's' : w ? 'x' : ''}">${w ? esc(w) : '—'}${w ? `<b>${r || 0}</b>` : ''}</td>`; }).join('')}</tr>`).join('')}
        </table><p class="muted" style="margin-bottom:0;font-size:.9rem">🟢 10 pts : réponse unique · 🟡 5 pts : trouvée par plusieurs · 🔴 refusée</p></div>
        <div class="card gains-card">${UI.gainsBlock(c.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(c.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Lettre suivante')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  const GAME = {
    rules: () => `<ol class="rules">
        <li>Une <b>lettre</b> est tirée et <b>5 catégories</b> s'affichent (Pays, Animal, Excuse pour être en retard…).</li>
        <li>Trouve un mot qui commence par cette lettre pour chaque catégorie, en <b>75 secondes</b>.</li>
        <li>Tout rempli ? Crie <b>STOP</b> : il ne reste que 10 secondes aux autres !</li>
        <li>Ensuite, on vérifie : chacun peut <b>contester</b> une réponse douteuse.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">Réponse unique : <b>10</b> · même réponse qu'un autre : <b>5</b> · STOP crié : <b>+5</b></div>`,
    tv: (S, g) => {
      if (g.phase === 'write') return `${UI.header(g.round, g.totalRounds, step(g), 'Écrivez vite !')}<div class="card center">${letterBig(g)}<div class="tv-big">${UI.timer(g.left)}</div>${g.cur.stopBy ? `<p class="pb-stop tv-big">✋ ${name(g.cur.stopBy)} a crié STOP !</p>` : ''}</div>
        <div class="card"><ol class="rules">${g.cur.cats.map((x) => `<li class="tv-big">${esc(x)}</li>`).join('')}</ol></div>`;
      return null;
    },
    key: (S, g) => [g.phase, g.round, g.cur?.stopBy, g.phase === 'check' ? JSON.stringify(g.cur.votes) : '', g.phase === 'write' ? draft.list.every((w) => w.trim()) : ''].join('|'),
    screen: (S, g) => screens[g.phase](S, g),
    bind: (S, g, root) => {
      root.querySelectorAll('input[data-i]').forEach((inp) => inp.addEventListener('input', () => {
        const before = draft.list.every((w) => w.trim());
        draft.list[Number(inp.dataset.i)] = inp.value;
        sendDraft();
        if (before !== draft.list.every((w) => w.trim())) {
          const pos = inp.selectionStart; const i = inp.dataset.i;
          UI.refresh();
          const again = document.querySelector(`input[data-i="${i}"]`); again?.focus(); again?.setSelectionRange(pos, pos);
        }
      }));
      root.querySelector('[data-stop]')?.addEventListener('click', () => { clearTimeout(sendT); UI.send('stop', draft.list); });
      root.querySelectorAll('[data-contest]').forEach((b) => b.addEventListener('click', () => { navigator.vibrate?.(20); UI.send('contest', b.dataset.contest); }));
    },
  };
  UI.registerGame('petitbac', GAME);
})();
