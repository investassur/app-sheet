const express = require('express');
const router = express.Router();
const { getSheetData, updateSheetData, createSheet, appendSheetData } = require('./sheetsUtils');

const SETTINGS_SHEET_NAME = 'Settings';

// Helper to normalize company names for settings keys
const normalizeCompanyName = (name) => {
    return String(name).toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
};

// Helper pour s'assurer que la feuille 'Settings' existe et contient toutes les clés nécessaires
const ensureSettingsSheetExists = async () => {
    const companyNames = [
        "SPVIE", "HARMONIE MUTUELLE", "AS SOLUTIONS", "SOLLY AZAR", "NÉOLIANE",
        "ZENIOO", "APRIL", "ALPTIS", "ENTORIA", "AVA", "COVERITY",
        "MALAKOFF HUMANIS", "ASAF&AFPS", "JOKER ASSURANCES", "APICIL",
        "ECA CAPITAL SENIOR", "ECA SÉRENISSIME", "ECA Autres", "CNP"
    ];

    const commissionKeys = companyNames.flatMap(name => {
        const normalizedName = normalizeCompanyName(name);
        return [`commission_${normalizedName}_annee1`, `commission_${normalizedName}_recurrent`];
    });

    const REQUIRED_KEYS = [
        'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass',
        'imapHost', 'imapPort', 'imapUser', 'imapPass',
        'geminiApiKey', 'depenses', 'cpl',
        ...commissionKeys
    ];

    let existingData;
    try {
        existingData = await getSheetData(SETTINGS_SHEET_NAME);
    } catch (error) {
        if (error.message.includes('Unable to parse range')) {
            console.log(`La feuille '${SETTINGS_SHEET_NAME}' n'existe pas. Création en cours...`);
            await createSheet(SETTINGS_SHEET_NAME);
            const initialData = [
                ['key', 'value'],
                ...REQUIRED_KEYS.map(k => [k, ''])
            ];
            await updateSheetData(SETTINGS_SHEET_NAME, 'A1', initialData);
            console.log(`Feuille '${SETTINGS_SHEET_NAME}' créée et initialisée.`);
            return;
        } else {
            throw error; // Propage les autres erreurs
        }
    }

    // Si la feuille existe, vérifier les clés manquantes
    const existingKeys = existingData.slice(1).map(row => row ? row[0] : null).filter(Boolean);
    const missingKeys = REQUIRED_KEYS.filter(k => !existingKeys.includes(k));

    if (missingKeys.length > 0) {
        console.log(`Clés manquantes dans la feuille 'Settings': ${missingKeys.join(', ')}. Ajout en cours...`);
        const rowsToAdd = missingKeys.map(k => [k, '']);
        // Utiliser appendSheetData pour ajouter les nouvelles lignes à la fin
        await appendSheetData(SETTINGS_SHEET_NAME, rowsToAdd);
        console.log("Clés manquantes ajoutées.");
    }
};

// GET /api/admin/settings - Récupère les paramètres actuels
router.get('/settings', async (req, res) => {
    try {
        await ensureSettingsSheetExists();
        const settingsData = await getSheetData(SETTINGS_SHEET_NAME);
        if (!settingsData) {
            // Si la feuille existe mais est vide, retourner un objet vide.
            return res.json({});
        }
        const settings = settingsData.slice(1).reduce((acc, row) => {
            if(row && row[0]) { // Vérifier que la ligne et la clé existent
               acc[row[0]] = row[1];
            }
            return acc;
        }, {});
        res.json(settings);
    } catch (error) {
        console.error("Erreur API [GET /admin/settings]:", error.message);
        console.error("Detail:", error.stack);
        res.status(500).json({ 
            error: "Impossible de récupérer les paramètres.",
            details: "Vérifiez les logs du serveur et assurez-vous que le compte de service a les permissions 'Lecteur' sur le Google Sheet."
        });
    }
});

// POST /api/admin/settings - Met à jour les paramètres
router.post('/settings', async (req, res) => {
    try {
        await ensureSettingsSheetExists();
        const newSettings = req.body;
        const dataToUpdate = [
            ['key', 'value'],
            ...Object.entries(newSettings)
        ];

        await updateSheetData(SETTINGS_SHEET_NAME, 'A1', dataToUpdate);
        res.json({ message: 'Paramètres sauvegardés avec succès !' });

    } catch (error) {
        console.error("Erreur API [POST /admin/settings]:", error.message);
        console.error("Detail:", error.stack);
        res.status(500).json({ 
            error: "Impossible de sauvegarder les paramètres.",
            details: "Vérifiez les logs du serveur et assurez-vous que le compte de service a les permissions 'Éditeur' sur le Google Sheet."
        });
    }
});

module.exports = router;
