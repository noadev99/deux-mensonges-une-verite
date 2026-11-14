// ─────────────────────────────────────────────────────────────────────────────
// ⛩️ Thème Animé / Manga — contenu des jeux quand l'hôte choisit ce thème.
// Pour ajouter un thème : créer un fichier comme celui-ci et l'ajouter dans
// packOption() (games/_utils.js) + dans le jeu concerné.
// ─────────────────────────────────────────────────────────────────────────────

// 🗳️ Qui de nous ? — « … est le plus susceptible de … »
const QUESTIONS = [
  'devenir Hokage',
  'survivre le plus longtemps face aux Titans',
  'manger un fruit du démon sans réfléchir',
  'crier le nom de son attaque en public',
  'se perdre comme Zoro, même avec un GPS',
  'tomber amoureux d\'un personnage d\'animé',
  'pleurer devant un flashback tragique',
  'avoir un pouvoir complètement cheaté',
  'devenir le grand méchant de l\'histoire',
  'être réincarné en slime dans un isekai',
  'dormir pendant tout un arc d\'entraînement',
  'vouloir attraper tous les Pokémon',
  'trahir l\'équipage pour de l\'argent',
  'avoir un rival secret',
  's\'entraîner 10 ans dans la montagne',
  'faire un cosplay à la Japan Expo',
  'connaître tous les openings par cœur',
  'devenir mangaka',
  'manger 30 bols de ramen d\'affilée',
  'avoir un familier magique ridicule',
  'se transformer en Super Saiyan sous le coup de la colère',
  'utiliser le Death Note pour une broutille',
  'être le personnage secondaire qui vole la vedette',
  'faire un discours sur l\'amitié en plein combat',
  'oublier sa technique secrète en plein combat',
  'rester bloqué dans un jeu vidéo en réalité virtuelle',
  'avoir une coiffure qui défie la gravité',
  'dire « dattebayo » sans s\'en rendre compte',
];

// 🕵️ L'Intrus — mots secrets
const WORDS = [
  'ninja', 'pirate', 'samouraï', 'katana', 'shinigami', 'Pokéball', 'titan', 'robot géant', 'ramen', 'sushi',
  'kimono', 'chakra', 'fruit du démon', 'boule de cristal', 'Super Saiyan', 'Hokage', 'démon', 'sorcier',
  'tournoi', 'rival', 'sensei', 'senpai', 'manga', 'cosplay', 'onigiri', 'temple', 'cerisier', 'Tokyo',
  'kitsune', 'mecha', 'chapeau de paille', 'Death Note', 'dojo', 'sumo', 'bento', 'dragon', 'transformation',
  'épée', 'bandeau', 'école de héros', 'Pikachu', 'Totoro',
];

// 📖 Le Dico des menteurs — vrais mots japonais / de la culture manga
const ENTRIES = [
  ['Itadakimasu', 'Formule japonaise prononcée avant de manger, pour remercier.'],
  ['Senpai', 'Personne plus ancienne ou plus expérimentée, à l\'école ou au travail.'],
  ['Kōhai', 'Personne plus jeune ou moins expérimentée : l\'inverse du senpai.'],
  ['Tsundere', 'Personnage d\'abord froid, voire agressif, qui révèle peu à peu son côté tendre.'],
  ['Yandere', 'Personnage d\'apparence douce dont l\'amour devient obsessionnel et dangereux.'],
  ['Isekai', 'Genre de récit où le héros se retrouve transporté dans un autre monde.'],
  ['Mangaka', 'Auteur ou autrice de mangas.'],
  ['Seiyū', 'Comédien ou comédienne de doublage japonais.'],
  ['Chibi', 'Style de dessin où les personnages ont un petit corps et une très grosse tête.'],
  ['Shōnen', 'Manga destiné en priorité aux jeunes garçons, souvent centré sur l\'action.'],
  ['Shōjo', 'Manga destiné en priorité aux jeunes filles.'],
  ['Sensei', 'Titre de respect donné à un maître, un professeur ou un médecin.'],
  ['Otaku', 'Passionné, souvent à l\'excès, de mangas, d\'animés ou de jeux vidéo.'],
  ['Bentō', 'Repas complet emporté dans une boîte à compartiments.'],
  ['Onigiri', 'Boulette de riz, souvent triangulaire, garnie et enveloppée d\'une feuille d\'algue.'],
  ['Nakama', 'Compagnon, camarade d\'équipe à qui l\'on est très lié.'],
  ['Sugoi', 'Exclamation japonaise qui signifie « incroyable », « génial ».'],
  ['Oni', 'Démon ou ogre de la mythologie japonaise, souvent cornu.'],
  ['Kitsune', 'Renard de la mythologie japonaise doté de pouvoirs magiques.'],
  ['Mecha', 'Genre d\'histoires qui met en scène de grands robots pilotés.'],
  ['Omake', 'Bonus ajouté à la fin d\'un épisode ou d\'un volume de manga.'],
  ['Tankōbon', 'Volume relié qui rassemble plusieurs chapitres d\'un manga.'],
  ['Dōjinshi', 'Manga publié par des amateurs, souvent une parodie d\'une œuvre connue.'],
  ['Furigana', 'Petits caractères écrits au-dessus des kanjis pour en indiquer la lecture.'],
  ['Shinigami', 'Dieu de la mort dans la culture japonaise.'],
  ['Yōkai', 'Créature surnaturelle du folklore japonais (esprit, monstre…).'],
  ['Kawaii', 'Mignon, adorable.'],
  ['Mochi', 'Petite pâtisserie japonaise à base de riz gluant écrasé.'],
];

// ✍️ La Chute — phrases à trou
const PROMPTS = [
  'Le fruit du démon le plus nul de One Piece : ___.',
  'Ce que Goku mange vraiment au petit-déjeuner : ___.',
  'Le pire nom d\'attaque spéciale : « ___ ! »',
  'Ce que Naruto a vraiment appris à l\'Académie : ___.',
  'Le nouveau Pokémon le plus inutile : ___.',
  'Ce qui est écrit à la première page du Death Note : « ___ ».',
  'Le pire Alter de héros : ___.',
  'Ce que crie un héros d\'animé juste avant de perdre : « ___ ! »',
  'Le titre du prochain isekai : « Réincarné en ___ ».',
  'La vraie raison pour laquelle Luffy n\'a toujours pas trouvé le One Piece : ___.',
  'Ce que le vieux maître enseigne le premier jour : ___.',
  'Ce qu\'un Titan pense vraiment : « ___ ».',
  'La technique secrète interdite de ma famille : ___.',
  'Le pire familier magique : ___.',
  'Ce que fait un ninja pendant ses jours de congé : ___.',
  'Le méchant de shōnen le moins effrayant : ___.',
  'Les derniers mots les plus tragiques de l\'histoire des animés : « ___ ».',
  'La 8ᵉ boule de cristal permettrait de ___.',
  'Ce que les Pokémon se disent vraiment entre eux : « ___ ».',
  'La pire raison de se transformer en Super Saiyan : ___.',
  'Ce qu\'il ne faut jamais dire à son senpai : « ___ ».',
  'Le nom de mon robot géant : « ___ ».',
  'Ce que Zoro cherchait vraiment quand il s\'est perdu : ___.',
  'Le pire cosplay à la Japan Expo : ___.',
];

// 💣 Patate chaude — catégories
const CATEGORIES = [
  'Des personnages de One Piece', 'Des Pokémon', 'Des personnages de Naruto', 'Des personnages de Dragon Ball',
  'Des animés', 'Des mangas', 'Des attaques spéciales', 'Des personnages de Demon Slayer',
  'Des héros de My Hero Academia', 'Des mots japonais', 'Des plats japonais', 'Des méchants d\'animé',
  'Des films du studio Ghibli', 'Des personnages de Jujutsu Kaisen', 'Des personnages de L\'Attaque des Titans',
  'Des pouvoirs magiques', 'Des armes d\'animé', 'Des personnages de Hunter x Hunter', 'Des jeux vidéo japonais',
  'Des personnages de Sailor Moon', 'Des types de Pokémon', 'Des villes du Japon',
];

// 🏅 Le Classement — « Qui … ? »
const THEMES = [
  'ferait le meilleur Hokage', 'survivrait le plus longtemps face aux Titans', 'aurait le fruit du démon le plus puissant',
  'serait le meilleur capitaine pirate', 'gagnerait le tournoi d\'arts martiaux', 'ferait le meilleur méchant d\'animé',
  'aurait la plus longue scène de transformation', 'serait le meilleur dresseur Pokémon', 'serait le plus tsundere',
  'pleurerait le plus devant un animé', 'serait le meilleur sensei', 'se perdrait le plus vite (comme Zoro)',
  's\'en sortirait le mieux dans un isekai', 'ferait le meilleur personnage secondaire', 'aurait le cri d\'attaque le plus gênant',
  'serait le meilleur pilote de robot géant', 'est le plus otaku', 'ferait le meilleur chasseur de démons',
  'mangerait le plus de ramen', 'ferait le meilleur ninja',
];

module.exports = { QUESTIONS, WORDS, ENTRIES, PROMPTS, CATEGORIES, THEMES };
