// ─────────────────────────────────────────────────────────────────────────────
// 🔔 Le Buzzer — quiz de rapidité.
// Une question s'affiche, SANS propositions. Le premier qui buzze dit sa réponse à voix
// haute (ou l'écrit) et le maître du jeu (l'hôte) valide ✅ ou refuse ❌ :
// bonne réponse = points, mauvaise = points en moins et il ne peut plus buzzer sur
// cette question (les autres reprennent la main).
// Maître du jeu : par défaut l'hôte anime sans jouer (il voit les réponses) ; en mode
// « l'hôte joue aussi », il ne voit la réponse qu'une fois que quelqu'un a buzzé
// (et ne peut alors plus buzzer sur cette question).
// Types de questions :
//   🧠 culture générale (la bonne réponse est en 2ᵉ position, les autres ne servent plus)
//   📏 estimation : tout le monde tape un nombre, le plus proche gagne
//   🙋 « sur nous » : au début, chacun répond en secret à 3 petits « plutôt ceci ou cela ? »,
//      puis il faut deviner ce qu'a répondu un ami (lui ne peut pas buzzer)
// Les 3 dernières questions valent DOUBLE.
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle, sample, gain, applyGains, awards, active, initScores } = require('./_utils');

// [question, bonne réponse, 3 mauvaises]
const QCM = [
  ['Quelle est la capitale de l\'Australie ?', 'Canberra', 'Sydney', 'Melbourne', 'Perth'],
  ['Combien de pattes a une araignée ?', '8', '6', '10', '12'],
  ['Quel est le plus grand océan du monde ?', 'Le Pacifique', 'L\'Atlantique', 'L\'océan Indien', 'L\'Arctique'],
  ['Qui a peint La Joconde ?', 'Léonard de Vinci', 'Michel-Ange', 'Raphaël', 'Botticelli'],
  ['Combien de joueurs une équipe de foot a-t-elle sur le terrain ?', '11', '10', '12', '9'],
  ['Quelle planète est surnommée « la planète rouge » ?', 'Mars', 'Jupiter', 'Vénus', 'Saturne'],
  ['En quelle année l\'homme a-t-il marché sur la Lune pour la première fois ?', '1969', '1965', '1972', '1959'],
  ['Quel est le symbole chimique de l\'or ?', 'Au', 'Or', 'Ag', 'Go'],
  ['Combien de côtés a un hexagone ?', '6', '5', '8', '7'],
  ['Quel est l\'animal terrestre le plus rapide ?', 'Le guépard', 'Le lion', 'L\'antilope', 'Le lévrier'],
  ['Quelle langue parle-t-on au Brésil ?', 'Le portugais', 'L\'espagnol', 'Le brésilien', 'L\'anglais'],
  ['Dans quel pays se trouve le Machu Picchu ?', 'Le Pérou', 'Le Mexique', 'La Bolivie', 'Le Chili'],
  ['Quel est l\'os le plus long du corps humain ?', 'Le fémur', 'Le tibia', 'L\'humérus', 'Le radius'],
  ['Combien de minutes y a-t-il dans une journée ?', '1 440', '1 240', '1 640', '2 400'],
  ['Quelle est la capitale du Canada ?', 'Ottawa', 'Toronto', 'Montréal', 'Vancouver'],
  ['Quel gaz les plantes absorbent-elles pour faire la photosynthèse ?', 'Le dioxyde de carbone', 'L\'oxygène', 'L\'azote', 'L\'hélium'],
  ['Qui a écrit « Les Misérables » ?', 'Victor Hugo', 'Émile Zola', 'Honoré de Balzac', 'Gustave Flaubert'],
  ['Combien de cordes a une guitare classique ?', '6', '4', '5', '7'],
  ['Quel est le plus long fleuve de France ?', 'La Loire', 'La Seine', 'Le Rhône', 'La Garonne'],
  ['Avec combien de pays la France métropolitaine a-t-elle une frontière terrestre ?', '8', '6', '7', '9'],
  ['Quel est le plus petit pays du monde ?', 'Le Vatican', 'Monaco', 'Saint-Marin', 'Le Liechtenstein'],
  ['De quelle couleur est la « boîte noire » d\'un avion ?', 'Orange', 'Noire', 'Rouge', 'Jaune'],
  ['Combien de temps met la lumière du Soleil pour arriver sur Terre ?', 'Environ 8 minutes', 'Environ 8 secondes', 'Environ 1 heure', 'Environ 1 jour'],
  ['Quel pays a offert la statue de la Liberté aux États-Unis ?', 'La France', 'Le Royaume-Uni', 'L\'Espagne', 'L\'Italie'],
  ['Quel est l\'animal national de l\'Écosse ?', 'La licorne', 'Le lion', 'Le cerf', 'L\'aigle'],
  ['Combien de cœurs a une pieuvre ?', '3', '1', '2', '8'],
  ['Dans quel sport frappe-t-on un volant avec une raquette ?', 'Le badminton', 'Le tennis', 'Le squash', 'Le ping-pong'],
  ['Quelle est la monnaie du Japon ?', 'Le yen', 'Le yuan', 'Le won', 'La roupie'],
  ['Quel métal est liquide à température ambiante ?', 'Le mercure', 'Le plomb', 'L\'étain', 'L\'aluminium'],
  ['Combien d\'os compte le squelette d\'un adulte ?', '206', '186', '226', '306'],
  ['Quelle mer borde Marseille ?', 'La Méditerranée', 'La Manche', 'La mer du Nord', 'La mer Noire'],
  ['Combien de couleurs compte-t-on traditionnellement dans un arc-en-ciel ?', '7', '5', '6', '8'],
  ['Quel est le plus haut sommet du monde ?', 'L\'Everest', 'Le K2', 'Le mont Blanc', 'Le Kilimandjaro'],
  ['Qui a composé « La Lettre à Élise » ?', 'Beethoven', 'Mozart', 'Chopin', 'Bach'],
  ['Combien de joueurs une équipe de rugby à XV a-t-elle sur le terrain ?', '15', '13', '11', '16'],
  ['Quel est l\'ingrédient principal du guacamole ?', 'L\'avocat', 'Le concombre', 'Les petits pois', 'La courgette'],
  ['Dans quelle ville se trouve le Colisée ?', 'Rome', 'Athènes', 'Naples', 'Istanbul'],
  ['Quelle langue a le plus de locuteurs natifs au monde ?', 'Le chinois mandarin', 'L\'anglais', 'L\'espagnol', 'L\'hindi'],
  ['Quel est le plus grand organe du corps humain ?', 'La peau', 'Le foie', 'Les poumons', 'Le cerveau'],
  ['Combien de temps dure un match de foot, hors prolongations ?', '90 minutes', '80 minutes', '100 minutes', '60 minutes'],
  ['Quelle est la capitale de la Turquie ?', 'Ankara', 'Istanbul', 'Izmir', 'Antalya'],
  ['Combien de zéros y a-t-il dans un million ?', '6', '5', '7', '9'],
  ['Avec le lait de quel animal fait-on le roquefort ?', 'La brebis', 'La vache', 'La chèvre', 'La bufflonne'],
  ['Quel est le plus grand désert chaud du monde ?', 'Le Sahara', 'Le Gobi', 'Le Kalahari', 'L\'Atacama'],
  ['Quel continent compte le plus de pays ?', 'L\'Afrique', 'L\'Asie', 'L\'Europe', 'L\'Amérique'],
  ['Combien de dents a un adulte, dents de sagesse comprises ?', '32', '28', '30', '36'],
  ['Qui a découvert la pénicilline ?', 'Alexander Fleming', 'Louis Pasteur', 'Marie Curie', 'Robert Koch'],
  ['Combien de pièces chaque joueur a-t-il au début d\'une partie d\'échecs ?', '16', '12', '18', '20'],
  ['Quelle est la planète la plus proche du Soleil ?', 'Mercure', 'Vénus', 'Mars', 'La Terre'],
  ['Dans quel pays sont nés les Jeux olympiques antiques ?', 'La Grèce', 'L\'Italie', 'L\'Égypte', 'La France'],
  ['Que mange surtout le panda géant ?', 'Du bambou', 'De l\'eucalyptus', 'Du riz', 'Des poissons'],
  ['Combien de secondes y a-t-il dans une heure ?', '3 600', '360', '6 000', '1 800'],
  ['Quelle ville est surnommée « la Ville Lumière » ?', 'Paris', 'Lyon', 'New York', 'Las Vegas'],
  ['Combien d\'étoiles y a-t-il sur le drapeau européen ?', '12', '15', '27', '10'],
  ['Quelle est la plus grande planète du système solaire ?', 'Jupiter', 'Saturne', 'Neptune', 'Uranus'],
  ['Quelle est la date de la fête nationale française ?', 'Le 14 juillet', 'Le 8 mai', 'Le 11 novembre', 'Le 1er mai'],
  ['Quel verbe désigne le cri du corbeau ?', 'Croasser', 'Il hulule', 'Il jacasse', 'Il roucoule'],
  ['Combien de notes différentes compte la gamme do, ré, mi… ?', '7', '8', '6', '12'],
  ['Quel est le pays le plus peuplé du monde depuis 2023 ?', 'L\'Inde', 'La Chine', 'Les États-Unis', 'L\'Indonésie'],
  ['Combien de jours compte une année bissextile ?', '366', '365', '364', '367'],
  ['Quel est le plus grand pays du monde en superficie ?', 'La Russie', 'Le Canada', 'La Chine', 'Les États-Unis'],
  ['Quelle est la capitale du Maroc ?', 'Rabat', 'Casablanca', 'Marrakech', 'Fès'],
  ['Combien de lettres compte l\'alphabet français ?', '26', '24', '25', '28'],
  ['Quel est le petit d\'une biche ?', 'Le faon', 'Le chevreau', 'Le marcassin', 'Le lapereau'],
  ['De quel pays vient la pizza ?', 'L\'Italie', 'La Grèce', 'L\'Espagne', 'Les États-Unis'],
  ['Combien y a-t-il de continents (découpage habituel en France) ?', '5', '4', '6', '7'],
  ['Dans quel organe se trouve l\'iris ?', 'L\'œil', 'L\'oreille', 'Le cœur', 'Le cerveau'],
  ['Quel est l\'animal le plus grand du monde ?', 'La baleine bleue', 'L\'éléphant', 'La girafe', 'Le requin-baleine'],
  ['Combien de faces a un dé classique ?', '6', '4', '8', '12'],
  ['Quel est le point d\'ébullition de l\'eau au niveau de la mer ?', '100 °C', '90 °C', '120 °C', '80 °C'],
  ['Quel est le plus long fleuve d\'Afrique ?', 'Le Nil', 'Le Congo', 'Le Niger', 'Le Zambèze'],
  ['Quelle est la capitale de l\'Allemagne ?', 'Berlin', 'Munich', 'Francfort', 'Hambourg'],
  ['Combien de cartes compte un jeu classique (sans jokers) ?', '52', '54', '32', '48'],
  ['Quel est l\'instrument de mesure de la pression atmosphérique ?', 'Le baromètre', 'Le thermomètre', 'L\'anémomètre', 'Le sismographe'],
];

// [question, réponse, unité]
const ESTIM = [
  ['Quelle est la hauteur de la tour Eiffel (antennes comprises) ?', 330, 'mètres'],
  ['En quelle année a eu lieu la prise de la Bastille ?', 1789, ''],
  ['Combien de pays sont membres de l\'ONU ?', 193, 'pays'],
  ['À combien de degrés Fahrenheit l\'eau bout-elle ?', 212, '°F'],
  ['Quelle est l\'altitude du mont Blanc ?', 4806, 'mètres'],
  ['Combien de touches a un piano classique ?', 88, 'touches'],
  ['En quelle année est sorti le premier iPhone ?', 2007, ''],
  ['Combien la France compte-t-elle de départements (outre-mer compris) ?', 101, 'départements'],
  ['Combien d\'habitants compte la France (en millions) ?', 68, 'millions'],
  ['Quelle est la profondeur de la fosse des Mariannes ?', 10994, 'mètres'],
  ['En quelle année le mur de Berlin est-il tombé ?', 1989, ''],
  ['Combien de cases compte un échiquier ?', 64, 'cases'],
  ['Combien de kilomètres fait un marathon (arrondi) ?', 42, 'km'],
  ['En quelle année a eu lieu la première Coupe du monde de football ?', 1930, ''],
  ['Combien de cartes compte un jeu de tarot ?', 78, 'cartes'],
  ['Quel est le diamètre de la Terre ?', 12742, 'km'],
  ['En quelle année est né Napoléon Bonaparte ?', 1769, ''],
  ['Combien d\'étapes compte habituellement le Tour de France ?', 21, 'étapes'],
  ['Quelle est la distance moyenne entre la Terre et la Lune ?', 384400, 'km'],
  ['Combien de battements par minute fait un cœur adulte au repos, en moyenne ?', 70, 'battements'],
  ['En quelle année a été inaugurée la tour Eiffel ?', 1889, ''],
  ['Combien de pays compte l\'Union européenne (en 2025) ?', 27, 'pays'],
  ['Combien de kilomètres mesure la Seine ?', 777, 'km'],
];

// 🔥 Questions difficiles [question, bonne réponse, 3 mauvaises]
const QCM_HARD = [
  ['Quelle est la capitale de l\'Islande ?', 'Reykjavik', 'Oslo', 'Helsinki', 'Nuuk'],
  ['Quelle est la capitale du Vietnam ?', 'Hanoï', 'Hô Chi Minh-Ville', 'Phnom Penh', 'Vientiane'],
  ['Quel est l\'élément le plus abondant dans l\'univers ?', 'L\'hydrogène', 'L\'hélium', 'L\'oxygène', 'Le carbone'],
  ['Quel est le symbole chimique de l\'argent ?', 'Ag', 'Ar', 'Au', 'Si'],
  ['Qui a écrit « Le Comte de Monte-Cristo » ?', 'Alexandre Dumas', 'Victor Hugo', 'Jules Verne', 'Honoré de Balzac'],
  ['Qui a sculpté « Le Penseur » ?', 'Auguste Rodin', 'Camille Claudel', 'Michel-Ange', 'Auguste Bartholdi'],
  ['Qui a peint « Guernica » ?', 'Pablo Picasso', 'Salvador Dalí', 'Joan Miró', 'Francisco de Goya'],
  ['Dans quel pays se trouve Tombouctou ?', 'Le Mali', 'Le Niger', 'Le Sénégal', 'La Mauritanie'],
  ['Combien de pays le Danube traverse-t-il ?', '10', '6', '8', '12'],
  ['Quelle est la planète la plus éloignée du Soleil ?', 'Neptune', 'Uranus', 'Saturne', 'Pluton'],
  ['Quel traité a mis fin à la Première Guerre mondiale avec l\'Allemagne ?', 'Le traité de Versailles', 'Le traité de Rome', 'Le traité de Vienne', 'Le traité de Paris'],
  ['En quelle année les billets et pièces en euros sont-ils arrivés en France ?', '2002', '1999', '2000', '2001'],
  ['Quelle est la capitale de la Nouvelle-Zélande ?', 'Wellington', 'Auckland', 'Christchurch', 'Hamilton'],
  ['Quelle est la capitale du Kazakhstan ?', 'Astana', 'Almaty', 'Tachkent', 'Bichkek'],
  ['Quelle est la capitale de la Birmanie (Myanmar) ?', 'Naypyidaw', 'Rangoun', 'Mandalay', 'Bangkok'],
  ['Quelle est la capitale de l\'Écosse ?', 'Édimbourg', 'Glasgow', 'Aberdeen', 'Dundee'],
  ['Quel élément chimique a pour symbole K ?', 'Le potassium', 'Le krypton', 'Le calcium', 'Le carbone'],
  ['Quel est le symbole chimique du sodium ?', 'Na', 'So', 'Sd', 'S'],
  ['Quel est le numéro atomique du carbone ?', '6', '12', '8', '4'],
  ['Quel est le plus long fleuve d\'Europe ?', 'La Volga', 'Le Danube', 'Le Rhin', 'Le Dniepr'],
  ['Quel est le plus petit os du corps humain ?', 'L\'étrier (oreille)', 'L\'enclume', 'Le coccyx', 'La phalange du petit orteil'],
  ['Quel organe produit l\'insuline ?', 'Le pancréas', 'Le foie', 'Les reins', 'La rate'],
  ['Combien de chromosomes possède un être humain ?', '46', '23', '48', '44'],
  ['Quel groupe sanguin est « donneur universel » ?', 'O négatif', 'AB positif', 'A négatif', 'O positif'],
  ['Quel est le seul mammifère capable de vraiment voler ?', 'La chauve-souris', 'L\'écureuil volant', 'Le colugo', 'Le phalanger volant'],
  ['Qui a écrit « Germinal » ?', 'Émile Zola', 'Victor Hugo', 'Guy de Maupassant', 'Gustave Flaubert'],
  ['Qui a écrit « 1984 » ?', 'George Orwell', 'Aldous Huxley', 'Ray Bradbury', 'H. G. Wells'],
  ['Qui a composé « Les Quatre Saisons » ?', 'Vivaldi', 'Mozart', 'Bach', 'Beethoven'],
  ['Qui a composé le « Boléro » ?', 'Maurice Ravel', 'Claude Debussy', 'Erik Satie', 'Georges Bizet'],
  ['Dans quelle ville est né Mozart ?', 'Salzbourg', 'Vienne', 'Munich', 'Prague'],
  ['Combien de symphonies Beethoven a-t-il composées ?', '9', '7', '12', '5'],
  ['Combien de cordes a un violon ?', '4', '5', '6', '3'],
  ['Qui a peint « La Nuit étoilée » ?', 'Van Gogh', 'Monet', 'Gauguin', 'Cézanne'],
  ['Qui a peint « Le Cri » ?', 'Edvard Munch', 'Gustav Klimt', 'Salvador Dalí', 'Vassily Kandinsky'],
  ['Quelle planète a le plus de lunes connues ?', 'Saturne', 'Jupiter', 'Uranus', 'Neptune'],
  ['Quelle est la planète la plus chaude du système solaire ?', 'Vénus', 'Mercure', 'Mars', 'Jupiter'],
  ['Quel gaz est le plus abondant dans l\'air que l\'on respire ?', 'L\'azote', 'L\'oxygène', 'Le dioxyde de carbone', 'L\'argon'],
  ['Quel métal conduit le mieux l\'électricité ?', 'L\'argent', 'Le cuivre', 'L\'or', 'L\'aluminium'],
  ['Quelle est, environ, la vitesse de la lumière ?', '300 000 km/s', '30 000 km/s', '3 000 000 km/s', '150 000 km/s'],
  ['Combien de zéros compte un milliard ?', '9', '6', '12', '10'],
  ['Combien font 17 × 13 ?', '221', '211', '231', '207'],
  ['Combien de prix Nobel Marie Curie a-t-elle reçus ?', '2', '1', '3', '4'],
  ['En quelle année Christophe Colomb a-t-il atteint l\'Amérique ?', '1492', '1498', '1488', '1515'],
  ['En quelle année a eu lieu la bataille de Marignan ?', '1515', '1492', '1610', '1453'],
  ['En quelle année Constantinople est-elle tombée aux mains des Ottomans ?', '1453', '1492', '1204', '1517'],
  ['Qui fut le premier empereur romain ?', 'Auguste', 'Jules César', 'Néron', 'Caligula'],
  ['Qui fut le premier président de la Ve République ?', 'Charles de Gaulle', 'Georges Pompidou', 'René Coty', 'Vincent Auriol'],
  ['En quelle année les Françaises ont-elles voté pour la première fois ?', '1945', '1936', '1958', '1920'],
  ['Quelle est la langue officielle de l\'Iran ?', 'Le persan', 'L\'arabe', 'Le turc', 'L\'ourdou'],
  ['Quel est le pays le plus peuplé d\'Afrique ?', 'Le Nigeria', 'L\'Égypte', 'L\'Éthiopie', 'L\'Afrique du Sud'],
  ['Quel est le plus petit océan du monde ?', 'L\'Arctique', 'L\'océan Indien', 'L\'océan Austral', 'L\'Atlantique'],
  ['Quel est le plus haut sommet d\'Afrique ?', 'Le Kilimandjaro', 'Le mont Kenya', 'Le Toubkal', 'Le Ras Dashen'],
  ['Quelle chaîne de montagnes sépare traditionnellement l\'Europe de l\'Asie ?', 'L\'Oural', 'Le Caucase', 'Les Carpates', 'L\'Altaï'],
  ['Quelle mer borde la ville d\'Odessa ?', 'La mer Noire', 'La mer Caspienne', 'La mer Baltique', 'La mer Méditerranée'],
  ['Dans quelle ville se trouve la Sagrada Família ?', 'Barcelone', 'Madrid', 'Séville', 'Valence'],
  ['Combien d\'étoiles compte le drapeau des États-Unis ?', '50', '51', '48', '52'],
  ['Quel pays a remporté la toute première Coupe du monde de football (1930) ?', 'L\'Uruguay', 'Le Brésil', 'L\'Argentine', 'L\'Italie'],
  ['Quel pays a gagné le plus de Coupes du monde de football ?', 'Le Brésil', 'L\'Allemagne', 'L\'Italie', 'L\'Argentine'],
  ['Combien de joueurs une équipe de volley a-t-elle sur le terrain ?', '6', '5', '7', '8'],
  ['Combien de temps dure un match de handball (sans prolongation) ?', '60 minutes', '90 minutes', '40 minutes', '80 minutes'],
  ['Quel pays compte le plus d\'îles au monde ?', 'La Suède', 'La Norvège', 'L\'Indonésie', 'Les Philippines'],
  ['À combien de kelvins l\'eau gèle-t-elle ?', '273,15 K', '0 K', '100 K', '373,15 K'],
];

// [question, réponse, unité]
const ESTIM_HARD = [
  ['Combien de pays compte l\'Afrique ?', 54, 'pays'],
  ['Combien d\'habitants compte la Terre (en milliards) ?', 8, 'milliards'],
  ['Quelle est la hauteur du Burj Khalifa, la plus haute tour du monde ?', 828, 'mètres'],
  ['Quelle est la vitesse du son dans l\'air (à 20 °C) ?', 343, 'm/s'],
  ['Combien mesure le tour de la Terre à l\'équateur ?', 40075, 'km'],
  ['En quelle année Louis XVI a-t-il été guillotiné ?', 1793, ''],
  ['Quelle est la longueur du tunnel sous la Manche ?', 50, 'km'],
  ['Combien de litres de sang y a-t-il dans le corps d\'un adulte ?', 5, 'litres'],
  ['En quelle année Google a-t-il été créé ?', 1998, ''],
  ['Combien d\'habitants compte Paris intra-muros (en milliers) ?', 2100, 'milliers'],
  ['Quelle est la température à la surface du Soleil ?', 5500, '°C'],
  ['Combien mesure la Grande Muraille de Chine (toutes sections) ?', 21196, 'km'],
  ['Quelle est l\'altitude de l\'Everest ?', 8849, 'mètres'],
  ['En quelle année est né Victor Hugo ?', 1802, ''],
  ['Combien de langues parle-t-on dans le monde (environ) ?', 7000, 'langues'],
  ['Combien de marches faut-il monter pour atteindre le sommet de la tour Eiffel ?', 1665, 'marches'],
  ['Quelle est la superficie de la France métropolitaine ?', 551695, 'km²'],
  ['Combien de pièces compte le château de Versailles (environ) ?', 2300, 'pièces'],
  ['Quelle est la profondeur moyenne des océans ?', 3700, 'mètres'],
  ['Combien d\'éléments compte le tableau périodique ?', 118, 'éléments'],
  ['En quelle année le Titanic a-t-il coulé ?', 1912, ''],
  ['À quelle vitesse un faucon pèlerin peut-il plonger en piqué ?', 390, 'km/h'],
  ['En quelle année Gutenberg a-t-il mis au point son imprimerie (environ) ?', 1450, ''],
  ['Combien de cheveux a-t-on sur la tête, en moyenne ?', 100000, 'cheveux'],
];

// « Plutôt ceci ou cela ? » : chacun y répond au début, il faudra deviner ce qu'a dit un ami
const SURVEY = [
  ['Plutôt chat ou chien ?', 'Chat', 'Chien'],
  ['Plutôt mer ou montagne ?', 'Mer', 'Montagne'],
  ['Plutôt sucré ou salé ?', 'Sucré', 'Salé'],
  ['Plutôt lève-tôt ou couche-tard ?', 'Lève-tôt', 'Couche-tard'],
  ['Plutôt film ou série ?', 'Film', 'Série'],
  ['Plutôt été ou hiver ?', 'Été', 'Hiver'],
  ['Plutôt pizza ou burger ?', 'Pizza', 'Burger'],
  ['Plutôt café ou thé ?', 'Café', 'Thé'],
  ['Plutôt ville ou campagne ?', 'Ville', 'Campagne'],
  ['En avion : hublot ou couloir ?', 'Hublot', 'Couloir'],
  ['La douche : le matin ou le soir ?', 'Le matin', 'Le soir'],
  ['En vacances : tout organiser ou l\'aventure ?', 'Tout organiser', 'L\'aventure'],
  ['Plutôt fromage ou dessert ?', 'Fromage', 'Dessert'],
  ['Plutôt jeux de société ou jeux vidéo ?', 'Jeux de société', 'Jeux vidéo'],
  ['Plutôt appeler ou envoyer un message ?', 'Appeler', 'Message'],
  ['Plutôt ketchup ou mayonnaise ?', 'Ketchup', 'Mayonnaise'],
  ['En soirée : karaoké ou piste de danse ?', 'Karaoké', 'Piste de danse'],
  ['Plutôt chocolat noir ou au lait ?', 'Noir', 'Au lait'],
  ['Plutôt avoir trop chaud ou trop froid ?', 'Trop chaud', 'Trop froid'],
  ['Plutôt pâtes ou riz ?', 'Pâtes', 'Riz'],
  ['Plutôt livre ou podcast ?', 'Livre', 'Podcast'],
  ['Plutôt à l\'heure pile ou un peu en retard ?', 'À l\'heure', 'En retard'],
];

const N_Q = 12;
const OPEN = 20000;      // temps pour buzzer
const REOPEN = 9000;     // temps laissé aux autres après une mauvaise réponse
const EST_TIME = 25000;  // temps pour taper une estimation
const PTS = { OK: 100, KO: 50, EST1: 100, EST2: 50, EXACT: 50 };

function create(ctx) {
  const { scores, stats } = initScores(ctx, ['good', 'bad', 'buzz', 'est']);
  const n = ctx.rounds(N_Q);
  // l'hôte est maître du jeu (et ne joue pas), sauf option contraire ou s'il n'y a pas assez de monde
  const hostId = ctx.room?.hostId;
  const mj = ctx.option('mj') !== 'tous' && ctx.players().length >= 3 && hostId in scores ? hostId : null;
  if (mj) { delete scores[mj]; delete stats[mj]; }
  const perso = ctx.option('perso') !== 'off' && Object.keys(scores).length >= 3;
  const level = ['normal', 'dur'].includes(ctx.option('niveau')) ? ctx.option('niveau') : 'mix';
  // une file de questions faciles et une de difficiles ; on pioche selon le niveau
  const deck = (easy, hard) => ({ easy: level === 'dur' ? [] : ctx.fresh(easy, n), hard: level === 'normal' ? [] : ctx.fresh(hard, n) });
  const g = { scores, stats, n, perso, level, mj, round: 0, tok: 0, survey: {}, plan: [], qcm: deck(QCM, QCM_HARD), est: deck(ESTIM, ESTIM_HARD) };
  if (perso) {
    g.surveyQ = {};
    for (const id of Object.keys(scores)) g.surveyQ[id] = sample(SURVEY.map((_, i) => i), 3);
    g.phase = 'survey';
  } else { g.phase = 'intro'; }
  return g;
}

// ordre des questions : une estimation toutes les 4, des questions « sur nous » si dispo
function buildPlan(g) {
  const about = [];
  for (const [id, ans] of Object.entries(g.survey)) for (const [qi, a] of Object.entries(ans)) about.push({ id, qi: Number(qi), a });
  const aboutPick = shuffle(about);
  const plan = [];
  // en « mélange » : faciles au début, difficiles sur la 2ᵉ moitié (donc sur la double mise)
  const pick = (d, i) => {
    const hard = g.level === 'dur' || (g.level === 'mix' && i >= g.n / 2);
    const list = hard && d.hard.length ? d.hard : d.easy.length ? d.easy : d.hard;
    return { q: list.shift(), hard: list === d.hard };
  };
  for (let i = 0; i < g.n; i++) {
    if (i % 4 === 2) plan.push({ kind: 'est', ...pick(g.est, i) });
    else if (aboutPick.length && i % 3 === 1) plan.push({ kind: 'about', ...aboutPick.pop() });
    else plan.push({ kind: 'qcm', ...pick(g.qcm, i) });
  }
  return plan;
}

const isDouble = (g) => g.n >= 6 && g.round > g.n - 3;

function nextQuestion(ctx, g) {
  if (!g.plan.length) g.plan = buildPlan(g);
  g.round++;
  const item = g.plan[g.round - 1];
  g.cur = { kind: item.kind, hard: !!item.hard, locked: [], wrong: [], tries: [], buzzer: null, said: null, answers: {} };
  if (item.kind === 'qcm') {
    const [q, ok] = item.q;
    Object.assign(g.cur, { q, answer: ok });
  } else if (item.kind === 'about') {
    const [q, A, B] = SURVEY[item.qi];
    Object.assign(g.cur, { q, about: item.id, answer: [A, B][item.a], locked: [item.id] });
  } else {
    const [q, value, unit] = item.q;
    Object.assign(g.cur, { q, value, unit });
  }
  g.phase = item.kind === 'est' ? 'est' : 'q';
  openFor(ctx, g, item.kind === 'est' ? EST_TIME : OPEN, () => (g.phase === 'est' ? revealEst(ctx, g) : reveal(ctx, g)));
}

// minuteur de la phase en cours (annulé dès que la phase change, grâce au jeton)
function openFor(ctx, g, ms, fn) {
  const tok = ++g.tok;
  g.until = Date.now() + ms;
  ctx.schedule(ms, () => { if (g.tok === tok) fn(); });
}

function reveal(ctx, g) {
  if (g.phase !== 'q') return;
  g.tok++;
  g.phase = 'reveal';
  g.cur.gains = g.cur.gains || {};
  applyGains(g.scores, g.cur.gains);
}

function revealEst(ctx, g) {
  if (g.phase !== 'est') return;
  g.tok++;
  const gains = {};
  const mul = isDouble(g) ? 2 : 1;
  const list = Object.entries(g.cur.answers).map(([id, v]) => ({ id, v, d: Math.abs(v - g.cur.value) })).sort((a, b) => a.d - b.d);
  const dists = [...new Set(list.map((x) => x.d))];
  for (const x of list) {
    if (x.d === dists[0]) { gain(gains, x.id, PTS.EST1 * mul, 'Le plus proche 📏'); g.stats[x.id].est++; }
    else if (x.d === dists[1] && list.length > 2) gain(gains, x.id, PTS.EST2 * mul, '2ᵉ plus proche');
    if (x.d === 0) gain(gains, x.id, PTS.EXACT * mul, 'Pile la bonne réponse 🎯');
  }
  applyGains(g.scores, gains);
  g.cur.ranking = list;
  g.cur.gains = gains;
  g.phase = 'reveal';
}

// encore quelqu'un qui peut buzzer ?
function canStillBuzz(ctx, g) {
  return active(ctx, g).some((p) => !g.cur.locked.includes(p.id) && !g.cur.wrong.includes(p.id));
}

// le maître du jeu a tranché sur la réponse du joueur qui a buzzé
function judge(ctx, g, ok) {
  const c = g.cur, pid = c.buzzer;
  const mul = isDouble(g) ? 2 : 1;
  c.gains = c.gains || {};
  c.buzzer = null;
  c.tries.push({ id: pid, said: c.said, ok });
  c.said = null;
  if (ok) {
    gain(c.gains, pid, PTS.OK * mul, mul > 1 ? 'Bonne réponse (double mise) 💰' : 'Bonne réponse au buzzer 🔔');
    g.stats[pid].good++;
    c.winner = pid;
    return reveal(ctx, g);
  }
  gain(c.gains, pid, -PTS.KO * mul, 'Mauvaise réponse ❌');
  g.stats[pid].bad++;
  c.wrong.push(pid);
  if (!canStillBuzz(ctx, g)) return reveal(ctx, g);
  openFor(ctx, g, REOPEN, () => reveal(ctx, g));
}

// a le droit de voir la bonne réponse pendant la question ?
// (l'hôte qui joue et a buzzé lui-même ne la voit qu'après avoir donné sa réponse : action « peek »)
const seesAnswer = (ctx, g, pid) => pid === ctx.room?.hostId
  && (g.mj || (g.cur.buzzer ? g.cur.buzzer !== pid || g.cur.peek : g.cur.tries.length));

function onAction(ctx, g, pid, type, payload, { isHost }) {
  // le maître du jeu ne joue pas : il peut seulement animer (question suivante, valider)
  if (!(pid in g.scores) && !(isHost && ['next', 'judge'].includes(type))) return { error: pid === g.mj ? 'Tu es le maître du jeu : tu ne joues pas' : 'Tu ne participes pas à cette partie' };
  if (type === 'survey' && g.phase === 'survey') {
    const ans = payload && typeof payload === 'object' ? payload : {};
    const mine = {};
    for (const qi of g.surveyQ[pid] || []) if (ans[qi] === 0 || ans[qi] === 1) mine[qi] = ans[qi];
    if (Object.keys(mine).length !== (g.surveyQ[pid] || []).length) return { error: 'Réponds aux 3 questions' };
    g.survey[pid] = mine;
    if (active(ctx, g).every((p) => p.id in g.survey)) nextQuestion(ctx, g);
    return;
  }
  if (type === 'buzz' && g.phase === 'q') {
    const c = g.cur;
    if (c.buzzer || c.locked.includes(pid) || c.wrong.includes(pid)) return { quiet: true };
    c.buzzer = pid;
    c.said = null;
    c.peek = false;
    g.stats[pid].buzz++;
    ctx.buzz(pid, [120]);
    g.tok++; g.until = 0; // le chrono s'arrête : on attend la réponse et la décision du maître du jeu
    // l'hôte qui joue va voir la réponse pour juger : il ne peut plus buzzer sur cette question
    const host = ctx.room?.hostId;
    if (!g.mj && host && host !== pid && !c.locked.includes(host)) c.locked.push(host);
    return;
  }
  if (type === 'say' && g.phase === 'q') {
    if (g.cur.buzzer !== pid) return { quiet: true };
    g.cur.said = String(payload ?? '').trim().slice(0, 60) || null;
    return;
  }
  if (type === 'peek' && g.phase === 'q') {
    if (g.cur.buzzer === pid && isHost) g.cur.peek = true;
    return;
  }
  if (type === 'judge' && g.phase === 'q') {
    if (!isHost) return { error: 'Seul le maître du jeu valide les réponses' };
    if (!g.cur.buzzer || (g.cur.buzzer === pid && !g.mj && !g.cur.peek)) return { quiet: true };
    return judge(ctx, g, !!payload);
  }
  if (type === 'estimate' && g.phase === 'est') {
    const v = Math.round(Number(String(payload).replace(/\s/g, '').replace(',', '.')));
    if (!Number.isFinite(v) || v < 0 || v > 1e9) return { error: 'Tape un nombre' };
    g.cur.answers[pid] = v;
    if (active(ctx, g).every((p) => p.id in g.cur.answers)) revealEst(ctx, g);
    return;
  }
  if (type === 'next' && isHost) {
    if (g.phase === 'survey') {
      if (!Object.keys(g.survey).length) return { error: 'Personne n\'a encore répondu' };
      return nextQuestion(ctx, g);
    }
    if (g.phase === 'intro') return nextQuestion(ctx, g);
    if (g.phase === 'q') return reveal(ctx, g);
    if (g.phase === 'est') return revealEst(ctx, g);
    if (g.phase === 'reveal') {
      if (g.round >= g.n) {
        g.phase = 'end';
        g.tok++;
        g.awards = awards(g.stats, [
          ['good', 'Cerveau en or', '🧠', 'a donné le plus de bonnes réponses'],
          ['buzz', 'Doigt le plus rapide', '🔔', 'a buzzé le plus souvent'],
          ['est', 'Œil de lynx', '📏', 'a été le plus proche le plus souvent'],
          ['bad', 'Buzzer fou', '🤪', 'a donné le plus de mauvaises réponses'],
        ]);
        ctx.endGame(g.scores);
      } else nextQuestion(ctx, g);
    }
  }
}

// un joueur part : s'il avait buzzé, la main repasse aux autres ; tout le monde a répondu → suite
function onPlayersChanged(ctx, g) {
  // celui qui avait buzzé est parti : la main repasse aux autres
  if (g.phase === 'q' && g.cur.buzzer && !active(ctx, g).some((p) => p.id === g.cur.buzzer)) {
    g.cur.buzzer = null; g.cur.said = null;
    if (canStillBuzz(ctx, g)) openFor(ctx, g, REOPEN, () => reveal(ctx, g)); else reveal(ctx, g);
    return;
  }
  if (g.phase === 'survey' && Object.keys(g.survey).length && active(ctx, g).every((p) => p.id in g.survey)) nextQuestion(ctx, g);
  else if (g.phase === 'est' && Object.keys(g.cur.answers).length && active(ctx, g).every((p) => p.id in g.cur.answers)) revealEst(ctx, g);
}

function stateFor(ctx, g, pid) {
  const now = Date.now();
  const s = {
    phase: g.phase, round: g.round, totalRounds: g.n, scores: g.scores, participants: Object.keys(g.scores),
    perso: g.perso, mj: g.mj, double: isDouble(g), left: g.until ? Math.max(0, g.until - now) : 0,
    nextDouble: g.n >= 6 && g.round === g.n - 3,
  };
  if (g.phase === 'survey') {
    s.mySurvey = (g.surveyQ[pid] || []).map((qi) => ({ qi, q: SURVEY[qi][0], A: SURVEY[qi][1], B: SURVEY[qi][2] }));
    s.surveyDone = !!g.survey[pid];
    s.done = Object.keys(g.survey);
    s.needed = active(ctx, g).length;
  }
  if (g.cur && ['q', 'est', 'reveal'].includes(g.phase)) {
    const c = g.cur;
    s.cur = { kind: c.kind, hard: c.hard, q: c.q, about: c.about, unit: c.unit, buzzer: c.buzzer, said: c.said, wrong: c.wrong, tries: c.tries || [], locked: c.locked };
    if (g.phase === 'q' && seesAnswer(ctx, g, pid)) s.cur.answer = c.answer;
    if (c.kind === 'est') { s.cur.done = Object.keys(c.answers); s.cur.mine = c.answers[pid] ?? null; if (pid === g.mj) s.cur.value = c.value; }
    if (g.phase === 'reveal') Object.assign(s.cur, { answer: c.answer, winner: c.winner, value: c.value, ranking: c.ranking, gains: c.gains || {} });
  }
  if (g.phase === 'end') s.awards = g.awards;
  return s;
}

module.exports = {
  id: 'buzzer',
  color: '#ff8a3d',
  name: 'Le Buzzer',
  emoji: '🔔',
  tagline: 'Le premier qui buzze répond à voix haute… le maître du jeu tranche !',
  description: 'Quiz de rapidité sans propositions : on buzze, on répond à voix haute, le maître du jeu valide. Estimations et questions sur vous. Les 3 dernières valent double.',
  minPlayers: 2,
  maxPlayers: 12,
  duration: '10 min',
  options: [
    { key: 'mj', label: 'Maître du jeu', default: 'hote', choices: [
      { value: 'hote', label: 'L\'hôte anime 🎤', hint: 'L\'hôte voit les réponses et valide, mais ne joue pas (à partir de 3 joueurs)' },
      { value: 'tous', label: 'L\'hôte joue aussi', hint: 'L\'hôte voit la réponse seulement quand quelqu\'un buzze, et ne peut alors plus buzzer sur cette question' },
    ] },
    { key: 'niveau', label: 'Difficulté', default: 'mix', choices: [
      { value: 'mix', label: 'De plus en plus dur 📈', hint: 'Questions faciles au début, difficiles 🔥 sur la 2ᵉ moitié' },
      { value: 'normal', label: 'Classique', hint: 'Seulement des questions accessibles' },
      { value: 'dur', label: 'Difficile 🔥', hint: 'Que des questions dures, pour les cerveaux' },
    ] },
    { key: 'perso', label: 'Questions sur nous', default: 'on', choices: [
      { value: 'on', label: 'Oui 🙋', hint: 'Au début, chacun répond à 3 « plutôt ceci ou cela ? » : il faudra deviner ce qu\'ont dit les autres' },
      { value: 'off', label: 'Non', hint: 'Seulement de la culture générale et des estimations' },
    ] },
  ],
  create,
  onAction,
  onPlayersChanged,
  stateFor,
  _test: { QCM, ESTIM, SURVEY, QCM_HARD, ESTIM_HARD },
};
