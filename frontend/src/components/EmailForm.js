import React, { useState } from 'react';
import axios from 'axios';
import { FaMagic } from 'react-icons/fa'; // Icône pour la génération IA

export default function EmailForm({ prospectId, prospectEmail, onSent }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle, sending, sent, error
  const [error, setError] = useState(null);
  const [generatingAI, setGeneratingAI] = useState(false); // État de la génération IA

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !message) {
      setError('Le sujet et le message sont requis.');
      return;
    }

    setStatus('sending');
    setError(null);

    try {
      // 1. Envoyer l'email via l'API
      await axios.post('/api/email/send', {
        to: prospectEmail,
        subject: subject,
        html: message.replace(/\n/g, '<br>'), // Convertir les sauts de ligne en <br> pour l'HTML
      });

      // 2. Enregistrer l'interaction
      await axios.post('/api/interactions', {
        prospectId: prospectId,
        type: 'Email',
        canal: 'Manuel',
        sujet: subject,
        message: message,
        statut: 'Envoyé',
      });

      // 3. Réinitialiser le formulaire et notifier le parent
      setStatus('sent');
      setSubject('');
      setMessage('');
      if (onSent) {
        onSent(); // Pour rafraîchir la liste de l'historique
      }
      setTimeout(() => setStatus('idle'), 3000); // Revenir à l'état initial après 3s

    } catch (err) {
      const errorMessage = err.response?.data?.error || "Une erreur est survenue.";
      setError(errorMessage);
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
          Sujet
        </label>
        <input
          type="text"
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-violet-500 focus:border-violet-500"
          placeholder="Sujet de votre email"
          disabled={status === 'sending' || generatingAI}
        />
      </div>
      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="message" className="block text-sm font-medium text-gray-700">
            Message
          </label>
          <button
            type="button"
            onClick={handleGenerateAI}
            disabled={generatingAI || status === 'sending'}
            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingAI ? 'Génération...' : <><FaMagic className="mr-1" /> Générer avec IA</>}
          </button>
        </div>
        <textarea
          id="message"
          rows="5"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-violet-500 focus:border-violet-500"
          placeholder="Composez votre message..."
          disabled={status === 'sending' || generatingAI}
        ></textarea>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:bg-gray-400"
          disabled={status === 'sending' || generatingAI}
        >
          {status === 'sending' ? 'Envoi en cours...' : 'Envoyer'}
        </button>
        {status === 'sent' && <div className="text-green-600 font-medium">Email envoyé avec succès !</div>}
        {status === 'error' && <div className="text-red-600 font-medium">Erreur: {error}</div>}
        {generatingAI && <div className="text-purple-600 font-medium">Génération IA en cours...</div>}
      </div>
    </form>
  );

  async function handleGenerateAI() {
    setGeneratingAI(true);
    setError(null);
    try {
      const prompt = `Rédige un email professionnel pour un prospect en assurance santé. Le sujet est : "${subject}". Le prospect est un particulier. Sois concis et engageant.`;
      const res = await axios.post('/api/ia/generate-email-content', { prompt });
      setMessage(res.data.content);
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de la génération IA.");
    } finally {
      setGeneratingAI(false);
    }
  }
}
