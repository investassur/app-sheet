// backend/geminiApi.js
// Module pour interagir avec l'API Google Gemini pour la génération de contenu

const axios = require('axios');
const { getSettings } = require('./settingsManager');

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"; // Modèle mis à jour

/**
 * Génère du contenu textuel en utilisant l'API Google Gemini.
 * @param {string} prompt - Le texte du prompt à envoyer à l'IA.
 * @returns {Promise<string>} - Le contenu généré par l'IA.
 */
async function generateContent(prompt) {
  const settings = await getSettings();
  const apiKey = settings.geminiApiKey;

  if (!apiKey) {
    throw new Error("Clé API Gemini non configurée. Veuillez l'ajouter via la page d'Administration.");
  }

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${apiKey}`, 
      {
        contents: [{
          parts: [{ text: prompt }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    // Extraire le texte généré
    const generatedText = response.data.candidates[0].content.parts[0].text;
    return generatedText;

  } catch (error) {
    console.error("Erreur lors de l'appel à l'API Gemini:", error.response?.data || error.message);
    throw new Error("Impossible de générer du contenu avec l'IA. Vérifiez votre clé API et les logs du serveur.");
  }
}

module.exports = { generateContent };
