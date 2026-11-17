// Espace orga : chargé dans l'app uniquement pour David, Alon et Raphaël (l'API vérifie le rôle à chaque appel)
window.EVGAdmin = (() => {
const P = window.EVGPrice, $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const euro = n => (Math.round(n * 10) / 10).toLocaleString('fr-FR') + ' €';
const ADMINS = { david: 'David', alon: 'Alon', raphael: 'Raphaël' };
let ME = null, TAB = 'securite', CACHE = {};
const TABS = [['securite','🛡️ Sécurité'],['reponses','📥 Réponses'],['activites','🎯 Activités'],['propositions','📬 Propositions'],['idees','🔒 Idées orga'],['taches','✅ Tâches'],['notes','📝 Notes'],['reglages','⚙️ Réglages']];

async function api(method, col, body, id) {
  const r = await fetch(`/api/admin?col=${col}${id ? '&id=' + encodeURIComponent(id) : ''}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401) { location.replace('/login'); throw new Error('Non connecté'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Erreur');
  return j;
}
const ago = iso => { if (!iso) return '–'; const m = Math.max(0, (Date.now() - new Date(iso)) / 6e4 | 0); return m < 1 ? "à l'instant" : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${m / 60 | 0} h` : `il y a ${m / 1440 | 0} j`; };
const when = iso => iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–';

function start(me) {
  ME = { user: me.admin, nom: me.prenom };
  try { TAB = sessionStorage.getItem('evg_tab') || TAB; } catch {}
  $('tabs').innerHTML = TABS.map(([k, l]) => `<button type="button" data-t="${k}">${l}</button>`).join('');
  $('tabs').querySelectorAll('button').forEach(b => b.onclick = () => { TAB = b.dataset.t; try { sessionStorage.setItem('evg_tab', TAB); } catch {} render(); });
  render();
}
async function render() {
  $('tabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === TAB));
  $('view').innerHTML = '<p class="hint">Chargement…</p>';
  try { await ({ securite, reponses, activites, propositions, idees, taches, notes, reglages })[TAB](); } catch (e) { if (e.message !== 'Non connecté') $('view').innerHTML = `<p class="formMsg err">⚠️ ${esc(e.message)}</p>`; }
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
  const [rs, cfg, votes, inv] = await Promise.all([api('GET', 'rsvps'), api('GET', 'config'), api('GET', 'votes'), api('GET', 'invite')]);
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
    <div class="tblWrap"><table class="tbl"><thead><tr><th>Qui</th><th>Statut</th>${cfg.dateOptions.map(o => `<th>${esc(o.label)}</th>`).join('')}<th>Lieu</th><th>Budget</th><th>Adresse / départ</th><th>Contact</th><th>Régime</th><th>Idées / mot</th><th></th></tr></thead><tbody>
    ${rs.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).map(r => `<tr><td><b>${esc(r.prenom)} ${esc(r.nom)}</b></td><td>${{ oui: '🎉', 'peut-etre': '🤔', non: '😭' }[r.statut]}</td>
      ${cfg.dateOptions.map(o => `<td>${{ oui: '✅', 'peut-etre': '🤷', non: '❌' }[r.dispos?.[o.id]] || '–'}</td>`).join('')}
      <td>${{ oui: '👍', non: '👎', autre: '💡 ' + esc(r.lieuIdee) }[r.lieuOk] || '–'}</td><td>${{ ok: '👌', serre: '😬', trop: '💸' }[r.budget] || '–'}${r.budgetMax ? ' ≤' + r.budgetMax + '€' : ''}</td>
      <td>${esc(r.adresse || '')}${r.adresse ? '<br>' : ''}${esc(r.depart)} · ${esc(r.transport)}</td><td>${esc(r.contact)}</td><td>${esc(r.regime)}</td><td>${esc(r.idees)} ${r.commentaire ? '💬 ' + esc(r.commentaire) : ''}</td>
      <td><button class="mini danger" data-del="${r.id}">✕</button></td></tr>`).join('') || '<tr><td colspan="20">Aucune réponse pour le moment.</td></tr>'}
    </tbody></table></div></div>`;
  $('view').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (confirm('Supprimer cette réponse ?')) { await api('DELETE', 'rsvps', null, b.dataset.del); render(); } });
  $('copyInvite').onclick = async () => {
    const dl = cfg.deadline ? ` avant le ${new Date(cfg.deadline + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : '';
    const msg = `🚨 EVG d'Elie à ${cfg.lieu.replace(/[^\p{L}\p{N} ]/gu, '').trim()} ! 🚨\nRéponds en 2 min (dispos, budget) et vote tes activités préférées${dl} 👉 ${location.origin}/?c=${inv.code}\n(Ce lien te permet de créer ton compte. Chut, Elie ne sait rien 🤫)`;
    try { await navigator.clipboard.writeText(msg); $('copyMsg').textContent = '✔️ Copié, colle-le dans WhatsApp !'; } catch { prompt('Copie ce message :', msg); }
  };
  $('csv').onclick = () => {
    const head = ['prenom', 'nom', 'statut', ...cfg.dateOptions.map(o => o.label), 'destination', 'idee_destination', 'budget', 'budget_max', 'adresse', 'depart', 'transport', 'contact', 'regime', 'idees', 'commentaire'];
    const q = v => { let t = String(v ?? ''); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; }; // anti injection de formules Excel
    const csv = [head.map(q).join(',')].concat(rs.map(r => [r.prenom, r.nom, r.statut, ...cfg.dateOptions.map(o => r.dispos?.[o.id]), r.lieuOk, r.lieuIdee, r.budget, r.budgetMax, r.adresse, r.depart, r.transport, r.contact, r.regime, r.idees, r.commentaire].map(q).join(','))).join('\n');
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


// ---------- 📬 Propositions des participants ----------
const IDEA_STATUS = { nouvelle: '🆕 Nouvelle', retenue: '✅ Retenue', refusee: '⛔ Refusée', cachee: '🙈 Cachée' };
async function propositions() {
  const [list, members, extra] = await Promise.all([api('GET', 'proposals'), api('GET', 'members'), api('GET', 'defis')]);
  const name = id => (members.find(m => m.id === id) || {}).prenom || '?';
  list.sort((a, b) => b.likes - a.likes || b.createdAt.localeCompare(a.createdAt));
  $('view').innerHTML = `<div class="panel"><h2>Propositions des participants (${list.length})</h2>
    <p class="hint2">Triées par likes. <b>→ Activité</b> l'ajoute au catalogue (votable en swipe), <b>→ Défi</b> à la liste des défis. Le participant voit le statut et votre note.</p>
    <div class="cardList">${list.map(i => `<div class="item ${i.statut === 'retenue' ? 'validee' : i.statut === 'refusee' || i.statut === 'cachee' ? 'refusee' : ''}">
      <div class="row2"><h4 style="flex:1">${esc(i.titre)}</h4><span class="chip">❤️ ${i.likes}</span></div>
      <small>${esc(i.categorie)}${i.prix ? ' · ≈ ' + euro(i.prix) + '/pers.' : ''} · par ${esc(i.auteur)} · ${esc(IDEA_STATUS[i.statut] || i.statut)}</small>
      <p>${esc(i.description).replace(/\n/g, '<br>')}</p>
      ${/^https?:\/\//i.test(i.lien || '') ? `<a href="${esc(i.lien)}" target="_blank" rel="noopener noreferrer">🔗 lien</a>` : ''}
      <div class="voters"><b>❤️</b> ${esc((i.likers || []).map(name).join(', '))}</div>
      ${i.comments.length ? `<div class="voters">${i.comments.map(c => `💬 <b>${esc(c.auteur)}</b> : ${esc(c.texte)} <button class="mini danger" data-dc="${i.id}|${c.id}" aria-label="Supprimer ce commentaire">✕</button>`).join('<br>')}</div>` : ''}
      ${i.note ? `<p class="hint2">Note : ${esc(i.note)}</p>` : ''}
      <div class="row2"><button class="mini good" data-act="${i.id}">→ Activité</button><button class="mini good" data-defi="${i.id}">→ Défi</button><button class="mini bad" data-st="refusee|${i.id}">⛔ Refuser</button><button class="mini" data-st="nouvelle|${i.id}">↺ Nouvelle</button><button class="mini" data-st="cachee|${i.id}">🙈 Cacher</button><button class="mini" data-note="${i.id}">📝 Note</button><button class="mini danger" data-del="${i.id}">✕</button></div></div>`).join('') || '<p>Aucune proposition pour le moment.</p>'}</div></div>
    <div class="panel"><h2>Défis ajoutés par vous (${extra.length})</h2><p class="hint2">Ils s'ajoutent à ceux de data.js sur le site.</p>
    ${extra.map(d => `<div class="taskRow"><span class="chip">${esc({ 1: '🌶️', 2: '🌶️🌶️', 3: '🌶️🌶️🌶️', 4: '💀', g: '👥' }[d.n] || d.n)}</span><span class="tt">${esc(d.t)}</span><button class="mini danger" data-xd="${d.id}">✕</button></div>`).join('') || '<p>Aucun pour le moment.</p>'}
    <div class="row2" style="margin-top:8px"><button class="mini" id="addDefi">+ Ajouter un défi</button></div></div>`;
  const byId = id => list.find(x => x.id === id), V = $('view');
  const DEFI_F = [{ k: 'n', label: 'Niveau', type: 'select', options: [['1', '🌶️ échauffement (1 pt)'], ['2', '🌶️🌶️ costaud (2 pts)'], ['3', '🌶️🌶️🌶️ très gênant (3 pts)'], ['4', '💀 hardcore (5 pts)'], ['g', '👥 groupe (3 pts)']] }, { k: 't', label: 'Le défi', type: 'textarea', rows: 4 }];
  const mark = (id, statut, note) => api('POST', 'proposals', { id, statut, ...(note !== undefined && { note }) });
  V.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => { const i = byId(b.dataset.act);
    const v = await openForm('Ajouter au catalogue des activités', ACT_FIELDS, { emoji: '💡', nom: i.titre, description: i.description, categorie: 'Autre', duree: '2h', ptype: 'pp', prix: i.prix || '', source: i.lien }); if (!v || !v.nom) return;
    await api('POST', 'activities', valuesToAct(v)); await mark(i.id, 'retenue', 'Ajoutée au catalogue des activités : votez en swipe !'); render(); });
  V.querySelectorAll('[data-defi]').forEach(b => b.onclick = async () => { const i = byId(b.dataset.defi);
    const v = await openForm('Ajouter aux défis', DEFI_F, { n: '3', t: i.titre + (i.description ? ' : ' + i.description : '') }); if (!v || !v.t) return;
    await api('POST', 'defis', { n: v.n === 'g' ? 'g' : +v.n, t: v.t }); await mark(i.id, 'retenue', 'Ajouté aux défis du docteur !'); render(); });
  V.querySelectorAll('[data-st]').forEach(b => b.onclick = async () => { const [s, id] = b.dataset.st.split('|'); await mark(id, s); render(); });
  V.querySelectorAll('[data-note]').forEach(b => b.onclick = async () => { const i = byId(b.dataset.note); const v = await openForm('Note visible par tous', [{ k: 'note', label: 'Message du staff (ex : trop cher, on adore…)' }], { note: i.note }); if (v) { await mark(i.id, undefined, v.note); render(); } });
  V.querySelectorAll('[data-dc]').forEach(b => b.onclick = async () => { const [id, cid] = b.dataset.dc.split('|'); if (confirm('Supprimer ce commentaire ?')) { await api('POST', 'proposals', { id, delcid: cid }); render(); } });
  V.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (confirm('Supprimer définitivement cette idée (likes et commentaires compris) ?')) { await api('DELETE', 'proposals', null, b.dataset.del); render(); } });
  V.querySelectorAll('[data-xd]').forEach(b => b.onclick = async () => { if (confirm('Retirer ce défi ?')) { await api('DELETE', 'defis', null, b.dataset.xd); render(); } });
  $('addDefi').onclick = async () => { const v = await openForm('Nouveau défi', DEFI_F, { n: '3' }); if (v && v.t) { await api('POST', 'defis', { n: v.n === 'g' ? 'g' : +v.n, t: v.t }); render(); } };
}

// ---------- 🛡️ Sécurité : comptes, appareils, invitations, journal ----------
const EV = {
  login: ['🔓', 'Connexion'], login_fail: ['❌', 'Code erroné'], register: ['🆕', 'Compte créé'], device_new: ['📱', 'Nouvel appareil'], device_limit: ['⛔', 'Limite d\'appareils atteinte'],
  city_change: ['🌍', 'Changement de ville'], screenshot: ['📸', 'Tentative de capture'], print: ['🖨️', 'Tentative d\'impression'], devtools: ['🧑‍💻', 'Outils développeur'], copy: ['📋', 'Tentative de copie'],
  record: ['🎥', 'Enregistrement d\'écran'], panic: ['🙈', 'Bouton panique'], bad_invite: ['🚫', 'Code d\'invitation faux'], blocked_try: ['🚷', 'Compte bloqué a tenté'], admin_fail: ['🚨', 'Mot de passe orga faux'],
  self_revoke: ['🔌', 'A déconnecté un appareil'], admin_approve: ['✅', 'Compte validé'], admin_block: ['🚷', 'Compte bloqué'], admin_unblock: ['♻️', 'Compte débloqué'], admin_revoke: ['🔌', 'Appareil déconnecté'],
  admin_logoutAll: ['🔌', 'Tout déconnecté'], admin_reset: ['🗑️', 'Compte réinitialisé'], admin_limit: ['🔢', 'Limite modifiée'], admin_promote: ['⭐', 'Passé orga'], admin_demote: ['↩', 'Orga retiré'], invite_reset: ['🔄', 'Lien d\'invitation régénéré'], settings: ['⚙️', 'Réglages sécurité'],
};
const ALERT = new Set(['device_limit', 'screenshot', 'print', 'devtools', 'record', 'bad_invite', 'blocked_try', 'admin_fail', 'city_change', 'copy']);
const icon = l => /iPhone|Android/.test(l) ? '📱' : /iPad/.test(l) ? '📲' : '💻';
let LOGF = 'alertes';
async function securite() {
  const [ms, sec, inv, log] = await Promise.all([api('GET', 'members'), api('GET', 'security'), api('GET', 'invite'), api('GET', 'log')]);
  const link = `${location.origin}/?c=${inv.code}`;
  const pending = ms.filter(m => m.status === 'pending'), now = Date.now();
  const online = ms.filter(m => m.sessions.some(s => now - new Date(s.lastSeen) < 5 * 6e4)).length;
  const multi = ms.filter(m => m.role !== 'admin' && m.sessions.length > 1).length;
  const alerts24 = log.filter(e => ALERT.has(e.type) && now - new Date(e.t) < 864e5).length;
  ms.sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0) || (b.sessions[0]?.lastSeen || '').localeCompare(a.sessions[0]?.lastSeen || '') || a.prenom.localeCompare(b.prenom));
  const statusChip = m => m.role === 'admin' ? '<span class="chip gold">orga</span>' : { active: '<span class="chip ok">actif</span>', pending: '<span class="chip warn">en attente</span>', blocked: '<span class="chip bad">bloqué</span>' }[m.status];
  const logRows = log.filter(e => LOGF === 'tout' || ALERT.has(e.type)).slice(0, 150);
  $('view').innerHTML = `
  <div class="stats"><div class="stat"><b>${ms.filter(m => m.role !== 'admin').length}</b><span>comptes</span></div><div class="stat"><b>${online}</b><span>🟢 en ligne</span></div>
    <div class="stat ${pending.length ? 'hot' : ''}"><b>${pending.length}</b><span>⏳ à valider</span></div><div class="stat"><b>${multi}</b><span>📱 multi-appareils</span></div><div class="stat ${alerts24 ? 'hot' : ''}"><b>${alerts24}</b><span>🚨 alertes 24 h</span></div></div>

  ${pending.length ? `<div class="panel hotPanel"><h2>⏳ À valider (${pending.length})</h2><p class="hint2">Vérifiez que c'est bien un pote invité avant de valider. Au moindre doute : bloquer.</p>
    ${pending.map(m => `<div class="taskRow"><span class="tt"><b>${esc(m.prenom)} ${esc(m.nom)}</b><br><small>${esc(m.sessions[0] ? `${m.sessions[0].label} · ${[m.sessions[0].city, m.sessions[0].country].filter(Boolean).join(', ')} · IP ${m.sessions[0].ip}` : '')} · créé ${ago(m.createdAt)}</small></span>
      <button class="mini good" data-op="approve|${m.id}">✅ Valider</button><button class="mini danger" data-op="block|${m.id}">🚷 Bloquer</button></div>`).join('')}</div>` : ''}

  <div class="panel"><h2>👥 Comptes & appareils</h2>
    <p class="hint2">Chaque ligne = un appareil connecté. Limite par défaut : <b>${sec.maxDevices || '∞'}</b> appareil(s) par participant (les orgas n'ont pas de limite). « Déconnecter » coupe l'accès immédiatement, même aux photos.</p>
    <div class="secList">${ms.map(m => `<div class="secItem ${m.status}"><div class="secHead"><b>${esc(m.prenom)} ${esc(m.nom)}</b> ${statusChip(m)} <span class="chip ${m.role !== 'admin' && m.sessions.length > (m.maxDevices || sec.maxDevices) ? 'bad' : ''}">${m.sessions.length} appareil${m.sessions.length > 1 ? 's' : ''}${m.maxDevices ? ' / ' + m.maxDevices + ' (perso)' : ''}</span>
        <span class="secBtns">${m.status === 'pending' ? `<button class="mini good" data-op="approve|${m.id}">✅ Valider</button>` : ''}${m.role !== 'admin' ? (m.status === 'blocked' ? `<button class="mini good" data-op="unblock|${m.id}">♻️ Débloquer</button>` : `<button class="mini danger" data-op="block|${m.id}">🚷 Bloquer</button>`) : ''}
        ${m.sessions.length ? `<button class="mini" data-op="logoutAll|${m.id}">🔌 Tout déconnecter</button>` : ''}${m.role !== 'admin' ? `<button class="mini" data-lim="${m.id}">🔢 Limite</button><button class="mini" data-pro="${m.id}">⭐ Passer orga</button><button class="mini danger" data-op="reset|${m.id}">🗑️ Code oublié</button>` : !m.id.startsWith('adm-') ? `<button class="mini" data-op="demote|${m.id}">↩ Retirer orga</button>` : ''}</span></div>
      ${m.sessions.map(s => `<div class="devRow"><span>${icon(s.label)}</span><div><b>${esc(s.label)}</b> <small>${esc([s.city, s.country].filter(Boolean).join(', ') || '?')} · IP ${esc(s.ip)} · ${now - new Date(s.lastSeen) < 5 * 6e4 ? '🟢 en ligne' : 'vu ' + ago(s.lastSeen)}${s.page ? ' sur ' + esc(s.page) : ''} · connecté le ${when(s.createdAt)} · empreinte ${esc(s.fp || s.did)}</small></div><button class="mini danger" data-op="revoke|${m.id}|${s.id}">Déconnecter</button></div>`).join('') || '<div class="devRow"><small>Aucun appareil connecté.</small></div>'}</div>`).join('') || '<p>Aucun compte pour le moment.</p>'}</div></div>

  <div class="panel"><h2>🔗 Lien d'invitation</h2>
    <p class="hint2">Ce lien est le seul moyen de <b>créer un compte</b>. Envoyez-le uniquement dans le groupe des participants. S'il fuite : régénérez-le (les comptes existants ne bougent pas).</p>
    <input id="invLink" readonly value="${esc(link)}" onclick="this.select()">
    <div class="row2" style="margin-top:8px"><button class="mini good" id="copyLink">📋 Copier le message WhatsApp</button><button class="mini danger" id="regen">🔄 Régénérer</button><span id="lnkMsg" class="hint2"></span></div></div>

  <div class="panel"><h2>⚙️ Réglages de sécurité</h2><form id="secForm" class="form">
    <label class="check"><input type="checkbox" name="approval" ${sec.approval ? 'checked' : ''}> Valider chaque nouveau compte à la main (recommandé)</label>
    <label class="check"><input type="checkbox" name="watermark" ${sec.watermark ? 'checked' : ''}> Filigrane nominatif sur tout le site (identifie l'auteur d'une capture)</label>
    <div class="grid2"><label>Appareils max par participant (0 = illimité)<input type="number" name="maxDevices" min="0" max="10" value="${sec.maxDevices}"></label>
    <label>Floutage auto après X min d'inactivité (0 = jamais)<input type="number" name="autoLockMin" min="0" max="60" value="${sec.autoLockMin}"></label></div>
    <button class="btn small" type="submit">💾 Enregistrer</button> <span id="secMsg" class="hint2"></span></form></div>

  <div class="panel"><h2>📜 Journal</h2>
    <div class="modeSwitch"><button type="button" data-lf="alertes" class="${LOGF === 'alertes' ? 'on' : ''}">🚨 Alertes</button><button type="button" data-lf="tout" class="${LOGF === 'tout' ? 'on' : ''}">Tout</button></div>
    <div class="tblWrap"><table class="tbl"><thead><tr><th>Quand</th><th>Quoi</th><th>Qui</th><th>Où / appareil</th><th>Détail</th></tr></thead><tbody>
    ${logRows.map(e => `<tr class="${ALERT.has(e.type) ? 'alert' : ''}"><td>${when(e.t)}</td><td>${(EV[e.type] || ['•', e.type]).join(' ')}</td><td><b>${esc(e.who || '')}</b>${e.target ? ' → ' + esc(e.target) : ''}</td>
      <td>${esc([e.city, e.country].filter(Boolean).join(', '))} · ${esc(e.label || '')}<br><small>${esc(e.ip || '')}</small></td><td><small>${esc([e.page, e.detail, e.from && e.to ? e.from + ' → ' + e.to : '', e.devices ? 'déjà sur : ' + e.devices.join(', ') : '', e.pending ? 'en attente de validation' : ''].filter(Boolean).join(' · '))}</small></td></tr>`).join('') || '<tr><td colspan="5">Rien à signaler.</td></tr>'}
    </tbody></table></div></div>`;

  const V = $('view');
  V.querySelectorAll('[data-op]').forEach(b => b.onclick = async () => {
    const [op, id, sid] = b.dataset.op.split('|');
    const ask = { demote: 'Retirer les droits orga de ce compte ?', block: 'Bloquer ce compte ? Tous ses appareils sont déconnectés immédiatement.', reset: 'Code oublié : supprimer le compte ? La personne le recrée (mêmes prénom et nom) et retrouve ses réponses et votes.', logoutAll: 'Déconnecter tous ses appareils ?', revoke: 'Déconnecter cet appareil ?' }[op];
    if (ask && !confirm(ask)) return;
    await api('POST', 'members', { op, id, sid }); render();
  });
  V.querySelectorAll('[data-lim]').forEach(b => b.onclick = async () => { const v = prompt('Nombre max d\'appareils pour ce compte (vide = réglage général) :'); if (v === null) return; await api('POST', 'members', { op: 'limit', id: b.dataset.lim, maxDevices: v }); render(); });
  V.querySelectorAll('[data-pro]').forEach(b => b.onclick = async () => { const v = (prompt('Ce compte devient orga (pour ton compte perso). Lier à : david, alon ou raphael ?') || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); if (!v) return; try { await api('POST', 'members', { op: 'promote', id: b.dataset.pro, admin: v }); render(); } catch (e) { alert(e.message); } });
  V.querySelectorAll('[data-lf]').forEach(b => b.onclick = () => { LOGF = b.dataset.lf; render(); });
  $('copyLink').onclick = async () => {
    const msg = `🚨 EVG D'ELIE · AMSTERDAM 🚨\n\nLe Dr Berdugo se marie, on l'opère d'urgence. Toutes les infos, le vote des activités et les défis sont ici 👇\n\n${link}\n\n1️⃣ Crée ton compte (prénom, nom, un code perso)\n2️⃣ Réponds aux 3 questions : dates, lieu, d'où tu pars\n3️⃣ Vote les activités en swipe 😈\n\n🔐 Lien perso : ne le transfère à PERSONNE (surtout pas à Elie). 🤫`;
    try { await navigator.clipboard.writeText(msg); $('lnkMsg').textContent = '✔️ Copié, colle-le dans WhatsApp !'; } catch { prompt('Copie ce message :', msg); }
  };
  $('regen').onclick = async () => { if (confirm("Régénérer le lien ? L'ancien ne permettra plus de créer un compte.")) { await api('POST', 'invite', {}); render(); } };
  $('secForm').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target);
    await api('PUT', 'security', { approval: f.get('approval') === 'on', watermark: f.get('watermark') === 'on', maxDevices: f.get('maxDevices'), autoLockMin: f.get('autoLockMin') });
    $('secMsg').textContent = '✔️ Enregistré'; };
}

// ---------- 🔒 Idées orga (privées) ----------
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
return { start, refresh: render };
})();
