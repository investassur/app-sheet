const cors = require('cors');
app.use(cors({
  origin: [
    'https://app-sheet-u8ao.vercel.app', // ton domaine Vercel
    'http://localhost:3000' // pour le dev local
  ],
  credentials: true // si tu utilises les cookies/sessions
}));
// On importe les librairies nécessaires
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

// On crée l'application serveur
const app = express();

// --- Configuration ---

// On autorise notre application React (qui tourne sur le port 3000 ou 3002) à parler à ce serveur
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3002', 'http://10.8.0.14:3000']
}));

// On dit à Express de pouvoir comprendre le format JSON
app.use(express.json());

// --- API Routes ---
const { router: emailApiRouter } = require('./email');
const interactionsApiRouter = require('./interactions');
const iaWorkflowLauncher = require('./iaWorkflowLauncher');
const segmentsApi = require('./segmentsApi');
const workflowsRouter = require('./workflows');
const scenariosEmailingRouter = require('./scenariosEmailing');
const iaApiRouter = require('./iaApi'); // Nouvelle ligne
const reportsApiRouter = require('./reportsApi'); // Nouvelle ligne
const adminApiRouter = require('./adminApi'); // Nouvelle ligne
const campaignsApi = require('./campaignsApi');

const authRouter = require('./auth');
app.use('/api/auth', authRouter);
app.use('/api/email', emailApiRouter);
app.use('/api/interactions', interactionsApiRouter);
app.use('/api/ia', iaWorkflowLauncher); // Gère POST /launch-workflow
app.use('/api/ia', segmentsApi); // Gère GET /segments
app.use('/api/ia', iaApiRouter); // Gère POST /generate-email-content (Nouvelle ligne)
app.use('/api/workflows', workflowsRouter);
app.use('/api/scenarios-emailing', scenariosEmailingRouter);
app.use('/api/reports', reportsApiRouter); // Nouvelle ligne
app.use('/api/admin', adminApiRouter); // Nouvelle ligne
app.use('/api/campaigns', campaignsApi);
// --- Authentification avec Google ---

// On lit l'ID de la feuille de calcul depuis le fichier .env
const sheetId = process.env.GOOGLE_SHEET_ID;

// On configure l'authentification en utilisant notre fichier de clé "credentials.json"
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
});

// On crée un client pour interagir avec l'API Google Sheets
const sheets = google.sheets({ version: 'v4', auth });

// --- Route de l'API ---

// On définit une route GET pour que le frontend puisse demander les données
// :sheetName est un paramètre, on pourra demander "Contacts" ou une autre feuille
app.get('/api/data/:sheetName', async (req, res) => {
    try {
        const { sheetName } = req.params;
        console.log(`Demande reçue pour la feuille : ${sheetName}`);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: sheetName, // On utilise le nom de la feuille demandé (ex: "Contacts")
        });

        res.json(response.data.values);

    } catch (error) {
        console.error("ERREUR:", error.message);
        res.status(500).send("Erreur du serveur. Vérifiez que le nom de la feuille est correct et que le partage a bien été fait (Étape 1).");
    }
});

// --- Démarrage du serveur ---

const { connectAndMonitor } = require('./emailReceiver'); // Nouvelle ligne

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🎉 Serveur Backend démarré sur http://localhost:${PORT}`);
    
    // Démarrer la surveillance des emails de manière sécurisée
    // try {
    //     console.log("Initialisation du module de réception d'emails...");
    //     connectAndMonitor();
    // } catch (error) {
    //     console.error("ERREUR FATALE au démarrage du module email. Le reste du serveur continue de fonctionner.", error);
    // }
});
