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

  // Défis du jour J. n = niveau de piment (1, 2, 3) ou 'g' pour un défi de groupe. Modifie / ajoute les tiens ici.
  defis: [
    { n: 1, t: "Se présenter comme « le Dr Elie » à un inconnu et lui prendre le pouls 10 secondes (avec son accord)." },
    { n: 1, t: "Rédiger une ordonnance sur un ticket de resto : « 3 bières, matin, midi et soir », et la faire signer par un barman." },
    { n: 1, t: "Parler uniquement en termes médicaux pendant 15 minutes (« garçon, j'ai besoin d'une dose urgente de bière »)." },
    { n: 1, t: "Faire dire « docteur » à 3 inconnus sans jamais le leur demander." },
    { n: 1, t: "Commander toute une tournée avec un faux accent hollandais, sans jamais craquer." },
    { n: 1, t: "Poser avec 5 vélos différents en mode rockstar (sans en déplacer aucun, on n'est pas des voleurs)." },
    { n: 2, t: "Chanter 30 secondes sur une terrasse, sans honte, pendant que le groupe applaudit comme à un concert." },
    { n: 2, t: "Donner une consultation fictive de 2 minutes à un touriste consentant. Le diagnostic est imposé par le groupe." },
    { n: 2, t: "Obtenir 10 high-fives d'inconnus en 10 minutes. Interdit d'expliquer pourquoi." },
    { n: 2, t: "Improviser un discours de mariage de 45 secondes, debout sur une chaise, avec 3 mots imposés : « scalpel », « Ajax », « divorce »." },
    { n: 2, t: "Faire la statue vivante 1 minute au milieu d'un pont. Le groupe fait la quête." },
    { n: 2, t: "Danser 1 minute sur le quai, sur le morceau choisi par le groupe, sans regarder personne dans les yeux." },
    { n: 3, t: "Faire annoncer au micro d'un bar que « le futur marié est parmi nous » et survivre aux applaudissements." },
    { n: 3, t: "Négocier un shot offert avec l'addition. Échec : il paie la tournée suivante." },
    { n: 3, t: "Faire 1 minute de marche du canard dans une rue passante, avec le visage sérieux d'un chirurgien en plein bloc." },
    { n: 3, t: "Convaincre un inconnu de poser sur un selfie « avec son médecin ». Sourire de l'inconnu obligatoire." },
    { n: 3, t: "Faire une déclaration d'amour de 20 secondes à un barman, un serveur ou un vélo. Au choix, mais avec conviction." },
    { n: 3, t: "Envoyer un vocal de 20 secondes à sa future femme avec 3 mots imposés par le groupe (le groupe valide le texte avant l'envoi)." },
    { n: "g", t: "Reproduire « La Ronde de nuit » de Rembrandt avec tout le groupe devant un canal. Le marié au centre, évidemment." },
    { n: "g", t: "Toute la bande appelle Elie « Docteur » toute la soirée. Un oubli = 1 € dans la cagnotte." },
    { n: "g", t: "Chacun écrit une « ordonnance » avec le pire conseil de mariage possible. Lecture à voix haute au dîner, par Elie, sans rire." },
  ],
};
