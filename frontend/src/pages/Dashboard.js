import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Helper pour formater les nombres en devise
const formatCurrency = (value) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

// Carte pour afficher un KPI
const KpiCard = ({ title, value, subValue, color = 'blue', linkTo }) => {
  const cardContent = (
    <div className={`bg-white p-6 rounded-xl shadow-lg border-l-4 border-${color}-500 hover:shadow-xl transition-shadow duration-300`}>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
      <p className="text-4xl font-bold text-gray-800 mt-2">{value}</p>
      {subValue && <p className="text-sm text-gray-400 mt-1">{subValue}</p>}
    </div>
  );

  return linkTo ? <Link to={linkTo}>{cardContent}</Link> : cardContent;
};

export default function Dashboard() {
  const [reportData, setReportData] = useState(null);
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
    const fetchReports = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
            startDate: dateRange.start,
            endDate: dateRange.end,
        });
        const response = await fetch(`http://localhost:3001/api/reports?${params}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setReportData(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [dateRange]);

  if (loading) {
    return <div className="text-center py-10">Chargement du tableau de bord...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Erreur de chargement des données: {error}</div>;
  }

  if (!reportData) {
    return <div className="text-center py-10">Aucune donnée disponible pour le tableau de bord.</div>;
  }

  const { global, byOrigine } = reportData;

  // Données pour le graphique du taux de conversion par origine
  const conversionByOrigine = Object.entries(byOrigine).map(([name, data]) => {
      const rate = data.nbProspects > 0 ? (data.nbContrats / data.nbProspects) * 100 : 0;
      return { name, rate };
  }).sort((a, b) => b.rate - a.rate); // Trier pour voir les meilleures sources

  const chartData = {
    labels: conversionByOrigine.map(item => item.name),
    datasets: [
      {
        label: 'Taux de Conversion par Origine (%)',
        data: conversionByOrigine.map(item => item.rate),
        backgroundColor: 'rgba(255, 159, 64, 0.6)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Calcul du taux de conversion global
  const conversionRate = global.totalProspects > 0 ? (global.totalActiveContrats / global.totalProspects) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-gray-800">Tableau de Bord</h1>
        <div className="flex items-center gap-4 bg-white p-3 rounded-lg shadow-sm border">
            <input type="date" name="start" value={dateRange.start} onChange={handleDateChange} className="border-gray-300 rounded-md shadow-sm"/>
            <span className="text-gray-500">à</span>
            <input type="date" name="end" value={dateRange.end} onChange={handleDateChange} className="border-gray-300 rounded-md shadow-sm"/>
        </div>
      </div>

      {/* Section des KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard 
          title="Fiches Prospects" 
          value={global.totalProspects} 
          color="blue"
          linkTo="/prospects"
        />
        <KpiCard 
          title="Contrats Actifs" 
          value={global.totalActiveContrats} 
          subValue={`sur ${global.totalContrats} au total`} 
          color="green"
          linkTo="/contrats"
        />
        <KpiCard 
          title="Taux de Conversion" 
          value={`${conversionRate.toFixed(2)}%`} 
          color="yellow"
        />
        <KpiCard 
          title="Commission 1ère Année" 
          value={formatCurrency(global.totalCommission1A)} 
          color="purple"
          linkTo="/rapports"
        />
        <KpiCard 
          title="Campagnes Actives" 
          value={global.activeCampaigns} 
          color="orange"
          linkTo="/campagnes"
        />
        <KpiCard 
          title="Emails Envoyés" 
          value={global.totalEmailsSent} 
          color="indigo"
          linkTo="/campagnes"
        />
        <KpiCard 
          title="Taux Ouverture Campagnes" 
          value={`${global.openRate.toFixed(2)}%`} 
          color="pink"
          linkTo="/campagnes"
        />
        <KpiCard 
          title="Taux Clic Campagnes" 
          value={`${global.clickRate.toFixed(2)}%`} 
          color="red"
          linkTo="/campagnes"
        />
      </div>

      {/* Section Graphique et Actions Rapides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Taux de Conversion par Origine</h2>
          <Bar data={chartData} options={{ 
              responsive: true, 
              plugins: { legend: { display: false } },
              scales: { y: { ticks: { callback: (value) => `${value}%` } } } 
          }} />
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col justify-around">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Actions Rapides</h2>
            <Link to="/workflows" className="bg-blue-600 text-white text-center font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-300 mb-4">
                Lancer une Campagne
            </Link>
            <Link to="/prospects" className="bg-gray-700 text-white text-center font-bold py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors duration-300 mb-4">
                Voir les Prospects
            </Link>
            <Link to="/rapports" className="bg-teal-600 text-white text-center font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors duration-300">
                Voir les Rapports Détaillés
            </Link>
        </div>
      </div>
    </div>
  );
}
