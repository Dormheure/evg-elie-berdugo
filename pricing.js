// Calcul des prix selon le nombre de personnes (utilisé par le site public et l'admin)
window.EVGPrice = {
  // coût TOTAL de l'activité pour n personnes
  total(a, n) {
    const p = a.prix;
    if (p.type === 'group') return Math.ceil(n / (p.capacite || n)) * p.prix;
    let pp = p.tiers[0].pp;
    for (const t of p.tiers) if (n >= t.min) pp = t.pp;
    return pp * n;
  },
  // coût par personne (toutes personnes présentes)
  pp(a, n) { return this.total(a, n) / n; },
  // texte du barème
  bareme(a) {
    const p = a.prix;
    if (p.type === 'group') return `${p.prix} € le groupe (max ${p.capacite} pers.)`;
    // on fusionne les paliers au même prix (ex. 19 € dès 1 et 19 € dès 10)
    const t = p.tiers.filter((x, i) => i === 0 || x.pp !== p.tiers[i - 1].pp);
    if (t.length === 1) return t[0].pp === 0 ? 'gratuit' : `${t[0].pp} €/pers.`;
    return t.map((x, i) => `${x.pp} €/pers.${i ? ' dès ' + x.min + ' pers.' : ''}`).join(' · ');
  },
  // classement : validées d'abord, puis nb de "oui", puis solde (oui - non). Les refusées sortent.
  rank(acts) {
    return acts.filter(a => a.statut !== 'refusee').sort((x, y) => {
      const vx = x.statut === 'validee' ? 1 : 0, vy = y.statut === 'validee' ? 1 : 0;
      if (vx !== vy) return vy - vx;
      const cx = x.counts || { oui: 0, non: 0 }, cy = y.counts || { oui: 0, non: 0 };
      return (cy.oui - cx.oui) || ((cy.oui - cy.non) - (cx.oui - cx.non)) || x.nom.localeCompare(y.nom);
    });
  },
  // podium : uniquement ce qui a au moins un 😍 (ou qui est validé) — pas de faux classement sans votes
  podium(acts, N) { return this.rank(acts).filter(a => a.statut === 'validee' || (a.counts?.oui || 0) > 0).slice(0, N); },
  // estimation du podium : total, prix par payeur (le marié est invité => réparti sur les autres)
  estimate(list, n, inviterMarie) {
    const total = list.reduce((s, a) => s + this.total(a, n), 0);
    const payeurs = inviterMarie && n > 1 ? n - 1 : n;
    return { total, payeurs, parPayeur: total / payeurs };
  },
};
