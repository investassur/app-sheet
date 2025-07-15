// backend/iaSegmentation.js
// Logique IA pour détecter les contacts "ne répond pas" en utilisant le dataManager.

const { getMergedProspects } = require('./dataManager');

/**
 * Détecte les prospects ayant le statut "ne répond pas".
 * @returns {Promise<Array<Object>>} - Une promesse qui résout en un tableau d'objets prospects complets.
 */
async function detectNonRepondants() {
  const prospects = await getMergedProspects();

  const nonRepondants = prospects.filter(prospect => {
    const statut = (prospect['Statut'] || '').toLowerCase();
    return statut === 'ne répond pas';
  });

  return nonRepondants;
}

module.exports = { detectNonRepondants };
