// 🎚️ Note secrète — affichage
(() => {
  const { esc, P, av, name } = UI;
  // dégradé de l'échelle : rouge (0) → jaune (5) → vert (10)
  const SCALE = ['#f0506e', '#f2665f', '#f57d52', '#f89547', '#fbad3f', '#ffc23d', '#d9cc45', '#b3d64f', '#8bdc63', '#5fd884', '#2fd3a7'];
  let draft = { key: '', text: '' };
  let animatedFor = '';   // révélation déjà jouée pour cette manche
  let revealTimer = null;
  let askDraft = '';      // question en cours d'écriture (Interrogatoire)
  const repDraft = {};    // réponses en cours d'écriture, par question
  let focusId = '';       // champ à re-sélectionner après un rafraîchissement
  document.addEventListener('focusin', (e) => { if (e.target.id) focusId = e.target.id; });
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('input, textarea')) focusId = ''; });

  // Idées de questions pour l'Interrogatoire
  const IDEES = [
    'Si tu étais une technique dans Naruto, ce serait laquelle ?', 'Si tu avais mangé un fruit du démon, lequel ?',
    'Si tu étais un Pokémon, lequel serais-tu ?', 'Quelle serait ta transformation dans Dragon Ball ?',
    'Quelle serait ta prime de pirate dans One Piece ?', 'Quel serait ton souffle dans Demon Slayer ?',
    'Quel serait ton Alter dans My Hero Academia ?', 'Si tu étais un Titan, lequel serais-tu ?',
    'Quel personnage d\'animé serait ton rival ?', 'Quelle arme porterais-tu dans un animé ?',
    'Quel serait ton familier ou ton animal de compagnie magique ?', 'Quel serait ton rôle dans l\'équipage de Luffy ?',
    'Dans quel village ninja vivrais-tu, et quel serait ton rang ?', 'Quel serait ton cri d\'attaque ?',
    'Quel serait le nom de ton attaque ultime ?', 'Quel serait ton Nen dans Hunter x Hunter ?',
    'Si tu étais un méchant d\'animé, quel serait ton plan ?', 'Combien de temps survivrais-tu face à Freezer ?',
    'Quel personnage d\'animé pourrait te battre ?', 'Quel personnage d\'animé serait ton sensei ?',
    'Si tu étais un perso de Ghibli, lequel ?', 'Quelle serait ta classe en Jujutsu Kaisen ?',
    'Quel serait ton rôle dans une guilde d\'aventuriers ?', 'Si tu te réincarnais dans un isekai, en quoi ?',
    'Quel serait ton entraînement quotidien ?', 'Que ferais-tu face à un dragon ?',
    'Si tu étais un animal, lequel ?', 'Si tu étais un plat, lequel ?', 'Si tu étais un super-héros, lequel ?',
    'Si tu étais une voiture, laquelle ?', 'Si tu étais une arme, laquelle ?', 'Si tu étais un métier, lequel ?',
    'Si tu étais une catastrophe naturelle, laquelle ?', 'Si tu étais un objet de la maison, lequel ?',
    'Si tu étais une chanson, laquelle ?', 'Si tu étais un personnage de film, lequel ?',
    'Que fais-tu si un voleur entre chez toi ?', 'Comment se passe ta journée type ?',
    'Quel serait ton surnom de combattant ?', 'Quelle serait ta tenue de combat ?',
  ];
  const idee = () => IDEES[Math.floor(Math.random() * IDEES.length)];

  const qaList = (g) => g.qa.length
    ? g.qa.map((x) => `<div class="nt-qa"><div class="nt-qq">${av(P(x.from), 'sm')} <span>${x.q ? esc(x.q) : '🎤 <i>question posée à l\'oral</i>'}</span></div>
        ${g.oral ? '' : `<div class="nt-qa-a">${x.a != null ? `↳ ${esc(x.a)}` : '<span class="wait">✍️</span> <span class="muted">en attente de la réponse…</span>'}</div>`}</div>`).join('')
    : '<div class="muted center">Pas encore de question…</div>';

  // Choisir une note, puis la valider (on peut changer jusqu'à la révélation)
  const guessCard = (g) => `
    <div class="card keep">
      <div class="nt-pickhead">${g.myLocked ? `Note validée : <b>${g.myGuess} / 10</b> ✅` : g.myGuess != null ? `Ton hypothèse : <b>${g.myGuess} / 10</b>` : 'Touche une note'}</div>
      ${g.myLocked ? scale('show', { mine: g.myGuess }) : scale('pick', { picked: g.myGuess })}
      <div style="height:${g.myLocked ? 22 : 12}px"></div>
      ${g.myLocked
        ? '<button class="ghost full" data-unlock>✏️ Changer ma note</button>'
        : `<button class="full alt" data-lock ${g.myGuess == null ? 'disabled' : ''}>Valider ma note ✅</button>`}
      <p class="center" data-live="count" style="margin-bottom:0"></p>
    </div>`;

  const promptCard = (c, extra = '', keep = false) => `
    <div class="card center nt-prompt ${keep ? 'keep' : ''}">
      <div class="nt-q">${esc(c.q)}</div>
      <div class="nt-ends"><span>0 · ${esc(c.low)}</span><span>${esc(c.high)} · 10</span></div>
      ${extra}
    </div>`;

  // échelle 0 → 10 ; mode : 'show' (note marquée), 'pick' (boutons), 'reveal' (avatars des devinettes)
  function scale(mode, { mine = null, picked = null, guesses = {} } = {}) {
    const cells = SCALE.map((col, i) => {
      if (mode === 'pick') return `<button class="nt-cell ${picked === i ? 'sel' : ''}" data-n="${i}" style="--c:${col}">${i}</button>`;
      const who = mode === 'reveal' ? Object.entries(guesses).filter(([, n]) => n === i).map(([id]) => av(P(id), 'sm')).join('') : '';
      return `<div class="nt-cell ${mine === i ? 'mine' : ''}" data-cell="${i}" style="--c:${col}">
        ${mode === 'reveal' ? `<div class="nt-who">${who}</div>` : ''}<span>${i}</span></div>`;
    }).join('');
    return `<div class="nt-scale ${mode}">${mode === 'reveal' ? '<div class="nt-fill"></div>' : ''}${cells}</div>`;
  }

  const screens = {
    write(S, g) {
      const t = g.myTask;
      if (!t) return '<div class="card">Tu ne participes pas à cette manche.</div>';
      if (draft.key !== t.q) draft = { key: t.q, text: '' };
      if (g.myStory) {
        return `
          <div class="phase"><div class="step">Écriture ${UI.timer(g.remaining)}</div><div class="t">Histoire envoyée 🤫</div></div>
          <div class="card"><p class="nt-story" style="margin-top:0">${esc(g.myStory)}</p><button class="ghost" data-edit>✏️ Modifier</button></div>
          <div class="card"><div data-live="writing"></div></div>
          ${UI.forceLink('Commencer sans les retardataires')}`;
      }
      return `
        <div class="phase"><div class="step">Écriture ${UI.timer(g.remaining)}</div><div class="t">Ta note secrète : ${t.number} / 10</div></div>
        ${promptCard(t, scale('show', { mine: t.number }), true)}
        <div class="card stack">
          <p class="muted" style="margin:0">Écris une histoire qui vaut <b>${t.number} sur 10</b> sur cette échelle. Elle peut être vraie ou inventée. Ne donne pas le chiffre : les autres doivent le deviner !</p>
          <textarea id="story" maxlength="320" placeholder="Il était une fois…">${esc(draft.text)}</textarea>
          <button class="full alt" data-story>Envoyer</button>
        </div>
        <div class="card"><div data-live="writing"></div></div>`;
    },

    guess(S, g) {
      if (g.mode === 'gril') return screens.gril(S, g);
      const c = g.current;
      const step = `Histoire ${g.round} sur ${g.totalRounds} ${UI.timer(g.remaining)}`;
      const storyCard = c.story
        ? `<div class="card"><div class="nt-by">${av(P(c.authorId))}<b>${name(c.authorId)}</b><span class="muted">raconte…</span></div><p class="nt-story">${esc(c.story)}</p></div>`
        : `<div class="card center nt-oral"><div>${av(P(c.authorId), 'lg')}</div><div class="nt-q" style="margin-top:10px">🎤 ${name(c.authorId)} raconte à voix haute</div><p class="muted" style="margin-bottom:0">Écoute bien, puis donne ta note.</p></div>`;
      if (c.isAuthor) {
        if (!c.story) {
          return `
            <div class="phase"><div class="step">${step}</div><div class="t">À toi de raconter ! 🎤</div></div>
            ${promptCard(c, scale('show', { mine: c.number }), true)}
            <div class="card keep center"><p style="margin:0">Raconte à voix haute une histoire, vraie ou inventée, qui vaut <b>${c.number} sur 10</b>.<br><span class="muted">Ne dis pas le chiffre !</span></p></div>
            <div class="card"><div data-live="guessing"></div></div>
            ${UI.forceLink('Révéler maintenant')}`;
        }
        return `
          <div class="phase"><div class="step">${step}</div><div class="t">Ils devinent ta note 😈</div></div>
          ${promptCard(c, scale('show', { mine: c.number }), true)}
          ${storyCard}
          <div class="card"><div data-live="guessing"></div></div>
          ${UI.forceLink('Révéler maintenant')}`;
      }
      return `
        <div class="phase"><div class="step">${step}</div><div class="t">Quelle note ? 🤔</div></div>
        ${promptCard(c)}
        ${storyCard}
        ${guessCard(g)}
        ${UI.forceLink('Révéler maintenant')}`;
    },

    // ─── Interrogatoire : un joueur sur le gril, les autres le questionnent ───
    gril(S, g) {
      const c = g.current;
      const step = `Joueur ${g.round} sur ${g.totalRounds} ${UI.timer(g.remaining)}`;
      if (c.isAuthor) {
        const todo = g.oral ? [] : g.qa.map((x, i) => ({ ...x, i })).filter((x) => x.a == null);
        return `
          <div class="phase"><div class="step">${step}</div><div class="t">Tu es sur le gril 🔥</div></div>
          ${promptCard(c, scale('show', { mine: c.number }), true)}
          <div class="card keep center"><p style="margin:0">Réponds à leurs questions comme quelqu'un dont <b>${esc(c.q.toLowerCase())}</b> vaut <b>${c.number} sur 10</b>.${g.oral ? '<br>Ils te questionnent <b>à voix haute</b> : réponds à voix haute !' : ''}<br><span class="muted">Ne dis pas le chiffre !</span></p></div>
          ${todo.map((x) => `<div class="card stack keep">
            <div class="nt-qq">${av(P(x.from), 'sm')} <span><b>${name(x.from)}</b> : ${esc(x.q)}</span></div>
            <input id="rep-${x.i}" maxlength="200" placeholder="Ta réponse…" autocomplete="off" value="${esc(repDraft[x.i] || '')}" />
            <button class="full" data-reply="${x.i}">Répondre</button></div>`).join('')}
          <div class="card"><h2>Questions</h2><div data-live="qa"></div></div>
          <div class="card"><div data-live="guessing"></div></div>
          ${UI.forceLink('Révéler maintenant')}`;
      }
      const left = g.maxAsk - g.myAsked;
      return `
        <div class="phase"><div class="step">${step}</div><div class="t">Interroge ${name(c.authorId)} 🔥</div></div>
        ${promptCard(c, `<div style="margin-top:8px">${av(P(c.authorId))}</div><div class="muted">Quelle est la note de <b>${name(c.authorId)}</b> ?</div>${scale('show')}`)}
        <div class="card stack keep">
          ${left > 0 ? (g.oral
            ? `<h2 style="margin:0">Ta question ${g.myAsked + 1} / ${g.maxAsk}</h2>
               <p style="margin:0">Pose-la <b>à voix haute</b>. Idée : <i id="idee">${esc(askDraft || idee())}</i></p>
               <div class="row"><button class="ghost" data-idee>🎲 Autre idée</button><button class="alt" data-ask>J'ai posé ma question ✅</button></div>`
            : `<h2 style="margin:0">Ta question ${g.myAsked + 1} / ${g.maxAsk}</h2>
               <input id="askq" maxlength="140" placeholder="Si tu étais une technique de Naruto ?" autocomplete="off" value="${esc(askDraft)}" />
               <div class="row"><button class="ghost" data-idee>🎲 Idée</button><button class="alt" data-ask>Poser</button></div>`)
            : `<p class="center" style="margin:0">Tu as posé tes ${g.maxAsk} questions ✅<br><span class="muted">Écoute bien les réponses, puis valide ta note.</span></p>`}
        </div>
        <div class="card"><h2>Questions</h2><div data-live="qa"></div></div>
        ${guessCard(g)}
        ${UI.forceLink('Révéler maintenant')}`;
    },

    reveal(S, g) {
      const c = g.current;
      const last = g.round >= g.totalRounds;
      return `
        <div class="phase"><div class="step">${g.mode === 'gril' ? 'Joueur' : 'Histoire'} ${g.round} sur ${g.totalRounds}</div><div class="t">La note de ${name(c.authorId)}…</div></div>
        ${promptCard(c)}
        <div class="card nt-revealcard">
          <div class="nt-counter"><span class="nt-num">?</span><small>/ 10</small></div>
          ${scale('reveal', { guesses: g.guesses })}
        </div>
        <div class="nt-after">
          ${c.story ? `<div class="card"><div class="nt-by">${av(P(c.authorId))}<b>${name(c.authorId)}</b></div><p class="nt-story">${esc(c.story)}</p></div>` : ''}
          ${g.mode === 'gril' && g.qa.length ? `<div class="card"><h2>L'interrogatoire</h2>${qaList(g)}</div>` : ''}
          <div class="card gains-card">${UI.gainsBlock(g.result.gains)}</div>
          <div class="card"><h2>Classement</h2>${UI.scoreboard(g.scores, UI.gainTotals(g.result.gains))}</div>
        </div>
        ${UI.hostButton(last ? 'Voir le podium 🏆' : g.mode === 'gril' ? 'Joueur suivant' : 'Histoire suivante')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  // ─── La révélation : la jauge monte case par case, de plus en plus lentement ──
  function playReveal(root, g) {
    clearTimeout(revealTimer);
    const truth = g.result.truth;
    const card = root.querySelector('.nt-revealcard');
    const fill = root.querySelector('.nt-fill');
    const num = root.querySelector('.nt-num');
    const after = root.querySelector('.nt-after');
    if (!card) return;
    const dock = root.querySelector('.dock');
    if (dock) dock.style.visibility = 'hidden'; // le bouton « suivant » attend la fin du suspense
    const setTo = (i) => {
      fill.style.width = `${((i + 1) / 11) * 100}%`;
      fill.style.background = SCALE[i];
      num.textContent = i;
      root.querySelectorAll('.nt-cell').forEach((c) => c.classList.toggle('lit', Number(c.dataset.cell) <= i));
    };
    const finish = () => {
      setTo(truth);
      card.classList.add('done');
      root.querySelector(`.nt-cell[data-cell="${truth}"]`)?.classList.add('hit');
      after.classList.add('shown');
      if (dock) dock.style.visibility = '';
      navigator.vibrate?.(120);
    };
    const key = `${g.round}`;
    if (animatedFor === key || matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
    animatedFor = key;
    let i = 0;
    const tick = () => {
      setTo(i);
      if (i >= truth) { revealTimer = setTimeout(finish, 450); return; }
      i++;
      // les derniers pas sont de plus en plus lents : suspense
      const progress = truth ? i / truth : 1;
      revealTimer = setTimeout(tick, 140 + Math.pow(progress, 3) * 650);
    };
    revealTimer = setTimeout(tick, 900); // laisse le temps de voir les devinettes
  }

  UI.registerGame('note', {
    rules: () => `
      <ol class="rules">
        <li>Chacun reçoit un <b>thème</b> (ex. : « Raconte un rendez-vous amoureux ») et une <b>note secrète de 0 à 10</b> sur une échelle (Catastrophe → Parfait).</li>
        <li>Tu écris une histoire, vraie ou inventée, qui vaut <b>exactement ta note</b>. Interdit de donner le chiffre !</li>
        <li>Histoire par histoire, les autres <b>devinent la note</b>. Puis la jauge révèle la vraie.</li>
      </ol>
      <p class="muted" style="font-size:.92rem"><b>Mode Interrogatoire 🔥</b> : chacun son tour, un joueur reçoit une note secrète (ex. « Ta puissance : 7/10 »). Les autres lui posent <b>2 questions chacun</b> (« Si tu étais une technique de Naruto ? ») et il répond comme quelqu'un qui vaut cette note. Ça se joue à l'écrit ou à l'oral.</p>
      <p class="muted" style="font-size:.92rem">Tu choisis une note, puis tu la <b>valides</b>. Tu peux la changer tant que la note n'est pas révélée : la révélation arrive quand tout le monde a validé.</p>
      <div class="muted" style="font-size:.92rem">🎯 Note exacte : <b>+100</b> · À 1 près : <b>+60</b> · À 2 près : <b>+30</b><br>✍️🔥 Celui qui raconte ou répond gagne la moyenne des points des autres : dose bien !</div>`,

    // écran partagé : pendant l'écriture et les devinettes, on n'affiche que le public
    tv: (S, g) => {
      if (g.phase === 'write') {
        return `<div class="phase"><div class="step">Écriture ${UI.timer(g.remaining)}</div><div class="t">Chacun écrit son histoire ✍️</div></div>
          <div class="card center"><p class="tv-big" style="margin:0">Une note secrète de 0 à 10, une histoire à doser…</p></div>
          <div class="card"><div data-live="writing"></div></div>`;
      }
      if (g.phase === 'guess' && g.mode === 'gril') {
        const c = g.current;
        return `<div class="phase"><div class="step">Joueur ${g.round} sur ${g.totalRounds} ${UI.timer(g.remaining)}</div><div class="t">${name(c.authorId)} est sur le gril 🔥</div></div>
          ${promptCard(c, `<div style="margin-top:8px">${av(P(c.authorId), 'lg')}</div>${scale('show')}`)}
          <div class="card"><h2>Questions</h2><div data-live="qa"></div></div>
          <div class="card"><div data-live="guessing"></div></div>`;
      }
      if (g.phase === 'guess') {
        const c = g.current;
        return `<div class="phase"><div class="step">Histoire ${g.round} sur ${g.totalRounds} ${UI.timer(g.remaining)}</div><div class="t">Quelle note ? 🤔</div></div>
          ${promptCard(c, scale('show'))}
          ${c.story ? `<div class="card"><div class="nt-by">${av(P(c.authorId))}<b>${name(c.authorId)}</b><span class="muted">raconte…</span></div><p class="nt-story tv-big" style="font-size:1.6rem">${esc(c.story)}</p></div>`
            : `<div class="card center nt-oral"><div>${av(P(c.authorId), 'lg')}</div><div class="tv-big" style="margin-top:12px">🎤 ${name(c.authorId)} raconte…</div></div>`}
          <div class="card"><div data-live="guessing"></div></div>`;
      }
      return null; // les autres écrans sont les mêmes que sur les téléphones
    },

    key: (S, g) => [g.phase, g.round, !!g.myStory, g.myGuess, g.myLocked, g.myAsked,
      g.current?.isAuthor && g.qa ? g.qa.map((x) => (x.a == null ? '?' : '.')).join('') : ''].join('|'),

    screen: (S, g) => screens[g.phase](S, g),

    live: {
      writing: (S, g) => `<div class="muted" style="margin-bottom:8px">${g.written.length} sur ${g.participants.filter((id) => P(id)?.connected).length} ont écrit</div>
        <div class="players">${g.participants.filter((id) => P(id)?.connected).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} ${g.written.includes(id) ? '✅' : '<span class="wait">✍️</span>'}</span></div>`).join('')}</div>`,
      qa: (S, g) => qaList(g),
      guessing: (S, g) => `<div class="muted" style="margin-bottom:8px">${g.guessed.length} sur ${g.needed} ont validé leur note${g.pending ? ` · ${g.pending} question${g.pending > 1 ? 's' : ''} sans réponse` : ''}</div>
        <div class="players">${g.participants.filter((id) => id !== g.current.authorId && P(id)?.connected).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} ${g.guessed.includes(id) ? '✅' : '<span class="wait">🤔</span>'}</span></div>`).join('')}</div>`,
      count: (S, g) => `<span class="pill">✅ ${g.guessed.length} sur ${g.needed} notes validées</span>${g.pending ? `<br><span class="muted" style="font-size:.85rem">${g.pending} question${g.pending > 1 ? 's' : ''} en attente de réponse</span>` : ''}`,
    },

    bind: (S, g, root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((el) => el.addEventListener('click', fn));
      const ta = root.querySelector('#story');
      if (ta) ta.addEventListener('input', () => { draft.text = ta.value; });
      on('[data-story]', () => { if (draft.text.trim().length < 10) return UI.toast('Écris une vraie petite histoire 😉'); UI.send('story', draft.text); });
      on('[data-edit]', () => { draft.text = g.myStory; UI.send('edit'); });
      on('[data-n]', (e) => UI.send('guess', Number(e.currentTarget.dataset.n)));
      on('[data-lock]', () => UI.send('lock'));
      on('[data-unlock]', () => UI.send('unlock'));
      // Interrogatoire
      const askq = root.querySelector('#askq');
      if (askq) {
        askq.addEventListener('input', () => { askDraft = askq.value; });
        askq.addEventListener('keydown', (e) => e.key === 'Enter' && root.querySelector('[data-ask]').click());
      }
      on('[data-idee]', () => {
        askDraft = idee();
        if (askq) askq.value = askDraft;
        const el = root.querySelector('#idee'); if (el) el.textContent = askDraft;
      });
      on('[data-ask]', () => {
        const q = askq ? askq.value.trim() : '';
        if (askq && q.length < 3) return UI.toast('Écris ta question (ou prends une idée 🎲)');
        UI.send('ask', askq ? q : ''); // à l'oral, la question a été dite à voix haute
        askDraft = '';
      });
      root.querySelectorAll('[id^="rep-"]').forEach((inp) => {
        const i = Number(inp.id.slice(4));
        inp.addEventListener('input', () => { repDraft[i] = inp.value; });
        inp.addEventListener('keydown', (e) => e.key === 'Enter' && root.querySelector(`[data-reply="${i}"]`).click());
      });
      on('[data-reply]', (e) => {
        const i = Number(e.currentTarget.dataset.reply);
        const v = (root.querySelector(`#rep-${i}`)?.value || '').trim();
        if (!v) return UI.toast('Écris ta réponse');
        UI.send('reply', { i, text: v });
        delete repDraft[i];
      });
      // après un rafraîchissement, on remet le curseur dans le champ où l'on écrivait
      const f = focusId && root.querySelector('#' + focusId);
      if (f && (f.id === 'askq' || f.id.startsWith('rep-'))) { f.focus(); f.setSelectionRange?.(f.value.length, f.value.length); }
      if (g.phase === 'reveal') playReveal(root, g);
    },
  });
})();
