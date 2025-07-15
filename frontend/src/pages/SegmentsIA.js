import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Sous-composant pour afficher un tableau de prospects pour un segment
const SegmentTable = ({ segmentName, prospects, onExport }) => {
  const navigate = useNavigate();

  if (!prospects || prospects.length === 0) {
    return <p className="text-gray-500 px-4">Aucun prospect dans ce segment pour le moment.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Nom</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Email</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Ville</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Statut</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {prospects.map((prospect, index) => (
            <tr 
              key={prospect.Identifiant || index} 
              className="border-b hover:bg-violet-50 cursor-pointer"
              onClick={() => navigate(`/prospects/${prospect['Identifiant contact'] || prospect.Identifiant}`)}
            >
              <td className="px-4 py-2 font-medium text-violet-700">{prospect['Prénom']} {prospect['Nom']}</td>
              <td className="px-4 py-2">{prospect.Email}</td>
              <td className="px-4 py-2">{prospect.Ville}</td>
              <td className="px-4 py-2">{prospect.Statut}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function SegmentsIA() {
  const [segments, setSegments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    ageMin: '',
    ageMax: '',
    ville: '',
    departement: '',
    pays: '',
    typeProduit: '',
    statut: '',
    scoreIaMin: '',
    scoreIaMax: '',
  });
  const [recommendationPrompt, setRecommendationPrompt] = useState('');
  const [aiRecommendation, setAiRecommendation] = useState('');
  const [isAiSearchActive, setIsAiSearchActive] = useState(false); // Nouveau state

  const fetchSegments = useCallback(async (currentFilters = filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(currentFilters).toString();
      const res = await axios.get(`/api/ia/segments?${params}`);
      setSegments(res.data);
    } catch (err) {
      setError('Erreur lors du chargement des segments IA.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setIsAiSearchActive(false); // Désactiver le mode recherche IA si les filtres manuels changent
  };

  const applyFilters = () => {
    fetchSegments(filters);
    setIsAiSearchActive(false); // Désactiver le mode recherche IA si les filtres manuels sont appliqués
  };

  const handleGenerateRecommendation = async () => {
    if (!recommendationPrompt) {
      alert("Veuillez saisir une requête pour la recommandation IA.");
      return;
    }
    try {
      const response = await axios.post('http://localhost:3001/api/ia/analyze-segment-query', { query: recommendationPrompt });
      const aiFilters = response.data.filters;
      
      setFilters(aiFilters); // Appliquer les filtres générés par l'IA au formulaire
      await fetchSegments(aiFilters); // Recharger les segments avec les nouveaux filtres
      
      let recommendationText = `L'IA a analysé votre requête et a appliqué les filtres suivants : `;
      const filterDescriptions = Object.entries(aiFilters).map(([key, value]) => {
        if (typeof value === 'boolean') {
          return `${key}: ${value ? 'Oui' : 'Non'}`;
        }
        return `${key}: ${value}`;
      });
      recommendationText += filterDescriptions.join(', ') + `. Les segments affichés ci-dessous correspondent à ces critères.`;
      setAiRecommendation(recommendationText);
      setIsAiSearchActive(true); // Activer le mode recherche IA
      setRecommendationPrompt(''); // Effacer le prompt après utilisation

    } catch (err) {
      alert("Échec de la génération de recommandation par l'IA.");
      console.error(err);
      setAiRecommendation(`Erreur lors de l'analyse de la requête par l'IA: ${err.response ? JSON.stringify(err.response.data) : err.message}`);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement des segments IA...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!segments) return null;

  console.log("Segments object:", segments); // DEBUG
  console.log("isAiSearchActive:", isAiSearchActive); // DEBUG
  console.log("AI Search Result segment exists:", segments["Résultat de la recherche IA"]); // DEBUG

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-extrabold mb-8 text-gray-800">Segments IA Dynamiques</h1>
      <p className="mb-8 text-gray-600">Voici les groupes de prospects identifiés automatiquement par l'IA. Ces listes sont mises à jour en temps réel et peuvent être utilisées pour des campagnes ciblées.</p>
      
      {/* Section Filtres */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Filtrer les segments</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          <input type="number" name="ageMin" placeholder="Âge Min" value={filters.ageMin} onChange={handleFilterChange} className="border-gray-300 rounded-md shadow-sm" />
          <input type="number" name="ageMax" placeholder="Âge Max" value={filters.ageMax} onChange={handleFilterChange} className="border-gray-300 rounded-md shadow-sm" />
          <input type="text" name="ville" placeholder="Ville" value={filters.ville} onChange={handleFilterChange} className="border-gray-300 rounded-md shadow-sm" />
          <input type="text" name="departement" placeholder="Département" value={filters.departement} onChange={handleFilterChange} className="border-gray-300 rounded-md shadow-sm" />
          <input type="text" name="pays" placeholder="Pays" value={filters.pays} onChange={handleFilterChange} className="border-gray-300 rounded-md shadow-sm" />
          <input type="text" name="typeProduit" placeholder="Type de Produit" value={filters.typeProduit} onChange={handleFilterChange} className="border-gray-300 rounded-md shadow-sm" />
          <input type="text" name="statut" placeholder="Statut" value={filters.statut} onChange={handleFilterChange} className="border-gray-300 rounded-md shadow-sm" />
          <input type="number" name="scoreIaMin" placeholder="Score IA Min" value={filters.scoreIaMin} onChange={handleFilterChange} className="border-gray-300 rounded-md shadow-sm" />
          <input type="number" name="scoreIaMax" placeholder="Score IA Max" value={filters.scoreIaMax} onChange={handleFilterChange} className="border-gray-300 rounded-md shadow-sm" />
        </div>
        <button onClick={applyFilters} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
          Appliquer les filtres
        </button>
      </div>

      {/* Section Recommandation IA */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recommandation de segments par IA</h2>
        <textarea 
          placeholder="Décrivez le type de segment que vous recherchez ou l'objectif de votre campagne (ex: 'clients à fort potentiel', 'prospects intéressés par l'assurance auto')..." 
          value={recommendationPrompt} 
          onChange={(e) => setRecommendationPrompt(e.target.value)} 
          rows="3" 
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm mb-4"
        ></textarea>
        <button onClick={handleGenerateRecommendation} className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
          Générer une recommandation
        </button>
        {aiRecommendation && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="font-semibold text-gray-700">Recommandation de l'IA:</h3>
            <p className="text-gray-800" dangerouslySetInnerHTML={{ __html: aiRecommendation }}></p>
          </div>
        )}
      </div>

      {/* Affichage des segments */}
      <div className="space-y-10">
        {isAiSearchActive && segments && segments["Résultat de la recherche IA"] ? (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <h2 className="text-xl font-bold text-indigo-800 mb-0 p-4 bg-indigo-50 border-b border-indigo-200">
              Résultat de la recherche IA ({segments["Résultat de la recherche IA"].length})
            </h2>
            <SegmentTable prospects={segments["Résultat de la recherche IA"]} />
          </div>
        ) : (
          Object.entries(segments).map(([segmentName, prospectData]) => (
            <div key={segmentName} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <h2 className="text-xl font-bold text-indigo-800 mb-0 p-4 bg-indigo-50 border-b border-indigo-200">{segmentName} ({Array.isArray(prospectData) ? prospectData.length : Object.values(prospectData).reduce((a, b) => a + b.length, 0)})</h2>
              
              {Array.isArray(prospectData) ? (
                <SegmentTable prospects={prospectData} />
              ) : (
                // Cas spécial pour la segmentation par région
                <div className="space-y-6 p-4">
                  {Object.entries(prospectData).map(([ville, prospects]) => (
                    <div key={ville}>
                      <h3 className="font-semibold text-violet-700 mb-2">Région : {ville} ({prospects.length})</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <SegmentTable prospects={prospects} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
