/**
 * Service de gestion des listes de contacts dans Brevo
 * 
 * Fournit des méthodes pour créer, gérer et manipuler des listes de contacts
 * dans la plateforme Brevo.
 */

const { logger } = require('../utils/logger');
const { BrevoRequestError } = require('../utils/errors');

class ListsService {
  /**
   * @param {BrevoService} brevoService - Instance du service Brevo principal
   */
  constructor(brevoService) {
    this.brevo = brevoService;
  }
  
  /**
   * Récupère toutes les listes de contacts
   * 
   * @param {Object} options - Options de pagination
   * @param {number} options.limit - Nombre max de listes à récupérer
   * @param {number} options.offset - Offset pour la pagination
   * @param {number} options.folderId - Filtrer par dossier
   * @returns {Promise<Array>} - Liste des listes de contacts
   */
  async getAll(options = {}) {
    try {
      const params = {};
      if (options.limit) params.limit = options.limit;
      if (options.offset) params.offset = options.offset;
      if (options.folderId) params.folderId = options.folderId;
      
      const response = await this.brevo.request('get', '/contacts/lists', null, params);
      return response.lists || [];
    } catch (error) {
      logger.error('Erreur lors de la récupération des listes', error);
      throw error;
    }
  }
  
  /**
   * Récupère une liste par son ID
   * 
   * @param {number} listId - ID de la liste à récupérer
   * @returns {Promise<Object>} - Détails de la liste
   */
  async getById(listId) {
    try {
      const response = await this.brevo.request('get', `/contacts/lists/${listId}`);
      return response;
    } catch (error) {
      logger.error(`Erreur lors de la récupération de la liste ${listId}`, error);
      throw error;
    }
  }
  
  /**
   * Crée une nouvelle liste de contacts
   * 
   * @param {Object} listData - Données de la liste
   * @param {string} listData.name - Nom de la liste (obligatoire)
   * @param {number} [listData.folderId] - ID du dossier contenant la liste
   * @returns {Promise<Object>} - Résultat de la création
   */
  async create(listData) {
    if (!listData.name) {
      throw new BrevoRequestError('Le nom de la liste est obligatoire');
    }
    
    try {
      const payload = {
        name: listData.name,
        folderId: listData.folderId || 1 // Dossier par défaut
      };
      
      const response = await this.brevo.request('post', '/contacts/lists', payload);
      logger.info(`Liste "${listData.name}" créée avec succès (ID: ${response.id})`);
      
      return {
        success: true,
        message: 'Liste créée avec succès',
        id: response.id,
        data: response
      };
    } catch (error) {
      logger.error(`Erreur lors de la création de la liste "${listData.name}"`, error);
      throw error;
    }
  }
  
  /**
   * Met à jour une liste existante
   * 
   * @param {number} listId - ID de la liste à mettre à jour
   * @param {Object} listData - Nouvelles données de la liste
   * @param {string} listData.name - Nouveau nom de la liste
   * @returns {Promise<Object>} - Résultat de la mise à jour
   */
  async update(listId, listData) {
    if (!listData.name) {
      throw new BrevoRequestError('Le nom de la liste est obligatoire pour la mise à jour');
    }
    
    try {
      const payload = { name: listData.name };
      
      await this.brevo.request('put', `/contacts/lists/${listId}`, payload);
      logger.info(`Liste ${listId} mise à jour avec succès`);
      
      return {
        success: true,
        message: 'Liste mise à jour avec succès',
        id: listId
      };
    } catch (error) {
      logger.error(`Erreur lors de la mise à jour de la liste ${listId}`, error);
      throw error;
    }
  }
  
  /**
   * Supprime une liste existante
   * 
   * @param {number} listId - ID de la liste à supprimer
   * @returns {Promise<Object>} - Résultat de la suppression
   */
  async delete(listId) {
    try {
      await this.brevo.request('delete', `/contacts/lists/${listId}`);
      logger.info(`Liste ${listId} supprimée avec succès`);
      
      return {
        success: true,
        message: 'Liste supprimée avec succès',
        id: listId
      };
    } catch (error) {
      logger.error(`Erreur lors de la suppression de la liste ${listId}`, error);
      throw error;
    }
  }
  
  /**
   * Ajoute des contacts à une liste
   * 
   * @param {number} listId - ID de la liste
   * @param {Array} contacts - Contacts à ajouter (objets ou emails)
   * @param {Object} options - Options supplémentaires
   * @param {boolean} options.createContacts - Créer les contacts s'ils n'existent pas
   * @returns {Promise<Object>} - Résultat de l'opération
   */
  async addContacts(listId, contacts, options = {}) {
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      throw new BrevoRequestError('La liste des contacts est vide ou invalide');
    }
    
    // Extraire les emails et normaliser les contacts
    const contactsData = contacts.map(contact => {
      // Si c'est un objet avec un email
      if (typeof contact === 'object' && contact !== null) {
        return {
          email: contact.email || contact.Email,
          attributes: this._extractAttributes(contact)
        };
      }
      // Si c'est directement un email
      else if (typeof contact === 'string' && contact.includes('@')) {
        return { email: contact, attributes: {} };
      }
      return null;
    }).filter(c => c !== null && c.email);
    
    if (contactsData.length === 0) {
      logger.warn('Aucun contact valide à ajouter à la liste');
      return { 
        success: false, 
        message: 'Aucun contact valide à ajouter à la liste', 
        added: 0, 
        total: contacts.length 
      };
    }
    
    try {
      // Si on doit créer les contacts d'abord
      if (options.createContacts) {
        await this._createContactsBatch(contactsData);
      }
      
      // Ajouter les contacts à la liste par lots
      const batchSize = 100; // Taille maximale recommandée par Brevo
      let totalAdded = 0;
      
      for (let i = 0; i < contactsData.length; i += batchSize) {
        const batch = contactsData.slice(i, i + batchSize);
        const emails = batch.map(c => c.email);
        
        try {
          await this.brevo.request('post', `/contacts/lists/${listId}/contacts/add`, { emails });
          totalAdded += emails.length;
          logger.info(`${emails.length} contacts ajoutés à la liste ${listId} (lot ${i/batchSize + 1})`);
        } catch (error) {
          // Gérer l'erreur "contacts déjà dans la liste"
          if (error.response && 
              error.response.status === 400 && 
              error.response.data.code === 'invalid_parameter' &&
              error.response.data.message.includes('Contact already in list')) {
            logger.info(`Certains contacts étaient déjà dans la liste ${listId} (lot ${i/batchSize + 1})`);
            totalAdded += emails.length; // On considère qu'ils sont ajoutés
          } else {
            throw error;
          }
        }
      }
      
      return {
        success: true,
        message: `${totalAdded} contacts ajoutés à la liste ${listId}`,
        added: totalAdded,
        total: contactsData.length
      };
    } catch (error) {
      logger.error(`Erreur lors de l'ajout de contacts à la liste ${listId}`, error);
      throw error;
    }
  }
  
  /**
   * Supprime des contacts d'une liste
   * 
   * @param {number} listId - ID de la liste
   * @param {Array<string>} emails - Emails des contacts à supprimer
   * @returns {Promise<Object>} - Résultat de l'opération
   */
  async removeContacts(listId, emails) {
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      throw new BrevoRequestError('La liste des emails est vide ou invalide');
    }
    
    try {
      // Supprimer les contacts de la liste par lots
      const batchSize = 100;
      let totalRemoved = 0;
      
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        
        await this.brevo.request('post', `/contacts/lists/${listId}/contacts/remove`, { emails: batch });
        totalRemoved += batch.length;
        logger.info(`${batch.length} contacts supprimés de la liste ${listId} (lot ${i/batchSize + 1})`);
      }
      
      return {
        success: true,
        message: `${totalRemoved} contacts supprimés de la liste ${listId}`,
        removed: totalRemoved,
        total: emails.length
      };
    } catch (error) {
      logger.error(`Erreur lors de la suppression de contacts de la liste ${listId}`, error);
      throw error;
    }
  }
  
  /**
   * Récupère les contacts d'une liste
   * 
   * @param {number} listId - ID de la liste
   * @param {Object} options - Options de pagination
   * @returns {Promise<Object>} - Contacts de la liste
   */
  async getContacts(listId, options = {}) {
    try {
      const params = {};
      if (options.limit) params.limit = options.limit;
      if (options.offset) params.offset = options.offset;
      if (options.modifiedSince) params.modifiedSince = options.modifiedSince;
      
      const response = await this.brevo.request('get', `/contacts/lists/${listId}/contacts`, null, params);
      
      return {
        success: true,
        contacts: response.contacts || [],
        count: response.count,
        total: response.total
      };
    } catch (error) {
      logger.error(`Erreur lors de la récupération des contacts de la liste ${listId}`, error);
      throw error;
    }
  }
  
  /**
   * Crée des contacts en lot avant de les ajouter à une liste
   * @private
   */
  async _createContactsBatch(contacts) {
    try {
      // On utilise l'endpoint batch pour créer les contacts
      const payload = { contacts, updateExisting: true };
      await this.brevo.request('post', '/contacts/batch', payload);
      logger.info(`${contacts.length} contacts créés ou mis à jour en masse`);
    } catch (error) {
      logger.error(`Erreur lors de la création en masse des contacts`, error);
      throw error;
    }
  }
  
  /**
   * Extrait les attributs d'un objet contact pour Brevo
   * @private
   */
  _extractAttributes(contact) {
    const attributes = {};
    
    // Mappings courants des champs
    const mappings = {
      'Nom': 'NOM',
      'nom': 'NOM',
      'name': 'NOM',
      'lastName': 'NOM',
      'last_name': 'NOM',
      
      'Prenom': 'PRENOM',
      'prenom': 'PRENOM',
      'firstName': 'PRENOM',
      'first_name': 'PRENOM',
      
      'Telephone': 'TELEPHONE',
      'telephone': 'TELEPHONE',
      'phone': 'TELEPHONE',
      'tel': 'TELEPHONE',
      
      'Societe': 'SOCIETE',
      'societe': 'SOCIETE',
      'company': 'SOCIETE',
      'entreprise': 'SOCIETE',
      
      'Adresse': 'ADRESSE',
      'adresse': 'ADRESSE',
      'address': 'ADRESSE',
      
      'CodePostal': 'CODE_POSTAL',
      'codePostal': 'CODE_POSTAL',
      'code_postal': 'CODE_POSTAL',
      'zip': 'CODE_POSTAL',
      'zipCode': 'CODE_POSTAL',
      
      'Ville': 'VILLE',
      'ville': 'VILLE',
      'city': 'VILLE'
    };
    
    // Extraire les attributs connus
    Object.keys(contact).forEach(key => {
      // Ignorer l'email qui est traité séparément
      if (key === 'email' || key === 'Email') return;
      
      // Si le champ est dans les mappings, utiliser la version Brevo
      if (mappings[key]) {
        attributes[mappings[key]] = contact[key];
      } 
      // Sinon, utiliser le nom du champ en majuscules
      else if (!['id', '_id', 'ID'].includes(key)) {
        attributes[key.toUpperCase()] = contact[key];
      }
    });
    
    return attributes;
  }
}

module.exports = ListsService;