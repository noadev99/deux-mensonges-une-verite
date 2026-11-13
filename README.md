# 🎉 Soirée Jeux

Plateforme de jeux de soirée entre amis, chacun sur son téléphone.

**▶️ Jouer en ligne : https://deux-mensonges-une-verite.onrender.com**

## Fonctionnement
- Un salon (code à 4 lettres) pour toute la soirée : l'hôte choisit un jeu, on joue, on revient au salon, on enchaîne.
- **Classement de la soirée** : à chaque partie, le 1er gagne autant de points qu'il y a de joueurs, le dernier 1 point.
- Reconnexion automatique si on recharge la page ou perd le réseau.

## Jeux
| Jeu | Joueurs |
|---|---|
| 🎭 2 Mensonges, 1 Vérité | 3–16 |

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
