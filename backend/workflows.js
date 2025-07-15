// backend/workflows.js
// API pour gérer les workflows IA dans la feuille Google Sheets "Workflows"

const express = require('express');
const router = express.Router();
const { getSheetData, appendSheetData, updateSheetRow, deleteSheetRow } = require('./sheetsUtils');

const WORKFLOWS_SHEET_NAME = 'Workflows';

// Helper pour obtenir l'index de la ligne par ID
async function getWorkflowRowIndexById(id) {
  const data = await getSheetData(WORKFLOWS_SHEET_NAME);
  const headers = data[0];
  const idColIndex = headers.indexOf('ID');
  if (idColIndex === -1) throw new Error('La colonne "ID" est introuvable dans la feuille Workflows.');

  // L'API Sheets est 1-based, et les en-têtes sont la ligne 1, donc les données commencent à la ligne 2 (index 1)
  const rowIndex = data.slice(1).findIndex(row => row[idColIndex] == id);
  if (rowIndex === -1) return -1; // Non trouvé
  return rowIndex + 2; // +2 car slice(1) et 1-based
}

// GET /api/data/Workflows - Lire tous les workflows
router.get('/', async (req, res) => {
  try {
    const data = await getSheetData(WORKFLOWS_SHEET_NAME);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la lecture des workflows.', details: err.message });
  }
});

// POST /api/workflows - Créer un nouveau workflow
router.post('/', async (req, res) => {
  try {
    const { Nom, Déclencheur, Étapes, Statut, Segment_cible, Sujet_Email, Corps_Email } = req.body;

    if (!Nom || !Déclencheur || !Étapes || !Statut || !Sujet_Email || !Corps_Email) {
      return res.status(400).json({ error: 'Tous les champs (Nom, Déclencheur, Étapes, Statut, Sujet Email, Corps Email) sont requis.' });
    }

    const allWorkflows = await getSheetData(WORKFLOWS_SHEET_NAME);
    const headers = allWorkflows[0];
    const idColIndex = headers.indexOf('ID');
    
    // Trouver le prochain ID disponible
    let nextId = 1;
    if (allWorkflows.length > 1) {
      const existingIds = allWorkflows.slice(1).map(row => parseInt(row[idColIndex])).filter(id => !isNaN(id));
      nextId = Math.max(...existingIds) + 1;
    }

    // Assurez-vous que l'ordre des données correspond à l'ordre des colonnes dans votre feuille Google Sheet
    const newRowData = [
      nextId,
      Nom,
      Déclencheur,
      JSON.stringify(Étapes), // Les étapes sont un objet/tableau, stocker en JSON
      Statut,
      '', // Dernière exécution (vide à la création)
      Segment_cible || '',
      Sujet_Email,
      Corps_Email,
    ];

    await appendSheetData(WORKFLOWS_SHEET_NAME, newRowData);
    res.status(201).json({ message: 'Workflow créé avec succès.', id: nextId });

  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la création du workflow.', details: err.message });
  }
});

// PUT /api/workflows/:id - Mettre à jour un workflow existant
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Nom, Déclencheur, Étapes, Statut, Segment_cible, Sujet_Email, Corps_Email } = req.body;

    const rowIndex = await getWorkflowRowIndexById(id);
    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Workflow non trouvé.' });
    }

    const allWorkflows = await getSheetData(WORKFLOWS_SHEET_NAME);
    const headers = allWorkflows[0];
    const existingRow = allWorkflows[rowIndex - 1]; // -1 car allWorkflows est 0-based

    // Construire la ligne de données avec les valeurs existantes et les nouvelles
    const updatedRowData = headers.map((header, index) => {
      switch (header) {
        case 'Nom': return Nom || existingRow[index];
        case 'Déclencheur': return Déclencheur || existingRow[index];
        case 'Étapes': return Étapes ? JSON.stringify(Étapes) : existingRow[index];
        case 'Statut': return Statut || existingRow[index];
        case 'Segment cible': return Segment_cible || existingRow[index];
        case 'Sujet Email': return Sujet_Email || existingRow[index];
        case 'Corps Email': return Corps_Email || existingRow[index];
        default: return existingRow[index]; // Garder les autres colonnes inchangées
      }
    });

    await updateSheetRow(WORKFLOWS_SHEET_NAME, rowIndex, updatedRowData);
    res.status(200).json({ message: 'Workflow mis à jour avec succès.' });

  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du workflow.', details: err.message });
  }
});

// DELETE /api/workflows/:id - Supprimer un workflow
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rowIndex = await getWorkflowRowIndexById(id);

    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Workflow non trouvé.' });
    }

    await deleteSheetRow(WORKFLOWS_SHEET_NAME, rowIndex);
    res.status(200).json({ message: 'Workflow supprimé avec succès.' });

  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression du workflow.', details: err.message });
  }
});

module.exports = router;
