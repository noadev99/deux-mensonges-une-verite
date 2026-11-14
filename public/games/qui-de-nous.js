// 🗳️ Qui de nous ? — affichage
(() => {
  const { esc, P, av, name } = UI;
  // choix en cours (avant validation)
  let pick = { vote: null, bet: null, round: 0 };

  const screens = {
    vote(S, g) {
      if (pick.round !== g.round) pick = { vote: g.myVote, bet: g.myBet, round: g.round };
      const answered = g.myVote && g.myBet;
      return `
        ${UI.header(g.round, g.totalRounds, `Question ${g.round} / ${g.totalRounds}`, 'Qui de nous…')}
        <div class="card center reveal"><div class="qdn-q">…est le plus susceptible de <b>${esc(g.question)} ?</b></div></div>
        ${answered ? `
          <div class="card center">
            <h2>C'est voté ✅</h2>
            <div class="muted">Ton vote : ${av(P(g.myVote), 'sm')} ${name(g.myVote)} · Ton pari : ${av(P(g.myBet), 'sm')} ${name(g.myBet)}</div>
            <div style="height:10px"></div>
            <button class="ghost" data-change>Changer</button>
          </div>` : `
          <div class="card">
            <h2>1. Ton vote <span class="muted" style="font-size:.9rem;font-weight:400">(secret)</span></h2>
            ${UI.playerGrid(g.participants, pick.vote, 'vote')}
          </div>
          <div class="card">
            <h2>2. Ton pari 🎲</h2>
            <p class="muted" style="margin-top:0">Qui sera le plus désigné par le groupe ?</p>
            ${UI.playerGrid(g.participants, pick.bet, 'bet')}
          </div>
          <button class="full" data-send ${pick.vote && pick.bet ? '' : 'disabled'}>Valider</button>
          <div style="height:10px"></div>`}
        <div class="card"><div data-live="progress"></div></div>
        ${UI.forceLink('Révéler maintenant')}`;
    },

    reveal(S, g) {
      const r = g.result;
      const ranked = Object.keys(r.counts).filter(P).sort((a, b) => r.counts[b] - r.counts[a]);
      const max = Math.max(1, ...Object.values(r.counts));
      return `
        ${UI.header(g.round, g.totalRounds, `Question ${g.round} / ${g.totalRounds}`, 'Le verdict')}
        <div class="card center reveal">
          <div class="muted">…le plus susceptible de ${esc(g.question)}</div>
          <div style="display:flex;justify-content:center;gap:16px;margin-top:12px;flex-wrap:wrap">
            ${r.top.map((id) => `<div>${av(P(id), 'lg')}<h2 style="margin:8px 0 0">${name(id)}</h2></div>`).join('') || '<div class="muted">Aucun vote</div>'}
          </div>
        </div>
        <div class="card">
          <h2>Les votes</h2>
          ${ranked.map((id) => `
            <div class="qdn-bar">${av(P(id))}<div style="flex:1"><div>${name(id)}</div>
              <div class="qdn-track"><div style="width:${(r.counts[id] / max) * 100}%"></div></div></div><b>${r.counts[id]}</b></div>`).join('')}
        </div>
        <div class="card gains-card">${UI.gainsBlock(r.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(r.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Question suivante')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  UI.registerGame('qui-de-nous', {
    rules: () => `
      <ol class="rules">
        <li>Une question tombe : <b>« Qui de nous est le plus susceptible de… ? »</b></li>
        <li>Tu votes en secret pour un joueur (toi compris).</li>
        <li>Tu paries sur celui qui recevra <b>le plus de votes</b>.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">🎯 Bon pari : <b>+100</b> · 🐑 Voté comme la majorité : <b>+50</b><br>Les votes restent anonymes, seuls les totaux sont révélés.</div>`,

    key: (S, g) => [g.phase, g.round, g.myVote, g.myBet, pick.vote, pick.bet].join('|'),

    screen: (S, g) => screens[g.phase](S, g),

    live: {
      progress: (S, g) => `<div class="muted" style="margin-bottom:8px">${g.done.length} / ${g.needed} ont voté</div>
        <div class="players">${g.participants.filter((id) => P(id)?.connected).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} ${g.done.includes(id) ? '✅' : '<span class="wait">🤔</span>'}</span></div>`).join('')}</div>`,
    },

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      const redraw = () => UI.refresh();
      on('[data-vote]', (e) => { pick.vote = e.currentTarget.dataset.vote; redraw(); });
      on('[data-bet]', (e) => { pick.bet = e.currentTarget.dataset.bet; redraw(); });
      on('[data-send]', () => UI.send('answer', { vote: pick.vote, bet: pick.bet }));
      on('[data-change]', () => UI.send('change'));
    },
  });
})();
