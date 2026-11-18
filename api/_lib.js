const crypto = require('crypto');

// ---------- Redis (Upstash REST) ----------
async function redis(...cmd) {
  const r = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
// Plusieurs commandes Redis en une seule requête
async function pipeline(cmds) {
  if (!cmds.length) return [];
  const r = await fetch(process.env.KV_REST_API_URL + '/pipeline', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  const j = await r.json();
  if (!Array.isArray(j)) throw new Error((j && j.error) || 'pipeline');
  return j.map(x => { if (x.error) throw new Error(x.error); return x.result; });
}
function flatToItems(flat) {
  const out = [];
  for (let i = 0; i < (flat || []).length; i += 2) { try { out.push(JSON.parse(flat[i + 1])); } catch {} }
  return out;
}
async function hgetall(key) { return flatToItems((await redis('HGETALL', key)) || []); }
const parse = raw => { try { return raw ? JSON.parse(raw) : null; } catch { return null; } };

// ---------- Réponses HTTP ----------
const json = (res, code, data) => { res.status(code).setHeader('Cache-Control', 'no-store, private'); res.json(data); };
const ip = req => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'inconnue';
const dec = s => { try { return decodeURIComponent(s || ''); } catch { return s || ''; } };
// Géolocalisation approximative fournie par Vercel (ville / pays de l'IP)
const geo = req => ({ city: dec(req.headers['x-vercel-ip-city']), country: req.headers['x-vercel-ip-country'] || '' });

async function rateLimit(req, bucket, max, windowSec) {
  const key = `evg:rl:${bucket}:${ip(req)}`;
  const n = await redis('INCR', key);
  if (n === 1) await redis('EXPIRE', key, windowSec);
  return n <= max;
}

// ---------- Signature des cookies ----------
const secret = () => process.env.SESSION_SECRET || '';
const sign = p => crypto.createHmac('sha256', secret()).update(p).digest('base64url');
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const DISPLAY = { david: 'David', alon: 'Alon', raphael: 'Raphaël' };

function checkPassword(user, password) {
  let users = {};
  try { users = JSON.parse(process.env.ADMIN_USERS || '{}'); } catch {}
  const stored = Object.prototype.hasOwnProperty.call(users, user) ? users[user] : null;
  if (typeof stored !== 'string' || !stored.includes(':')) { crypto.scryptSync(String(password), 'x', 32); return false; } // temps constant
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(String(password), salt, 32);
  const good = Buffer.from(hash, 'hex');
  return good.length === test.length && crypto.timingSafeEqual(good, test);
}

// ---------- Comptes (prénom + nom + code perso) ----------
const memberId = (prenom, nom) => crypto.createHash('sha1').update(norm(prenom) + '|' + norm(nom)).digest('hex').slice(0, 16);
const adminId = user => 'adm-' + user;
function hashPin(pin) { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.scryptSync(String(pin), salt, 32).toString('hex'); }
function checkPin(stored, pin) {
  const [salt, hash] = String(stored || ':').split(':');
  const test = crypto.scryptSync(String(pin), salt || 'x', 32), good = Buffer.from(hash || '', 'hex');
  return good.length === test.length && crypto.timingSafeEqual(good, test);
}
// les comptes créés avant la refonte n'ont ni statut ni rôle : actifs, simples participants
const account = m => m && { ...m, status: m.status || 'active', role: m.role || 'member' };
async function getAccount(id) { return account(parse(await redis('HGET', 'evg:members', id))); }
const saveAccount = m => redis('HSET', 'evg:members', m.id, JSON.stringify(m));

// Code d'invitation (contenu dans le lien partagé) : généré une fois, régénérable depuis l'admin
async function inviteCode() {
  let c = await redis('GET', 'evg:invite');
  if (!c) { c = crypto.randomBytes(5).toString('hex'); await redis('SET', 'evg:invite', c, 'NX'); c = await redis('GET', 'evg:invite'); }
  return c;
}

// ---------- Réglages de sécurité (modifiables depuis l'onglet Sécurité) ----------
const DEFAULT_SECURITY = {
  approval: true,      // un orga doit valider chaque nouveau compte
  maxDevices: 2,       // appareils connectés en même temps par participant
  watermark: true,     // filigrane nominatif sur tout le site
  autoLockMin: 5,      // floute l'écran après X minutes d'inactivité (0 = jamais)
};
async function getSecurity() { return { ...DEFAULT_SECURITY, ...(parse(await redis('GET', 'evg:security')) || {}) }; }

// ---------- Appareils ----------
// Nom lisible d'un appareil à partir du user-agent
function deviceLabel(ua = '') {
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? ((ua.match(/Android[^;]*;\s*([^;)]+?)(?:\sBuild|\))/) || [])[1] || 'Android')
    : /Macintosh|Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'PC Windows' : /Linux/.test(ua) ? 'Linux' : 'Appareil inconnu';
  const br = /EdgA?\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox'
    : /Instagram/.test(ua) ? 'Instagram' : /FBAN|FBAV/.test(ua) ? 'Facebook' : /Safari\//.test(ua) ? 'Safari' : 'navigateur ?';
  return `${os} · ${br}`;
}
const cleanId = (v, n = 64) => String(v || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, n);

// ---------- Sessions ----------
// Cookie evg_s = {s: id de session, m: id du compte} signé. La session vit dans Redis : la supprimer déconnecte l'appareil.
const COOKIE = 'evg_s', LIFE = 400 * 86400;   // 400 jours = maximum autorisé par les navigateurs, renouvelé à chaque visite
function sessionCookie(sid, m, req) {
  const p = Buffer.from(JSON.stringify({ s: sid, m })).toString('base64url');
  const secure = (req.headers['x-forwarded-proto'] || 'https').includes('https') ? '; Secure' : '';
  return `${COOKIE}=${p}.${sign(p)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${LIFE}${secure}`;
}
const clearCookies = () => [`${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`, 'evg_member=; Path=/; Max-Age=0', 'evg_session=; Path=/; Max-Age=0'];
function readCookie(req, name) {
  const c = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(name + '='));
  return c ? c.slice(name.length + 1) : null;
}
function readSessionCookie(req) {
  if (!secret()) return null;
  const c = readCookie(req, COOKIE); if (!c) return null;
  const [p, sig] = c.split('.'); if (!p || !sig) return null;
  const expect = sign(p);
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try { const d = JSON.parse(Buffer.from(p, 'base64url').toString()); return d.s && d.m ? d : null; } catch { return null; }
}
async function createSession(req, m, did, fp) {
  const sid = crypto.randomBytes(18).toString('base64url'), now = new Date().toISOString(), ua = String(req.headers['user-agent'] || '').slice(0, 300);
  const s = { sid, m: m.id, did, fp, ok: m.status === 'active', ua, label: deviceLabel(ua), ip: ip(req), ...geo(req), createdAt: now, lastSeen: now, page: '' };
  await pipeline([['SET', `evg:sess:${sid}`, JSON.stringify(s), 'EX', LIFE], ['SADD', `evg:msess:${m.id}`, sid]]);
  return s;
}
// Sessions encore vivantes d'un compte (nettoie celles qui ont expiré)
async function listSessions(mid) {
  const sids = (await redis('SMEMBERS', `evg:msess:${mid}`)) || [];
  if (!sids.length) return [];
  const raws = await pipeline(sids.map(s => ['GET', `evg:sess:${s}`]));
  const dead = sids.filter((s, i) => !raws[i]);
  if (dead.length) await redis('SREM', `evg:msess:${mid}`, ...dead);
  return raws.map(parse).filter(Boolean);
}
async function revokeSession(mid, sid) { await pipeline([['DEL', `evg:sess:${sid}`], ['SREM', `evg:msess:${mid}`, sid]]); }
async function revokeAll(mid, exceptSid) {
  const ss = (await listSessions(mid)).filter(s => s.sid !== exceptSid);
  for (const s of ss) await revokeSession(mid, s.sid);
  return ss.length;
}
// Le statut du compte est recopié dans chaque session : c'est ce que lit le middleware (validation / blocage immédiats)
async function syncSessions(m) {
  const ok = m.status === 'active';
  for (const s of await listSessions(m.id)) await redis('SET', `evg:sess:${s.sid}`, JSON.stringify({ ...s, ok }), 'XX', 'KEEPTTL');
}
// Session courante : {sess, member} ou null. Ne renvoie que les sessions validées sauf {allowPending:true}.
async function getSession(req, { allowPending = false } = {}) {
  const c = readSessionCookie(req); if (!c) return null;
  const sess = parse(await redis('GET', `evg:sess:${c.s}`));
  if (!sess || sess.m !== c.m) return null;
  const m = await getAccount(c.m);
  if (!m || m.status === 'blocked') return null;
  if (m.status !== 'active' && !allowPending) return null;
  return { sess, member: m };
}
// Compatibilité avec les routes existantes : {id, prenom, nom, role} du participant connecté
async function getMember(req) {
  const s = await getSession(req); if (!s) return null;
  const m = s.member; return { id: m.id, prenom: m.prenom, nom: m.nom, role: m.role, admin: m.admin };
}
// Orga connecté : renvoie 'david' | 'alon' | 'raphael' ou null
async function getAdmin(req) {
  const s = await getSession(req);
  return s && s.member.role === 'admin' && DISPLAY[s.member.admin] ? s.member.admin : null;
}

// ---------- Journal de sécurité ----------
async function logEvent(req, type, data = {}) {
  const e = { t: new Date().toISOString(), type, ip: ip(req), ...geo(req), label: deviceLabel(req.headers['user-agent']), ...data };
  await pipeline([['LPUSH', 'evg:log', JSON.stringify(e)], ['LTRIM', 'evg:log', 0, 2999]]);
}

// ---------- Config par défaut (modifiable depuis l'admin) ----------
const DEFAULT_CONFIG = {
  lieu: 'Amsterdam 🇳🇱',
  intro: "Les gars, c'est officiel : Elie va se marier et personne n'a réussi à l'en empêcher. On l'emmène donc à Amsterdam pour ses dernières 48 heures en homme libre : bateau, bière, humiliations légères. Donnez vos dispos, votre budget et vos idées, nous on s'occupe de la préparation psychologique du patient. (Chut, Elie ne sait rien 🤫)",
  deadline: '2026-12-01',
  dateFinale: '',
  dateOptions: [{ id: 'b', label: 'Dim 27 → Mer 30 déc.' }],
  budget: [
    { poste: 'Transport (A/R)', montant: 150 },
    { poste: 'Hébergement (2 nuits)', montant: 160 },
    { poste: 'Activités', montant: 80 },
    { poste: 'Restos casher & sorties', montant: 150 },
    { poste: "Part du marié (on invite Elie)", montant: 40 },
  ],
  programme: [],
  nbActivites: 6,        // nombre d'activités mises en avant (le podium)
  inviterMarie: true,    // le prix d'Elie est réparti sur les autres
  budgetActivites: 100,  // cible € / personne pour les activités (jauge)
};
async function getConfig() {
  const stored = parse(await redis('GET', 'evg:config')) || {};
  return { ...DEFAULT_CONFIG, ...stored };
}

// Catalogue d'activités : injecté une fois depuis _activities.json, ensuite modifiable depuis l'admin
async function seedActivities() {
  if ((await redis('HLEN', 'evg:activities')) > 0) return;
  let seed = [];
  try { seed = require('./_activities.json'); } catch {}
  for (const a of seed) await redis('HSETNX', 'evg:activities', a.id, JSON.stringify({ ...a, statut: 'attente' }));
}
// Corps JSON sûr : renvoie null si le JSON est cassé (au lieu de planter en 500)
function body(req) {
  try { const b = req.body; return b && typeof b === 'object' ? b : {}; } catch { return null; }
}
const isJson = req => /application\/json/i.test(req.headers['content-type'] || '');
const str = (v, max = 300) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

module.exports = {
  redis, pipeline, flatToItems, hgetall, parse, json, ip, geo, rateLimit, norm, DISPLAY, checkPassword,
  memberId, adminId, hashPin, checkPin, account, getAccount, saveAccount, inviteCode, getSecurity, DEFAULT_SECURITY,
  deviceLabel, cleanId, sessionCookie, clearCookies, readSessionCookie, createSession, listSessions, revokeSession, revokeAll, syncSessions,
  getSession, getMember, getAdmin, logEvent, getConfig, DEFAULT_CONFIG, seedActivities, body, isJson, str,
};
