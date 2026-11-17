const crypto = require('crypto');
const { redis, hgetall, json, rateLimit, getConfig, str, norm, seedActivities } = require('./_lib');
const voterId = (prenom, nom) => crypto.createHash('sha1').update(norm(prenom) + '|' + norm(nom)).digest('hex').slice(0, 16);

// GET  : catalogue + compteurs de votes (+ mes votes si prenom/nom fournis)
// POST : enregistre les votes d'un participant {prenom, nom, votes:{id:'oui'|'non'}}
module.exports = async (req, res) => {
  try {
    await seedActivities();
    const acts = (await hgetall('evg:activities')).filter(a => a.statut !== 'cachee');
    const ids = new Set(acts.map(a => a.id));

    if (req.method === 'POST') {
      if (!(await rateLimit(req, 'votes', 120, 3600))) return json(res, 429, { error: 'Trop de tentatives.' });
      const b = req.body || {};
      const prenom = str(b.prenom, 40), nom = str(b.nom, 40);
      if (!prenom) return json(res, 400, { error: 'Entre ton prénom avant de voter.' });
      const id = voterId(prenom, nom);
      const old = await redis('HGET', 'evg:votes', id);
      if (!old && (await redis('HLEN', 'evg:votes')) > 300) return json(res, 400, { error: 'Trop de votants.' });
      const votes = old ? JSON.parse(old).votes : {};
      for (const [k, v] of Object.entries(b.votes || {})) {
        if (!ids.has(k)) continue;
        if (v === 'oui' || v === 'non') votes[k] = v; else delete votes[k];
      }
      await redis('HSET', 'evg:votes', id, JSON.stringify({ id, prenom, nom, votes, updatedAt: new Date().toISOString() }));
      return json(res, 200, { ok: true, votes });
    }

    const all = await hgetall('evg:votes');
    const counts = {};
    for (const a of acts) counts[a.id] = { oui: 0, non: 0 };
    for (const v of all) for (const [k, x] of Object.entries(v.votes || {})) if (counts[k]) counts[k][x === 'oui' ? 'oui' : 'non']++;
    let mesVotes = null;
    if (req.query.prenom) {
      const mine = await redis('HGET', 'evg:votes', voterId(str(req.query.prenom, 40), str(req.query.nom, 40)));
      mesVotes = mine ? JSON.parse(mine).votes : {};
    }
    const cfg = await getConfig();
    const rsvps = await hgetall('evg:rsvps');
    json(res, 200, {
      activities: acts.map(({ source, ...a }) => ({ ...a, ...counts[a.id] && { counts: counts[a.id] }, source })),
      mesVotes, nbVotants: all.length,
      nbParticipants: rsvps.filter(r => r.statut === 'oui').length + 1, // + Elie
      config: { nbActivites: cfg.nbActivites, inviterMarie: cfg.inviterMarie, budgetActivites: cfg.budgetActivites },
    });
  } catch (e) { json(res, 500, { error: 'Erreur serveur' }); }
};
