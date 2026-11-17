// ============================================================
//  ✏️  FICHIER À ÉDITER — tout le contenu du site est ici.
//  Photos : mets tes images dans le dossier /photos puis
//  mets leur nom dans "photos" ci-dessous (ex: "elie1.jpg").
//  Tant qu'il n'y a pas de photo, un faux cadre rigolo s'affiche.
// ============================================================
window.SITE = {
  nom: "Elie Berdugo",
  titre: "Le Dr. Berdugo passe en salle d'op… matrimoniale",
  sousTitre: "EVG Amsterdam 2026 · 12 ans d'études pour finir sur un bateau avec 11 potes et une pompe à bière.",



  // Photo principale tout en haut du site (nom du fichier dans /photos)
  photoPrincipale: "elie13.jpg",

  photos: [
    { fichier: "elie01.jpg", legende: "Le regard d'un mec à qui on vient de dire « c'est toi qui paies »" },
    { fichier: "elie02.jpg", legende: "Retrouvé dans un local de rangement. Il « révisait »." },
    { fichier: "elie03.jpg", legende: "Phase 1 du plan d'évasion : disparaître dans sa doudoune dès qu'on dit « EVG »" },
    { fichier: "elie04.jpg", legende: "Café à la main, voiture mal garée derrière : il n'a rien vu, il ne voit jamais rien" },
    { fichier: "elie05.jpg", legende: "Répond « j'arrive dans 2 min » à 47 personnes en même temps" },
    { fichier: "elie06.jpg", legende: "Selfie avec un témoin : l'un des deux a compris où on l'emmène" },
    { fichier: "elie07.jpg", legende: "Quand il t'explique un truc qu'il a lu hier comme s'il l'avait découvert en 2009" },
    { fichier: "elie08.jpg", legende: "Le visage de celui qui découvre le prix du billet d'avion" },
    { fichier: "elie09.jpg", legende: "Débat politique avec un pare-brise. Il a perdu." },
    { fichier: "elie10.jpg", legende: "Rapporte un billet de 0 € de Monaco : son seul placement rentable à ce jour" },
    { fichier: "elie11.jpg", legende: "Entraînement au mariage : dormir pendant que les autres décident pour lui" },
    { fichier: "elie12.jpg", legende: "Il a lu le livre : on prévoit donc 3 piqûres dans le budget" },
    { fichier: "elie13.jpg", legende: "La moustache jaune : dernier acte de liberté avant l'alliance" },
    { fichier: "elie14.jpg", legende: "Selfie de 3h du matin. Ne posez pas de questions." },
    { fichier: "elie15.jpg", legende: "Il fixe le plafond en cherchant une excuse valable pour ne pas venir" },
    { fichier: "elie16.jpg", legende: "En route vers la mairie : « ne me rattrapez pas »" },
    { fichier: "elie17.jpg", legende: "Le sourcil de celui qui vient de lire ton ordonnance" },
    { fichier: "elie18.jpg", legende: "Dans la voiture pour l'aéroport : il croit encore pouvoir annuler" },
    { fichier: "elie19.jpg", legende: "Patient en observation : il a dit « je viens » avant d'avoir lu le programme" },
    { fichier: "elie20.jpg", legende: "Le regard quand on lui annonce que la cagnotte, c'est lui" },
  ],

  diagnostic: [
    ["Patient", "Elie B., 100 % consentant (en théorie)"],
    ["Diagnostic", "Mariage imminent. Aucun traitement connu."],
    ["Symptômes", "Dit « oui » à tout, y compris à cette EVG"],
    ["Antécédents", "Études de médecine, gardes de nuit, célibat (terminé)"],
    ["Traitement", "Bière en intraveineuse, vélo-bar, humiliations légères"],
    ["Posologie", "3 fois par jour, pendant et en dehors des repas (casher)"],
    ["Contre-indication", "Dire « j'ai garde demain » (déjà essayé, ça n'a pas marché)"],
    ["Pronostic", "Réservé. Comme le resto casher."],
    ["Espérance de liberté", "3 jours, à compter de l'atterrissage"],
  ],

  // Défis du jour J (version hardcore). n = niveau (1 🌶️, 2 🌶️🌶️, 3 🌶️🌶️🌶️, 4 💀) ou 'g' pour un défi de groupe. Modifie / ajoute les tiens ici.
  defis: [
    { n: 1, t: "Elie porte toute la journée un bracelet en carton « PROPRIÉTÉ DE MADAME BERDUGO ». Il le perd ? Il en porte deux." },
    { n: 1, t: "Interdiction de dire « oui » ou « non » pendant 2 heures. Chaque faute = 15 pompes sur place, même en pleine rue." },
    { n: 1, t: "Elie passe la journée avec la moustache jaune collée. Il la retire ? Il paie la tournée." },
    { n: 1, t: "Toutes ses commandes, Elie les passe avec l'accent d'un cow-boy texan. Le serveur ne comprend pas ? Il recommence en chantant." },
    { n: 1, t: "Le groupe appelle Elie « Docteur Love » pendant tout le séjour. Il répond à son prénom ? 1 € dans la cagnotte." },
    { n: 1, t: "Elie fait signer son « certificat de fin de célibat » à 10 mecs dans la rue, avec leur pays d'origine. Bonus si un Texan." },
    { n: 1, t: "Elie dort avec une tétine. Photo au réveil envoyée dans le groupe avant qu'il ouvre les yeux." },
    { n: 2, t: "Elie mange un hareng cru entier à la hollandaise : on le tient par la queue, tête en arrière, d'une seule traite (stand avec poisson à écailles, cacheroute à vérifier)." },
    { n: 2, t: "Elie tient un stand « Consultation à 1 € » sur une place : 10 patients minimum, ordonnances absurdes rédigées par le groupe. Tout va dans la cagnotte." },
    { n: 2, t: "Elie chante l'hymne néerlandais (le Wilhelmus) à un barman pour obtenir un verre gratuit. Refus = il le chante une deuxième fois, plus fort." },
    { n: 2, t: "Elie fait un selfie avec 10 hommes moustachus. Chaque moustache doit être plus belle que la sienne." },
    { n: 2, t: "Elie passe 3 minutes dans un bain glacé à 2 °C. Le groupe fait 1 minute pour l'honneur. Celui qui sort avant paie les chocolats chauds." },
    { n: 2, t: "Déguisement imposé pour toute l'après-midi : tulipe géante, sabots, bonnet orange. Interdit de l'enlever, même dans le tram." },
    { n: 2, t: "Elie fait un discours de 2 minutes debout sur un banc à la gare Centrale : « Pourquoi je renonce à ma liberté ». Applaudissements obligatoires du groupe." },
    { n: 3, t: "Épilation à la cire d'une jambe entière, sur le bateau, par le groupe. L'autre jambe reste poilue jusqu'à la fin du séjour." },
    { n: 3, t: "Elie affronte un kickboxeur pro pendant 1 round (gants, casque, protège-dents). Il tient debout ? Respect. Il tombe ? Vidéo pour le mariage." },
    { n: 3, t: "Tatouage éphémère géant de la tête du groupe sur l'épaule d'Elie. Il le garde jusqu'au retour, photo chaque matin." },
    { n: 3, t: "Le groupe choisit la tenue d'Elie pour la soirée : combinaison léopard intégrale. Il la porte jusqu'au dernier bar, sans veste par-dessus." },
    { n: 3, t: "Open mic : Elie monte sur scène et fait 5 minutes de stand-up en anglais sur « ma vie de futur marié ». Les 3 sujets sont tirés au sort." },
    { n: 3, t: "Elie détruit à la masse, dans la rage room, un objet qui symbolise sa vie de célibataire (choisi par le groupe). Vidéo au ralenti obligatoire." },
    { n: 3, t: "Le barbier coupe la moitié de la barbe d'Elie… ou Elie paie une tournée à tout le groupe. Il choisit devant tout le monde, en 10 secondes." },
    { n: 3, t: "Elie passe la soirée menotté (menottes en plastique) au pote tiré au sort. Toilettes comprises. Personne n'a la clé avant minuit." },
    { n: 4, t: "L'ABANDON façon Very Bad Trip : on lâche Elie en pyjama à Zaandam, en journée, avec 10 € et sans téléphone. Il doit retrouver le groupe avant 2 h. Un pote le suit de loin, au cas où." },
    { n: 4, t: "Faux enlèvement : cagoules, van loué, gilets assortis, musique de film d'action. On « kidnappe » Elie au réveil et il ne sait pas où il va (aucun faux uniforme officiel : c'est interdit)." },
    { n: 4, t: "Elie appelle son futur beau-père en visio depuis le bateau et le remercie « pour tout » en néerlandais, phrase écrite par le groupe. Sans rire." },
    { n: 4, t: "Le « Elie Challenge » : 10 épreuves en 1 heure dans la ville (pompes, chant, hareng, selfie, discours…). Chaque épreuve ratée = un gage choisi par le groupe." },
    { n: 4, t: "Elie passe 24 h habillé exactement comme le groupe l'a décidé la veille, du slip au chapeau. Il découvre la tenue au réveil." },
    { n: 4, t: "Le tribunal du dernier soir : chef d'accusation « abandon de célibat en bande organisée », procureur, avocat nul, jury. La peine prononcée est appliquée sur-le-champ." },
    { n: "g", t: "Photo de groupe façon pochette d'album de boys band des années 90 : chemises ouvertes, poses dramatiques, Elie au centre, ventilateur obligatoire." },
    { n: "g", t: "Battle de rap contre Elie : chacun a 30 secondes pour le détruire sur un beat. Elie a le droit de répondre, tout le monde vote." },
    { n: "g", t: "Les Jeux olympiques du Dr Elie : course en sabots, lancer de hareng, sumo gonflable, apnée dans le bain glacé. Médailles en chocolat, podium filmé." },
    { n: "g", t: "Chacun doit se faire offrir quelque chose par un commerçant (un café, une frite, un sticker) en racontant que c'est l'EVG d'Elie. Le dernier à réussir paie le dîner." },
    { n: "g", t: "Match de basket fauteuil contre une vraie équipe handisport. Ils vont vous détruire, et Elie doit leur offrir le verre d'après-match." },
    { n: "g", t: "Tout le groupe en chemise blanche, lunettes noires et sac banane façon « lendemain de cuite à Vegas » pour la photo officielle devant le Rijksmuseum." },
  ],
};
