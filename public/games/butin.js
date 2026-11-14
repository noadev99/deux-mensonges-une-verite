// 💰 Le Butin — affichage (ambiance table de jeu : tapis, coffre, cartes)
(() => {
  const { esc, P, av, name } = UI;
  const B = ICONS.board;
  let draft = '';

  // Une carte à jouer : dos (motif) puis face (Partager / Trahir). flip = se retourne à l'écran.
  const card = (choice, { flip = false, delay = 0, size = '' } = {}) => `
    <div class="pcard ${size} ${flip ? 'flip' : ''}" style="--d:${delay}s"><div class="in">
      <div class="face back"><span>★</span></div>
      <div class="face front ${choice || ''}">${choice === 'share' ? B.share : choice === 'betray' ? B.betray : ''}<b>${choice === 'share' ? 'Partager' : choice === 'betray' ? 'Trahir' : ''}</b></div>
    </div></div>`;
  const backCard = (size = 'sm') => `<div class="pcard ${size}"><div class="in"><div class="face back"><span>★</span></div></div></div>`;
  const emptySlot = (size = 'sm') => `<div class="pcard ${size} slot"><span class="wait">🤔</span></div>`;

  const potBlock = (g, label = 'Le butin') => `
    <div class="bt-pot">${B.chest(g.phase === 'reveal')}<div><div class="bt-potlabel">${label}</div><div class="bt-potval">${g.pot} <small>pts</small></div></div></div>`;

  // la table : chaque duo face à face, avec sa carte posée (face cachée) ou pas encore
  const table = (S, g) => `<div class="bt-duos">${g.duos.map((d, i) => `
      <div class="bt-duo ${i === g.myDuo ? 'mine' : ''}">
        <div class="bt-seat">${av(P(d.a))}<span>${name(d.a)}</span></div>
        <div class="bt-cards">${d.chosen[0] ? backCard() : emptySlot()}${d.chosen[1] ? backCard() : emptySlot()}</div>
        <div class="bt-seat">${av(P(d.b))}<span>${name(d.b)}</span></div>
      </div>`).join('')}
      ${g.rest ? `<div class="bt-rest">😴 ${name(g.rest)} se repose cette manche</div>` : ''}</div>`;

  const chat = (S, g) => g.msgs.length
    ? g.msgs.map((m) => `<div class="bt-msg ${m.from === S.you ? 'me' : ''}">${av(P(m.from), 'sm')}<span>${esc(m.text)}</span></div>`).join('')
    : '<div class="muted center" style="font-size:.9rem">Pas encore de message… promets-lui monts et merveilles 😇</div>';

  const header = (S, g, title) => `
    <div class="progress"><div style="width:${((g.round - 1) / g.totalRounds) * 100}%"></div></div>
    <div class="phase"><div class="step">Manche ${g.round} sur ${g.totalRounds} ${UI.timer(g.remaining)}</div><div class="t">${title}</div></div>`;

  const screens = {
    deal(S, g) {
      const title = g.final ? 'Le coup final 💥' : 'Partager ou trahir ?';
      if (S.spectator || g.myDuo < 0) {
        return `${header(S, g, title)}
          <div class="board center">${potBlock(g, g.final ? 'Coup final' : 'Butin de la manche')}<div data-live="table"></div></div>
          ${g.rest === S.you ? '<div class="card center keep">😴 Tu te reposes cette manche. Observe les traîtres…</div>' : ''}
          ${UI.forceLink('Révéler maintenant')}`;
      }
      const partner = g.partner;
      return `${header(S, g, title)}
        <div class="board center keep">
          ${potBlock(g, g.final ? 'Coup final' : 'Butin de la manche')}
          <div class="bt-face">${av(P(S.you), 'lg')}<span class="bt-vs">VS</span>${av(P(partner), 'lg')}</div>
          <div class="bt-names"><b>Toi</b><b>${name(partner)}</b></div>
          <p class="bt-rule">🤝 + 🤝 : <b>${g.pot / 2}</b> chacun · 🗡️ seul : <b>${g.pot}</b> pour le traître · 🗡️ + 🗡️ : <b>0</b></p>
        </div>
        ${g.oral ? `<div class="card center keep"><b>🗣️ Négociez à voix haute avec ${name(partner)} !</b><div class="muted">Promesses, menaces, regards appuyés… tout est permis.</div></div>`
          : `<div class="card keep"><h2 style="margin-top:0">Négociation 💬</h2><div class="bt-chat" data-live="chat"></div>
            ${g.myMsgCount < g.maxMsg ? `<div class="row" style="margin-top:8px"><input id="msg" maxlength="90" placeholder="Je te jure que je partage…" autocomplete="off" value="${esc(draft)}" /><button class="alt" data-msg style="flex:0 0 auto">Envoyer</button></div>
            <div class="muted" style="font-size:.8rem;margin-top:4px">${g.maxMsg - g.myMsgCount} message${g.maxMsg - g.myMsgCount > 1 ? 's' : ''} restant${g.maxMsg - g.myMsgCount > 1 ? 's' : ''}</div>` : '<div class="muted" style="font-size:.85rem;margin-top:6px">Plus de messages pour cette manche.</div>'}</div>`}
        <div class="card center keep">
          ${g.myChoice
            ? `<h2 style="margin-top:0">Ta carte est posée</h2><div class="bt-hand">${card(g.myChoice, { size: 'lg' }).replace('class="pcard lg ', 'class="pcard lg up ')}</div><div class="muted">Posée face cachée sur la table… Réponse à la révélation 😬</div>`
            : `<h2 style="margin-top:0">Joue ta carte</h2><div class="bt-hand">
                <button class="cardbtn" data-choose="share">${card('share', { size: 'lg' }).replace('class="pcard lg ', 'class="pcard lg up ')}</button>
                <button class="cardbtn" data-choose="betray">${card('betray', { size: 'lg' }).replace('class="pcard lg ', 'class="pcard lg up ')}</button></div>
               <div class="muted" style="font-size:.85rem">Ton choix est définitif.</div>`}
        </div>
        <div class="board"><div data-live="table"></div></div>
        ${UI.forceLink('Révéler maintenant')}`;
    },

    reveal(S, g) {
      const r = g.result;
      const verdict = (d) => d.outcome === 'share' ? `<b class="bt-ok">Partage ! +${g.pot / 2} chacun 🤝</b>`
        : d.outcome === 'burn' ? '<b class="bt-burn">Double trahison : le butin part en fumée 🔥</b>'
        : `<b class="bt-ko">${name(d.ca === 'betray' ? d.a : d.b)} trahit ${name(d.ca === 'betray' ? d.b : d.a)} ! +${g.pot} 🗡️</b>`;
      return `${header(S, g, g.final ? 'Le coup final… 💥' : 'Révélation !')}
        <div class="board center">${potBlock(g, 'Le butin')}
          <div class="bt-duos">${r.duos.map((d, i) => `
            <div class="bt-duo res ${d.a === S.you || d.b === S.you ? 'mine' : ''}">
              <div class="bt-seat">${av(P(d.a))}<span>${name(d.a)}</span></div>
              <div class="bt-cards">${card(d.ca, { flip: true, delay: 0.6 + i * 0.9 })}${card(d.cb, { flip: true, delay: 0.9 + i * 0.9 })}</div>
              <div class="bt-seat">${av(P(d.b))}<span>${name(d.b)}</span></div>
              <div class="bt-verdict" style="--d:${1.5 + i * 0.9}s">${verdict(d)}</div>
            </div>`).join('')}</div>
        </div>
        <div class="card gains-card">${UI.gainsBlock(r.gains)}</div>
        <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(r.gains))}</div>
        ${UI.hostButton(g.round >= g.totalRounds ? 'Voir le podium 🏆' : 'Manche suivante')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  UI.registerGame('butin', {
    rules: () => `
      <ol class="rules">
        <li>Chaque manche, vous êtes mis <b>en duo</b> devant un butin (100, 150, 200, 300… puis <b>500</b> au coup final).</li>
        <li>On <b>négocie</b> : par messages, ou à voix haute en mode oral.</li>
        <li>Puis chacun pose sa carte en secret : <b>🤝 Partager</b> ou <b>🗡️ Trahir</b>.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">🤝 + 🤝 : moitié chacun · 🗡️ contre 🤝 : le traître prend <b>tout</b> · 🗡️ + 🗡️ : <b>personne</b> n'a rien.<br>Nombre impair : un joueur se repose à chaque manche.</div>`,

    key: (S, g) => [g.phase, g.round, g.myChoice, g.myMsgCount].join('|'),

    screen: (S, g) => screens[g.phase](S, g),

    live: {
      table: (S, g) => table(S, g),
      chat: (S, g) => chat(S, g),
    },

    bind: (S, g, root) => {
      root.querySelectorAll('[data-choose]').forEach((b) => b.addEventListener('click', () => UI.send('choose', b.dataset.choose)));
      const input = root.querySelector('#msg');
      const send = () => { if (input.value.trim()) { UI.send('msg', input.value); draft = ''; input.value = ''; } };
      if (input) {
        input.addEventListener('input', () => { draft = input.value; });
        input.addEventListener('keydown', (e) => e.key === 'Enter' && send());
        root.querySelector('[data-msg]').addEventListener('click', send);
      }
    },
  });
})();
