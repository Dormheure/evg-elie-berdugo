// Verrou du site : toute page, photo ou script exige une session valide.
// Seuls la page de connexion et l'API (qui vérifie elle-même) sont accessibles sans compte.
const PUBLIC = new Set(['/login', '/login.html', '/favicon.svg', '/robots.txt']);
const next = () => new Response(null, { headers: { 'x-middleware-next': '1' } });

const b64urlToBytes = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
async function validSession(cookieHeader) {
  const c = (cookieHeader || '').split(';').map(x => x.trim()).find(x => x.startsWith('evg_s='));
  if (!c || !process.env.SESSION_SECRET) return false;
  const [p, sig] = c.slice(6).split('.'); if (!p || !sig) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(process.env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  let ok = false;
  try { ok = await crypto.subtle.verify('HMAC', key, b64urlToBytes(sig), new TextEncoder().encode(p)); } catch { return false; }
  if (!ok) return false;
  let d; try { d = JSON.parse(new TextDecoder().decode(b64urlToBytes(p))); } catch { return false; }
  // la session doit exister dans Redis et être validée (déconnexion / blocage par un orga = effet immédiat)
  const r = await fetch(`${process.env.KV_REST_API_URL}/get/evg:sess:${encodeURIComponent(d.s)}`, { headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` } });
  const j = await r.json().catch(() => ({}));
  try { const s = JSON.parse(j.result); return s.ok === true && s.m === d.m; } catch { return false; }
}

export default async function middleware(request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/') || PUBLIC.has(url.pathname)) return next();
  if (await validSession(request.headers.get('cookie'))) return next();
  const isPage = (request.headers.get('accept') || '').includes('text/html');
  if (!isPage) return new Response('Accès privé', { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const to = new URL('/login', url);
  if (url.searchParams.get('c')) to.searchParams.set('c', url.searchParams.get('c'));   // le lien d'invitation garde son code
  return Response.redirect(to, 302);
}
