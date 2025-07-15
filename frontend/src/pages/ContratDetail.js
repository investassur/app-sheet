import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const FIELDS = {
  numContrat: 'Contrat - N° de contrat',
  compagnie: 'Contrat - Compagnie',
  produit: 'Contrat - Produit',
  formule: 'Contrat - Formule',
  dateEffet: "Contrat - Début d'effet",
  dateEcheance: "Contrat - Date d'échéance",
  dateResiliation: 'Contrat - Fin de contrat',
  motifResiliation: 'Contrat - Motif de résiliation',
  primeBruteMensuelle: 'Contrat - Prime brute mensuelle',
  primeNetteMensuelle: 'Contrat - Prime nette mensuelle',
  primeBruteAnnuelle: 'Contrat - Prime brute annuelle',
  primeNetteAnnuelle: 'Contrat - Prime nette annuelle',
  commission1A: "Contrat - Commissionnement 1ère année (%)",
  commissionSuiv: 'Contrat - Commissionnement années suivantes (%)',
  attribution: 'Projet - Attribution',
  statut: 'Projet - Statut',
  contact: 'Contact - Identifiant',
  prenom: 'Contact - Prénom',
  nom: 'Contact - Nom',
  raisonSociale: 'Contact - Raison sociale',
};

export default function ContratDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contrat, setContrat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchContrat() {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get('/api/data/Contrats Assurance de personnes');
        const headers = res.data[0];
        const rows = res.data.slice(1).map(row => {
          const obj = {};
          headers.forEach((h, i) => { obj[h] = row[i] || ''; });
          return obj;
        });
        const found = rows.find(c => c[FIELDS.numContrat] === id);
        setContrat(found || null);
      } catch (err) {
        setError('Erreur lors du chargement du contrat.');
      } finally {
        setLoading(false);
      }
    }
    fetchContrat();
  }, [id]);

  if (loading) return <div className="p-10 text-center text-gray-400">Chargement...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;
  if (!contrat) return <div className="p-10 text-center text-gray-300">Contrat introuvable.</div>;

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 py-10 font-sans" style={{ fontFamily: 'Inter, Nunito, sans-serif' }}>
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-8">
        <button onClick={() => navigate(-1)} className="mb-6 text-violet-600 hover:underline">&larr; Retour</button>
        <h1 className="text-2xl font-extrabold mb-6 text-gray-800">Détail du contrat #{contrat[FIELDS.numContrat]}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="font-bold text-violet-700 mb-2">Informations générales</h2>
            <ul className="text-gray-700 text-sm space-y-1">
              <li><b>Compagnie:</b> {contrat[FIELDS.compagnie]}</li>
              <li><b>Produit:</b> {contrat[FIELDS.produit]}</li>
              <li><b>Formule:</b> {contrat[FIELDS.formule]}</li>
              <li><b>Date d'effet:</b> {contrat[FIELDS.dateEffet]}</li>
              <li><b>Date d'échéance:</b> {contrat[FIELDS.dateEcheance]}</li>
              <li><b>Date de résiliation:</b> {contrat[FIELDS.dateResiliation]}</li>
              <li><b>Motif résiliation:</b> {contrat[FIELDS.motifResiliation]}</li>
              <li><b>Statut:</b> {contrat[FIELDS.statut]}</li>
            </ul>
          </div>
          <div>
            <h2 className="font-bold text-violet-700 mb-2">Primes & Commissions</h2>
            <ul className="text-gray-700 text-sm space-y-1">
              <li><b>Prime brute annuelle:</b> {contrat[FIELDS.primeBruteAnnuelle]} €</li>
              <li><b>Prime nette annuelle:</b> {contrat[FIELDS.primeNetteAnnuelle]} €</li>
              <li><b>Prime brute mensuelle:</b> {contrat[FIELDS.primeBruteMensuelle]} €</li>
              <li><b>Prime nette mensuelle:</b> {contrat[FIELDS.primeNetteMensuelle]} €</li>
              <li><b>Commission 1ère année:</b> {contrat[FIELDS.commission1A]} %</li>
              <li><b>Commission années suivantes:</b> {contrat[FIELDS.commissionSuiv]} %</li>
              <li><b>Type de commissionnement:</b> {contrat['Contrat - Type de commissionnement']}</li>
            </ul>
          </div>
        </div>
        <div className="mt-8">
          <h2 className="font-bold text-violet-700 mb-2">Contact associé</h2>
          <ul className="text-gray-700 text-sm space-y-1">
            <li><b>Identifiant:</b> {contrat[FIELDS.contact]}</li>
            <li><b>Prénom:</b> {contrat[FIELDS.prenom]}</li>
            <li><b>Nom:</b> {contrat[FIELDS.nom]}</li>
            <li><b>Raison sociale:</b> {contrat[FIELDS.raisonSociale]}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
