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

  photos: [
    { fichier: "", legende: "Elie en garde de 24h : 'ça va, je suis réveillé'" },
    { fichier: "", legende: "Elie découvre qu'on a booké Amsterdam" },
    { fichier: "", legende: "Dernière photo avant la liberté 🕊️" },
    { fichier: "", legende: "Elie quand on parle de l'externat" },
    { fichier: "", legende: "Elie après 1 Heineken (état critique)" },
    { fichier: "", legende: "Le futur marié, sûr de lui (il ne l'est pas)" },
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
