// ─────────────────────────────────────────────────────────────────────────────
// 🗡️ Le Tueur silencieux — affichage du jeu de fond.
// • une carte dans le salon (lancer / suivre la partie / résultats)
// • un bouton 🗡️ flottant sur le téléphone, visible même pendant les autres jeux,
//   qui ouvre sa mission secrète
// • une fenêtre qui s'ouvre toute seule quand quelqu'un dit t'avoir eu
// ─────────────────────────────────────────────────────────────────────────────
window.TUEUR_UI = (() => {
  const { esc, P, av, name } = UI;
  let open = false;     // panneau de mission ouvert
  let peek = false;     // mission dévoilée (cachée par défaut, pour les regards indiscrets)
  let lastN = null;

  const T = () => UI.state?.tueur;
  const send = (type) => UI.emit('tueur', type);
  const ago = (at) => { const m = Math.round((Date.now() - at) / 60000); return m < 1 ? 'à l\'instant' : `il y a ${m} min`; };

  const feed = (t, max = 6) => t.feed.length
    ? `<div class="tu-feed">${t.feed.slice(0, max).map((f) => `<div class="tu-f">🗡️ <b>${name(f.killer)}</b> a éliminé <b>${name(f.victim)}</b><small>« ${esc(f.mission)} » · ${ago(f.at)}</small></div>`).join('')}</div>`
    : '<p class="muted" style="margin:6px 0 0">Personne n\'est encore tombé… méfiez-vous de tout le monde 👀</p>';

  const ranking = (t) => [...t.players].sort((a, b) => (t.kills[b] || 0) - (t.kills[a] || 0)).map((id) => `
    <div class="score">${av(P(id))}<span class="n">${name(id)}${id === t.winner ? ' 👑' : t.dead[id] ? ' ☠️' : ''}</span>
      ${t.points?.[id] ? `<span class="plus">+${t.points[id]}</span>` : ''}<span class="p">🗡️ ${t.kills[id] || 0}</span></div>`).join('');

  const rules = `<ol class="rules tu-rules">
      <li>Chacun reçoit en secret une <b>cible</b> et une <b>mission</b> (lui faire dire un mot, lui faire toucher son nez…).</li>
      <li>Ça se joue <b>pendant toute la soirée</b>, en même temps que les autres jeux : bouton 🗡️ en bas de l'écran.</li>
      <li>Mission réussie ? Déclare-la : ta cible confirme, elle est éliminée et tu récupères <b>sa cible et sa mission</b>.</li>
      <li>Le dernier en vie gagne. Points de soirée : <b>+2</b> par élimination, <b>+4</b> au survivant.</li>
    </ol>`;

  // ─── Carte dans le salon ───
  function card() {
    const S = UI.state, t = T();
    if (!S) return '';
    if (!t) {
      if (!UI.isHost() || S.spectator) return '';
      const n = S.players.filter((p) => p.connected && !p.kb).length;
      return `<div class="card tu-card"><div class="cardhead"><h2>🗡️ Le Tueur silencieux</h2><span class="muted">jeu de fond</span></div>
        <p class="muted" style="margin:0 0 8px">À lancer en début de soirée : il continue pendant tous les autres jeux.</p>
        <details class="gp-rules"><summary>Comment on joue ?</summary>${rules}</details>
        <button class="full" data-tu="start" ${n < 4 ? 'disabled' : ''}>${n < 4 ? `Il faut 4 joueurs (vous êtes ${n})` : '🗡️ Lancer pour toute la soirée'}</button></div>`;
    }
    if (t.over) {
      return `<div class="card tu-card"><div class="cardhead"><h2>🗡️ Le Tueur silencieux</h2><span class="muted">terminé</span></div>
        ${t.winner ? `<div class="center">${av(P(t.winner), 'lg')}<h2 style="margin:6px 0">${name(t.winner)} est le dernier survivant 👑</h2></div>` : `<p class="center">${t.stopped ? 'Partie arrêtée par l\'hôte.' : 'Plus personne en vie !'}</p>`}
        ${ranking(t)}
        ${UI.isHost() && !S.spectator ? '<div class="row" style="margin-top:10px"><button class="ghost" data-tu="close">Fermer</button><button data-tu="start">🗡️ Relancer</button></div>' : ''}</div>`;
    }
    const me = t.inGame && !S.spectator;
    return `<div class="card tu-card"><div class="cardhead"><h2>🗡️ Le Tueur silencieux</h2><span class="muted">${t.aliveCount} en vie sur ${t.players.length}</span></div>
      ${me ? `<button class="full" data-tu-open>${S.tueur.me?.dead ? '☠️ Tu es éliminé(e) : voir la partie' : '🤫 Voir ma mission secrète'}</button>` : t.inGame ? '' : '<p class="muted" style="margin:0">La partie a été lancée sans toi : tu pourras jouer à la prochaine.</p>'}
      ${feed(t)}
      ${UI.isHost() && !S.spectator ? '<p class="center" style="margin-bottom:0"><a class="link" data-tu="stop">Arrêter Le Tueur silencieux</a></p>' : ''}</div>`;
  }

  // ─── Panneau de mission ───
  function panel(t) {
    const me = t.me;
    let body;
    if (t.over) {
      body = `<h2>🗡️ Partie terminée</h2>${t.winner ? `<p>${name(t.winner)} est le dernier survivant 👑</p>` : ''}${ranking(t)}`;
    } else if (me.dead) {
      body = `<h2>☠️ Tu es éliminé(e)</h2><p>${name(me.dead.by)} t'a eu avec : <b>« ${esc(me.dead.mission)} »</b></p>
        <p class="muted">Chut ! Ne dis à personne qui t'a eu… Encore ${t.aliveCount} en vie.</p>${feed(t, 4)}`;
    } else {
      body = `<div class="muted">Ta cible</div>
        <div class="tu-target">${av(P(me.target), 'lg')}<b>${name(me.target)}</b></div>
        <div class="muted">Ta mission</div>
        <button class="tu-mission ${peek ? 'on' : ''}" data-tu-peek>${peek ? esc(me.mission) : '👆 Touche pour voir (cache l\'écran !)'}</button>
        ${me.pendingOut ? `<p class="tu-wait">⏳ ${name(me.target)} doit confirmer… (validé tout seul au bout d'1 min 30)</p>`
          : `<button class="full" data-tu-claim>✅ Mission réussie !</button>`}
        ${me.rerolled ? '' : '<p class="center" style="margin:8px 0 0"><a class="link" data-tu="reroll">🔄 Mission impossible ? En changer (une seule fois)</a></p>'}
        <p class="muted" style="font-size:.85rem">Quelqu'un te vise aussi… Encore ${t.aliveCount} en vie.</p>`;
    }
    return `<div class="tu-panel card"><button class="tu-x" data-tu-close aria-label="Fermer">✕</button>${body}</div>`;
  }

  // ─── Fenêtre « on t'a eu ? » ───
  const claimBox = (c) => `<div class="tu-panel card tu-claim"><h2>🗡️ ${name(c.killer)} dit t'avoir eu !</h2>
      <p>Sa mission : <b>« ${esc(c.mission)} »</b></p><p class="muted">C'est vrai ? Sois fair-play 😇</p>
      <div class="row"><button class="ghost" data-tu="deny">Non, c'est faux</button><button data-tu="confirm">Oui, je suis éliminé(e) ☠️</button></div></div>`;

  function el(id, cls) {
    let e = document.getElementById(id);
    if (!e) { e = document.createElement('div'); e.id = id; e.className = cls; document.body.appendChild(e); }
    return e;
  }

  function sync() {
    const S = UI.state, t = T();
    const on = !!(S && t && t.inGame && !S.spectator && (!t.over || open));
    const fab = el('tu-fab', 'tu-fab'), lay = el('tu-layer', 'tu-layer');
    if (t && lastN !== t.n) { lastN = t.n; peek = false; }
    if (!on) { fab.hidden = true; lay.hidden = true; lay.innerHTML = ''; return; }
    const me = t.me || {};
    fab.hidden = false;
    fab.innerHTML = `<button class="tu-fabbtn ${me.dead ? 'dead' : ''} ${me.claimOnMe ? 'alert' : ''}" data-tu-open aria-label="Le Tueur silencieux">${me.dead ? '☠️' : '🗡️'}</button>`;
    const html = me.claimOnMe ? claimBox(me.claimOnMe) : open ? panel(t) : '';
    lay.hidden = !html;
    if (lay.dataset.html !== html) { lay.dataset.html = html; lay.innerHTML = html; }
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tu], [data-tu-open], [data-tu-close], [data-tu-peek], [data-tu-claim]');
    if (!b) { if (e.target.id === 'tu-layer' && !T()?.me?.claimOnMe) { open = false; sync(); } return; }
    if (b.dataset.tuOpen != null) { open = !open; peek = false; return sync(); }
    if (b.dataset.tuClose != null) { open = false; return sync(); }
    if (b.dataset.tuPeek != null) { peek = !peek; return sync(); }
    if (b.dataset.tuClaim != null) {
      const t = T();
      if (t?.me && confirm(`Tu as vraiment réussi ta mission sur ${P(t.me.target)?.name} ? Il/elle va devoir confirmer.`)) send('claim');
      return;
    }
    const type = b.dataset.tu;
    if (type === 'stop' && !confirm('Arrêter Le Tueur silencieux pour tout le monde ?')) return;
    if (type === 'confirm' || type === 'deny') open = false;
    send(type);
  });

  return { card, sync };
})();
