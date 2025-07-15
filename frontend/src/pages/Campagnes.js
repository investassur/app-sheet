import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Campagnes() {
  const [campaigns, setCampaigns] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    subject: '',
    htmlContent: '',
    segmentId: '',
  });

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [segmentsRes, campaignsRes] = await Promise.all([
        axios.get('/api/ia/segments'),
        axios.get('http://localhost:3001/api/campaigns')
      ]);

      // Segments
      const segmentsArray = Object.keys(segmentsRes.data).map(key => ({
        id: key,
        name: `${key} (${Object.values(segmentsRes.data[key]).reduce((a, b) => a + (Array.isArray(b) ? b.length : 0), Array.isArray(segmentsRes.data[key]) ? segmentsRes.data[key].length : 0)})`
      }));
      setSegments(segmentsArray);

      // Campaigns
      setCampaigns(campaignsRes.data);

    } catch (err) {
      setError('Erreur lors du chargement des données.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCampaign(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateContent = async () => {
    if (!newCampaign.name || !newCampaign.subject) {
      alert("Veuillez saisir le nom et le sujet de la campagne pour générer le contenu.");
      return;
    }
    try {
      const prompt = `Générer un contenu HTML pour un email de campagne marketing. Nom de la campagne: "${newCampaign.name}". Sujet: "${newCampaign.subject}". Le contenu doit être engageant et professionnel.`;
      const response = await axios.post('http://localhost:3001/api/ia/generate-email-content', { prompt });
      setNewCampaign(prev => ({ ...prev, htmlContent: response.data.content }));
    } catch (err) {
      alert("Échec de la génération de contenu par l'IA.");
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const campaignDetails = {
        name: newCampaign.name,
        subject: newCampaign.subject,
        htmlContent: newCampaign.htmlContent,
        segmentId: newCampaign.segmentId,
        sender: { name: 'Premunia CRM', email: '694946002@smtp-brevo.com' }, // Utiliser l'email Brevo
      };
      await axios.post('http://localhost:3001/api/campaigns', campaignDetails);
      alert('Campagne créée avec succès !');
      setNewCampaign({ name: '', subject: '', htmlContent: '', segmentId: '' });
      // Recharger les campagnes existantes si une API est disponible
      // fetchCampaigns(); 
    } catch (err) {
      alert('Échec de la création de la campagne.');
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-6">Gestion des Campagnes</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Créer une nouvelle campagne</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom de la campagne</label>
              <input type="text" name="name" id="name" value={newCampaign.name} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
            </div>
            <div className="mb-4">
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Sujet de l'email</label>
              <input type="text" name="subject" id="subject" value={newCampaign.subject} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
            </div>
            <div className="mb-4">
              <label htmlFor="htmlContent" className="block text-sm font-medium text-gray-700">Contenu HTML</label>
              <textarea name="htmlContent" id="htmlContent" value={newCampaign.htmlContent} onChange={handleInputChange} rows="6" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required></textarea>
              <button type="button" onClick={handleGenerateContent} className="mt-2 w-full bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
                Générer le contenu avec l'IA
              </button>
            </div>
            <div className="mb-4">
              <label htmlFor="segmentId" className="block text-sm font-medium text-gray-700">Audience (Segment)</label>
              <select name="segmentId" id="segmentId" value={newCampaign.segmentId} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required>
                <option value="">Sélectionner un segment</option>
                {segments.map(segment => (
                  <option key={segment.id} value={segment.id}>{segment.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              Créer la campagne
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Campagnes existantes</h2>
          {loading ? (
            <p>Chargement des campagnes...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : campaigns.length === 0 ? (
            <p className="text-center text-gray-500">Aucune campagne trouvée.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {campaigns.map(campaign => (
                <div key={campaign.id} className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{campaign.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">Statut: <span className={`font-semibold ${campaign.status === 'sent' ? 'text-green-600' : 'text-yellow-600'}`}>{campaign.status}</span></p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Destinataires:</p>
                      <p className="font-semibold text-gray-900">{campaign.recipients.total || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Ouvertures:</p>
                      <p className="font-semibold text-gray-900">{campaign.statistics.globalStats.opened || 0} ({((campaign.statistics.globalStats.opened / campaign.recipients.total) * 100 || 0).toFixed(1)}%)</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Clics:</p>
                      <p className="font-semibold text-gray-900">{campaign.statistics.globalStats.clicked || 0} ({((campaign.statistics.globalStats.clicked / campaign.recipients.total) * 100 || 0).toFixed(1)}%)</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Désinscrits:</p>
                      <p className="font-semibold text-gray-900">{campaign.statistics.globalStats.unsubscribed || 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
