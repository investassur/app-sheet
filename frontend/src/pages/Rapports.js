import React, { useState, useEffect } from 'react';
import { calculateCommission } from '../commissionUtils';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Helper pour formater les nombres en devise
const formatCurrency = (value) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

// --- Composants de la page ---

// Carte pour afficher un KPI global
const KpiCard = ({ title, value, subValue, color = 'blue' }) => (
  <div className={`bg-white p-6 rounded-xl shadow-md border-l-4 border-${color}-500`}>
    <h3 className="text-sm font-semibold text-gray-500 uppercase">{title}</h3>
    <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
    {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
  </div>
);

// Tableau générique pour les KPIs
const KpiTable = ({ title, data, columns }) => (
  <div className="bg-white p-6 rounded-xl shadow-md mt-8">
    <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr key={index}>
              {columns.map((col) => (
                <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {col.isCurrency ? formatCurrency(row[col.key]) : (row[col.key] || 0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// --- Composant principal de la page Rapports ---

export default function Rapports() {
  const [reportData, setReportData] = useState(null);
  const [costSettings, setCostSettings] = useState(null); // Nouvel état pour les coûts
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });

  const handleDateChange = (e) => {
    setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Récupérer les données de rapport et les paramètres de coût en parallèle
        const reportParams = new URLSearchParams({
            startDate: dateRange.start,
            endDate: dateRange.end,
        });
        const [reportResponse, settingsResponse] = await Promise.all([
            fetch(`http://localhost:3001/api/reports?${reportParams}`),
            fetch('http://localhost:3001/api/admin/settings')
        ]);

        if (!reportResponse.ok) throw new Error(`Erreur rapports: ${reportResponse.status}`);
        if (!settingsResponse.ok) throw new Error(`Erreur paramètres: ${settingsResponse.status}`);

        const reportData = await reportResponse.json();
        const settingsData = await settingsResponse.json();
        
        console.log("Report Data:", reportData);
        setReportData(reportData);
        console.log("Cost Settings (from API):", settingsData); // Added console.log
        setCostSettings(settingsData);
        console.log("Full Report Data:", reportData);
      } catch (e) {
        console.error("Error fetching data:", e);
        setError(e.message);
        console.error("Erreur lors de la récupération des données:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange]);

  if (loading) {
    return <div className="text-center py-10">Chargement des rapports...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Erreur: {error}</div>;
  }

  if (!reportData || !costSettings) {
    return <div className="text-center py-10">Aucune donnée de rapport disponible.</div>;
  }

  const { global, byCommercial, byOrigine, byPays, byCompagnie } = reportData;

  // Global variables from settings
  const cpl = parseFloat(costSettings.cpl) || 0; 

  // Enrichir les données avec les taux de conversion, dépenses marketing et marges
  console.log("byCommercial data:", byCommercial);
  const commercialDataEnhanced = Object.entries(byCommercial).map(([name, data]) => {
    console.log("Data for commercial", name, ":", data);
    const chargeKey = `charge_${name.replace(/\s+/g, '_')}`;
    const charge = parseFloat(costSettings[chargeKey]) || 0;
    
    // Assuming data.nbProspects is equivalent to nbFiches from the task description
    const depensesMarketing = (data.nbProspects || 0) * cpl; 
    
    // Marge calculation as per task rule: commissionAnnuelle1A - (charge + dépensesMarketing)
    const margeNette = (data['Contrat - Commissionnement 1ère année (%)'] || 0) - (charge + depensesMarketing);

    let totalCotisationAnnuelle = 0;
    let totalCommissionMensuel = 0;
    let totalCommissionAnnuelle = 0;
    let totalCommissionAnnuelle1 = 0;
    let totalCommissionRecurrente = 0;
    let totalCommissionRecu = 0;
    let typeCommission = ''; // This might be tricky if types vary, consider how to aggregate or display

    // Iterate over contracts to calculate aggregated commission data
    if (data.contracts && Array.isArray(data.contracts)) {
      data.contracts.forEach(contract => {
        // Ensure we have valid data before calculating
        if (contract.compagnie && contract.primeBruteMensuelle !== undefined) {
          console.log("Compagnie:", contract.compagnie);
          console.log("Prime brute mensuelle:", contract.primeBruteMensuelle);
          const commissionData = calculateCommission(contract.compagnie, contract.primeBruteMensuelle, costSettings);
          console.log("Commission Data:", commissionData);

          totalCotisationAnnuelle += parseFloat(commissionData.cotisationAnnuelle) || 0;
          totalCommissionMensuel += parseFloat(commissionData.commissionMensuel) || 0;
          totalCommissionAnnuelle += parseFloat(commissionData.commissionAnnuelle) || 0;
          totalCommissionAnnuelle1 += parseFloat(commissionData.commissionAnnuelle1) || 0;
          totalCommissionRecurrente += parseFloat(commissionData.commissionRecurrente) || 0;
          totalCommissionRecu += parseFloat(commissionData.commissionRecu) || 0;
          // For typeCommission, you might need a more complex logic if contracts have different types
          // For now, we'll just take the last one or decide on a primary type.
          if (commissionData.typeCommission) {
            typeCommission = commissionData.typeCommission;
          }
        } else {
          console.warn("Contract missing required data:", contract);
        }
      });
    }

    return { 
      'Projet - Attribution': name,
      'nbProspects': data.nbProspects,
      'nbContrats': data.nbContrats,
      'Contrat - Prime brute annuelle': data['Contrat - Prime brute annuelle'],
      'Contrat - Commissionnement 1ère année (%)': data['Contrat - Commissionnement 1ère année (%)'],
      charge, 
      depensesMarketing,
      margeNette,
      cotisationAnnuelle: totalCotisationAnnuelle,
      commissionMensuel: totalCommissionMensuel,
      commissionAnnuelle: totalCommissionAnnuelle,
      commissionAnnuelle1: totalCommissionAnnuelle1,
      commissionRecurrente: totalCommissionRecurrente,
      commissionRecu: totalCommissionRecu,
      typeCommission: typeCommission
    };
  });

  // Sort by margeNette in descending order
  commercialDataEnhanced.sort((a, b) => b.margeNette - a.margeNette);

  const origineDataEnhanced = Object.entries(byOrigine).reduce((acc, [name, data]) => {
    const tauxConversion = data.nbProspects > 0 ? ((data.nbContrats / data.nbProspects) * 100).toFixed(2) : 0;
    acc[name] = { ...data, tauxConversion };
    return acc;
  }, {});

  // Configuration des colonnes pour les tableaux
  const commercialColumns = [
    { key: 'Projet - Attribution', label: 'Projet - Attribution' },
    { key: 'nbProspects', label: 'Nb Fiches' },
    { key: 'nbContrats', label: 'Nb Contrats' },
    { key: 'Contrat - Prime brute annuelle', label: 'Contrat - Prime brute annuelle', isCurrency: true },
    { key: 'Contrat - Commissionnement 1ère année (%)', label: 'Contrat - Commissionnement 1ère année (%)', isCurrency: true },
    { key: 'depensesMarketing', label: 'Dépenses marketing', isCurrency: true },
    { key: 'charge', label: 'Charge', isCurrency: true },
    { key: 'margeNette', label: 'Marge nette', isCurrency: true },
    { key: 'cotisationAnnuelle', label: 'Cotisation Annuelle', isCurrency: true },
    { key: 'commissionMensuel', label: 'Commission Mensuelle', isCurrency: true },
    { key: 'commissionAnnuelle', label: 'Commission Annuelle', isCurrency: true },
    { key: 'commissionAnnuelle1', label: 'Commission Annuelle 1ère année', isCurrency: true },
    { key: 'commissionRecurrente', label: 'Commission Récurrente', isCurrency: true },
    { key: 'commissionRecu', label: 'Commission Reçue', isCurrency: true },
    { key: 'typeCommission', label: 'Type de Commission' },
  ];

  const origineColumns = [
    { key: 'name', label: 'Origine' },
    { key: 'nbProspects', label: 'Nb Fiches' },
    { key: 'nbContrats', label: 'Nb Contrats' },
    { key: 'tauxConversion', label: 'Taux Conv. (%)' },
    { key: 'commission1A', label: 'Commission 1ère Année', isCurrency: true },
  ];
  
  const paysColumns = [
    { key: 'name', label: 'Pays' },
    { key: 'nbContrats', label: 'Nb Contrats' },
    { key: 'cotisationMensuel', label: 'Cotisation Mensuelle', isCurrency: true },
    { key: 'cotisationAnnuel', label: 'Cotisation Annuelle', isCurrency: true },
    { key: 'commission1A', label: 'Commission 1ère Année', isCurrency: true },
  ];

  const compagnieColumns = [
    { key: 'name', label: 'Compagnie' },
    { key: 'nbContrats', label: 'Nb Contrats' },
    { key: 'cotisationAnnuel', label: 'Cotisation Annuelle', isCurrency: true },
    { key: 'commission1A', label: 'Commission 1ère Année', isCurrency: true },
  ];

  // Convert objects to arrays for KpiTable
  const origineDataArray = Object.entries(origineDataEnhanced).map(([name, data]) => ({ name, ...data }));
  const byPaysArray = Object.entries(byPays).map(([name, data]) => ({ name, ...data }));
  const byCompagnieArray = Object.entries(byCompagnie).map(([name, data]) => ({ name, ...data }));

  // Données pour le graphique
  const chartData = {
    labels: Object.keys(byCommercial),
    datasets: [
      {
        label: 'Commission 1ère Année (€)',
        data: Object.values(byCommercial).map(c => c.commission1A),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
      {
        label: 'Prime Nette Annuelle (€)',
        data: Object.values(byCommercial).map(c => c.primeNetteAnnuelle),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-gray-800">Rapports & Analyses</h1>
        <div className="flex items-center gap-4 bg-white p-3 rounded-lg shadow-sm border">
            <input type="date" name="start" value={dateRange.start} onChange={handleDateChange} className="border-gray-300 rounded-md shadow-sm"/>
            <span className="text-gray-500">à</span>
            <input type="date" name="end" value={dateRange.end} onChange={handleDateChange} className="border-gray-300 rounded-md shadow-sm"/>
        </div>
      </div>

      {/* Section des KPIs Globaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <KpiCard title="Fiches Prospects" value={global.totalProspects} color="blue" />
        <KpiCard title="Contrats Actifs" value={global.totalActiveContrats} subValue={`sur ${global.totalContrats} au total`} color="green" />
        <KpiCard title="Prime Nette Annuelle" value={formatCurrency(global.totalPrimeNetteAnnuelle)} color="teal" />
        <KpiCard title="Commission 1ère Année" value={formatCurrency(global.totalCommission1A)} color="purple" />
        <KpiCard title="Dépenses Marketing" value={formatCurrency(costSettings.depenses)} color="yellow" />
      </div>

      {/* Section Graphique */}
      <div className="bg-white p-6 rounded-xl shadow-md mt-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Performance par Commercial</h2>
        <Bar data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
      </div>

      {/* Section des Tableaux */}
      <KpiTable title="Détail par Commercial" data={commercialDataEnhanced} columns={commercialColumns} />
      <KpiTable title="Détail par Origine" data={origineDataArray} columns={origineColumns} />
      <KpiTable title="Détail par Pays" data={byPaysArray} columns={paysColumns} />
      <KpiTable title="Détail par Compagnie" data={byCompagnieArray} columns={compagnieColumns} />

    </div>
  );
}
