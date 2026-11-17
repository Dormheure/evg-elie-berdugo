const P = window.EVGPrice, $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const euro = n => (Math.round(n * 10) / 10).toLocaleString('fr-FR') + ' €';
const ADMINS = { david: 'David', alon: 'Alon', raphael: 'Raphaël' };
let ME = null, TAB = 'reponses', CACHE = {};
const TABS = [['reponses','📥 Réponses'],['activites','🎯 Activités'],['idees','💡 Idées'],['taches','✅ Tâches'],['notes','📝 Notes'],['reglages','⚙️ Réglages']];

async function api(method, col, body, id) {
  const r = await fetch(`/api/admin?col=${col}${id ? '&id=' + encodeURIComponent(id) : ''}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401) { showLogin(); throw new Error('Non connecté'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Erreur');
  return j;
}
const toast = m => alert(m);

// ---------- Connexion ----------
function showLogin() { $('app').hidden = true; $('login').hidden = false; }
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault(); const f = new FormData(e.target); $('loginMsg').textContent = '';
  const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: f.get('user'), password: f.get('password') }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { $('loginMsg').textContent = j.error || 'Erreur'; return; }
  e.target.reset(); start();
});
$('logout').onclick = async () => { await fetch('/api/me', { method: 'POST' }); showLogin(); };
async function start() {
  const r = await fetch('/api/me'); if (!r.ok) return showLogin();
  ME = await r.json(); $('whoName').textContent = ME.nom; $('login').hidden = true; $('app').hidden = false;
  $('tabs').innerHTML = TABS.map(([k, l]) => `<button data-t="${k}">${l}</button>`).join('');
  $('tabs').querySelectorAll('button').forEach(b => b.onclick = () => { TAB = b.dataset.t; render(); });
  render();
}
async function render() {
  $('tabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === TAB));
  $('view').innerHTML = '<p>Chargement…</p>';
  try { await ({ reponses, activites, idees, taches, notes, reglages })[TAB](); } catch (e) { if (e.message !== 'Non connecté') $('view').innerHTML = `<p class="formMsg err">⚠️ ${esc(e.message)}</p>`; }
}

// ---------- Dialogue de formulaire générique ----------
function openForm(title, fields, values = {}) {
  return new Promise(resolve => {
    const dlg = $('dlg'); $('dlgTitle').textContent = title;
    $('dlgBody').innerHTML = fields.map(f => `<label>${esc(f.label)}${
      f.type === 'textarea' ? `<textarea name="${f.k}" rows="${f.rows || 3}">${esc(values[f.k] ?? '')}</textarea>`
      : f.type === 'select' ? `<select name="${f.k}">${f.options.map(([v, l]) => `<option value="${esc(v)}" ${String(values[f.k] ?? f.def ?? '') === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`
      : `<input name="${f.k}" type="${f.type || 'text'}" value="${esc(values[f.k] ?? f.def ?? '')}" ${f.step ? `step="${f.step}"` : ''}>`}</label>`).join('');
    dlg.onclose = () => { if (dlg.returnValue !== 'ok') return resolve(null);
      const o = {}; new FormData($('dlgForm')).forEach((v, k) => o[k] = v); resolve(o); };
    dlg.showModal();
  });
}

// ---------- 📥 Réponses ----------
async function reponses() {
  const [rs, cfg, votes] = await Promise.all([api('GET', 'rsvps'), api('GET', 'config'), api('GET', 'votes')]);
  CACHE.rsvps = rs;
  const n = s => rs.filter(r => r.statut === s).length;
  const opts = cfg.dateOptions.map(o => { const c = { oui: 0, pe: 0, non: 0 };
    rs.filter(r => r.statut !== 'non').forEach(r => { const v = r.dispos?.[o.id]; if (v === 'oui') c.oui++; else if (v === 'peut-etre') c.pe++; else c.non++; });
    return { ...o, ...c, score: c.oui * 2 + c.pe }; });
  const best = Math.max(...opts.map(o => o.score), 0);
  const cnt = (k, v) => rs.filter(r => r[k] === v).length;
  const maxes = rs.map(r => r.budgetMax).filter(x => x > 0).sort((a, b) => a - b);
  const bar = (o, tot) => `<div class="bar">${[['oui', 'b-oui'], ['pe', 'b-pe'], ['non', 'b-non']].map(([k, c]) => o[k] ? `<i class="${c}" style="width:${o[k] / tot * 100}%">${o[k]}</i>` : '').join('')}</div>`;
  $('view').innerHTML = `
  <div class="panel"><h2>Synthèse</h2>
    <div class="stats"><div class="stat"><b>${rs.length}</b><span>réponses</span></div><div class="stat"><b>${n('oui')}</b><span>🎉 viennent</span></div><div class="stat"><b>${n('peut-etre')}</b><span>🤔 peut-être</span></div><div class="stat"><b>${n('non')}</b><span>😭 non</span></div><div class="stat"><b>${new Set(votes.map(v => v.id)).size}</b><span>🗳️ votants activités</span></div></div>
    <h3>Dates (hors "non") — meilleure en surbrillance</h3>
    ${opts.map(o => `<div class="${o.score === best && best > 0 ? 'best' : ''}"><b>${esc(o.label)}</b> — ✅ ${o.oui} · 🤷 ${o.pe} · ❌ ${o.non}${bar(o, Math.max(1, o.oui + o.pe + o.non))}</div>`).join('') || '<p>Aucune option de date.</p>'}
    <div class="row2"><div><b>Destination :</b> 👍 ${cnt('lieuOk', 'oui')} · 👎 ${cnt('lieuOk', 'non')} · 💡 ${cnt('lieuOk', 'autre')}</div>
    <div><b>Budget :</b> 👌 ${cnt('budget', 'ok')} · 😬 ${cnt('budget', 'serre')} · 💸 ${cnt('budget', 'trop')}${maxes.length ? ` · budget max médian <b>${euro(maxes[Math.floor(maxes.length / 2)])}</b> (min ${euro(maxes[0])})` : ''}</div></div>
    <div class="row2" style="margin-top:10px"><button class="mini good" id="copyInvite">📋 Copier le message d'invitation WhatsApp</button><span id="copyMsg" class="hint2"></span></div>
    ${(() => { const nk = x => (x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(), have = new Set(rs.map(r => nk(r.prenom) + '|' + nk(r.nom)));
      const miss = votes.filter(v => !have.has(nk(v.prenom) + '|' + nk(v.nom))); return miss.length ? `<p><b>⏳ Ont voté mais pas encore répondu au formulaire :</b> ${miss.map(v => esc(v.prenom + ' ' + v.nom)).join(', ')}</p>` : ''; })()}
    ${rs.filter(r => r.lieuIdee).length ? `<p><b>Autres idées de destination :</b> ${rs.filter(r => r.lieuIdee).map(r => esc(r.prenom) + ' → ' + esc(r.lieuIdee)).join(' · ')}</p>` : ''}
  </div>
  <div class="panel"><h2>Toutes les réponses</h2><div class="row2" style="margin-bottom:8px"><button class="mini" id="csv">⬇️ Export CSV</button></div>
    <div class="tblWrap"><table class="tbl"><thead><tr><th>Qui</th><th>Statut</th>${cfg.dateOptions.map(o => `<th>${esc(o.label)}</th>`).join('')}<th>Lieu</th><th>Budget</th><th>Départ / transport</th><th>Contact</th><th>Régime</th><th>Idées / mot</th><th></th></tr></thead><tbody>
    ${rs.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).map(r => `<tr><td><b>${esc(r.prenom)} ${esc(r.nom)}</b></td><td>${{ oui: '🎉', 'peut-etre': '🤔', non: '😭' }[r.statut]}</td>
      ${cfg.dateOptions.map(o => `<td>${{ oui: '✅', 'peut-etre': '🤷', non: '❌' }[r.dispos?.[o.id]] || '–'}</td>`).join('')}
      <td>${{ oui: '👍', non: '👎', autre: '💡 ' + esc(r.lieuIdee) }[r.lieuOk]}</td><td>${{ ok: '👌', serre: '😬', trop: '💸' }[r.budget]}${r.budgetMax ? ' ≤' + r.budgetMax + '€' : ''}</td>
      <td>${esc(r.depart)} ${esc(r.transport)}</td><td>${esc(r.contact)}</td><td>${esc(r.regime)}</td><td>${esc(r.idees)} ${r.commentaire ? '💬 ' + esc(r.commentaire) : ''}</td>
      <td><button class="mini danger" data-del="${r.id}">✕</button></td></tr>`).join('') || '<tr><td colspan="9">Aucune réponse pour le moment.</td></tr>'}
    </tbody></table></div></div>`;
  $('view').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (confirm('Supprimer cette réponse ?')) { await api('DELETE', 'rsvps', null, b.dataset.del); render(); } });
  $('copyInvite').onclick = async () => {
    const dl = cfg.deadline ? ` avant le ${new Date(cfg.deadline + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : '';
    const msg = `🚨 EVG d'Elie à ${cfg.lieu.replace(/[^\p{L}\p{N} ]/gu, '').trim()} ! 🚨\nRéponds en 2 min (dispos, budget) et vote tes activités préférées${dl} 👉 ${location.origin}\n(Chut, Elie ne sait rien 🤫)`;
    try { await navigator.clipboard.writeText(msg); $('copyMsg').textContent = '✔️ Copié, colle-le dans WhatsApp !'; } catch { prompt('Copie ce message :', msg); }
  };
  $('csv').onclick = () => {
    const head = ['prenom', 'nom', 'statut', ...cfg.dateOptions.map(o => o.label), 'destination', 'idee_destination', 'budget', 'budget_max', 'depart', 'transport', 'contact', 'regime', 'idees', 'commentaire'];
    const q = v => { let t = String(v ?? ''); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; }; // anti injection de formules Excel
    const csv = [head.map(q).join(',')].concat(rs.map(r => [r.prenom, r.nom, r.statut, ...cfg.dateOptions.map(o => r.dispos?.[o.id]), r.lieuOk, r.lieuIdee, r.budget, r.budgetMax, r.depart, r.transport, r.contact, r.regime, r.idees, r.commentaire].map(q).join(','))).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'reponses-evg.csv'; a.click();
  };
}

// ---------- 🎯 Activités ----------
const ACT_FIELDS = [
  { k: 'emoji', label: 'Emoji', def: '🎯' }, { k: 'nom', label: 'Nom' },
  { k: 'categorie', label: 'Catégorie', type: 'select', options: ['Sport & action', 'Bateau & canaux', 'Boire & manger', 'Jeux & défis', 'Insolite & culture', 'Soirée', 'Autre'].map(x => [x, x]) },
  { k: 'duree', label: 'Durée', def: '2h' }, { k: 'description', label: 'Description (drôle !)', type: 'textarea' },
  { k: 'ptype', label: 'Type de tarif', type: 'select', options: [['pp', 'Par personne'], ['group', 'Prix de groupe (bateau, salle…)']] },
  { k: 'prix', label: 'Prix € (par pers. ou du groupe)', type: 'number', step: '0.5' },
  { k: 'seuil', label: 'Si par personne : prix réduit dès X personnes (optionnel)', type: 'number' }, { k: 'prixSeuil', label: '…prix par personne à partir de ce seuil (€)', type: 'number', step: '0.5' },
  { k: 'capacite', label: 'Si groupe : capacité max par unité', type: 'number' },
  { k: 'prixNote', label: 'Note prix (réservation, saison…)' }, { k: 'source', label: 'Lien' },
];
function actToValues(a) { const p = a.prix || {}; return { ...a, ptype: p.type || 'pp', prix: p.type === 'group' ? p.prix : p.tiers?.[0]?.pp, seuil: p.tiers?.[1]?.min, prixSeuil: p.tiers?.[1]?.pp, capacite: p.capacite }; }
function valuesToAct(v, old = {}) {
  const prix = v.ptype === 'group' ? { type: 'group', prix: +v.prix || 0, capacite: +v.capacite || 10 }
    : { type: 'pp', tiers: [{ min: 1, pp: +v.prix || 0 }].concat(+v.seuil > 1 && +v.prixSeuil ? [{ min: +v.seuil, pp: +v.prixSeuil }] : []) };
  const id = old.id || (v.nom || 'activite').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) + '-' + Math.random().toString(36).slice(2, 5);
  return { ...old, id, emoji: v.emoji, nom: v.nom, categorie: v.categorie, duree: v.duree, description: v.description, prix, prixNote: v.prixNote, source: v.source, verifie: true, statut: old.statut || 'attente' };
}
let ANB = 8;
async function activites() {
  const d = await Promise.all([api('GET', 'activities'), api('GET', 'votes'), api('GET', 'config'), api('GET', 'rsvps')]);
  drawAct(...d);
}
function drawAct(acts, votes, cfg, rs) {
  const by = {}; acts.forEach(a => by[a.id] = { oui: [], non: [] });
  votes.forEach(v => Object.entries(v.votes || {}).forEach(([k, x]) => by[k] && by[k][x].push(v.prenom)));
  acts.forEach(a => a.counts = { oui: by[a.id].oui.length, non: by[a.id].non.length });
  if (!CACHE.anbSet) { ANB = Math.max(4, rs.filter(r => r.statut === 'oui').length + 1); CACHE.anbSet = true; }
  const shown = acts.filter(a => a.statut !== 'cachee'), ranked = P.rank(shown), top = ranked.slice(0, cfg.nbActivites);
  const est = P.estimate(top, ANB, cfg.inviterMarie);
  const rank = Object.fromEntries(ranked.map((a, i) => [a.id, i + 1]));
  const order = ranked.concat(shown.filter(a => a.statut === 'refusee'), acts.filter(a => a.statut === 'cachee'));
  $('view').innerHTML = `
  <div class="panel"><h2>🏆 Podium & estimation</h2>
    <div class="row2"><label>Participants (Elie compris) : <b id="anbV">${ANB}</b></label><input type="range" id="anb" min="4" max="25" value="${ANB}" style="max-width:260px"></div>
    <div class="stats"><div class="stat"><b>${euro(est.parPayeur)}</b><span>par payeur (${est.payeurs} pers.)</span></div><div class="stat"><b>${euro(est.total)}</b><span>total groupe</span></div><div class="stat"><b>${top.length}</b><span>activités retenues</span></div><div class="stat"><b>${top.filter(a => a.statut === 'validee').length}</b><span>validées ✅</span></div></div>
    <p class="hint2">Le podium = les ${cfg.nbActivites} premières : validées d'abord, puis les plus votées 😍. "Refuser" écarte une activité, "Cacher" la retire du site. Le nombre de places du podium se règle dans Réglages.</p></div>
  <div class="panel"><h2>Toutes les activités (${acts.length}) <button class="mini" id="addAct">+ Ajouter</button></h2>
  <div class="cardList">${order.map(a => `<div class="item ${a.statut || ''}"><div class="row2"><b style="font-size:1.4rem">${esc(a.emoji)}</b><h4 style="flex:1">${rank[a.id] && rank[a.id] <= cfg.nbActivites ? `<span class="chip">#${rank[a.id]}</span> ` : ''}${esc(a.nom)}</h4></div>
    <small>${esc(a.categorie)} · ${esc(a.duree)} · ${esc(P.bareme(a))} → <b>${euro(P.pp(a, ANB))}</b>/pers. à ${ANB}${a.verifie === false ? ' ⚠️ prix estimé' : ''}</small><p>${esc(a.description)}</p>
    <div class="voters"><b>😍 ${a.counts.oui}</b> ${esc(by[a.id].oui.join(', '))}<br><u>🙅 ${a.counts.non}</u> ${esc(by[a.id].non.join(', '))}</div>
    <div class="row2"><button class="mini good" data-s="validee" data-id="${a.id}">✅ Valider</button><button class="mini bad" data-s="refusee" data-id="${a.id}">⛔ Refuser</button><button class="mini" data-s="attente" data-id="${a.id}">↺ En attente</button><button class="mini" data-s="cachee" data-id="${a.id}">🙈 Cacher</button><button class="mini" data-edit="${a.id}">✏️</button><button class="mini danger" data-del="${a.id}">✕</button>${/^https?:\/\//i.test(a.source || '') ? `<a href="${esc(a.source)}" target="_blank" rel="noopener noreferrer" aria-label="Voir le site">🔗</a>` : ''}</div></div>`).join('')}</div></div>`;
  $('anb').oninput = e => { ANB = +e.target.value; drawAct(acts, votes, cfg, rs); $('anb').focus(); };
  $('addAct').onclick = async () => { const v = await openForm('Nouvelle activité', ACT_FIELDS, { ptype: 'pp' }); if (v && v.nom) { await api('POST', 'activities', valuesToAct(v)); render(); } };
  $('view').querySelectorAll('[data-s]').forEach(b => b.onclick = async () => { await api('POST', 'activities', { id: b.dataset.id, statut: b.dataset.s }); render(); });
  $('view').querySelectorAll('[data-edit]').forEach(b => b.onclick = async () => { const a = acts.find(x => x.id === b.dataset.edit); const v = await openForm('Modifier', ACT_FIELDS, actToValues(a)); if (v) { await api('POST', 'activities', valuesToAct(v, a)); render(); } });
  $('view').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (confirm('Supprimer définitivement cette activité ? (Tu peux aussi la cacher)')) { await api('DELETE', 'activities', null, b.dataset.del); render(); } });
}

// ---------- 💡 Idées ----------
const IDEA_FIELDS = [{ k: 'titre', label: 'Idée' }, { k: 'description', label: 'Détails', type: 'textarea', rows: 4 },
  { k: 'categorie', label: 'Catégorie', type: 'select', options: ['Activité', 'Resto / bar', 'Hébergement', 'Transport', 'Soirée', 'Surprise pour Elie 🤫', 'Cadeau / déguisement', 'Autre'].map(x => [x, x]) },
  { k: 'statut', label: 'Statut', type: 'select', options: [['idee', '💡 Idée'], ['ok', '✅ Validée'], ['non', '⛔ Abandonnée']] }];
async function idees() {
  const items = await api('GET', 'ideas'); items.sort((a, b) => Object.keys(b.votes || {}).length - Object.keys(a.votes || {}).length || (b.createdAt || '').localeCompare(a.createdAt || ''));
  $('view').innerHTML = `<div class="panel"><h2>Boîte à idées privée <button class="mini" id="addI">+ Nouvelle idée</button></h2><p class="hint2">Visible uniquement par vous trois. 👍 = vote d'un orga.</p>
  <div class="cardList">${items.map(i => `<div class="item ${i.statut === 'ok' ? 'validee' : i.statut === 'non' ? 'refusee' : ''}"><h4>${esc(i.titre)}</h4><small>${esc(i.categorie)} · par ${esc(ADMINS[i.createdBy] || '')}</small><p>${esc(i.description).replace(/\n/g, '<br>')}</p>
    <div class="row2"><button class="mini ${i.votes?.[ME.user] ? 'good' : ''}" data-v="${i.id}">👍 ${Object.keys(i.votes || {}).length}</button><span class="voters">${Object.keys(i.votes || {}).map(u => esc(ADMINS[u])).join(', ')}</span>
    <button class="mini" data-e="${i.id}">✏️</button><button class="mini danger" data-d="${i.id}">✕</button></div></div>`).join('') || '<p>Aucune idée pour le moment.</p>'}</div></div>`;
  $('addI').onclick = async () => { const v = await openForm('Nouvelle idée', IDEA_FIELDS, { statut: 'idee' }); if (v && v.titre) { await api('POST', 'ideas', v); render(); } };
  $('view').querySelectorAll('[data-v]').forEach(b => b.onclick = async () => { const i = items.find(x => x.id === b.dataset.v); await api('POST', 'ideas', { id: i.id, vote: !i.votes?.[ME.user] }); render(); });
  $('view').querySelectorAll('[data-e]').forEach(b => b.onclick = async () => { const i = items.find(x => x.id === b.dataset.e); const v = await openForm('Modifier', IDEA_FIELDS, i); if (v) { await api('POST', 'ideas', { ...v, id: i.id }); render(); } });
  $('view').querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (confirm('Supprimer cette idée ?')) { await api('DELETE', 'ideas', null, b.dataset.d); render(); } });
}

// ---------- ✅ Tâches ----------
async function taches() {
  const items = await api('GET', 'tasks'); items.sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || (a.echeance || '9').localeCompare(b.echeance || '9'));
  const opt = [['', '— personne —'], ...Object.entries(ADMINS)];
  $('view').innerHTML = `<div class="panel"><h2>Tâches d'organisation <button class="mini" id="addT">+ Tâche</button></h2><p class="hint2">Ex : réserver les vols, bloquer l'Airbnb, commander les t-shirts…</p>
  ${items.map(t => `<div class="taskRow ${t.done ? 'done' : ''}"><input type="checkbox" data-c="${t.id}" ${t.done ? 'checked' : ''} style="width:auto"><span class="tt">${esc(t.titre)}</span><small>${esc(ADMINS[t.assigne] || '')}</small><small>${t.echeance ? '📅 ' + esc(t.echeance) : ''}</small><button class="mini" data-e="${t.id}">✏️</button><button class="mini danger" data-d="${t.id}">✕</button></div>`).join('') || '<p>Rien à faire (suspect).</p>'}</div>`;
  const F = [{ k: 'titre', label: 'Tâche' }, { k: 'assigne', label: 'Responsable', type: 'select', options: opt }, { k: 'echeance', label: 'Échéance', type: 'date' }];
  $('addT').onclick = async () => { const v = await openForm('Nouvelle tâche', F, { assigne: ME.user }); if (v && v.titre) { await api('POST', 'tasks', { ...v, done: false }); render(); } };
  $('view').querySelectorAll('[data-c]').forEach(b => b.onchange = async () => { await api('POST', 'tasks', { id: b.dataset.c, done: b.checked }); render(); });
  $('view').querySelectorAll('[data-e]').forEach(b => b.onclick = async () => { const t = items.find(x => x.id === b.dataset.e); const v = await openForm('Modifier', F, t); if (v) { await api('POST', 'tasks', { ...v, id: t.id }); render(); } });
  $('view').querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (confirm('Supprimer ?')) { await api('DELETE', 'tasks', null, b.dataset.d); render(); } });
}

// ---------- 📝 Notes ----------
async function notes() {
  const items = await api('GET', 'notes'); items.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  $('view').innerHTML = `<div class="panel"><h2>Notes d'orga <button class="mini" id="addN">+ Page</button></h2><p class="hint2">Planning, liens de résa, numéros, plan B… Visible uniquement par vous trois.</p></div>` +
    items.map(n => `<div class="panel noteBox"><div class="row2"><input value="${esc(n.titre)}" data-t="${n.id}" style="flex:1;font-weight:900"><small>modif. ${esc(ADMINS[n.updatedBy] || '')}</small><button class="mini good" data-s="${n.id}">💾 Enregistrer</button><button class="mini danger" data-d="${n.id}">✕</button></div><textarea data-b="${n.id}">${esc(n.corps)}</textarea></div>`).join('');
  $('addN').onclick = async () => { const v = await openForm('Nouvelle page', [{ k: 'titre', label: 'Titre' }]); if (v && v.titre) { await api('POST', 'notes', { titre: v.titre, corps: '' }); render(); } };
  $('view').querySelectorAll('[data-s]').forEach(b => b.onclick = async () => { const id = b.dataset.s; await api('POST', 'notes', { id, titre: document.querySelector(`[data-t="${id}"]`).value, corps: document.querySelector(`[data-b="${id}"]`).value }); b.textContent = '✔️ Enregistré'; });
  $('view').querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (confirm('Supprimer cette page ?')) { await api('DELETE', 'notes', null, b.dataset.d); render(); } });
}

// ---------- ⚙️ Réglages (infos publiques) ----------
const progToText = p => p.map(d => `## ${d.jour} — ${d.titre}\n${d.items.map(i => '- ' + i).join('\n')}`).join('\n\n');
const textToProg = t => t.split(/\n(?=## )/).map(b => { const l = b.split('\n'); const h = l[0].replace(/^##\s*/, '').split(/\s[—-]\s/); return { jour: (h[0] || '').trim(), titre: (h[1] || '').trim(), items: l.slice(1).map(x => x.replace(/^-\s*/, '').trim()).filter(Boolean) }; }).filter(d => d.jour || d.titre);
async function reglages() {
  const c = await api('GET', 'config');
  $('view').innerHTML = `<div class="panel"><h2>Infos affichées sur le site</h2><form id="cfgForm" class="form">
    <label>Destination<input name="lieu" value="${esc(c.lieu)}"></label>
    <label>Message d'intro<textarea name="intro" rows="4">${esc(c.intro)}</textarea></label>
    <div class="grid2"><label>Date limite des réponses<input type="date" name="deadline" value="${esc(c.deadline)}"></label>
    <label>Date de départ définitive (optionnel — remplace le compte à rebours)<input type="datetime-local" name="dateFinale" value="${esc(c.dateFinale)}"></label></div>
    <label>Dates proposées (une par ligne)<textarea name="dates" rows="4">${esc(c.dateOptions.map(o => o.label).join('\n'))}</textarea></label>
    <label>Budget par personne (une ligne par poste : <code>Poste | montant</code>)<textarea name="budget" rows="6">${esc(c.budget.map(b => `${b.poste} | ${b.montant}`).join('\n'))}</textarea></label>
    <div class="grid2"><label>Nombre d'activités au podium<input type="number" name="nbActivites" min="1" max="12" value="${c.nbActivites}"></label>
    <label>Budget cible activités (€/pers.) — sert à la jauge<input type="number" name="budgetActivites" min="0" value="${c.budgetActivites}"></label></div>
    <label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="inviterMarie" ${c.inviterMarie ? 'checked' : ''} style="width:auto"> On invite Elie (sa part est répartie sur les autres)</label>
    <label>Programme public (optionnel) — format : <code>## Jour — Titre</code> puis lignes <code>- activité</code><textarea name="programme" rows="8">${esc(progToText(c.programme))}</textarea></label>
    <button class="btn" type="submit">💾 Enregistrer</button><p id="cfgMsg" class="formMsg"></p></form></div>`;
  $('cfgForm').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target);
    const byLabel = Object.fromEntries(c.dateOptions.map(o => [o.label, o.id])), used = new Set();
    const labels = f.get('dates').split('\n').map(x => x.trim()).filter(Boolean);
    labels.forEach(l => { if (byLabel[l]) used.add(byLabel[l]); });
    const idFor = (l, i) => byLabel[l] || (c.dateOptions[i] && !used.has(c.dateOptions[i].id) && !labels.includes(c.dateOptions[i].label) ? (used.add(c.dateOptions[i].id), c.dateOptions[i].id) : 'd' + Date.now().toString(36) + i);
    const body = { lieu: f.get('lieu'), intro: f.get('intro'), deadline: f.get('deadline'), dateFinale: f.get('dateFinale'), nbActivites: f.get('nbActivites'), budgetActivites: f.get('budgetActivites'), inviterMarie: f.get('inviterMarie') === 'on',
      dateOptions: labels.map((label, i) => ({ id: idFor(label, i), label })),
      budget: f.get('budget').split('\n').map(l => { const [poste, m] = l.split('|'); return { poste: (poste || '').trim(), montant: parseFloat((m || '0').replace(',', '.')) || 0 }; }).filter(b => b.poste),
      programme: textToProg(f.get('programme')) };
    try { await api('PUT', 'config', body); $('cfgMsg').className = 'formMsg ok'; $('cfgMsg').textContent = '✅ Enregistré — visible sur le site.'; } catch (err) { $('cfgMsg').className = 'formMsg err'; $('cfgMsg').textContent = err.message; } };
}
start();
