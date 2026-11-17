const { redis, json, rateLimit, getConfig, str, body, isJson, getMember } = require('./_lib');

// GET  : ma dernière réponse (pour pré-remplir le formulaire)
// POST : enregistre / met à jour MA réponse (compte requis)
module.exports = async (req, res) => {
  try {
    const me = await getMember(req);
    if (!me) return json(res, 401, { error: 'Connecte-toi pour répondre.' });
    if (req.method === 'GET') {
      const r = await redis('HGET', 'evg:rsvps', me.id);
      return json(res, 200, { rsvp: r ? JSON.parse(r) : null });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée' });
    if (!(await rateLimit(req, 'rsvp', 40, 3600))) return json(res, 429, { error: 'Trop de tentatives, réessaie plus tard.' });
    if (!isJson(req)) return json(res, 400, { error: 'Requête invalide.' });
    const b = body(req); if (!b) return json(res, 400, { error: 'Requête invalide.' });
    if (!['oui', 'peut-etre', 'non'].includes(b.statut)) return json(res, 400, { error: 'Dis-nous si tu viens.' });

    const cfg = await getConfig();
    const dispos = {};
    for (const o of cfg.dateOptions) { const v = b.dispos?.[o.id]; dispos[o.id] = ['oui', 'peut-etre', 'non'].includes(v) ? v : 'non'; }
    const old = await redis('HGET', 'evg:rsvps', me.id);
    const rsvp = {
      id: me.id, prenom: me.prenom, nom: me.nom,
      contact: str(b.contact, 60), statut: b.statut, dispos,
      lieuOk: ['oui', 'non', 'autre'].includes(b.lieuOk) ? b.lieuOk : 'oui', lieuIdee: str(b.lieuIdee, 120),
      budget: ['ok', 'serre', 'trop'].includes(b.budget) ? b.budget : 'ok', budgetMax: Math.max(0, Math.min(10000, parseInt(b.budgetMax, 10) || 0)),
      depart: str(b.depart, 80), transport: ['avion', 'train', 'voiture', 'peu-importe'].includes(b.transport) ? b.transport : 'peu-importe',
      regime: str(b.regime, 200), idees: str(b.idees, 1000), commentaire: str(b.commentaire, 1000),
      createdAt: old ? (JSON.parse(old).createdAt || new Date().toISOString()) : new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await redis('HSET', 'evg:rsvps', me.id, JSON.stringify(rsvp));
    json(res, 200, { ok: true, modifie: !!old });
  } catch (e) { json(res, 500, { error: 'Erreur serveur' }); }
};
