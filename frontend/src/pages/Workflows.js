import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

export default function Workflows() {
  const [workflows, setWorkflows] = useState([]);
  const [segments, setSegments] = useState({}); // Pour stocker les segments IA
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State pour le suivi de l'exécution du workflow
  const [executionStatus, setExecutionStatus] = useState('idle'); // idle, running, finished, error
  const [executionLogs, setExecutionLogs] = useState([]);
  const [executionSummary, setExecutionSummary] = useState(null);
  const [executionError, setExecutionError] = useState('');

  // State pour le formulaire de création/édition
  const [showForm, setShowForm] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null); // null ou l'objet workflow en édition
  const [formNom, setFormNom] = useState('');
  const [formDeclencheur, setFormDeclencheur] = useState('');
  const [formEtapes, setFormEtapes] = useState(''); // JSON string
  const [formStatut, setFormStatut] = useState('Actif');
  const [formSegmentCible, setFormSegmentCible] = useState('');
  const [formSujetEmail, setFormSujetEmail] = useState('');
  const [formCorpsEmail, setFormCorpsEmail] = useState('');
  const [formError, setFormError] = useState('');

  // State pour le lancement dynamique de campagne
  const [selectedSegmentName, setSelectedSegmentName] = useState('');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');

  // Helper pour parser les données des feuilles Google Sheets
  const parseSheetData = (data) => {
    if (!data || data.length === 0) return [];
    const headers = data[0];
    const rows = data.slice(1);
    return rows.map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] || ''; });
      try {
        if (obj.Étapes) obj.Étapes = JSON.parse(obj.Étapes);
      } catch (e) {
        obj.Étapes = [];
      }
      return obj;
    });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [workflowsRes, segmentsRes] = await Promise.all([
        axios.get('/api/workflows'), // Utilise la nouvelle API CRUD
        axios.get('/api/ia/segments') // Récupère les segments IA
      ]);

      const parsedWorkflows = parseSheetData(workflowsRes.data);
      setWorkflows(parsedWorkflows);
      setSegments(segmentsRes.data);

      // Initialiser les sélections si des données existent
      if (parsedWorkflows.length > 0) {
        setSelectedWorkflowId(parsedWorkflows[0].ID);
      }
      const segmentNames = Object.keys(segmentsRes.data);
      if (segmentNames.length > 0) {
        setSelectedSegmentName(segmentNames[0]);
      }

    } catch (err) {
      setError('Erreur lors du chargement des données. Assurez-vous que le serveur backend est démarré et que les feuilles Google Sheets sont correctement configurées.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fonction pour lancer une campagne IA dynamique
  async function lancerCampagneIA() {
    setExecutionStatus('running');
    setExecutionLogs([]);
    setExecutionSummary(null);
    setExecutionError('');

    if (!selectedSegmentName || !selectedWorkflowId) {
      setExecutionError('Veuillez sélectionner un segment et un workflow.');
      setExecutionStatus('error');
      return;
    }

    try {
      const res = await axios.post('/api/ia/launch-workflow', {
        segmentName: selectedSegmentName,
        workflowId: selectedWorkflowId,
      });
      setExecutionSummary(res.data.results);
      setExecutionLogs(res.data.actions || []);
      setExecutionStatus('finished');
    } catch (err) {
      setExecutionError(err.response?.data?.error || err.message);
      setExecutionStatus('error');
    }
  }

  // Fonctions CRUD (inchangées)
  const resetForm = () => {
    setFormNom('');
    setFormDeclencheur('');
    setFormEtapes('');
    setFormStatut('Actif');
    setFormSegmentCible('');
    setFormSujetEmail('');
    setFormCorpsEmail('');
    setFormError('');
    setEditingWorkflow(null);
    setShowForm(false);
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const workflowData = {
        Nom: formNom,
        Déclencheur: formDeclencheur,
        Étapes: formEtapes,
        Statut: formStatut,
        Segment_cible: formSegmentCible,
        Sujet_Email: formSujetEmail,
        Corps_Email: formCorpsEmail,
      };

      if (editingWorkflow) {
        await axios.put(`/api/workflows/${editingWorkflow.ID}`, workflowData);
      } else {
        await axios.post('/api/workflows', workflowData);
      }
      resetForm();
      fetchData(); // Recharger les données après modification
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erreur lors de la sauvegarde du workflow.');
    }
  };

  const handleEditClick = (workflow) => {
    setEditingWorkflow(workflow);
    setFormNom(workflow.Nom);
    setFormDeclencheur(workflow.Déclencheur);
    setFormEtapes(JSON.stringify(workflow.Étapes, null, 2));
    setFormStatut(workflow.Statut);
    setFormSegmentCible(workflow['Segment cible']);
    setFormSujetEmail(workflow['Sujet Email']);
    setFormCorpsEmail(workflow['Corps Email']);
    setShowForm(true);
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce workflow ?')) {
      try {
        await axios.delete(`/api/workflows/${id}`);
        fetchData(); // Recharger les données après suppression
      } catch (err) {
        setError(err.response?.data?.error || 'Erreur lors de la suppression du workflow.');
      }
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-extrabold mb-6 text-gray-800">Workflows d'Automatisation IA</h1>
      
      {/* Section du Centre de Contrôle IA */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 mb-10">
        <h2 className="text-xl font-bold text-violet-800 p-4 bg-violet-50 border-b border-violet-200">Centre de Campagne IA</h2>
        <div className="p-6">
          <p className="text-gray-600 mb-4">Sélectionnez un segment et un workflow pour lancer une campagne d'automatisation ciblée.</p>
          
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <select
              className="border border-gray-300 rounded-md shadow-sm p-2"
              value={selectedSegmentName}
              onChange={e => setSelectedSegmentName(e.target.value)}
              disabled={executionStatus === 'running'}
            >
              {Object.keys(segments).length === 0 && <option value="">Chargement des segments...</option>}
              {Object.keys(segments).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <select
              className="border border-gray-300 rounded-md shadow-sm p-2"
              value={selectedWorkflowId}
              onChange={e => setSelectedWorkflowId(e.target.value)}
              disabled={executionStatus === 'running'}
            >
              {workflows.length === 0 && <option value="">Chargement des workflows...</option>}
              {workflows.map(wf => (
                <option key={wf.ID} value={wf.ID}>{wf.Nom}</option>
              ))}
            </select>

            <button
              onClick={lancerCampagneIA}
              disabled={executionStatus === 'running' || !selectedSegmentName || !selectedWorkflowId}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executionStatus === 'running' && <FaSpinner className="animate-spin" />}
              Lancer la Campagne
            </button>
          </div>

          {/* Zone d'affichage des résultats de l'exécution */}
          {executionStatus !== 'idle' && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              {executionStatus === 'running' && (
                <div className="flex items-center gap-3 text-gray-700">
                  <FaSpinner className="animate-spin text-2xl text-violet-500" />
                  <span className="font-semibold">Exécution en cours... L'IA analyse les données et envoie les emails.</span>
                </div>
              )}
              {executionStatus === 'error' && (
                <div className="text-red-600 font-bold">Erreur lors de l'exécution : {executionError}</div>
              )}
              {executionStatus === 'finished' && (
                <div>
                  <h3 className="text-lg font-bold text-green-700 mb-2">Campagne Terminée !</h3>
                  {executionSummary && (
                    <p className="mb-4 font-semibold">
                      Résumé : {executionSummary.sent} emails envoyés, {executionSummary.failed} échecs.
                    </p>
                  )}
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {executionLogs.map((log, index) => (
                      <div key={index} className={`flex items-start gap-2 text-sm p-2 rounded ${log.status === 'Success' ? 'bg-green-50' : 'bg-red-50'}`}>
                        {log.status === 'Success' ? 
                          <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" /> : 
                          <FaTimesCircle className="text-red-500 mt-1 flex-shrink-0" />
                        }
                        <div>
                          <span className="font-bold">{log.contactName || log.contactId}:</span> {log.status === 'Success' ? 'Email envoyé.' : <span className="text-red-700">{log.error}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Formulaire de création/édition de workflow */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 mb-10 p-6">
        <h2 className="text-xl font-bold text-violet-800 mb-4">
          {editingWorkflow ? `Modifier le Workflow : ${editingWorkflow.Nom}` : 'Créer un Nouveau Workflow'}
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
              <label htmlFor="declencheur" className="block text-sm font-medium text-gray-700">Déclencheur</label>
              <input type="text" id="declencheur" value={formDeclencheur} onChange={e => setFormDeclencheur(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
            </div>
            <div>
              <label htmlFor="etapes" className="block text-sm font-medium text-gray-700">Étapes (JSON)</label>
              <textarea id="etapes" rows="5" value={formEtapes} onChange={e => setFormEtapes(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono text-xs" placeholder='Ex: [{"type":"email","delay":"0d","template":"relance_1"}]' required></textarea>
            </div>
            <div>
              <label htmlFor="statut" className="block text-sm font-medium text-gray-700">Statut</label>
              <select id="statut" value={formStatut} onChange={e => setFormStatut(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                <option>Actif</option>
                <option>Inactif</option>
                <option>Brouillon</option>
              </select>
            </div>
            <div>
              <label htmlFor="segmentCible" className="block text-sm font-medium text-gray-700">Segment Cible</label>
              <input type="text" id="segmentCible" value={formSegmentCible} onChange={e => setFormSegmentCible(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
            </div>
            <div>
              <label htmlFor="sujetEmail" className="block text-sm font-medium text-gray-700">Sujet Email</label>
              <input type="text" id="sujetEmail" value={formSujetEmail} onChange={e => setFormSujetEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
            </div>
            <div>
              <label htmlFor="corpsEmail" className="block text-sm font-medium text-gray-700">Corps Email</label>
              <textarea id="corpsEmail" rows="5" value={formCorpsEmail} onChange={e => setFormCorpsEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required></textarea>
            </div>
            <div className="flex space-x-4">
              <button type="submit" className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 transition">
                {editingWorkflow ? 'Mettre à jour' : 'Créer'}
              </button>
              {editingWorkflow && (
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition">
                  Annuler
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Section de la liste des workflows disponibles */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <h2 className="text-xl font-bold text-gray-700 p-4 bg-gray-50 border-b">Workflows Disponibles ({workflows.length})</h2>
        <div className="overflow-x-auto">
          {workflows.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">Aucun workflow disponible. Créez-en un ci-dessus !</div>
          ) : (
            <table className="w-full text-base">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 text-left font-semibold text-gray-600">ID</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-600">Nom</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-600">Déclencheur</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-600">Statut</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-600">Segment Cible</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((workflow) => (
                  <tr key={workflow.ID} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{workflow.ID}</td>
                    <td className="py-3 px-4 font-medium text-violet-700">{workflow.Nom}</td>
                    <td className="py-3 px-4">{workflow.Déclencheur}</td>
                    <td className="py-3 px-4">{workflow.Statut}</td>
                    <td className="py-3 px-4">{workflow['Segment cible']}</td>
                    <td className="py-3 px-4 flex gap-2">
                      <button onClick={() => handleEditClick(workflow)} className="text-blue-600 hover:text-blue-800"><FaEdit /></button>
                      <button onClick={() => handleDeleteClick(workflow.ID)} className="text-red-600 hover:text-red-800"><FaTrash /></button>
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
