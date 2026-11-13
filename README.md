# 🎭 2 Mensonges, 1 Vérité

Jeu multijoueur (3 à 16 joueurs) dans le navigateur, sur téléphone ou ordinateur.

**▶️ Jouer en ligne : https://deux-mensonges-une-verite.onrender.com**

## Lancer
```bash
npm install
npm start
```
Puis ouvrir http://localhost:3000. Les amis sur le même Wi-Fi utilisent l'adresse `http://192.168.x.x:3000` affichée dans le terminal.

## Déroulement
1. Chacun écrit 3 anecdotes (2 fausses, 1 vraie).
2. Pour chaque joueur : ses anecdotes s'affichent sans son nom → tout le monde vote « qui a écrit ça ? » (l'auteur vote aussi, pour faire diversion).
3. Révélation de l'auteur → vote « laquelle est vraie ? ».

## Barème (modifiable dans `server.js`, objet `PTS`)
| Action | Points |
|---|---|
| Reconnaître l'auteur | +100 |
| Trouver la vraie anecdote | +100 |
| Les deux sur la même manche (Double détective) | +50 |
| Auteur : par joueur qui ne t'a pas reconnu (Incognito) | +50 |
| Auteur : personne ne t'a reconnu (Fantôme) | +100 |
| Auteur : par joueur berné par un mensonge | +75 |
| Auteur : personne n'a trouvé la vérité (Mensonge parfait) | +150 |
| Accusé à tort (par vote) | +25 |

Trophées de fin : Sherlock, Détecteur de mensonges, Grand Mytho, Caméléon, Suspect n°1.
