const crypto = require('crypto');
const L = require('./_lib');
const { redis, json, body, isJson, str, hgetall, rateLimit } = L;

// Fil « Quoi de neuf » : annonces des orgas + ce qui se passe sur le site (photos, défis, idées, arrivées)
// GET  : { annonces: [...], items: [...] } (40 derniers évènements)
// POST : announce {texte} | delannounce {id}   (orgas uniquement)
module.exports = async (req, res) => {
  try {
    const s = await L.getSession(req); if (!s) return json(res, 401, { error: 'Connecte-toi.' });
    const me = s.member, isAdmin = me.role === 'admin';
    if (req.method === 'GET') {
      const [ann, album, done, ideas, members] = await Promise.all([hgetall('evg:annonces'), hgetall('evg:album'), hgetall('evg:defidone'), hgetall('evg:ideas'), hgetall('evg:members')]);
      const items = [
        ...album.map(p => ({ type: p.kind === 'proof' ? 'proof' : 'photo', at: p.createdAt, who: p.auteur, id: p.id, text: p.legende || '', k: p.defi || '' })),
        ...done.map(d => ({ type: 'defi', at: d.at, who: d.auteur, k: d.k, pts: d.pts })),
        ...ideas.filter(i => i.statut !== 'cachee').map(i => ({ type: 'idee', at: i.createdAt, who: i.auteur, text: i.titre || '' })),
        ...members.filter(m => (m.status || 'active') === 'active' && m.role !== 'admin' && m.createdAt).map(m => ({ type: 'join', at: m.createdAt, who: m.prenom })),
      ].filter(x => x.at).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
      const annonces = ann.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
      return json(res, 200, { annonces, items, canPost: isAdmin });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée' });
    if (!isAdmin) return json(res, 403, { error: 'Réservé aux orgas.' });
    if (!isJson(req)) return json(res, 400, { error: 'Requête invalide.' });
    const b = body(req); if (!b) return json(res, 400, { error: 'Requête invalide.' });
    if (!(await rateLimit(req, 'feed', 60, 3600))) return json(res, 429, { error: 'Doucement 😅' });
    if (b.action === 'announce') {
      const texte = str(b.texte, 500); if (texte.length < 2) return json(res, 400, { error: 'Annonce vide.' });
      const a = { id: crypto.randomBytes(5).toString('hex'), texte, auteur: me.prenom, createdAt: new Date().toISOString() };
      await redis('HSET', 'evg:annonces', a.id, JSON.stringify(a));
      return json(res, 200, { ok: true });
    }
    if (b.action === 'delannounce') { await redis('HDEL', 'evg:annonces', L.cleanId(b.id, 20)); return json(res, 200, { ok: true }); }
    json(res, 400, { error: 'Action inconnue.' });
  } catch (e) { json(res, 500, { error: 'Erreur serveur' }); }
};
