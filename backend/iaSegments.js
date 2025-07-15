// backend/iaSegments.js
// Détection automatique de plusieurs segments IA dynamiques en utilisant le dataManager.

const { getMergedProspects } = require('./dataManager');

async function detectSegments(filters = {}) {
  let prospects = await getMergedProspects();
  const now = new Date();

  // Appliquer les filtres dynamiques si fournis
  const filteredProspects = prospects.filter(p => {
    const age = p['Âge'] ? parseInt(p['Âge'], 10) : null;
    const statut = (p['Statut'] || '').toLowerCase();
    const ville = (p['Ville'] || '').toLowerCase();
    const departement = (p['Département'] || '').toLowerCase(); // Assumons une colonne 'Département'
    const pays = (p['Pays'] || '').toLowerCase(); // Assumons une colonne 'Pays'
    const typeProduit = (p['Type de produit'] || '').toLowerCase(); // Assumons une colonne 'Type de produit'
    const scoreIa = p['Score IA'] ? parseInt(p['Score IA'], 10) : null; // Assumons une colonne 'Score IA'
    const nbContrats = p['Nombre de contrats'] || 0;
    const estClient = nbContrats > 0; // Un client a au moins un contrat

    if (filters.ageMin && (age === null || age < filters.ageMin)) return false;
    if (filters.ageMax && (age === null || age > filters.ageMax)) return false;
    if (filters.ville && !ville.includes(filters.ville.toLowerCase())) return false;
    if (filters.departement && !departement.includes(filters.departement.toLowerCase())) return false;
    if (filters.pays && !pays.includes(filters.pays.toLowerCase())) return false;
    if (filters.typeProduit && !typeProduit.includes(filters.typeProduit.toLowerCase())) return false;
    if (filters.statut && !statut.includes(filters.statut.toLowerCase())) return false;
    if (filters.scoreIaMin && (scoreIa === null || scoreIa < filters.scoreIaMin)) return false;
    if (filters.scoreIaMax && (scoreIa === null || scoreIa > filters.scoreIaMax)) return false;
    
    if (typeof filters.estClient === 'boolean') {
      if (filters.estClient && !estClient) return false;
      if (!filters.estClient && estClient) return false;
    }

    return true;
  });

  // Si des filtres sont appliqués (manuellement ou par l'IA), on retourne un segment unique
  if (Object.keys(filters).length > 0) {
    return {
      "Résultat de la recherche IA": filteredProspects
    };
  }

  // Sinon, on retourne les segments dynamiques habituels
  const segments = {
    'Non joignables': [],
    'Devis sans réponse (plus de 5 jours)': [],
    'Prospects froids (plus de 15 jours)': [],
    'Nouveaux prospects (moins de 24h)': [],
    'Clients avec 1 seul produit': [],
    'Par région': {},
  };

  filteredProspects.forEach(prospect => { // Utiliser filteredProspects ici aussi
    const statut = (prospect['Statut'] || '').toLowerCase();
    const dateCreationStr = prospect['Date de création'];
    const dateCreation = dateCreationStr ? new Date(dateCreationStr.split('/').reverse().join('-')) : null; // Gère le format DD/MM/YYYY
    const ville = prospect['Ville'];
    const nbContrats = prospect['Nombre de contrats'];

    // Non joignables (statut exact "ne répond pas")
    if (statut === 'ne répond pas') {
      segments['Non joignables'].push(prospect);
    }

    // Devis sans réponse (> 5 jours)
    if (statut.includes('devis envoyé') && dateCreation && (now - dateCreation) > 5 * 24 * 3600 * 1000) {
      segments['Devis sans réponse (plus de 5 jours)'].push(prospect);
    }
    
    // Prospects froids (> 15 jours)
    if (dateCreation && (now - dateCreation) > 15 * 24 * 3600 * 1000 && !statut.includes('contrat signé')) {
      segments['Prospects froids (plus de 15 jours)'].push(prospect);
    }

    // Nouveaux prospects (< 24h)
    if (dateCreation && (now - dateCreation) < 1 * 24 * 3600 * 1000) {
      segments['Nouveaux prospects (moins de 24h)'].push(prospect);
    }

    // Clients avec 1 seul produit (pour cross-sell)
    if (nbContrats === 1 && statut.includes('contrat signé')) {
        segments['Clients avec 1 seul produit'].push(prospect);
    }

    // Par région
    if (ville) {
      if (!segments['Par région'][ville]) {
        segments['Par région'][ville] = [];
      }
      segments['Par région'][ville].push(prospect);
    }
  });

  return segments;
}

module.exports = { detectSegments };
