// backend/segmentsApi.js
// Route API pour exposer dynamiquement les segments IA détectés

const express = require('express');
const router = express.Router();
const { detectSegments } = require('./iaSegments');
const { getMergedProspects } = require('./dataManager');
const { createContactList, addContactsToList } = require('./brevo');

// GET /api/ia/segments
router.get('/segments', async (req, res) => {
  try {
    // Accepter les filtres de la requête pour une recherche IA
    const segments = await detectSegments(req.query);
    res.json(segments);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la détection des segments.', details: err.message });
  }
});

// POST /api/ia/segments/export-to-brevo - Exporte un segment vers Brevo
router.post('/segments/export-to-brevo', async (req, res) => {
  const { segmentName, contacts } = req.body;

  if (!segmentName || !contacts || !Array.isArray(contacts)) {
    return res.status(400).json({ error: 'Nom du segment et liste de contacts sont requis.' });
  }

  try {
    // 1. Créer une nouvelle liste sur Brevo
    const newList = await createContactList(segmentName);
    const listId = newList.id;

    // 2. Ajouter les contacts à cette nouvelle liste
    const result = await addContactsToList(listId, contacts);

    res.status(200).json({
      message: `Segment "${segmentName}" exporté avec succès vers Brevo.`,
      listId: listId,
      ...result
    });

  } catch (error) {
    console.error("Erreur lors de l'export du segment vers Brevo:", error);
    res.status(500).json({ error: "Erreur lors de l'export du segment vers Brevo.", details: error.message });
  }
});

// GET /api/ia/prospects-merged - Expose les prospects fusionnés
router.get('/prospects-merged', async (req, res) => {
  try {
    const prospects = await getMergedProspects();
    res.json(prospects);
  } catch (err) {
    console.error("Erreur lors de la récupération des prospects fusionnés:", err);
    res.status(500).json({ error: 'Erreur lors de la récupération des prospects fusionnés.', details: err.message });
  }
});

module.exports = router;
