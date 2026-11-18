const L = require('./_lib');
const { redis, json, rateLimit, body, isJson, str, hgetall } = L;
const fs = require('fs'), path = require('path'), vm = require('vm');
const KEY = /^(s\d{1,3}|x[a-z0-9]{4,24})$/, LVLPTS = { 1: 1, 2: 2, 3: 3, 4: 5, g: 3 };
// La liste officielle des défis vient de data.js (même fichier que le site) : le serveur décide des points, pas le navigateur
let STATIC = null;
function staticDefis() {
  if (STATIC) return STATIC;
  for (const f of [path.join(__dirname, '..', 'data.js'), path.join(process.cwd(), 'data.js')]) {
    try { const sb = { window: {} }; vm.runInNewContext(fs.readFileSync(f, 'utf8'), sb, { timeout: 200 }); const d = sb.window.SITE && sb.window.SITE.defis; if (Array.isArray(d)) return (STATIC = d); } catch {}
  }
  return [];
}
// points d'un défi existant, ou null s'il n'existe pas (ou plus)
function ptsOf(k, extra) {
  if (k[0] === 's') { const d = staticDefis()[+k.slice(1)]; return d && LVLPTS[d.n] !== undefined ? LVLPTS[d.n] : null; }
  const d = extra[k.slice(1)]; return d && LVLPTS[d.n] !== undefined ? LVLPTS[d.n] : null;
}

// Défis partagés par tout le groupe : qui a validé quoi, preuve photo, classement des complices
// GET  : { done: {k: {...}}, board: [{auteur, pts, nb}] }
// POST : done {k, pts, proof?} | undo {k} | proof {k, proof}
module.exports = async (req, res) => {
  try {
    const s = await L.getSession(req); if (!s) return json(res, 401, { error: 'Connecte-toi.' });
    const me = s.member, isAdmin = me.role === 'admin';
    if (req.method === 'GET') {
      const [list, ex] = await Promise.all([hgetall('evg:defidone'), hgetall('evg:defis')]), extra = Object.fromEntries(ex.map(d => [d.id, d])), done = {}, by = {};
      for (const d of list) {
        const pts = ptsOf(d.k, extra); if (pts === null) continue;    // défi retiré depuis : il ne compte plus
        d.pts = pts;
        done[d.k] = { ...d, mine: d.by === me.id, canUndo: d.by === me.id || isAdmin };
        const b = by[d.by] || (by[d.by] = { auteur: d.auteur, pts: 0, nb: 0, me: d.by === me.id });
        b.pts += d.pts; b.nb++;
      }
      const board = Object.values(by).sort((a, b) => b.pts - a.pts || b.nb - a.nb);
      return json(res, 200, { done, board });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée' });
    if (!isJson(req)) return json(res, 400, { error: 'Requête invalide.' });
    const b = body(req); if (!b) return json(res, 400, { error: 'Requête invalide.' });
    if (!(await rateLimit(req, 'defis', 120, 3600))) return json(res, 429, { error: 'Doucement 😅' });
    const k = String(b.k || ''); if (!KEY.test(k)) return json(res, 400, { error: 'Défi inconnu.' });

    if (b.action === 'done') {
      const extra = k[0] === 'x' ? Object.fromEntries((await hgetall('evg:defis')).map(d => [d.id, d])) : {};
      const pts = ptsOf(k, extra); if (pts === null) return json(res, 400, { error: 'Ce défi n\'existe pas (ou plus).' });
      const d = { k, pts, by: me.id, auteur: me.prenom, at: new Date().toISOString(), proof: L.cleanId(b.proof, 20) };
      const ok = await redis('HSETNX', 'evg:defidone', k, JSON.stringify(d));
      if (!ok) { const old = L.parse(await redis('HGET', 'evg:defidone', k)); return json(res, 409, { error: `Déjà validé par ${old?.auteur || 'quelqu\'un'} !` }); }
      return json(res, 200, { ok: true });
    }
    const d = L.parse(await redis('HGET', 'evg:defidone', k));
    if (!d) return json(res, 404, { error: 'Ce défi n\'est pas validé.' });
    if (d.by !== me.id && !isAdmin) return json(res, 403, { error: 'Seul celui qui l\'a validé (ou un orga) peut faire ça.' });
    if (b.action === 'undo') { await redis('HDEL', 'evg:defidone', k); return json(res, 200, { ok: true }); }
    if (b.action === 'proof') { d.proof = L.cleanId(b.proof, 20); if (!(await redis('HEXISTS', 'evg:defidone', k))) return json(res, 404, { error: 'Défi annulé entre-temps.' }); await redis('HSET', 'evg:defidone', k, JSON.stringify(d)); return json(res, 200, { ok: true }); }
    json(res, 400, { error: 'Action inconnue.' });
  } catch (e) { json(res, 500, { error: 'Erreur serveur' }); }
};
