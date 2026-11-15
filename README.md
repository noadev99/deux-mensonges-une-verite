# 🎉 Soirée Jeux

Plateforme de jeux de soirée entre amis, chacun sur son téléphone.

**▶️ Jouer en ligne : https://deux-mensonges-une-verite.onrender.com**

## Fonctionnement
- **QR code** : scanne-le pour rejoindre un salon.
- **Mode salon** : ouvre `/?ecran=CODE` sur une télé ou un ordi : le jeu s'affiche en grand, les téléphones servent de manettes. Rien de secret ne s'affiche sur l'écran.
- **Soirée enchaînée** : l'hôte choisit une durée (20 min à 2 h) ou les jeux à jouer, et 3 à 5 manches par jeu ; les jeux s'enchaînent tout seuls. Points du marathon : 10 pour le 1er de chaque jeu, 1 pour le dernier.
- **Bouille personnalisée** : avant d'entrer, chacun choisit sa bouille (couleur, yeux, bouche, accessoire), modifiable dans le salon.
- **Réponses à l'oral** (réglage de l'hôte) : Note secrète, 2 Mensonges, L'Intrus et Patate chaude se jouent à voix haute.
- Un salon (code à 4 lettres) pour toute la soirée : l'hôte choisit un jeu, on joue, on revient au salon, on enchaîne.
- **Classement de la soirée** : à chaque partie, le 1er gagne autant de points qu'il y a de joueurs, le dernier 1 point.
- Reconnexion automatique si on recharge la page ou perd le réseau.

## Jeux
| Jeu | Joueurs |
|---|---|
| 🎭 2 Mensonges, 1 Vérité — devine qui a écrit, puis la vraie anecdote | 3–16 |
| 🗳️ Qui de nous ? — « qui est le plus susceptible de… », vote secret | 3–16 |
| 🕵️ L'Intrus — tout le monde connaît le mot sauf un (ou mode Notes : même note sur 10 sauf un) | 3–12 |
| 📖 Le Dico des menteurs — fausses définitions de vrais mots rares | 3–12 |
| ✍️ La Chute — phrases à trou, vote pour la réponse la plus drôle | 3–16 |
| 💣 Patate chaude — réponds vite avant que la bombe explose (l'hôte peut annuler une réponse) | 3–12 |
| 🏅 Le Classement — devine comment le juge classe la bande | 3–8 |
| 🎨 Dessin en chaîne — dessine, devine, redessine… et regarde le message dériver | 3–10 |
| 🎚️ Note secrète — une note sur 10 à faire deviner : en racontant une histoire, ou en répondant à un interrogatoire | 3–12 |
| 💰 Le Butin — en duo devant un butin : partager ou trahir pour tout prendre | 3–16 |
| 🗡️ Le Complot — des traîtres cachés sabotent vos missions, démasquez-les | 5–10 |
| 🤝 Les Alliances — alliances secrètes, coffres communs… puis fidèle ou poignard | 3–10 |
| 🧼 Le ring savonneux — action en temps réel sur la télé : les téléphones sont des manettes (joystick + A/B) | 2–6 |
| 🖼️ L'Image cachée — 10 images à l'écran, tous ont la même sauf un qui n'a rien : démasquez-le | 3–12 |
| ⛩️ Trombi manga — un joueur choisit un perso parmi 158 (ou au hasard), les autres posent des questions oui/non et tapent son nom | 2–10 |

## Lancer en local
```bash
npm install
npm start
```
http://localhost:3000 (ou l'adresse Wi-Fi affichée dans le terminal).

## Structure
```
server.js                 cœur : salons, joueurs, hôte, classement de soirée
games/index.js            registre des jeux
games/<jeu>.js            règles et points d'un jeu (serveur)
public/js/core.js         cœur client : accueil, salon, choix du jeu
public/games/<jeu>.js     écrans d'un jeu
public/css/style.css      style commun
```
Ajouter un jeu : voir [games/README.md](games/README.md).
