const { json, getConfig, hgetall, str } = require('./_lib');
// Public : infos de l'EVG + prénoms de ceux qui ont répondu "je viens"
module.exports = async (req, res) => {
  try {
    const cfg = await getConfig();
    const rsvps = await hgetall('evg:rsvps');
    const venus = rsvps.filter(r => r.statut === 'oui').map(r => str(r.prenom, 40));
    json(res, 200, { config: cfg, venus, nbReponses: rsvps.length });
  } catch (e) { json(res, 500, { error: 'Erreur serveur' }); }
};
