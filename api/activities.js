const { redis, hgetall, json, rateLimit, getConfig, str, seedActivities, body, isJson, getMember } = require('./_lib');

// GET  : catalogue + compteurs de votes + mes votes (compte requis)
// POST : enregistre mes votes {votes:{id:'oui'|'non'|null}}
module.exports = async (req, res) => {
  try {
    const me = await getMember(req); if (!me) return json(res, 401, { error: 'Non connecté' });
    await seedActivities();
    const acts = (await hgetall('evg:activities')).filter(a => a.statut !== 'cachee');
    const ids = new Set(acts.map(a => a.id));

    if (req.method === 'POST') {
      if (!(await rateLimit(req, 'votes', 200, 3600))) return json(res, 429, { error: 'Trop de tentatives.' });
      if (!isJson(req)) return json(res, 400, { error: 'Requête invalide.' });
      const b = body(req); if (!b) return json(res, 400, { error: 'Requête invalide.' });
      const id = me.id, prenom = me.prenom, nom = me.nom;
      const old = await redis('HGET', 'evg:votes', id);
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
    const mine = await redis('HGET', 'evg:votes', me.id), mesVotes = mine ? JSON.parse(mine).votes : {};
    const cfg = await getConfig();
    const rsvps = await hgetall('evg:rsvps');
    json(res, 200, {
      activities: acts.map(a => ({ ...a, counts: counts[a.id] })),
      mesVotes, nbVotants: all.length,
      nbParticipants: rsvps.filter(r => r.statut === 'oui').length + 1, // + Elie
      config: { nbActivites: cfg.nbActivites, inviterMarie: cfg.inviterMarie, budgetActivites: cfg.budgetActivites },
    });
  } catch (e) { json(res, 500, { error: 'Erreur serveur' }); }
};
