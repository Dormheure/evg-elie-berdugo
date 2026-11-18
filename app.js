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
  ? `<canvas class="wmimg" data-src="photos/${big ? '' : 'thumbs/'}${encodeURI(p.fichier)}" role="img" aria-label="${safe(p.legende||S.nom)}"></canvas>`
  : `<div class="ph"><span>${big?'🤓':'🤡'}</span>Photo d'${safe(S.nom.split(' ')[0])}<br>à mettre ici</div>`;
$('heroPhoto').innerHTML = `<div class="frame">${photo({fichier:S.photoPrincipale||S.photos[0]?.fichier||'',legende:S.nom},true)}</div>`;
$('diagnostic').innerHTML = S.diagnostic.map(([a,b])=>`<tr><th scope="row">${safe(a)}</th><td>${safe(b)}</td></tr>`).join('');

// ---------- Session (le middleware garantit qu'on est connecté ; l'API le confirme) ----------
let ME = null, AUTHLOAD = true, HASRSVP = null;   // AUTHLOAD : vrai tant que mes votes ne sont pas chargés
function renderAccount() {
  $('whoName').textContent = ME.prenom; $('orgaBtn').hidden = ME.role !== 'admin';
  $('rsvpWho').textContent = `Tu réponds en tant que ${ME.prenom} ${ME.nom}`;
}
document.querySelector('.devBox').addEventListener('toggle', e => { if (e.target.open) loadDevices(); });
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
  $('planDates').closest('.card').querySelector('h3').textContent = CFG.dateOptions.length === 1 ? '📆 Les dates' : '📆 Les dates proposées';
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

// ---------- Défis du docteur : partagés par tout le groupe (qui a validé, preuve photo, classement) ----------
const LVL = { 1: ['🌶️', 1], 2: ['🌶️🌶️', 2], 3: ['🌶️🌶️🌶️', 3], 4: ['💀', 5], g: ['👥', 3] };
let EXTRA = [], DEFIS = [], DD = {}, BOARD = [], DLVL = 'tous', DPICK = null, DBUSY = false;
function buildDefis() { DEFIS = [...S.defis.map((d, i) => ({ k: 's' + i, n: d.n, t: d.t })), ...EXTRA.map(d => ({ k: 'x' + d.id, n: d.n, t: d.t }))].filter(d => LVL[d.n]); }
const getD = k => DEFIS.find(d => d.k === k);
async function loadDefis() {
  try { const r = await api('/api/defis'); DD = r.done || {}; BOARD = r.board || []; } catch {}
  renderDefis(); drawCard();
}
function renderDefis() {
  const ok = DEFIS.filter(d => DD[d.k]), pts = ok.reduce((a, d) => a + LVL[d.n][1], 0), max = DEFIS.reduce((a, d) => a + LVL[d.n][1], 0);
  $('defiScore').textContent = `${pts} / ${max} pts · ${ok.length}/${DEFIS.length} défis`;
  $('defiBoard').innerHTML = BOARD.length ? `<h3>🏆 Classement des complices</h3><ol>${BOARD.map((b, i) => `<li class="${b.me ? 'me' : ''}"><span class="medal">${['🥇', '🥈', '🥉'][i] || (i + 1)}</span><b>${safe(b.auteur)}</b><span>${b.nb} défi${b.nb > 1 ? 's' : ''}</span><b class="pts">${b.pts} pts</b></li>`).join('')}</ol>` : '<p class="hint">Aucun défi validé pour l\'instant. Le premier qui fait souffrir Elie prend la tête du classement.</p>';
  const lv = [['tous', 'Tous'], ['afaire', 'À faire'], ['1', '🌶️'], ['2', '🌶️🌶️'], ['3', '🌶️🌶️🌶️'], ['4', '💀'], ['g', '👥']];
  $('defiFilter').innerHTML = lv.map(([k, l]) => `<button type="button" class="chipBtn ${k === DLVL ? 'on' : ''}" aria-pressed="${k === DLVL}" data-k="${k}">${l}</button>`).join('');
  $('defiFilter').querySelectorAll('button').forEach(b => b.onclick = () => { DLVL = b.dataset.k; renderDefis(); });
  const show = DEFIS.filter(d => DLVL === 'tous' || (DLVL === 'afaire' ? !DD[d.k] : String(d.n) === DLVL));
  $('defiList').innerHTML = show.map(d => { const x = DD[d.k], p = LVL[d.n][1];
    return `<li class="${x ? 'done' : ''}"><div class="dl"><span class="lv">${LVL[d.n][0]}</span><span class="tx">${safe(d.t)}</span></div>
      <div class="da">${x ? `<span class="by">✅ ${safe(x.auteur)} · +${p}</span>${x.proof ? `<button type="button" class="mini2" data-proof="${safe(x.proof)}" aria-label="Voir la preuve">📸 preuve</button>` : (x.mine ? `<button type="button" class="mini2" data-addproof="${safe(d.k)}">📸 ajouter la preuve</button>` : '')}${x.canUndo ? `<button type="button" class="mini2 ghost" data-undo="${safe(d.k)}">annuler</button>` : ''}`
      : `<button type="button" class="mini2 go" data-ok="${safe(d.k)}">✅ Fait (+${p})</button><button type="button" class="mini2" data-okp="${safe(d.k)}">📸 Fait + preuve</button>`}</div></li>`; }).join('') || '<li class="hint">Rien ici.</li>';
  const L = (sel, fn) => $('defiList').querySelectorAll(sel).forEach(fn);
  L('[data-ok]', b => b.onclick = () => validateDefi(b.dataset.ok, false));
  L('[data-okp]', b => b.onclick = () => validateDefi(b.dataset.okp, true));
  L('[data-undo]', b => b.onclick = () => { if (confirm('Annuler la validation de ce défi ?')) defiPost({ action: 'undo', k: b.dataset.undo }); });
  L('[data-proof]', b => b.onclick = () => openLb(`/api/album?img=${encodeURIComponent(b.dataset.proof)}`, 'Preuve'));
  L('[data-addproof]', b => b.onclick = async () => { const d = getD(b.dataset.addproof); const id = await pickPhoto({ kind: 'proof', defi: d.k, cap: 'Preuve : ' + d.t.slice(0, 90) }); if (id) { await defiPost({ action: 'proof', k: d.k, proof: id }); loadAlbum(); } });
}
async function defiPost(body) { try { await postJSON('/api/defis', body); } catch (e) { toast('⚠️ ' + e.message); } await loadDefis(); }
async function validateDefi(k, withProof) {
  if (DBUSY) return; const d = getD(k); if (!d) return; DBUSY = true;
  try {
    let proof = '';
    if (withProof) { proof = await pickPhoto({ kind: 'proof', defi: k, cap: 'Preuve : ' + d.t.slice(0, 90) }); if (!proof) return; }
    await postJSON('/api/defis', { action: 'done', k, pts: LVL[d.n][1], proof });
    if (DPICK === k) DPICK = null;
    toast(`🔥 +${LVL[d.n][1]} pts pour toi ! ${proof ? '' : 'Ajoute la preuve photo quand tu peux.'}`);
  } catch (e) { toast('⚠️ ' + e.message); }
  finally { DBUSY = false; await loadDefis(); if (withProof) loadAlbum(); }
}
function drawCard() {
  const c = $('defiCard'); if (DPICK === null || !getD(DPICK) || DD[DPICK]) { if (!c.dataset.msg) c.hidden = true; if (DD[DPICK]) DPICK = null; return; }
  const d = getD(DPICK), p = LVL[d.n][1]; c.hidden = false; c.dataset.msg = '';
  c.innerHTML = `<span class="lv">${LVL[d.n][0]}</span><p>${safe(d.t)}</p><div class="row2c"><button type="button" class="btn small" id="dOk">✅ Fait ! (+${p})</button><button type="button" class="btn small" id="dOkP">📸 Fait + preuve</button><button type="button" class="btn small ghost" id="dNext">🔁 Autre défi</button></div>`;
  $('dOk').onclick = () => validateDefi(DPICK, false); $('dOkP').onclick = () => validateDefi(DPICK, true); $('dNext').onclick = pickDefi;
}
function pickDefi() {
  const left = DEFIS.filter(d => !DD[d.k] && (DLVL === 'tous' || DLVL === 'afaire' || String(d.n) === DLVL)).map(d => d.k);
  if (!left.length) { DPICK = null; $('defiCard').hidden = false; $('defiCard').dataset.msg = '1'; $('defiCard').innerHTML = '<p>🏆 Tous les défis de cette catégorie sont faits. Elie est brisé.</p>'; return; }
  let n; do { n = left[Math.random() * left.length | 0]; } while (left.length > 1 && n === DPICK);
  DPICK = n; drawCard(); $('defiCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
$('randDefi').onclick = pickDefi;
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

// ---------- Après ma réponse : lien direct vers le vote ----------
function renderTodo() { $('goVote').hidden = !HASRSVP; }

// ---------- Navigation : le site, ou l'espace orga (réservé aux orgas) ----------
let adminLoaded = false;
function route() {
  const orga = location.hash === '#/orga' && ME?.role === 'admin';
  $('main').hidden = orga; document.querySelector('.orgaPage').hidden = !orga; document.querySelector('.bottomNav').hidden = orga;
  EVGSec.page(orga ? 'orga' : 'site');
  if (!orga) { if (adminLoaded) loadAdminBar(); return; }
  scrollTo(0, 0);
  if (!adminLoaded) { adminLoaded = true; const sc = document.createElement('script'); sc.src = 'admin.js'; sc.onload = () => EVGAdmin.start(ME); document.body.appendChild(sc); } else EVGAdmin.refresh();
}
window.addEventListener('hashchange', route);

// ---------- Accueil obligatoire à la 1re connexion : dates, lieu, adresse ----------
const ONB = { step: 0, dispos: {}, lieuOk: '', lieuIdee: '', depart: '', adresse: '', transport: 'peu-importe' };
const lieuCourt = () => (CFG?.lieu || 'Amsterdam').replace(/[^\p{L}\p{N} ]/gu, '').trim();
function onbRender() {
  const st = ONB.step, total = 3; $('onbErr').textContent = '';
  $('onbBar').style.width = ((st + 1) / total * 100) + '%'; $('onbStep').textContent = `${st + 1} / ${total}`;
  $('onbBack').hidden = st === 0; $('onbNext').textContent = st === total - 1 ? 'Valider mes réponses ✅' : 'Continuer →';
  const B = $('onbBody');
  if (st === 0) {
    const one = CFG.dateOptions.length === 1;
    $('onbKicker').textContent = `Bienvenue ${ME.prenom} 👋`; $('onbTitle').textContent = one ? 'La date te va ?' : 'Les dates te vont ?';
    $('onbLead').textContent = one ? "Avant tout : on part à ces dates. Dis-nous si tu es dispo (sois honnête, on réserve avec ça)." : "Avant tout, on doit bloquer la date. Dis-nous pour chaque option si tu es dispo (sois honnête, on s'organise avec ça).";
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
  if (ONB.step === 0 && CFG.dateOptions.some(o => !ONB.dispos[o.id])) return err(CFG.dateOptions.length === 1 ? 'Dis-nous si la date te va 🙏' : 'Réponds pour chaque date 🙏');
  if (ONB.step === 1 && !ONB.lieuOk) return err('Choisis une réponse.');
  if (ONB.step < 2) { ONB.step++; return onbRender(); }
  if (!ONB.depart.trim()) return err('Indique ta ville de départ.');
  const v = Object.values(ONB.dispos), statut = v.includes('oui') ? 'oui' : v.includes('peut-etre') ? 'peut-etre' : 'non';
  $('onbNext').disabled = true;
  try {
    await postJSON('/api/rsvp', { statut, dispos: ONB.dispos, lieuOk: ONB.lieuOk, lieuIdee: ONB.lieuOk === 'autre' ? ONB.lieuIdee : '', depart: ONB.depart, adresse: ONB.adresse, transport: ONB.transport });
    $('onb').hidden = true; document.body.classList.remove('onbOpen'); HASRSVP = true;
    toast(statut === 'non' ? '😭 Noté. Tu peux changer d\'avis dans Mon espace.' : '🎉 Merci ! Maintenant : vote les activités 🗳️');
    loadMyRsvp(); loadConfig().catch(() => {}); setTimeout(() => $(statut === 'non' ? 'compte' : 'activites').scrollIntoView({ behavior: 'smooth' }), 100);
  } catch (e) { err(e.message); }
  $('onbNext').disabled = false;
}
$('onbNext').onclick = onbNext;
$('onbBack').onclick = () => { if (ONB.step > 0) { ONB.step--; onbRender(); } };
function maybeOnboard() {
  if (ME.role === 'admin' || HASRSVP !== false || !CFG) return;
  ONB.step = 0; $('onb').hidden = false; document.body.classList.add('onbOpen'); onbRender();
}

// ---------- Barre orga sur la page : valider les comptes sans quitter le site (orgas uniquement) ----------
async function loadAdminBar() {
  if (ME.role !== 'admin' || document.hidden) return;
  let ms, rs;
  try { [ms, rs] = await Promise.all([api('/api/admin?col=members'), api('/api/admin?col=rsvps')]); } catch { return; }
  const now = Date.now(), pend = ms.filter(m => m.status === 'pending'), part = ms.filter(m => m.role !== 'admin');
  const online = ms.filter(m => m.sessions.some(x => now - new Date(x.lastSeen) < 5 * 6e4)).length;
  const el = $('adminBar'); el.hidden = false;
  el.innerHTML = `<div class="abHead"><b>🛡️ Mode orga</b>${pend.length ? `<button type="button" class="mini good" id="abAll">✅ Tout valider (${pend.length})</button>` : ''}<a href="#/orga" class="mini">Espace orga →</a></div>
    <div class="abStats"><span class="${pend.length ? 'hot' : ''}">⏳ ${pend.length} à valider</span><span>👥 ${part.length} comptes</span><span>🟢 ${online} en ligne</span><span>📝 ${rs.length} réponses</span><span>🎉 ${rs.filter(r => r.statut === 'oui').length} viennent</span></div>
    ${pend.length ? `<div class="abList">${pend.map(m => { const x = m.sessions[0] || {}; return `<div class="abRow"><div><b>${safe(m.prenom)} ${safe(m.nom)}</b><small>${safe([x.label, [x.city, x.country].filter(Boolean).join(', ')].filter(Boolean).join(' · '))} · ${ago(m.createdAt)}</small></div>
      <button type="button" class="mini good" data-ab="approve|${safe(m.id)}">✅ Valider</button><button type="button" class="mini danger" data-ab="block|${safe(m.id)}">🚷 Refuser</button></div>`; }).join('')}</div>` : ''}`;
  const act = async (op, id) => { await api('/api/admin?col=members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op, id }) }); };
  el.querySelectorAll('[data-ab]').forEach(b => b.onclick = async () => { const [op, id] = b.dataset.ab.split('|'); if (op === 'block' && !confirm('Refuser et bloquer ce compte ?')) return; b.disabled = true; try { await act(op, id); toast(op === 'approve' ? '✅ Validé' : '🚷 Refusé'); } catch (e) { toast('⚠️ ' + e.message); } loadAdminBar(); });
  const all = $('abAll'); if (all) all.onclick = async () => { all.disabled = true; for (const m of pend) { try { await act('approve', m.id); } catch {} } toast(`✅ ${pend.length} compte(s) validé(s)`); loadAdminBar(); };
}
setInterval(loadAdminBar, 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) loadAdminBar(); });

// ---------- Démarrage ----------
(async () => {
  let s; try { s = await api('/api/auth'); } catch { location.replace('/login'); return; }
  if (s.me.status !== 'active') { location.replace('/login'); return; }
  ME = { ...s.me, sid: s.sid };
  EVGSec.start(ME, s.security);
  stampPhotos(); loadAlbum(); loadDefis(); setInterval(() => { if (!document.hidden) { loadDefis(); } }, 20000); a2hsHint();
  renderAccount(); route(); loadAdminBar();
  try { await loadConfig(); } catch { $('intro').textContent = 'Impossible de charger les infos pour le moment, recharge la page.'; }
  loadActivities().catch(() => { AUTHLOAD = false; renderDeck(); }); loadIdeas();
  await loadMyRsvp(); maybeOnboard();   // 1re connexion : dates, lieu, adresse avant tout
})();

// ---------- Photos tatouées : dessinées avec le nom de la personne connectée (aucune image brute dans la page) ----------
// Les fichiers ne se chargent qu'avec l'en-tête du site : ouvrir l'adresse d'une photo dans un onglet est refusé.
const IMGS = new Map();   // photos déjà téléchargées pendant la visite (changer de filtre ne retélécharge rien)
function loadImg(url) {
  if (IMGS.has(url)) return IMGS.get(url);
  const p = (async () => {
    const r = await fetch(url, { headers: { 'x-evg': '1' } }); if (!r.ok) throw new Error('photo');
    const u = URL.createObjectURL(await r.blob());
    return new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = ko; im.src = u; });
  })();
  IMGS.set(url, p); p.catch(() => IMGS.delete(url)); return p;
}
function paint(c, im, fit = 'cover') {
  const d = Math.min(devicePixelRatio || 1, 2), W = Math.max(1, c.clientWidth) * d;
  const H = fit === 'contain' ? Math.round(W * im.naturalHeight / im.naturalWidth) : Math.max(1, c.clientHeight) * d;
  c.width = W; c.height = H; const x = c.getContext('2d');
  const r = Math.max(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * r, h = im.naturalHeight * r;
  x.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
  if (!ME) return;
  const who = `${ME.prenom} ${ME.nom}`.toUpperCase(), day = new Date().toLocaleDateString('fr-FR');
  x.save(); x.translate(W / 2, H / 2); x.rotate(-0.5); x.textAlign = 'center';
  const fs = Math.max(11, Math.min(W, H) / 13); x.font = `800 ${fs}px Inter, sans-serif`; x.lineWidth = Math.max(1, fs / 9);
  const n = Math.ceil(Math.max(W, H) / (fs * 2.6)) + 2;
  for (let k = -n; k <= n; k++) { const y = k * fs * 2.6, t = k % 2 ? `${day} · CONFIDENTIEL` : who;
    x.strokeStyle = 'rgba(0,0,0,.28)'; x.strokeText(t, 0, y); x.fillStyle = 'rgba(255,255,255,.42)'; x.fillText(t, 0, y); }
  x.restore();
}
let IO = null;
function stampPhotos() {
  if (!ME) return;
  const draw = c => { if (c.dataset.done) return; c.dataset.done = '1'; loadImg(c.dataset.src).then(im => paint(c, im)).catch(() => { c.dataset.done = ''; }); };
  const cs = [...document.querySelectorAll('canvas.wmimg:not([data-done])')];
  if (!('IntersectionObserver' in window)) return cs.forEach(draw);
  IO = IO || new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { IO.unobserve(e.target); draw(e.target); } }), { rootMargin: '400px' });
  cs.forEach(c => IO.observe(c));
}

// ---------- Album : vos photos d'Elie + preuves de défis ----------
let ALBUM = [], GF = 'toutes';
async function loadAlbum() { try { ALBUM = (await api('/api/album')).photos || []; } catch {} renderGallery(); }
function renderGallery() {
  const base = S.photos.filter(p => p.fichier).map(p => ({ src: 'photos/thumbs/' + encodeURI(p.fichier), full: 'photos/' + encodeURI(p.fichier), cap: p.legende, kind: 'base' }));
  const mine = ALBUM.map(p => ({ id: p.id, src: `/api/album?img=${p.id}&s=t`, full: `/api/album?img=${p.id}`, cap: p.legende, by: p.auteur, kind: p.kind, del: p.canDelete }));
  const nP = mine.filter(p => p.kind === 'proof').length, nA = mine.filter(p => p.kind === 'album').length;
  const tabs = [['toutes', `Toutes (${base.length + mine.length})`], ['vous', `Ajoutées par vous (${nA})`], ['preuves', `Preuves de défis (${nP})`]];
  $('galFilter').innerHTML = tabs.map(([k, l]) => `<button type="button" class="chipBtn ${k === GF ? 'on' : ''}" aria-pressed="${k === GF}" data-g="${k}">${l}</button>`).join('');
  $('galFilter').querySelectorAll('button').forEach(b => b.onclick = () => { GF = b.dataset.g; renderGallery(); });
  const list = GF === 'vous' ? mine.filter(p => p.kind === 'album') : GF === 'preuves' ? mine.filter(p => p.kind === 'proof') : [...mine, ...base];
  $('gallery').innerHTML = list.map((p, i) => `<figure class="polaroid ${p.kind !== 'base' ? 'user' : ''}"><button type="button" class="img" data-i="${i}" aria-label="Agrandir : ${safe(p.cap || 'photo')}"><canvas class="wmimg" data-src="${safe(p.src)}" role="img" aria-label="${safe(p.cap || 'photo d\'Elie')}"></canvas></button>
    <figcaption>${safe(p.cap || '')}${p.by ? `<small>${p.kind === 'proof' ? '🎯' : '📸'} ${safe(p.by)}</small>` : ''}${p.del ? `<button type="button" class="delPh" data-del="${safe(p.id)}" aria-label="Supprimer cette photo">🗑</button>` : ''}</figcaption></figure>`).join('')
    || '<p class="hint">Rien ici pour l\'instant. Lance-toi !</p>';
  $('gallery').querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const p = list[+b.dataset.i]; openLb(p.full, p.cap); });
  $('gallery').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (!confirm('Supprimer cette photo ?')) return; try { await postJSON('/api/album', { action: 'delete', id: b.dataset.del }); } catch (e) { toast('⚠️ ' + e.message); } loadAlbum(); });
  stampPhotos();
}

// ---------- Visionneuse plein écran (tatouée elle aussi) ----------
async function openLb(url, cap) {
  $('lb').hidden = false; document.body.classList.add('noscroll'); $('lbCap').textContent = cap || ''; const c = $('lbCanvas'); c.width = 1; c.height = 1;
  try { const im = await loadImg(url); if (!$('lb').hidden) paint(c, im, 'contain'); } catch { $('lbCap').textContent = 'Photo indisponible.'; }
}
const closeLb = () => { $('lb').hidden = true; document.body.classList.remove('noscroll'); };
$('lb').addEventListener('click', e => { if (e.target.id !== 'lbCanvas') closeLb(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLb(); } });

// ---------- Envoi d'une photo : réduite sur le téléphone (~200 Ko), aperçu, légende ----------
function pickPhoto({ kind = 'album', defi = '', cap = '' } = {}) {
  return new Promise(resolve => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    let picked = false; EVGSec.quiet(10 * 60e3);
    const back = () => setTimeout(() => { if (!picked) { EVGSec.quiet(1500); resolve(null); } }, 1500);
    window.addEventListener('focus', back, { once: true }); inp.addEventListener('cancel', () => { EVGSec.quiet(1500); resolve(null); });
    inp.onchange = async () => {
      picked = true; EVGSec.quiet(4000); const f = inp.files && inp.files[0]; if (!f) return resolve(null);
      let bmp; try { bmp = await createImageBitmap(f); } catch { try { const u = URL.createObjectURL(f); bmp = await new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = ko; im.src = u; }); } catch { toast('⚠️ Photo illisible (essaie une autre).'); return resolve(null); } }
      const enc = (max, q) => { const r = Math.min(1, max / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas'); c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); return { url: c.toDataURL('image/jpeg', q), w: c.width, h: c.height, c }; };
      let full = enc(1600, .82); if (full.url.length > 1000000) full = enc(1280, .72); if (full.url.length > 1000000) full = enc(1024, .65);
      const thumb = enc(480, .72);
      // aperçu + légende
      $('up').hidden = false; document.body.classList.add('noscroll'); $('upTitle').textContent = kind === 'proof' ? '🎯 Ta preuve' : '📸 Ta photo d\'Elie'; $('upCap').value = cap; $('upMsg').textContent = '';
      const pv = $('upPreview'), r = Math.min(1, 600 / full.w); pv.width = full.w * r; pv.height = full.h * r; pv.getContext('2d').drawImage(full.c, 0, 0, pv.width, pv.height);
      const done = id => { $('up').hidden = true; document.body.classList.remove('noscroll'); $('upForm').onsubmit = null; resolve(id); };
      $('upCancel').onclick = () => done(null);
      $('upForm').onsubmit = async e => {
        e.preventDefault(); $('upSend').disabled = true; $('upMsg').className = 'formMsg'; $('upMsg').textContent = 'Envoi…';
        try { const res = await postJSON('/api/album', { action: 'add', full: full.url, thumb: thumb.url, legende: $('upCap').value, kind, defi, w: full.w, h: full.h }); toast(kind === 'proof' ? '📸 Preuve envoyée !' : '📸 Photo ajoutée à la galerie !'); done(res.id); if (kind === 'album') { GF = 'vous'; loadAlbum(); } }
        catch (err) { $('upMsg').className = 'formMsg err'; $('upMsg').textContent = '⚠️ ' + err.message; }
        $('upSend').disabled = false;
      };
    };
    inp.click();
  });
}
$('addPhoto').onclick = () => pickPhoto({ kind: 'album' });

// ---------- iPhone : proposer de l'installer sur l'écran d'accueil (une seule fois) ----------
function a2hsHint() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent), standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  if (!ios || standalone || store.get('evg_a2hs', false)) return;
  setTimeout(() => { $('a2hs').hidden = false; }, 5000);
  $('a2hsOk').onclick = () => { $('a2hs').hidden = true; store.set('evg_a2hs', true); };
}
