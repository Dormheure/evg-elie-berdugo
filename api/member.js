const { redis, json, rateLimit, body, isJson, str, memberId, hashPin, checkPin, memberCookie, clearMemberCookie, getMember, inviteCode } = require('./_lib');

// GET  : qui suis-je ? ({member:null} si pas connecté)
// POST : register | login | logout | changepin
module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') return json(res, 200, { member: await getMember(req) });
    if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée' });
    if (!isJson(req)) return json(res, 400, { error: 'Requête invalide.' });
    const b = body(req); if (!b) return json(res, 400, { error: 'Requête invalide.' });

    if (b.action === 'logout') { res.setHeader('Set-Cookie', clearMemberCookie()); return json(res, 200, { ok: true }); }

    if (b.action === 'changepin') {
      const me = await getMember(req); if (!me) return json(res, 401, { error: 'Connecte-toi d\'abord.' });
      const old = JSON.parse(await redis('HGET', 'evg:members', me.id));
      if (!checkPin(old.pin, b.pin)) return json(res, 401, { error: 'Ancien code incorrect.' });
      const np = String(b.newPin || ''); if (np.length < 4 || np.length > 40) return json(res, 400, { error: 'Le nouveau code doit faire au moins 4 caractères.' });
      await redis('HSET', 'evg:members', me.id, JSON.stringify({ ...old, pin: hashPin(np) }));
      return json(res, 200, { ok: true });
    }

    const prenom = str(b.prenom, 40), nom = str(b.nom, 40), pin = String(b.pin ?? '');
    if (!prenom || !nom) return json(res, 400, { error: 'Prénom et nom sont obligatoires (une initiale suffit pour le nom).' });
    if (pin.length < 4 || pin.length > 40) return json(res, 400, { error: 'Le code perso doit faire au moins 4 caractères.' });
    const id = memberId(prenom, nom);

    if (b.action === 'login') {
      if (!(await rateLimit(req, 'mlogin', 25, 900))) return json(res, 429, { error: 'Trop d\'essais. Réessaie dans 15 minutes.' });
      const failKey = `evg:fail:${id}`;
      if ((parseInt(await redis('GET', failKey), 10) || 0) >= 6) return json(res, 429, { error: 'Compte verrouillé 15 minutes après trop d\'essais.' });
      const raw = await redis('HGET', 'evg:members', id);
      if (!raw || !checkPin(JSON.parse(raw).pin, pin)) {
        if ((await redis('INCR', failKey)) === 1) await redis('EXPIRE', failKey, 900);
        return json(res, 401, { error: 'Prénom, nom ou code incorrect. (Pas encore de compte ? Crée-le.)' });
      }
      await redis('DEL', failKey);
      const m = JSON.parse(raw);
      res.setHeader('Set-Cookie', memberCookie(id, req));
      return json(res, 200, { member: { id, prenom: m.prenom, nom: m.nom } });
    }

    if (b.action === 'register') {
      if (!(await rateLimit(req, 'mreg', 20, 900))) return json(res, 429, { error: 'Trop d\'essais. Réessaie dans 15 minutes.' });
      if (String(b.invite || '') !== (await inviteCode())) return json(res, 403, { error: "Il te faut le lien d'invitation envoyé par les orgas pour créer ton compte." });
      if ((await redis('HLEN', 'evg:members')) >= 200) return json(res, 400, { error: 'Trop de comptes.' });
      const m = { id, prenom, nom, pin: hashPin(pin), createdAt: new Date().toISOString() };
      if (!(await redis('HSETNX', 'evg:members', id, JSON.stringify(m)))) return json(res, 409, { error: 'Ce compte existe déjà : connecte-toi avec ton code. (Code oublié ? Demande à un orga.)' });
      res.setHeader('Set-Cookie', memberCookie(id, req));
      return json(res, 200, { member: { id, prenom, nom } });
    }
    json(res, 400, { error: 'Action inconnue.' });
  } catch (e) { json(res, 500, { error: 'Erreur serveur' }); }
};
