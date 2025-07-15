// backend/sheetsUtils.js
// Utilitaire pour lire une feuille Google Sheets (via googleapis)

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const credentialsPath = path.join(__dirname, 'credentials.json');
const spreadsheetId = process.env.GOOGLE_SHEET_ID || 'VOTRE_SPREADSHEET_ID'; // à configurer

// L'authentification doit avoir les droits en écriture
function getAuth() {
  const credentials = JSON.parse(fs.readFileSync(credentialsPath));
  const scopes = ['https://www.googleapis.com/auth/spreadsheets']; // <-- Changement ici
  const auth = new google.auth.GoogleAuth({ credentials, scopes });
  return auth;
}

async function getSheetData(sheetName) {
  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });
  return res.data.values;
}

// Nouvelle fonction pour ajouter une ou plusieurs lignes à une feuille
async function appendSheetData(sheetName, rowsData) {
  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: sheetName,
    valueInputOption: 'USER_ENTERED', // Pour que les dates/formules soient bien interprétées
    resource: {
      // rowsData doit être un tableau de tableaux, ex: [['valA1', 'valB1'], ['valA2', 'valB2']]
      values: rowsData,
    },
  });
  return res;
}

// Nouvelle fonction pour mettre à jour une ligne existante
async function updateSheetRow(sheetName, rowIndex, rowData) {
  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const range = `${sheetName}!A${rowIndex}`; // Ex: 'Workflows!A2'
  const res = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [rowData],
    },
  });
  return res;
}

// Nouvelle fonction pour supprimer une ligne
async function deleteSheetRow(sheetName, rowIndex) {
  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: await getSheetIdByName(sheetName), // Nécessite l'ID numérique de la feuille
            dimension: 'ROWS',
            startIndex: rowIndex - 1, // API est en 0-based
            endIndex: rowIndex,
          },
        },
      }],
    },
  });
  return res;
}

// Fonction utilitaire pour obtenir l'ID numérique d'une feuille par son nom
async function getSheetIdByName(sheetName) {
  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties',
  });
  const sheet = res.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) {
    throw new Error(`Feuille "${sheetName}" introuvable.`);
  }
  return sheet.properties.sheetId;
}

// Nouvelle fonction pour mettre à jour une plage de données (ex: toute la feuille)
async function updateSheetData(sheetName, range, data) {
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!${range}`, // Ex: 'Settings!A1'
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: data,
        },
    });
    return res;
}

// Nouvelle fonction pour créer une nouvelle feuille
async function createSheet(sheetName) {
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
            requests: [{
                addSheet: {
                    properties: {
                        title: sheetName,
                    },
                },
            }],
        },
    });
    return res;
}

module.exports = { getSheetData, appendSheetData, updateSheetRow, deleteSheetRow, updateSheetData, createSheet };
