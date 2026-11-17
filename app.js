const S = window.SITE, $ = id => document.getElementById(id);
const safe = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const store = { get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}, set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}} };

$('titre').textContent = S.titre; $('sousTitre').textContent = S.sousTitre;
const m = `🚨 EVG DU DOCTEUR ${S.nom.toUpperCase()} 🚨 ${S.lieu} 🚨 ON NE CHOISIT PAS SES AMIS, ON LES SUBIT 🚨 `;
$('marquee').textContent = m.repeat(6);

const photo = (p, big) => p.fichier
  ? `<img src="photos/${encodeURI(p.fichier)}" alt="${safe(p.legende||S.nom)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ph',innerHTML:'<span>🤡</span>Photo introuvable'}))">`
  : `<div class="ph"><span>${big?'🤓':'🤡'}</span>Photo d'${safe(S.nom.split(' ')[0])}<br>à mettre ici</div>`;
$('heroPhoto').innerHTML = `<div class="frame">${photo(S.photos[0]||{},true)}</div>`;
$('gallery').innerHTML = S.photos.map(p=>`<div class="polaroid"><div class="img">${photo(p)}</div><p>${safe(p.legende)}</p></div>`).join('');
$('diagnostic').innerHTML = S.diagnostic.map(([a,b])=>`<tr><td>${safe(a)}</td><td>${safe(b)}</td></tr>`).join('');
$('programme').innerHTML = S.programme.map(d=>`<div class="day"><b>${safe(d.jour)}</b><h3>${safe(d.titre)}</h3><ul>${d.items.map(i=>`<li>${safe(i)}</li>`).join('')}</ul></div>`).join('');
const tot = S.budget.reduce((a,b)=>a+b.montant,0);
$('budget').innerHTML = S.budget.map(b=>`<div class="row"><span>${safe(b.poste)}</span><span>${b.montant} €</span></div>`).join('')+`<div class="row total"><span>TOTAL</span><span>~${tot} €</span></div>`;
$('participants').innerHTML = S.participants.map(p=>`<div class="person"><b>${safe(p.nom)}</b><small>${safe(p.role)}</small><span class="badge">${safe(p.statut)}</span></div>`).join('');
$('defis').innerHTML = S.defis.map(d=>`<li>🎯 ${safe(d)}</li>`).join('');
$('randDefi').onclick = () => $('defiResult').textContent = '👉 ' + S.defis[Math.random()*S.defis.length|0];

// Votes (locaux)
const votes = store.get('votes',{});
function renderVotes(){
  const max = Math.max(1,...S.activites.map((_,i)=>votes[i]?.n||0));
  $('votes').innerHTML = S.activites.map((a,i)=>{const v=votes[i]||{n:0,me:false};
    return `<div class="vote ${v.me?'on':''}"><button data-i="${i}"><i style="width:${v.n/max*100}%"></i><span>${safe(a)}</span></button><div class="count">${v.n}</div></div>`}).join('');
  document.querySelectorAll('.vote button').forEach(b=>b.onclick=()=>{const i=b.dataset.i;const v=votes[i]||{n:0,me:false};
    v.me?(v.n--,v.me=false):(v.n++,v.me=true);votes[i]=v;store.set('votes',votes);renderVotes()});
}
renderVotes();

// Compte à rebours
const t0 = new Date(S.dateDepart).getTime();
function tick(){const d=Math.max(0,t0-Date.now());const u=[[864e5,'jours'],[36e5,'heures'],[6e4,'min'],[1e3,'sec']];let r=d;
  $('countdown').innerHTML=u.map(([ms,l])=>{const v=Math.floor(r/ms);r-=v*ms;return `<div>${v}<small>${l}</small></div>`}).join('')}
tick();setInterval(tick,1000);

// RSVP via WhatsApp
const wa = S.lienGroupeWhatsApp || (S.whatsapp ? `https://wa.me/${S.whatsapp}` : '');
if(!wa) $('rsvpHint').textContent = "Pas encore de lien WhatsApp configuré : ajoute-le dans data.js.";
$('rsvpBtn').onclick = () => {
  const n = $('rsvpNom').value.trim() || 'Un pote';
  const txt = encodeURIComponent(`${n} sera présent à l'EVG d'${S.nom} à Amsterdam 🍻`);
  if(!wa) return alert("Ajoute whatsapp ou lienGroupeWhatsApp dans data.js");
  window.open(S.whatsapp ? `https://wa.me/${S.whatsapp}?text=${txt}` : wa, '_blank');
};
