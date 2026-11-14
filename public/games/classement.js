// 🏅 Le Classement — affichage
(() => {
  const { esc, P, av, name } = UI;
  let order = { round: 0, list: [] }; // classement en cours (tap pour ajouter)

  const themeCard = (g) => `<div class="card center reveal">
    <div class="muted">${g.isJudge ? 'Classe tout le monde, du plus au moins…' : `Comment ${name(g.judge)} classe la bande, du plus au moins…`}</div>
    <div class="cl-theme">Qui ${esc(g.theme)} ?</div></div>`;

  const slots = (list, total) => `<ol class="cl-slots">${Array.from({ length: total }, (_, i) => {
    const id = list[i];
    return `<li class="${id ? 'on' : ''}"><b>${i + 1}</b>${id ? `${av(P(id))}<span>${name(id)}${id === UI.state.you ? ' (toi)' : ''}</span><button class="cl-x" data-remove="${i}" aria-label="Retirer">×</button>` : '<span class="muted">…</span>'}</li>`;
  }).join('')}</ol>`;

  const screens = {
    rank(S, g) {
      if (order.round !== g.round) order = { round: g.round, list: [] };
      const step = `Manche ${g.round} sur ${g.totalRounds} · juge : ${name(g.judge)}`;
      if (g.myRanking) {
        return `
          ${UI.header(g.round, g.totalRounds, step, g.isJudge ? 'Ton classement est prêt 🤫' : 'Prédiction envoyée')}
          ${themeCard(g)}
          <div class="card">${slots(g.myRanking, g.ranked.length).replace(/<button[^>]*>×<\/button>/g, '')}
            <button class="ghost" data-edit>✏️ Modifier</button></div>
          <div class="card"><div data-live="progress"></div></div>
          ${UI.forceLink('Révéler maintenant')}`;
      }
      const left = g.ranked.filter((id) => !order.list.includes(id));
      return `
        ${UI.header(g.round, g.totalRounds, step, g.isJudge ? 'Tu es le juge ⚖️' : 'Devine son classement')}
        ${themeCard(g)}
        <div class="card">
          ${slots(order.list, g.ranked.length)}
          ${left.length ? `<p class="muted" style="margin:12px 0 8px">Touche les joueurs dans l'ordre :</p>${UI.playerGrid(left, null, 'add')}`
            : `<button class="full alt" data-send>Valider</button>`}
        </div>
        <div class="card"><div data-live="progress"></div></div>
        ${UI.forceLink('Révéler maintenant')}`;
    },

    reveal(S, g) {
      const r = g.result;
      if (!r.truth) return `${UI.header(g.round, g.totalRounds, `Manche ${g.round} sur ${g.totalRounds}`, 'Manche passée')}
        <div class="card center"><p>${name(g.judge)} n'a pas fait son classement à temps. Personne ne marque de points.</p></div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Manche suivante')}`;
      const mine = g.rankings[S.you];
      return `
        ${UI.header(g.round, g.totalRounds, `Manche ${g.round} sur ${g.totalRounds}`, `Le classement de ${name(g.judge)}`)}
        <div class="card center"><div class="cl-theme sm">Qui ${esc(g.theme)} ?</div></div>
        <div class="card reveal">
          <ol class="cl-slots">${r.truth.map((id, i) => {
            const mark = mine && !g.isJudge ? (mine[i] === id ? '<span class="cl-ok">🎯</span>' : Math.abs(mine.indexOf(id) - i) === 1 ? '<span class="cl-ok">≈</span>' : '') : '';
            return `<li class="on" style="animation-delay:${(r.truth.length - i) * .12}s"><b>${i + 1}</b>${av(P(id))}<span>${name(id)}</span>${mark}</li>`;
          }).join('')}</ol>
          ${mine && !g.isJudge ? '<p class="muted" style="margin:10px 0 0;font-size:.9rem">🎯 bonne place · ≈ à une place près</p>' : ''}
        </div>
        <div class="card gains-card">${UI.gainsBlock(r.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(r.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Manche suivante')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  UI.registerGame('classement', {
    rules: () => `
      <ol class="rules">
        <li>À chaque manche, un <b>juge</b> reçoit un thème (ex. : « Qui est le plus drôle ? »).</li>
        <li>Il classe <b>tous les joueurs</b>, lui compris, en secret.</li>
        <li>Les autres essaient de <b>deviner son classement</b>. Le juge change à chaque manche.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">🎯 Bonne place : <b>+50</b> · ≈ À une place près : <b>+20</b><br>📖 Le juge gagne la moyenne des points des autres : sois honnête !</div>`,

    key: (S, g) => [g.phase, g.round, !!g.myRanking, order.list.join(',')].join('|'),

    screen: (S, g) => screens[g.phase](S, g),

    live: {
      progress: (S, g) => `<div class="muted" style="margin-bottom:8px">${g.done.length} sur ${g.needed} ont classé</div>
        <div class="players">${g.participants.filter((id) => P(id)?.connected).map((id) => `<div class="player">${av(P(id))}<span>${name(id)}${id === g.judge ? ' ⚖️' : ''} ${g.done.includes(id) ? '✅' : '<span class="wait">🤔</span>'}</span></div>`).join('')}</div>`,
    },

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      on('[data-add]', (e) => { order.list.push(e.currentTarget.dataset.add); UI.refresh(); });
      on('[data-remove]', (e) => { order.list.splice(Number(e.currentTarget.dataset.remove), 1); UI.refresh(); });
      on('[data-send]', () => UI.send('rank', order.list));
      on('[data-edit]', () => { order.list = [...g.myRanking]; UI.send('edit'); });
    },
  });
})();
