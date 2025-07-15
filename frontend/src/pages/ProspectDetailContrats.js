import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Ce composant affiche la liste des contrats pour un prospect donné
export default function ProspectDetailContrats({ prospectId }) {
  const [contrats, setContrats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!prospectId) return;

    async function fetchContrats() {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get('/api/data/Contrats Assurance de personnes');
        const headers = res.data[0];
        const rows = res.data.slice(1);

        // Trouver les index des colonnes importantes
        const idContactIdx = headers.indexOf('Contact - Identifiant');
        const numContratIdx = headers.indexOf('Contrat - N° de contrat');
        const produitIdx = headers.indexOf('Contrat - Produit');
        const statutIdx = headers.indexOf('Contrat - Statut');
        const dateEffetIdx = headers.indexOf("Contrat - Début d'effet");
        const primeNetteIdx = headers.indexOf('Contrat - Prime nette annuelle');

        if (idContactIdx === -1) {
          throw new Error("La colonne 'Contact - Identifiant' est introuvable dans la feuille Contrats.");
        }

        // Filtrer les contrats pour ne garder que ceux du prospect actuel
        const prospectContrats = rows
          .filter(row => row[idContactIdx] === prospectId)
          .map(row => ({
            id: row[numContratIdx],
            produit: row[produitIdx],
            statut: row[statutIdx],
            dateEffet: row[dateEffetIdx],
            primeNette: row[primeNetteIdx] || 'N/A',
          }));
        
        setContrats(prospectContrats);

      } catch (err) {
        setError('Erreur lors du chargement des contrats. ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchContrats();
  }, [prospectId]);

  if (loading) return <div className="text-center text-gray-500">Chargement des contrats...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;
  if (contrats.length === 0) return <div className="text-center text-gray-400">Aucun contrat trouvé pour ce prospect.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">N° Contrat</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Produit</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Statut</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Date d'effet</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Prime Nette Annuelle</th>
          </tr>
        </thead>
        <tbody>
          {contrats.map(contrat => (
            <tr key={contrat.id} className="border-b hover:bg-violet-50 cursor-pointer" onClick={() => navigate(`/contrats/${contrat.id}`)}>
              <td className="px-4 py-2 font-medium text-violet-700">{contrat.id}</td>
              <td className="px-4 py-2">{contrat.produit}</td>
              <td className="px-4 py-2">{contrat.statut}</td>
              <td className="px-4 py-2">{contrat.dateEffet}</td>
              <td className="px-4 py-2">{contrat.primeNette}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
