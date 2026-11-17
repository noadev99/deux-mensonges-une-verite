// 🏷️ L'Étiquette — affichage
(() => {
  const { esc, P, av, name } = UI;
  let draft = { round: 0, text: '' };

  const step = (g) => `Manche ${g.round} / ${g.totalRounds}`;
  const fmt = (v, unit) => `${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${esc(unit)}`;
  const itemCard = (g, big) => `<div class="card center keep et-item">
      <div class="et-emoji ${big ? 'tv-big' : ''}">${g.cur.emoji}</div>
      <div class="muted">Combien coûte…</div>
      <div class="et-label ${big ? 'tv-big' : ''}">${esc(g.cur.label)} ?</div>
      <div class="et-unit">en ${esc(g.cur.unit)}</div></div>`;
  const progress = (g) => `<div class="players">${g.participants.filter((id) => P(id)?.connected).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} ${g.cur.done.includes(id) ? '✅' : '<span class="wait">🤔</span>'}</span></div>`).join('')}</div>`;

  const screens = {
    intro: (S, g) => `${UI.header(1, 1, 'L\'Étiquette', 'Combien ça coûte ? 🏷️')}<div class="card">${GAME.rules()}</div>${UI.hostButton('Première étiquette')}`,

    guess(S, g) {
      if (draft.round !== g.round) draft = { round: g.round, text: '' };
      const c = g.cur;
      return `${UI.header(g.round, g.totalRounds, step(g), 'Ton prix ? 🤔')}
        ${itemCard(g)}
        <div class="card keep stack">
          ${c.mine != null ? `<p class="center" style="margin-top:0">Ton prix : <b>${fmt(c.mine, c.unit)}</b> ✅<br><small class="muted">Tu peux encore le changer</small></p>` : '<p class="center muted" style="margin-top:0">Le plus proche <b>sans dépasser</b> gagne !</p>'}
          <div class="row bz-estrow"><input id="et-in" inputmode="decimal" placeholder="Ton prix (${esc(c.unit)})" value="${esc(draft.text)}"><button data-send>OK</button></div>
          <p class="center" style="margin-bottom:0">${UI.timer(g.left)}</p>
        </div>
        <div class="card"><div data-live="progress"></div></div>
        ${UI.forceLink('Révéler maintenant')}`;
    },

    reveal(S, g) {
      const c = g.cur;
      const winners = Object.keys(c.gains || {});
      return `${UI.header(g.round + 1, g.totalRounds + 1, step(g), 'Le vrai prix')}
        <div class="card center reveal">${c.emoji ? `<div class="et-emoji">${c.emoji}</div>` : ''}<div class="muted">${esc(c.label)}</div>
          <div class="et-price">${fmt(c.price, c.unit)}</div><p class="muted" style="margin-bottom:0">${esc(c.note)}</p></div>
        <div class="card">${c.list.map((x) => `<div class="score ${x.over ? 'et-over' : ''}">${av(P(x.id))}<span class="n">${name(x.id)}${winners.includes(x.id) ? ' 🏆' : ''}</span><span class="p">${fmt(x.v, c.unit)}${x.over ? ' <small>trop cher !</small>' : ''}</span></div>`).join('') || '<p class="muted center">Personne n\'a répondu</p>'}</div>
        <div class="card gains-card">${UI.gainsBlock(c.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(c.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Étiquette suivante')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  const GAME = {
    rules: () => `<ol class="rules">
        <li>On vous montre une chose : un ticket de métro, une amende, un record d'enchères…</li>
        <li>Chacun tape <b>son prix</b> en secret sur son téléphone.</li>
        <li>Le plus proche <b>sans dépasser</b> gagne. Si tout le monde dépasse, le plus proche gagne un peu quand même.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">Gagnant : <b>+100</b> · prix exact : <b>+50</b> en plus</div>`,
    tv: (S, g) => (g.phase === 'guess' ? `${UI.header(g.round, g.totalRounds, step(g), 'Tapez votre prix 🏷️')}${itemCard(g, true)}<div class="card">${progress(g)}<p class="center">${UI.timer(g.left)}</p></div>` : null),
    key: (S, g) => [g.phase, g.round, g.cur?.mine].join('|'),
    screen: (S, g) => screens[g.phase](S, g),
    live: { progress: (S, g) => progress(g) },
    bind: (S, g, root) => {
      const inp = root.querySelector('#et-in');
      if (!inp) return;
      inp.addEventListener('input', () => { draft.text = inp.value; });
      const go = () => { if (inp.value.trim()) UI.send('price', inp.value); };
      root.querySelector('[data-send]')?.addEventListener('click', go);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    },
  };
  UI.registerGame('etiquette', GAME);
})();
