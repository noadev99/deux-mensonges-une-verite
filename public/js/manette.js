// 🎮 Outils communs aux jeux en temps réel (le ring, les bolides…)
// · sons générés en Web Audio
// · commandes reçues par la télé (inputs)
// · manette du téléphone (joystick + boutons A/B/C)
// · joueur au clavier sur l'ordi de la télé
(() => {
  const { esc } = UI;

  // ═══ Sons (aucun fichier) ═══
  let actx = null;
  const audio = () => {
    if (!actx) { const C = window.AudioContext || window.webkitAudioContext; if (C) actx = new C(); }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  };
  document.addEventListener('pointerdown', () => { if (document.body.classList.contains('tv')) audio(); });
  function tone(freq, dur, type = 'square', vol = 0.12, slide = 0, delay = 0) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.25, freq = 800, slide = 0) {
    const a = audio(); if (!a) return;
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = 'lowpass'; f.frequency.setValueAtTime(freq, a.currentTime);
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq + slide), a.currentTime + dur);
    g.gain.value = vol;
    src.connect(f).connect(g).connect(a.destination); src.start();
  }

  // ═══ Télé : dernière commande reçue de chaque joueur ═══
  const inputs = {};
  UI.on('ctl', (m) => { inputs[m.p] = m; });
  UI.on('buzz', (pattern) => navigator.vibrate?.(pattern));

  // tête dessinée du joueur → image pour un canvas
  const faces = {};
  function faceImg(id) {
    const p = UI.P(id);
    const key = id + JSON.stringify(p?.look || p?.avatar);
    if (faces[id]?.key === key) return faces[id].img;
    const svg = (p?.look ? PERSO.head(p.look) : ICONS.avatar(p?.avatar || 0)).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    faces[id] = { key, img };
    return img;
  }
  const colorOf = (id) => { const p = UI.P(id); return p?.look ? PERSO.color(p.look) : p?.color || '#fff'; };

  // ═══ Manette (téléphone) ═══
  // Le HTML attendu : .pad > .pad-left (.pad-base > .pad-knob) + boutons [data-btn="a|b|c"]
  let pad = null;
  function stopPad() {
    if (!pad) return;
    clearInterval(pad.beat);
    UI.emit('ctl', { x: 0, y: 0, a: false, b: false, c: false });
    document.body.classList.remove('padmode');
    pad = null;
  }
  function startPad(root) {
    stopPad();
    const el = root.querySelector('.pad');
    if (!el) return;
    document.body.classList.add('padmode');
    pad = { el, x: 0, y: 0, a: false, b: false, c: false, stickId: null, ox: 0, oy: 0, sent: '', lastSend: 0, timer: null };
    const knob = el.querySelector('.pad-knob'), base = el.querySelector('.pad-base');
    const R = 60;
    const flush = () => {
      if (!pad) return;
      const msg = { x: Math.round(pad.x * 100) / 100, y: Math.round(pad.y * 100) / 100, a: pad.a, b: pad.b, c: pad.c };
      const k = JSON.stringify(msg);
      const now = Date.now();
      if (k === pad.sent && now - pad.lastSend < 300) return;           // rien n'a changé
      if (now - pad.lastSend < 40) { clearTimeout(pad.timer); pad.timer = setTimeout(flush, 40 - (now - pad.lastSend)); return; } // max ~25/s
      pad.sent = k; pad.lastSend = now;
      UI.emit('ctl', msg);
    };
    pad.beat = setInterval(flush, 300); // renvoie l'état de temps en temps (au cas où un message se perd)
    const zone = el.querySelector('.pad-left');
    const setKnob = () => { knob.style.transform = `translate(${pad.x * R}px, ${pad.y * R}px)`; };
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (pad.stickId != null) return;
      pad.stickId = e.pointerId; zone.setPointerCapture?.(e.pointerId);
      const zr = zone.getBoundingClientRect();
      pad.ox = e.clientX; pad.oy = e.clientY;
      base.style.left = `${e.clientX - zr.left}px`; base.style.top = `${e.clientY - zr.top}px`;
      base.classList.add('on');
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pad.stickId) return;
      e.preventDefault();
      let dx = (e.clientX - pad.ox) / R, dy = (e.clientY - pad.oy) / R;
      const l = Math.hypot(dx, dy);
      if (l > 1) { dx /= l; dy /= l; }
      pad.x = dx; pad.y = dy; setKnob(); flush();
    });
    const release = (e) => {
      if (e.pointerId !== pad.stickId) return;
      pad.stickId = null; pad.x = 0; pad.y = 0; setKnob(); base.classList.remove('on'); flush();
    };
    zone.addEventListener('pointerup', release); zone.addEventListener('pointercancel', release);
    el.querySelectorAll('[data-btn]').forEach((b) => {
      const k = b.dataset.btn;
      const down = (e) => { e.preventDefault(); pad[k] = true; b.classList.add('down'); navigator.vibrate?.(12); flush(); };
      const up = (e) => { e.preventDefault(); pad[k] = false; b.classList.remove('down'); flush(); };
      b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    });
    el.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.querySelector('[data-fs]')?.addEventListener('click', async () => {
      try { await document.documentElement.requestFullscreen?.(); await screen.orientation?.lock?.('landscape'); } catch (e) { /* pas possible sur ce téléphone */ }
    });
  }

  // ═══ Joueur au clavier sur l'ordi de la télé ═══
  // L'ordi ouvre une 2ᵉ connexion qui rejoint le salon comme un vrai joueur : le clavier sert de manette.
  // Flèches ou ZQSD/WASD · A : Espace/Entrée · B : Maj/E · C : F/X/Ctrl
  const KB_KEY = 'kb-session';
  let kb = null;
  let kbDraft = '';
  const kbSaved = () => { try { return JSON.parse(localStorage.getItem(KB_KEY) || 'null'); } catch (e) { return null; } };
  function kbStart(nameTxt) {
    if (kb || !window.io) return;
    const S = UI.state;
    const pseudo = String(nameTxt || '').trim().slice(0, 20);
    if (!S || !pseudo) return UI.toast('Choisis un pseudo pour le joueur clavier');
    const saved = kbSaved();
    const sock = io({ forceNew: true });
    kb = { sock, name: pseudo, keys: new Set(), you: null, sent: '', last: 0, timer: null };
    sock.on('connect', () => {
      const code = UI.state?.code;
      if (saved && saved.code === code) sock.emit('rejoin', saved);
      else sock.emit('join', { name: pseudo, code, look: PERSO.random(), kb: true });
    });
    sock.on('joined', (d) => { kb && (kb.you = d.playerId); try { localStorage.setItem(KB_KEY, JSON.stringify({ ...d, name: pseudo })); } catch (e) { /* stockage bloqué */ } });
    sock.on('rejoinFailed', () => { localStorage.removeItem(KB_KEY); sock.emit('join', { name: pseudo, code: UI.state?.code, look: PERSO.random(), kb: true }); });
    sock.on('errorMsg', (m) => { UI.toast(`Clavier : ${m}`); if (!kb?.you) kbStop(); });
    sock.on('state', (st) => {
      if (!kb) return;
      kb.st = st;
      // le joueur clavier ne garde pas la couronne : l'hôte lance depuis son téléphone
      const other = st.players.find((p) => p.connected && p.id !== st.you);
      if (st.hostId === st.you && other) sock.emit('setHost', other.id);
      // il ne joue qu'aux jeux « clavier » : il s'en va si l'hôte choisit un autre jeu, jouable sans lui
      const real = st.players.filter((p) => p.connected && !p.kb).length;
      const chosen = st.games.find((x) => x.id === st.gameId);
      if (st.phase === 'lobby' && chosen && !chosen.keyboard && real >= chosen.minPlayers) kbStop();
    });
  }
  function kbStop() {
    if (!kb) return;
    const k = kb; kb = null;
    k.sock.emit('leave'); setTimeout(() => k.sock.disconnect(), 200);
    localStorage.removeItem(KB_KEY);
    UI.refresh();
  }
  const KEYS = {
    up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
    a: ['Space', 'Enter'], b: ['ShiftLeft', 'ShiftRight', 'KeyE'], c: ['KeyF', 'KeyX', 'ControlLeft', 'ControlRight'],
  };
  const kbHas = (k) => KEYS[k].some((c) => kb.keys.has(c));
  function kbFlush() {
    if (!kb) return;
    let x = (kbHas('right') ? 1 : 0) - (kbHas('left') ? 1 : 0), y = (kbHas('down') ? 1 : 0) - (kbHas('up') ? 1 : 0);
    if (x && y) { x *= 0.707; y *= 0.707; }
    const msg = { x, y, a: kbHas('a'), b: kbHas('b'), c: kbHas('c') };
    const key = JSON.stringify(msg), now = Date.now();
    if (key === kb.sent && now - kb.last < 300) return;
    if (now - kb.last < 40) { clearTimeout(kb.timer); kb.timer = setTimeout(kbFlush, 40 - (now - kb.last)); return; }
    kb.sent = key; kb.last = now;
    kb.sock.emit('ctl', msg);
  }
  const ALL_KEYS = new Set(Object.values(KEYS).flat());
  window.addEventListener('keydown', (e) => {
    if (!kb || !ALL_KEYS.has(e.code) || e.target.matches?.('input, textarea')) return;
    e.preventDefault(); kb.keys.add(e.code); kbFlush();
  });
  window.addEventListener('keyup', (e) => { if (!kb || !ALL_KEYS.has(e.code)) return; kb.keys.delete(e.code); kbFlush(); });
  window.addEventListener('blur', () => { if (kb) { kb.keys.clear(); kbFlush(); } });
  setInterval(() => { if (kb) kbFlush(); }, 300);
  // télé rechargée : le joueur clavier reprend sa place
  function kbResume() {
    const saved = kbSaved();
    if (!kb && saved && UI.state?.spectator && saved.code === UI.state.code) kbStart(saved.name);
  }

  // Carte « joueur clavier » du salon télé ; help = aide des touches propre au jeu
  function keyboard(help) {
    return {
      card() {
        kbResume();
        if (kb) {
          return `<div class="card rg-kb on"><div class="cardhead"><h2>⌨️ Joueur clavier : ${esc(kb.name)}</h2><button class="chipbtn" data-kb-off>Retirer</button></div>
            <p class="muted" style="margin:0">${help}</p></div>`;
        }
        return `<div class="card rg-kb"><h2>⌨️ Jouer aussi au clavier ?</h2>
          <p class="muted" style="margin-top:0">Pas assez de téléphones ? Quelqu'un peut jouer sur cet ordi avec le clavier.</p>
          <div class="row"><input id="kbname" maxlength="20" placeholder="Pseudo du joueur clavier" value="${esc(kbDraft)}" autocomplete="off" /><button class="alt" data-kb-on style="flex:0 0 auto">Rejoindre</button></div></div>`;
      },
      bind(root) {
        const input = root.querySelector('#kbname');
        if (input) {
          input.addEventListener('input', () => { kbDraft = input.value; });
          input.addEventListener('keydown', (e) => { if (e.key === 'Enter') kbStart(input.value); });
        }
        root.querySelector('[data-kb-on]')?.addEventListener('click', () => kbStart(root.querySelector('#kbname')?.value));
        root.querySelector('[data-kb-off]')?.addEventListener('click', kbStop);
      },
    };
  }

  window.MANETTE = {
    audio, tone, noise, inputs, faceImg, colorOf,
    startPad, stopPad, keyboard, kbResume,
    kbName: () => kb?.name || null,
  };
})();
