const crypto = require('crypto');
const L = require('./_lib');
const { redis, json, rateLimit, body, isJson, str, hgetall, pipeline } = L;
const EMO = ['😂', '🔥', '💀', '❤️'];
const BASE = Array.from({ length: 40 }, (_, i) => 'b-elie' + String(i + 1).padStart(2, '0'));   // photos de base (photos/elieXX.jpg)
const MAX_TOTAL = 400, MAX_PER = 60, MAX_FULL = 1100000, MAX_THUMB = 160000;   // tailles en base64
const b64jpeg = (v, max) => {
  const s = String(v || '').replace(/^data:image\/jpeg;base64,/, '');
  if (!s || s.length > max || !/^[A-Za-z0-9+/=]+$/.test(s)) return null;
  const head = Buffer.from(s.slice(0, 8), 'base64');
  return head[0] === 0xff && head[1] === 0xd8 ? s : null;             // vrai JPEG uniquement
};

// GET ?img=<id>[&s=t] : l'image elle-même (connexion requise ET chargée par le site, jamais en ouvrant l'adresse)
// GET                 : liste de l'album (photos d'Elie ajoutées + preuves de défis)
// POST add {full, thumb, legende, kind, defi, w, h} | delete {id} | legende {id, legende}
module.exports = async (req, res) => {
  try {
    const s = await L.getSession(req); if (!s) return json(res, 401, { error: 'Connecte-toi.' });
    const me = s.member, isAdmin = me.role === 'admin';

    if (req.method === 'GET' && req.query.img) {
      if (req.headers['x-evg'] !== '1') return json(res, 403, { error: 'Accès direct interdit.' });
      const id = L.cleanId(req.query.img, 20);
      const b = await redis('HGET', `evg:ph:${id}`, req.query.s === 't' ? 'thumb' : 'full');
      if (!b) return json(res, 404, { error: 'Photo introuvable.' });
      res.setHeader('Content-Type', 'image/jpeg'); res.setHeader('Cache-Control', 'private, max-age=86400');
      return res.status(200).send(Buffer.from(b, 'base64'));
    }
    if (req.method === 'GET') {
      const photos = (await hgetall('evg:album')).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .map(p => ({ ...p, mine: p.by === me.id, canDelete: p.by === me.id || isAdmin }));
      // réactions : { id: { counts: {😂: n…}, mine: '😂' } } pour l'album ET les photos de base
      const ids = [...photos.map(p => p.id), ...BASE], raw = await pipeline(ids.map(id => ['HGETALL', `evg:phr:${id}`]));
      const reacts = {};
      ids.forEach((id, i) => { const f = raw[i] || []; if (!f.length) return; const r = { counts: {}, mine: '' };
        for (let k = 0; k < f.length; k += 2) { r.counts[f[k + 1]] = (r.counts[f[k + 1]] || 0) + 1; if (f[k] === me.id) r.mine = f[k + 1]; }
        reacts[id] = r; });
      return json(res, 200, { photos, reacts });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée' });
    if (!isJson(req)) return json(res, 400, { error: 'Requête invalide.' });
    const b = body(req); if (!b) return json(res, 400, { error: 'Requête invalide.' });

    if (b.action === 'add') {
      if (!(await rateLimit(req, 'album', 40, 3600))) return json(res, 429, { error: 'Trop de photos d\'un coup, réessaie dans un moment.' });
      const full = b64jpeg(b.full, MAX_FULL), thumb = b64jpeg(b.thumb, MAX_THUMB);
      if (!full || !thumb) return json(res, 400, { error: 'Photo illisible ou trop lourde.' });
      const all = await hgetall('evg:album');
      if (all.length >= MAX_TOTAL) return json(res, 400, { error: 'L\'album est plein.' });
      if (all.filter(p => p.by === me.id).length >= MAX_PER) return json(res, 400, { error: `Tu as déjà ajouté ${MAX_PER} photos, ça suffit 😅` });
      const p = {
        id: crypto.randomBytes(6).toString('hex'), by: me.id, auteur: me.prenom,
        legende: str(b.legende, 140), kind: b.kind === 'proof' ? 'proof' : 'album', defi: str(b.defi, 40),
        w: Math.max(0, Math.min(4000, parseInt(b.w, 10) || 0)), h: Math.max(0, Math.min(4000, parseInt(b.h, 10) || 0)),
        createdAt: new Date().toISOString(),
      };
      await pipeline([['HSET', `evg:ph:${p.id}`, 'full', full, 'thumb', thumb], ['HSET', 'evg:album', p.id, JSON.stringify(p)]]);
      return json(res, 200, { ok: true, id: p.id });
    }
    if (b.action === 'react') {   // une réaction par personne et par photo ; retoucher la même l'enlève
      if (!(await rateLimit(req, 'react', 300, 3600))) return json(res, 429, { error: 'Doucement 😅' });
      const rid = L.cleanId(b.id, 20), e = String(b.e || '');
      const exists = BASE.includes(rid) || !!(await redis('HEXISTS', 'evg:album', rid));
      if (!exists) return json(res, 404, { error: 'Photo introuvable.' });
      if (EMO.includes(e)) await redis('HSET', `evg:phr:${rid}`, me.id, e); else await redis('HDEL', `evg:phr:${rid}`, me.id);
      return json(res, 200, { ok: true });
    }
    const id = L.cleanId(b.id, 20), p = L.parse(await redis('HGET', 'evg:album', id));
    if (!p) return json(res, 404, { error: 'Photo introuvable.' });
    if (p.by !== me.id && !isAdmin) return json(res, 403, { error: 'Seul l\'auteur (ou un orga) peut faire ça.' });
    if (b.action === 'delete') { await pipeline([['DEL', `evg:ph:${id}`], ['DEL', `evg:phr:${id}`], ['HDEL', 'evg:album', id]]); return json(res, 200, { ok: true }); }
    if (b.action === 'legende') { p.legende = str(b.legende, 140); await redis('HSET', 'evg:album', id, JSON.stringify(p)); return json(res, 200, { ok: true }); }
    json(res, 400, { error: 'Action inconnue.' });
  } catch (e) { json(res, 500, { error: 'Erreur serveur' }); }
};
