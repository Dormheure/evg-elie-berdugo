// ============================================================
//  LE GUIDE — 48 h à Amsterdam pour l'EVG d'Elie
//  Prix = estimations par personne (groupe d'environ 12) sauf mention contraire.
//  « verif » = à confirmer avant de réserver (horaires, cacheroute, dispo en décembre).
//  Liens : recherche Google Maps / Google (toujours à jour, jamais cassés).
// ============================================================
(() => {
  const maps = q => 'https://www.google.com/maps/search/' + encodeURIComponent(q);
  const web = q => 'https://www.google.com/search?q=' + encodeURIComponent(q);
  const airbnb = (lieu, n = 12) => `https://www.airbnb.fr/s/${encodeURIComponent(lieu)}/homes?adults=${n}`;

  window.GUIDE = {
    cats: [
      { id: 'dodo', e: '🏰', t: 'Où dormir', s: 'Villas, péniches, grues et châteaux' },
      { id: 'casher', e: '✡️', t: 'Manger casher', s: 'Restos, traiteurs, chef privé' },
      { id: 'nuit', e: '🌙', t: 'Soirées de folie', s: 'Clubs, bateaux, bars secrets' },
      { id: 'reve', e: '🦄', t: 'Contes de fées', s: 'Des trucs qui ne devraient pas exister' },
      { id: 'action', e: '⚡', t: 'Action & défoulement', s: 'Sumo, karting, hache, vitesse' },
      { id: 'bizarre', e: '🧪', t: 'Insolite total', s: 'Musées tordus et expériences absurdes' },
      { id: 'piege', e: '🎭', t: 'Pièges pour Elie', s: 'Mises en scène et surprises' },
      { id: 'shabbat', e: '🕯️', t: 'Shabbat & pratique', s: 'Si le séjour tombe sur Shabbat' },
    ],

    // Les formules 48 h : trois niveaux de folie
    formules: [
      { id: 'malin', e: '🎒', t: 'Le Malin', prix: 280, pitch: 'Max de fun, min de dépenses. Auberge privatisée, bateau partagé, casher street-food.',
        j1: ['Arrivée, dépôt des sacs à ClinkNOORD', 'Déjeuner falafel/shawarma casher', 'Beer bike (vélo-bar) dans l\'ouest', 'Dîner Meat Me Kosher', 'Pub crawl + karaoké'],
        j2: ['Brunch traiteur casher dans la chambre', 'Escape room en équipes', 'Croisière Light Festival', 'Procès d\'Elie au dîner', 'Retour'] },
      { id: 'premium', e: '🥂', t: 'Le Premium', prix: 520, pitch: 'Le juste milieu qui fait rêver : maison de canal hors centre, bateau privé open bar, chef casher.',
        j1: ['Accueil d\'Elie par une fanfare hollandaise à la gare', 'Check-in villa (Zaandam ou les lacs)', 'Bateau privé open bar + silent disco', 'Dîner chef privé casher à la villa', 'Club : Shelter ou Jimmy Woo (table)'],
        j2: ['Grasse mat\' + brunch', 'Sumo en costumes gonflables', 'A\'DAM Lookout : balançoire au-dessus du vide', 'Dîner Machane Yehuda', 'Comedy club : Elie monte sur scène'] },
      { id: 'folie', e: '🦄', t: 'Le Conte de fées', prix: 950, pitch: 'Irréel du début à la fin. Hélico, château, paparazzis, nuit dans une grue.',
        j1: ['Paparazzis qui « mitraillent » Elie à l\'arrivée', 'Hélicoptère au-dessus des canaux et des plages', 'Dîner casher privatisé dans un château', 'Elie dort seul en haut de la grue Faralda (jacuzzi)'],
        j2: ['Petit-déj servi sur un bateau-salon des années 1920', 'Course de supercars', 'Faux mariage sur un pont avec 7 nains (nous, déguisés)', 'Soirée VIP + spectacle privé', 'Feu d\'artifice de confettis au retour'] },
    ],

    items: [
      // ---------------- 🏰 OÙ DORMIR ----------------
      { cat: 'dodo', e: '💡', t: 'Règle d\'or Airbnb à Amsterdam', d: "Dans la ville d'Amsterdam, une location touristique ne peut accueillir que 4 personnes max (et 30 nuits par an). Pour 12 gars : on vise hors des limites de la ville (Zaandam, Amstelveen, Haarlem, les lacs) ou des hôtels/péniches. Ça évite une annulation de dernière minute.", tags: ['astuce'], budget: '' },
      { cat: 'dodo', e: '🏡', t: 'Villa avec piscine intérieure aux lacs (Vinkeveen / Loosdrecht)', d: "Grande villa au bord des lacs, 25 min d'Amsterdam : piscine chauffée, sauna, billard, cuisine pour le chef casher. Idéal pour la soirée privée sans voisins.", budget: '250-450 €/pers. (2 nuits)', tags: ['groupe', 'premium'], link: airbnb('Vinkeveen'), verif: true },
      { cat: 'dodo', e: '🌊', t: 'Villa de plage à Zandvoort', d: "Maison face à la mer du Nord, 30 min en train. Bain glacé dans la mer en décembre obligatoire pour le marié (et facultatif pour les autres).", budget: '180-350 €/pers.', tags: ['groupe', 'insolite'], link: airbnb('Zandvoort'), verif: true },
      { cat: 'dodo', e: '🏘️', t: 'Grande maison à Zaandam', d: "À 12 min d'Amsterdam-Centraal en train, juste à côté des moulins de Zaanse Schans. Les grandes maisons de groupe y sont autorisées et bien moins chères.", budget: '130-250 €/pers.', tags: ['groupe', 'malin'], link: airbnb('Zaandam'), verif: true },
      { cat: 'dodo', e: '🛶', t: 'Deux péniches côte à côte', d: "Dormir sur l'eau au milieu des canaux : deux houseboats de 6 personnes amarrés côte à côte. Pont-terrasse, poêle, et Elie qui a le mal de mer dès le premier verre.", budget: '160-320 €/pers.', tags: ['insolite', 'premium'], link: web('houseboat Amsterdam group rental 12 persons'), verif: true },
      { cat: 'dodo', e: '🏗️', t: 'Faralda Crane Hotel (nuit dans une grue)', d: "Trois suites perchées dans une ancienne grue portuaire du quartier NDSM, avec jacuzzi au sommet à 50 m. Idée : Elie y dort seul la 2e nuit, enfermé « pour sa sécurité ».", budget: '450-900 € la suite / nuit', tags: ['conte de fées', 'luxe'], link: maps('Faralda Crane Hotel Amsterdam'), verif: true },
      { cat: 'dodo', e: '🌉', t: 'SWEETS hotel (maisons de pontiers)', d: "Chaque chambre est une ancienne petite maison de gardien de pont, au milieu de l'eau. Une maisonnette par binôme, éparpillées sur toute la ville : chasse au trésor garantie pour se retrouver.", budget: '150-300 € la nuit / maisonnette', tags: ['insolite'], link: maps('SWEETS hotel Amsterdam'), verif: true },
      { cat: 'dodo', e: '📚', t: 'Hotel Not Hotel (chambres secrètes)', d: "On entre dans certaines chambres par une bibliothèque pivotante ou par un tram. Parfait pour cacher le marié.", budget: '120-200 € la chambre', tags: ['insolite', 'malin'], link: maps('Hotel Not Hotel Amsterdam'), verif: true },
      { cat: 'dodo', e: '🏛️', t: 'Maison de canal du XVIIe en hôtel privatisé', d: "Petit hôtel-boutique dans une maison de canal (Pulitzer, Dylan, Canal House…) : on réserve un étage entier. Escaliers raides, plafonds peints, et des lustres qu'on ne doit PAS toucher.", budget: '250-500 € la chambre / nuit', tags: ['luxe'], link: web('Pulitzer Amsterdam hotel'), verif: true },
      { cat: 'dodo', e: '🏊', t: 'W Amsterdam (rooftop + piscine)', d: "Piscine sur le toit avec vue sur le Palais royal, bar rooftop. Pour faire croire à Elie qu'il est une star.", budget: '300-600 € la chambre', tags: ['luxe'], link: maps('W Amsterdam'), verif: true },
      { cat: 'dodo', e: '🎒', t: 'ClinkNOORD / Generator (auberges design privatisées)', d: "Chambres privées de 6 à 8 lits dans des auberges design, bar en bas, ferry gratuit pour le centre. La version maligne.", budget: '45-90 €/pers. / nuit', tags: ['malin', 'groupe'], link: web('ClinkNOORD Amsterdam private room group'), verif: true },
      { cat: 'dodo', e: '🏰', t: 'Château à louer pour la nuit', d: "Des châteaux et manoirs (kasteel, landgoed) se louent pour des groupes autour d'Amsterdam et d'Utrecht. Dîner en salle d'armes, Elie couronné roi de rien du tout.", budget: '300-700 €/pers.', tags: ['conte de fées', 'luxe'], link: web('kasteel huren groep overnachten Noord-Holland Utrecht'), verif: true },

      // ---------------- ✡️ CASHER ----------------
      { cat: 'casher', e: '🥩', t: 'Meat Me Kosher', d: "Resto casher viande, cuisine orientale/marocaine. Grillades, tajines, ambiance. La valeur sûre pour un dîner de groupe : réserver et prévenir qu'on est 12.", budget: '35-60 €/pers.', tags: ['casher', 'viande'], link: maps('Meat Me Kosher Amsterdam'), verif: true },
      { cat: 'casher', e: '🍢', t: 'Machane Yehuda (Chabad, centre)', d: "Restaurant casher viande strict géré par Chabad Amsterdam, en plein centre. Pratique avant une soirée.", budget: '30-55 €/pers.', tags: ['casher', 'viande', 'centre'], link: maps('Machane Yehuda Amsterdam kosher'), verif: true },
      { cat: 'casher', e: '🌯', t: 'La Basta (street-food casher)', d: "Street-food casher près de la maison d'Anne Frank. Le déjeuner rapide entre deux activités.", budget: '12-20 €/pers.', tags: ['casher', 'rapide'], link: maps('La Basta Amsterdam kosher'), verif: true },
      { cat: 'casher', e: '🥙', t: 'LePita', d: "Pitas et cuisine israélienne casher (Kastelenstraat, sud). Parfait pour le déjeuner du lendemain de cuite.", budget: '12-20 €/pers.', tags: ['casher', 'rapide'], link: maps('LePita Amsterdam'), verif: true },
      { cat: 'casher', e: '🥪', t: 'Sal Meijer (deli mythique)', d: "Le deli casher historique d'Amsterdam : sandwichs pastrami, corned-beef, ossenworst. Commande géante à emporter pour le bateau.", budget: '10-18 €/pers.', tags: ['casher', 'à emporter'], link: maps('Sal Meijer Amsterdam'), verif: true },
      { cat: 'casher', e: '🍕', t: 'Pizza & Co / Taim Taim', d: "Pizza casher et falafel : la base pour une soirée à la villa sans se ruiner.", budget: '10-18 €/pers.', tags: ['casher', 'livraison'], link: web('kosher pizza Amsterdam Pizza & Co'), verif: true },
      { cat: 'casher', e: '🧆', t: 'Golan Lunchroom / Esther\'s Cookery', d: "Lunch casher à Buitenveldert et à De Pijp : plats maison, ambiance de quartier.", budget: '12-25 €/pers.', tags: ['casher'], link: web('Golan lunchroom Buitenveldert kosher'), verif: true },
      { cat: 'casher', e: '👨‍🍳', t: 'Chef privé casher à la villa', d: "Un traiteur casher livre et sert le dîner à la villa (service compris) : côte de bœuf, mezzés, gâteau en forme de… on verra. Le dîner le plus mémorable pour le procès d'Elie.", budget: '70-140 €/pers.', tags: ['casher', 'premium'], link: web('kosher catering Amsterdam private dinner'), verif: true },
      { cat: 'casher', e: '🍷', t: 'Astuce boissons', d: "Bières et alcools forts : en général pas de problème. Pour le vin, prévoir du casher (traiteur ou Chabad). Sur un bateau open bar, demander la liste des boissons et apporter son vin si besoin.", tags: ['astuce'], budget: '' },

      // ---------------- 🌙 SOIRÉES ----------------
      { cat: 'nuit', e: '🛥️', t: 'Bateau privé open bar + DJ', d: "1 h 30 à 2 h sur les canaux, bar à volonté, enceinte, déguisements. Ajoutez le silent disco : 12 gars qui hurlent du Céline Dion en silence au milieu des canaux.", budget: 'à partir de ~45 €/pers.', tags: ['bateau', 'groupe'], link: maps('Canal Motorboats Amsterdam'), verif: true },
      { cat: 'nuit', e: '🕳️', t: 'Shelter (club sous la tour A\'DAM)', d: "Club techno dans un ancien abri sous la tour, son énorme, ouvert jusqu'au bout de la nuit. Ferry gratuit depuis Centraal.", budget: '15-30 € entrée', tags: ['club'], link: maps('Shelter Amsterdam'), verif: true },
      { cat: 'nuit', e: '🐉', t: 'Jimmy Woo (table VIP)', d: "Le club chic d'Amsterdam, plafond de lumières. Table avec bouteille : Elie au centre, couronne en carton sur la tête.", budget: '60-150 €/pers. avec table', tags: ['club', 'luxe'], link: maps('Jimmy Woo Amsterdam'), verif: true },
      { cat: 'nuit', e: '⛪', t: 'Paradiso (église devenue salle de concert)', d: "Concerts et soirées dans une ancienne église. Regarder le programme des dates pour trouver LA soirée.", budget: '15-40 €', tags: ['concert'], link: maps('Paradiso Amsterdam'), verif: true },
      { cat: 'nuit', e: '🚪', t: 'Door 74 (bar secret)', d: "Speakeasy sans enseigne, sur réservation, cocktails de très haut niveau. On y emmène Elie les yeux bandés.", budget: '15-20 € le cocktail', tags: ['bar', 'secret'], link: maps('Door 74 Amsterdam'), verif: true },
      { cat: 'nuit', e: '🎤', t: 'Karaoké privé + champagne', d: "Cabine privée : Elie chante « Je te promets » à genoux devant le groupe. Enregistrement vidéo pour le mariage (ou pour le chantage).", budget: '25-50 €/pers.', tags: ['karaoké'], link: web('private karaoke room Amsterdam group'), verif: true },
      { cat: 'nuit', e: '🎭', t: 'Boom Chicago (impro en anglais)', d: "Le comedy club le plus connu de la ville. Prévenez les comédiens : il y a un futur marié dans la salle.", budget: '25-40 €', tags: ['spectacle'], link: maps('Boom Chicago Amsterdam'), verif: true },
      { cat: 'nuit', e: '🧊', t: 'Icebar XtraCold', d: "Bar entièrement en glace à -10 °C, avec parkas et gants fournis. Le seul endroit où Elie aura plus froid que lors de la demande en mariage.", budget: '~20-30 €', tags: ['insolite'], link: maps('Xtracold Icebar Amsterdam'), verif: true },
      { cat: 'nuit', e: '🍻', t: 'Pub crawl dans les cafés bruns', d: "Les vieux bars en bois sombre du Jordaan, une tournée par bar, un défi par bar. Le parcours se trace dans l'app des défis.", budget: '30-50 €/pers.', tags: ['bar', 'malin'], link: maps('brown cafe Jordaan Amsterdam'), verif: true },
      { cat: 'nuit', e: '🎰', t: 'Holland Casino', d: "Smoking de location, 20 € de jetons chacun, et toute la cagnotte de jetons misée sur le numéro de la date du mariage.", budget: '20-100 €', tags: ['casino'], link: maps('Holland Casino Amsterdam Centrum'), verif: true },

      // ---------------- 🦄 CONTES DE FÉES ----------------
      { cat: 'reve', e: '🚁', t: 'Vol en hélicoptère au-dessus d\'Amsterdam et des plages', d: "20 à 30 minutes au-dessus des canaux, des moulins et de la mer du Nord. Elie à l'avant avec un casque, la mâchoire au sol.", budget: '120-300 €/pers.', tags: ['conte de fées'], link: web('helicopter flight Amsterdam rondvlucht'), verif: true },
      { cat: 'reve', e: '🕰️', t: 'Bateau-salon des années 1920', d: "Bateau en bois vernis, banquettes en velours, majordome, champagne. On fait le tour des canaux comme des aristocrates ruinés.", budget: '60-120 €/pers.', tags: ['bateau', 'luxe'], link: web('classic saloon boat Amsterdam private'), verif: true },
      { cat: 'reve', e: '✨', t: 'Croisière du Amsterdam Light Festival', d: "De fin novembre à mi-janvier, des œuvres lumineuses géantes sur les canaux. En décembre, c'est pile pendant notre séjour.", budget: '20-35 €/pers.', tags: ['saison'], link: web('Amsterdam Light Festival cruise'), verif: true },
      { cat: 'reve', e: '⛸️', t: 'Patinoire de Noël au Museumplein', d: "Patiner devant le Rijksmuseum, vin chaud (pour les autres), Elie en tutu. Saisonnier, en hiver.", budget: '10-20 €', tags: ['saison'], link: web('ijsbaan Museumplein Amsterdam'), verif: true },
      { cat: 'reve', e: '👑', t: 'Dîner royal dans un château', d: "Privatisation d'une salle de château (Muiderslot et autres kasteel autour d'Amsterdam), traiteur casher, Elie en roi. Le genre de photo qui finit au mariage.", budget: '150-300 €/pers.', tags: ['conte de fées', 'luxe', 'casher'], link: web('kasteel diner groep privé Amsterdam'), verif: true },
      { cat: 'reve', e: '🏎️', t: 'Supercars sur le circuit de Zandvoort', d: "Baptême en Ferrari ou Lamborghini sur le circuit de F1. À vérifier en hiver (journées de piste plus rares).", budget: '150-400 €/pers.', tags: ['vitesse'], link: web('Zandvoort circuit supercar experience'), verif: true },
      { cat: 'reve', e: '🎈', t: 'Montgolfière au-dessus des polders', d: "Le rêve absolu… mais rare en décembre (météo). À tenter si on part plus tôt ou plus tard.", budget: '200-300 €/pers.', tags: ['saison'], link: web('ballonvaart Noord-Holland'), verif: true },
      { cat: 'reve', e: '🧚', t: 'Elie et les 7 nains', d: "Les 7 meilleurs potes en costumes de nains (bonnets, barbes, lanternes), Elie en Blanche-Neige (robe incluse). Défilé dans le centre, photo devant le Rijksmuseum. Le reste du groupe joue les chasseurs.", budget: '20-40 €/pers. (costumes)', tags: ['déguisement', 'malin'], link: web('kabouter kostuum volwassenen'), verif: false },

      // ---------------- ⚡ ACTION ----------------
      { cat: 'action', e: '🤼', t: 'Sumo en costumes géants', d: "Costumes de sumo gonflables, tournoi en élimination directe. Elie affronte tout le monde, l'un après l'autre. Personne n'en ressort digne.", budget: '25-45 €/pers.', tags: ['groupe'], link: web('sumo worstelen Amsterdam vrijgezellenfeest'), verif: true },
      { cat: 'action', e: '⚽', t: 'Bubble football', d: "Match de foot dans des bulles gonflables. Elie a le droit d'être percuté par tout le monde.", budget: '25-35 €/pers.', tags: ['groupe'], link: web('bubble football Amsterdam'), verif: true },
      { cat: 'action', e: '🏎️', t: 'Karting indoor + bière après la course', d: "Grand prix d'Amsterdam : le dernier paie la première tournée (Elie est d'office handicapé de 10 secondes).", budget: '35-60 €/pers.', tags: ['course'], link: web('indoor karting Amsterdam'), verif: true },
      { cat: 'action', e: '🪓', t: 'Lancer de hache', d: "Coach, cibles en bois, tournoi. On grave le nom de la future femme d'Elie sur la cible (non).", budget: '30-45 €/pers.', tags: ['défoulement'], link: web('axe throwing Amsterdam'), verif: true },
      { cat: 'action', e: '🎢', t: 'Over the Edge (A\'DAM Lookout)', d: "Balançoire au sommet d'une tour, au-dessus du vide, à 100 m. Elie y fait ses vœux de mariage en hurlant.", budget: '~25 €', tags: ['frisson'], link: maps('A\'DAM Lookout'), verif: true },
      { cat: 'action', e: '🔫', t: 'Laser tag / archery tag', d: "Équipe Elie contre le reste du monde. Spoiler : le reste du monde gagne.", budget: '25-40 €/pers.', tags: ['groupe'], link: web('laser tag Amsterdam group'), verif: true },
      { cat: 'action', e: '🚲', t: 'Beer bike (vélo-bar)', d: "On pédale ensemble autour d'un bar roulant, le patron conduit. Le marié pédale, le reste boit.", budget: '25-40 €/pers.', tags: ['groupe', 'classique'], link: web('beer bike Amsterdam'), verif: true },

      // ---------------- 🧪 INSOLITE ----------------
      { cat: 'bizarre', e: '🫀', t: 'BODY WORLDS (le corps humain en vrai)', d: "Expo de vrais corps humains plastinés. Le Dr Elie fait la visite guidée, on vérifie ses connaissances (tous les gages s'il se trompe).", budget: '~25 €', tags: ['spécial docteur'], link: maps('Body Worlds Amsterdam'), verif: true },
      { cat: 'bizarre', e: '🫙', t: 'Musée Vrolik (curiosités anatomiques)', d: "Collection de bocaux anatomiques du XVIIIe au XIXe siècle, à l'hôpital universitaire. Glauque, fascinant, et parfait pour un futur marié médecin.", budget: '~10 €', tags: ['spécial docteur', 'bizarre'], link: maps('Museum Vrolik Amsterdam'), verif: true },
      { cat: 'bizarre', e: '🦠', t: 'Micropia (le musée des microbes)', d: "Le seul musée au monde dédié aux microbes. Elie explique à tout le monde ce qu'il y a sur une barbe.", budget: '~20 €', tags: ['spécial docteur'], link: maps('Micropia Amsterdam'), verif: true },
      { cat: 'bizarre', e: '🏙️', t: 'Madurodam : Elie le géant', d: "Les Pays-Bas en miniature (La Haye, 50 min). Photo d'Elie en Gulliver qui écrase l'aéroport de Schiphol miniature.", budget: '~20 €', tags: ['mini', 'photo'], link: maps('Madurodam'), verif: true },
      { cat: 'bizarre', e: '💡', t: 'Electric Ladyland (musée fluorescent)', d: "Minuscule musée de l'art fluorescent, dans une cave. Le plus petit musée le plus bizarre de la ville.", budget: '~10 €', tags: ['mini', 'bizarre'], link: maps('Electric Ladyland Amsterdam'), verif: true },
      { cat: 'bizarre', e: '🐈', t: 'Kattenkabinet (musée des chats)', d: "Une maison de canal entière remplie d'art sur les chats, avec de vrais chats. Personne ne comprend pourquoi on est là, et c'est le but.", budget: '~10 €', tags: ['bizarre'], link: maps('Kattenkabinet Amsterdam'), verif: true },
      { cat: 'bizarre', e: '🙃', t: 'Upside Down Amsterdam / Museum of Illusions', d: "Pièces à l'envers et illusions d'optique : des photos d'Elie au plafond pour la soirée du mariage.", budget: '15-20 €', tags: ['photo'], link: web('Upside Down Amsterdam'), verif: true },
      { cat: 'bizarre', e: '🌬️', t: 'Zaanse Schans (moulins en vrai)', d: "Moulins à vent qui tournent, fabrique de sabots. Elie se fait tailler une paire de sabots à son nom.", budget: 'gratuit à 15 €', tags: ['culture'], link: maps('Zaanse Schans'), verif: true },
      { cat: 'bizarre', e: '💀', t: 'Amsterdam Dungeon', d: "Comédiens, cachots, histoire sanglante. Les acteurs ADORENT les futurs mariés : on les prévient.", budget: '~25 €', tags: ['spectacle'], link: maps('Amsterdam Dungeon'), verif: true },

      // ---------------- 🎭 PIÈGES POUR ELIE ----------------
      { cat: 'piege', e: '📸', t: 'Paparazzis pour Elie', d: "Trois photographes et un « garde du corps » le suivent dans la ville en criant « ELIE ! ELIE ! » avec des flashs. Les touristes le prennent pour une star et demandent des selfies.", budget: '400-900 € en tout', tags: ['mise en scène'], link: web('fake paparazzi hire Amsterdam'), verif: true },
      { cat: 'piege', e: '🎺', t: 'Fanfare hollandaise surprise (dweilorkest)', d: "Une fanfare de cuivres déguisée débarque à la gare ou au resto et joue l'hymne du marié. Tradition néerlandaise, effet garanti.", budget: '500-1 000 € en tout', tags: ['mise en scène'], link: web('dweilorkest boeken'), verif: true },
      { cat: 'piege', e: '🎩', t: 'Faux mariage sur un pont', d: "Un comédien en officiant, un faux registre, des témoins touristes : Elie « épouse » un réverbère sous les yeux de la ville. Vœux écrits par le groupe.", budget: '0-300 €', tags: ['mise en scène', 'malin'], link: '', verif: false },
      { cat: 'piege', e: '🕵️', t: 'Enlèvement au réveil', d: "Cagoules, gilets assortis, van loué : on « enlève » Elie au réveil pour l'emmener à la première activité. (Tout le monde déguisé, aucun faux uniforme officiel : c'est interdit.)", budget: '20-40 €/pers.', tags: ['classique'], link: '', verif: false },
      { cat: 'piege', e: '🧑‍⚕️', t: 'Consultation du Dr Elie', d: "Stand « consultation gratuite » sur une place : Elie en blouse diagnostique les touristes volontaires. Ordonnances absurdes à distribuer, rédigées par le groupe.", budget: '0 €', tags: ['spécial docteur', 'malin'], link: '', verif: false },
      { cat: 'piege', e: '📜', t: 'Le procès d\'Elie', d: "Au dîner : chef d'accusation (« abandon de célibat en bande organisée »), un procureur, un avocat commis d'office (le plus nul du groupe), un jury, une peine. Preuves photo projetées.", budget: '0 €', tags: ['dîner'], link: '', verif: false },
      { cat: 'piege', e: '🎬', t: 'Vidéo surprise des proches', d: "Montage secret de messages des parents, des amis absents et d'une célébrité (via les plateformes de messages vidéo de célébrités). Diffusion sur le bateau.", budget: '50-200 € en tout', tags: ['émotion'], link: web('personalized celebrity video message'), verif: false },

      // ---------------- 🕯️ SHABBAT & PRATIQUE ----------------
      { cat: 'shabbat', e: '🕯️', t: 'Si on tombe sur Shabbat', d: "Le samedi 26 décembre est un Shabbat. Fin décembre, Shabbat commence vers 16 h à Amsterdam et se termine vers 17 h 20 le samedi. Vérifier les horaires exacts avant de figer le programme.", tags: ['important'], budget: '', link: web('zmanim Amsterdam shabbat times'), verif: true },
      { cat: 'shabbat', e: '🍷', t: 'Repas de Shabbat avec Chabad', d: "Chabad Amsterdam organise des repas de Shabbat pour les visiteurs, sur réservation. Option clé en main pour un vendredi soir de groupe.", budget: 'participation libre / fixe', tags: ['casher'], link: web('Chabad Amsterdam Shabbat meals visitors'), verif: true },
      { cat: 'shabbat', e: '🕍', t: 'Synagogue portugaise (1675)', d: "Une des plus belles synagogues d'Europe, éclairée uniquement aux bougies. Visite classe le vendredi après-midi.", budget: '~15-20 €', tags: ['culture'], link: maps('Portuguese Synagogue Amsterdam'), verif: true },
      { cat: 'shabbat', e: '🚆', t: 'Transport', d: "Paris → Amsterdam : Eurostar, environ 3 h 20. Vols depuis Paris, Lyon ou Nice : 1 h 15. Sur place : tram, ferry gratuit vers Noord, vélos. Prendre une carte de transport de groupe.", tags: ['astuce'], budget: '' },
      { cat: 'shabbat', e: '⚠️', t: 'Règles locales', d: "Amsterdam ne tolère plus les EVG bruyants dans le centre : amendes pour l'alcool dans la rue dans certaines zones, et pas de déguisements « nus ». On reste drôles, pas lourds.", tags: ['astuce'], budget: '' },
    ],
  };
})();
