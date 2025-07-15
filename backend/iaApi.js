// backend/iaApi.js
// API pour les fonctionnalités d'IA (ex: génération de contenu)

const express = require('express');
const router = express.Router();
const { generateContent } = require('./geminiApi');

// POST /api/ia/generate-email-content
router.post('/generate-email-content', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Le prompt est requis pour la génération de contenu.' });
    }

    const generatedText = await generateContent(prompt);
    res.json({ content: generatedText });

  } catch (err) {
    console.error("Erreur dans l'API de génération IA:", err);
    res.status(500).json({ error: err.message || "Erreur lors de la génération de contenu par l'IA." });
  }
});

// POST /api/ia/analyze-segment-query
router.post('/analyze-segment-query', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'La requête est requise pour l\'analyse de segment.' });
    }

    const prompt = `Analysez la requête suivante pour extraire des critères de filtrage de prospects/clients. Retournez un objet JSON avec les clés suivantes si elles sont mentionnées: "ageMin", "ageMax", "ville", "departement", "pays", "typeProduit", "statut", "scoreIaMin", "scoreIaMax", "estClient" (true/false). Si un critère n'est pas mentionné, ne l'incluez pas. Pour "estClient", si la requête mentionne "clients", mettez true; si elle mentionne "prospects" ou "non clients", mettez false.
    Exemples:
    - "clients de Paris entre 30 et 40 ans" -> {"ville": "Paris", "ageMin": 30, "ageMax": 40, "estClient": true}
    - "prospects avec un score IA supérieur à 80" -> {"scoreIaMin": 80, "estClient": false}
    - "clients de Lyon avec assurance auto" -> {"ville": "Lyon", "typeProduit": "assurance auto", "estClient": true}
    - "prospects non joignables" -> {"statut": "ne répond pas", "estClient": false}
    - "tous les clients" -> {"estClient": true}
    - "tous les prospects" -> {"estClient": false}
    - "prospects de Marseille" -> {"ville": "Marseille", "estClient": false}
    - "clients avec contrat d'assurance vie" -> {"typeProduit": "assurance vie", "estClient": true}
    - "prospects avec un score IA entre 60 et 75" -> {"scoreIaMin": 60, "scoreIaMax": 75, "estClient": false}
    - "clients du département 75" -> {"departement": "75", "estClient": true}
    - "prospects en France" -> {"pays": "France", "estClient": false}

    Requête à analyser: "${query}"`;

    const generatedText = await generateContent(prompt);
    
    // Tenter de parser le JSON. L'IA peut parfois retourner du texte additionnel.
    let parsedFilters = {};
    try {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedFilters = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Aucun JSON valide trouvé dans la réponse de l'IA.");
      }
    } catch (parseError) {
      console.warn("Impossible de parser la réponse IA en JSON, retour brut:", generatedText);
      // Fallback si le parsing échoue, on peut retourner un format d'erreur ou un objet vide
      return res.status(500).json({ error: "L'IA n'a pas retourné un format de filtre valide.", rawResponse: generatedText });
    }

    res.json({ filters: parsedFilters });

  } catch (err) {
    console.error("Erreur dans l'API d'analyse de segment IA:", err);
    res.status(500).json({ error: err.message || "Erreur lors de l'analyse de la requête par l'IA." });
  }
});

module.exports = router;
