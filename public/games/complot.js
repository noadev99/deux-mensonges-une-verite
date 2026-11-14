// 🗡️ Le Complot — affichage (plateau de missions, carte de rôle, cartes de mission)
(() => {
  const { esc, P, av, name } = UI;
  const B = ICONS.board;
  let roleShown = false;     // la carte de rôle reste face cachée tant qu'on ne la touche pas
  let pick = { key: '', ids: [] };

  // ─── Plateau : 5 missions, piste des refus, chef ───
  const boardTop = (S, g) => `
    <div class="board">
      <div class="cp-missions">${g.sizes.map((n, i) => {
        const r = g.results[i];
        return `<div class="cp-token ${r || ''} ${i === g.mission && !r ? 'now' : ''}">${r === 'ok' ? B.shield : r === 'ko' ? B.sabotage : `<b>${n}</b><small>agents</small>`}</div>`;
      }).join('')}</div>
      <div class="cp-info">
        <span class="cp-chef">${B.crown}<span>Chef : <b>${name(g.leader)}</b></span></span>
        <span class="cp-rejects">Refus ${Array.from({ length: g.maxRejects }, (_, i) => `<i class="${i < g.rejects ? 'on' : ''}"></i>`).join('')}</span>
      </div>
      <div class="cp-legend">🛡️ 3 réussites : les loyaux gagnent · 💣 3 sabotages : les traîtres gagnent · ${g.nTraitors} traître${g.nTraitors > 1 ? 's' : ''} caché${g.nTraitors > 1 ? 's' : ''}</div>
    </div>`;

  const roleCard = (S, g) => {
    if (!g.role) return '';
    const traitor = g.role === 'traitor';
    const allies = traitor ? g.allies.filter((id) => id !== S.you) : [];
    return `<button class="cp-role keep ${roleShown ? 'shown' : ''} ${traitor ? 'bad' : ''}" data-role>
      ${roleShown
        ? `<span class="cp-roleart">${traitor ? B.hood : B.knight}</span>
           <span><b>${traitor ? 'Tu es un TRAÎTRE 🗡️' : 'Tu es LOYAL 🛡️'}</b><br>
           <small>${traitor ? (allies.length ? `Tes complices : ${allies.map(name).join(', ')}` : 'Tu agis seul… sabote sans te faire repérer.') : 'Réussis les missions et démasque les traîtres.'}</small><br><small class="muted">Touche pour cacher</small></span>`
        : '<span class="cp-roleart back">★</span><span><b>Ta carte de rôle</b><br><small class="muted">Touche pour la regarder (en cachette !)</small></span>'}
    </button>`;
  };

  const teamRow = (ids) => `<div class="cp-team">${ids.map((id) => `<span class="cp-agent">${av(P(id))}<span>${name(id)}</span></span>`).join('')}</div>`;

  const header = (g, title) => `
    <div class="progress"><div style="width:${(g.results.length / 5) * 100}%"></div></div>
    <div class="phase"><div class="step">Mission ${g.mission + 1} sur 5 · équipe de ${g.sizes[g.mission]}</div><div class="t">${title}</div></div>`;

  const waitList = (ids, done) => `<div class="players">${ids.filter((id) => P(id)?.connected).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} ${done.includes(id) ? '✅' : '<span class="wait">🤔</span>'}</span></div>`).join('')}</div>`;

  const screens = {
    propose(S, g) {
      const size = g.sizes[g.mission];
      const k = `${g.mission}|${g.rejects}`;
      if (pick.key !== k) pick = { key: k, ids: [] };
      const chef = g.leader === S.you;
      return `${header(g, chef ? 'Choisis ton équipe 👑' : `${name(g.leader)} choisit l'équipe…`)}
        ${roleCard(S, g)}
        ${boardTop(S, g)}
        ${chef ? `<div class="card keep"><h2 style="margin-top:0">Ton équipe (${pick.ids.length} / ${size})</h2>
            <div class="grid">${g.participants.filter(P).map((id) => `<button class="pick ${pick.ids.includes(id) ? 'sel' : ''}" data-team="${id}">${av(P(id))}<span>${name(id)}${id === S.you ? ' (toi)' : ''}</span></button>`).join('')}</div>
            <div style="height:10px"></div>
            <button class="full alt" data-propose ${pick.ids.length === size ? '' : 'disabled'}>Proposer cette équipe</button></div>`
          : `<div class="card center"><div>${av(P(g.leader), 'lg')}</div><p style="margin-bottom:0">Discutez ! Qui mérite votre confiance ?</p></div>`}
        ${UI.forceLink(`Passer le tour de ${name(g.leader)}`)}`;
    },

    vote(S, g) {
      return `${header(g, 'On vote pour cette équipe ?')}
        ${roleCard(S, g)}
        ${boardTop(S, g)}
        <div class="card center keep"><h2 style="margin-top:0">L'équipe proposée par ${name(g.leader)}</h2>${teamRow(g.team)}
          ${g.role ? (g.myVote
            ? `<p>Ton vote : <b>${g.myVote === 'yes' ? '👍 Pour' : '👎 Contre'}</b></p>`
            : `<div class="row" style="margin-top:12px"><button class="alt" data-vote="yes">👍 Pour</button><button class="ghost" data-vote="no">👎 Contre</button></div>`) : ''}
        </div>
        <div class="card"><div data-live="voted"></div></div>
        ${UI.forceLink('Dépouiller maintenant')}`;
    },

    voteResult(S, g) {
      const yes = Object.values(g.votes).filter((v) => v === 'yes').length;
      const verdict = g.approved ? 'Équipe acceptée ✅' : g.forced ? `Refusée… mais c'est le ${g.maxRejects}ᵉ refus : elle part quand même ! ⚠️` : `Équipe refusée ❌ (${g.rejects + 1} / ${g.maxRejects})`;
      return `${header(g, verdict)}
        ${roleCard(S, g)}
        <div class="card center">${teamRow(g.team)}<p class="muted">${yes} pour · ${Object.keys(g.votes).length - yes} contre</p>
          <div class="cp-votes">${Object.entries(g.votes).filter(([id]) => P(id)).map(([id, v]) => `<span class="cp-vote ${v}">${av(P(id), 'sm')} ${name(id)} ${v === 'yes' ? '👍' : '👎'}</span>`).join('')}</div></div>
        ${UI.hostButton(g.approved || g.forced ? 'L\'équipe part en mission 🎒' : 'Chef suivant')}`;
    },

    mission(S, g) {
      const inTeam = g.team.includes(S.you);
      return `${header(g, inTeam ? 'Tu pars en mission 🎒' : 'L\'équipe est en mission…')}
        ${roleCard(S, g)}
        ${boardTop(S, g)}
        <div class="card center keep">${teamRow(g.team)}
          ${inTeam ? (g.myPlay
            ? '<p>Ta carte est jouée, face cachée 🤫</p>'
            : `<p style="margin-bottom:6px">Joue ta carte en secret :</p><div class="bt-hand">
                <button class="cardbtn" data-play="ok"><div class="pcard lg up"><div class="in"><div class="face front ok">${B.shield}<b>Réussite</b></div></div></div></button>
                ${g.role === 'traitor' ? `<button class="cardbtn" data-play="ko"><div class="pcard lg up"><div class="in"><div class="face front ko">${B.sabotage}<b>Sabotage</b></div></div></div></button>` : ''}</div>
                ${g.role === 'loyal' ? '<div class="muted" style="font-size:.85rem">Un loyal ne peut que réussir la mission.</div>' : '<div class="muted" style="font-size:.85rem">Saboter maintenant… ou attendre pour gagner leur confiance ?</div>'}`)
          : '<p class="muted">Croisez les doigts…</p>'}
        </div>
        <div class="card"><div data-live="played"></div></div>
        ${UI.forceLink('Révéler la mission')}`;
    },

    missionResult(S, g) {
      const r = g.missionResult;
      return `${header(g, r.ok ? 'Mission réussie ! 🛡️' : `Sabotage ! 💣 (${r.sabotages} carte${r.sabotages > 1 ? 's' : ''})`)}
        ${roleCard(S, g)}
        <div class="board center">
          ${teamRow(r.team)}
          <div class="bt-hand">${r.cards.map((c, i) => `<div class="pcard flip" style="--d:${0.5 + i * 0.6}s"><div class="in"><div class="face back"><span>★</span></div>
            <div class="face front ${c}">${c === 'ok' ? B.shield : B.sabotage}<b>${c === 'ok' ? 'Réussite' : 'Sabotage'}</b></div></div></div>`).join('')}</div>
        </div>
        ${boardTop(S, g)}
        <div class="card gains-card">${UI.gainsBlock(r.gains)}</div>
        ${UI.hostButton(g.results.filter((x) => x === 'ok').length >= 3 || g.results.filter((x) => x === 'ko').length >= 3 ? 'Le moment des accusations 👉' : 'Mission suivante')}`;
    },

    accuse(S, g) {
      const others = g.participants.filter((id) => id !== S.you);
      return `<div class="phase"><div class="step">${g.winner === 'loyal' ? 'Les loyaux ont sauvé les missions 🛡️' : 'Le complot a réussi 🗡️'}</div><div class="t">Qui sont les traîtres ? 👉</div></div>
        ${roleCard(S, g)}
        ${boardTop(S, g)}
        ${g.role ? `<div class="card keep"><h2 style="margin-top:0">${g.role === 'traitor' ? 'Accuse quelqu\'un pour brouiller les pistes' : 'Ton accusation'}</h2>${UI.playerGrid(others, g.myAccuse, 'accuse')}</div>` : ''}
        <div class="card"><div data-live="accused"></div></div>
        ${UI.forceLink('Révéler les traîtres')}`;
    },

    final(S, g) {
      const r = g.result;
      return `<div class="phase"><div class="step">Révélation</div><div class="t">${g.traitors.length > 1 ? 'Les traîtres étaient…' : 'Le traître était…'}</div></div>
        <div class="board center"><div class="cp-reveal">${g.traitors.map((id, i) => `<div class="cp-traitor reveal" style="animation-delay:${0.4 + i * 0.5}s">${B.hood}${av(P(id), 'lg')}<b>${name(id)}</b><small>${r.counts[id] || 0} accusation${(r.counts[id] || 0) > 1 ? 's' : ''}</small></div>`).join('')}</div></div>
        <div class="card"><h2>Les accusations</h2>${Object.entries(g.accuseVotes).filter(([v]) => P(v)).map(([v, t]) => `<div class="score">${av(P(v))}<span class="n">${name(v)} → ${name(t)}</span>${g.traitors.includes(t) ? '✅' : '❌'}</div>`).join('') || '<span class="muted">Personne n\'a accusé</span>'}</div>
        <div class="card gains-card">${UI.gainsBlock(r.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(r.gains))}</div>
        ${UI.hostButton('Voir le podium 🏆')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  UI.registerGame('complot', {
    rules: () => `
      <ol class="rules">
        <li>Des <b>traîtres</b> se cachent parmi vous (ils se connaissent entre eux). Regarde ta carte de rôle en cachette.</li>
        <li>Chaque mission, le <b>chef</b> propose une équipe. Tout le monde vote. Au 3ᵉ refus d'affilée, l'équipe part quand même.</li>
        <li>En mission, chacun joue en secret <b>Réussite</b> ou <b>Sabotage</b> (seuls les traîtres peuvent saboter). Un seul sabotage fait échouer la mission.</li>
        <li>3 réussites : les loyaux gagnent les missions. 3 sabotages : les traîtres gagnent. Puis tout le monde <b>accuse</b> un traître.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">🛡️ Mission réussie : <b>+50</b> par loyal · 💣 Sabotée : <b>+100</b> par traître<br>
      Victoire : <b>+100</b> par loyal ou <b>+200</b> par traître · 👉 Accuser un traître : <b>+100</b> · 🥷 Traître jamais démasqué : <b>+150</b></div>`,

    key: (S, g) => [g.phase, g.mission, g.rejects, g.leader, g.myVote, g.myPlay, g.myAccuse, roleShown, g.phase === 'propose' ? pick.ids.join(',') : ''].join('|'),

    screen: (S, g) => screens[g.phase](S, g),

    live: {
      voted: (S, g) => `<div class="muted" style="margin-bottom:8px">${g.voted.length} / ${g.needed} ont voté</div>${waitList(g.participants, g.voted)}`,
      played: (S, g) => `<div class="muted" style="margin-bottom:8px">${g.played.length} / ${g.team.length} cartes jouées</div>${waitList(g.team, g.played)}`,
      accused: (S, g) => `<div class="muted" style="margin-bottom:8px">${g.accused.length} / ${g.needed} ont accusé</div>${waitList(g.participants, g.accused)}`,
    },

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      on('[data-role]', () => { roleShown = !roleShown; UI.refresh(); });
      on('[data-team]', (e) => {
        const id = e.currentTarget.dataset.team;
        const size = g.sizes[g.mission];
        if (pick.ids.includes(id)) pick.ids = pick.ids.filter((x) => x !== id);
        else if (pick.ids.length < size) pick.ids.push(id);
        UI.refresh();
      });
      on('[data-propose]', () => UI.send('team', pick.ids));
      on('[data-vote]', (e) => UI.send('vote', e.currentTarget.dataset.vote));
      on('[data-play]', (e) => UI.send('play', e.currentTarget.dataset.play));
      on('[data-accuse]', (e) => UI.send('accuse', e.currentTarget.dataset.accuse));
    },
  });
})();
