// ============================================================
//  Confidentialité : un site web ne peut pas bloquer à 100 % une capture d'écran
//  (surtout sur téléphone). On rend donc toute fuite inutile et traçable :
//  filigrane nominatif, floutage dès que l'app quitte l'écran ou qu'un raccourci
//  de capture est détecté, impression bloquée, journal des tentatives.
// ============================================================
window.EVGSec = (() => {
  const $ = id => document.getElementById(id);
  let ME = null, CFG = { watermark: true, autoLockMin: 5 }, page = '', lastAct = Date.now(), lockT;
  const report = (type, detail = '') => fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'event', type, detail, page }), keepalive: true }).catch(() => {});

  // ---------- Filigrane : prénom + nom + date + n° d'appareil, répété sur tout l'écran ----------
  function watermark() {
    const el = $('wm'); if (!CFG.watermark || !ME) { el.style.backgroundImage = 'none'; return; }
    const c = document.createElement('canvas'), d = devicePixelRatio || 1, W = 300, H = 190;
    c.width = W * d; c.height = H * d; const x = c.getContext('2d'); x.scale(d, d);
    x.translate(W / 2, H / 2); x.rotate(-0.42); x.textAlign = 'center';
    const now = new Date(), stamp = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    x.font = '700 15px Inter, sans-serif'; x.fillStyle = 'rgba(255,255,255,.16)'; x.fillText(`${ME.prenom} ${ME.nom}`.toUpperCase(), 0, -6);
    x.font = '600 11px Inter, sans-serif'; x.fillStyle = 'rgba(0,0,0,.11)'; x.fillText(`${stamp} · #${ME.sid || ''} · CONFIDENTIEL`, 0, 12);
    // seconde couche sombre pour rester visible sur les photos claires
    x.font = '700 15px Inter, sans-serif'; x.fillStyle = 'rgba(0,0,0,.15)'; x.fillText(`${ME.prenom} ${ME.nom}`.toUpperCase(), 1, -5);
    el.style.backgroundImage = `url(${c.toDataURL()})`; el.style.backgroundSize = `${W}px ${H}px`;
  }

  // ---------- Bouclier (flou) ----------
  let shielded = false;
  function shield(on, why) {
    if (on === shielded) return; shielded = on;
    document.body.classList.toggle('shielded', on); $('shield').hidden = !on;
    if (on && why) report(why);
  }
  $('shield').addEventListener('click', () => { shield(false); bump(); });

  // l'app passe en arrière-plan (multitâche, capture de l'aperçu iOS/Android) → flou immédiat
  document.addEventListener('visibilitychange', () => { if (document.hidden) shield(true); });
  window.addEventListener('blur', () => shield(true));
  window.addEventListener('pagehide', () => shield(true));

  // Raccourcis de capture : Cmd+Maj (Mac), Win+Maj (Windows), Impr écran.
  // On floute dès que les touches de modification sont enfoncées, AVANT que la capture ne parte.
  const held = new Set();
  document.addEventListener('keydown', e => {
    held.add(e.key);
    if ((e.metaKey && e.shiftKey) || (held.has('Meta') && held.has('Shift'))) { shield(true, 'screenshot'); }
    if (e.key === 'PrintScreen') { shield(true, 'screenshot'); try { navigator.clipboard.writeText(''); } catch {} }
    if ((e.ctrlKey || e.metaKey) && ['p', 's', 'u'].includes(e.key.toLowerCase())) { e.preventDefault(); shield(true, e.key.toLowerCase() === 'p' ? 'print' : 'copy'); }
    if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) || (e.metaKey && e.altKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))) { e.preventDefault(); shield(true, 'devtools'); }
  }, true);
  document.addEventListener('keyup', e => { held.delete(e.key); if (e.key === 'PrintScreen') { shield(true, 'screenshot'); try { navigator.clipboard.writeText(''); } catch {} } }, true);
  window.addEventListener('blur', () => held.clear());

  // Impression, copie, clic droit, glisser les images
  window.addEventListener('beforeprint', () => { shield(true, 'print'); });
  ['copy', 'cut'].forEach(t => document.addEventListener(t, e => { if (e.target.closest && e.target.closest('input,textarea')) return; e.preventDefault(); report('copy'); }));
  document.addEventListener('contextmenu', e => { if (!(e.target.closest && e.target.closest('input,textarea'))) e.preventDefault(); });
  document.addEventListener('dragstart', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });

  // Outils de développement ouverts (heuristique : la fenêtre intérieure rétrécit d'un coup sur ordinateur)
  let devOpen = false;
  setInterval(() => {
    if (matchMedia('(pointer:coarse)').matches) return;
    const open = outerWidth - innerWidth > 200 || outerHeight - innerHeight > 260;
    if (open && !devOpen) shield(true, 'devtools'); devOpen = open;
  }, 1500);

  // Enregistrement d'écran depuis le navigateur (getDisplayMedia) : on le signale
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    const orig = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getDisplayMedia = (...a) => { report('record'); shield(true); return orig(...a); };
  }

  // ---------- Verrouillage automatique après inactivité ----------
  function bump() { lastAct = Date.now(); }
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(t => window.addEventListener(t, bump, { passive: true }));
  function autolock() { clearInterval(lockT); if (CFG.autoLockMin > 0) lockT = setInterval(() => { if (Date.now() - lastAct > CFG.autoLockMin * 6e4) shield(true); }, 10000); }

  // ---------- Battement de cœur : dernière activité, page, et déconnexion à distance ----------
  async function ping() {
    if (document.hidden) return;
    try {
      const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ping', page }) });
      if (r.status === 401) location.replace('/login');
      else { const j = await r.json(); if (j.status !== 'active') location.replace('/login'); }
    } catch {}
  }

  return {
    start(me, cfg) {
      ME = me; CFG = { ...CFG, ...(cfg || {}) };
      watermark(); setInterval(watermark, 60000); window.addEventListener('resize', watermark);
      autolock(); ping(); setInterval(ping, 90000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) ping(); });
    },
    page(p) { if (p !== page) { page = p; ping(); } },
  };
})();
