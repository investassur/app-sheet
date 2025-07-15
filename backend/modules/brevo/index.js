/**
 * Module d'intégration Brevo pour CRM
 * 
 * Point d'entrée principal du module qui expose toutes les fonctionnalités
 * liées à l'intégration avec Brevo (anciennement Sendinblue).
 */

const BrevoService = require('./services/BrevoService');
const { setupRoutes } = require('./routes');

// Exportation des classes et fonctions principales
module.exports = {
  BrevoService,
  setupRoutes,
  
  // Fonctions utilitaires directement accessibles
  createContact: async (contactData, options = {}) => {
    const brevo = new BrevoService();
    return await brevo.contacts.create(contactData, options);
  },
  
  addContactsToList: async (listId, contacts, options = {}) => {
    const brevo = new BrevoService();
    return await brevo.lists.addContacts(listId, contacts, options);
  },
  
  createCampaign: async (campaignData, options = {}) => {
    const brevo = new BrevoService();
    return await brevo.campaigns.create(campaignData, options);
  },
  
  // Pour la migration depuis l'ancien code
  migrateFromLegacy: require('./utils/migration')
};