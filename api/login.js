const { json, rateLimit, checkPassword, makeCookie, norm, DISPLAY } = require('./_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée' });
  try {
    if (!(await rateLimit(req, 'login', 10, 900))) return json(res, 429, { error: 'Trop d\'essais. Réessaie dans 15 minutes.' });
    const user = norm(req.body?.user), pass = String(req.body?.password || '');
    if (!DISPLAY[user] || !checkPassword(user, pass)) return json(res, 401, { error: 'Identifiants incorrects.' });
    res.setHeader('Set-Cookie', makeCookie(user, req));
    json(res, 200, { ok: true, user, nom: DISPLAY[user] });
  } catch (e) { json(res, 500, { error: 'Erreur serveur' }); }
};
