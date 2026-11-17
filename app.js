const S = window.SITE, P = window.EVGPrice, $ = id => document.getElementById(id);
const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const euro = n => (Math.round(n * 10) / 10).toLocaleString('fr-FR') + ' €';
const store = { get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}, set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}} };
const api = async (url, opts) => {
  let r; try { r = await fetch(url, opts); } catch { throw new Error('Pas de connexion, réessaie.'); }
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Erreur, réessaie.'); return j;
};
const postJSON = (url, body) => api(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
let toastT; const toast = (m) => { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3500); };
const okUrl = u => /^https?:\/\//i.test(u || '') ? u : '';

// ---------- Contenu statique (data.js) ----------
$('titre').textContent = S.titre; $('sousTitre').textContent = S.sousTitre;
$('marquee').textContent = `🚨 ALERTE : LE DR ${S.nom.toUpperCase()} PERD SA LIBERTÉ 🚨 AMSTERDAM 🚨 ON NE CHOISIT PAS SES AMIS, ON LES SUBIT 🚨 AUCUN MÉDECIN NE SERA BLESSÉ (POUR L'INSTANT) 🚨 `.repeat(6);
const photo = (p, big) => p.fichier
  ? `<img src="photos/${big ? '' : 'thumbs/'}${encodeURI(p.fichier)}" alt="${safe(p.legende||S.nom)}" ${big?'fetchpriority="high"':'loading="lazy"'} decoding="async">`
  : `<div class="ph"><span>${big?'🤓':'🤡'}</span>Photo d'${safe(S.nom.split(' ')[0])}<br>à mettre ici</div>`;
$('heroPhoto').innerHTML = `<div class="frame">${photo({fichier:S.photoPrincipale||S.photos[0]?.fichier||'',legende:S.nom},true)}</div>`;
$('gallery').innerHTML = S.photos.map(p=>`<figure class="polaroid"><div class="img">${photo(p)}</div><figcaption>${safe(p.legende)}</figcaption></figure>`).join('');
$('diagnostic').innerHTML = S.diagnostic.map(([a,b])=>`<tr><th scope="row">${safe(a)}</th><td>${safe(b)}</td></tr>`).join('');

// ---------- Session (le middleware garantit qu'on est connecté ; l'API le confirme) ----------
let ME = null, AUTHLOAD = true, HASRSVP = null;   // AUTHLOAD : vrai tant que mes votes ne sont pas chargés
const initials = m => ((m.prenom || '?')[0] + (m.role === 'admin' ? '' : (m.nom || '')[0] || '')).toUpperCase();
function renderAccount() {
  $('avatar').textContent = initials(ME); $('avatar').classList.toggle('adm', ME.role === 'admin');
  $('moiTitle').textContent = `Salut ${ME.prenom} 👋`;
  $('navOrga').hidden = ME.role !== 'admin'; document.body.classList.toggle('isAdmin', ME.role === 'admin');
}
$('logoutBtn').onclick = async () => { if (!confirm('Te déconnecter de cet appareil ?')) return; try { await postJSON('/api/auth', { action: 'logout' }); } catch {} location.replace('/login'); };
$('changePin').onclick = async () => {
  const old = prompt('Ton code actuel :'); if (old === null) return; const nw = prompt('Ton nouveau code (4 caractères minimum) :'); if (nw === null) return;
  try { await postJSON('/api/auth', { action: 'changepin', pin: old, newPin: nw }); toast('✅ Code modifié. Tes autres appareils ont été déconnectés.'); loadDevices(); } catch (e) { toast('⚠️ ' + e.message); }
};
async function loadDevices() {
  let d = []; try { d = (await postJSON('/api/auth', { action: 'devices' })).devices; } catch { return; }
  $('myDevices').innerHTML = d.map(x => `<div class="dev ${x.current ? 'cur' : ''}"><span class="devIc">${/iPhone|Android/.test(x.label) ? '📱' : /iPad/.test(x.label) ? '📲' : '💻'}</span>
    <div><b>${safe(x.label)}</b>${x.current ? ' <span class="chip ok">cet appareil</span>' : ''}<small>${safe([x.city, x.country].filter(Boolean).join(', ') || 'lieu inconnu')} · actif ${ago(x.lastSeen)}</small></div>
    ${x.current ? '' : `<button type="button" class="btn small ghost" data-rv="${safe(x.id)}">Déconnecter</button>`}</div>`).join('');
  $('myDevices').querySelectorAll('[data-rv]').forEach(b => b.onclick = async () => { if (!confirm('Déconnecter cet appareil ?')) return; await postJSON('/api/auth', { action: 'revoke', id: b.dataset.rv }); loadDevices(); });
}

// ---------- Config (dates, lieu, budget…) ----------
let CFG = null, VENUS = [], cdTimer;
const fmtDate = d => new Date(d + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
async function loadConfig() {
  const d = await api('/api/config'); CFG = d.config; VENUS = d.venus;
  $('intro').textContent = CFG.intro;
  $('planDates').innerHTML = CFG.dateOptions.map(o => `<li>${safe(o.label)}</li>`).join('');
  $('planLieu').textContent = CFG.lieu; $('lieuNom').textContent = '(' + CFG.lieu.replace(/[^\p{L}\p{N} ]/gu, '').trim() + ')';
  $('budgetTotal').textContent = '~' + budgetTotal() + ' €';
  if (!$('formDates').dataset.ready || $('formDates').dataset.sig !== CFG.dateOptions.map(o => o.id + o.label).join('|')) {
    $('formDates').dataset.ready = 1; $('formDates').dataset.sig = CFG.dateOptions.map(o => o.id + o.label).join('|');
    $('formDates').innerHTML = CFG.dateOptions.map(o => `<div class="dateRow" role="radiogroup" aria-label="${safe(o.label)}"><b>${safe(o.label)}</b><div class="seg small">
      ${[['oui','✅ Dispo'],['peut-etre','🤷 Peut-être'],['non','❌ Non']].map(([v,l]) => `<label><input type="radio" name="d_${safe(o.id)}" value="${v}"><span>${l}</span></label>`).join('')}</div></div>`).join('');
    syncRequired(); loadMyRsvp();
  }
  $('programme').innerHTML = CFG.programme.map(day => `<div class="day"><b>${safe(day.jour)}</b><h3>${safe(day.titre)}</h3><ul>${day.items.map(i => `<li>${safe(i)}</li>`).join('')}</ul></div>`).join('');
  $('participants').innerHTML = VENUS.length ? VENUS.map(n => `<div class="person"><span class="pAv">${safe(n[0] || '?')}</span><b>${safe(n)}</b></div>`).join('') : '<p class="hint">Aucun complice pour l\'instant. Elie se croit en sécurité.</p>';
  $('nbVenus').textContent = VENUS.length + ' confirmé' + (VENUS.length > 1 ? 's' : '');
  const closed = !CFG.dateFinale && CFG.deadline && Date.now() > new Date(CFG.deadline + 'T23:59').getTime();
  $('countLabel').textContent = CFG.dateFinale ? 'Départ dans…' : closed ? 'La date limite est passée, mais écris-nous vite !' : 'Fin des réponses dans…';
  $('deadlineTxt').textContent = !CFG.dateFinale && CFG.deadline && !closed ? `(réponse attendue avant le ${fmtDate(CFG.deadline)})` : '';
  clearInterval(cdTimer);
  if (closed) $('countdown').innerHTML = ''; else startCountdown(new Date(CFG.dateFinale || (CFG.deadline + 'T23:59')).getTime());
  EXTRA = d.defisExtra || []; buildDefis(); renderDefis();
}
// budget hors "activités" (remplacé par l'estimation du podium) pour le total du séjour
const budgetTotal = () => CFG.budget.reduce((a, b) => a + b.montant, 0);
const budgetHorsActivites = () => CFG.budget.filter(b => !/activit/i.test(b.poste)).reduce((a, b) => a + b.montant, 0);
function startCountdown(t0) {
  const tick = () => { let r = Math.max(0, t0 - Date.now());
    $('countdown').innerHTML = [[864e5,'jours'],[36e5,'heures'],[6e4,'min'],[1e3,'sec']].map(([ms,l]) => { const v = Math.floor(r/ms); r -= v*ms; return `<div>${v}<small>${l}</small></div>`; }).join(''); };
  tick(); cdTimer = setInterval(tick, 1000);
}

// ---------- Formulaire de réponse ----------
const form = $('rsvpForm');
function syncRequired() { // si "je ne peux pas" : on masque et on ne demande plus rien d'autre
  const non = form.statut.value === 'non';
  $('formDetails').hidden = non;
  form.querySelectorAll('#formDates .dateRow').forEach(r => { const first = r.querySelector('input'); if (first) first.required = !non; });
  ['lieuOk', 'budget'].forEach(n => { const first = form.querySelector(`input[name="${n}"]`); if (first) first.required = !non; });
}
form.addEventListener('change', e => { if (e.target.name === 'statut') syncRequired(); });
async function loadMyRsvp() {   // retrouve MA dernière réponse (compte requis)
  if (!ME || !CFG) return;
  let r; try { r = (await api('/api/rsvp')).rsvp; } catch { return; } HASRSVP = !!r; renderTodo(); if (!r) return;
  const setRadio = (n, v) => form.querySelectorAll(`input[name="${n}"]`).forEach(el => el.checked = el.value === v);
  setRadio('statut', r.statut); setRadio('lieuOk', r.lieuOk); setRadio('budget', r.budget);
  CFG.dateOptions.forEach(o => setRadio('d_' + o.id, r.dispos?.[o.id]));
  ['contact', 'lieuIdee', 'budgetMax', 'depart', 'adresse', 'transport', 'regime', 'idees', 'commentaire'].forEach(k => { if (form[k] && r[k] !== undefined && r[k] !== 0) form[k].value = r[k]; });
  syncRequired();
}
form.addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(form), body = Object.fromEntries(f.entries());
  body.dispos = {}; CFG.dateOptions.forEach(o => body.dispos[o.id] = f.get('d_' + o.id) || 'non');
  const btn = $('rsvpBtn'), msg = $('rsvpMsg'); btn.disabled = true; msg.className = 'formMsg'; msg.textContent = 'Envoi…';
  try {
    const r = await postJSON('/api/rsvp', body);
    msg.className = 'formMsg ok'; msg.textContent = r.modifie ? '✅ Réponse mise à jour, merci !' : '✅ Réponse enregistrée. Elie ne se doute de rien, bien joué 🕵️';
    HASRSVP = true; renderTodo(); toast('✅ Réponse enregistrée. Prochaine étape : voter !'); loadConfig().catch(() => {});
  } catch (err) { msg.className = 'formMsg err'; msg.textContent = '⚠️ ' + err.message; }
  btn.disabled = false;
});

// ---------- Activités : votes + podium + jauge ----------
let ACTS = [], MINE = {}, ACFG = {}, NB = 8, NBVOTANTS = 0, CAT = 'Toutes', nbTouched = false;
let seq = 0, pending = 0, queue = Promise.resolve();
async function loadActivities() {
  const mine = ++seq;
  const d = await api('/api/activities');
  if (mine !== seq || pending) return; // réponse périmée ou votes en cours d'envoi : on ne touche à rien
  AUTHLOAD = false; ACTS = d.activities; MINE = d.mesVotes || {}; ACFG = d.config; NBVOTANTS = d.nbVotants;
  if (!nbTouched) NB = Math.max(4, d.nbParticipants);
  renderActivities();
}
function renderActivities() {
  const N = ACFG.nbActivites, ranked = P.rank(ACTS), top = P.podium(ACTS, N), refused = ACTS.filter(a => a.statut === 'refusee');
  const topIds = new Set(top.map(a => a.id)), rankOf = Object.fromEntries(top.map((a, i) => [a.id, i + 1]));
  const todo = ACTS.filter(a => a.statut !== 'refusee' && !MINE[a.id]).length;
  const cats = ['Toutes', `À voter (${todo})`, ...new Set(ACTS.map(a => a.categorie))];
  if (CAT.startsWith('À voter')) CAT = cats[1];
  $('catFilter').innerHTML = cats.map(c => `<button type="button" class="chipBtn ${c===CAT?'on':''}" aria-pressed="${c===CAT}" data-c="${safe(c)}">${safe(c)}</button>`).join('');
  $('catFilter').querySelectorAll('button').forEach(b => b.onclick = () => { CAT = b.dataset.c; renderActivities(); });
  const nVoted = ACTS.filter(a => MINE[a.id]).length;
  $('voteProgress').innerHTML = `${nVoted}/${ACTS.length} votées · ${NBVOTANTS} votant${NBVOTANTS>1?'s':''}`;

  // Podium
  const T = ACFG.budgetActivites || 100;
  if (!top.length) {
    $('podium').innerHTML = `<h3>🏆 Le podium</h3><p class="hint light">Personne n'a encore voté : Elie dort tranquille, plus pour longtemps. Vote 😍 sur ce qui te tente : les ${N} plus plébiscitées formeront le podium, avec le prix par personne.</p>`;
  } else {
    const est = P.estimate(top, NB, ACFG.inviterMarie), max = Math.max(T * 2, est.parPayeur * 1.15), pct = v => Math.min(100, v / max * 100);
    const zone = est.parPayeur <= T ? 'ok' : est.parPayeur <= T * 1.5 ? 'mid' : 'bad';
    const sejour = budgetHorsActivites() + est.parPayeur;
    $('podium').innerHTML = `
      <h3>🏆 Le podium${top.length < N ? ` (${top.length}/${N} pour l'instant)` : `: top ${N}`}</h3>
      <div class="podiumList">${top.map((a, i) => `<div class="podItem ${a.statut==='validee'?'valid':''}"><span class="rk">${i+1}</span><span class="em" aria-hidden="true">${safe(a.emoji)}</span>
        <div class="pn"><b>${safe(a.nom)}</b><small>${a.statut==='validee'?'✅ validée par les orgas · ':''}😍 ${a.counts?.oui||0} · 🙅 ${a.counts?.non||0}</small></div>
        <span class="pp">${euro(P.pp(a, NB))}<small>/pers.</small></span></div>`).join('')}</div>
      <div class="nbRow"><label for="nbRange">Nombre de participants : <b>${NB}</b> <small>(Elie compris)</small></label>
        <input type="range" id="nbRange" min="4" max="25" value="${NB}"></div>
      <div class="gauge" role="img" aria-label="Estimation ${euro(est.parPayeur)} par personne pour une cible de ${euro(T)}"><div class="gaugeBar"><i class="z-ok" style="width:${pct(T)}%"></i><i class="z-mid" style="width:${pct(T*1.5)-pct(T)}%"></i><i class="z-bad" style="width:${100-pct(T*1.5)}%"></i>
        <span class="mark" style="left:${pct(est.parPayeur)}%"></span></div>
        <div class="gaugeLbl"><span>0 €</span><span>cible ${euro(T)}</span><span>${euro(max)}</span></div></div>
      <div class="est ${zone}"><b>≈ ${euro(est.parPayeur)} / pers.</b> pour ces ${top.length} activité${top.length>1?'s':''}
        <small>Total groupe ${euro(est.total)} · réparti sur ${est.payeurs} personnes${ACFG.inviterMarie ? ' (on invite Elie 🎁)' : ''} · le tarif change selon le nombre de participants</small></div>
      <div class="est total"><b>≈ ${euro(sejour)} / pers. tout compris</b> <small>transport, hébergement, repas (${euro(budgetHorsActivites())}) + activités du podium</small></div>`;
    $('nbRange').oninput = e => { NB = +e.target.value; nbTouched = true; renderActivities(); $('nbRange').focus(); };
  }

  // Grille de vote
  let list = ranked.concat(refused);
  if (CAT.startsWith('À voter')) list = list.filter(a => a.statut !== 'refusee' && !MINE[a.id]); else if (CAT !== 'Toutes') list = list.filter(a => a.categorie === CAT);
  $('actGrid').innerHTML = list.length ? list.map(a => { const v = MINE[a.id], c = a.counts || {oui:0, non:0}, r = rankOf[a.id], src = okUrl(a.source);
    return `<article class="act ${a.statut==='refusee'?'refused':''} ${r?'intop':''}" aria-label="${safe(a.nom)}">
      ${r ? `<span class="topTag">#${r}</span>` : ''}${a.statut==='validee'?'<span class="validTag">✅ validée</span>':''}${a.statut==='refusee'?'<span class="validTag no">⛔ écartée</span>':''}
      <div class="ahead"><span class="aem" aria-hidden="true">${safe(a.emoji)}</span><div><h4>${safe(a.nom)}</h4><span class="cat">${safe(a.categorie)} · ${safe(a.duree||'')}</span></div></div>
      <p>${safe(a.description)}</p>
      <div class="price"><b>${euro(P.pp(a, NB))}</b>/pers. à ${NB}<small>${safe(P.bareme(a))}${a.verifie === false ? ' · prix estimé' : ''}${a.prixNote ? ' · ' + safe(a.prixNote.length > 120 ? a.prixNote.slice(0, 117) + '…' : a.prixNote) : ''}${src ? ` · <a href="${safe(src)}" target="_blank" rel="noopener noreferrer">infos ↗</a>` : ''}</small></div>
      <div class="votes"><button type="button" class="vy ${v==='oui'?'on':''}" aria-pressed="${v==='oui'}" data-id="${safe(a.id)}" data-v="oui">😍 Grave <i>${c.oui}</i></button><button type="button" class="vn ${v==='non'?'on':''}" aria-pressed="${v==='non'}" data-id="${safe(a.id)}" data-v="non">🙅 Bof <i>${c.non}</i></button></div></article>`; }).join('')
    : `<p class="hint">${CAT.startsWith('À voter') ? '🎉 Tu as voté sur toutes les activités, merci !' : 'Rien ici.'}</p>`;
  $('actGrid').querySelectorAll('.votes button').forEach(b => b.onclick = () => vote(b.dataset.id, b.dataset.v));
  renderDeck(); renderNav();
}
async function vote(id, v) {
  const a = ACTS.find(x => x.id === id), prev = MINE[id], next = prev === v ? null : v;
  // mise à jour immédiate (optimiste), annulée si le serveur refuse
  if (a.counts) { if (prev) a.counts[prev]--; if (next) a.counts[next]++; }
  if (next) MINE[id] = next; else delete MINE[id];
  renderActivities();
  // envois l'un après l'autre (évite que deux votes rapides s'écrasent), rechargement une fois tout envoyé
  pending++;
  queue = queue.then(() => postJSON('/api/activities', { votes: { [id]: next } }))
    .catch(e => toast('⚠️ ' + e.message))
    .finally(() => { if (--pending === 0) loadActivities().catch(() => {}); });
}

// ---------- Mode swipe (cartes à glisser) ----------
let MODE = store.get('evg_mode', 'swipe'), DECK = [], HIST = [], DRAG = false, FLYING = false;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
function setMode(m) {
  MODE = m; store.set('evg_mode', m);
  $('swipeView').hidden = m !== 'swipe'; $('listView').hidden = m !== 'liste';
  document.querySelectorAll('.modeSwitch button').forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-selected', b.dataset.mode === m); });
  if (m === 'swipe') renderDeck();
}
document.querySelectorAll('.modeSwitch button').forEach(b => b.onclick = () => setMode(b.dataset.mode));
function renderNav() { const n = ACTS.filter(a => a.statut !== 'refusee' && !MINE[a.id]).length; $('navTodo').textContent = n ? n : '✓'; $('navTodo').classList.toggle('done', !n); renderTodo(); }
function remaining() {
  if (!DECK.length) DECK = shuffle(ACTS.map(a => a.id));            // ordre aléatoire (pas de biais), fixé pour la session
  else { const known = new Set(DECK); ACTS.forEach(a => { if (!known.has(a.id)) DECK.push(a.id); }); }
  return DECK.map(id => ACTS.find(a => a.id === id)).filter(a => a && a.statut !== 'refusee' && !MINE[a.id]);
}
const cardHTML = (a) => `<div class="scard" data-id="${safe(a.id)}">
  <span class="stampR" aria-hidden="true">GRAVE 😍</span><span class="stampL" aria-hidden="true">BOF 🙅</span>
  <div class="sem" aria-hidden="true">${safe(a.emoji)}</div><h3>${safe(a.nom)}</h3><span class="cat">${safe(a.categorie)} · ${safe(a.duree || '')}</span>
  <p>${safe(a.description)}</p>
  <div class="sprice"><b>${euro(P.pp(a, NB))}</b>/pers. <small>à ${NB} personnes</small><small>${safe(P.bareme(a))}${a.verifie === false ? ' · prix estimé' : ''}${okUrl(a.source) ? ` · <a href="${safe(okUrl(a.source))}" target="_blank" rel="noopener noreferrer">infos ↗</a>` : ''}</small></div></div>`;
function renderDeck() {
  const el = $('deck'); if (!el || DRAG || FLYING) return;
  if (!ACTS.length || AUTHLOAD) { el.innerHTML = '<div class="scard gate"><p>Chargement des activités…</p></div>'; return; }
  const left = remaining(), n = left.length;
  $('btnUndo').disabled = !HIST.length;
  const off = !n;
  ['btnNo', 'btnYes', 'btnSkip'].forEach(i => $(i).disabled = off);
  if (!n) { el.innerHTML = `<div class="scard gate"><div class="sem">🎉</div><h3>Tu as tout voté. Elie n'a aucune chance 😈</h3><p>${ACTS.filter(a => MINE[a.id] === 'oui').length} 😍 · ${ACTS.filter(a => MINE[a.id] === 'non').length} 🙅</p><button type="button" class="btn small" onclick="document.getElementById('podium').scrollIntoView({behavior:'smooth'})">Voir le podium 🏆</button> <button type="button" class="btn small ghost" id="seeList">Revoir mes votes</button></div>`; $('seeList').onclick = () => setMode('liste'); return; }
  el.innerHTML = (n > 2 ? `<div class="scard back2"></div>` : '') + (n > 1 ? `<div class="scard back1"></div>` : '') + cardHTML(left[0]);
  attachDrag(el.querySelector('.scard[data-id]'));
}
function attachDrag(c) {
  let sx = 0, sy = 0, dx = 0, on = false;
  const stamps = () => { c.querySelector('.stampR').style.opacity = Math.min(1, Math.max(0, dx / 90)); c.querySelector('.stampL').style.opacity = Math.min(1, Math.max(0, -dx / 90)); };
  c.addEventListener('pointerdown', e => { if (FLYING || e.target.closest('a,button')) return; on = true; DRAG = true; dx = 0; sx = e.clientX; sy = e.clientY; c.style.transition = 'none'; try { c.setPointerCapture(e.pointerId); } catch {} });
  c.addEventListener('pointermove', e => { if (!on) return; dx = e.clientX - sx; c.style.transform = `translate(${dx}px, ${(e.clientY - sy) * .15}px) rotate(${dx / 16}deg)`; stamps(); });
  const end = () => { if (!on) return; on = false; DRAG = false;
    if (Math.abs(dx) > 90) decide(c, dx > 0 ? 'oui' : 'non');
    else { c.style.transition = 'transform .25s'; c.style.transform = ''; dx = 0; stamps(); } };
  c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
}
// vote + animation de sortie de la carte
function decide(c, v) {
  const id = c.dataset.id; if (FLYING) return;
  FLYING = true; const dir = v === 'oui' ? 1 : -1;
  c.style.transition = 'transform .28s ease-in, opacity .28s'; c.style.transform = `translate(${dir * innerWidth * 1.1}px, -30px) rotate(${dir * 28}deg)`; c.style.opacity = '0';
  c.querySelector(v === 'oui' ? '.stampR' : '.stampL').style.opacity = 1;
  if (navigator.vibrate) try { navigator.vibrate(12); } catch {}
  setTimeout(() => { FLYING = false; HIST.push({ id, v }); vote(id, v); }, 260);
}
const topCard = () => document.querySelector('#deck .scard[data-id]');
$('btnYes').onclick = () => { const c = topCard(); if (c) decide(c, 'oui'); };
$('btnNo').onclick = () => { const c = topCard(); if (c) decide(c, 'non'); };
$('btnSkip').onclick = () => { const c = topCard(); if (!c || FLYING) return; DECK = DECK.filter(i => i !== c.dataset.id).concat(c.dataset.id); renderDeck(); };
$('btnUndo').onclick = () => { const h = HIST.pop(); if (!h) return; DECK = [h.id].concat(DECK.filter(i => i !== h.id)); if (MINE[h.id] === h.v) vote(h.id, h.v); renderDeck(); };
$('deck').addEventListener('keydown', e => { const c = topCard(); if (!c) return; if (e.key === 'ArrowRight') { e.preventDefault(); decide(c, 'oui'); } else if (e.key === 'ArrowLeft') { e.preventDefault(); decide(c, 'non'); } });
setMode(MODE);

// ---------- Défis du docteur (data.js + défis ajoutés par les orgas) ----------
const LVL = { 1: ['🌶️', 1], 2: ['🌶️🌶️', 2], 3: ['🌶️🌶️🌶️', 3], 4: ['💀', 5], g: ['👥', 3] };
let EXTRA = [], DEFIS = [], DONE = new Set(store.get('evg_defis', []).map(k => typeof k === 'number' ? 's' + k : k)), DLVL = 'tous', DPICK = null;
function buildDefis() { DEFIS = [...S.defis.map((d, i) => ({ k: 's' + i, n: d.n, t: d.t })), ...EXTRA.map(d => ({ k: 'x' + d.id, n: d.n, t: d.t }))].filter(d => LVL[d.n]); }
const getD = k => DEFIS.find(d => d.k === k);
const saveDone = () => store.set('evg_defis', [...DONE]);
function renderDefis() {
  const ok = [...DONE].filter(k => getD(k)), pts = ok.reduce((a, k) => a + LVL[getD(k).n][1], 0), max = DEFIS.reduce((a, d) => a + LVL[d.n][1], 0);
  $('defiScore').textContent = `${pts} / ${max} pts · ${ok.length}/${DEFIS.length} défis`;
  const lv = [['tous', 'Tous'], ['1', '🌶️'], ['2', '🌶️🌶️'], ['3', '🌶️🌶️🌶️'], ['4', '💀 Hardcore'], ['g', '👥 Groupe']];
  $('defiFilter').innerHTML = lv.map(([k, l]) => `<button type="button" class="chipBtn ${k === DLVL ? 'on' : ''}" aria-pressed="${k === DLVL}" data-k="${k}">${l}</button>`).join('');
  $('defiFilter').querySelectorAll('button').forEach(b => b.onclick = () => { DLVL = b.dataset.k; renderDefis(); });
  $('defiList').innerHTML = DEFIS.filter(d => DLVL === 'tous' || String(d.n) === DLVL)
    .map(d => `<li class="${DONE.has(d.k) ? 'done' : ''}"><label><input type="checkbox" data-k="${safe(d.k)}" ${DONE.has(d.k) ? 'checked' : ''}><span class="lv">${LVL[d.n][0]}</span><span class="tx">${safe(d.t)}</span></label></li>`).join('');
  $('defiList').querySelectorAll('input').forEach(c => c.onchange = () => { c.checked ? DONE.add(c.dataset.k) : DONE.delete(c.dataset.k); saveDone(); if (DPICK === c.dataset.k && c.checked) DPICK = null; renderDefis(); drawCard(); });
}
function drawCard() {
  const c = $('defiCard'); if (DPICK === null || !getD(DPICK)) { if (!c.dataset.msg) c.hidden = true; return; }
  const d = getD(DPICK), p = LVL[d.n][1]; c.hidden = false; c.dataset.msg = '';
  c.innerHTML = `<span class="lv">${LVL[d.n][0]}</span><p>${safe(d.t)}</p><div class="row2c"><button type="button" class="btn small" id="dOk">✅ Fait ! (+${p} pt${p > 1 ? 's' : ''})</button><button type="button" class="btn small ghost" id="dNext">🔁 Autre défi</button></div>`;
  $('dOk').onclick = () => { DONE.add(DPICK); saveDone(); DPICK = null; renderDefis(); drawCard(); toast('🔥 Bien joué ! Pense à la preuve photo.'); };
  $('dNext').onclick = pickDefi;
}
function pickDefi() {
  const left = DEFIS.filter(d => !DONE.has(d.k) && (DLVL === 'tous' || String(d.n) === DLVL)).map(d => d.k);
  if (!left.length) { DPICK = null; $('defiCard').hidden = false; $('defiCard').dataset.msg = '1'; $('defiCard').innerHTML = '<p>🏆 Tous les défis de cette catégorie sont faits. Elie est brisé.</p>'; return; }
  let n; do { n = left[Math.random() * left.length | 0]; } while (left.length > 1 && n === DPICK);
  DPICK = n; drawCard(); $('defiCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
$('randDefi').onclick = pickDefi;
$('defiReset').onclick = () => { if (confirm('Remettre tous les défis à zéro sur cet appareil ?')) { DONE = new Set(); saveDone(); DPICK = null; $('defiCard').dataset.msg = ''; renderDefis(); drawCard(); } };
buildDefis(); renderDefis();

// ---------- Idées des participants : proposer, liker, commenter ----------
let IDEAS = [], ICATS = [], ISORT = 'top', ICAT = 'Toutes', OPENC = new Set(), iq = Promise.resolve();
async function loadIdeas() {
  try { const d = await api('/api/ideas'); IDEAS = d.ideas; ICATS = d.categories; } catch { IDEAS = IDEAS || []; }
  renderIdeas();
}
const ago = iso => { const m = Math.max(0, (Date.now() - new Date(iso)) / 6e4 | 0); return m < 1 ? "à l'instant" : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${m / 60 | 0} h` : `il y a ${m / 1440 | 0} j`; };
function renderIdeas() {
  if (ICATS.length && !$('iCat').options.length) $('iCat').innerHTML = ICATS.map(c => `<option>${safe(c)}</option>`).join('');
  const cats = ['Toutes', ...new Set(IDEAS.map(i => i.categorie))];
  if (!cats.includes(ICAT)) ICAT = 'Toutes';
  $('iCatFilter').innerHTML = cats.length > 2 ? cats.map(c => `<button type="button" class="chipBtn ${c === ICAT ? 'on' : ''}" aria-pressed="${c === ICAT}" data-c="${safe(c)}">${safe(c)}</button>`).join('') : '';
  $('iCatFilter').querySelectorAll('button').forEach(b => b.onclick = () => { ICAT = b.dataset.c; renderIdeas(); });
  document.querySelectorAll('.sortSwitch button').forEach(b => { b.classList.toggle('on', b.dataset.sort === ISORT); b.setAttribute('aria-pressed', b.dataset.sort === ISORT); });
  const list = IDEAS.filter(i => ICAT === 'Toutes' || i.categorie === ICAT)
    .sort((a, b) => ISORT === 'new' ? b.createdAt.localeCompare(a.createdAt) : (b.likes - a.likes) || b.createdAt.localeCompare(a.createdAt));
  $('ideaList').innerHTML = list.length ? list.map(i => `<article class="idea ${safe(i.statut)}" data-id="${safe(i.id)}">
    <div class="ihead"><h4>${safe(i.titre)}</h4><span class="cat">${safe(i.categorie)}${i.prix ? ' · ≈ ' + euro(i.prix) + '/pers.' : ''}</span></div>
    ${i.statut === 'retenue' ? '<span class="badgeOk">✅ Retenue par les orgas</span>' : i.statut === 'refusee' ? '<span class="badgeNo">⛔ Pas retenue</span>' : ''}
    ${i.description ? `<p>${safe(i.description)}</p>` : ''}${i.note ? `<p class="onote">💬 Orgas : ${safe(i.note)}</p>` : ''}
    <div class="imeta">par <b>${safe(i.auteur)}</b> · ${ago(i.createdAt)}${okUrl(i.lien) ? ` · <a href="${safe(okUrl(i.lien))}" target="_blank" rel="noopener noreferrer">lien ↗</a>` : ''}</div>
    <div class="iact"><button type="button" class="likeBtn ${i.jaime ? 'on' : ''}" data-like="${safe(i.id)}" aria-pressed="${i.jaime}" aria-label="J'aime cette idée">${i.jaime ? '❤️' : '🤍'} <b>${i.likes}</b></button>
      <button type="button" class="comBtn" data-com="${safe(i.id)}" aria-expanded="${OPENC.has(i.id)}">💬 <b>${i.comments.length}</b></button>${i.mine ? `<button type="button" class="delBtn" data-del="${safe(i.id)}" aria-label="Supprimer mon idée">🗑</button>` : ''}</div>
    ${OPENC.has(i.id) ? `<div class="comments">${i.comments.map(c => `<div class="com"><b>${safe(c.auteur)}</b> <small>${ago(c.createdAt)}</small>${c.mine ? ` <button type="button" class="delBtn tiny" data-dc="${safe(i.id)}|${safe(c.id)}" aria-label="Supprimer mon commentaire">✕</button>` : ''}<br>${safe(c.texte)}</div>`).join('') || '<p class="hint">Aucun commentaire. Lâche-toi.</p>'}
      <form class="comForm" data-cf="${safe(i.id)}"><input maxlength="300" placeholder="Ton commentaire…" aria-label="Ton commentaire" required><button class="btn small" type="submit">Envoyer</button></form></div>` : ''}
  </article>`).join('') : '<p class="hint">Aucune idée pour le moment. Soyez les premiers à proposer une horreur 😈</p>';
  const L = (sel, fn) => $('ideaList').querySelectorAll(sel).forEach(fn);
  L('[data-like]', b => b.onclick = () => likeIdea(b.dataset.like));
  L('[data-com]', b => b.onclick = () => { OPENC.has(b.dataset.com) ? OPENC.delete(b.dataset.com) : OPENC.add(b.dataset.com); renderIdeas(); });
  L('[data-del]', b => b.onclick = () => { if (confirm('Supprimer ton idée ?')) ideaAction({ action: 'delete', id: b.dataset.del }); });
  L('[data-dc]', b => b.onclick = () => { const [id, cid] = b.dataset.dc.split('|'); ideaAction({ action: 'delcomment', id, cid }); });
  L('[data-cf]', f => f.onsubmit = e => { e.preventDefault(); const inp = f.querySelector('input'); ideaAction({ action: 'comment', id: f.dataset.cf, texte: inp.value }); inp.value = ''; });
}
// actions envoyées l'une après l'autre ; on recharge la liste une fois tout envoyé
function ideaAction(body) {
  iq = iq.then(() => postJSON('/api/ideas', body)).catch(e => toast('⚠️ ' + e.message)).then(() => loadIdeas());
}
function likeIdea(id) {
  const i = IDEAS.find(x => x.id === id); if (!i) return;
  i.jaime = !i.jaime; i.likes += i.jaime ? 1 : -1; renderIdeas();            // instantané
  iq = iq.then(() => postJSON('/api/ideas', { action: 'like', id, like: i.jaime })).catch(e => toast('⚠️ ' + e.message)).then(() => loadIdeas());
}
document.querySelectorAll('.sortSwitch button').forEach(b => b.onclick = () => { ISORT = b.dataset.sort; renderIdeas(); });
$('ideaForm').addEventListener('submit', async e => {
  e.preventDefault(); const btn = $('iBtn'), msg = $('iMsg'); btn.disabled = true; msg.className = 'formMsg'; msg.textContent = 'Envoi…';
  try {
    await postJSON('/api/ideas', { action: 'create', titre: $('iTitre').value, description: $('iDesc').value, categorie: $('iCat').value, prix: $('iPrix').value, lien: $('iLien').value });
    $('ideaForm').reset(); msg.className = 'formMsg ok'; msg.textContent = '✅ Idée envoyée, qu\'elle soit likée !'; ISORT = 'new'; await loadIdeas(); $('ideaForm').closest('details').open = false;
  } catch (err) { msg.className = 'formMsg err'; msg.textContent = '⚠️ ' + err.message; }
  btn.disabled = false;
});

// ---------- À faire (accueil) ----------
function renderTodo() {
  const n = ACTS.filter(a => a.statut !== 'refusee' && !MINE[a.id]).length, steps = [];
  if (HASRSVP === false) steps.push(['📝', 'Donne ta réponse (dispos, budget)', '#/moi']);
  if (ACTS.length && n) steps.push(['🗳️', `Vote les activités (${n} restantes)`, '#/vote']);
  if (!steps.length && HASRSVP) steps.push(['🦄', 'Tout est fait ! Va rêver dans le Guide', '#/guide']);
  $('todo').innerHTML = steps.map(([e, t, h]) => `<a class="todoItem" href="${h}"><span>${e}</span><b>${t}</b><i>→</i></a>`).join('');
  $('ctaRsvp').textContent = HASRSVP ? 'Ma réponse ✅' : 'Je réponds 📝';
}

// ---------- Formules 48 h + Guide ----------
const G = window.GUIDE, GCAT = Object.fromEntries(G.cats.map(c => [c.id, c]));
const favs = new Set(store.get('evg_favs', []));
let GSEL = 'tout', GFAV = false;
function renderFormules() {
  $('formules').innerHTML = G.formules.map(f => `<article class="formule f-${f.id}"><div class="fHead"><span class="fE">${f.e}</span><div><h3>${safe(f.t)}</h3><b class="fPrix">≈ ${f.prix} €<small>/pers. tout compris hors transport</small></b></div></div>
    <p>${safe(f.pitch)}</p><div class="fDays"><div><h4>Jour 1</h4><ol>${f.j1.map(x => `<li>${safe(x)}</li>`).join('')}</ol></div><div><h4>Jour 2</h4><ol>${f.j2.map(x => `<li>${safe(x)}</li>`).join('')}</ol></div></div></article>`).join('');
}
function renderGuide() {
  const q = norm($('guideQ').value);
  $('guideCats').innerHTML = [{ id: 'tout', e: '✨', t: 'Tout', s: `${G.items.length} idées` }, ...G.cats].map(c => `<button type="button" class="gCat ${c.id === GSEL ? 'on' : ''}" data-g="${c.id}" aria-pressed="${c.id === GSEL}"><span>${c.e}</span><b>${safe(c.t)}</b><small>${safe(c.s)}</small></button>`).join('');
  $('guideCats').querySelectorAll('[data-g]').forEach(b => b.onclick = () => { GSEL = b.dataset.g; renderGuide(); });
  $('guideFav').classList.toggle('on', GFAV); $('guideFav').textContent = `❤️ Mes favoris (${favs.size})`;
  const key = it => it.cat + '|' + it.t;
  const list = G.items.filter(it => (GSEL === 'tout' || it.cat === GSEL) && (!GFAV || favs.has(key(it))) && (!q || norm(it.t + ' ' + it.d + ' ' + (it.tags || []).join(' ')).includes(q)));
  $('guideList').innerHTML = list.map(it => { const k = key(it), tip = !it.budget && (it.tags || []).some(t => ['astuce', 'important'].includes(t));
    return `<article class="gItem ${tip ? 'tip' : ''}"><div class="gTop"><span class="gE">${it.e}</span><div class="gT"><small>${safe(GCAT[it.cat].e + ' ' + GCAT[it.cat].t)}</small><h3>${safe(it.t)}</h3></div>
      ${tip ? '' : `<button type="button" class="favBtn ${favs.has(k) ? 'on' : ''}" data-f="${safe(k)}" aria-pressed="${favs.has(k)}" aria-label="Favori">${favs.has(k) ? '❤️' : '🤍'}</button>`}</div>
      <p>${safe(it.d)}</p>
      <div class="gMeta">${it.budget ? `<span class="gBudget">💶 ${safe(it.budget)}</span>` : ''}${(it.tags || []).map(t => `<span class="tag">${safe(t)}</span>`).join('')}${it.verif ? '<span class="tag warn">à vérifier</span>' : ''}</div>
      <div class="gAct">${it.link ? `<a class="btn small ghost" href="${safe(it.link)}" target="_blank" rel="noopener noreferrer">Voir ↗</a>` : ''}${ME.role === 'admin' && !tip ? `<button type="button" class="btn small" data-push="${safe(k)}">→ Mettre au vote</button>` : ''}</div></article>`; }).join('') || '<p class="hint">Rien ici. Ajoute des favoris avec 🤍.</p>';
  $('guideList').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { favs.has(b.dataset.f) ? favs.delete(b.dataset.f) : favs.add(b.dataset.f); store.set('evg_favs', [...favs]); renderGuide(); });
  $('guideList').querySelectorAll('[data-push]').forEach(b => b.onclick = () => pushToVote(G.items.find(it => key(it) === b.dataset.push)));
}
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
$('guideQ').addEventListener('input', renderGuide);
$('guideFav').onclick = () => { GFAV = !GFAV; renderGuide(); };
// Orga : un élément du guide devient une activité votable (prix = bas de la fourchette « /pers. »)
async function pushToVote(it) {
  const pp = parseFloat(((it.budget || '').match(/\d[\d\s]*/) || ['0'])[0].replace(/\s/g, '')) || 0;
  const perGroup = /en tout|la suite|la nuit|la chambre|maisonnette/.test(it.budget || '');
  const a = { id: norm(it.t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) + '-g', emoji: it.e, nom: it.t, categorie: { reve: 'Insolite & culture', bizarre: 'Insolite & culture', nuit: 'Soirée', action: 'Sport & action', casher: 'Boire & manger', piege: 'Jeux & défis', dodo: 'Autre', shabbat: 'Autre' }[it.cat] || 'Autre',
    duree: '', description: it.d, prix: perGroup ? { type: 'group', prix: pp, capacite: 20 } : { type: 'pp', tiers: [{ min: 1, pp }] }, prixNote: it.budget, source: it.link || '', verifie: false, statut: 'attente' };
  if (!confirm(`Ajouter « ${it.t} » aux activités à voter ?`)) return;
  try { await api('/api/admin?col=activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) }); toast('✅ Ajoutée au vote'); loadActivities().catch(() => {}); } catch (e) { toast('⚠️ ' + e.message); }
}

// ---------- Navigation (une seule app : participants et orgas) ----------
const PAGES = ['accueil', 'guide', 'vote', 'idees', 'defis', 'moi', 'orga'];
let adminLoaded = false;
function route() {
  let p = (location.hash.match(/^#\/?([a-z]+)/) || [])[1] || 'accueil';
  if (!PAGES.includes(p) || (p === 'orga' && ME?.role !== 'admin')) p = 'accueil';
  document.querySelectorAll('.page').forEach(s => s.hidden = s.dataset.page !== p);
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === p));
  $('avatar').classList.toggle('on', p === 'moi');
  document.body.dataset.page = p; scrollTo(0, 0); EVGSec.page(p);
  if (p === 'guide') renderGuide();
  if (p === 'moi') loadDevices();
  if (p === 'orga') { if (!adminLoaded) { adminLoaded = true; const sc = document.createElement('script'); sc.src = 'admin.js'; sc.onload = () => EVGAdmin.start(ME); document.body.appendChild(sc); } else EVGAdmin.refresh(); }
}
window.addEventListener('hashchange', route);
let topT;
function topCountdown() {
  clearInterval(topT); if (!CFG) return;
  const t0 = new Date(CFG.dateFinale || (CFG.deadline + 'T23:59')).getTime();
  const tick = () => { const r = t0 - Date.now(); $('topCd').textContent = r > 0 ? `${CFG.dateFinale ? '✈️' : '⏳'} J-${Math.ceil(r / 864e5)}` : ''; };
  tick(); topT = setInterval(tick, 60000);
}

// ---------- Accueil obligatoire à la 1re connexion : dates, lieu, adresse ----------
const ONB = { step: 0, dispos: {}, lieuOk: '', lieuIdee: '', depart: '', adresse: '', transport: 'peu-importe' };
const lieuCourt = () => (CFG?.lieu || 'Amsterdam').replace(/[^\p{L}\p{N} ]/gu, '').trim();
function onbRender() {
  const st = ONB.step, total = 3; $('onbErr').textContent = '';
  $('onbBar').style.width = ((st + 1) / total * 100) + '%'; $('onbStep').textContent = `${st + 1} / ${total}`;
  $('onbBack').hidden = st === 0; $('onbNext').textContent = st === total - 1 ? 'Valider mes réponses ✅' : 'Continuer →';
  const B = $('onbBody');
  if (st === 0) {
    $('onbKicker').textContent = `Bienvenue ${ME.prenom} 👋`; $('onbTitle').textContent = 'Les dates te vont ?';
    $('onbLead').textContent = "Avant tout, on doit bloquer la date. Dis-nous pour chaque option si tu es dispo (sois honnête, on s'organise avec ça).";
    B.innerHTML = CFG.dateOptions.map(o => `<div class="onbDate"><b>📆 ${safe(o.label)}</b><div class="tri" role="radiogroup" aria-label="${safe(o.label)}">
      ${[['oui', '✅ Dispo'], ['peut-etre', '🤷 Peut-être'], ['non', '❌ Non']].map(([v, l]) => `<button type="button" data-d="${safe(o.id)}" data-v="${v}" role="radio" aria-checked="${ONB.dispos[o.id] === v}" class="${ONB.dispos[o.id] === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>`).join('');
    B.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { ONB.dispos[b.dataset.d] = b.dataset.v; onbRender(); });
  } else if (st === 1) {
    $('onbKicker').textContent = 'Le lieu'; $('onbTitle').textContent = `${lieuCourt()}, ça te va ?`;
    $('onbLead').textContent = '48 h, 100 % casher, 0 % dignité. Bateaux, soirées et pièges pour Elie.';
    B.innerHTML = `<div class="opts">${[['oui', '😍', 'Carrément, go !'], ['autre', '💡', "J'ai une autre idée"], ['non', '👎', 'Pas pour moi']].map(([v, e, l]) => `<button type="button" class="opt ${ONB.lieuOk === v ? 'on' : ''}" data-l="${v}" role="radio" aria-checked="${ONB.lieuOk === v}"><span>${e}</span>${l}</button>`).join('')}</div>
      ${ONB.lieuOk === 'autre' ? `<label>Ton idée de destination<input id="onbIdee" maxlength="120" value="${safe(ONB.lieuIdee)}" placeholder="Ex : Prague, Barcelone…"></label>` : ''}`;
    B.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { ONB.lieuOk = b.dataset.l; onbRender(); if (ONB.lieuOk === 'autre') $('onbIdee').focus(); });
    const i = $('onbIdee'); if (i) i.oninput = () => ONB.lieuIdee = i.value;
  } else {
    $('onbKicker').textContent = 'Dernière question'; $('onbTitle').textContent = "D'où tu pars ?";
    $('onbLead').textContent = 'Pour organiser les trajets, les vols et les regroupements vers la gare ou l\'aéroport.';
    B.innerHTML = `<label>Ville de départ *<input id="onbVille" maxlength="80" autocomplete="address-level2" placeholder="Paris, Lyon, Marseille…" value="${safe(ONB.depart)}"></label>
      <label>Ton adresse <small>(rue et code postal, facultatif)</small><input id="onbAdr" maxlength="160" autocomplete="street-address" placeholder="12 rue …, 75017" value="${safe(ONB.adresse)}"></label>
      <label>Transport préféré<select id="onbTr">${[['peu-importe', 'Peu importe'], ['avion', 'Avion ✈️'], ['train', 'Train 🚄'], ['voiture', 'Voiture 🚗']].map(([v, l]) => `<option value="${v}" ${ONB.transport === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
    $('onbVille').oninput = e => ONB.depart = e.target.value; $('onbAdr').oninput = e => ONB.adresse = e.target.value; $('onbTr').onchange = e => ONB.transport = e.target.value;
  }
  $('onb').scrollTop = 0;
}
async function onbNext() {
  const err = m => { $('onbErr').textContent = '⚠️ ' + m; };
  if (ONB.step === 0 && CFG.dateOptions.some(o => !ONB.dispos[o.id])) return err('Réponds pour chaque date 🙏');
  if (ONB.step === 1 && !ONB.lieuOk) return err('Choisis une réponse.');
  if (ONB.step < 2) { ONB.step++; return onbRender(); }
  if (!ONB.depart.trim()) return err('Indique ta ville de départ.');
  const v = Object.values(ONB.dispos), statut = v.includes('oui') ? 'oui' : v.includes('peut-etre') ? 'peut-etre' : 'non';
  $('onbNext').disabled = true;
  try {
    await postJSON('/api/rsvp', { statut, dispos: ONB.dispos, lieuOk: ONB.lieuOk, lieuIdee: ONB.lieuOk === 'autre' ? ONB.lieuIdee : '', depart: ONB.depart, adresse: ONB.adresse, transport: ONB.transport });
    $('onb').hidden = true; document.body.classList.remove('onbOpen'); HASRSVP = true;
    toast(statut === 'non' ? '😭 Noté. Tu peux changer d\'avis dans Mon espace.' : '🎉 Merci ! Maintenant : vote les activités 🗳️');
    loadMyRsvp(); loadConfig().catch(() => {}); location.hash = statut === 'non' ? '#/accueil' : '#/vote';
  } catch (e) { err(e.message); }
  $('onbNext').disabled = false;
}
$('onbNext').onclick = onbNext;
$('onbBack').onclick = () => { if (ONB.step > 0) { ONB.step--; onbRender(); } };
function maybeOnboard() {
  if (ME.role === 'admin' || HASRSVP !== false || !CFG) return;
  ONB.step = 0; $('onb').hidden = false; document.body.classList.add('onbOpen'); onbRender();
}

// ---------- Démarrage ----------
(async () => {
  let s; try { s = await api('/api/auth'); } catch { location.replace('/login'); return; }
  if (s.me.status !== 'active') { location.replace('/login'); return; }
  ME = { ...s.me, sid: s.sid };
  EVGSec.start(ME, s.security);
  renderAccount(); renderFormules(); route();
  try { await loadConfig(); topCountdown(); } catch { $('intro').textContent = 'Impossible de charger les infos pour le moment, recharge la page.'; }
  loadActivities().catch(() => { AUTHLOAD = false; renderDeck(); }); loadIdeas();
  await loadMyRsvp(); maybeOnboard();   // 1re connexion : dates, lieu, adresse avant tout
})();
