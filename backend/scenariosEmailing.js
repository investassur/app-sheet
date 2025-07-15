// backend/scenariosEmailing.js
// API pour gérer les scénarios emailing IA dans la feuille Google Sheets "ScenariosEmailing"

const express = require('express');
const router = express.Router();
const { getSheetData, appendSheetData, updateSheetRow, deleteSheetRow } = require('./sheetsUtils');

const SCENARIOS_SHEET_NAME = 'ScenariosEmailing';

// Helper pour obtenir l'index de la ligne par ID
async function getScenarioRowIndexById(id) {
  const data = await getSheetData(SCENARIOS_SHEET_NAME);
  const headers = data[0];
  const idColIndex = headers.indexOf('ID');
  if (idColIndex === -1) throw new Error('La colonne "ID" est introuvable dans la feuille ScenariosEmailing.');

  const rowIndex = data.slice(1).findIndex(row => row[idColIndex] == id);
  if (rowIndex === -1) return -1;
  return rowIndex + 2; // +2 car slice(1) et 1-based
}

// GET /api/data/ScenariosEmailing - Lire tous les scénarios
router.get('/', async (req, res) => {
  try {
    const data = await getSheetData(SCENARIOS_SHEET_NAME);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la lecture des scénarios emailing.', details: err.message });
  }
});

// POST /api/scenarios-emailing - Créer un nouveau scénario
router.post('/', async (req, res) => {
  try {
    const { Nom, Description, Contenu } = req.body;

    if (!Nom || !Contenu) {
      return res.status(400).json({ error: 'Les champs Nom et Contenu sont requis.' });
    }

    const allScenarios = await getSheetData(SCENARIOS_SHEET_NAME);
    const headers = allScenarios[0];
    const idColIndex = headers.indexOf('ID');
    
    let nextId = 1;
    if (allScenarios.length > 1) {
      const existingIds = allScenarios.slice(1).map(row => parseInt(row[idColIndex])).filter(id => !isNaN(id));
      nextId = Math.max(...existingIds) + 1;
    }

    const newRowData = [
      nextId,
      Nom,
      Description || '',
      Contenu,
    ];

    await appendSheetData(SCENARIOS_SHEET_NAME, newRowData);
    res.status(201).json({ message: 'Scénario créé avec succès.', id: nextId });

  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la création du scénario.', details: err.message });
  }
});

// PUT /api/scenarios-emailing/:id - Mettre à jour un scénario existant
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Nom, Description, Contenu } = req.body;

    const rowIndex = await getScenarioRowIndexById(id);
    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Scénario non trouvé.' });
    }

    const allScenarios = await getSheetData(SCENARIOS_SHEET_NAME);
    const headers = allScenarios[0];
    const existingRow = allScenarios[rowIndex - 1];

    const updatedRowData = headers.map((header, index) => {
      switch (header) {
        case 'Nom': return Nom || existingRow[index];
        case 'Description': return Description || existingRow[index];
        case 'Contenu': return Contenu || existingRow[index];
        default: return existingRow[index];
      }
    });

    await updateSheetRow(SCENARIOS_SHEET_NAME, rowIndex, updatedRowData);
    res.status(200).json({ message: 'Scénario mis à jour avec succès.' });

  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du scénario.', details: err.message });
  }
});

// DELETE /api/scenarios-emailing/:id - Supprimer un scénario
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rowIndex = await getScenarioRowIndexById(id);

    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Scénario non trouvé.' });
    }

    await deleteSheetRow(SCENARIOS_SHEET_NAME, rowIndex);
    res.status(200).json({ message: 'Scénario supprimé avec succès.' });

  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression du scénario.', details: err.message });
  }
});

module.exports = router;
