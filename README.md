# EVG Elie Berdugo — Amsterdam 2026
- Site public (`index.html`) : infos, formulaire de réponse, vote des activités, podium + jauge de prix.
- Espace orga (`/admin`) : réponses, activités (valider/refuser), idées, tâches, notes, réglages. Comptes : david / alon / raphael.
- Comptes : chaque participant crée un compte (prénom + nom + code perso) via le **lien d'invitation** (onglet Membres de l'admin). Réponses, votes, idées et likes sont liés au compte.
- Idées : les participants proposent, likent et commentent ; les orgas les retiennent (→ activité ou défi) depuis l'onglet Propositions.
- API : dossier `api/` (fonctions Vercel) + base Redis (Upstash) via les variables `KV_REST_API_*`.
- Secrets : `ADMIN_USERS` (hashs) et `SESSION_SECRET` sont dans les variables d'environnement Vercel, jamais dans le dépôt.
- Contenu statique (photos, légendes, défis) : `data.js`. Catalogue d'activités initial : `api/_activities.json` (ensuite modifiable depuis l'admin).
- Déployer : `vercel deploy --prod --yes`. Dev local : `vercel dev`.
