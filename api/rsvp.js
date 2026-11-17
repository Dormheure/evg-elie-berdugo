const crypto = require('crypto');
const { redis, json, rateLimit, getConfig, str, norm } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée' });
  try {
    if (!(await rateLimit(req, 'rsvp', 20, 3600))) return json(res, 429, { error: 'Trop de tentatives, réessaie plus tard.' });
    const b = req.body || {};
    const prenom = str(b.prenom, 40), nom = str(b.nom, 40);
    if (!prenom) return json(res, 400, { error: 'Le prénom est obligatoire.' });
    if (!['oui', 'peut-etre', 'non'].includes(b.statut)) return json(res, 400, { error: 'Dis-nous si tu viens.' });

    const cfg = await getConfig();
    const dispos = {};
    for (const o of cfg.dateOptions) {
      const v = b.dispos?.[o.id];
      dispos[o.id] = ['oui', 'peut-etre', 'non'].includes(v) ? v : 'non';
    }
    const budgetMax = Math.max(0, Math.min(10000, parseInt(b.budgetMax, 10) || 0));
    const id = crypto.createHash('sha1').update(norm(prenom) + '|' + norm(nom)).digest('hex').slice(0, 16);

    if ((await redis('HLEN', 'evg:rsvps')) > 300) return json(res, 400, { error: 'Trop de réponses.' });
    const old = await redis('HGET', 'evg:rsvps', id);
    const rsvp = {
      id, prenom, nom,
      contact: str(b.contact, 60),
      statut: b.statut,
      dispos,
      lieuOk: ['oui', 'non', 'autre'].includes(b.lieuOk) ? b.lieuOk : 'oui',
      lieuIdee: str(b.lieuIdee, 120),
      budget: ['ok', 'serre', 'trop'].includes(b.budget) ? b.budget : 'ok',
      budgetMax,
      depart: str(b.depart, 80),
      transport: ['avion', 'train', 'voiture', 'peu-importe'].includes(b.transport) ? b.transport : 'peu-importe',
      regime: str(b.regime, 200),
      idees: str(b.idees, 1000),
      commentaire: str(b.commentaire, 1000),
      createdAt: old ? (JSON.parse(old).createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await redis('HSET', 'evg:rsvps', id, JSON.stringify(rsvp));
    json(res, 200, { ok: true, modifie: !!old });
  } catch (e) { json(res, 500, { error: 'Erreur serveur' }); }
};
