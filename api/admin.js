const crypto = require('crypto');
const { redis, hgetall, json, getUser, getConfig, DISPLAY, str, seedActivities, body, isJson, inviteCode } = require('./_lib');
const { loadIdeas } = require('./_ideas');
const COLLECTIONS = ['rsvps', 'ideas', 'tasks', 'notes', 'activities', 'votes', 'defis'];
const READONLY = ['rsvps', 'votes'];

module.exports = async (req, res) => {
  const user = getUser(req);
  if (!user) return json(res, 401, { error: 'Non connecté' });
  const col = req.query.col;
  const writes = ['POST', 'PUT'].includes(req.method);
  if (writes && !isJson(req)) return json(res, 400, { error: 'Requête invalide.' });
  const B = writes ? body(req) : {};
  if (!B) return json(res, 400, { error: 'JSON invalide.' });
  try {
    // --- Config publique (infos de l'EVG) ---
    if (col === 'config') {
      if (req.method === 'GET') return json(res, 200, await getConfig());
      if (req.method === 'PUT') {
        const c = B;
        const clean = {
          lieu: str(c.lieu, 80), intro: str(c.intro, 1500), deadline: str(c.deadline, 10), dateFinale: str(c.dateFinale, 16),
          dateOptions: (c.dateOptions || []).slice(0, 8).map((o, i) => ({ id: str(o.id, 20) || 'd' + i, label: str(o.label, 60) })).filter(o => o.label),
          budget: (c.budget || []).slice(0, 15).map(b => ({ poste: str(b.poste, 60), montant: Math.max(0, parseFloat(b.montant) || 0) })).filter(b => b.poste),
          nbActivites: Math.max(1, Math.min(12, parseInt(c.nbActivites, 10) || 6)), inviterMarie: !!c.inviterMarie, budgetActivites: Math.max(0, parseFloat(c.budgetActivites) || 0),
          programme: (c.programme || []).slice(0, 10).map(d => ({ jour: str(d.jour, 40), titre: str(d.titre, 80), items: (d.items || []).slice(0, 12).map(i => str(i, 140)).filter(Boolean) })).filter(d => d.jour || d.titre),
        };
        await redis('SET', 'evg:config', JSON.stringify(clean));
        return json(res, 200, clean);
      }
      return json(res, 405, { error: 'Méthode non autorisée' });
    }

    // --- Code d'invitation (contenu dans le lien envoyé aux participants) ---
    if (col === 'invite') {
      if (req.method === 'POST') { await redis('DEL', 'evg:invite'); }          // régénérer = l'ancien lien ne permet plus de créer un compte
      return json(res, 200, { code: await inviteCode() });
    }
    // --- Comptes participants : liste (sans le code) + réinitialisation ---
    if (col === 'members') {
      if (req.method === 'GET') return json(res, 200, (await hgetall('evg:members')).map(m => ({ id: m.id, prenom: m.prenom, nom: m.nom, createdAt: m.createdAt })));
      if (req.method === 'DELETE') { await redis('HDEL', 'evg:members', str(req.query.id, 40)); await redis('DEL', `evg:fail:${str(req.query.id, 40)}`); return json(res, 200, { ok: true }); }
      return json(res, 405, { error: 'Méthode non autorisée' });
    }
    // --- Idées proposées par les participants : modération ---
    if (col === 'proposals') {
      if (req.method === 'GET') return json(res, 200, await loadIdeas(null, { includeHidden: true }));
      if (req.method === 'POST') {
        const id = str(B.id, 40), raw = await redis('HGET', 'evg:ideas', id); if (!raw) return json(res, 404, { error: 'Idée introuvable.' });
        const idea = JSON.parse(raw);
        if (['nouvelle', 'retenue', 'refusee', 'cachee'].includes(B.statut)) idea.statut = B.statut;
        if (B.note !== undefined) idea.note = str(B.note, 200);
        if (B.delcid) await redis('HDEL', `evg:icom:${id}`, str(B.delcid, 20));
        await redis('HSET', 'evg:ideas', id, JSON.stringify(idea)); return json(res, 200, { ok: true });
      }
      if (req.method === 'DELETE') { const id = str(req.query.id, 40); await redis('HDEL', 'evg:ideas', id); await redis('DEL', `evg:ilikes:${id}`, `evg:icom:${id}`); return json(res, 200, { ok: true }); }
      return json(res, 405, { error: 'Méthode non autorisée' });
    }

    if (!COLLECTIONS.includes(col)) return json(res, 400, { error: 'Collection inconnue' });
    const key = `evg:${col}`;

    if (req.method === 'GET') {
      if (col === 'activities') await seedActivities();
      const items = await hgetall(key);
      return json(res, 200, items);
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      if (READONLY.includes(col)) return json(res, 400, { error: 'Lecture seule.' });
      const b = B;
      const raw = JSON.stringify(b);
      if (raw.length > 20000) return json(res, 400, { error: 'Trop volumineux' });
      const id = str(b.id, 40) || crypto.randomBytes(6).toString('hex');
      const prev = await redis('HGET', key, id);
      const old = prev ? JSON.parse(prev) : {};
      if (b.source !== undefined && !/^https?:\/\//i.test(String(b.source))) b.source = '';
      const item = { ...old, ...b, id, updatedAt: new Date().toISOString(), updatedBy: user };
      if (!old.createdAt) { item.createdAt = item.updatedAt; item.createdBy = user; }
      if (col === 'ideas') {
        // un admin ne peut modifier que son propre vote
        item.votes = { ...(old.votes || {}) };
        if (typeof b.vote === 'boolean') { if (b.vote) item.votes[user] = true; else delete item.votes[user]; }
        delete item.vote;
        item.createdBy = old.createdBy || user;
      }
      await redis('HSET', key, id, JSON.stringify(item));
      return json(res, 200, item);
    }
    if (req.method === 'DELETE') {
      const id = str(req.query.id, 40);
      if (!id) return json(res, 400, { error: 'id manquant' });
      await redis('HDEL', key, id);
      return json(res, 200, { ok: true });
    }
    json(res, 405, { error: 'Méthode non autorisée' });
  } catch (e) { json(res, 500, { error: 'Erreur serveur' }); }
};
