// Registre des jeux. Pour ajouter un jeu : créer games/mon-jeu.js (serveur)
// + public/games/mon-jeu.js (affichage), puis l'ajouter à la liste ci-dessous.
const list = [
  require('./deux-mensonges'),
  require('./qui-de-nous'),
  require('./intrus'),
  require('./dico'),
  require('./chute'),
  require('./patate'),
  require('./classement'),
  require('./dessin'),
  require('./note'),
  require('./butin'),
  require('./complot'),
  require('./alliances'),
  require('./ring'),
];

module.exports = Object.fromEntries(list.map((g) => [g.id, g]));
