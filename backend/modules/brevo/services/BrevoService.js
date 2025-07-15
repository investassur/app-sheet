/**
 * Service principal d'intégration avec l'API Brevo
 * 
 * Cette classe fournit une couche d'abstraction pour interagir avec l'API Brevo,
 * en gérant l'authentification, les requêtes HTTP, la gestion des erreurs, etc.
 */

const axios = require('axios');
const ContactsService = require('./ContactsService');
const ListsService = require('./ListsService');
const CampaignsService = require('./CampaignsService');
const TemplatesService = require('./TemplatesService');
const WebhooksService = require('./WebhooksService');
const { BrevoError, BrevoAuthError, BrevoRequestError } = require('../utils/errors');
const { logger } = require('../utils/logger');
const config = require('../config');

class BrevoService {
  /**
   * Crée une nouvelle instance du service Brevo
   * 
   * @param {Object} options - Options de configuration
   * @param {string} options.apiKey - Clé API Brevo (par défaut: depuis les variables d'environnement)
   * @param {string} options.baseUrl - URL de base de l'API (par défaut: 'https://api.brevo.com/v3')
   * @param {number} options.timeout - Timeout en ms pour les requêtes (par défaut: 30000)
   * @param {number} options.maxRetries - Nombre maximal de tentatives en cas d'échec (par défaut: 3)
   * @param {boolean} options.debug - Mode debug pour plus de logs (par défaut: false)
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || config.apiKey;
    this.baseUrl = options.baseUrl || 'https://api.brevo.com/v3';
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.debug = options.debug || config.debug || false;
    
    // Vérification de la clé API
    if (!this.apiKey) {
      throw new BrevoAuthError('Clé API Brevo manquante. Veuillez la fournir via les options ou les variables d\'environnement.');
    }
    
    // Initialisation du client HTTP
    this.httpClient = this._createHttpClient();
    
    // Initialisation des services
    this.contacts = new ContactsService(this);
    this.lists = new ListsService(this);
    this.campaigns = new CampaignsService(this);
    this.templates = new TemplatesService(this);
    this.webhooks = new WebhooksService(this);
    
    if (this.debug) {
      logger.info('Service Brevo initialisé avec succès');
    }
  }
  
  /**
   * Crée et configure l'instance axios
   * @private
   */
  _createHttpClient() {
    const client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Intercepteur pour le logging des requêtes
    client.interceptors.request.use(config => {
      if (this.debug) {
        logger.debug(`Requête Brevo: ${config.method.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data
        });
      }
      return config;
    });
    
    // Intercepteur pour le logging des réponses et la gestion des erreurs
    client.interceptors.response.use(
      response => {
        if (this.debug) {
          logger.debug(`Réponse Brevo: ${response.status}`, {
            data: response.data
          });
        }
        return response;
      },
      async error => {
        const originalRequest = error.config;
        
        // Informations sur l'erreur pour le logging
        const errorDetails = {
          url: originalRequest.url,
          method: originalRequest.method,
          status: error.response?.status,
          data: error.response?.data || error.message
        };
        
        if (this.debug) {
          logger.error(`Erreur Brevo: ${error.response?.status || 'NETWORK_ERROR'}`, errorDetails);
        }
        
        // Logique de retry pour certaines erreurs (429, 500, etc.)
        if (this._shouldRetry(error) && originalRequest._retry < this.maxRetries) {
          originalRequest._retry = (originalRequest._retry || 0) + 1;
          
          // Attente exponentielle entre les tentatives
          const delay = Math.pow(2, originalRequest._retry) * 1000;
          logger.warn(`Nouvelle tentative (${originalRequest._retry}/${this.maxRetries}) dans ${delay}ms`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return client(originalRequest);
        }
        
        // Transformation en erreurs personnalisées
        if (error.response) {
          if (error.response.status === 401 || error.response.status === 403) {
            throw new BrevoAuthError(
              `Erreur d'authentification: ${error.response.data.message || 'Accès non autorisé'}`,
              error.response
            );
          } else {
            throw new BrevoRequestError(
              `Erreur API Brevo: ${error.response.data.message || error.message}`,
              error.response
            );
          }
        } else if (error.request) {
          throw new BrevoError(`Erreur réseau: Aucune réponse reçue`, null, error);
        } else {
          throw new BrevoError(`Erreur de configuration: ${error.message}`, null, error);
        }
      }
    );
    
    // Initialisation du compteur de retry
    client.interceptors.request.use(config => {
      config._retry = 0;
      return config;
    });
    
    return client;
  }
  
  /**
   * Détermine si une requête devrait être retentée en fonction de l'erreur
   * @private
   */
  _shouldRetry(error) {
    // Retry sur les erreurs réseau
    if (!error.response) return true;
    
    // Retry sur certains codes d'état
    const retryStatuses = [408, 429, 500, 502, 503, 504];
    return retryStatuses.includes(error.response.status);
  }
  
  /**
   * Effectue une requête à l'API Brevo
   * 
   * @param {string} method - Méthode HTTP (get, post, put, delete)
   * @param {string} endpoint - Endpoint de l'API (sans le baseUrl)
   * @param {Object} data - Données à envoyer (pour POST, PUT)
   * @param {Object} params - Paramètres de requête (pour GET)
   * @param {Object} options - Options supplémentaires
   * @returns {Promise<Object>} - Réponse de l'API
   */
  async request(method, endpoint, data = null, params = null, options = {}) {
    try {
      const config = {
        method,
        url: endpoint,
        ...(data && { data }),
        ...(params && { params }),
        ...options
      };
      
      const response = await this.httpClient(config);
      return response.data;
    } catch (error) {
      // Les erreurs sont déjà transformées dans l'intercepteur
      throw error;
    }
  }
  
  /**
   * Vérifie la connexion à l'API Brevo
   * 
   * @returns {Promise<Object>} - Informations sur le compte
   */
  async checkConnection() {
    try {
      const response = await this.request('get', '/account');
      return {
        success: true,
        message: 'Connexion à l\'API Brevo établie avec succès',
        account: response
      };
    } catch (error) {
      return {
        success: false,
        message: `Échec de la connexion à l'API Brevo: ${error.message}`,
        error
      };
    }
  }
}

module.exports = BrevoService;