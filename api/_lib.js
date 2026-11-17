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
  return j.map(x => { if (x.error) throw new Error(x.error); return x.result; });
}
function flatToItems(flat) {
  const out = [];
  for (let i = 0; i < (flat || []).length; i += 2) { try { out.push(JSON.parse(flat[i + 1])); } catch {} }
  return out;
}
async function hgetall(key) {
  const flat = (await redis('HGETALL', key)) || [];
  const out = [];
  for (let i = 0; i < flat.length; i += 2) { try { out.push(JSON.parse(flat[i + 1])); } catch {} }
  return out;
}

// ---------- Réponses HTTP ----------
const json = (res, code, data) => { res.status(code).setHeader('Cache-Control', 'no-store'); res.json(data); };
const ip = req => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';

async function rateLimit(req, bucket, max, windowSec) {
  const key = `evg:rl:${bucket}:${ip(req)}`;
  const n = await redis('INCR', key);
  if (n === 1) await redis('EXPIRE', key, windowSec);
  return n <= max;
}

// ---------- Auth admin ----------
const secret = () => process.env.SESSION_SECRET || '';
const sign = p => crypto.createHmac('sha256', secret()).update(p).digest('base64url');
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const DISPLAY = { david: 'David', alon: 'Alon', raphael: 'Raphaël' };

function checkPassword(user, password) {
  let users = {};
  try { users = JSON.parse(process.env.ADMIN_USERS || '{}'); } catch {}
  const stored = users[user];
  if (!stored) { crypto.scryptSync(String(password), 'x', 32); return false; } // temps constant
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(String(password), salt, 32);
  const good = Buffer.from(hash, 'hex');
  return good.length === test.length && crypto.timingSafeEqual(good, test);
}
function makeCookie(user, req) {
  const p = Buffer.from(JSON.stringify({ u: user, exp: Date.now() + 7 * 864e5 })).toString('base64url');
  const secure = (req.headers['x-forwarded-proto'] || '').includes('https') ? '; Secure' : '';
  return `evg_session=${p}.${sign(p)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 86400}${secure}`;
}
const clearCookie = () => 'evg_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0';
function getUser(req) {
  if (!secret()) return null;
  const c = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('evg_session='));
  if (!c) return null;
  const [p, sig] = c.slice('evg_session='.length).split('.');
  if (!p || !sig) return null;
  const expect = sign(p);
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const d = JSON.parse(Buffer.from(p, 'base64url').toString());
    return d.exp > Date.now() && DISPLAY[d.u] ? d.u : null;
  } catch { return null; }
}

// ---------- Comptes participants (prénom + nom + code perso) ----------
const memberId = (prenom, nom) => crypto.createHash('sha1').update(norm(prenom) + '|' + norm(nom)).digest('hex').slice(0, 16);
function hashPin(pin) { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.scryptSync(String(pin), salt, 32).toString('hex'); }
function checkPin(stored, pin) {
  const [salt, hash] = String(stored || ':').split(':');
  const test = crypto.scryptSync(String(pin), salt || 'x', 32), good = Buffer.from(hash || '', 'hex');
  return good.length === test.length && crypto.timingSafeEqual(good, test);
}
function readCookie(req, name) {
  const c = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(name + '='));
  return c ? c.slice(name.length + 1) : null;
}
function memberCookie(id, req) {
  const p = Buffer.from(JSON.stringify({ m: id, exp: Date.now() + 90 * 864e5 })).toString('base64url');
  const secure = (req.headers['x-forwarded-proto'] || '').includes('https') ? '; Secure' : '';
  return `evg_member=${p}.${sign(p)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${90 * 86400}${secure}`;
}
const clearMemberCookie = () => 'evg_member=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0';
// Renvoie {id, prenom, nom} si la session membre est valide ET que le compte existe encore (un reset l'invalide)
async function getMember(req) {
  if (!secret()) return null;
  const c = readCookie(req, 'evg_member'); if (!c) return null;
  const [p, sig] = c.split('.'); if (!p || !sig) return null;
  const expect = sign(p);
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const d = JSON.parse(Buffer.from(p, 'base64url').toString()); if (!(d.exp > Date.now()) || !d.m) return null;
    const raw = await redis('HGET', 'evg:members', d.m); if (!raw) return null;
    const m = JSON.parse(raw); return { id: m.id, prenom: m.prenom, nom: m.nom };
  } catch { return null; }
}
// Code d'invitation (contenu dans le lien partagé) : généré une fois, régénérable depuis l'admin
async function inviteCode() {
  let c = await redis('GET', 'evg:invite');
  if (!c) { c = crypto.randomBytes(4).toString('hex'); await redis('SET', 'evg:invite', c, 'NX'); c = await redis('GET', 'evg:invite'); }
  return c;
}

// ---------- Config par défaut (modifiable depuis l'admin) ----------
const DEFAULT_CONFIG = {
  lieu: 'Amsterdam 🇳🇱',
  intro: "Les gars, c'est officiel : Elie va se marier et personne n'a réussi à l'en empêcher. On l'emmène donc à Amsterdam pour ses dernières vacances en homme libre : bateau, bière, humiliations légères. Donnez vos dispos, votre budget et vos idées, nous on s'occupe de la préparation psychologique du patient. (Chut, Elie ne sait rien 🤫)",
  deadline: '2026-12-01',
  dateFinale: '',
  dateOptions: [
    { id: 'a', label: 'Sam 26 → Mar 29 déc.' },
    { id: 'b', label: 'Dim 27 → Mer 30 déc.' },
    { id: 'c', label: 'Lun 28 → Jeu 31 déc.' },
  ],
  budget: [
    { poste: 'Transport (A/R)', montant: 150 },
    { poste: 'Hébergement (3 nuits)', montant: 180 },
    { poste: 'Activités', montant: 80 },
    { poste: 'Restos & sorties', montant: 150 },
    { poste: "Part du marié (on invite Elie)", montant: 40 },
  ],
  programme: [],
  nbActivites: 6,        // nombre d'activités mises en avant (le podium)
  inviterMarie: true,    // le prix d'Elie est réparti sur les autres
  budgetActivites: 100,  // cible € / personne pour les activités (jauge)
};
async function getConfig() {
  const raw = await redis('GET', 'evg:config');
  let stored = {};
  try { stored = raw ? JSON.parse(raw) : {}; } catch {}
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

module.exports = { redis, pipeline, flatToItems, memberId, hashPin, checkPin, readCookie, memberCookie, clearMemberCookie, getMember, inviteCode, hgetall, json, ip, rateLimit, checkPassword, makeCookie, clearCookie, getUser, norm, DISPLAY, getConfig, DEFAULT_CONFIG, str, seedActivities, body, isJson };
