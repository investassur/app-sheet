// backend/dataManager.js
// Module pour centraliser la logique de récupération et de fusion des données métier.

const { getSheetData } = require('./sheetsUtils');

/**
 * Récupère et fusionne les données des feuilles Contacts, Projets et Contrats
 * pour créer une liste unique et enrichie de prospects.
 * C'est la source de vérité unique pour les données prospects.
 */
async function getMergedProspects() {
  // Exécuter toutes les requêtes en parallèle pour plus d'efficacité
  const [contactsData, projetsData, contratsData] = await Promise.all([
    getSheetData('Contacts'),
    getSheetData('Projets Assurance de personnes'),
    getSheetData('Contrats Assurance de personnes')
  ]);

  // 1. Indexer les contacts par leur ID
  const contactsMap = new Map();
  const contactHeaders = contactsData[0];
  contactsData.slice(1).forEach(row => {
    const contact = {};
    contactHeaders.forEach((h, i) => { contact[h] = row[i] || ''; });
    if (contact.Identifiant) {
      contactsMap.set(contact.Identifiant, contact);
    }
  });

  // 2. Indexer et agréger les données des contrats par ID de contact
  const contratsMap = new Map();
  const contratHeaders = contratsData[0];
  const idContactIdx = contratHeaders.indexOf('Contact - Identifiant');
  const primeNetteIdx = contratHeaders.indexOf('Contrat - Prime nette annuelle');
  const statutContratIdx = contratHeaders.indexOf('Contrat - Statut');
  
  contratsData.slice(1).forEach(row => {
    const contactId = row[idContactIdx];
    if (!contactId) return;

    if (!contratsMap.has(contactId)) {
      contratsMap.set(contactId, { count: 0, activeCount: 0, totalPrime: 0 });
    }
    const stats = contratsMap.get(contactId);
    stats.count += 1;
    
    const statut = (row[statutContratIdx] || '').toLowerCase().trim();
    if (statut !== 'rétracté') {
        stats.activeCount += 1;
        stats.totalPrime += parseFloat(row[primeNetteIdx]) || 0;
    }
  });

  // 3. Fusionner les projets avec les contacts et les contrats
  const projetHeaders = projetsData[0];
  const mergedProspects = projetsData.slice(1).map(projetRow => {
    const projet = {};
    projetHeaders.forEach((h, i) => { projet[h] = projetRow[i] || ''; });
    
    const contactId = projet['Identifiant contact'];
    const contact = contactsMap.get(contactId) || {};
    const contratStats = contratsMap.get(contactId) || { count: 0, activeCount: 0, totalPrime: 0 };

    return {
      ...contact, // Données du contact
      ...projet, // Données du projet (écrase les doublons de contact)
      'Nom Complet': `${contact['Prénom'] || ''} ${contact['Nom'] || ''}`.trim(),
      'Nombre de contrats': contratStats.count,
      'Nombre de contrats actifs': contratStats.activeCount,
      'Portefeuille total': contratStats.totalPrime,
    };
  });

  return mergedProspects;
}

module.exports = { getMergedProspects };
