const S = window.SITE, P = window.EVGPrice, $ = id => document.getElementById(id);
const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const euro = n => (Math.round(n * 10) / 10).toLocaleString('fr-FR') + ' €';
const store = { get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}, set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}} };
const api = async (url, opts) => { const r = await fetch(url, opts); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Erreur'); return j; };

// ---------- Contenu statique (data.js) ----------
$('titre').textContent = S.titre; $('sousTitre').textContent = S.sousTitre;
$('marquee').textContent = `🚨 EVG DU DOCTEUR ${S.nom.toUpperCase()} 🚨 AMSTERDAM 🚨 ON NE CHOISIT PAS SES AMIS, ON LES SUBIT 🚨 `.repeat(6);
const photo = (p, big) => p.fichier
  ? `<img src="photos/${encodeURI(p.fichier)}" alt="${safe(p.legende||S.nom)}" loading="lazy">`
  : `<div class="ph"><span>${big?'🤓':'🤡'}</span>Photo d'${safe(S.nom.split(' ')[0])}<br>à mettre ici</div>`;
$('heroPhoto').innerHTML = `<div class="frame">${photo({fichier:S.photoPrincipale||S.photos[0]?.fichier||'',legende:S.nom},true)}</div>`;
$('gallery').innerHTML = S.photos.map(p=>`<div class="polaroid"><div class="img">${photo(p)}</div><p>${safe(p.legende)}</p></div>`).join('');
$('diagnostic').innerHTML = S.diagnostic.map(([a,b])=>`<tr><td>${safe(a)}</td><td>${safe(b)}</td></tr>`).join('');
$('defis').innerHTML = S.defis.map(d=>`<li>🎯 ${safe(d)}</li>`).join('');
$('randDefi').onclick = () => $('defiResult').textContent = '👉 ' + S.defis[Math.random()*S.defis.length|0];

// ---------- Identité partagée (formulaire + votes) ----------
const me = store.get('evg_me', { prenom: '', nom: '' });
const idInputs = c => [...document.querySelectorAll('.idn-' + c)];
for (const c of ['prenom', 'nom']) {
  idInputs(c).forEach(i => { i.value = me[c] || ''; i.addEventListener('input', () => {
    me[c] = i.value; store.set('evg_me', me); idInputs(c).forEach(o => { if (o !== i) o.value = i.value; });
  }); i.addEventListener('change', () => loadActivities()); });
}

// ---------- Config (dates, lieu, budget…) ----------
let CFG = null, VENUS = [];
async function loadConfig() {
  const d = await api('/api/config'); CFG = d.config; VENUS = d.venus;
  $('intro').textContent = CFG.intro;
  $('planDates').innerHTML = CFG.dateOptions.map(o => `<li>${safe(o.label)}</li>`).join('');
  $('planLieu').textContent = CFG.lieu; $('lieuNom').textContent = '(' + CFG.lieu.replace(/[^\p{L}\p{N} ]/gu, '').trim() + ')';
  const tot = CFG.budget.reduce((a, b) => a + b.montant, 0);
  $('planBudget').innerHTML = CFG.budget.map(b => `<div class="row"><span>${safe(b.poste)}</span><span>${b.montant} €</span></div>`).join('') + `<div class="row total"><span>TOTAL</span><span>~${tot} €</span></div>`;
  $('budgetTotal').textContent = '~' + tot + ' €';
  $('formDates').innerHTML = CFG.dateOptions.map(o => `<div class="dateRow"><b>${safe(o.label)}</b><div class="seg small">
    ${[['oui','✅ Dispo'],['peut-etre','🤷 Peut-être'],['non','❌ Non']].map(([v,l]) => `<label><input type="radio" name="d_${safe(o.id)}" value="${v}" ${v==='non'?'checked':''}><span>${l}</span></label>`).join('')}</div></div>`).join('');
  $('programme').innerHTML = CFG.programme.map(d => `<div class="day"><b>${safe(d.jour)}</b><h3>${safe(d.titre)}</h3><ul>${d.items.map(i => `<li>${safe(i)}</li>`).join('')}</ul></div>`).join('');
  $('participants').innerHTML = VENUS.length ? VENUS.map(n => `<div class="person"><b>${safe(n)}</b><span class="badge">confirmé ✅</span></div>`).join('') : '<p class="hint">Personne n\'a encore confirmé… soyez le premier !</p>';
  $('nbVenus').textContent = VENUS.length + ' confirmé' + (VENUS.length > 1 ? 's' : '');
  const target = CFG.dateFinale || CFG.deadline;
  $('countLabel').textContent = CFG.dateFinale ? "Départ dans…" : "Fin des réponses dans…";
  startCountdown(new Date(CFG.dateFinale || (CFG.deadline + 'T23:59')).getTime());
}
function startCountdown(t0) {
  const tick = () => { let r = Math.max(0, t0 - Date.now());
    $('countdown').innerHTML = [[864e5,'jours'],[36e5,'heures'],[6e4,'min'],[1e3,'sec']].map(([ms,l]) => { const v = Math.floor(r/ms); r -= v*ms; return `<div>${v}<small>${l}</small></div>`; }).join(''); };
  tick(); setInterval(tick, 1000);
}

// ---------- Formulaire de réponse ----------
$('rsvpForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target), body = Object.fromEntries(f.entries());
  body.dispos = {}; CFG.dateOptions.forEach(o => body.dispos[o.id] = f.get('d_' + o.id) || 'non');
  const btn = $('rsvpBtn'), msg = $('rsvpMsg'); btn.disabled = true; msg.className = 'formMsg'; msg.textContent = 'Envoi…';
  try {
    const r = await api('/api/rsvp', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    msg.className = 'formMsg ok'; msg.textContent = r.modifie ? '✅ Réponse mise à jour, merci !' : '✅ Réponse enregistrée, merci ! Passe voter les activités plus bas 👇';
    loadConfig();
  } catch (err) { msg.className = 'formMsg err'; msg.textContent = '⚠️ ' + err.message; }
  btn.disabled = false;
});

// ---------- Activités : votes + podium + jauge ----------
let ACTS = [], MINE = {}, ACFG = {}, NB = 8, NBVOTANTS = 0, CAT = 'Toutes', nbTouched = false;
async function loadActivities() {
  const q = me.prenom ? `?prenom=${encodeURIComponent(me.prenom)}&nom=${encodeURIComponent(me.nom || '')}` : '';
  const d = await api('/api/activities' + q);
  ACTS = d.activities; MINE = d.mesVotes || {}; ACFG = d.config; NBVOTANTS = d.nbVotants;
  if (!nbTouched) NB = Math.max(4, d.nbParticipants);
  renderActivities();
}
function renderActivities() {
  const ranked = P.rank(ACTS), N = ACFG.nbActivites, top = ranked.slice(0, N);
  const refused = ACTS.filter(a => a.statut === 'refusee');
  const cats = ['Toutes', ...new Set(ACTS.map(a => a.categorie))];
  $('catFilter').innerHTML = cats.map(c => `<button type="button" class="chipBtn ${c===CAT?'on':''}" data-c="${safe(c)}">${safe(c)}</button>`).join('');
  $('catFilter').querySelectorAll('button').forEach(b => b.onclick = () => { CAT = b.dataset.c; renderActivities(); });
  $('voteProgress').textContent = `${Object.keys(MINE).length}/${ACTS.length} votées · ${NBVOTANTS} votant${NBVOTANTS>1?'s':''}`;

  // Podium
  const est = P.estimate(top, NB, ACFG.inviterMarie), T = ACFG.budgetActivites || 100;
  const max = Math.max(T * 2, est.parPayeur * 1.15), pct = v => Math.min(100, v / max * 100);
  const zone = est.parPayeur <= T ? 'ok' : est.parPayeur <= T * 1.5 ? 'mid' : 'bad';
  $('podium').innerHTML = `
    <h3>🏆 Le podium : top ${N} des activités</h3>
    <div class="podiumList">${top.map((a, i) => `<div class="podItem ${a.statut==='validee'?'valid':''}"><span class="rk">${i+1}</span><span class="em">${safe(a.emoji)}</span>
      <div class="pn"><b>${safe(a.nom)}</b><small>${a.statut==='validee'?'✅ validée par les orgas · ':''}😍 ${a.counts?.oui||0} · 🙅 ${a.counts?.non||0}</small></div>
      <span class="pp">${euro(P.pp(a, NB))}<small>/pers.</small></span></div>`).join('') || '<p class="hint">Pas encore de votes : à vous de jouer !</p>'}</div>
    <div class="nbRow"><label>Nombre de participants : <b id="nbVal">${NB}</b> <small>(Elie compris)</small></label>
      <input type="range" id="nbRange" min="4" max="25" value="${NB}"></div>
    <div class="gauge"><div class="gaugeBar"><i class="z-ok" style="width:${pct(T)}%"></i><i class="z-mid" style="width:${pct(T*1.5)-pct(T)}%"></i><i class="z-bad" style="width:${100-pct(T*1.5)}%"></i>
      <span class="mark" style="left:${pct(est.parPayeur)}%"></span></div>
      <div class="gaugeLbl"><span>0 €</span><span>cible ${euro(T)}</span><span>${euro(max)}</span></div></div>
    <div class="est ${zone}"><b>≈ ${euro(est.parPayeur)} / pers.</b> pour les ${top.length} activités
      <small>Total groupe ${euro(est.total)} · réparti sur ${est.payeurs} personnes${ACFG.inviterMarie ? " (on invite Elie 🎁)" : ''} · le tarif change selon le nombre de participants</small></div>`;
  $('nbRange').oninput = e => { NB = +e.target.value; nbTouched = true; renderActivities(); };

  // Grille de vote
  const rankOf = Object.fromEntries(ranked.map((a, i) => [a.id, i + 1]));
  const list = (CAT === 'Toutes' ? ranked.concat(refused) : ranked.concat(refused).filter(a => a.categorie === CAT));
  $('actGrid').innerHTML = list.map(a => { const v = MINE[a.id], c = a.counts || {oui:0, non:0}, r = rankOf[a.id];
    return `<article class="act ${a.statut==='refusee'?'refused':''} ${r&&r<=N?'intop':''}">
      ${r && r <= N ? `<span class="topTag">#${r}</span>` : ''}${a.statut==='validee'?'<span class="validTag">✅ validée</span>':''}${a.statut==='refusee'?'<span class="validTag no">⛔ écartée</span>':''}
      <div class="aem">${safe(a.emoji)}</div><h4>${safe(a.nom)}</h4><span class="cat">${safe(a.categorie)} · ${safe(a.duree||'')}</span>
      <p>${safe(a.description)}</p>
      <div class="price"><b>${euro(P.pp(a, NB))}</b>/pers. à ${NB}<small>${safe(P.bareme(a))}${a.prixNote ? ' · ' + safe(a.prixNote) : ''}${a.verifie === false ? ' · prix estimé' : ''}</small></div>
      <div class="votes"><button type="button" class="vy ${v==='oui'?'on':''}" data-id="${safe(a.id)}" data-v="oui">😍 Grave <i>${c.oui}</i></button><button type="button" class="vn ${v==='non'?'on':''}" data-id="${safe(a.id)}" data-v="non">🙅 Bof <i>${c.non}</i></button></div></article>`; }).join('');
  $('actGrid').querySelectorAll('.votes button').forEach(b => b.onclick = () => vote(b.dataset.id, b.dataset.v));
}
async function vote(id, v) {
  if (!me.prenom.trim()) { alert('Entre ton prénom (en haut de la section) avant de voter 🙂'); document.querySelector('#activites .idn-prenom').focus(); return; }
  const next = MINE[id] === v ? null : v;
  try {
    await api('/api/activities', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ prenom: me.prenom, nom: me.nom, votes: { [id]: next } }) });
    await loadActivities();
  } catch (e) { alert(e.message); }
}

loadConfig().catch(() => { $('intro').textContent = 'Impossible de charger les infos pour le moment, recharge la page.'; });
loadActivities().catch(() => { $('actGrid').innerHTML = '<p class="hint">Activités indisponibles pour le moment.</p>'; });
