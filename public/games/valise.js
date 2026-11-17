// 🧳 La Valise — affichage
(() => {
  const { esc, P, av, name } = UI;
  let draft = { key: '', text: '' };

  const hearts = (g, id) => (g.out.includes(id) ? '💀' : '❤️'.repeat(g.lives[id]) + '🤍'.repeat(Math.max(0, 2 - g.lives[id])));
  const table = (g) => `<div class="card">${g.order.filter(P).map((id) => `<div class="score ${g.cur?.player === id ? 'intr-now' : ''} ${g.out.includes(id) ? 'va-out' : ''}">${av(P(id))}<span class="n">${name(id)}${g.cur?.player === id ? ' 🎤' : ''}${g.cur?.judge === id ? ' 🧐' : ''}</span><span>${hearts(g, id)}</span></div>`).join('')}</div>`;
  const countCard = (g, big) => `<div class="card center keep"><div class="muted">${esc(g.start)}</div><div class="va-count ${big ? 'tv-big' : ''}">🧳 ${g.count} objet${g.count > 1 ? 's' : ''}</div></div>`;
  const listHtml = (list, extra) => `<ol class="va-list">${list.map((x) => `<li>${esc(x)}</li>`).join('')}${extra ? `<li class="new">${esc(extra)} <small>(nouveau)</small></li>` : ''}</ol>`;

  const screens = {
    intro: (S, g) => `${UI.header(1, 1, 'La Valise', 'Mémoire d\'éléphant ? 🐘')}<div class="card">${GAME.rules()}</div>${table(g)}${UI.hostButton('Ouvrir la valise')}`,

    turn(S, g) {
      const c = g.cur, me = S.you;
      const k = `${g.count}|${c.player}`;
      if (draft.key !== k) draft = { key: k, text: '' };
      let body;
      if (me === c.player) {
        body = `<div class="card keep center"><h2 style="margin-top:0">🎤 À toi !</h2>
          <p>Dis à voix haute : <b>« ${esc(g.start)} »</b> puis <b>toute la liste dans l'ordre</b> (${g.count} objet${g.count > 1 ? 's' : ''}), et ajoute un objet.</p>
          ${g.count ? '' : '<p class="muted">La valise est vide : tu commences juste avec ton objet !</p>'}
          ${c.item ? `<p>Ton nouvel objet : <b>${esc(c.item)}</b> ✅</p><p class="muted" style="margin-bottom:0">${c.judge ? `${name(c.judge)} vérifie…` : ''}</p>`
            : `<div class="row bz-estrow"><input id="va-in" maxlength="40" placeholder="L'objet que tu ajoutes" value="${esc(draft.text)}" autocomplete="off"><button data-item>Ajouter</button></div>`}</div>`;
      } else if (me === c.judge) {
        body = `<div class="card keep"><h2 style="margin-top:0">🧐 Tu es l'arbitre</h2>
          <p style="margin-top:0">${name(c.player)} récite la liste. Vérifie bien l'ordre ! <b>Ne la montre à personne</b> 🤫</p>
          ${g.list.length ? listHtml(g.list, c.item) : `<p class="muted">Liste vide : il suffit de dire un premier objet.</p>${c.item ? listHtml([], c.item) : ''}`}
          ${c.item ? '' : '<p class="muted center">Le joueur doit aussi écrire son nouvel objet sur son téléphone.</p>'}
          <div class="row"><button class="bz-ok" data-judge="1" ${c.item ? '' : 'disabled'}>✅ Tout bon</button><button class="bz-ko" data-judge="0">❌ Raté</button></div></div>`;
      } else {
        body = `<div class="card center keep">${av(P(c.player), 'lg')}<h2>${name(c.player)} récite la liste…</h2>
          <p class="muted" style="margin:0">Écoute bien : ce sera bientôt ton tour ! ${c.judge ? `Arbitre : ${name(c.judge)} 🧐` : ''}</p></div>
          ${UI.isHost() && me !== c.player ? `<div class="card center"><p class="muted" style="margin-top:0">Hôte : l'arbitre ne répond pas ? Tu peux trancher.</p><div class="row"><button class="bz-ok" data-judge="1" ${c.item ? '' : 'disabled'}>✅ Bon</button><button class="bz-ko" data-judge="0">❌ Raté</button></div></div>` : ''}`;
      }
      return `${UI.header(1, 1, `${g.count} objet${g.count > 1 ? 's' : ''} dans la valise`, me === c.player ? 'À toi de réciter ! 🎤' : `Au tour de ${name(c.player)}`)}
        ${countCard(g)}${body}${table(g)}
        ${UI.forceLink('Passer ce tour')}
        ${UI.isHost() ? '<p class="center"><a class="link" data-host-action="finish">Fermer la valise (fin de partie)</a></p>' : ''}`;
    },

    missed(S, g) {
      const m = g.missed;
      return `${UI.header(1, 1, 'Raté !', `Erreur de ${name(m.id)} 😬`)}
        <div class="card center reveal">${av(P(m.id), 'lg')}<h2>${m.lives > 0 ? `Encore ${m.lives} cœur ❤️` : 'Éliminé·e 💀'}</h2>
          <p class="muted" style="margin:0">La liste ne change pas : le joueur suivant reprend tout depuis le début.</p></div>
        ${table(g)}
        ${UI.hostButton('Joueur suivant')}`;
    },

    end(S, g) {
      return `<div class="card"><h2>🧳 La valise complète (${g.list.length})</h2>${listHtml(g.list)}</div>${UI.endScreen(g)}`;
    },
  };

  const GAME = {
    rules: () => `<ol class="rules">
        <li>Le premier dit « Dans ma valise, je mets… » et un objet.</li>
        <li>Le suivant répète <b>toute la liste dans l'ordre</b>, à voix haute, et ajoute un objet (qu'il écrit sur son téléphone).</li>
        <li>Le joueur d'après est l'<b>arbitre</b> : lui seul voit la liste et dit ✅ ou ❌.</li>
        <li>Une erreur = un cœur en moins. 2 cœurs, puis éliminé. Le dernier en jeu gagne !</li>
      </ol>
      <div class="muted" style="font-size:.92rem">Liste récitée sans faute : <b>5 points par objet</b> · dernier en jeu : <b>+100</b></div>`,
    tv: (S, g) => (g.phase === 'turn' ? `${UI.header(1, 1, 'La Valise', `${name(g.cur.player)} récite… 🎤`)}${countCard(g, true)}${table(g)}` : null),
    key: (S, g) => [g.phase, g.count, g.cur?.player, g.cur?.item, JSON.stringify(g.lives)].join('|'),
    screen: (S, g) => screens[g.phase](S, g),
    bind: (S, g, root) => {
      const inp = root.querySelector('#va-in');
      if (inp) {
        inp.addEventListener('input', () => { draft.text = inp.value; });
        const go = () => { if (inp.value.trim()) UI.send('item', inp.value); };
        root.querySelector('[data-item]')?.addEventListener('click', go);
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      }
      root.querySelectorAll('[data-judge]').forEach((b) => b.addEventListener('click', () => { navigator.vibrate?.(30); UI.send('judge', b.dataset.judge === '1'); }));
    },
  };
  UI.registerGame('valise', GAME);
})();
