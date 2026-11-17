const crypto = require('crypto');
const L = require('./_lib');
const { redis, hgetall, json, getConfig, str, seedActivities, body, isJson, inviteCode, parse } = L;
const { loadIdeas } = require('./_ideas');
const COLLECTIONS = ['rsvps', 'ideas', 'tasks', 'notes', 'activities', 'votes', 'defis'];
const READONLY = ['rsvps', 'votes'];

module.exports = async (req, res) => {
  const user = await L.getAdmin(req).catch(() => null);
  if (!user) return json(res, 401, { error: 'Réservé aux orgas' });
  const col = req.query.col;
  const writes = ['POST', 'PUT'].includes(req.method);
  if (writes && !isJson(req)) return json(res, 400, { error: 'Requête invalide.' });
  const B = writes ? body(req) : {};
  if (!B) return json(res, 400, { error: 'JSON invalide.' });
  try {
    // --- Config publique (infos de l'EVG) ---
    if (col === 'config') {
      if (req.method === 'GET') return json(res, 200, await getConfig());
      if (req.method === 'PUT') {
        const c = B;
        const clean = {
          lieu: str(c.lieu, 80), intro: str(c.intro, 1500), deadline: str(c.deadline, 10), dateFinale: str(c.dateFinale, 16),
          dateOptions: (c.dateOptions || []).slice(0, 8).map((o, i) => ({ id: str(o.id, 20) || 'd' + i, label: str(o.label, 60) })).filter(o => o.label),
          budget: (c.budget || []).slice(0, 15).map(b => ({ poste: str(b.poste, 60), montant: Math.max(0, parseFloat(b.montant) || 0) })).filter(b => b.poste),
          nbActivites: Math.max(1, Math.min(12, parseInt(c.nbActivites, 10) || 6)), inviterMarie: !!c.inviterMarie, budgetActivites: Math.max(0, parseFloat(c.budgetActivites) || 0),
          programme: (c.programme || []).slice(0, 10).map(d => ({ jour: str(d.jour, 40), titre: str(d.titre, 80), items: (d.items || []).slice(0, 12).map(i => str(i, 140)).filter(Boolean) })).filter(d => d.jour || d.titre),
        };
        await redis('SET', 'evg:config', JSON.stringify(clean));
        return json(res, 200, clean);
      }
      return json(res, 405, { error: 'Méthode non autorisée' });
    }

    // --- Réglages de sécurité ---
    if (col === 'security') {
      if (req.method === 'PUT') {
        const s = { approval: !!B.approval, maxDevices: Math.max(0, Math.min(10, parseInt(B.maxDevices, 10) || 0)), watermark: !!B.watermark, autoLockMin: Math.max(0, Math.min(60, parseInt(B.autoLockMin, 10) || 0)) };
        await redis('SET', 'evg:security', JSON.stringify(s));
        await L.logEvent(req, 'settings', { who: L.DISPLAY[user] + ' (orga)', detail: JSON.stringify(s) });
      }
      return json(res, 200, await L.getSecurity());
    }
    // --- Journal de sécurité ---
    if (col === 'log') {
      const n = Math.min(1000, parseInt(req.query.n, 10) || 300);
      return json(res, 200, ((await redis('LRANGE', 'evg:log', 0, n - 1)) || []).map(parse).filter(Boolean));
    }

    // --- Code d'invitation (contenu dans le lien envoyé aux participants) ---
    if (col === 'invite') {
      if (req.method === 'POST') { await redis('DEL', 'evg:invite'); await L.logEvent(req, 'invite_reset', { who: L.DISPLAY[user] + ' (orga)' }); }
      return json(res, 200, { code: await inviteCode() });
    }

    // --- Comptes : liste avec appareils + actions (valider, bloquer, déconnecter, réinitialiser, limite) ---
    if (col === 'members') {
      if (req.method === 'GET') {
        const ms = (await hgetall('evg:members')).map(L.account);
        const sess = await Promise.all(ms.map(m => L.listSessions(m.id)));
        return json(res, 200, ms.map((m, i) => ({
          id: m.id, prenom: m.prenom, nom: m.nom, createdAt: m.createdAt, status: m.status, role: m.role, maxDevices: m.maxDevices || null,
          sessions: sess[i].sort((a, z) => z.lastSeen.localeCompare(a.lastSeen)).map(s => ({ id: s.sid.slice(0, 8), label: s.label, ua: s.ua, ip: s.ip, city: s.city, country: s.country, createdAt: s.createdAt, lastSeen: s.lastSeen, page: s.page, did: (s.did || '').slice(0, 6), fp: (s.fp || '').slice(0, 6) })),
        })));
      }
      if (req.method === 'POST') {
        const m = await L.getAccount(str(B.id, 40)); if (!m) return json(res, 404, { error: 'Compte introuvable.' });
        const who = L.DISPLAY[user] + ' (orga)', target = `${m.prenom} ${m.nom}`;
        if (m.role === 'admin' && ['block', 'reset', 'limit'].includes(B.op)) return json(res, 400, { error: 'Impossible sur un compte orga.' });
        if (B.op === 'approve' || B.op === 'unblock') { m.status = 'active'; await L.saveAccount(m); await L.syncSessions(m); }
        else if (B.op === 'block') { m.status = 'blocked'; await L.saveAccount(m); await L.revokeAll(m.id); }
        else if (B.op === 'logoutAll') await L.revokeAll(m.id);
        else if (B.op === 'revoke') { const s = (await L.listSessions(m.id)).find(x => x.sid.slice(0, 8) === String(B.sid)); if (s) await L.revokeSession(m.id, s.sid); }
        else if (B.op === 'limit') { const n = parseInt(B.maxDevices, 10); m.maxDevices = n > 0 ? Math.min(10, n) : undefined; await L.saveAccount(m); }
        else if (B.op === 'promote') { if (!L.DISPLAY[B.admin]) return json(res, 400, { error: 'Orga inconnu.' }); m.role = 'admin'; m.admin = B.admin; m.status = 'active'; await L.saveAccount(m); await L.syncSessions(m); }
        else if (B.op === 'demote') { if (m.id.startsWith('adm-')) return json(res, 400, { error: 'Compte orga principal.' }); m.role = 'member'; delete m.admin; await L.saveAccount(m); }
        else if (B.op === 'reset') { await L.revokeAll(m.id); await redis('HDEL', 'evg:members', m.id); await redis('DEL', `evg:fail:${m.id}`, `evg:mdev:${m.id}`); }
        else return json(res, 400, { error: 'Opération inconnue.' });
        await L.logEvent(req, 'admin_' + B.op, { who, target, m: m.id });
        return json(res, 200, { ok: true });
      }
      return json(res, 405, { error: 'Méthode non autorisée' });
    }
    // --- Idées proposées par les participants : modération ---
    if (col === 'proposals') {
      if (req.method === 'GET') return json(res, 200, await loadIdeas(null, { includeHidden: true }));
      if (req.method === 'POST') {
        const id = str(B.id, 40), raw = await redis('HGET', 'evg:ideas', id); if (!raw) return json(res, 404, { error: 'Idée introuvable.' });
        const idea = JSON.parse(raw);
        if (['nouvelle', 'retenue', 'refusee', 'cachee'].includes(B.statut)) idea.statut = B.statut;
        if (B.note !== undefined) idea.note = str(B.note, 200);
        if (B.delcid) await redis('HDEL', `evg:icom:${id}`, str(B.delcid, 20));
        await redis('HSET', 'evg:ideas', id, JSON.stringify(idea)); return json(res, 200, { ok: true });
      }
      if (req.method === 'DELETE') { const id = str(req.query.id, 40); await redis('HDEL', 'evg:ideas', id); await redis('DEL', `evg:ilikes:${id}`, `evg:icom:${id}`); return json(res, 200, { ok: true }); }
      return json(res, 405, { error: 'Méthode non autorisée' });
    }

    if (!COLLECTIONS.includes(col)) return json(res, 400, { error: 'Collection inconnue' });
    const key = `evg:${col}`;

    if (req.method === 'GET') {
      if (col === 'activities') await seedActivities();
      return json(res, 200, await hgetall(key));
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      if (READONLY.includes(col)) return json(res, 400, { error: 'Lecture seule.' });
      const b = B;
      if (JSON.stringify(b).length > 20000) return json(res, 400, { error: 'Trop volumineux' });
      const id = str(b.id, 40) || crypto.randomBytes(6).toString('hex');
      const old = parse(await redis('HGET', key, id)) || {};
      if (b.source !== undefined && !/^https?:\/\//i.test(String(b.source))) b.source = '';
      const item = { ...old, ...b, id, updatedAt: new Date().toISOString(), updatedBy: user };
      if (!old.createdAt) { item.createdAt = item.updatedAt; item.createdBy = user; }
      if (col === 'ideas') {
        // un admin ne peut modifier que son propre vote
        item.votes = { ...(old.votes || {}) };
        if (typeof b.vote === 'boolean') { if (b.vote) item.votes[user] = true; else delete item.votes[user]; }
        delete item.vote;
        item.createdBy = old.createdBy || user;
      }
      await redis('HSET', key, id, JSON.stringify(item));
      return json(res, 200, item);
    }
    if (req.method === 'DELETE') {
      const id = str(req.query.id, 40);
      if (!id) return json(res, 400, { error: 'id manquant' });
      await redis('HDEL', key, id);
      return json(res, 200, { ok: true });
    }
    json(res, 405, { error: 'Méthode non autorisée' });
  } catch (e) { console.error(e); json(res, 500, { error: 'Erreur serveur' }); }
};
