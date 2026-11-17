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
$('marquee').textContent = `🚨 EVG DU DOCTEUR ${S.nom.toUpperCase()} 🚨 AMSTERDAM 🚨 ON NE CHOISIT PAS SES AMIS, ON LES SUBIT 🚨 `.repeat(6);
const photo = (p, big) => p.fichier
  ? `<img src="photos/${encodeURI(p.fichier)}" alt="${safe(p.legende||S.nom)}" ${big?'fetchpriority="high"':'loading="lazy"'} decoding="async">`
  : `<div class="ph"><span>${big?'🤓':'🤡'}</span>Photo d'${safe(S.nom.split(' ')[0])}<br>à mettre ici</div>`;
$('heroPhoto').innerHTML = `<div class="frame">${photo({fichier:S.photoPrincipale||S.photos[0]?.fichier||'',legende:S.nom},true)}</div>`;
$('gallery').innerHTML = S.photos.map(p=>`<figure class="polaroid"><div class="img">${photo(p)}</div><figcaption>${safe(p.legende)}</figcaption></figure>`).join('');
$('diagnostic').innerHTML = S.diagnostic.map(([a,b])=>`<tr><th scope="row">${safe(a)}</th><td>${safe(b)}</td></tr>`).join('');
$('defis').innerHTML = S.defis.map(d=>`<li>🎯 ${safe(d)}</li>`).join('');
$('randDefi').onclick = () => $('defiResult').textContent = '👉 ' + S.defis[Math.random()*S.defis.length|0];

// ---------- Identité partagée (formulaire + votes) ----------
const me = store.get('evg_me', { prenom: '', nom: '' });
for (const c of ['prenom', 'nom']) {
  const inputs = [...document.querySelectorAll('.idn-' + c)];
  inputs.forEach(i => { i.value = me[c] || '';
    i.addEventListener('input', () => { me[c] = i.value; store.set('evg_me', me); inputs.forEach(o => { if (o !== i) o.value = i.value; }); });
    // autre personne : on oublie tout de suite les votes de la précédente (sinon un clic rapide les "annule")
    i.addEventListener('change', () => { MINE = {}; if (ACTS.length) renderActivities(); if (me.prenom && me.nom) loadActivities().catch(() => {}); }); });
}

// ---------- Config (dates, lieu, budget…) ----------
let CFG = null, VENUS = [], cdTimer;
const fmtDate = d => new Date(d + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
async function loadConfig() {
  const d = await api('/api/config'); CFG = d.config; VENUS = d.venus;
  $('intro').textContent = CFG.intro;
  $('planDates').innerHTML = CFG.dateOptions.map(o => `<li>${safe(o.label)}</li>`).join('');
  $('planLieu').textContent = CFG.lieu; $('lieuNom').textContent = '(' + CFG.lieu.replace(/[^\p{L}\p{N} ]/gu, '').trim() + ')';
  $('planBudget').innerHTML = CFG.budget.map(b => `<div class="row"><span>${safe(b.poste)}</span><span>${b.montant} €</span></div>`).join('') + `<div class="row total"><span>TOTAL</span><span>~${budgetTotal()} €</span></div>`;
  $('budgetTotal').textContent = '~' + budgetTotal() + ' €';
  if (!$('formDates').dataset.ready || $('formDates').dataset.sig !== CFG.dateOptions.map(o => o.id + o.label).join('|')) {
    $('formDates').dataset.ready = 1; $('formDates').dataset.sig = CFG.dateOptions.map(o => o.id + o.label).join('|');
    $('formDates').innerHTML = CFG.dateOptions.map(o => `<div class="dateRow" role="radiogroup" aria-label="${safe(o.label)}"><b>${safe(o.label)}</b><div class="seg small">
      ${[['oui','✅ Dispo'],['peut-etre','🤷 Peut-être'],['non','❌ Non']].map(([v,l]) => `<label><input type="radio" name="d_${safe(o.id)}" value="${v}"><span>${l}</span></label>`).join('')}</div></div>`).join('');
    syncRequired(); prefillForm();
  }
  $('programme').innerHTML = CFG.programme.map(day => `<div class="day"><b>${safe(day.jour)}</b><h3>${safe(day.titre)}</h3><ul>${day.items.map(i => `<li>${safe(i)}</li>`).join('')}</ul></div>`).join('');
  $('participants').innerHTML = VENUS.length ? VENUS.map(n => `<div class="person"><b>${safe(n)}</b><span class="badge">confirmé ✅</span></div>`).join('') : '<p class="hint">Personne n\'a encore confirmé… soyez le premier !</p>';
  $('nbVenus').textContent = VENUS.length + ' confirmé' + (VENUS.length > 1 ? 's' : '');
  const closed = !CFG.dateFinale && CFG.deadline && Date.now() > new Date(CFG.deadline + 'T23:59').getTime();
  $('countLabel').textContent = CFG.dateFinale ? 'Départ dans…' : closed ? 'La date limite est passée, mais écris-nous vite !' : 'Fin des réponses dans…';
  $('deadlineTxt').textContent = !CFG.dateFinale && CFG.deadline && !closed ? `(réponse attendue avant le ${fmtDate(CFG.deadline)})` : '';
  clearInterval(cdTimer);
  if (closed) $('countdown').innerHTML = ''; else startCountdown(new Date(CFG.dateFinale || (CFG.deadline + 'T23:59')).getTime());
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
function prefillForm() { // retrouve la dernière réponse envoyée depuis cet appareil
  const last = store.get('evg_form', null); if (!last) return;
  for (const [k, v] of Object.entries(last)) {
    const els = form.querySelectorAll(`[name="${k}"]`); if (!els.length) continue;
    if (els[0].type === 'radio') els.forEach(el => el.checked = el.value === v); else if (!els[0].classList.contains('idn-prenom') && !els[0].classList.contains('idn-nom')) els[0].value = v;
  }
  syncRequired();
}
form.addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(form), body = Object.fromEntries(f.entries());
  body.dispos = {}; CFG.dateOptions.forEach(o => body.dispos[o.id] = f.get('d_' + o.id) || 'non');
  const btn = $('rsvpBtn'), msg = $('rsvpMsg'); btn.disabled = true; msg.className = 'formMsg'; msg.textContent = 'Envoi…';
  try {
    const r = await postJSON('/api/rsvp', body);
    store.set('evg_form', Object.fromEntries([...f.entries()]));
    msg.className = 'formMsg ok'; msg.textContent = r.modifie ? '✅ Réponse mise à jour, merci !' : '✅ Réponse enregistrée, merci !';
    $('goVote').hidden = false; loadConfig().catch(() => {});
  } catch (err) { msg.className = 'formMsg err'; msg.textContent = '⚠️ ' + err.message; }
  btn.disabled = false;
});

// ---------- Activités : votes + podium + jauge ----------
let ACTS = [], MINE = {}, ACFG = {}, NB = 8, NBVOTANTS = 0, CAT = 'Toutes', nbTouched = false;
let seq = 0, pending = 0, queue = Promise.resolve();
async function loadActivities() {
  const mine = ++seq;
  const q = me.prenom && me.nom ? `?prenom=${encodeURIComponent(me.prenom)}&nom=${encodeURIComponent(me.nom)}` : '';
  const d = await api('/api/activities' + q);
  if (mine !== seq || pending) return; // réponse périmée ou votes en cours d'envoi : on ne touche à rien
  ACTS = d.activities; MINE = d.mesVotes || {}; ACFG = d.config; NBVOTANTS = d.nbVotants;
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
    $('podium').innerHTML = `<h3>🏆 Le podium</h3><p class="hint light">Aucun vote pour l'instant. Vote 😍 sur les activités qui te tentent : les ${N} plus plébiscitées formeront le podium, avec le prix par personne.</p>`;
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
}
async function vote(id, v) {
  if (!me.prenom.trim() || !me.nom.trim()) { toast('Entre ton prénom et ton nom (en haut de la section) avant de voter 🙂'); document.querySelector(`#activites .idn-${me.prenom.trim() ? 'nom' : 'prenom'}`).focus(); return; }
  const a = ACTS.find(x => x.id === id), prev = MINE[id], next = prev === v ? null : v;
  // mise à jour immédiate (optimiste), annulée si le serveur refuse
  if (a.counts) { if (prev) a.counts[prev]--; if (next) a.counts[next]++; }
  if (next) MINE[id] = next; else delete MINE[id];
  renderActivities();
  // envois l'un après l'autre (évite que deux votes rapides s'écrasent), rechargement une fois tout envoyé
  pending++;
  queue = queue.then(() => postJSON('/api/activities', { prenom: me.prenom, nom: me.nom, votes: { [id]: next } }))
    .catch(e => toast('⚠️ ' + e.message))
    .finally(() => { if (--pending === 0) loadActivities().catch(() => {}); });
}

loadConfig().catch(() => { $('intro').textContent = 'Impossible de charger les infos pour le moment, recharge la page.'; });
loadActivities().catch(() => { $('actGrid').innerHTML = '<p class="hint">Activités indisponibles pour le moment, recharge la page.</p>'; });
