// backend/email.js
// Module pour l'envoi d'emails via Nodemailer

const nodemailer = require('nodemailer');
const express = require('express');
const router = express.Router();
const { getSettings } = require('./settingsManager');

/**
 * Envoie un email en utilisant les paramètres SMTP dynamiques.
 * @param {string} to - Le destinataire de l'email.
 * @param {string} subject - Le sujet de l'email.
 * @param {string} html - Le corps de l'email au format HTML.
 */
async function sendEmail(to, subject, html) {
  const settings = await getSettings();
  const { smtpHost, smtpPort, smtpUser, smtpPass } = settings;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    throw new Error("Paramètres SMTP non configurés. Veuillez les définir dans la page d'Administration.");
  }

  // On crée le transporteur à la volée avec les derniers paramètres
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    secure: parseInt(smtpPort, 10) === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"Premunia CRM" <${smtpUser}>`, // L'expéditeur
      to: to,
      subject: subject,
      html: html,
    });

    console.log('Email envoyé: %s', info.messageId);
    return info;
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    throw new Error("L'envoi de l'email a échoué.");
  }
}

// Route pour envoyer un email manuellement depuis le frontend
router.post('/send', async (req, res) => {
  const { to, subject, html } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Les champs to, subject, et html sont requis.' });
  }

  try {
    await sendEmail(to, subject, html);
    res.status(200).json({ message: 'Email envoyé avec succès.' });
  } catch (error) {
    res.status(500).json({ error: "L'envoi de l'email a échoué." });
  }
});

module.exports = { sendEmail, router };
