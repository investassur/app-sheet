// backend/emailReceiver.js
// Module pour la réception et le traitement des emails via IMAP

const Imap = require('node-imap');
const { simpleParser } = require('mailparser');
const { appendSheetData } = require('./sheetsUtils');
const { getMergedProspects } = require('./dataManager');
const { getSettings } = require('./settingsManager');

const CHECK_INTERVAL_MS = 2 * 60 * 1000; // Vérifier toutes les 2 minutes
let imap;
let connectionAttemptTimer;
let isConnecting = false;
let prospectsMapByEmail = new Map();

async function buildProspectsEmailMap() {
  try {
    const prospects = await getMergedProspects();
    prospectsMapByEmail.clear();
    prospects.forEach(p => {
      if (p.Email) {
        prospectsMapByEmail.set(p.Email.toLowerCase(), p);
      }
    });
    console.log(`[EmailReceiver] Cache prospects mis à jour. ${prospectsMapByEmail.size} emails indexés.`);
  } catch (error) {
    console.error("[EmailReceiver] Erreur lors de la mise à jour du cache prospects:", error.message);
  }
}

async function processNewEmails(currentImap) {
  if (currentImap.state !== 'authenticated') {
    console.log("[EmailReceiver] Connexion perdue, arrêt du traitement.");
    return;
  }

  await buildProspectsEmailMap(); // Mettre à jour le cache des prospects

  currentImap.openBox('INBOX', true, (err, box) => {
    if (err) {
      console.error('[EmailReceiver] Erreur ouverture INBOX:', err);
      return;
    }
    
    currentImap.search(['UNSEEN'], (err, uids) => {
      if (err) {
        console.error('[EmailReceiver] Erreur de recherche IMAP:', err);
        return;
      }
      
      if (!uids || uids.length === 0) {
        // console.log('[EmailReceiver] Aucun nouvel email non lu.');
        return;
      }

      console.log(`[EmailReceiver] ${uids.length} nouveaux emails non lus trouvés.`);

      const f = currentImap.fetch(uids, { bodies: '', markSeen: true });

      f.on('message', (msg, seqno) => {
        let buffer = '';
        msg.on('body', (stream, info) => {
          stream.on('data', (chunk) => buffer += chunk.toString('utf8'));
        });
        stream.once('end', async () => {
          try {
            const parsed = await simpleParser(buffer);
            const fromEmail = parsed.from?.value[0]?.address?.toLowerCase();
            if (!fromEmail) return;

            const subject = parsed.subject || 'Sans sujet';
            const textContent = parsed.text || '';

            console.log(`[EmailReceiver] Traitement email de: ${fromEmail}, Sujet: ${subject}`);

            const prospect = prospectsMapByEmail.get(fromEmail);
            if (prospect) {
              const interactionData = [
                new Date().toISOString(), prospect.Identifiant, 'Email',
                'Réception Automatique', subject,
                textContent.substring(0, 500) + (textContent.length > 500 ? '...' : ''),
                'Reçu', '', '',
              ];
              await appendSheetData('Interactions', interactionData);
              console.log(`[EmailReceiver] Email de ${fromEmail} enregistré pour le prospect ${prospect['Nom Complet']}.`);
            } else {
              console.log(`[EmailReceiver] Email de ${fromEmail} non associé à un prospect existant.`);
            }
          } catch (parseError) {
            console.error('[EmailReceiver] Erreur de parsing email:', parseError);
          }
        });
      });

      f.once('error', (err) => {
        console.error('[EmailReceiver] Erreur fetch IMAP:', err);
      });

      f.once('end', () => {
        console.log('[EmailReceiver] Fin du fetch des messages.');
      });
    });
  });
}

async function connectAndMonitor() {
  if (isConnecting) return;
  isConnecting = true;
  clearTimeout(connectionAttemptTimer);

  console.log("[EmailReceiver] Tentative de connexion/vérification...");
  const settings = await getSettings();
  const { imapUser, imapPass, imapHost, imapPort } = settings;

  if (!imapUser || !imapPass || !imapHost || !imapPort) {
    console.warn("[EmailReceiver] Configuration IMAP incomplète. Prochaine tentative dans 5 minutes.");
    isConnecting = false;
    connectionAttemptTimer = setTimeout(connectAndMonitor, 5 * 60 * 1000);
    return;
  }

  const imapConfig = {
    user: imapUser,
    password: imapPass,
    host: imapHost,
    port: parseInt(imapPort, 10),
    tls: true, // On force le TLS, standard aujourd'hui
    tlsOptions: { rejectUnauthorized: false } // Moins sécurisé mais plus compatible
  };

  if (imap && imap.state !== 'disconnected') {
    imap.destroy(); // S'assurer que l'ancienne connexion est bien terminée
  }
  
  imap = new Imap(imapConfig);

  const handleDisconnect = (reason) => {
    if (isConnecting) return; // Évite les multiples tentatives
    console.log(`[EmailReceiver] Déconnecté. Raison: ${reason}. Prochaine tentative dans ${CHECK_INTERVAL_MS / 1000}s.`);
    imap.removeAllListeners();
    imap = null;
    connectionAttemptTimer = setTimeout(connectAndMonitor, CHECK_INTERVAL_MS);
  };

  imap.once('ready', () => {
    isConnecting = false;
    console.log('[EmailReceiver] Connecté à IMAP. Surveillance active.');
    processNewEmails(imap); // Lancer un premier traitement
    // Vérifier périodiquement
    const intervalId = setInterval(() => {
      if (imap && imap.state === 'authenticated') {
        processNewEmails(imap);
      } else {
        console.log("[EmailReceiver] Connexion perdue, arrêt de l'intervalle.");
        clearInterval(intervalId);
        handleDisconnect('État non authentifié');
      }
    }, CHECK_INTERVAL_MS);
  });

  imap.once('error', (err) => {
    console.error('[EmailReceiver] Erreur IMAP:', err.message);
    handleDisconnect('Erreur');
  });

  imap.once('end', () => handleDisconnect('Connexion terminée'));

  try {
    imap.connect();
  } catch (err) {
    console.error('[EmailReceiver] Erreur de connexion synchrone:', err.message);
    isConnecting = false;
    handleDisconnect('Erreur de connexion');
  }
}

module.exports = { connectAndMonitor };
