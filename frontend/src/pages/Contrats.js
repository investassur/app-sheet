import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaRobot, FaFileContract, FaEuroSign, FaMoneyBillWave, FaChartLine, FaUserTie } from 'react-icons/fa';

const FIELDS = {
  ville: 'Contact - Ville',
  identifiant: 'Contrat - N° de contrat',
  compagnie: 'Contrat - Compagnie',
  produit: 'Contrat - Produit',
  formule: 'Contrat - Formule',
  dateEffet: "Contrat - Début d'effet",
  dateFin: 'Contrat - Fin de contrat',
  statut: 'Projet - Statut',
  montantNetteAnnuelle: 'Contrat - Prime nette annuelle',
  montantBruteAnnuelle: 'Contrat - Prime brute annuelle',
  montantNetteMensuelle: 'Contrat - Prime nette mensuelle',
  montantBruteMensuelle: 'Contrat - Prime brute mensuelle',
  commission1A: "Contrat - Commissionnement 1ère année (%)",
  commissionSuiv: 'Contrat - Commissionnement années suivantes (%)',
  typeCommission: 'Contrat - Type de commissionnement',
  commercial: 'Projet - Attribution',
  origine: 'Projet - Origine',
  contactPrenom: 'Contact - Prénom',
  contactNom: 'Contact - Nom',
  raisonSociale: 'Contact - Raison sociale',
  dateCreation: 'Projet - Date de création',
};

export default function Contrats() {
  const navigate = useNavigate();
  const [contrats, setContrats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommercial, setSelectedCommercial] = useState('');
  const [selectedOrigine, setSelectedOrigine] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(25);
  const [iaResult, setIaResult] = useState('');
  const [iaLoading, setIaLoading] = useState(false);

  // Options dynamiques pour les filtres
  const commerciauxOptions = useMemo(() => {
    const all = contrats.map(c => c.commercial).filter(Boolean);
    return Array.from(new Set(all));
  }, [contrats]);
  const origineOptions = useMemo(() => {
    const all = contrats.map(c => c.origine).filter(Boolean);
    return Array.from(new Set(all));
  }, [contrats]);

  useEffect(() => {
    async function fetchContrats() {
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
        // Extraction des contrats valides
        const contratsList = rows.filter(row => row[FIELDS.identifiant] && row[FIELDS.compagnie]).map(row => ({
          id: row[FIELDS.identifiant],
          compagnie: row[FIELDS.compagnie],
          produit: row[FIELDS.produit],
          formule: row[FIELDS.formule],
          dateEffet: row[FIELDS.dateEffet],
          dateFin: row[FIELDS.dateFin],
          statut: row[FIELDS.statut],
          montantNetteAnnuelle: row[FIELDS.montantNetteAnnuelle] || '',
          montantBruteAnnuelle: row[FIELDS.montantBruteAnnuelle] || '',
          montantNetteMensuelle: row[FIELDS.montantNetteMensuelle] || '',
          montantBruteMensuelle: row[FIELDS.montantBruteMensuelle] || '',
          commission1A: row[FIELDS.commission1A] || '',
          commissionSuiv: row[FIELDS.commissionSuiv] || '',
          typeCommission: row[FIELDS.typeCommission] || '',
          commercial: row[FIELDS.commercial] || '',
          origine: row[FIELDS.origine] || '',
          contact: (row[FIELDS.contactPrenom] || '') + ' ' + (row[FIELDS.contactNom] || ''),
          ville: row[FIELDS.ville] || '',
          raisonSociale: row[FIELDS.raisonSociale] || '',
          dateCreation: row[FIELDS.dateCreation] || '',
        }));
        setContrats(contratsList);
      } catch (err) {
        setError('Erreur lors du chargement des contrats.');
      } finally {
        setLoading(false);
      }
    }
    fetchContrats();
  }, []);

  // Filtrage combiné (search, commercial, origine, date)
  const filtered = useMemo(() => {
    let filtered = contrats;
    if (searchTerm) {
      filtered = filtered.filter(c => Object.values(c).join(' ').toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (selectedCommercial) {
      filtered = filtered.filter(c => (c.commercial || '').toLowerCase() === selectedCommercial.toLowerCase());
    }
    if (selectedOrigine) {
      filtered = filtered.filter(c => (c.origine || '').toLowerCase() === selectedOrigine.toLowerCase());
    }
    // Filtrage par date de création
    const parseDate = (str) => {
      if (!str) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str);
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        const [d, m, y] = str.split('/');
        return new Date(`${y}-${m}-${d}`);
      }
      return new Date(str);
    };
    if (dateStart) {
      const start = new Date(dateStart);
      filtered = filtered.filter(c => {
        const date = parseDate(c.dateCreation);
        return date && !isNaN(date) && date >= start;
      });
    }
    if (dateEnd) {
      const end = new Date(dateEnd);
      filtered = filtered.filter(c => {
        const date = parseDate(c.dateCreation);
        return date && !isNaN(date) && date <= end;
      });
    }
    return filtered;
  }, [contrats, searchTerm, selectedCommercial, selectedOrigine, dateStart, dateEnd]);

  // KPIs dynamiques sur filtered
  const kpis = useMemo(() => {
    const total = filtered.length;
    const montantNetteAnnuelle = filtered.reduce((sum, c) => sum + (parseFloat(c.montantNetteAnnuelle) || 0), 0);
    const montantBruteAnnuelle = filtered.reduce((sum, c) => sum + (parseFloat(c.montantBruteAnnuelle) || 0), 0);
    const montantNetteMensuelle = filtered.reduce((sum, c) => sum + (parseFloat(c.montantNetteMensuelle) || 0), 0);
    const montantBruteMensuelle = filtered.reduce((sum, c) => sum + (parseFloat(c.montantBruteMensuelle) || 0), 0);
    const commissionTotale1A = filtered.reduce((sum, c) => sum + ((parseFloat(c.montantNetteAnnuelle) || 0) * (parseFloat(c.commission1A) || 0) / 100), 0);
    const commissionTotaleSuiv = filtered.reduce((sum, c) => sum + ((parseFloat(c.montantNetteAnnuelle) || 0) * (parseFloat(c.commissionSuiv) || 0) / 100), 0);
    const actifs = filtered.filter(c => c.statut && c.statut.toLowerCase().includes('actif')).length;
    return { total, montantNetteAnnuelle, montantBruteAnnuelle, montantNetteMensuelle, montantBruteMensuelle, commissionTotale1A, commissionTotaleSuiv, actifs };
  }, [filtered]);
  // Pagination
  const totalPages = Math.ceil(filtered.length / resultsPerPage);
  const paginated = filtered.slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage);

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen w-full bg-gray-50 font-sans" style={{ fontFamily: 'Inter, Nunito, sans-serif' }}>
      {/* Header style dashboard moderne */}
      <div className="bg-white px-8 pt-8 pb-2 w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Gestion des Contrats</h1>
          <button
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow transition text-lg"
            onClick={async () => {
              setIaLoading(true);
              setIaResult('');
              // Analyse IA analytique
              setTimeout(() => {
                let tauxCommission = 0;
                if (kpis.montantNetteAnnuelle > 0) {
                  tauxCommission = (kpis.commissionTotale1A / kpis.montantNetteAnnuelle) * 100;
                }
                const topCommercial = (() => {
                  const stats = {};
                  filtered.forEach(c => {
                    if (!c.commercial) return;
                    if (!stats[c.commercial]) stats[c.commercial] = { total: 0, commission: 0 };
                    stats[c.commercial].total++;
                    stats[c.commercial].commission += (parseFloat(c.montantNetteAnnuelle) || 0) * (parseFloat(c.commission1A) || 0) / 100;
                  });
                  let best = null;
                  Object.entries(stats).forEach(([k, v]) => {
                    if (!best || v.commission > best.commission) best = { commercial: k, ...v };
                  });
                  return best;
                })();
                setIaResult(
                  'Analyse IA :\n' +
                  '- Taux de commission 1ère année : ' + (tauxCommission ? tauxCommission.toFixed(2) : '0') + '% du portefeuille.\n' +
                  '- Contrats actifs : ' + kpis.actifs + ' sur ' + kpis.total + '.\n' +
                  (topCommercial ? ('- Top commercial : ' + topCommercial.commercial + ' (' + topCommercial.total + ' contrats, ' + topCommercial.commission.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) + ' commissions)') : '')
                );
                setIaLoading(false);
              }, 1200);
            }}
            disabled={iaLoading}
          >
            <FaRobot className="text-2xl" /> Analyse IA
          </button>
        </div>
        {/* KPIs cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow p-6 border border-gray-100 flex flex-col items-center min-w-[180px]">
            <div className="text-3xl font-extrabold text-violet-700 flex items-center gap-2"><FaFileContract className="text-violet-400 text-2xl" />{kpis.total}</div>
            <div className="text-gray-500 mt-1">Total contrats</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border border-gray-100 flex flex-col items-center min-w-[180px]">
            <div className="text-3xl font-extrabold text-green-600 flex items-center gap-2"><FaEuroSign className="text-green-400 text-2xl" />{kpis.montantNetteAnnuelle.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
            <div className="text-gray-500 mt-1">Prime nette annuelle</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border border-gray-100 flex flex-col items-center min-w-[180px]">
            <div className="text-3xl font-extrabold text-green-700 flex items-center gap-2"><FaMoneyBillWave className="text-green-700 text-2xl" />{kpis.montantBruteAnnuelle.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
            <div className="text-gray-500 mt-1">Prime brute annuelle</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border border-gray-100 flex flex-col items-center min-w-[180px]">
            <div className="text-3xl font-extrabold text-blue-600 flex items-center gap-2"><FaChartLine className="text-blue-400 text-2xl" />{kpis.commissionTotale1A.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
            <div className="text-gray-500 mt-1">Commissions 1ère année</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border border-gray-100 flex flex-col items-center min-w-[180px]">
            <div className="text-3xl font-extrabold text-indigo-600 flex items-center gap-2"><FaUserTie className="text-indigo-400 text-2xl" />{kpis.commissionTotaleSuiv.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
            <div className="text-gray-500 mt-1">Commissions années suivantes</div>
          </div>
        </div>
        {iaLoading && <div className="text-center text-violet-700 font-semibold mt-4">Analyse IA en cours...</div>}
        {iaResult && <pre className="text-center text-green-700 font-semibold mt-4 whitespace-pre-line bg-green-50 rounded-xl p-4 max-w-2xl mx-auto">{iaResult}</pre>}
      </div>
      {/* ...bloc supprimé, tout est dans le header... */}
      {/* Filtres avancés */}
      <div className="px-10 pt-6 pb-2 flex flex-wrap items-center gap-4 w-full max-w-7xl mx-auto">
        <input
          type="text"
          placeholder="Rechercher..."
          className="border rounded-lg px-4 py-2 w-64"
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
        />
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700"
          value={selectedCommercial}
          onChange={e => { setSelectedCommercial(e.target.value); setCurrentPage(1); }}
        >
          <option value="">Tous commerciaux</option>
          {commerciauxOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700"
          value={selectedOrigine}
          onChange={e => { setSelectedOrigine(e.target.value); setCurrentPage(1); }}
        >
          <option value="">Toutes origines</option>
          {origineOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700"
            value={dateStart}
            onChange={e => { setDateStart(e.target.value); setCurrentPage(1); }}
          />
          <span className="text-gray-400">à</span>
          <input
            type="date"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700"
            value={dateEnd}
            onChange={e => { setDateEnd(e.target.value); setCurrentPage(1); }}
          />
        </div>
      </div>
      {/* Liste paginée */}
      <div className="py-4 w-full h-full min-h-[70vh]">
        <section className="mb-4">
          <h2 className="text-3xl font-extrabold text-gray-800 mb-4 pl-4">Contrats</h2>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-x-auto w-full" style={{ minHeight: '60vh', maxHeight: '80vh' }}>
            {paginated.length === 0 ? (
              <div className="text-gray-400 italic p-8 text-center text-lg">Aucun contrat trouvé.</div>
            ) : (
              <table className="w-full text-base whitespace-nowrap">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr className="text-left text-gray-700 border-b bg-gray-50">
                    <th className="py-2 pr-4 font-bold text-violet-700">Contact</th>
                    <th className="py-2 pr-4 font-bold">Ville</th>
                    <th className="py-2 pr-4 font-bold">Signature</th>
                    <th className="py-2 pr-4 font-bold">Date d'effet</th>
                    <th className="py-2 pr-4 font-bold">Fin de contrat</th>
                    <th className="py-2 pr-4 font-bold">N° de contrat</th>
                    <th className="py-2 pr-4 font-bold">Compagnie</th>
                    <th className="py-2 pr-4 font-bold">Cotisations</th>
                    <th className="py-2 pr-4 font-bold">Statut</th>
                    <th className="py-2 pr-4 font-bold">Attribution</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((contrat, i) => (
                    <tr key={i} className="border-b hover:bg-violet-100 cursor-pointer group transition-all duration-150" onClick={() => navigate(`/contrats/${contrat.id}`)}>
                      <td className="py-3 px-4 font-semibold text-violet-700 group-hover:underline text-lg">{contrat.contact}</td>
                      <td className="py-3 px-4">{contrat.ville}</td>
                      <td className="py-3 px-4">{contrat.dateCreation || '-'}</td>
                      <td className="py-3 px-4">{contrat.dateEffet}</td>
                      <td className="py-3 px-4">{contrat.dateFin}</td>
                      <td className="py-3 px-4">{contrat.id}</td>
                      <td className="py-3 px-4">{contrat.compagnie}</td>
                      <td className="py-3 px-4">{contrat.montantNetteAnnuelle}</td>
                      <td className="py-3 px-4">{contrat.statut}</td>
                      <td className="py-3 px-4">{contrat.commercial}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {/* Pagination moderne */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-6 px-4 pb-4">
              <div className="text-base text-gray-500">
                Page <span className="font-semibold text-gray-700">{currentPage}</span> sur <span className="font-semibold text-gray-700">{totalPages}</span>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-base font-semibold text-gray-700 transition"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  Précédent
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-base font-semibold text-gray-700 transition"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  Suivant
                </button>
              </div>
              <div>
                <select
                  className="border border-gray-200 rounded-lg px-4 py-2 text-base bg-gray-50 text-gray-700"
                  value={resultsPerPage}
                  onChange={e => {
                    setResultsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  {[10, 25, 50, 100].map(n => (
                    <option key={n} value={n}>{n} / page</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}