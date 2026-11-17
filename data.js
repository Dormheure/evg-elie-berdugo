// ============================================================
//  ✏️  FICHIER À ÉDITER — tout le contenu du site est ici.
//  Photos : mets tes images dans le dossier /photos puis
//  mets leur nom dans "photos" ci-dessous (ex: "elie1.jpg").
//  Tant qu'il n'y a pas de photo, un faux cadre rigolo s'affiche.
// ============================================================
window.SITE = {
  nom: "Elie Berdugo",
  titre: "Le Dr. Berdugo passe en salle d'op… matrimoniale",
  sousTitre: "EVG Amsterdam 2026 — le patient ne sait pas encore ce qui l'attend.",

  // Format AAAA-MM-JJTHH:MM
  dateDepart: "2026-12-27T08:00",
  dateRetour: "2026-12-30T20:00",
  lieu: "Amsterdam 🇳🇱",

  // Numéro WhatsApp du chef d'orga (format international sans +) ou "" pour masquer
  whatsapp: "",
  lienGroupeWhatsApp: "", // ex: "https://chat.whatsapp.com/xxxx"

  // Photo principale tout en haut du site (nom du fichier dans /photos)
  photoPrincipale: "elie13.jpg",

  photos: [
    { fichier: "elie01.jpg", legende: "Le regard qui dit « j'ai garde demain »" },
    { fichier: "elie02.jpg", legende: "Selfie au milieu des tables empilées, comme sa vie" },
    { fichier: "elie03.jpg", legende: "Mode igloo activé, ne pas déranger ❄️" },
    { fichier: "elie04.jpg", legende: "Café en main, voiture mal garée en fond : tout va bien" },
    { fichier: "elie05.jpg", legende: "En train de répondre à 47 messages du groupe" },
    { fichier: "elie06.jpg", legende: "Selfie avec un pote : lui, il a compris où on l'emmène" },
    { fichier: "elie07.jpg", legende: "Explique pourquoi il a raison (il a tort)" },
    { fichier: "elie08.jpg", legende: "Quand tu entends « Amsterdam »" },
    { fichier: "elie09.jpg", legende: "Un prospectus sur le pare-brise, la politique, la vie" },
    { fichier: "elie10.jpg", legende: "Le Dr. Berdugo, collectionneur de billets à 0 € (le seul budget qu'il maîtrise)" },
    { fichier: "elie11.jpg", legende: "Révisions intensives, post-its offerts par les amis" },
    { fichier: "elie12.jpg", legende: "Futur injecteur officiel du groupe 💉" },
    { fichier: "elie13.jpg", legende: "Edition spéciale : la moustache du marié" },
    { fichier: "elie14.jpg", legende: "Selfie nocturne, mode enquête policière" },
    { fichier: "elie15.jpg", legende: "Ce regard avant le premier verre" },
    { fichier: "elie16.jpg", legende: "Selfie de rue, écouteurs filaires, vibes années 2000" },
    { fichier: "elie17.jpg", legende: "Dr. Berdugo, masque en place, sourcil à surveiller" },
    { fichier: "elie18.jpg", legende: "Mode hamster activé 🐹" },
    { fichier: "elie19.jpg", legende: "Patient en observation (sans diagnostic)" },
    { fichier: "elie20.jpg", legende: "Après 3 jours de garde, ou après 1 Heineken ?" },
  ],

  diagnostic: [
    ["Pathologie", "Mariage imminent"],
    ["Pronostic", "Réservé"],
    ["Traitement", "Bières, vélo, mauvaises décisions"],
    ["Posologie", "À volonté, 3x / jour"],
    ["Contre-indication", "Dire 'j'ai garde demain'"],
  ],

  programme: [
    { jour: "Jeu 27 déc", titre: "Admission aux urgences", items: ["Vol / train + check-in à l'hôtel", "Balade dans les canaux (on se perd exprès)", "Dîner de bienvenue", "Premier verre : le patient est stable"] },
    { jour: "Ven 28 déc", titre: "Phase de traitement", items: ["Brunch de réanimation", "Activité surprise 🤫", "Visite d'un musée (alibi culturel)", "Soirée au centre-ville"] },
    { jour: "Sam 29 déc", titre: "Soins intensifs", items: ["Vélo dans Amsterdam (casque conseillé)", "Karting / escape game / au choix", "Gros dîner + soirée de l'EVG", "Humiliation douce du marié"] },
    { jour: "Dim 30 déc", titre: "Sortie du patient", items: ["Brunch de convalescence", "Dernières photos de groupe", "Retour à la maison, sans ordonnance"] },
  ],

  budget: [
    { poste: "Transport (A/R)", montant: 150 },
    { poste: "Hôtel / Airbnb (3 nuits)", montant: 180 },
    { poste: "Activités", montant: 80 },
    { poste: "Restos & sorties", montant: 150 },
    { poste: "Part du marié (on invite Elie)", montant: 40 },
  ],

  // Idées à voter (le vote est local à chaque personne, pour de vrai sondage utilise WhatsApp)
  activites: [
    "🚲 Tour de vélo des canaux",
    "🏎️ Karting indoor",
    "🧩 Escape game",
    "🍺 Visite de brasserie Heineken",
    "🎳 Bowling + défis débiles",
    "🛶 Bateau privé sur les canaux",
  ],

  participants: [
    { nom: "Elie 👑", role: "Le patient", statut: "pas au courant de tout" },
    { nom: "David", role: "Organisateur", statut: "confirmé" },
    { nom: "Pote 2", role: "Chauffeur / bagages", statut: "à confirmer" },
    { nom: "Pote 3", role: "Photographe officiel", statut: "à confirmer" },
  ],

  defis: [
    "Faire dire « docteur » à un inconnu hollandais",
    "Faire une prescription sur un ticket de resto",
    "Photo avec un vélo qui n'est pas à lui",
    "Chanter 30 secondes sans honte en terrasse",
    "Expliquer Parcoursup à un touriste",
  ],
};
