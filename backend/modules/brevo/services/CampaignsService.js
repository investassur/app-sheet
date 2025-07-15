/**
 * Service de gestion des campagnes email dans Brevo
 * 
 * Fournit des méthodes pour créer, gérer et suivre des campagnes email
 * dans la plateforme Brevo.
 */

const { logger } = require('../utils/logger');
const { validateCampaign } = require('../utils/validators');
const { BrevoRequestError } = require('../utils/errors');

class CampaignsService {
  /**
   * @param {BrevoService} brevoService - Instance du service Brevo principal
   */
  constructor(brevoService) {
    this.brevo = brevoService;
  }
  
  /**
   * Récupère toutes les campagnes email
   * 
   * @param {Object} options - Options de filtrage et pagination
   * @param {string} options.type - Type de campagne (classic, trigger, sms, push)
   * @param {string} options.status - Statut de la campagne (draft, sent, archive, queued, suspended, in_process)
   * @param {number} options.limit - Nombre max de campagnes à récupérer
   * @param {number} options.offset - Offset pour la pagination
   * @returns {Promise<Array>} - Liste des campagnes
   */
  async getAll(options = {}) {
    try {
      const params = {};
      if (options.type) params.type = options.type;
      if (options.status) params.status = options.status;
      if (options.limit) params.limit = options.limit;
      if (options.offset) params.offset = options.offset;
      
      const response = await this.brevo.request('get', '/emailCampaigns', null, params);
      logger.info(`${response.campaigns.length} campagnes email récupérées`);
      
      return response.campaigns || [];
    } catch (error) {
      logger.error('Erreur lors de la récupération des campagnes email', error);
      throw error;
    }
  }
  
  /**
   * Récupère une campagne par son ID
   * 
   * @param {number} campaignId - ID de la campagne à récupérer
   * @returns {Promise<Object>} - Détails de la campagne
   */
  async getById(campaignId) {
    try {
      const response = await this.brevo.request('get', `/emailCampaigns/${campaignId}`);
      return response;
    } catch (error) {
      logger.error(`Erreur lors de la récupération de la campagne ${campaignId}`, error);
      throw error;
    }
  }
  
  /**
   * Crée une nouvelle campagne email
   * 
   * @param {Object} campaignData - Données de la campagne
   * @param {string} campaignData.name - Nom de la campagne (obligatoire)
   * @param {string} campaignData.subject - Sujet de l'email (obligatoire)
   * @param {string} campaignData.htmlContent - Contenu HTML de l'email (obligatoire)
   * @param {Object} campaignData.sender - Informations de l'expéditeur (obligatoire)
   * @param {string} campaignData.sender.name - Nom de l'expéditeur
   * @param {string} campaignData.sender.email - Email de l'expéditeur
   * @param {Object} campaignData.recipients - Destinataires de la campagne (obligatoire)
   * @param {Array<number>} campaignData.recipients.listIds - IDs des listes de contacts
   * @param {string} [campaignData.scheduledAt] - Date d'envoi programmé (ISO 8601)
   * @param {boolean} [campaignData.sendAtBestTime] - Envoyer à la meilleure heure
   * @param {Object} options - Options supplémentaires
   * @param {boolean} options.skipValidation - Ignorer la validation des données
   * @returns {Promise<Object>} - Résultat de la création
   */
  async create(campaignData, options = {}) {
    // Validation des données
    if (!options.skipValidation) {
      const validationErrors = validateCampaign(campaignData);
      if (validationErrors.length > 0) {
        throw new BrevoRequestError(`Validation de la campagne échouée: ${validationErrors.join(", ")}`);
      }
    }
    
    try {
      // Préparation des données pour l'API
      const payload = {
        name: campaignData.name,
        subject: campaignData.subject,
        sender: {
          name: campaignData.sender.name,
          email: campaignData.sender.email
        },
        type: campaignData.type || 'classic',
        htmlContent: campaignData.htmlContent,
        recipients: campaignData.recipients
      };
      
      // Ajouter les champs optionnels s'ils sont présents
      if (campaignData.scheduledAt) payload.scheduledAt = campaignData.scheduledAt;
      if (campaignData.sendAtBestTime !== undefined) payload.sendAtBestTime = campaignData.sendAtBestTime;
      if (campaignData.abTesting !== undefined) payload.abTesting = campaignData.abTesting;
      if (campaignData.textContent) payload.textContent = campaignData.textContent;
      if (campaignData.replyTo) payload.replyTo = campaignData.replyTo;
      if (campaignData.toField) payload.toField = campaignData.toField;
      if (campaignData.tag) payload.tag = campaignData.tag;
      if (campaignData.templateId) payload.templateId = campaignData.templateId;
      if (campaignData.params) payload.params = campaignData.params;
      if (campaignData.attachmentUrl) payload.attachmentUrl = campaignData.attachmentUrl;
      if (campaignData.mirrorActive !== undefined) payload.mirrorActive = campaignData.mirrorActive;
      if (campaignData.footer) payload.footer = campaignData.footer;
      if (campaignData.header) payload.header = campaignData.header;
      if (campaignData.utmCampaign) payload.utmCampaign = campaignData.utmCampaign;
      if (campaignData.inlineImageActivation !== undefined) payload.inlineImageActivation = campaignData.inlineImageActivation;
      
      // Création de la campagne
      const response = await this.brevo.request('post', '/emailCampaigns', payload);
      logger.info(`Campagne email "${campaignData.name}" créée avec succès (ID: ${response.id})`);
      
      return {
        success: true,
        message: 'Campagne créée avec succès',
        id: response.id,
        data: response
      };
    } catch (error) {
      logger.error(`Erreur lors de la création de la campagne "${campaignData.name}"`, error);
      throw error;
    }
  }
  
  /**
   * Met à jour une campagne existante
   * 
   * @param {number} campaignId - ID de la campagne à mettre à jour
   * @param {Object} campaignData - Nouvelles données de la campagne
   * @returns {Promise<Object>} - Résultat de la mise à jour
   */
  async update(campaignId, campaignData) {
    try {
      // Préparation des données pour l'API
      const payload = {};
      
      // Ajouter seulement les champs fournis
      if (campaignData.name) payload.name = campaignData.name;
      if (campaignData.subject) payload.subject = campaignData.subject;
      if (campaignData.sender) payload.sender = campaignData.sender;
      if (campaignData.htmlContent) payload.htmlContent = campaignData.htmlContent;
      if (campaignData.textContent) payload.textContent = campaignData.textContent;
      if (campaignData.recipients) payload.recipients = campaignData.recipients;
      if (campaignData.scheduledAt) payload.scheduledAt = campaignData.scheduledAt;
      if (campaignData.sendAtBestTime !== undefined) payload.sendAtBestTime = campaignData.sendAtBestTime;
      if (campaignData.abTesting !== undefined) payload.abTesting = campaignData.abTesting;
      if (campaignData.replyTo) payload.replyTo = campaignData.replyTo;
      if (campaignData.toField) payload.toField = campaignData.toField;
      if (campaignData.tag) payload.tag = campaignData.tag;
      if (campaignData.params) payload.params = campaignData.params;
      if (campaignData.mirrorActive !== undefined) payload.mirrorActive = campaignData.mirrorActive;
      if (campaignData.footer) payload.footer = campaignData.footer;
      if (campaignData.header) payload.header = campaignData.header;
      if (campaignData.utmCampaign) payload.utmCampaign = campaignData.utmCampaign;
      if (campaignData.inlineImageActivation !== undefined) payload.inlineImageActivation = campaignData.inlineImageActivation;
      
      // Mise à jour de la campagne
      await this.brevo.request('put', `/emailCampaigns/${campaignId}`, payload);
      logger.info(`Campagne email ${campaignId} mise à jour avec succès`);
      
      return {
        success: true,
        message: 'Campagne mise à jour avec succès',
        id: campaignId
      };
    } catch (error) {
      logger.error(`Erreur lors de la mise à jour de la campagne ${campaignId}`, error);
      throw error;
    }
  }
  
  /**
   * Supprime une campagne existante
   * 
   * @param {number} campaignId - ID de la campagne à supprimer
   * @returns {Promise<Object>} - Résultat de la suppression
   */
  async delete(campaignId) {
    try {
      await this.brevo.request('delete', `/emailCampaigns/${campaignId}`);
      logger.info(`Campagne email ${campaignId} supprimée avec succès`);
      
      return {
        success: true,
        message: 'Campagne supprimée avec succès',
        id: campaignId
      };
    } catch (error) {
      logger.error(`Erreur lors de la suppression de la campagne ${campaignId}`, error);
      throw error;
    }
  }
  
  /**
   * Envoie immédiatement une campagne
   * 
   * @param {number} campaignId - ID de la campagne à envoyer
   * @returns {Promise<Object>} - Résultat de l'envoi
   */
  async sendNow(campaignId) {
    try {
      await this.brevo.request('post', `/emailCampaigns/${campaignId}/sendNow`);
      logger.info(`Campagne email ${campaignId} envoyée avec succès`);
      
      return {
        success: true,
        message: 'Campagne envoyée avec succès',
        id: campaignId
      };
    } catch (error) {
      logger.error(`Erreur lors de l'envoi de la campagne ${campaignId}`, error);
      throw error;
    }
  }
  
  /**
   * Teste une campagne en l'envoyant à des adresses email spécifiques
   * 
   * @param {number} campaignId - ID de la campagne à tester
   * @param {Array<string>} emails - Emails des destinataires pour le test
   * @returns {Promise<Object>} - Résultat du test
   */
  async sendTest(campaignId, emails) {
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      throw new BrevoRequestError('La liste des emails pour le test est vide ou invalide');
    }
    
    try {
      const payload = { emailTo: emails };
      
      await this.brevo.request('post', `/emailCampaigns/${campaignId}/sendTest`, payload);
      logger.info(`Email test de la campagne ${campaignId} envoyé à ${emails.join(', ')}`);
      
      return {
        success: true,
        message: `Email test envoyé à ${emails.join(', ')}`,
        id: campaignId
      };
    } catch (error) {
      logger.error(`Erreur lors de l'envoi du test de la campagne ${campaignId}`, error);
      throw error;
    }
  }
  
  /**
   * Obtient les rapports d'une campagne
   * 
   * @param {number} campaignId - ID de la campagne
   * @returns {Promise<Object>} - Rapports de la campagne
   */
  async getReports(campaignId) {
    try {
      const response = await this.brevo.request('get', `/emailCampaigns/${campaignId}/reports`);
      return response;
    } catch (error) {
      logger.error(`Erreur lors de la récupération des rapports de la campagne ${campaignId}`, error);
      throw error;
    }
  }
}

module.exports = CampaignsService;