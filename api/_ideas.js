const { redis, pipeline, flatToItems } = require('./_lib');
const CATEGORIES = ['Activité', 'Resto / bar', 'Défi pour Elie', 'Soirée', 'Hébergement', 'Transport', 'Autre'];

// Charge toutes les idées avec likes + commentaires. viewerId = membre qui regarde (pour "j'ai liké" / "c'est à moi").
async function loadIdeas(viewerId, { includeHidden = false } = {}) {
  const raw = (await redis('HGETALL', 'evg:ideas')) || [];
  let ideas = flatToItems(raw);
  if (!includeHidden) ideas = ideas.filter(i => i.statut !== 'cachee');
  const cmds = []; ideas.forEach(i => { cmds.push(['HKEYS', `evg:ilikes:${i.id}`]); cmds.push(['HGETALL', `evg:icom:${i.id}`]); });
  const res = await pipeline(cmds);
  return ideas.map((i, k) => {
    const likers = res[k * 2] || [];
    const comments = flatToItems(res[k * 2 + 1]).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return {
      id: i.id, titre: i.titre, description: i.description, categorie: i.categorie, prix: i.prix || 0, lien: i.lien || '',
      auteur: i.auteur, createdAt: i.createdAt, statut: i.statut || 'nouvelle', note: i.note || '',
      likes: likers.length, jaime: viewerId ? likers.includes(viewerId) : false, mine: !!viewerId && i.auteurId === viewerId,
      likers: includeHidden ? likers : undefined,
      comments: comments.map(c => ({ id: c.id, auteur: c.auteur, texte: c.texte, createdAt: c.createdAt, mine: !!viewerId && c.auteurId === viewerId })),
    };
  });
}
module.exports = { loadIdeas, CATEGORIES };
