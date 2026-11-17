const { json, getConfig, hgetall, str } = require('./_lib');
// Public : infos de l'EVG + prénoms de ceux qui ont répondu "je viens"
module.exports = async (req, res) => {
  try {
    const cfg = await getConfig();
    const rsvps = await hgetall('evg:rsvps');
    const venus = rsvps.filter(r => r.statut === 'oui').map(r => str(r.prenom, 40));
    const defisExtra = (await hgetall('evg:defis')).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')).map(d => ({ id: d.id, n: d.n, t: d.t }));
    json(res, 200, { config: cfg, venus, nbReponses: rsvps.length, defisExtra });
  } catch (e) { json(res, 500, { error: 'Erreur serveur' }); }
};
