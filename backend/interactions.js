// backend/interactions.js
// API pour gérer les interactions avec les prospects

const express = require('express');
const router = express.Router();
const { appendSheetData, getSheetData } = require('./sheetsUtils');

const INTERACTIONS_SHEET = 'Interactions';

// POST /api/interactions
// Ajoute une nouvelle interaction à la feuille
router.post('/', async (req, res) => {
  try {
    const { prospectId, type, canal, sujet, message, statut } = req.body;

    if (!prospectId || !sujet || !message) {
      return res.status(400).json({ error: 'Les champs prospectId, sujet et message sont requis.' });
    }

    const newInteraction = [
      new Date().toISOString(),
      prospectId,
      type || 'Email',
      canal || 'Manuel',
      sujet,
      message,
      statut || 'Envoyé'
    ];

    await appendSheetData(INTERACTIONS_SHEET, newInteraction);

    res.status(201).json({ message: 'Interaction enregistrée avec succès.', data: newInteraction });

  } catch (err) {
    res.status(500).json({ error: "Erreur lors de l'enregistrement de l'interaction.", details: err.message });
  }
});

// GET /api/interactions/prospect/:prospectId
// Récupère l'historique des interactions pour un prospect donné
router.get('/prospect/:prospectId', async (req, res) => {
    try {
        const { prospectId } = req.params;
        const interactions = await getSheetData(INTERACTIONS_SHEET);
        const headers = interactions[0];
        const idContactIdx = headers.indexOf('ID Contact');

        if (idContactIdx === -1) {
            return res.status(400).json({ error: "La colonne 'ID Contact' est introuvable dans la feuille Interactions." });
        }

        const prospectInteractions = interactions.slice(1).filter(row => row[idContactIdx] === prospectId);
        
        // Convertir les lignes en objets pour une utilisation plus facile côté client
        const data = prospectInteractions.map(row => {
            const obj = {};
            headers.forEach((h, i) => { obj[h] = row[i] || ''; });
            return obj;
        });

        res.json({ message: 'Historique récupéré.', data });

    } catch (err) {
        res.status(500).json({ error: "Erreur lors de la récupération de l'historique.", details: err.message });
    }
});


module.exports = router;
