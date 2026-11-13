// Registre des jeux. Pour ajouter un jeu : créer games/mon-jeu.js (serveur)
// + public/games/mon-jeu.js (affichage), puis l'ajouter à la liste ci-dessous.
const list = [
  require('./deux-mensonges'),
];

module.exports = Object.fromEntries(list.map((g) => [g.id, g]));
