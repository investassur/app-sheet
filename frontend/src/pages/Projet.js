import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Projet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prospect, setProspect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!prospect) return <div className="p-8 text-center text-gray-400">Prospect introuvable.</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans" style={{ fontFamily: 'Inter, Nunito, sans-serif' }}>
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-10 py-6 flex flex-col md:flex-row md:items-center md:justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-2 text-violet-600 hover:underline text-base font-medium"
            onClick={() => navigate(-1)}
          >
            Retour à la liste
          </button>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight ml-4">Fiche Projet</h1>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-4">
          <span className="text-xl font-bold text-violet-700 flex items-center gap-2">
            {prospect['Nom Complet']}
          </span>
          {prospect['Raison sociale'] && (
            <span className="ml-2 text-base text-gray-400">({prospect['Raison sociale']})</span>
          )}
        </div>
      </div>
      <div className="px-10 py-8 max-w-7xl mx-auto">
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
      </div>
    </div>
  );
}
