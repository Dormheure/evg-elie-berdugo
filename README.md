# EVG Elie Berdugo — Amsterdam 2026 (accès privé)
- **Tout le site est verrouillé** : `middleware.js` bloque pages, photos et scripts sans session valide (redirection vers `/login`). Seuls `/login` et `/api/*` (qui vérifie lui-même) sont publics.
- **Comptes** : chaque participant crée son compte (prénom + nom + code perso) avec le **lien d'invitation** (onglet Orga → Sécurité). Par défaut, un orga doit **valider** chaque nouveau compte.
- **Sessions « à vie »** : cookie signé `evg_s` de 400 jours, renouvelé à chaque visite ; la session vit dans Redis (`evg:sess:*`), la supprimer coupe l'accès immédiatement.
- **Appareils** : limite par participant (2 par défaut, réglable globalement ou par compte), identifiant d'appareil + empreinte ; ville/IP/dernière page suivies. Journal de sécurité `evg:log`.
- **Anti-fuite** (`security.js`) : filigrane nominatif, floutage en arrière-plan / sur raccourci de capture / inactivité, impression et copie bloquées, bouton panique 🙈 (fausse météo, maintenir « Météo » pour revenir ; aussi Échap ×2 ou secouer le téléphone).
- **Orgas** (David, Alon, Raphaël) : se connectent via l'entrée cachée `/login#cle` (ou 5 tapotements sur le cadenas) (mots de passe = `ADMIN_USERS` dans Vercel). L'onglet 🛡️ Orga est dans l'app ; `/admin` redirige vers `/#/orga`.
- **Contenu** : `data.js` (photos, légendes, défis), `api/_activities.json` (catalogue initial des votes).
- **Variables Vercel** : `SESSION_SECRET`, `ADMIN_USERS`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`.
- Déployer : `vercel deploy --prod --yes`. ⚠️ `vercel dev` utilise les variables cloud (vraie base) : tester avec un Redis factice.
