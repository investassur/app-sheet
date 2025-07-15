import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProspectDetailContrats from './ProspectDetailContrats';
import EmailForm from '../components/EmailForm';

export default function ProspectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prospect, setProspect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [section, setSection] = useState('contact');

  useEffect(() => {
    async function fetchProspect() {
      setLoading(true);
      setError(null);
      try {
        const contactsRes = await axios.get('/api/data/Contacts');
        const contactsIndex = {};
        const contactHeaders = contactsRes.data[0];
        for (let i = 1; i < contactsRes.data.length; i++) {
          const contact = {};
          contactHeaders.forEach((header, idx) => {
            contact[header] = contactsRes.data[i][idx] || '';
          });
          if (contact['Identifiant']) contactsIndex[contact['Identifiant']] = contact;
        }
        const projetsRes = await axios.get('/api/data/Projets Assurance de personnes');
        const projetHeaders = projetsRes.data[0];
        let found = null;
        for (let i = 1; i < projetsRes.data.length; i++) {
          const projet = {};
          projetHeaders.forEach((header, idx) => {
            projet[header] = projetsRes.data[i][idx] || '';
          });
          if (projet['Identifiant'] === id || projet['Identifiant contact'] === id) {
            const contact = contactsIndex[projet['Identifiant contact']];
            found = {
              ...projet,
              'Prénom': contact ? contact['Prénom'] : '-',
              'Nom': contact ? contact['Nom'] : '-',
              'Téléphone 1': contact ? contact['Téléphone 1'] : '-',
              'Email': contact ? contact['Email'] : '-',
              'Ville': contact ? contact['Ville'] : '-',
              'Raison sociale': contact ? contact['Raison sociale'] : '',
              'Nom Complet': contact ? `${contact['Prénom'] || '-'} ${contact['Nom'] || '-'}`.trim() : '-',
              'Attribution': projet['Attribution'] || (contact ? contact['Attribution'] : ''),
              'Date de création': projet['Date de création'] || '',
            };
            break;
          }
        }
        setProspect(found);
      } catch (err) {
        setError('Erreur lors du chargement des données.');
      } finally {
        setLoading(false);
      }
    }
    fetchProspect();
  }, [id]);

  const loadHistorique = useCallback(async () => {
    if (!prospect) return;
    setLoadingHist(true);
    try {
      const pid = prospect['Identifiant contact'] || prospect['Identifiant'] || id;
      const res = await axios.get(`/api/interactions/prospect/${pid}`);
      setHistorique(res.data.data || []);
    } catch (e) {
      setHistorique([]);
    } finally {
      setLoadingHist(false);
    }
  }, [prospect, id]);

  useEffect(() => {
    if (prospect) {
      loadHistorique();
    }
  }, [prospect, loadHistorique]);

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!prospect) return <div className="p-8 text-center text-gray-400">Prospect introuvable.</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans" style={{ fontFamily: 'Inter, Nunito, sans-serif' }}>
      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-10 py-6 flex flex-col md:flex-row md:items-center md:justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-2 text-violet-600 hover:underline text-base font-medium"
            onClick={() => navigate(-1)}
          >
            {/* <FaArrowLeft /> */} Retour à la liste
          </button>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight ml-4">Fiche Prospect</h1>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-4">
          <span className="text-xl font-bold text-violet-700 flex items-center gap-2">
            {/* <FaUser className="text-violet-500" /> */}
            {prospect['Nom Complet']}
          </span>
          {prospect['Raison sociale'] && (
            <span className="ml-2 text-base text-gray-400">({prospect['Raison sociale']})</span>
          )}
        </div>
      </div>

      {/* Rubriques navigation */}
      <div className="flex gap-2 px-10 pt-6 pb-2 bg-gray-50 border-b border-gray-100 sticky top-[92px] z-10">
        {[
          { key: 'contact', label: 'Contact' },
          { key: 'projet', label: 'Projet' },
          { key: 'contrats', label: 'Contrats' },
          { key: 'historique', label: 'Historique' },
          { key: 'taches', label: 'Tâches' },
        ].map(rub => (
          <button
            key={rub.key}
            onClick={() => setSection(rub.key)}
            className={`px-5 py-2 rounded-t-lg font-semibold text-base transition border-b-2 ${section===rub.key ? 'bg-white text-violet-700 border-violet-600 shadow' : 'text-gray-500 hover:text-violet-600 border-transparent'}`}
          >
            {rub.label}
          </button>
        ))}
      </div>

      {/* Contenu plein écran, sections pro */}
      <div className="px-10 py-8 max-w-7xl mx-auto">
        {section === 'contact' && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Informations Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-xl shadow p-8 border border-gray-100">
              <div>
                <div className="mb-3"><span className="font-semibold">Téléphone :</span> {prospect['Téléphone 1']}</div>
                <div className="mb-3"><span className="font-semibold">Email :</span> {prospect['Email']}</div>
                <div className="mb-3"><span className="font-semibold">Ville :</span> {prospect['Ville']}</div>
                <div className="mb-3"><span className="font-semibold">Commercial :</span> {prospect['Attribution']}</div>
              </div>
              <div>
                <div className="mb-3"><span className="font-semibold">Date de création :</span> {prospect['Date de création'] || '-'}</div>
                <div className="mb-3"><span className="font-semibold">Statut :</span> {prospect['Statut']}</div>
                <div className="mb-3"><span className="font-semibold">Identifiant :</span> {prospect['Identifiant']}</div>
              </div>
            </div>
          </section>
        )}
        {section === 'projet' && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Informations Projet</h2>
            <div className="bg-white rounded-xl shadow p-8 border border-gray-100">
              <div className="mb-3"><span className="font-semibold">Type :</span> {prospect['Type'] || '-'}</div>
              <div className="mb-3"><span className="font-semibold">Origine :</span> {prospect['Origine'] || '-'}</div>
              <div className="mb-3"><span className="font-semibold">Auteur :</span> {prospect['Auteur'] || '-'}</div>
              <div className="mb-3"><span className="font-semibold">Date de création :</span> {prospect['Date de création'] || '-'}</div>
              <div className="mb-3"><span className="font-semibold">Commentaire :</span> {prospect['Commentaire'] || <span className="text-gray-400">Aucun</span>}</div>
            </div>
          </section>
        )}
        {section === 'contrats' && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Contrats</h2>
            <div className="bg-white rounded-xl shadow p-8 border border-gray-100">
              <ProspectDetailContrats prospectId={prospect['Identifiant contact'] || id} />
            </div>
          </section>
        )}
        {section === 'historique' && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Nouvelle Interaction</h2>
            <div className="bg-white rounded-xl shadow p-8 border border-gray-100 mb-6">
              <EmailForm
                prospectId={prospect['Identifiant contact'] || id}
                prospectEmail={prospect['Email']}
                onSent={loadHistorique}
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 mt-12">Historique</h2>
            <div className="bg-white rounded-xl shadow p-8 border border-gray-100">
              {loadingHist ? (
                <div className="text-gray-400 italic">Chargement...</div>
              ) : historique.length === 0 ? (
                <div className="text-gray-400 italic">Aucun échange pour l’instant.</div>
              ) : (
                <ul className="space-y-4">
                  {historique.map((msg, i) => (
                    <li key={i} className="border-b pb-2">
                      <div className="text-xs text-gray-400 mb-1">{new Date(msg['Date/Heure'] || msg.date).toLocaleString('fr-FR')}</div>
                      <div><b>Type :</b> {msg.Type || msg.type}</div>
                      <div><b>Canal :</b> {msg.Canal || msg.canal}</div>
                      <div><b>Statut :</b> {msg.Statut || msg.statut}</div>
                      <div><b>Sujet :</b> {msg['Sujet/Action'] || msg.sujet}</div>
                      <div className="whitespace-pre-line mt-1">{msg['Message/Contenu'] || msg.message}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
        {section === 'taches' && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Tâches & Relances</h2>
            <div className="bg-white rounded-xl shadow p-8 border border-gray-100">
              <div className="text-gray-400 italic">Aucune tâche pour l’instant.</div>
            </div>
          </section>
        )}

        {/* Actions pro en bas de page */}
        <section className="mt-16">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Actions rapides</h2>
          <div className="flex gap-4 flex-wrap mb-4">
            <a
              href={`mailto:${prospect['Email']}`}
              className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-base font-semibold shadow-sm transition"
            >
              {/* <FaEnvelope /> */} Envoyer un email
            </a>
            <button
              className="inline-flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-base font-semibold shadow-sm transition"
              onClick={() => alert('À implémenter : Entrer ce prospect dans un workflow')}
            >
              {/* <FaCogs /> */} Entrer dans un workflow
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
