// ⛩️ Trombi manga — affichage
(() => {
  const { esc, P, av, name } = UI;
  let tab = null;          // adversaire dont on regarde le plateau
  let guessing = false;    // mode « je devine » : toucher une carte = proposer ce personnage
  let shown = false;       // ma carte secrète retournée
  let draft = '';
  // cartes barrées sur MON téléphone, pour chaque adversaire (gardées si on recharge)
  const ELIM = 'trombi-elim';
  let elim = { key: '', by: {} };
  try { elim = JSON.parse(localStorage.getItem(ELIM)) || elim; } catch (e) { /* rien */ }
  const saveElim = () => { try { localStorage.setItem(ELIM, JSON.stringify(elim)); } catch (e) { /* rien */ } };
  const boardKey = (g) => g.board.map((c) => c.name).join(',');

  // une couleur par série
  const SERIES = {};
  const PALETTE = ['#ffd43b', '#ff8fb5', '#69db7c', '#4dabf7', '#da77f2', '#ffa94d', '#38d9a9', '#748ffc', '#f783ac', '#a9e34b', '#ff6b6b', '#c8a165'];
  const colorOf = (series) => SERIES[series] || (SERIES[series] = PALETTE[Object.keys(SERIES).length % PALETTE.length]);

  const card = (g, c, i, { elimd = false, owner = null, mine = false, pick = false, big = false } = {}) => {
    const tag = pick ? 'button' : 'div';
    return `<${tag} class="tb-card ${elimd ? 'out' : ''} ${owner ? 'found' : ''} ${mine ? 'mine' : ''} ${big ? 'big' : ''}" data-card="${i}" style="--c:${colorOf(c.series)}">
      <span class="tb-emo">${c.emoji}</span><b>${esc(c.name)}</b><small>${esc(c.series)}</small>
      ${owner ? `<span class="tb-owner">${av(P(owner), 'sm')}</span>` : ''}</${tag}>`;
  };

  // le plateau : en mode normal, toucher une carte la barre (pour l'adversaire sélectionné)
  const boardHtml = (S, g, { tv = false } = {}) => {
    const ownerOf = Object.fromEntries(Object.entries(g.revealed).map(([pid, i]) => [i, pid]));
    const out = new Set(!tv && tab ? elim.by[tab] || [] : []);
    return `<div class="tb-board ${guessing ? 'guessing' : ''}">${g.board.map((c, i) => card(g, c, i, {
      elimd: out.has(i) && !ownerOf[i], owner: ownerOf[i], mine: !tv && i === g.mySecret && shown, pick: !tv,
    })).join('')}</div>`;
  };

  const mySecretCard = (g) => {
    if (g.mySecret == null) return '';
    const c = g.board[g.mySecret];
    const foundBy = g.found[UI.state.you];
    return `<button class="tb-secret keep ${shown ? 'shown' : ''}" data-flip style="--c:${colorOf(c.series)}">
      ${shown ? `<span class="tb-emo">${c.emoji}</span><span><b>${esc(c.name)}</b><br><small>${esc(c.series)} · ton personnage${foundBy ? ` · trouvé par ${name(foundBy)} 😵` : ''}</small></span>`
        : '<span class="tb-emo tb-back">⛩️</span><span><b>Ton personnage secret</b><br><small>Touche pour le regarder (en cachette !)</small></span>'}
    </button>`;
  };

  const logHtml = (g) => g.log.length ? g.log.slice().reverse().slice(0, 8).map((l) => l.guess != null
    ? `<div class="tb-log">${av(P(l.asker), 'sm')} <span>${name(l.asker)} devine que ${name(l.target)} est <b>${esc(g.board[l.guess].name)}</b></span> ${l.ok ? '✅' : '❌'}</div>`
    : `<div class="tb-log">${av(P(l.asker), 'sm')} <span>${name(l.asker)} → ${name(l.target)} : ${l.q ? `« ${esc(l.q)} »` : '🎤 question à l\'oral'}</span> <b class="tb-a ${l.a}">${l.a === 'oui' ? 'Oui' : l.a === 'non' ? 'Non' : 'Bof'}</b></div>`).join('')
    : '<div class="muted center">Pas encore de question…</div>';

  const tabs = (S, g) => {
    if (!g.myTargets.length) return '';
    if (!g.myTargets.includes(tab)) tab = g.current.asker === S.you && g.current.target ? g.current.target : g.myTargets[0];
    if (g.myTargets.length === 1) return `<p class="tb-tabinfo">Plateau de <b>${name(tab)}</b> : touche une carte pour la barrer</p>`;
    return `<div class="tb-tabs">${g.myTargets.map((id) => `<button class="al-tochip ${id === tab ? 'sel' : ''}" data-tab="${id}">${av(P(id), 'sm')}${name(id)}</button>`).join('')}</div>
      <p class="tb-tabinfo">Plateau de <b>${name(tab)}</b> : touche une carte pour la barrer</p>`;
  };

  // l'action du moment (en haut de l'écran)
  const actionCard = (S, g) => {
    const c = g.current, me = S.you;
    if (g.phase === 'ask') {
      if (c.asker !== me) return `<div class="card center tb-turn">${av(P(c.asker))} <b>${name(c.asker)}</b> prépare sa question… <span class="wait">🤔</span></div>`;
      const target = g.myTargets.includes(tab) ? tab : g.myTargets[0];
      return `<div class="card keep tb-turn"><h2 style="margin-top:0">À toi ! Pose une question à ${g.myTargets.length > 1 ? 'quelqu\'un' : name(target)}</h2>
        ${g.myTargets.length > 1 ? `<div class="tb-tabs">${g.myTargets.map((id) => `<button class="al-tochip ${id === target ? 'sel' : ''}" data-tab="${id}">${av(P(id), 'sm')}${name(id)}</button>`).join('')}</div>` : ''}
        ${g.oral
          ? `<p style="margin:8px 0">Pose ta question <b>à voix haute</b> à ${name(target)} (réponse oui ou non), puis :</p><button class="full alt" data-ask="${target}">J'ai posé ma question ✅</button>`
          : `<div class="row" style="margin-top:8px"><input id="q" maxlength="140" placeholder="Il porte un chapeau ?" autocomplete="off" value="${esc(draft)}" /><button class="alt" data-ask="${target}" style="flex:0 0 auto">Demander</button></div>`}
        <p class="center" style="margin:10px 0 0"><a class="link" data-guessmode>🔎 Je devine directement</a></p></div>`;
    }
    if (g.phase === 'answer') {
      const q = c.q ? `« ${esc(c.q)} »` : '🎤 (question posée à l\'oral)';
      if (c.target === me) {
        return `<div class="card keep tb-turn center"><h2 style="margin-top:0">${name(c.asker)} te demande :</h2><p class="tb-q">${q}</p>
          <div class="row"><button class="tb-yes" data-answer="oui">👍 Oui</button><button class="tb-no" data-answer="non">👎 Non</button></div>
          <p style="margin:8px 0 0"><a class="link" data-answer="bof">Je ne sais pas trop</a></p></div>`;
      }
      return `<div class="card center tb-turn">${av(P(c.asker), 'sm')} <b>${name(c.asker)}</b> → ${av(P(c.target), 'sm')} <b>${name(c.target)}</b><p class="tb-q">${q}</p><span class="wait">🤔</span> ${name(c.target)} répond…</div>`;
    }
    if (g.phase === 'decide') {
      const ans = `<b class="tb-a ${c.a}">${c.a === 'oui' ? 'OUI' : c.a === 'non' ? 'NON' : 'Bof…'}</b>`;
      if (c.asker === me) {
        return `<div class="card keep tb-turn center"><p class="tb-q" style="margin-top:0">${c.q ? `« ${esc(c.q)} »` : 'Ta question'} → ${ans}</p>
          <p class="muted" style="margin:0 0 10px">Barre les personnages éliminés sur le plateau de ${name(c.target)}, puis :</p>
          <div class="row"><button class="ghost" data-pass>Passer mon tour</button><button class="alt" data-guessmode>🔎 Deviner</button></div></div>`;
      }
      return `<div class="card center tb-turn">${name(c.target)} a répondu ${ans} à ${name(c.asker)}<p class="tb-q">${c.q ? `« ${esc(c.q)} »` : '🎤'}</p></div>`;
    }
    if (g.phase === 'guessed') {
      const r = c.guessResult;
      return `<div class="card center tb-turn reveal ${r.ok ? 'ok' : 'ko'}">
        ${r.ok ? `<h2 style="margin-top:0">✅ ${name(c.asker)} a trouvé !</h2><div class="tb-hero">${card(g, g.board[r.card], r.card, { big: true })}</div><p style="margin-bottom:0">${name(r.target)} était <b>${esc(g.board[r.card].name)}</b> · +${r.gains[c.asker]?.total || 0}</p>`
          : `<h2 style="margin-top:0">❌ Raté !</h2><p style="margin-bottom:0">${name(r.target)} n'est pas <b>${esc(g.board[r.card].name)}</b></p>`}
        ${c.asker === me || UI.isHost() ? '<div style="height:10px"></div><button class="full alt" data-next>Joueur suivant ➜</button>' : ''}</div>`;
    }
    return '';
  };

  const screens = {
    play(S, g) {
      const me = S.you;
      const c = g.current;
      const myTurn = c.asker === me;
      const guessFor = myTurn ? (g.phase === 'decide' ? c.target : (g.myTargets.includes(tab) ? tab : g.myTargets[0])) : null;
      if (guessing && guessFor) tab = guessFor;
      if (S.spectator) {
        return `<div class="phase"><div class="step">Tour ${g.round}</div><div class="t">Trombi manga ⛩️</div></div>
          ${actionCard(S, g)}
          <div class="card"><div class="tb-board tv">${g.board.map((cd, i) => card(g, cd, i, { owner: Object.entries(g.revealed).find(([, k]) => k === i)?.[0] })).join('')}</div></div>
          <div class="card"><h2>Questions</h2><div data-live="log"></div></div>`;
      }
      return `<div class="phase"><div class="step">Tour ${g.round} · ${g.alive.length} perso${g.alive.length > 1 ? 's' : ''} encore cachés</div><div class="t">${myTurn ? 'À toi de jouer ! 🔎' : 'Trombi manga ⛩️'}</div></div>
        ${mySecretCard(g)}
        ${guessing && myTurn ? `<div class="card keep tb-turn center guess"><h2 style="margin-top:0">🔎 Qui est ${name(guessFor)} ?</h2><p class="muted" style="margin:0">Touche son personnage sur le plateau.</p><p style="margin:8px 0 0"><a class="link" data-cancelguess>Annuler</a></p></div>` : actionCard(S, g)}
        <div class="card keep">${guessing && myTurn ? '' : tabs(S, g)}${boardHtml(S, g)}</div>
        <div class="card"><h2>Questions</h2><div data-live="log"></div></div>
        ${UI.isHost() && g.phase !== 'guessed' && !myTurn ? UI.forceLink('Passer ce tour (joueur absent)') : ''}`;
    },
  };

  UI.registerGame('trombi', {
    rules: () => `
      <ol class="rules">
        <li><b>24 personnages d'animés</b> au tableau. Chacun en reçoit un <b>en secret</b>.</li>
        <li>À ton tour, pose une <b>question fermée</b> à un joueur (« C'est un pirate ? », « Il a les cheveux blonds ? »). Il répond <b>oui</b> ou <b>non</b>.</li>
        <li><b>Barre</b> les personnages éliminés sur ton téléphone, puis tente de <b>deviner</b>… ou passe ton tour.</li>
        <li>À 2, c'est un duel. À plusieurs, chacun cherche les persos des autres.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">🔎 Trouver un perso : <b>+150</b>, moins 15 par question posée à ce joueur (minimum +50)<br>
      🥷 Jamais démasqué à la fin : <b>+100</b></div>`,

    key: (S, g) => [g.phase, g.current?.asker, g.current?.target, g.current?.a, g.alive.length, guessing, shown, S.spectator ? '' : tab].join('|'),

    onState: (S, g) => {
      if (elim.key !== boardKey(g)) { elim = { key: boardKey(g), by: {} }; saveElim(); shown = false; }
      if (g.phase !== 'ask' && g.phase !== 'decide') guessing = false;
      if (g.phase === 'answer' && g.current.target === S.you) navigator.vibrate?.(80);
    },

    screen: (S, g) => (g.phase === 'end' ? endScreen(S, g) : screens.play(S, g)),
    tv: (S, g) => (g.phase === 'end' ? null : screens.play(S, g)),

    live: { log: (S, g) => logHtml(g) },

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      on('[data-flip]', () => { shown = !shown; UI.refresh(); });
      on('[data-tab]', (e) => { tab = e.currentTarget.dataset.tab; UI.refresh(); });
      const q = root.querySelector('#q');
      if (q) { q.addEventListener('input', () => { draft = q.value; }); q.addEventListener('keydown', (e) => e.key === 'Enter' && root.querySelector('[data-ask]').click()); }
      on('[data-ask]', (e) => { UI.send('ask', { target: e.currentTarget.dataset.ask, q: q ? q.value : '' }); draft = ''; });
      on('[data-answer]', (e) => UI.send('answer', e.currentTarget.dataset.answer));
      on('[data-pass]', () => UI.send('pass'));
      on('[data-next]', () => UI.send('next'));
      on('[data-guessmode]', () => { guessing = true; UI.refresh(); });
      on('[data-cancelguess]', () => { guessing = false; UI.refresh(); });
      // plateau : barrer / débarrer, ou deviner
      root.querySelectorAll('.tb-board:not(.tv) [data-card]').forEach((el) => el.addEventListener('click', () => {
        const i = Number(el.dataset.card);
        if (el.classList.contains('found')) return;
        if (guessing) {
          const cd = g.board[i];
          if (confirm(`Tu penses que ${P(tab)?.name} est ${cd.name} ?`)) {
            UI.send('guess', { target: tab, card: i }); guessing = false;
            elim.by[tab] = [...new Set([...(elim.by[tab] || []), i])]; saveElim(); // si c'est raté, la carte est déjà barrée
          }
          return;
        }
        if (!tab) return;
        const list = new Set(elim.by[tab] || []);
        if (list.has(i)) list.delete(i); else list.add(i);
        elim.by[tab] = [...list];
        saveElim();
        el.classList.toggle('out', list.has(i));
      }));
    },
  });

  // fin : on révèle tous les personnages, puis le podium
  function endScreen(S, g) {
    return `<div class="card"><h2>Les personnages</h2><div class="tb-reveal">${g.participants.filter(P).map((id) => {
      const cd = g.board[g.secrets[id]];
      return `<div class="tb-revrow">${av(P(id))}<b>${name(id)}</b> était ${card(g, cd, g.secrets[id])}${g.found[id] ? `<small>trouvé par ${name(g.found[id])}</small>` : '<small>🥷 jamais trouvé</small>'}</div>`;
    }).join('')}</div></div>${UI.endScreen(g)}`;
  }
})();
