const L = require('./_lib');
const { redis, json, rateLimit, body, isJson, str, norm, DISPLAY, ip, geo } = L;

// GET  : qui suis-je ? (statut du compte, appareil, réglages de sécurité)
// POST : register | login | admin | logout | ping | event | changepin | devices | revoke
const EVENTS = ['screenshot', 'print', 'devtools', 'copy', 'panic', 'hidden', 'record'];

// Appareils distincts parmi les sessions vivantes (même identifiant OU même empreinte = même appareil)
function distinctDevices(sessions) {
  const groups = [];
  for (const s of sessions) {
    const g = groups.find(g => g.some(x => (s.did && x.did === s.did) || (s.fp && x.fp === s.fp)));
    if (g) g.push(s); else groups.push([s]);
  }
  return groups;
}
const sameDevice = (s, did, fp) => (did && s.did === did) || (fp && s.fp === fp);

// Ouvre une session pour ce compte sur cet appareil, en respectant la limite d'appareils
async function openSession(req, res, m, did, fp) {
  const sec = await L.getSecurity();
  const live = await L.listSessions(m.id);
  // on remplace les anciennes sessions du même appareil (pas de doublon)
  for (const s of live.filter(s => sameDevice(s, did, fp))) await L.revokeSession(m.id, s.sid);
  const others = distinctDevices(live.filter(s => !sameDevice(s, did, fp)));
  const max = m.maxDevices || sec.maxDevices;
  if (m.role !== 'admin' && max > 0 && others.length >= max) {
    await L.logEvent(req, 'device_limit', { m: m.id, who: `${m.prenom} ${m.nom}`, devices: others.map(g => g[0].label) });
    return json(res, 403, { error: `Ton compte est déjà connecté sur ${others.length} appareil${others.length > 1 ? 's' : ''} (${others.map(g => g[0].label).join(', ')}). Limite atteinte : demande à un orga de libérer une place.`, code: 'device_limit' });
  }
  // appareil déjà vu (même identifiant OU même empreinte) ? sinon on le note et on le signale
  const seen = await L.pipeline([did, fp].filter(Boolean).map(k => ['SISMEMBER', `evg:mdev:${m.id}`, k]));
  await redis('SADD', `evg:mdev:${m.id}`, ...[did, fp].filter(Boolean));
  if (!seen.some(x => x === 1) && live.length) await L.logEvent(req, 'device_new', { m: m.id, who: `${m.prenom} ${m.nom}` });
  const s = await L.createSession(req, m, did, fp);
  res.setHeader('Set-Cookie', [L.sessionCookie(s.sid, m.id, req), 'evg_member=; Path=/; Max-Age=0', 'evg_session=; Path=/; Max-Age=0']);
  return json(res, 200, { status: m.status, me: pub(m) });
}
const pub = m => ({ id: m.id, prenom: m.prenom, nom: m.nom, role: m.role, status: m.status, admin: m.admin || null });

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const s = await L.getSession(req, { allowPending: true });
      if (!s) return json(res, 401, { error: 'Non connecté' });
      const sec = await L.getSecurity();
      return json(res, 200, { me: pub(s.member), sid: s.sess.sid.slice(0, 6), device: s.sess.label, security: { watermark: sec.watermark, autoLockMin: sec.autoLockMin } });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée' });
    if (!isJson(req)) return json(res, 400, { error: 'Requête invalide.' });
    const b = body(req); if (!b) return json(res, 400, { error: 'Requête invalide.' });
    const did = L.cleanId(b.did), fp = L.cleanId(b.fp);

    if (b.action === 'logout') {
      const c = L.readSessionCookie(req); if (c) await L.revokeSession(c.m, c.s);
      res.setHeader('Set-Cookie', L.clearCookies()); return json(res, 200, { ok: true });
    }

    // ---- Connexion orga (identifiant + mot de passe) : crée / met à jour le compte orga ----
    if (b.action === 'admin') {
      if (!(await rateLimit(req, 'login', 10, 900))) return json(res, 429, { error: 'Trop d\'essais. Réessaie dans 15 minutes.' });
      const user = norm(b.user);
      if (!Object.prototype.hasOwnProperty.call(DISPLAY, user) || !L.checkPassword(user, String(b.password || ''))) {
        await L.logEvent(req, 'admin_fail', { who: str(b.user, 30) });
        return json(res, 401, { error: 'Identifiants incorrects.' });
      }
      const id = L.adminId(user);
      const m = { ...(await L.getAccount(id) || { createdAt: new Date().toISOString() }), id, prenom: DISPLAY[user], nom: '(orga)', role: 'admin', admin: user, status: 'active' };
      await L.saveAccount(m);
      await L.logEvent(req, 'login', { m: id, who: `${m.prenom} (orga)` });
      return openSession(req, res, m, did, fp);
    }

    // ---- Session en cours ----
    if (['ping', 'event', 'changepin', 'devices', 'revoke'].includes(b.action)) {
      const s = await L.getSession(req, { allowPending: true });
      if (!s) { res.setHeader('Set-Cookie', L.clearCookies()); return json(res, 401, { error: 'Session expirée ou déconnectée par un orga.', code: 'revoked' }); }
      const { sess, member: m } = s;

      if (b.action === 'ping') {        // battement de cœur : dernière activité, IP, ville, page
        const g = geo(req), now = new Date().toISOString(), newIp = ip(req);
        if (sess.city && g.city && sess.city !== g.city) await L.logEvent(req, 'city_change', { m: m.id, who: `${m.prenom} ${m.nom}`, from: sess.city, to: g.city });
        const next = { ...sess, lastSeen: now, ip: newIp, city: g.city || sess.city, country: g.country || sess.country, page: str(b.page, 30), ok: m.status === 'active' };
        await redis('SET', `evg:sess:${sess.sid}`, JSON.stringify(next), 'XX', 'EX', 400 * 86400);   // XX : une session révoquée entre-temps n'est pas recréée
        res.setHeader('Set-Cookie', L.sessionCookie(sess.sid, m.id, req));   // session renouvelée : connecté « à vie »
        return json(res, 200, { status: m.status });
      }
      if (b.action === 'event') {       // tentative de capture, impression, copie…
        if (!EVENTS.includes(b.type)) return json(res, 400, { error: 'Type inconnu' });
        if (!(await rateLimit(req, 'ev', 60, 3600))) return json(res, 200, { ok: true });
        await L.logEvent(req, b.type, { m: m.id, who: `${m.prenom} ${m.nom}`, page: str(b.page, 30), detail: str(b.detail, 80) });
        return json(res, 200, { ok: true });
      }
      if (b.action === 'devices') {
        const list = (await L.listSessions(m.id)).sort((a, z) => z.lastSeen.localeCompare(a.lastSeen))
          .map(x => ({ id: x.sid.slice(0, 8), label: x.label, city: x.city, country: x.country, lastSeen: x.lastSeen, createdAt: x.createdAt, current: x.sid === sess.sid }));
        return json(res, 200, { devices: list });
      }
      if (b.action === 'revoke') {      // déconnecter un de MES autres appareils
        const target = (await L.listSessions(m.id)).find(x => x.sid.slice(0, 8) === String(b.id) && x.sid !== sess.sid);
        if (target) { await L.revokeSession(m.id, target.sid); await L.logEvent(req, 'self_revoke', { m: m.id, who: `${m.prenom} ${m.nom}`, target: target.label }); }
        return json(res, 200, { ok: true });
      }
      if (b.action === 'changepin') {
        if (m.role === 'admin') return json(res, 400, { error: 'Le mot de passe orga se change dans les variables Vercel.' });
        if (!L.checkPin(m.pin, b.pin)) return json(res, 401, { error: 'Ancien code incorrect.' });
        const np = String(b.newPin || ''); if (np.length < 4 || np.length > 40) return json(res, 400, { error: 'Le nouveau code doit faire au moins 4 caractères.' });
        await L.saveAccount({ ...m, pin: L.hashPin(np) });
        await L.revokeAll(m.id, sess.sid);   // changer de code déconnecte tous les autres appareils
        return json(res, 200, { ok: true });
      }
    }

    // ---- Participants : création de compte / connexion ----
    const prenom = str(b.prenom, 40), nom = str(b.nom, 40), pin = String(b.pin ?? '');
    if (!prenom || !nom) return json(res, 400, { error: 'Prénom et nom sont obligatoires.' });
    if (pin.length < 4 || pin.length > 40) return json(res, 400, { error: 'Le code perso doit faire au moins 4 caractères.' });
    if (!did && !fp) return json(res, 400, { error: 'Appareil non reconnu, recharge la page.' });
    const id = L.memberId(prenom, nom);

    if (b.action === 'login') {
      if (!(await rateLimit(req, 'mlogin', 25, 900))) return json(res, 429, { error: 'Trop d\'essais. Réessaie dans 15 minutes.' });
      const failKey = `evg:fail:${id}:${String(ip(req)).replace(/[^0-9a-fA-F.:]/g, '').slice(0, 45)}`;
      if ((parseInt(await redis('GET', failKey), 10) || 0) >= 6) return json(res, 429, { error: 'Compte verrouillé 15 minutes après trop d\'essais.' });
      const m = await L.getAccount(id);
      if (!m || !L.checkPin(m.pin, pin)) {
        if ((await redis('INCR', failKey)) === 1) await redis('EXPIRE', failKey, 900);
        await L.logEvent(req, 'login_fail', { who: `${prenom} ${nom}`, exists: !!m });
        return json(res, 401, { error: 'Prénom, nom ou code incorrect. (Pas encore de compte ? Crée-le.)' });
      }
      await redis('DEL', failKey);
      if (m.status === 'blocked') { await L.logEvent(req, 'blocked_try', { m: id, who: `${m.prenom} ${m.nom}` }); return json(res, 403, { error: 'Ce compte a été bloqué par les orgas.' }); }
      await L.logEvent(req, 'login', { m: id, who: `${m.prenom} ${m.nom}` });
      return openSession(req, res, m, did, fp);
    }

    if (b.action === 'register') {
      if (!(await rateLimit(req, 'mreg', 20, 900))) return json(res, 429, { error: 'Trop d\'essais. Réessaie dans 15 minutes.' });
      if (String(b.invite || '') !== (await L.inviteCode())) {
        await L.logEvent(req, 'bad_invite', { who: `${prenom} ${nom}` });
        return json(res, 403, { error: "Il te faut le lien d'invitation envoyé par les orgas pour créer ton compte." });
      }
      if ((await redis('HLEN', 'evg:members')) >= 200) return json(res, 400, { error: 'Trop de comptes.' });
      const sec = await L.getSecurity();
      const m = { id, prenom, nom, pin: L.hashPin(pin), createdAt: new Date().toISOString(), status: sec.approval ? 'pending' : 'active', role: 'member' };
      if (!(await redis('HSETNX', 'evg:members', id, JSON.stringify(m)))) return json(res, 409, { error: 'Ce compte existe déjà : connecte-toi avec ton code. (Code oublié ? Demande à un orga.)' });
      await L.logEvent(req, 'register', { m: id, who: `${prenom} ${nom}`, pending: sec.approval });
      return openSession(req, res, m, did, fp);
    }
    json(res, 400, { error: 'Action inconnue.' });
  } catch (e) { console.error(e); json(res, 500, { error: 'Erreur serveur' }); }
};
