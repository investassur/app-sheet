/**
 * Service de gestion des contacts dans Brevo
 * 
 * Fournit des méthodes pour créer, mettre à jour, supprimer et gérer des contacts
 * dans la plateforme Brevo.
 */

const { validateContact } = require('../utils/validators');
const { logger } = require('../utils/logger');
const { BrevoRequestError } = require('../utils/errors');

class ContactsService {
  /**
   * @param {BrevoService} brevoService - Instance du service Brevo principal
   */
  constructor(brevoService) {
    this.brevo = brevoService;
  }
  
  /**
   * Vérifie si un contact existe dans Brevo
   * 
   * @param {string} email - Email du contact à vérifier
   * @returns {Promise<Object|null>} - Données du contact ou null s'il n'existe pas
   */
  async exists(email) {
    try {
      const response = await this.brevo.request('get', `/contacts/${encodeURIComponent(email)}`);
      return response;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      throw error;
    }
  }
  
  /**
   * Crée un nouveau contact dans Brevo
   * 
   * @param {Object} contactData - Données du contact
   * @param {string} contactData.email - Email du contact (obligatoire)
   * @param {Object} contactData.attributes - Attributs du contact (NOM, PRENOM, etc.)
   * @param {Array<number>} [contactData.listIds] - IDs des listes auxquelles ajouter le contact
   * @param {Object} options - Options supplémentaires
   * @param {boolean} options.updateIfExists - Mettre à jour le contact s'il existe déjà
   * @param {boolean} options.skipValidation - Ignorer la validation des données
   * @returns {Promise<Object>} - Résultat de la création
   */
  async create(contactData, options = {}) {
    const { updateIfExists = true, skipValidation = false } = options;
    
    // Validation des données
    if (!skipValidation) {
      const validationErrors = validateContact(contactData);
      if (validationErrors.length > 0) {
        throw new BrevoRequestError(`Validation du contact échouée: ${validationErrors.join(", ")}`);
      }
    }
    
    try {
      // Vérifier si le contact existe déjà
      if (updateIfExists) {
        const existingContact = await this.exists(contactData.email);
        if (existingContact) {
          logger.info(`Contact ${contactData.email} existe déjà, mise à jour`);
          return await this.update(contactData.email, contactData);
        }
      }
      
      // Préparation des données
      const payload = {
        email: contactData.email,
        attributes: contactData.attributes || {},
        listIds: contactData.listIds || [],
        updateEnabled: contactData.updateEnabled !== undefined ? contactData.updateEnabled : true,
        smsBlacklisted: contactData.smsBlacklisted || false,
        emailBlacklisted: contactData.emailBlacklisted || false
      };
      
      // Création du contact
      const response = await this.brevo.request('post', '/contacts', payload);
      logger.info(`Contact ${contactData.email} créé avec succès`);
      return {
        success: true,
        message: 'Contact créé avec succès',
        id: response.id,
        data: response
      };
    } catch (error) {
      // Gestion spéciale de l'erreur "contact already exists"
      if (error.response && 
          error.response.status === 400 && 
          error.response.data.code === 'duplicate_parameter' &&
          updateIfExists) {
        logger.info(`Contact ${contactData.email} existe déjà (duplicate_parameter), mise à jour`);
        return await this.update(contactData.email, contactData);
      }
      
      logger.error(`Erreur lors de la création du contact ${contactData.email}`, error);
      throw error;
    }
  }
  
  /**
   * Met à jour un contact existant dans Brevo
   * 
   * @param {string} email - Email du contact à mettre à jour
   * @param {Object} contactData - Nouvelles données du contact
   * @param {Object} contactData.attributes - Attributs à mettre à jour
   * @param {Array<number>} [contactData.listIds] - IDs des listes à ajouter
   * @param {Array<number>} [contactData.unlinkListIds] - IDs des listes à retirer
   * @param {Object} options - Options supplémentaires
   * @returns {Promise<Object>} - Résultat de la mise à jour
   */
  async update(email, contactData, options = {}) {
    try {
      // Préparation des données
      const payload = {
        attributes: contactData.attributes || {},
        emailBlacklisted: contactData.emailBlacklisted,
        smsBlacklisted: contactData.smsBlacklisted,
        listIds: contactData.listIds,
        unlinkListIds: contactData.unlinkListIds,
        updateEnabled: contactData.updateEnabled
      };
      
      // Supprimer les propriétés undefined
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) delete payload[key];
      });
      
      // Mise à jour du contact
      await this.brevo.request('put', `/contacts/${encodeURIComponent(email)}`, payload);
      logger.info(`Contact ${email} mis à jour avec succès`);
      
      return {
        success: true,
        message: 'Contact mis à jour avec succès',
        email
      };
    } catch (error) {
      logger.error(`Erreur lors de la mise à jour du contact ${email}`, error);
      
      // Si le contact n'existe pas et qu'on doit le créer
      if (error.response && 
          error.response.status === 404 && 
          options.createIfNotExists) {
        logger.info(`Contact ${email} n'existe pas, création`);
        return await this.create({
          ...contactData,
          email
        });
      }
      
      throw error;
    }
  }
  
  /**
   * Supprime un contact de Brevo
   * 
   * @param {string} email - Email du contact à supprimer
   * @returns {Promise<Object>} - Résultat de la suppression
   */
  async delete(email) {
    try {
      await this.brevo.request('delete', `/contacts/${encodeURIComponent(email)}`);
      logger.info(`Contact ${email} supprimé avec succès`);
      
      return {
        success: true,
        message: 'Contact supprimé avec succès',
        email
      };
    } catch (error) {
      logger.error(`Erreur lors de la suppression du contact ${email}`, error);
      
      // Si le contact n'existe pas, considérer comme un succès
      if (error.response && error.response.status === 404) {
        return {
          success: true,
          message: 'Contact déjà supprimé ou inexistant',
          email
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Importe plusieurs contacts en une seule opération
   * 
   * @param {Array<Object>} contacts - Liste des contacts à importer
   * @param {Object} options - Options d'import
   * @param {boolean} options.updateExisting - Mettre à jour les contacts existants
   * @param {Array<number>} options.listIds - IDs des listes auxquelles ajouter les contacts
   * @returns {Promise<Object>} - Résultat de l'import
   */
  async importContacts(contacts, options = {}) {
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      throw new BrevoRequestError('La liste des contacts est vide ou invalide');
    }
    
    try {
      // Préparation des données pour l'API Brevo
      const payload = {
        contacts: contacts.map(contact => ({
          email: contact.email,
          attributes: contact.attributes || {}
        })),
        updateExisting: options.updateExisting !== undefined ? options.updateExisting : true
      };
      
      // Ajouter les listIds si fournis
      if (options.listIds && Array.isArray(options.listIds) && options.listIds.length > 0) {
        payload.listIds = options.listIds;
      }
      
      // Import des contacts
      const response = await this.brevo.request('post', '/contacts/import', payload);
      logger.info(`${contacts.length} contacts importés avec succès`);
      
      return {
        success: true,
        message: `${contacts.length} contacts importés avec succès`,
        processId: response.processId,
        data: response
      };
    } catch (error) {
      logger.error(`Erreur lors de l'import de ${contacts.length} contacts`, error);
      throw error;
    }
  }
  
  /**
   * Recherche des contacts selon des critères
   * 
   * @param {Object} criteria - Critères de recherche
   * @param {Object} options - Options de pagination
   * @param {number} options.limit - Nombre max de résultats (défaut: 50)
   * @param {number} options.offset - Offset pour la pagination (défaut: 0)
   * @returns {Promise<Object>} - Résultats de la recherche
   */
  async search(criteria = {}, options = {}) {
    try {
      const payload = {
        ...criteria,
        limit: options.limit || 50,
        offset: options.offset || 0
      };
      
      const response = await this.brevo.request('post', '/contacts/search', payload);
      
      return {
        success: true,
        contacts: response.contacts || [],
        count: response.count,
        total: response.total
      };
    } catch (error) {
      logger.error('Erreur lors de la recherche de contacts', error);
      throw error;
    }
  }
  
  /**
   * Obtient les statistiques des contacts
   * 
   * @returns {Promise<Object>} - Statistiques des contacts
   */
  async getStats() {
    try {
      const response = await this.brevo.request('get', '/contacts/statistics');
      return response;
    } catch (error) {
      logger.error('Erreur lors de la récupération des statistiques des contacts', error);
      throw error;
    }
  }
}

module.exports = ContactsService;