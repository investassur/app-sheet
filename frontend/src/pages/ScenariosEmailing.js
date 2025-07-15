import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

export default function ScenariosEmailing() {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State pour le formulaire de création/édition
  const [showForm, setShowForm] = useState(false);
  const [editingScenario, setEditingScenario] = useState(null); // null ou l'objet scenario en édition
  const [formNom, setFormNom] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formContenu, setFormContenu] = useState('');
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/scenarios-emailing'); // Utilise la nouvelle API
      const headers = res.data[0];
      const rows = res.data.slice(1);
      const parsedScenarios = rows.map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] || ''; });
        return obj;
      });
      setScenarios(parsedScenarios);
    } catch (err) {
      setError('Erreur lors du chargement des scénarios emailing. Assurez-vous que le serveur backend est démarré et que la feuille "ScenariosEmailing" existe et est correctement configurée.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fonctions CRUD
  const resetForm = () => {
    setFormNom('');
    setFormDescription('');
    setFormContenu('');
    setFormError('');
    setEditingScenario(null);
    setShowForm(false);
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const scenarioData = {
        Nom: formNom,
        Description: formDescription,
        Contenu: formContenu,
      };

      if (editingScenario) {
        await axios.put(`/api/scenarios-emailing/${editingScenario.ID}`, scenarioData);
      } else {
        await axios.post('/api/scenarios-emailing', scenarioData);
      }
      resetForm();
      fetchData(); // Recharger les données après modification
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erreur lors de la sauvegarde du scénario.');
    }
  };

  const handleEditClick = (scenario) => {
    setEditingScenario(scenario);
    setFormNom(scenario.Nom);
    setFormDescription(scenario.Description);
    setFormContenu(scenario.Contenu);
    setShowForm(true);
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce scénario ?')) {
      try {
        await axios.delete(`/api/scenarios-emailing/${id}`);
        fetchData(); // Recharger les données après suppression
      } catch (err) {
        setError(err.response?.data?.error || 'Erreur lors de la suppression du scénario.');
      }
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-extrabold mb-6 text-gray-800">Scénarios Emailing</h1>
      
      {/* Formulaire de création/édition de scénario */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 mb-10 p-6">
        <h2 className="text-xl font-bold text-violet-800 mb-4">
          {editingScenario ? `Modifier le Scénario : ${editingScenario.Nom}` : 'Créer un Nouveau Scénario'}
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center gap-2 hover:bg-blue-600 transition"
        >
          <FaPlus /> {showForm ? 'Masquer le formulaire' : 'Afficher le formulaire'}
        </button>

        {showForm && (
          <form onSubmit={handleCreateOrUpdate} className="space-y-4">
            {formError && <div className="text-red-600 text-sm">{formError}</div>}
            <div>
              <label htmlFor="nom" className="block text-sm font-medium text-gray-700">Nom</label>
              <input type="text" id="nom" value={formNom} onChange={e => setFormNom(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <input type="text" id="description" value={formDescription} onChange={e => setFormDescription(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
            </div>
            <div>
              <label htmlFor="contenu" className="block text-sm font-medium text-gray-700">Contenu (HTML ou Texte)</label>
              <textarea id="contenu" rows="8" value={formContenu} onChange={e => setFormContenu(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required></textarea>
            </div>
            <div className="flex space-x-4">
              <button type="submit" className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 transition">
                {editingScenario ? 'Mettre à jour' : 'Créer'}
              </button>
              {editingScenario && (
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition">
                  Annuler
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Section de la liste des scénarios disponibles */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <h2 className="text-xl font-bold text-gray-700 p-4 bg-gray-50 border-b">Scénarios Disponibles ({scenarios.length})</h2>
        <div className="overflow-x-auto">
          {scenarios.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">Aucun scénario disponible. Créez-en un ci-dessus !</div>
          ) : (
            <table className="w-full text-base">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 text-left font-semibold text-gray-600">ID</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-600">Nom</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-600">Description</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((scenario) => (
                  <tr key={scenario.ID} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{scenario.ID}</td>
                    <td className="py-3 px-4 font-medium text-violet-700">{scenario.Nom}</td>
                    <td className="py-3 px-4">{scenario.Description}</td>
                    <td className="py-3 px-4 flex gap-2">
                      <button onClick={() => handleEditClick(scenario)} className="text-blue-600 hover:text-blue-800"><FaEdit /></button>
                      <button onClick={() => handleDeleteClick(scenario.ID)} className="text-red-600 hover:text-red-800"><FaTrash /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
