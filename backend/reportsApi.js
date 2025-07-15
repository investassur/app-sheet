// backend/reportsApi.js
// API pour générer des rapports et KPIs à partir des données fusionnées

const express = require('express');
const router = express.Router();
const { getMergedProspects } = require('./dataManager');
const { getSheetData } = require('./sheetsUtils');
const { getEmailCampaigns } = require('./brevo'); // Importer la fonction pour les campagnes

// Helper pour parser les dates DD/MM/YYYY
const parseDate = (str) => {
  if (!str) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return new Date(`${y}-${m}-${d}`);
  }
  return new Date(str); // Tente conversion standard
};

// GET /api/reports - Génère tous les rapports et KPIs, avec filtrage par date optionnel
router.get('/', async (req, res) => {
  try {
    console.log('--- [API] /api/reports appelée ---');
    const { startDate, endDate } = req.query;
    console.log('startDate:', startDate, 'endDate:', endDate);

    let prospects;
    try {
      prospects = await getMergedProspects();
      console.log('Nombre de prospects fusionnés:', prospects.length);
    } catch (err) {
      console.error('[API/reports] Erreur getMergedProspects:', err.message);
      throw new Error('Erreur getMergedProspects: ' + err.message);
    }

    let contratsData;
    try {
      contratsData = await getSheetData('Contrats Assurance de personnes');
      console.log('contratsData récupérés:', Array.isArray(contratsData) ? contratsData.length : contratsData);
    } catch (err) {
      console.error('[API/reports] Erreur getSheetData:', err.message);
      throw new Error('Erreur getSheetData: ' + err.message);
    }

    const contratsHeaders = contratsData[0];
    let allContrats = contratsData.slice(1).map(row => {
      const obj = {};
      contratsHeaders.forEach((h, i) => { obj[h] = row[i] || ''; });
      return obj;
    });

    // --- Filtrage par Date ---
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      allContrats = allContrats.filter(c => {
        const dateEffetStr = c["Contrat - Début d'effet"];
        if (!dateEffetStr) return false;
        
        const dateEffet = parseDate(dateEffetStr);
        if (!dateEffet || isNaN(dateEffet.getTime())) return false;

        if (start && dateEffet < start) return false;
        if (end && dateEffet > end) return false;
        
        return true;
      });
    }

    // Filtrer les contrats actifs pour les KPIs (tout ce qui n'est pas 'Rétracté')
    const activeContrats = allContrats.filter(c => (c['Contrat - Statut'] || '').toLowerCase().trim() !== 'rétracté');

    // --- KPIs Globaux ---
    // Le nombre de prospects ne doit pas être filtré par date de contrat, sauf si spécifié.
    // Pour l'instant, on garde le total.
    const totalProspects = prospects.length; 
    const totalContrats = allContrats.length;
    const totalActiveContrats = activeContrats.length;

    const totalPrimeNetteAnnuelle = activeContrats.reduce((sum, c) => sum + (parseFloat(c['Contrat - Prime nette annuelle']) || 0), 0);
    const totalPrimeBruteAnnuelle = activeContrats.reduce((sum, c) => sum + (parseFloat(c['Contrat - Prime brute annuelle']) || 0), 0);
    const totalCommission1A = activeContrats.reduce((sum, c) => sum + (parseFloat(c['Contrat - Commissionnement 1ère année (%)']) || 0) * (parseFloat(c['Contrat - Prime nette annuelle']) || 0) / 100, 0);
    const totalCommissionRecurrente = activeContrats.reduce((sum, c) => sum + (parseFloat(c['Contrat - Commissionnement années suivantes (%)']) || 0) * (parseFloat(c['Contrat - Prime nette annuelle']) || 0) / 100, 0);

    // --- KPIs des Campagnes Email ---
    const emailCampaigns = await getEmailCampaigns();
    const totalCampaigns = emailCampaigns.length;
    const activeCampaigns = emailCampaigns.filter(c => c.status === 'sent' || c.status === 'scheduled').length; // 'sent' ou 'scheduled'
    const totalEmailsSent = emailCampaigns.reduce((sum, c) => sum + (c.recipients ? c.recipients.total : 0), 0);
    const totalOpened = emailCampaigns.reduce((sum, c) => sum + (c.statistics && c.statistics.globalStats ? c.statistics.globalStats.opened : 0), 0);
    const totalClicked = emailCampaigns.reduce((sum, c) => sum + (c.statistics && c.statistics.globalStats ? c.statistics.globalStats.clicked : 0), 0);
    const totalUnsubscribed = emailCampaigns.reduce((sum, c) => sum + (c.statistics && c.statistics.globalStats ? c.statistics.globalStats.unsubscribed : 0), 0);

    const openRate = totalEmailsSent > 0 ? (totalOpened / totalEmailsSent) * 100 : 0;
    const clickRate = totalEmailsSent > 0 ? (totalClicked / totalEmailsSent) * 100 : 0;


    // --- KPIs par Commercial (Attribution) ---
    const kpisByCommercial = {};
    prospects.forEach(p => {
      const commercial = p.Attribution || 'Non attribué';
      if (!kpisByCommercial[commercial]) {
        kpisByCommercial[commercial] = {
          nbProspects: 0,
          nbContrats: 0,
          primeNetteAnnuelle: 0,
          commission1A: 0,
          commissionRecurrente: 0,
          contracts: [], // Add a new array to store contract details
        };
      }
      kpisByCommercial[commercial].nbProspects++;
    });
    // Agrégation des contrats par commercial
    activeContrats.forEach(c => {
      const commercial = c['Projet - Attribution'] || 'Non attribué';
      if (kpisByCommercial[commercial]) {
        kpisByCommercial[commercial].nbContrats++;
        kpisByCommercial[commercial].primeNetteAnnuelle += parseFloat(c['Contrat - Prime nette annuelle']) || 0;
        kpisByCommercial[commercial].commission1A += (parseFloat(c['Contrat - Commissionnement 1ère année (%)']) || 0) * (parseFloat(c['Contrat - Prime nette annuelle']) || 0) / 100;
        kpisByCommercial[commercial].commissionRecurrente += (parseFloat(c['Contrat - Commissionnement années suivantes (%)']) || 0) * (parseFloat(c['Contrat - Prime nette annuelle']) || 0) / 100;
        
        // Clean and parse primeBruteMensuelle before storing
        const rawPrimeBruteMensuelle = c['Contrat - Prime brute mensuelle'];
        const cleanedPrimeBruteMensuelle = String(rawPrimeBruteMensuelle).replace(/\s/g, '').replace(",", ".").replace("€", "").trim();
        const parsedPrimeBruteMensuelle = parseFloat(cleanedPrimeBruteMensuelle) || 0;

        kpisByCommercial[commercial].contracts.push({ // Push relevant contract details
          compagnie: c['Contrat - Compagnie'],
          primeBruteMensuelle: parsedPrimeBruteMensuelle,
        });
      }
    });

    // --- KPIs par Origine ---
    const kpisByOrigine = {};
    prospects.forEach(p => {
      const origine = p.Origine || 'Inconnue';
      if (!kpisByOrigine[origine]) {
        kpisByOrigine[origine] = {
          nbProspects: 0,
          nbContrats: 0,
          primeNetteAnnuelle: 0,
          commission1A: 0,
        };
      }
      kpisByOrigine[origine].nbProspects++;
    });
    activeContrats.forEach(c => {
      const origine = c['Projet - Origine'] || 'Inconnue';
      if (kpisByOrigine[origine]) {
        kpisByOrigine[origine].nbContrats++;
        kpisByOrigine[origine].primeNetteAnnuelle += parseFloat(c['Contrat - Prime nette annuelle']) || 0;
        kpisByOrigine[origine].commission1A += (parseFloat(c['Contrat - Commissionnement 1ère année (%)']) || 0) * (parseFloat(c['Contrat - Prime nette annuelle']) || 0) / 100;
      }
    });

    // --- KPIs par Pays ---
    const kpisByPays = {};
    activeContrats.forEach(c => {
      const pays = c['Contact - Pays'] || 'Inconnu'; // Assumons une colonne 'Pays' dans Contacts
      if (!kpisByPays[pays]) {
        kpisByPays[pays] = {
          nbContrats: 0,
          cotisationMensuel: 0,
          cotisationAnnuel: 0,
          commission1A: 0,
          commissionRecurrente: 0,
        };
      }
      kpisByPays[pays].nbContrats++;
      kpisByPays[pays].cotisationMensuel += parseFloat(c['Contrat - Prime nette mensuelle']) || 0;
      kpisByPays[pays].cotisationAnnuel += parseFloat(c['Contrat - Prime nette annuelle']) || 0;
      kpisByPays[pays].commission1A += (parseFloat(c['Contrat - Commissionnement 1ère année (%)']) || 0) * (parseFloat(c['Contrat - Prime nette annuelle']) || 0) / 100;
      kpisByPays[pays].commissionRecurrente += (parseFloat(c['Contrat - Commissionnement années suivantes (%)']) || 0) * (parseFloat(c['Contrat - Prime nette annuelle']) || 0) / 100;
    });

    // --- KPIs par Compagnie ---
    const kpisByCompagnie = {};
    activeContrats.forEach(c => {
      const compagnie = c['Contrat - Compagnie'] || 'Inconnue';
      if (!kpisByCompagnie[compagnie]) {
        kpisByCompagnie[compagnie] = {
          nbContrats: 0,
          cotisationMensuel: 0,
          cotisationAnnuel: 0,
          commission1A: 0,
          commissionRecurrente: 0,
        };
      }
      kpisByCompagnie[compagnie].nbContrats++;
      kpisByCompagnie[compagnie].cotisationMensuel += parseFloat(c['Contrat - Prime nette mensuelle']) || 0;
      kpisByCompagnie[compagnie].cotisationAnnuel += parseFloat(c['Contrat - Prime nette annuelle']) || 0;
      kpisByCompagnie[compagnie].commission1A += (parseFloat(c['Contrat - Commissionnement 1ère année (%)']) || 0) * (parseFloat(c['Contrat - Prime nette annuelle']) || 0) / 100;
      kpisByCompagnie[compagnie].commissionRecurrente += (parseFloat(c['Contrat - Commissionnement années suivantes (%)']) || 0) * (parseFloat(c['Contrat - Prime nette annuelle']) || 0) / 100;
    });


    res.json({
      global: {
        totalProspects,
        totalContrats,
        totalActiveContrats,
        totalPrimeNetteAnnuelle,
        totalPrimeBruteAnnuelle,
        totalCommission1A,
        totalCommissionRecurrente,
        totalCampaigns,
        activeCampaigns,
        totalEmailsSent,
        totalOpened,
        totalClicked,
        totalUnsubscribed,
        openRate,
        clickRate,
        // Dépenses, Charge, Marge nécessitent des données supplémentaires
      },
      byCommercial: kpisByCommercial,
      byOrigine: kpisByOrigine,
      byPays: kpisByPays,
      byCompagnie: kpisByCompagnie,
    });

  } catch (err) {
    console.error("Erreur lors de la génération des rapports:", err);
    res.status(500).json({ error: 'Erreur lors de la génération des rapports.', details: err.message });
  }
});

module.exports = router;
