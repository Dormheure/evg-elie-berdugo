const { json, getUser, DISPLAY, clearCookie } = require('./_lib');
module.exports = (req, res) => {
  if (req.method === 'POST') { res.setHeader('Set-Cookie', clearCookie()); return json(res, 200, { ok: true }); } // déconnexion
  const u = getUser(req);
  if (!u) return json(res, 401, { error: 'Non connecté' });
  json(res, 200, { user: u, nom: DISPLAY[u], admins: Object.entries(DISPLAY).map(([id, nom]) => ({ id, nom })) });
};
