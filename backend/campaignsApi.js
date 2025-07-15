const express = require('express');
const router = express.Router();
const { 
  createEmailCampaign, 
  createContactList, 
  addContactsToList, 
  getEmailCampaigns, 
  getEmailCampaignById,
  sendEmailCampaignNow,
  testApiConnection
} = require('./brevo');
const { detectSegments } = require('./iaSegments');

// Route de test pour vérifier la connexion à l'API Brevo
router.get('/test-connection', async (req, res) => {
  try {
    const result = await testApiConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Création d'une nouvelle campagne
router.post('/', async (req, res) => {
  const { name, subject, htmlContent, segmentId, sender } = req.body;

  // Validation des données requises
  if (!name || !subject || !htmlContent || !segmentId || !sender) {
    return res.status(400).json({ 
      success: false,
      error: 'Tous les champs sont requis.',
      missingFields: Object.entries({ name, subject, htmlContent, segmentId, sender })
        .filter(([_, value]) => !value)
        .map(([key]) => key)
    });
  }

  try {
    // 1. Récupérer les contacts du segment
    const allSegments = await detectSegments();
    const segmentContacts = allSegments[segmentId];

    if (!segmentContacts || segmentContacts.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Segment non trouvé ou vide.',
        segmentId
      });
    }

    // 2. Créer une liste de contacts sur Brevo
    const listName = `Segment: ${segmentId} - ${new Date().toISOString()}`;
    console.log(`Création de la liste de contacts '${listName}'`);
    
    const newList = await createContactList(listName);
    const listId = newList.id;

    // 3. Ajouter les contacts à la liste
    console.log(`Ajout de ${segmentContacts.length} contacts à la liste ${listId}`);
    const addResult = await addContactsToList(listId, segmentContacts);
    
    // 4. Vérifier si des contacts ont été ajoutés
    if (addResult.added === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucun contact valide à ajouter à la campagne.',
        segmentId,
        listId
      });
    }

    // 5. Créer la campagne email
    const campaignDetails = {
      name,
      subject,
      htmlContent,
      sender,
      listIds: [listId],
    };
    
    console.log(`Création de la campagne email '${name}'`);
    const campaignData = await createEmailCampaign(campaignDetails);

    res.status(201).json({
      success: true,
      message: 'Campagne créée avec succès.',
      campaign: campaignData,
      list: {
        ...newList,
        contactsAdded: addResult.added,
        contactsTotal: addResult.total
      }
    });

  } catch (error) {
    console.error("Erreur lors de la création de la campagne:", error);
    
    // Extraction de messages d'erreur spécifiques
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (errorMessage.includes('Authentification échouée')) {
      statusCode = 401;
    } else if (errorMessage.includes('Validation échouée')) {
      statusCode = 400;
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: error.response ? error.response.data : null
    });
  }
});

// Récupération de toutes les campagnes
router.get('/', async (req, res) => {
  try {
    // Récupérer les paramètres de filtre optionnels
    const { limit, offset, status } = req.query;
    const options = {};
    
    if (limit) options.limit = parseInt(limit);
    if (offset) options.offset = parseInt(offset);
    if (status) options.status = status;
    
    const campaigns = await getEmailCampaigns(options);
    res.json(campaigns);
  } catch (error) {
    console.error("Erreur lors de la récupération des campagnes:", error);
    res.status(500).json({ 
      success: false,
      error: 'Impossible de récupérer les campagnes.',
      details: error.message 
    });
  }
});

// Récupération d'une campagne spécifique
router.get('/:id', async (req, res) => {
  try {
    const campaignId = req.params.id;
    const campaign = await getEmailCampaignById(campaignId);
    res.json(campaign);
  } catch (error) {
    console.error(`Erreur lors de la récupération de la campagne ${req.params.id}:`, error);
    
    let statusCode = 500;
    if (error.message.includes('non trouvée')) {
      statusCode = 404;
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Envoi immédiat d'une campagne
router.post('/:id/send', async (req, res) => {
  try {
    const campaignId = req.params.id;
    const result = await sendEmailCampaignNow(campaignId);
    res.json(result);
  } catch (error) {
    console.error(`Erreur lors de l'envoi de la campagne ${req.params.id}:`, error);
    
    let statusCode = 500;
    if (error.message.includes('non trouvée')) {
      statusCode = 404;
    } else if (error.message.includes('Impossible d\'envoyer')) {
      statusCode = 400;
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;