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
    if (p.tiers.length === 1) return `${p.tiers[0].pp} €/pers.`;
    return p.tiers.map(t => `${t.pp} €/pers. dès ${t.min}`).join(' · ');
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
  // estimation du podium : total, prix par payeur (le marié est invité => réparti sur les autres)
  estimate(list, n, inviterMarie) {
    const total = list.reduce((s, a) => s + this.total(a, n), 0);
    const payeurs = inviterMarie && n > 1 ? n - 1 : n;
    return { total, payeurs, parPayeur: total / payeurs };
  },
};
