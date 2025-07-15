// backend/settingsManager.js
// Gère la récupération et la mise en cache des paramètres depuis la feuille 'Settings'

const { getSheetData } = require('./sheetsUtils');

const SETTINGS_SHEET_NAME = 'Settings';
let cachedSettings = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getSettings() {
    const now = Date.now();
    if (cachedSettings && (now - lastFetchTime < CACHE_DURATION)) {
        return cachedSettings;
    }

    try {
        console.log("Récupération des paramètres depuis la feuille 'Settings'...");
        const settingsData = await getSheetData(SETTINGS_SHEET_NAME);
        if (!settingsData || settingsData.length < 2) {
            throw new Error("La feuille 'Settings' est vide ou mal formatée.");
        }

        const settings = settingsData.slice(1).reduce((acc, row) => {
            if (row[0]) { // S'assurer que la clé existe
                acc[row[0]] = row[1];
            }
            return acc;
        }, {});

        cachedSettings = settings;
        lastFetchTime = now;
        console.log("Paramètres chargés et mis en cache.");
        return settings;

    } catch (error) {
        console.error("ERREUR CRITIQUE: Impossible de charger les paramètres depuis la feuille 'Settings'.", error.message);
        console.error("Veuillez vérifier que la feuille 'Settings' existe, qu'elle est partagée avec le compte de service et qu'elle contient les clés nécessaires.");
        // En cas d'échec, on retourne un objet vide pour éviter de planter l'application,
        // mais les fonctionnalités dépendantes ne marcheront pas.
        return {};
    }
}

module.exports = { getSettings };
