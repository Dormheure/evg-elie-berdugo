const crypto = require('crypto');
const { redis, json, rateLimit, body, isJson, str, getMember } = require('./_lib');
const { loadIdeas, CATEGORIES } = require('./_ideas');

// GET  : toutes les idées (likes, commentaires)
// POST : create | like | comment | delete | delcomment  (compte requis)
module.exports = async (req, res) => {
  try {
    const me = await getMember(req);
    if (!me) return json(res, 401, { error: 'Connecte-toi pour voir, proposer, liker ou commenter.' });
    if (req.method === 'GET') {
      const ideas = await loadIdeas(me.id);
      return json(res, 200, { ideas, categories: CATEGORIES, member: me });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée' });
    if (!isJson(req)) return json(res, 400, { error: 'Requête invalide.' });
    const b = body(req); if (!b) return json(res, 400, { error: 'Requête invalide.' });
    if (!(await rateLimit(req, 'ideas', 120, 3600))) return json(res, 429, { error: 'Trop d\'actions, réessaie plus tard.' });
    const get = async id => { const r = await redis('HGET', 'evg:ideas', str(id, 40)); return r ? JSON.parse(r) : null; };

    if (b.action === 'create') {
      const titre = str(b.titre, 80);
      if (titre.length < 3) return json(res, 400, { error: 'Donne un titre à ton idée (3 caractères minimum).' });
      if ((await redis('HLEN', 'evg:ideas')) >= 300) return json(res, 400, { error: 'Trop d\'idées pour le moment.' });
      const mine = (await loadIdeas(me.id, { includeHidden: true })).filter(i => i.mine).length;
      if (mine >= 20) return json(res, 400, { error: 'Tu as déjà proposé 20 idées : laisse un peu de place aux autres 😅' });
      const lien = /^https?:\/\//i.test(String(b.lien || '')) ? str(b.lien, 200) : '';
      const idea = {
        id: crypto.randomBytes(6).toString('hex'), titre, description: str(b.description, 600),
        categorie: CATEGORIES.includes(b.categorie) ? b.categorie : 'Autre',
        prix: Math.max(0, Math.min(5000, parseFloat(b.prix) || 0)), lien,
        auteurId: me.id, auteur: me.prenom, createdAt: new Date().toISOString(), statut: 'nouvelle',
      };
      await redis('HSET', 'evg:ideas', idea.id, JSON.stringify(idea));
      await redis('HSET', `evg:ilikes:${idea.id}`, me.id, '1'); // l'auteur like sa propre idée (tradition)
      return json(res, 200, { ok: true, id: idea.id });
    }

    const idea = await get(b.id);
    if (!idea) return json(res, 404, { error: 'Idée introuvable.' });

    if (b.action === 'like') {
      if (b.like) await redis('HSET', `evg:ilikes:${idea.id}`, me.id, '1'); else await redis('HDEL', `evg:ilikes:${idea.id}`, me.id);
      return json(res, 200, { ok: true });
    }
    if (b.action === 'comment') {
      const texte = str(b.texte, 300); if (!texte) return json(res, 400, { error: 'Commentaire vide.' });
      if ((await redis('HLEN', `evg:icom:${idea.id}`)) >= 40) return json(res, 400, { error: 'Cette idée a déjà assez de commentaires.' });
      const c = { id: crypto.randomBytes(5).toString('hex'), auteurId: me.id, auteur: me.prenom, texte, createdAt: new Date().toISOString() };
      await redis('HSET', `evg:icom:${idea.id}`, c.id, JSON.stringify(c));
      return json(res, 200, { ok: true });
    }
    if (b.action === 'delcomment') {
      const raw = await redis('HGET', `evg:icom:${idea.id}`, str(b.cid, 20));
      if (raw && JSON.parse(raw).auteurId === me.id) await redis('HDEL', `evg:icom:${idea.id}`, str(b.cid, 20));
      return json(res, 200, { ok: true });
    }
    if (b.action === 'delete') {
      if (idea.auteurId !== me.id) return json(res, 403, { error: 'Tu ne peux supprimer que tes propres idées.' });
      await redis('HDEL', 'evg:ideas', idea.id); await redis('DEL', `evg:ilikes:${idea.id}`, `evg:icom:${idea.id}`);
      return json(res, 200, { ok: true });
    }
    json(res, 400, { error: 'Action inconnue.' });
  } catch (e) { json(res, 500, { error: 'Erreur serveur' }); }
};
