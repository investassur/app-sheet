const axios = require('axios');
require('dotenv').config();

// Utiliser une variable d'environnement pour la clé API (à configurer dans un fichier .env)
const BREVO_API_URL = 'https://api.brevo.com/v3';
const BREVO_API_KEY = process.env.BREVO_API_KEY || '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';

// Logger pour surveiller les appels API
const logApiCall = (method, endpoint, data = null, response = null, error = null) => {
  console.log(`[BREVO API] ${method} ${endpoint}`);
  if (data) console.log(`[BREVO API] Request data:`, JSON.stringify(data, null, 2));
  if (response) console.log(`[BREVO API] Response:`, JSON.stringify(response, null, 2));
  if (error) console.error(`[BREVO API] Error:`, error);
};

const brevoAxios = axios.create({
  baseURL: BREVO_API_URL,
  headers: {
    'api-key': BREVO_API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor pour logger toutes les réponses et erreurs
brevoAxios.interceptors.response.use(
  response => {
    logApiCall(response.config.method.toUpperCase(), response.config.url, null, response.data);
    return response;
  },
  error => {
    const errorData = error.response ? error.response.data : error.message;
    logApiCall(
      error.config ? error.config.method.toUpperCase() : 'UNKNOWN',
      error.config ? error.config.url : 'UNKNOWN',
      null,
      null,
      errorData
    );
    return Promise.reject(error);
  }
);

// --- Fonctions pour les listes de contacts ---

async function createContactList(name) {
  try {
    const data = {
      name: name,
      folderId: 1 // ID du dossier par défaut
    };
    
    logApiCall('POST', '/contacts/lists', data);
    
    const response = await brevoAxios.post('/contacts/lists', data);
    console.log(`Liste de contacts "${name}" créée avec succès. ID: ${response.data.id}`);
    return response.data;
  } catch (error) {
    const errorMsg = error.response ? 
      `Erreur ${error.response.status}: ${JSON.stringify(error.response.data)}` : 
      error.message;
    
    console.error(`Erreur lors de la création de la liste de contacts Brevo: ${errorMsg}`);
    
    // Erreurs spécifiques
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error("Authentification échouée. Vérifiez votre clé API Brevo.");
      } else if (error.response.status === 400) {
        throw new Error(`Validation échouée: ${error.response.data.message || 'Données invalides'}`);
      }
    }
    
    throw new Error("Impossible de créer la liste de contacts sur Brevo.");
  }
}

async function addContactsToList(listId, contacts) {
  // Vérifier que nous avons des contacts valides
  if (!contacts || contacts.length === 0) {
    console.log("Aucun contact à ajouter à la liste.");
    return { added: 0, total: 0 };
  }

  console.log(`Tentative d'ajout de ${contacts.length} contacts à la liste ${listId}`);

  // Convertir les contacts au format attendu par Brevo
  const contactsArray = contacts.map(contact => {
    // Si le contact est déjà un objet avec des propriétés
    if (typeof contact === 'object') {
      // Extraire l'email
      const email = contact.Email || contact.email;

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return null; // Ignorer les contacts sans email valide
      }

      // Construire un objet avec tous les attributs disponibles
      const attributes = {};

      // Mapper les champs courants (ajustez selon votre structure de données)
      if (contact.Nom) attributes.NOM = contact.Nom;
      if (contact.Prenom) attributes.PRENOM = contact.Prenom;
      if (contact.Telephone) attributes.TELEPHONE = contact.Telephone;
      if (contact.Societe) attributes.SOCIETE = contact.Societe;
      if (contact.Adresse) attributes.ADRESSE = contact.Adresse;
      if (contact.CodePostal) attributes.CODE_POSTAL = contact.CodePostal;
      if (contact.Ville) attributes.VILLE = contact.Ville;

      // Vous pouvez ajouter d'autres attributs personnalisés ici
      // Parcourir toutes les propriétés du contact pour les ajouter comme attributs
      Object.keys(contact).forEach(key => {
        // Exclure certaines clés spécifiques qui ne sont pas des attributs ou déjà traitées
        if (!['Email', 'email', 'id', '_id', 'Nom', 'Prenom', 'Telephone', 'Societe', 'Adresse', 'CodePostal', 'Ville'].includes(key)) {
          // Convertir les clés en majuscules pour Brevo (convention)
          const attrKey = key.toUpperCase();
          attributes[attrKey] = contact[key];
        }
      });
      return {
        email: email,
        attributes: attributes
      };
    }
    // Si le contact est juste un email sous forme de chaîne
    else if (typeof contact === 'string' && contact.includes('@')) {
      return {
        email: contact,
        attributes: {}
      };
    }

    return null; // Ignorer les formats non reconnus
  }).filter(contact => contact !== null);

  if (contactsArray.length === 0) {
    console.log("Aucun contact valide à ajouter à la liste après filtrage.");
    return { added: 0, total: 0 };
  }

  // Brevo peut gérer jusqu'à 150 contacts par appel pour l'ajout à une liste
  const chunkSize = 100; // Réduire à 100 pour être sûr
  let totalAdded = 0;

  // Traiter les contacts par lots
  for (let i = 0; i < contactsArray.length; i += chunkSize) {
    const chunk = contactsArray.slice(i, i + chunkSize);
    try {
      // 1. D'abord, créer ou mettre à jour les contacts
      const createData = { contacts: chunk };
      logApiCall('POST', '/contacts/batch', createData);
      try {
        // Créer/mettre à jour les contacts
        await brevoAxios.post('/contacts/batch', createData);
        console.log(`Lot de ${chunk.length} contacts créés/mis à jour dans Brevo.`);
      } catch (createError) {
        console.warn('Erreur lors de la création/mise à jour des contacts:',
          createError.response ? JSON.stringify(createError.response.data) : createError.message);
        // Continuer malgré l'erreur
      }

      // 2. Ensuite, ajouter les emails à la liste
      const emails = chunk.map(c => c.email);
      const listData = { emails: emails };

      logApiCall('POST', `/contacts/lists/${listId}/contacts/add`, listData);

      await brevoAxios.post(`/contacts/lists/${listId}/contacts/add`, listData);
      console.log(`${emails.length} contacts ajoutés à la liste ${listId}.`);
      totalAdded += emails.length;
  } catch (error) {
    const errorMsg = error.response ?
      `Erreur ${error.response.status}: ${JSON.stringify(error.response.data)}` :
      error.message;

      console.error(`Erreur lors de l'ajout de contacts à la liste Brevo: ${errorMsg}`);

      // Gestion spécifique des erreurs
    if (error.response) {
      if (error.response.status === 404) {
          throw new Error(`Liste d'ID ${listId} non trouvée sur Brevo.`);
        } else if (error.response.status === 400 &&
                 error.response.data &&
                 error.response.data.code === 'invalid_parameter' &&
                 error.response.data.message.includes('Contact already in list')) {
          // Si le contact est déjà dans la liste, considérer comme réussi
          console.log(`Certains contacts étaient déjà dans la liste ${listId}.`);
          totalAdded += chunk.length; // Compter comme ajoutés
          continue;
      }
    }

      // On continue même si certains contacts échouent
      console.log(`Continuer avec le prochain lot malgré l'erreur.`);
  }
}

  return { added: totalAdded, total: contactsArray.length };
}

// --- Fonctions pour vérifier l'état de l'API ---
async function testApiConnection() {
  try {
    const response = await brevoAxios.get('/account');
    return {
      success: true,
      data: response.data,
      message: "Connexion à l'API Brevo établie avec succès."
};
  } catch (error) {
    return {
      success: false,
      error: error.response ? error.response.data : error.message,
      message: "Échec de la connexion à l'API Brevo. Vérifiez votre clé API."
    };
  }
}

// --- Fonctions pour les campagnes ---

/**
 * Valide les données de campagne avant de les envoyer à l'API
 */
function validateCampaignData(campaignDetails) {
  const errors = [];

  if (!campaignDetails.name) errors.push("Le nom de la campagne est requis");
  if (!campaignDetails.subject) errors.push("Le sujet de l'email est requis");
  if (!campaignDetails.htmlContent) errors.push("Le contenu HTML est requis");

  if (!campaignDetails.sender || !campaignDetails.sender.name || !campaignDetails.sender.email) {
    errors.push("Les informations de l'expéditeur (nom et email) sont requises");
  } else if (!campaignDetails.sender.email.includes('@')) {
    errors.push("L'email de l'expéditeur est invalide");
  }

  if (!campaignDetails.listIds || !Array.isArray(campaignDetails.listIds) || campaignDetails.listIds.length === 0) {
    errors.push("Au moins une liste de destinataires est requise");
  }

  return errors;
}

async function createEmailCampaign(campaignDetails) {
  // Validation des données
  const validationErrors = validateCampaignData(campaignDetails);
  if (validationErrors.length > 0) {
    throw new Error(`Validation échouée: ${validationErrors.join(", ")}`);
  }

  try {
    // Construction du payload selon la structure exacte attendue par l'API Brevo
    const payload = {
      name: campaignDetails.name,
      subject: campaignDetails.subject,
      sender: {
        name: campaignDetails.sender.name,
        email: campaignDetails.sender.email
      },
      type: "classic",
      htmlContent: campaignDetails.htmlContent,
      recipients: {
        listIds: campaignDetails.listIds
      }
    };

    // Ajouter la date programmée si présente
    if (campaignDetails.scheduledAt) {
      payload.scheduledAt = campaignDetails.scheduledAt;
    }

    logApiCall('POST', '/emailCampaigns', payload);

    const response = await brevoAxios.post('/emailCampaigns', payload);
    console.log('Campagne email créée avec succès. ID: ' + response.data.id);
    return response.data;
  } catch (error) {
    const errorMsg = error.response ?
      `Erreur ${error.response.status}: ${JSON.stringify(error.response.data)}` :
      error.message;

    console.error(`Erreur lors de la création de la campagne email Brevo: ${errorMsg}`);

    // Gestion des erreurs spécifiques
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error("Authentification échouée. Vérifiez votre clé API Brevo.");
      } else if (error.response.status === 400) {
        const apiErrorMsg = error.response.data.message || 'Données invalides';
        throw new Error(`Validation échouée par l'API Brevo: ${apiErrorMsg}`);
      } else if (error.response.status === 404) {
        throw new Error(`Une ressource référencée n'a pas été trouvée (liste de contacts ou modèle).`);
      }
    }

    throw new Error('Échec de la création de la campagne email.');
  }
}

async function getEmailCampaigns(options = {}) {
  try {
    // Construire les paramètres de requête pour filtrer les résultats
    const params = {};
    if (options.limit) params.limit = options.limit;
    if (options.offset) params.offset = options.offset;
    if (options.type) params.type = options.type;
    if (options.status) params.status = options.status;

    logApiCall('GET', '/emailCampaigns', params);

    const response = await brevoAxios.get('/emailCampaigns', { params });
    console.log(`${response.data.campaigns.length} campagnes email récupérées.`);
    return response.data.campaigns;
  } catch (error) {
    const errorMsg = error.response ?
      `Erreur ${error.response.status}: ${JSON.stringify(error.response.data)}` :
      error.message;

    console.error(`Erreur lors de la récupération des campagnes email Brevo: ${errorMsg}`);

    if (error.response && error.response.status === 401) {
      throw new Error("Authentification échouée. Vérifiez votre clé API Brevo.");
    }

    throw new Error("Impossible de récupérer les campagnes email depuis Brevo.");
  }
}

// Obtenir les détails d'une campagne spécifique
async function getEmailCampaignById(campaignId) {
  try {
    logApiCall('GET', `/emailCampaigns/${campaignId}`);

    const response = await brevoAxios.get(`/emailCampaigns/${campaignId}`);
    return response.data;
  } catch (error) {
    const errorMsg = error.response ?
      `Erreur ${error.response.status}: ${JSON.stringify(error.response.data)}` :
      error.message;

    console.error(`Erreur lors de la récupération de la campagne ${campaignId}: ${errorMsg}`);

    if (error.response) {
      if (error.response.status === 404) {
        throw new Error(`Campagne d'ID ${campaignId} non trouvée.`);
      } else if (error.response.status === 401) {
        throw new Error("Authentification échouée. Vérifiez votre clé API Brevo.");
      }
    }

    throw new Error(`Impossible de récupérer les détails de la campagne ${campaignId}.`);
  }
}

// Envoyer une campagne maintenant (si elle est en état "draft")
async function sendEmailCampaignNow(campaignId) {
  try {
    logApiCall('POST', `/emailCampaigns/${campaignId}/sendNow`);

    const response = await brevoAxios.post(`/emailCampaigns/${campaignId}/sendNow`);
    console.log(`Campagne ${campaignId} envoyée avec succès.`);
    return { success: true, message: "Campagne envoyée avec succès" };
  } catch (error) {
    const errorMsg = error.response ?
      `Erreur ${error.response.status}: ${JSON.stringify(error.response.data)}` :
      error.message;

    console.error(`Erreur lors de l'envoi de la campagne ${campaignId}: ${errorMsg}`);

    if (error.response) {
      if (error.response.status === 404) {
        throw new Error(`Campagne d'ID ${campaignId} non trouvée.`);
      } else if (error.response.status === 400) {
        throw new Error(`Impossible d'envoyer la campagne: ${error.response.data.message || 'La campagne ne peut pas être envoyée dans son état actuel'}`);
      }
    }

    throw new Error(`Échec de l'envoi de la campagne ${campaignId}.`);
  }
}

// --- Fonctions pour gérer les modèles d'email ---

async function getEmailTemplates() {
  try {
    const response = await brevoAxios.get('/smtp/templates');
    return response.data.templates;
  } catch (error) {
    console.error("Erreur lors de la récupération des modèles d'email:", error.response ? error.response.data : error.message);
    throw new Error("Impossible de récupérer les modèles d'email depuis Brevo.");
  }
}

// --- Envoi d'email transactionnel ---
/**
 * Envoie un email transactionnel via Brevo
 * @param {Object} options
 * @param {string|Array} options.to - destinataire(s) (email ou [{email, name}])
 * @param {string} options.subject - sujet de l'email
 * @param {string} options.htmlContent - contenu HTML
 * @param {Object} [options.sender] - expéditeur {email, name} (optionnel)
 * @returns {Promise<Object>} - réponse API Brevo
 */
async function sendTransactionalEmail({ to, subject, htmlContent, sender }) {
  const data = {
    to: Array.isArray(to) ? to : [{ email: to }],
    subject,
    htmlContent
  };
  if (sender) data.sender = sender;
  try {
    logApiCall('POST', '/smtp/email', data);
    const response = await brevoAxios.post('/smtp/email', data);
    return response.data;
  } catch (error) {
    const errorMsg = error.response ?
      `Erreur ${error.response.status}: ${JSON.stringify(error.response.data)}` :
      error.message;
    console.error(`Erreur lors de l'envoi transactionnel Brevo: ${errorMsg}`);
    throw new Error("Impossible d'envoyer l'email transactionnel via Brevo.");
  }
}

module.exports = {
  sendTransactionalEmail,
  createEmailCampaign,
  createContactList,
  addContactsToList,
  getEmailCampaigns,
  getEmailCampaignById,
  sendEmailCampaignNow,
  getEmailTemplates,
  testApiConnection
};
