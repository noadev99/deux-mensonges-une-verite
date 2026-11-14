// 🤝 Les Alliances — affichage (coffres sur la table, messages privés, rumeurs)
(() => {
  const { esc, P, av, name } = UI;
  const B = ICONS.board;
  let dmTo = null;    // destinataire choisi pour les messages privés
  let draft = '';

  const header = (g, title, timer = true) => `
    <div class="progress"><div style="width:${((Math.min(g.round, g.totalRounds) - 1) / g.totalRounds) * 100}%"></div></div>
    <div class="phase"><div class="step">${g.phase === 'final' || g.phase === 'finalReveal' ? 'Le moment de vérité' : `Manche ${g.round} sur ${g.totalRounds}`} ${timer ? UI.timer(g.remaining) : ''}</div><div class="t">${title}</div></div>`;

  // les coffres posés sur la table, entre les deux alliés
  const chestsBoard = (S, g) => g.chests.length
    ? `<div class="al-chests">${g.chests.slice().sort((x, y) => y.amount - x.amount).map((c) => `
        <div class="al-chest ${c.a === S.you || c.b === S.you ? 'mine' : ''}">${av(P(c.a), 'sm')}<span class="al-c">${B.chest()}<b>${c.amount}</b></span>${av(P(c.b), 'sm')}</div>`).join('')}</div>`
    : '<div class="muted center" style="color:#d9f5e6">Aucun coffre sur la table pour l\'instant…</div>';

  const rumors = (g) => g.rumors.length
    ? `<div class="al-rumors">${g.rumors.slice(-12).reverse().map((m) => `<span>${av(P(m.from), 'sm')} 📨 ${av(P(m.to), 'sm')}</span>`).join('')}</div>`
    : '<div class="muted center" style="color:#d9f5e6;font-size:.9rem">Pas encore de rumeurs…</div>';

  // messages privés : choix du destinataire + fil des messages me concernant
  const dmCard = (S, g) => {
    if (g.oral) return '<div class="card center keep"><b>🗣️ Négociez en vrai</b><div class="muted">Prenez quelqu\'un à part, chuchotez, promettez…</div></div>';
    const others = g.participants.filter((id) => id !== S.you && P(id));
    if (!others.includes(dmTo)) dmTo = others[0] || null;
    const left = g.maxDm - g.myDmCount;
    return `<div class="card keep"><h2 style="margin-top:0">Messages privés 💌</h2>
      <div class="al-to">${others.map((id) => `<button class="al-tochip ${id === dmTo ? 'sel' : ''}" data-to="${id}">${av(P(id), 'sm')}${name(id)}</button>`).join('')}</div>
      ${left > 0 ? `<div class="row" style="margin-top:8px"><input id="dm" maxlength="100" placeholder="Psst… on fait équipe ?" autocomplete="off" value="${esc(draft)}" /><button class="alt" data-dm style="flex:0 0 auto">Envoyer</button></div>
        <div class="muted" style="font-size:.8rem;margin-top:4px">${left} message${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''} · la télé voit qui écrit à qui, jamais le contenu</div>`
        : '<div class="muted" style="font-size:.85rem;margin-top:6px">Plus de messages pour l\'instant.</div>'}
      <div class="al-inbox" data-live="inbox"></div></div>`;
  };
  const inbox = (S, g) => g.dms.length
    ? g.dms.slice().reverse().map((m) => `<div class="bt-msg ${m.from === S.you ? 'me' : ''}">${av(P(m.from), 'sm')}<span><small class="muted">${m.from === S.you ? `à ${name(m.to)}` : `de ${name(m.from)}`}</small><br>${esc(m.text)}</span></div>`).join('')
    : '<div class="muted center" style="font-size:.9rem">Aucun message pour l\'instant.</div>';

  const screens = {
    pick(S, g) {
      const others = g.participants.filter((id) => id !== S.you);
      return `${header(g, 'Choisis ton allié 🤝')}
        <div class="board"><h2 class="board-t">Les coffres sur la table</h2><div data-live="chests"></div>
          <h2 class="board-t" style="margin-top:12px">Rumeurs 📨</h2><div data-live="rumors"></div></div>
        ${S.spectator ? '<div class="card"><div data-live="picked"></div></div>' : `
        <div class="card keep"><h2 style="margin-top:0">${g.myPick ? `Ton allié : ${name(g.myPick)} ✅` : 'En secret, tu t\'allies avec…'}</h2>
          <p class="muted" style="margin-top:0">Si c'est réciproque, l'alliance est scellée : <b>+${g.chestAdd}</b> dans votre coffre commun.</p>
          ${UI.playerGrid(others, g.myPick, 'ally')}</div>
        ${dmCard(S, g)}
        <div class="card"><div data-live="picked"></div></div>`}
        ${UI.forceLink('Révéler les alliances')}`;
    },

    pickReveal(S, g) {
      const r = g.roundResult;
      return `${header(g, r.pairs.length ? 'Alliances scellées !' : 'Personne ne s\'est trouvé… 💔', false)}
        <div class="board center">
          ${r.pairs.length ? `<div class="al-pairs">${r.pairs.map(([a, b], i) => `<div class="al-pair reveal" style="animation-delay:${0.3 + i * 0.4}s">${av(P(a), 'lg')}<span class="al-ring">${B.rings}</span>${av(P(b), 'lg')}<small>+${r.added} dans le coffre</small></div>`).join('')}</div>` : ''}
          ${r.lonely.length ? `<div class="al-lonely">${r.lonely.map(([a, b]) => `<span>${av(P(a), 'sm')} ${name(a)} → ${name(b)} 💔</span>`).join('')}</div>` : ''}
        </div>
        <div class="board"><h2 class="board-t">Les coffres sur la table</h2>${chestsBoard(S, g)}</div>
        <div class="card gains-card">${UI.gainsBlock(r.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(r.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Le moment de vérité 🗡️' : 'Manche suivante')}`;
    },

    final(S, g) {
      if (S.spectator || !g.myChests.length) {
        return `${header(g, 'Fidèle… ou poignard ? 🗡️')}
          <div class="board"><h2 class="board-t">Les coffres en jeu</h2><div data-live="chests"></div>
            <h2 class="board-t" style="margin-top:12px">Rumeurs 📨</h2><div data-live="rumors"></div></div>
          ${S.spectator ? '' : '<div class="card center keep">Tu n\'as aucun coffre… installe-toi et regarde le carnage 🍿</div>'}
          ${!S.spectator && !g.oral ? dmCard(S, g) : ''}
          <div class="card"><div data-live="deciding"></div></div>
          ${UI.forceLink('Ouvrir les coffres')}`;
      }
      const all = g.myChests.every((c) => g.myDecisions[c.with]);
      return `${header(g, 'Fidèle… ou poignard ? 🗡️')}
        <div class="card keep"><h2 style="margin-top:0">Tes coffres</h2>
          <p class="muted" style="margin-top:0">Fidèles tous les deux : vous partagez. Un seul poignard : il prend tout. Deux poignards : le coffre est perdu.</p>
          ${g.myChests.map((c) => {
            const d = g.myDecisions[c.with];
            return `<div class="al-decide">${av(P(c.with))}<span class="al-dn"><b>${name(c.with)}</b><br><span class="al-amount">${B.chest()} ${c.amount} pts</span></span>
              <span class="al-btns"><button class="${d === 'loyal' ? 'sel' : 'ghost'}" data-decide="${c.with}" data-c="loyal" ${g.myLocked ? 'disabled' : ''}>🛡️ Fidèle</button>
              <button class="${d === 'stab' ? 'sel bad' : 'ghost'}" data-decide="${c.with}" data-c="stab" ${g.myLocked ? 'disabled' : ''}>🗡️ Poignard</button></span></div>`;
          }).join('')}
          <div style="height:10px"></div>
          ${g.myLocked ? '<button class="ghost full" data-unlock>✏️ Changer d\'avis</button>' : `<button class="full alt" data-lock ${all ? '' : 'disabled'}>C'est décidé ✅</button>`}
        </div>
        ${dmCard(S, g)}
        <div class="card"><div data-live="deciding"></div></div>
        ${UI.forceLink('Ouvrir les coffres')}`;
    },

    finalReveal(S, g) {
      const r = g.finalResult;
      const face = (d) => `<div class="face front ${d === 'loyal' ? 'ok' : 'ko'}">${d === 'loyal' ? B.shield : B.betray}<b>${d === 'loyal' ? 'Fidèle' : 'Poignard'}</b></div>`;
      const verdict = (o) => o.outcome === 'share' ? `<b class="bt-ok">Fidèles ! ${Math.round(o.amount / 2)} chacun 🤝</b>`
        : o.outcome === 'burn' ? '<b class="bt-burn">Double poignard : le coffre est perdu 🔥</b>'
        : `<b class="bt-ko">${name(o.da === 'stab' ? o.a : o.b)} poignarde ${name(o.da === 'stab' ? o.b : o.a)} ! +${o.amount} 🗡️</b>`;
      return `${header(g, 'On ouvre les coffres…', false)}
        <div class="board center">${r.outcomes.length ? `<div class="bt-duos">${r.outcomes.map((o, i) => `
          <div class="bt-duo res ${o.a === S.you || o.b === S.you ? 'mine' : ''}">
            <div class="bt-seat">${av(P(o.a))}<span>${name(o.a)}</span></div>
            <div class="bt-cards">
              <div class="pcard flip" style="--d:${0.6 + i * 1}s"><div class="in"><div class="face back"><span>★</span></div>${face(o.da)}</div></div>
              <span class="al-c">${B.chest(true)}<b>${o.amount}</b></span>
              <div class="pcard flip" style="--d:${0.9 + i * 1}s"><div class="in"><div class="face back"><span>★</span></div>${face(o.db)}</div></div>
            </div>
            <div class="bt-seat">${av(P(o.b))}<span>${name(o.b)}</span></div>
            <div class="bt-verdict" style="--d:${1.5 + i * 1}s">${verdict(o)}</div>
          </div>`).join('')}</div>` : '<p>Aucun coffre sur la table… personne ne s\'est fait confiance !</p>'}</div>
        <div class="card gains-card">${UI.gainsBlock(r.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(r.gains))}</div>
        ${UI.hostButton('Voir le podium 🏆')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  UI.registerGame('alliances', {
    rules: () => `
      <ol class="rules">
        <li>Pendant <b>4 manches</b>, chacun choisit en secret <b>un allié</b>. Si c'est réciproque, l'alliance est scellée et votre <b>coffre commun</b> se remplit (100, 150, 200, puis 250).</li>
        <li>Envoyez-vous des <b>messages privés</b> pour vous mettre d'accord. La télé affiche les rumeurs : <b>qui écrit à qui</b>, sans le contenu.</li>
        <li>Au <b>moment de vérité</b>, pour chaque coffre : <b>🛡️ Fidèle</b> ou <b>🗡️ Poignard</b>.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">🛡️ + 🛡️ : on partage · 🗡️ contre 🛡️ : le traître prend tout · 🗡️ + 🗡️ : le coffre est perdu<br>
      🤝 Alliance scellée : <b>+25</b> · 💌 Être choisi(e) sans réciprocité : <b>+20</b></div>`,

    key: (S, g) => [g.phase, g.round, g.myPick, g.myDmCount, g.myLocked, JSON.stringify(g.myDecisions || {}), dmTo].join('|'),

    screen: (S, g) => screens[g.phase](S, g),

    live: {
      chests: (S, g) => chestsBoard(S, g),
      rumors: (S, g) => rumors(g),
      inbox: (S, g) => inbox(S, g),
      picked: (S, g) => `<div class="muted" style="margin-bottom:8px">${g.picked.length} / ${g.needed} ont choisi</div>
        <div class="players">${g.participants.filter((id) => P(id)?.connected).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} ${g.picked.includes(id) ? '✅' : '<span class="wait">🤔</span>'}</span></div>`).join('')}</div>`,
      deciding: (S, g) => `<div class="muted" style="margin-bottom:8px">${g.lockedIds.length} / ${g.deciding.length} ont décidé</div>
        <div class="players">${g.deciding.map((id) => `<div class="player">${av(P(id))}<span>${name(id)} ${g.lockedIds.includes(id) ? '✅' : '<span class="wait">🤔</span>'}</span></div>`).join('')}</div>`,
    },

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      on('[data-ally]', (e) => UI.send('pick', e.currentTarget.dataset.ally));
      on('[data-to]', (e) => { dmTo = e.currentTarget.dataset.to; UI.refresh(); });
      const input = root.querySelector('#dm');
      const send = () => { if (input.value.trim() && dmTo) { UI.send('dm', { to: dmTo, text: input.value }); draft = ''; input.value = ''; } };
      if (input) {
        input.addEventListener('input', () => { draft = input.value; });
        input.addEventListener('keydown', (e) => e.key === 'Enter' && send());
        root.querySelector('[data-dm]').addEventListener('click', send);
      }
      on('[data-decide]', (e) => UI.send('decide', { other: e.currentTarget.dataset.decide, choice: e.currentTarget.dataset.c }));
      on('[data-lock]', () => UI.send('lock'));
      on('[data-unlock]', () => UI.send('unlock'));
    },
  });
})();
