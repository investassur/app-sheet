/**
 * Service de gestion des templates d'email dans Brevo
 * 
 * Fournit des méthodes pour récupérer, créer et gérer des templates d'email
 * dans la plateforme Brevo.
 */

const { logger } = require('../utils/logger');
const { BrevoRequestError } = require('../utils/errors');

class TemplatesService {
  /**
   * @param {BrevoService} brevoService - Instance du service Brevo principal
   */
  constructor(brevoService) {
    this.brevo = brevoService;
  }
  
  /**
   * Récupère tous les templates d'email
   * 
   * @param {Object} options - Options de filtrage et pagination
   * @param {boolean} options.includeSender - Inclure les informations d'expéditeur
   * @param {number} options.limit - Nombre max de templates à récupérer
   * @param {number} options.offset - Offset pour la pagination
   * @returns {Promise<Array>} - Liste des templates
   */
  async getAll(options = {}) {
    try {
      const params = {};
      if (options.includeSender !== undefined) params.includeSender = options.includeSender;
      if (options.limit) params.limit = options.limit;
      if (options.offset) params.offset = options.offset;
      
      const response = await this.brevo.request('get', '/smtp/templates', null, params);
      logger.info(`${response.templates.length} templates d'email récupérés`);
      
      return response.templates || [];
    } catch (error) {
      logger.error('Erreur lors de la récupération des templates d\'email', error);
      throw error;
    }
  }
  
  /**
   * Récupère un template par son ID
   * 
   * @param {number} templateId - ID du template à récupérer
   * @returns {Promise<Object>} - Détails du template
   */
  async getById(templateId) {
    try {
      const response = await this.brevo.request('get', `/smtp/templates/${templateId}`);
      return response;
    } catch (error) {
      logger.error(`Erreur lors de la récupération du template ${templateId}`, error);
      throw error;
    }
  }
  
  /**
   * Crée un nouveau template d'email
   * 
   * @param {Object} templateData - Données du template
   * @param {string} templateData.name - Nom du template (obligatoire)
   * @param {string} templateData.htmlContent - Contenu HTML du template (obligatoire)
   * @param {string} templateData.subject - Sujet du template (obligatoire)
   * @param {Object} [templateData.sender] - Informations de l'expéditeur
   * @param {string} templateData.sender.name - Nom de l'expéditeur
   * @param {string} templateData.sender.email - Email de l'expéditeur
   * @param {boolean} [templateData.isActive] - Activer le template
   * @returns {Promise<Object>} - Résultat de la création
   */
  async create(templateData) {
    if (!templateData.name || !templateData.htmlContent || !templateData.subject) {
      throw new BrevoRequestError('Le nom, le sujet et le contenu HTML du template sont obligatoires');
    }
    
    try {
      // Préparation des données pour l'API
      const payload = {
        name: templateData.name,
        htmlContent: templateData.htmlContent,
        subject: templateData.subject
      };
      
      // Ajouter les champs optionnels s'ils sont présents
      if (templateData.sender) payload.sender = templateData.sender;
      if (templateData.isActive !== undefined) payload.isActive = templateData.isActive;
      if (templateData.attachmentUrl) payload.attachmentUrl = templateData.attachmentUrl;
      if (templateData.replyTo) payload.replyTo = templateData.replyTo;
      if (templateData.toField) payload.toField = templateData.toField;
      
      // Création du template
      const response = await this.brevo.request('post', '/smtp/templates', payload);
      logger.info(`Template d'email "${templateData.name}" créé avec succès (ID: ${response.id})`);
      
      return {
        success: true,
        message: 'Template créé avec succès',
        id: response.id,
        data: response
      };
    } catch (error) {
      logger.error(`Erreur lors de la création du template "${templateData.name}"`, error);
      throw error;
    }
  }
  
  /**
   * Met à jour un template existant
   * 
   * @param {number} templateId - ID du template à mettre à jour
   * @param {Object} templateData - Nouvelles données du template
   * @returns {Promise<Object>} - Résultat de la mise à jour
   */
  async update(templateId, templateData) {
    try {
      // Préparation des données pour l'API
      const payload = {};
      
      // Ajouter seulement les champs fournis
      if (templateData.name) payload.name = templateData.name;
      if (templateData.htmlContent) payload.htmlContent = templateData.htmlContent;
      if (templateData.subject) payload.subject = templateData.subject;
      if (templateData.sender) payload.sender = templateData.sender;
      if (templateData.isActive !== undefined) payload.isActive = templateData.isActive;
      if (templateData.attachmentUrl) payload.attachmentUrl = templateData.attachmentUrl;
      if (templateData.replyTo) payload.replyTo = templateData.replyTo;
      if (templateData.toField) payload.toField = templateData.toField;
      
      // Mise à jour du template
      await this.brevo.request('put', `/smtp/templates/${templateId}`, payload);
      logger.info(`Template d'email ${templateId} mis à jour avec succès`);
      
      return {
        success: true,
        message: 'Template mis à jour avec succès',
        id: templateId
      };
    } catch (error) {
      logger.error(`Erreur lors de la mise à jour du template ${templateId}`, error);
      throw error;
    }
  }
  
  /**
   * Supprime un template existant
   * 
   * @param {number} templateId - ID du template à supprimer
   * @returns {Promise<Object>} - Résultat de la suppression
   */
  async delete(templateId) {
    try {
      await this.brevo.request('delete', `/smtp/templates/${templateId}`);
      logger.info(`Template d'email ${templateId} supprimé avec succès`);
      
      return {
        success: true,
        message: 'Template supprimé avec succès',
        id: templateId
      };
    } catch (error) {
      logger.error(`Erreur lors de la suppression du template ${templateId}`, error);
      throw error;
    }
  }
  
  /**
   * Teste un template en l'envoyant à des adresses email spécifiques
   * 
   * @param {number} templateId - ID du template à tester
   * @param {Array<string>} emails - Emails des destinataires pour le test
   * @returns {Promise<Object>} - Résultat du test
   */
  async sendTest(templateId, emails) {
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      throw new BrevoRequestError('La liste des emails pour le test est vide ou invalide');
    }
    
    try {
      const payload = { emailTo: emails };
      
      await this.brevo.request('post', `/smtp/templates/${templateId}/sendTest`, payload);
      logger.info(`Email test du template ${templateId} envoyé à ${emails.join(', ')}`);
      
      return {
        success: true,
        message: `Email test envoyé à ${emails.join(', ')}`,
        id: templateId
      };
    } catch (error) {
      logger.error(`Erreur lors de l'envoi du test du template ${templateId}`, error);
      throw error;
    }
  }
}

module.exports = TemplatesService;