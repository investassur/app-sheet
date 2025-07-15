// backend/iaWorkflowLauncher.js
// Route API pour lancer automatiquement un workflow IA sur des contacts ciblés

const express = require('express');
const router = express.Router();
const { detectSegments } = require('./iaSegments'); // Utilise le module de détection de tous les segments
const { getSheetData, appendSheetData } = require('./sheetsUtils');
const { sendEmail } = require('./email');

// POST /api/ia/launch-workflow
router.post('/launch-workflow', async (req, res) => {
  try {
    const { segmentName, workflowId } = req.body;

    if (!segmentName || !workflowId) {
      return res.status(400).json({ error: 'Les champs segmentName et workflowId sont requis pour lancer un workflow.' });
    }

    // 1. Détection des prospects pour le segment cible
    const allSegments = await detectSegments(); // Récupère tous les segments
    let prospectsToContact = [];

    if (allSegments[segmentName]) {
      // Si le segment est une liste directe (ex: Non joignables)
      if (Array.isArray(allSegments[segmentName])) {
        prospectsToContact = allSegments[segmentName];
      } else if (typeof allSegments[segmentName] === 'object') {
        // Si le segment est un objet (ex: Par région)
        Object.values(allSegments[segmentName]).forEach(list => {
          prospectsToContact = prospectsToContact.concat(list);
        });
      }
    } else {
      return res.status(404).json({ error: `Segment "${segmentName}" introuvable.` });
    }

    if (!prospectsToContact.length) {
      return res.json({ message: `Aucun contact trouvé pour le segment "${segmentName}".` });
    }

    // 2. Récupération du workflow cible et de son contenu
    const workflows = await getSheetData('Workflows');
    const workflowHeaders = workflows[0];
    const workflowRow = workflows.slice(1).find(row => row[workflowHeaders.indexOf('ID')] == workflowId); // Cherche par ID

    if (!workflowRow) {
      return res.status(404).json({ error: `Workflow avec ID "${workflowId}" non trouvé dans la feuille Workflows.` });
    }

    const workflowName = workflowRow[workflowHeaders.indexOf('Nom')];
    const sujetTemplate = workflowRow[workflowHeaders.indexOf('Sujet Email')];
    const corpsTemplate = workflowRow[workflowHeaders.indexOf('Corps Email')];
    const etapes = JSON.parse(workflowRow[workflowHeaders.indexOf('Étapes')] || '[]'); // Assurez-vous que les étapes sont parsées

    if (!sujetTemplate || !corpsTemplate || !etapes.length) {
        return res.status(400).json({ error: `Le workflow "${workflowName}" doit avoir un Sujet Email, un Corps Email et des Étapes définies.` });
    }

    // 3. Pour chaque contact, exécuter les étapes du workflow (actuellement, envoi d'email)
    const results = { sent: 0, failed: 0 };
    const actionsLog = [];

    for (const prospect of prospectsToContact) {
      const contactId = prospect.Identifiant;

      // Pour l'instant, on exécute la première étape d'email du workflow
      // Plus tard, on pourrait implémenter une logique pour gérer plusieurs étapes et délais
      const emailStep = etapes.find(step => step.type === 'email');

      if (prospect && prospect.Email && emailStep) {
        try {
          // Personnalisation du message
          const finalSujet = sujetTemplate.replace(/\[Prénom\]/g, prospect['Prénom'] || 'cher client');
          const finalCorps = corpsTemplate.replace(/\[Prénom\]/g, prospect['Prénom'] || 'cher client');

          // Envoi de l'email
          await sendEmail(prospect.Email, finalSujet, finalCorps);

          // Log de l'interaction dans la feuille "Interactions"
          const interactionData = [
            new Date().toISOString(), // Date/Heure
            contactId,                // ID Contact
            'Email',                  // Type
            'Automatique',            // Canal
            finalSujet,               // Sujet/Action
            finalCorps,               // Message/Contenu
            'Envoyé',                 // Statut
            workflowName,             // Nom du workflow
            segmentName               // Nom du segment
          ];
          await appendSheetData('Interactions', interactionData);
          
          results.sent++;
          actionsLog.push({ contactId: contactId, contactName: prospect['Nom Complet'], status: 'Success', action: 'Email envoyé' });

        } catch (emailError) {
          results.failed++;
          actionsLog.push({ contactId: contactId, contactName: prospect['Nom Complet'], status: 'Failed', action: 'Échec envoi email', error: emailError.message });
        }
      } else {
        results.failed++;
        actionsLog.push({ contactId: contactId, contactName: prospect['Nom Complet'], status: 'Failed', action: 'Non éligible/Email manquant', error: 'Email manquant ou aucune étape email définie.' });
      }
    }

    res.json({ message: `Workflow "${workflowName}" lancé pour le segment "${segmentName}".`, results, actions: actionsLog });

  } catch (err) {
    res.status(500).json({ error: 'Erreur lors du lancement du workflow.', details: err.message });
  }
});

module.exports = router;
