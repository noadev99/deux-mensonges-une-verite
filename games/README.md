# Ajouter un jeu

Un jeu = **2 fichiers** + 2 lignes d'enregistrement. Le cœur (salons, joueurs,
reconnexion, hôte, classement de soirée) est déjà géré.

## 1. Serveur : `games/mon-jeu.js`
```js
module.exports = {
  id: 'mon-jeu', name: 'Mon Jeu', emoji: '🎲',
  tagline: 'Une phrase d’accroche', description: '…',
  minPlayers: 3, maxPlayers: 12, duration: '15 min',

  create(ctx) { return { phase: 'intro', scores: {} } },        // état initial
  onAction(ctx, g, playerId, type, payload, { isHost }) {},     // actions des joueurs ; retourner { error } pour refuser
  onPlayersChanged(ctx, g) {},                                  // (optionnel) quelqu'un part / revient
  stateFor(ctx, g, playerId) { return { phase: g.phase } },     // ce que CE joueur a le droit de voir
};
```
- `ctx.player(id)`, `ctx.players()`, `ctx.connected()`
- Quand la partie est finie : `ctx.endGame(g.scores)` → distribue les points de soirée.
- Ne jamais envoyer de secret dans `stateFor` (réponses des autres, rôles…).

Puis l'ajouter dans `games/index.js`.

## 2. Affichage : `public/games/mon-jeu.js`
```js
UI.registerGame('mon-jeu', {
  rules: () => '<p>…</p>',                  // affiché dans le salon
  key: (S, g) => g.phase,                   // l'écran est redessiné quand la clé change
  screen: (S, g) => '<div class="card">…</div>',
  live: { compteur: (S, g) => '…' },        // zones <div data-live="compteur"> mises à jour à chaque état
  bind: (S, g, root) => {},                 // brancher les clics → UI.send('type', payload)
});
```
Helpers : `UI.esc`, `UI.P(id)`, `UI.av(joueur)`, `UI.name(id)`, `UI.isHost()`, `UI.send()`,
`UI.toast()`, `UI.hostButton(label)`, `UI.forceLink(label)`, `UI.scoreboard(scores)`,
`UI.podium(scores)`, `UI.endFooter()` (boutons Rejouer / Changer de jeu).

Puis ajouter `<script src="/games/mon-jeu.js"></script>` dans `public/index.html`.
