// 🎨 Dessin en chaîne — affichage + zone de dessin au doigt
(() => {
  const { esc, P, av, name } = UI;
  const SIZE = 480; // résolution interne du dessin (carré)
  const COLORS = ['#1a0f2e', '#ffffff', '#f0506e', '#ff8a4c', '#ffc23d', '#2fd3a7', '#35c2f0', '#6d8bff', '#b48cff', '#ff8fb5', '#8b5a2b', '#9aa0a6'];
  const WIDTHS = [4, 10, 24];

  // ─── État local de la zone de dessin ─────────────────────────────────────
  let pad = { key: '', strokes: [], color: COLORS[0], width: WIDTHS[1] };
  let text = { key: '', value: '' };
  let sentKey = '';     // étape déjà envoyée (évite les doubles envois)
  let tick = null;      // compte à rebours
  let endsAt = 0;
  let scrolledTo = '';  // dernière carte de l'album sur laquelle on a défilé

  const stepKey = (g) => `${g.step}`;

  function redraw(canvas) {
    const c = canvas.getContext('2d');
    c.fillStyle = '#fff';
    c.fillRect(0, 0, SIZE, SIZE);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (const s of pad.strokes) {
      c.strokeStyle = s.color;
      c.fillStyle = s.color;
      c.lineWidth = s.width;
      if (s.points.length === 1) {
        c.beginPath(); c.arc(s.points[0][0], s.points[0][1], s.width / 2, 0, Math.PI * 2); c.fill();
        continue;
      }
      c.beginPath();
      c.moveTo(s.points[0][0], s.points[0][1]);
      for (let i = 1; i < s.points.length - 1; i++) {
        const [x1, y1] = s.points[i], [x2, y2] = s.points[i + 1];
        c.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2); // trait lissé
      }
      const last = s.points[s.points.length - 1];
      c.lineTo(last[0], last[1]);
      c.stroke();
    }
  }

  function setupCanvas(root) {
    const canvas = root.querySelector('#pad');
    if (!canvas) return;
    canvas.width = canvas.height = SIZE;
    redraw(canvas);
    let current = null;
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return [Math.round(((e.clientX - r.left) / r.width) * SIZE), Math.round(((e.clientY - r.top) / r.height) * SIZE)];
    };
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      current = { color: pad.color, width: pad.width, points: [pos(e)] };
      pad.strokes.push(current);
      redraw(canvas);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!current) return;
      const evts = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of evts) current.points.push(pos(ev));
      redraw(canvas);
    });
    const stop = () => { current = null; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);

    root.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => { pad.color = b.dataset.color; markTools(root); }));
    root.querySelectorAll('[data-width]').forEach((b) => b.addEventListener('click', () => { pad.width = Number(b.dataset.width); markTools(root); }));
    root.querySelector('[data-undo]')?.addEventListener('click', () => { pad.strokes.pop(); redraw(canvas); });
    root.querySelector('[data-clear]')?.addEventListener('click', () => { if (!pad.strokes.length || confirm('Tout effacer ?')) { pad.strokes = []; redraw(canvas); } });
    markTools(root);
  }

  function markTools(root) {
    root.querySelectorAll('[data-color]').forEach((b) => b.classList.toggle('sel', b.dataset.color === pad.color));
    root.querySelectorAll('[data-width]').forEach((b) => b.classList.toggle('sel', Number(b.dataset.width) === pad.width));
  }

  // Envoi de l'étape (bouton, ou automatiquement à la fin du temps)
  function submit(g) {
    if (sentKey === stepKey(g)) return;
    sentKey = stepKey(g);
    if (g.type === 'draw') {
      const canvas = document.querySelector('#pad');
      const data = canvas && pad.strokes.length ? canvas.toDataURL('image/png') : '';
      UI.send('submit', data);
    } else {
      UI.send('submit', text.value);
    }
  }

  function startTimer(g) {
    clearInterval(tick);
    endsAt = Date.now() + g.remaining;
    const update = () => {
      const left = Math.max(0, endsAt - Date.now());
      const el = document.querySelector('.dc-timer');
      if (el) {
        el.textContent = `${Math.ceil(left / 1000)} s`;
        el.classList.toggle('hurry', left < 10000);
      }
      // à la fin du temps, on envoie ce qu'on a (même inachevé)
      if (left <= 800 && !g.done && UI.state?.game?.step === g.step) submit(g);
      if (left <= 0) clearInterval(tick);
    };
    update();
    tick = setInterval(update, 250);
  }

  const shownEntry = (e, big = false) => {
    if (e.type === 'draw') return e.content ? `<img class="dc-img ${big ? 'big' : ''}" src="${e.content}" alt="Dessin de ${name(e.pid)}">` : '<div class="dc-img dc-empty">🙈 Pas de dessin</div>';
    return `<div class="dc-text">${esc(e.content)}</div>`;
  };

  const progressBar = (g) => `<div class="progress"><div style="width:${(g.step / g.steps) * 100}%"></div></div>`;
  const stepLabel = (g) => `Étape ${g.step + 1} sur ${g.steps}`;

  // ─── Écrans ────────────────────────────────────────────────────────────────
  function playScreen(S, g) {
    const head = (title) => `${progressBar(g)}<div class="phase"><div class="step">${stepLabel(g)} · <span class="dc-timer">…</span></div><div class="t">${title}</div></div>`;
    if (g.done) {
      return `${head('C\'est envoyé ✅')}
        <div class="card"><div data-live="waiting"></div></div>
        ${UI.forceLink('Passer à l\'étape suivante sans les retardataires')}`;
    }
    if (g.type === 'text') {
      return `${head('Écris une phrase à faire dessiner')}
        <div class="card stack">
          <p class="muted" style="margin:0">Quelque chose de drôle, bizarre ou difficile à dessiner. Ex. : « Un pingouin qui fait ses courses ».</p>
          <input id="txt" maxlength="100" placeholder="Ta phrase…" autocomplete="off" value="${esc(text.value)}" />
          <button class="full alt" data-send>Envoyer</button>
        </div>`;
    }
    if (g.type === 'draw') {
      return `${head('Dessine ça !')}
        <div class="card center dc-prompt"><div class="muted">À dessiner</div><div class="dc-text">${esc(g.prev?.content || '…')}</div></div>
        <div class="card dc-padcard">
          <canvas id="pad" class="dc-pad" aria-label="Zone de dessin"></canvas>
          <div class="dc-tools">
            <div class="dc-colors">${COLORS.map((c) => `<button class="dc-color" data-color="${c}" style="background:${c}" aria-label="Couleur ${c}"></button>`).join('')}</div>
            <div class="dc-row">
              ${WIDTHS.map((w) => `<button class="dc-width" data-width="${w}" aria-label="Épaisseur ${w}"><span style="width:${Math.min(w, 20)}px;height:${Math.min(w, 20)}px"></span></button>`).join('')}
              <button class="dc-act" data-undo>↶ Annuler</button>
              <button class="dc-act" data-clear>Effacer</button>
            </div>
          </div>
        </div>
        <button class="full alt" data-send>J'ai fini</button>`;
    }
    // deviner
    return `${head('Qu\'est-ce que c\'est ?')}
      <div class="card center">${g.prev ? shownEntry(g.prev, true) : ''}</div>
      <div class="card stack">
        <input id="txt" maxlength="100" placeholder="Je pense que c'est…" autocomplete="off" value="${esc(text.value)}" />
        <button class="full alt" data-send>Envoyer</button>
      </div>`;
  }

  function albumScreen(S, g) {
    const a = g.album;
    const last = a.chain + 1 >= a.chains && a.shown >= a.length;
    const label = a.shown < a.length ? 'Suivant' : a.chain + 1 < a.chains ? 'Chaîne suivante' : 'Voir le podium 🏆';
    return `
      <div class="phase"><div class="step">Chaîne ${a.chain + 1} sur ${a.chains}</div><div class="t">La phrase de ${name(a.owner)}</div></div>
      <div class="dc-album">${a.entries.map((e, i) => `
        <div class="card dc-entry ${i === a.entries.length - 1 ? 'reveal' : ''}">
          <div class="dc-who">${av(P(e.pid), 'sm')} <b>${name(e.pid)}</b> <span class="muted">${e.type === 'draw' ? 'a dessiné' : i === 0 ? 'a écrit' : 'a deviné'}</span></div>
          ${shownEntry(e)}
          ${e.pid !== S.you ? `<button class="dc-heart ${e.mine ? 'on' : ''}" data-heart="${e.step}" aria-label="J'aime">${e.mine ? '❤️' : '🤍'} ${e.hearts || ''}</button>` : `<span class="dc-heart mine">❤️ ${e.hearts || 0}</span>`}
        </div>`).join('')}</div>
      <p class="center white muted" style="font-size:.9rem">Touche 🤍 pour donner un cœur à tes cartes préférées (+100 pts pour leur auteur).</p>
      ${UI.hostButton(label)}`;
  }

  UI.registerGame('dessin', {
    rules: () => `
      <ol class="rules">
        <li>Chacun écrit une <b>phrase</b> à faire dessiner.</li>
        <li>Elle passe au joueur suivant, qui la <b>dessine</b>. Le suivant voit seulement le dessin et <b>devine</b> ce que c'est. Le suivant dessine cette devinette… et ainsi de suite.</li>
        <li>À la fin, on feuillette chaque chaîne ensemble pour voir comment le message a dérivé.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">⏱️ 45 s pour écrire, 90 s pour dessiner, 40 s pour deviner. Ce qui est en cours est envoyé à la fin du temps.<br>❤️ Chaque cœur reçu pendant la révélation : <b>+100</b></div>`,

    key: (S, g) => [g.phase, g.step, g.done, g.album ? `${g.album.chain}:${g.album.shown}:` + g.album.entries.map((e) => e.hearts + (e.mine ? 'm' : '')).join(',') : ''].join('|'),

    onState: (S, g) => {
      if (g.phase === 'play' && pad.key !== stepKey(g)) { pad = { ...pad, key: stepKey(g), strokes: [] }; text = { key: stepKey(g), value: '' }; }
      if (g.phase !== 'play') clearInterval(tick);
    },

    screen: (S, g) => (g.phase === 'play' ? playScreen(S, g) : g.phase === 'album' ? albumScreen(S, g) : UI.endScreen(g)),

    live: {
      waiting: (S, g) => `<div class="muted" style="margin-bottom:8px">${g.finished.length} sur ${g.needed} ont fini</div>
        <div class="players">${g.participants.filter((id) => P(id)?.connected).map((id) => `<div class="player">${av(P(id))}<span>${name(id)} ${g.finished.includes(id) ? '✅' : '<span class="wait">✏️</span>'}</span></div>`).join('')}</div>`,
    },

    bind: (S, g, root) => {
      if (g.phase === 'play') startTimer(g);
      setupCanvas(root);
      const input = root.querySelector('#txt');
      if (input) {
        input.addEventListener('input', () => { text.value = input.value; });
        input.addEventListener('keydown', (e) => e.key === 'Enter' && input.value.trim() && submit(g));
        input.focus();
      }
      root.querySelector('[data-send]')?.addEventListener('click', () => {
        if (g.type !== 'draw' && !text.value.trim()) return UI.toast('Écris quelque chose 😉');
        if (g.type === 'draw' && !pad.strokes.length) return UI.toast('Dessine quelque chose 😉');
        submit(g);
      });
      root.querySelectorAll('[data-heart]').forEach((b) => b.addEventListener('click', () => UI.send('heart', { chain: g.album.chain, step: Number(b.dataset.heart) })));
      // l'album défile jusqu'à la dernière carte révélée
      const at = g.album ? `${g.album.chain}:${g.album.shown}` : '';
      if (g.phase === 'album' && at !== scrolledTo) {
        scrolledTo = at;
        root.querySelector('.dc-entry:last-child')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
  });
})();
