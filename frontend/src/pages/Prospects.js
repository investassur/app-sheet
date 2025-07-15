import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaFileAlt, FaPhoneSlash, FaFileContract, FaPercentage } from 'react-icons/fa';
import { FiUsers, FiEye } from 'react-icons/fi';

// --- Helper Components ---

const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1 && parts[0] && parts[parts.length - 1]) {
        return parts[0][0] + parts[parts.length - 1][0];
    }
    return name.substring(0, 2);
};

const Avatar = ({ name }) => {
    const colors = ['bg-blue-200', 'bg-green-200', 'bg-purple-200', 'bg-red-200', 'bg-yellow-200', 'bg-indigo-200'];
    const color = colors[(name || '').length % colors.length];
    return (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-gray-700 ${color}`}>
            {getInitials(name)}
        </div>
    );
};

const StatusBadge = ({ status }) => {
    if (!status) return null;
    const s = status.toLowerCase().trim();
    let colorClasses = 'bg-gray-100 text-gray-600'; // Default
    if (s.includes('nouveau')) colorClasses = 'bg-blue-100 text-blue-700';
    if (s.includes('qualifié') || s.includes('devis envoyé')) colorClasses = 'bg-yellow-100 text-yellow-700';
    if (s.includes('converti') || s.includes('contrat')) colorClasses = 'bg-green-100 text-green-700';
    if (s.includes('rétracté') || s.includes('perdu') || s.includes('ne répond pas') || s.includes('inexploitable')) colorClasses = 'bg-red-100 text-red-700';

    return (
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${colorClasses}`}>
            {status}
        </span>
    );
};

const KpiCard = ({ title, value, icon }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm flex items-center">
        <div className="p-3 rounded-full bg-indigo-100 text-indigo-600 mr-4">
            {icon}
        </div>
        <div>
            <div className="text-2xl font-bold text-gray-800">{value}</div>
            <div className="text-sm text-gray-500">{title}</div>
        </div>
    </div>
);


// --- Main Component ---

export default function Prospects() {
    const [prospects, setProspects] = useState([]);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({ search: '', statut: '', attribution: '', dateStart: '', dateEnd: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [resultsPerPage, setResultsPerPage] = useState(10);
    const navigate = useNavigate();

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Utiliser une seule source de vérité pour les KPIs et la liste
            const [prospectsResponse, reportsResponse] = await Promise.all([
                axios.get('http://localhost:3001/api/ia/prospects-merged'),
                axios.get('http://localhost:3001/api/reports')
            ]);
            setProspects(prospectsResponse.data);
            setReportData(reportsResponse.data);
        } catch (err) {
            setError('Erreur lors du chargement des données.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const filteredProspects = useMemo(() => {
        return prospects.filter(p => {
            const searchMatch = filters.search ? Object.values(p).join(' ').toLowerCase().includes(filters.search.toLowerCase()) : true;
            const statusMatch = filters.statut ? (p['Statut'] || '').toLowerCase() === filters.statut.toLowerCase() : true;
            const attributionMatch = filters.attribution ? (p['Attribution'] || '').toLowerCase() === filters.attribution.toLowerCase() : true;
            
            let dateMatch = true;
            const dateCreation = p['Date de création'] ? new Date(p['Date de création'].split('/').reverse().join('-')) : null;
            if (dateCreation && !isNaN(dateCreation)) {
                if (filters.dateStart && dateCreation < new Date(filters.dateStart)) {
                    dateMatch = false;
                }
                if (filters.dateEnd && dateCreation > new Date(filters.dateEnd)) {
                    dateMatch = false;
                }
            } else if (filters.dateStart || filters.dateEnd) {
                dateMatch = false;
            }

            return searchMatch && statusMatch && attributionMatch && dateMatch;
        });
    }, [prospects, filters]);

    // Pagination
    const totalPages = Math.ceil(filteredProspects.length / resultsPerPage);
    const paginatedProspects = useMemo(() => {
        const start = (currentPage - 1) * resultsPerPage;
        return filteredProspects.slice(start, start + resultsPerPage);
    }, [filteredProspects, currentPage, resultsPerPage]);

    const kpis = useMemo(() => {
        if (!reportData) {
            return { total: 0, neRepondPas: 0, devisEnvoyes: 0, contratsSignes: 0, tauxConversion: 0 };
        }
        const total = reportData.global.totalProspects;
        const contratsSignes = reportData.global.totalActiveContrats;
        const tauxConversion = total > 0 ? (contratsSignes / total) * 100 : 0;

        // Recalculer les statuts qui ne sont pas dans le rapport global
        const neRepondPas = prospects.filter(p => (p['Statut'] || '').toLowerCase().trim() === 'ne répond pas').length;
        const devisEnvoyes = prospects.filter(p => (p['Statut'] || '').toLowerCase().trim() === 'devis envoyé').length;

        return { total, neRepondPas, devisEnvoyes, contratsSignes, tauxConversion };
    }, [reportData, prospects]);

    const statusOptions = useMemo(() => Array.from(new Set(prospects.map(p => p['Statut']).filter(Boolean))), [prospects]);
    const attributionOptions = useMemo(() => Array.from(new Set(prospects.map(p => p['Attribution']).filter(Boolean))), [prospects]);

    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Gestion des Prospects</h1>
                    <p className="text-gray-500">Gérez vos prospects et suivez leur progression</p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
                <KpiCard title="Total Prospects" value={kpis.total} icon={<FiUsers size={24} />} />
                <KpiCard title="Ne répond pas" value={kpis.neRepondPas} icon={<FaPhoneSlash size={24} />} />
                <KpiCard title="Devis Envoyés" value={kpis.devisEnvoyes} icon={<FaFileAlt size={24} />} />
                <KpiCard title="Contrats Signés" value={kpis.contratsSignes} icon={<FaFileContract size={24} />} />
                <KpiCard title="Taux Conversion" value={`${kpis.tauxConversion.toFixed(1)}%`} icon={<FaPercentage size={24} />} />
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex items-center gap-4 flex-wrap">
                <div className="relative flex-grow min-w-[200px]">
                    <input type="text" name="search" placeholder="Rechercher..." value={filters.search} onChange={handleFilterChange} className="pl-4 w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <select name="statut" value={filters.statut} onChange={handleFilterChange} className="border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="">Tous les statuts</option>
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select name="attribution" value={filters.attribution} onChange={handleFilterChange} className="border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="">Tous les commerciaux</option>
                    {attributionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="date" name="dateStart" value={filters.dateStart} onChange={handleFilterChange} className="border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                <input type="date" name="dateEnd" value={filters.dateEnd} onChange={handleFilterChange} className="border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Prospect</th>
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Origine</th>
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Création</th>
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Commercial</th>
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ville</th>
                            <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="8" className="p-4 text-center text-gray-500">Chargement...</td></tr>
                        ) : error ? (
                            <tr><td colSpan="8" className="p-4 text-center text-red-500">{error}</td></tr>
                        ) : paginatedProspects.map((p, i) => (
                            <tr key={p.Identifiant || i} className="hover:bg-gray-50">
                                <td className="p-4 flex items-center gap-3">
                                    <Avatar name={`${p['Prénom'] || ''} ${p['Nom'] || ''}`.trim()} />
                                    <div>
                                        <div className="font-semibold text-gray-800">{`${p['Prénom'] || ''} ${p['Nom'] || ''}`.trim() || 'N/A'}</div>
                                        <div className="text-xs text-gray-500">{p['Raison sociale'] || ''}</div>
                                    </div>
                                </td>
                                <td className="p-4 text-sm text-gray-600">{p['Email'] || '-'}</td>
                                <td className="p-4 text-sm text-gray-600">{p['Origine'] || '-'}</td>
                                <td className="p-4 text-sm text-gray-600">{p['Date de création'] || '-'}</td>
                                <td className="p-4"><StatusBadge status={p['Statut'] || 'N/A'} /></td>
                                <td className="p-4 text-sm text-gray-600">{p['Attribution'] || '-'}</td>
                                <td className="p-4 text-sm text-gray-600">{p['Ville'] || p['Contact - Ville'] || '-'}</td>
                                <td className="p-4 flex items-center gap-2">
                                    <button onClick={() => navigate(`/prospects/${p['Identifiant contact'] || p['Identifiant']}`)} className="text-gray-400 hover:text-blue-600" title="Voir le détail"><FiEye size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Pagination */}
            <div className="flex justify-between items-center mt-8">
                <div className="text-sm text-gray-500">
                    Page <span className="font-semibold text-gray-700">{currentPage}</span> sur <span className="font-semibold text-gray-700">{totalPages}</span>
                </div>
                <div className="flex gap-2">
                    <button
                        className="px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-xs font-semibold text-gray-700 transition"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    >
                        Précédent
                    </button>
                    <button
                        className="px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-xs font-semibold text-gray-700 transition"
                        disabled={currentPage === totalPages || totalPages === 0}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    >
                        Suivant
                    </button>
                </div>
                <div>
                    <select
                        className="border border-gray-200 rounded-lg px-3 py-1 text-xs bg-gray-50 text-gray-700"
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
    );
}
