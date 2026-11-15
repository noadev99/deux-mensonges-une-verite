// 💣 Le Démineur — la bombe (sur la télé et les téléphones) et le manuel découpé entre les joueurs.
(() => {
  const { esc, P, av, name } = UI;

  let tab = 'bomb';          // téléphone : onglet affiché (bombe / manuel)
  let armed = null;          // câble sélectionné (il faut toucher deux fois pour couper)
  let recvAt = 0, cur = null, offset = 0, raf = 0;

  const LAMP = { rouge: '#ff4d4d', verte: '#3fdf8f', bleue: '#4fa3ff', éteinte: '#3b3450' };
  const WIRE = { rouge: '#e8383d', bleu: '#3d7bff', jaune: '#ffd23d', vert: '#2fbf5f', noir: '#1a0f2e', blanc: '#f4f1ea' };
  const BTN = { rouge: '#ff4d4d', bleu: '#4fa3ff', jaune: '#ffd23d', vert: '#3fdf8f', blanc: '#f4f1ea' };
  const THERMO = { rouge: '#ff6b6b', bleu: '#5aa9ff', vert: '#4fd18b', jaune: '#ffd23d' };

  const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const timeLeft = () => (cur?.bomb ? Math.max(0, cur.bomb.rem - (Date.now() - recvAt) * cur.bomb.rate) : 0);
  const thermoValue = (m) => { const { seq, period, t0 } = m.pub; const k = Math.floor((Date.now() + offset - t0) / period); return seq[((k % seq.length) + seq.length) % seq.length]; };

  // ═══ Bandeau de la bombe : chrono, erreurs, numéro de série, piles, lampe ═══
  function bombHead(b, big) {
    return `<div class="dm-head ${big ? 'big' : ''}">
      <div class="dm-timer ${b.rate > 1 ? 'fast' : ''}" data-timer>${b.twist?.id === 'masque' && b.rem > 30000 ? '??:??' : fmt(b.rem)}</div>
      <div class="dm-strikes">${Array.from({ length: b.maxStrikes }, (_, i) => `<span class="${i < b.strikes ? 'on' : ''}">✖</span>`).join('')}</div>
      <div class="dm-props">
        <span class="dm-serial" title="Numéro de série">N° ${esc(b.serial)}</span>
        <span class="dm-piles" title="Piles">${b.piles ? '🔋'.repeat(b.piles) : '<i>aucune pile</i>'}</span>
        <span class="dm-lamp" title="Lampe"><i style="background:${LAMP[b.lamp]}"></i>lampe ${esc(b.lamp)}</span>
      </div>
    </div>${b.trio ? `<div class="dm-trio">${b.trio.emoji} <b>Règle à 3 : ${esc(b.trio.name)}</b> — ${esc(b.trio.desc)}${b.trio.captain ? `<br>🧑‍✈️ Capitaine : <b>${name(b.trio.captain)}</b>` : ''}${b.trio.mute ? `<br>🤐 Muet : <b>${name(b.trio.mute)}</b>` : ''}</div>` : ''}${b.twist ? `<div class="dm-twist">${b.twist.emoji} <b>Piège : ${esc(b.twist.name)}</b> — ${esc(b.twist.desc)}</div>` : ''}`;
  }

  // ═══ Modules ═══
  // règles à 3 : qui a le droit de toucher ce module ?
  function canTouch(m) {
    const t = cur?.bomb?.trio, you = UI.state?.you;
    if (!t) return true;
    if (t.id === 'capitaine') return you === t.captain;
    if (t.id === 'proprio') return !m.owner || m.owner === you;
    if (t.id === 'relais') return cur.bomb.modules.find((x) => !x.solved)?.label === m.label;
    return true;
  }
  function moduleHtml(m, live) {
    const dis = live && canTouch(m) ? '' : 'disabled';
    const lab = `<div class="dm-mhead"><b>${m.label}</b><span>${esc(m.name)}</span>${m.owner && P(m.owner) ? `<span class="dm-owner">🔒 ${name(m.owner)}</span>` : ''}</div>`;
    const cls = m.hard ? 'dm-mod hard' : 'dm-mod';
    if (m.solved) return `<div class="dm-mod solved">${lab}<div class="dm-ok">✅ Désamorcé${m.by && P(m.by) ? ` par ${name(m.by)}` : ''}</div></div>`;
    let body = '';
    if (m.type === 'wires') {
      body = `<div class="dm-wires">${m.pub.list.map((w, i) => `
        <button class="dm-wire ${w.cut ? 'cut' : ''} ${armed === `${m.label}${i}` ? 'armed' : ''}" data-cut="${m.label}|${i}" ${dis || (w.cut ? 'disabled' : '')}>
          <span class="dm-wn">${i + 1}</span>
          <span class="dm-wl ${w.s ? 'striped' : ''}" style="--w:${WIRE[w.c]}"></span>
          <span class="dm-wc">${w.cut ? '✂️ coupé' : armed === `${m.label}${i}` ? 'Couper ?' : '✂️'}</span>
        </button>`).join('')}</div>`;
    } else if (m.type === 'dial') {
      body = `<div class="dm-dial"><button class="alt" data-dial="${m.label}|-1" ${dis}>◀</button><span class="dm-digit">${m.pub.value}</span><button class="alt" data-dial="${m.label}|1" ${dis}>▶</button></div>
        <button class="dm-validate" data-ok="${m.label}" ${dis}>Valider</button>`;
    } else if (m.type === 'symbols') {
      body = `<div class="dm-syms">${m.pub.glyphs.map((g, i) => {
        const k = m.pub.done.indexOf(i);
        return `<button class="dm-sym ${k >= 0 ? 'done' : ''}" data-sym="${m.label}|${i}" ${dis || (k >= 0 ? 'disabled' : '')}>${g}&#xFE0E;${k >= 0 ? `<small>${k + 1}</small>` : ''}</button>`;
      }).join('')}</div>`;
    } else if (m.type === 'thermo' && m.pub.mode === 'chrono') {
      body = `<div class="dm-thermo off" style="--t:${THERMO[m.pub.color]}"><span class="dm-tlabel">Thermostat ${esc(m.pub.color.toUpperCase())}</span><span class="dm-temp">--</span><span class="dm-unit">⏱️</span></div>
        <button class="dm-validate" data-ok="${m.label}" ${dis}>Valider maintenant</button>`;
    } else if (m.type === 'code') {
      const e = m.pub.entry;
      body = `<div class="dm-code">${[0, 1, 2, 3].map((k) => `<span>${e[k] ?? '·'}</span>`).join('')}</div>
        <div class="dm-keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => `<button data-key="${m.label}|${d}" ${dis || (e.length >= 4 ? 'disabled' : '')}>${d}</button>`).join('')}<button class="alt" data-clear="${m.label}" ${dis}>Effacer</button></div>
        <button class="dm-validate" data-ok="${m.label}" ${dis}>Valider</button>`;
    } else if (m.type === 'button') {
      const taps = m.pub.mode === 'taps';
      body = `<div class="dm-bigbtn-wrap"><button class="dm-bigbtn" style="--b:${BTN[m.pub.color]}" data-press="${m.label}" ${dis}>${esc(m.pub.word)}</button>
        ${taps ? `<div class="dm-count">Appuis : <b>${m.pub.count}</b></div>` : ''}</div>
        ${taps ? `<div class="dm-row2"><button class="alt" data-clear="${m.label}" ${dis}>Recommencer</button><button class="dm-validate" data-ok="${m.label}" ${dis}>Valider</button></div>` : ''}`;
    } else if (m.type === 'arrows') {
      const e = m.pub.entry;
      body = `<div class="dm-code">${Array.from({ length: m.pub.len }, (_, k) => `<span>${e[k] ?? '·'}</span>`).join('')}</div>
        <div class="dm-arrows">${['⬆', '➡', '⬇', '⬅'].map((d) => `<button data-arrow="${m.label}|${d}" ${dis || (e.length >= m.pub.len ? 'disabled' : '')}>${d}&#xFE0E;</button>`).join('')}</div>
        <div class="dm-row2"><button class="alt" data-clear="${m.label}" ${dis}>Effacer</button><button class="dm-validate" data-ok="${m.label}" ${dis}>Valider</button></div>`;
    } else if (m.type === 'thermo') {
      body = `<div class="dm-thermo" style="--t:${THERMO[m.pub.color]}"><span class="dm-tlabel">Thermostat ${esc(m.pub.color.toUpperCase())}</span><span class="dm-temp" data-thermo="${m.label}">${thermoValue(m)}</span><span class="dm-unit">°</span></div>
        <button class="dm-validate" data-ok="${m.label}" ${dis}>Valider maintenant</button>`;
    } else if (m.type === 'switches') {
      body = `<div class="dm-sws">${m.pub.state.map((up, i) => `<button class="dm-sw ${up ? 'up' : ''}" data-sw="${m.label}|${i}" ${dis}><i></i><small>${i + 1}</small></button>`).join('')}</div>
        <button class="dm-validate" data-ok="${m.label}" ${dis}>Valider</button>`;
    }
    return `<div class="${cls}">${lab}${body}</div>`;
  }

  const bombHtml = (g, live, big) => `<div class="dm-bomb ${big ? 'big' : ''}">${bombHead(g.bomb, big)}<div class="dm-mods">${g.bomb.modules.map((m) => moduleHtml(m, live)).join('')}</div></div>`;

  const handHtml = (g) => (!g.hand.length ? '<div class="card center"><p>🧑‍✈️ Tu es le capitaine : aucune fiche ! Écoute les autres et agis.</p></div>' : '') + `<div class="dm-hand">${g.hand.map((c) => `<div class="dm-card"><div class="dm-ctitle">${esc(c.title)}</div><ul>${c.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>`).join('')}
    <p class="muted center" style="font-size:.85rem">Les autres ont les autres fiches : lisez-les à voix haute !</p></div>`;

  const logHtml = (g) => (g.log.length ? `<div class="dm-log">${g.log.map((e) => `<span class="${e.ok ? 'ok' : 'ko'}">${e.pid ? `${e.ok ? '✅' : '💥'} ${name(e.pid)} · ` : ''}${esc(e.what)}</span>`).join('')}</div>` : '');

  // ═══ Écrans ═══
  const RULES = `<div class="rg-rules">
      <div><span class="rg-ico">💣</span><b>La bombe</b><small>sur la télé et sur chaque téléphone ; tout le monde peut agir</small></div>
      <div><span class="rg-ico">📖</span><b>Le manuel</b><small>découpé en fiches : chacun n'a que les siennes</small></div>
      <div><span class="rg-ico">🗣️</span><b>Parlez !</b><small>les règles changent à chaque bombe</small></div>
      <div><span class="rg-ico">✖</span><b>Erreur</b><small>le chrono perd du temps et défile plus vite</small></div>
    </div>`;

  const screens = {
    intro(S, g) {
      const lvl = g.level === 'expert' ? 'Expert 💀' : 'Normal';
      if (S.spectator) {
        return `<div class="rg-title"><span class="rg-art" style="background:#ff7a1a">${ICONS.game('demineur')}</span><div><h1>Le Démineur</h1><p class="white">3 bombes à désamorcer en équipe · difficulté ${lvl}</p></div></div>
          ${RULES}<p class="center white tv-big">${name(S.hostId)} lance le compte à rebours depuis son téléphone 📱</p>`;
      }
      return `<div class="phase"><div class="step">${g.totalRounds} bombes · ${lvl}</div><div class="t">Le Démineur 💣</div></div>
        <div class="card keep">${RULES}<p style="margin-bottom:0">Chaque bombe a plusieurs modules (A, B, C…). Lis tes fiches, écoute celles des autres, et agissez ensemble avant la fin du chrono.</p></div>
        ${UI.hostButton('Armer la bombe ! 💣')}`;
    },

    bomb(S, g) {
      if (S.spectator) {
        const hands = g.players.filter(P).map((id) => `<span class="rg-chip" style="--c:#ffd27a">${av(P(id), 'sm')}${name(id)} · ${g.handCount[id] || 0} fiche${g.handCount[id] > 1 ? 's' : ''}</span>`).join('');
        return `<div class="dm-tv"><div class="rg-hud"><span class="rg-round">Bombe ${g.round}/${g.totalRounds}</span><span class="dm-hands">${hands}</span></div>
          ${bombHtml(g, false, true)}${logHtml(g)}</div>`;
      }
      if (g.me === 'wait') return `<div class="card center"><p>⏳ Tu rejoindras l'équipe à la prochaine bombe.</p></div>${bombHtml(g, false)}`;
      return `<div class="dm-tabs"><button class="${tab === 'bomb' ? 'on' : ''}" data-tab="bomb">💣 Bombe</button><button class="${tab === 'hand' ? 'on' : ''}" data-tab="hand">📖 Mes fiches (${g.hand.length})</button></div>
        ${tab === 'bomb' ? bombHtml(g, true) : `${bombHead(g.bomb)}${handHtml(g)}`}
        ${logHtml(g)}
        ${UI.isHost() ? '<div class="center"><a class="link" data-host-action="next">Abandonner cette bombe</a></div>' : ''}`;
    },

    boom(S, g) {
      const r = g.result;
      const last = g.round >= g.totalRounds;
      const title = r.defused ? `Bombe désamorcée ! 🎉 (${r.left} s restantes)` : r.why === 'stop' ? 'Bombe abandonnée… 🏳️' : r.why === 'time' ? 'BOUM ! Plus de temps 💥' : 'BOUM ! Trop d\'erreurs 💥';
      return `${UI.header(g.round + 1, g.totalRounds + 1, `Bombe ${g.round} sur ${g.totalRounds}`, title)}
        <div class="card"><h2>Les solutions</h2>${g.solutions.map((x) => `<div class="score"><b>${x.label}</b><span class="n">${esc(x.name)} <small class="muted">· ${esc(x.text)}</small></span></div>`).join('')}</div>
        <div class="card"><h2>Points</h2>${UI.scoreboard(g.scores)}</div>
        ${UI.hostButton(last ? 'Voir le podium 🏆' : 'Bombe suivante 💣')}`;
    },

    end: (S, g) => UI.endScreen(g),
  };

  // ═══ Animation : chrono et thermostat ═══
  function anim() {
    raf = 0;
    if (!cur || cur.phase !== 'bomb') return;
    const left = timeLeft();
    const hide = cur.bomb.twist?.id === 'masque' && left > 30000;
    document.querySelectorAll('[data-timer]').forEach((el) => {
      el.textContent = hide ? '??:??' : fmt(left);
      el.classList.toggle('danger', left < 30000);
    });
    for (const m of cur.bomb.modules) {
      if (m.type !== 'thermo' || m.solved || m.pub.mode === 'chrono') continue;
      document.querySelectorAll(`[data-thermo="${m.label}"]`).forEach((el) => { const v = String(thermoValue(m)); if (el.textContent !== v) el.textContent = v; });
    }
    raf = requestAnimationFrame(anim);
  }

  const modKey = (g) => (g.bomb ? g.bomb.modules.map((m) => `${m.label}${m.solved}${m.type === 'thermo' ? '' : JSON.stringify(m.pub)}`).join(';') + g.bomb.strikes : '');

  UI.registerGame('demineur', {
    rules: () => `
      <ol class="rules">
        <li>Jeu <b>en équipe</b> : une bombe s'affiche (sur la télé et sur chaque téléphone) avec plusieurs <b>modules</b>. Tout le monde peut y toucher.</li>
        <li>Le <b>manuel</b> est découpé en fiches réparties entre les joueurs : personne n'a tout. Lisez vos fiches à voix haute et recoupez-les. Les règles <b>changent à chaque bombe</b>.</li>
        <li>Modules : 🔌 câbles, 🎛️ cadran, 🔣 symboles, 🌡️ thermostat, 🎚️ interrupteurs, 🔴 gros bouton, ⬆️ flèches. Chacun a plusieurs façons de se désamorcer : c'est la fiche qui le dit !</li>
        <li>Chaque module a plusieurs <b>variantes</b> tirées au hasard, dont des versions <b>très dures 💀</b> (câbles multiples, code à 4 chiffres, interrupteurs binaires, flèches).</li>
        <li>La bombe <b>grossit avec le nombre de joueurs</b> (jusqu'à 8 modules) et peut cacher un <b>piège</b> : 🔀 fiches tournantes, 🙈 chrono masqué, ⚡ court-circuit.</li>
        <li><b>À 3 joueurs</b>, chaque bombe tire une règle spéciale : 🔒 chacun ses modules, 🏃 relais, 🧑‍✈️ le capitaine, 🤐 le muet, 🃏 fiches anonymes.</li>
        <li>Chaque <b>erreur</b> fait perdre du temps et <b>accélère le chrono</b>. Trop d'erreurs ou plus de temps : BOUM.</li>
      </ol>
      <div class="muted" style="font-size:.92rem">Bombe désamorcée : <b>+60</b> et +1 par 2 s restantes pour toute l'équipe · module désamorcé par toi : <b>+15</b> · erreur : <b>−8</b></div>`,

    key: (S, g) => [g.phase, g.round, S.spectator ? '' : g.me, tab, armed, modKey(g), (g.log || []).length, (g.hand || []).map((c) => c.title).join(',')].join('|'),
    screen: (S, g) => { cur = g; return (screens[g.phase] || screens.intro)(S, g); },
    tv: (S, g) => (screens[g.phase] || screens.intro)(S, g),

    onState: (S, g) => {
      cur = g; recvAt = Date.now();
      if (g.now) offset = g.now - Date.now();
      if (g.phase === 'bomb' && !raf) raf = requestAnimationFrame(anim);
      if (g.phase !== 'bomb') { armed = null; tab = 'bomb'; }
    },

    bind: (S, g, root) => {
      root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; UI.refresh(); }));
      root.querySelectorAll('[data-cut]').forEach((b) => b.addEventListener('click', () => {
        const [m, i] = b.dataset.cut.split('|');
        if (armed === `${m}${i}`) { armed = null; UI.send('cut', { m, i: Number(i) }); }
        else { armed = `${m}${i}`; UI.refresh(); setTimeout(() => { if (armed === `${m}${i}`) { armed = null; UI.refresh(); } }, 3000); }
      }));
      root.querySelectorAll('[data-dial]').forEach((b) => b.addEventListener('click', () => { const [m, d] = b.dataset.dial.split('|'); UI.send('dial', { m, d: Number(d) }); }));
      root.querySelectorAll('[data-ok]').forEach((b) => b.addEventListener('click', () => UI.send('ok', { m: b.dataset.ok })));
      root.querySelectorAll('[data-sym]').forEach((b) => b.addEventListener('click', () => { const [m, i] = b.dataset.sym.split('|'); UI.send('sym', { m, i: Number(i) }); }));
      root.querySelectorAll('[data-key]').forEach((b) => b.addEventListener('click', () => { const [m, d] = b.dataset.key.split('|'); UI.send('key', { m, d: Number(d) }); }));
      root.querySelectorAll('[data-press]').forEach((b) => b.addEventListener('click', () => { navigator.vibrate?.(15); UI.send('press', { m: b.dataset.press }); }));
      root.querySelectorAll('[data-arrow]').forEach((b) => b.addEventListener('click', () => { const [m, d] = b.dataset.arrow.split('|'); UI.send('arrow', { m, d }); }));
      root.querySelectorAll('[data-clear]').forEach((b) => b.addEventListener('click', () => UI.send('clear', { m: b.dataset.clear })));
      root.querySelectorAll('[data-sw]').forEach((b) => b.addEventListener('click', () => { const [m, i] = b.dataset.sw.split('|'); UI.send('sw', { m, i: Number(i) }); }));
    },
  });
})();
