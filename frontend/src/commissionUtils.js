// commissionUtils.js

const calculateCommission = (compagnie, cotisationBrute, settings) => {
  if (!compagnie || !cotisationBrute || !settings) {
    return {
      cotisationAnnuelle: "",
      commissionMensuel: "",
      commissionAnnuelle: "",
      commissionAnnuelle1: "",
      commissionRecurrente: "",
      commissionRecu: "",
      typeCommission: ""
    };
  }

  // Nettoyage et conversion de la cotisation brute
  // Supprime tous les espaces (séparateurs de milliers) et remplace la virgule par un point (séparateur décimal)
  const cotisationStr = String(cotisationBrute).replace(/\s/g, '').replace(",", ".").replace("€", "").trim();
  const cotisation = parseFloat(cotisationStr);

  if (isNaN(cotisation)) {
    return {
      cotisationAnnuelle: "",
      commissionMensuel: "",
      commissionAnnuelle: "",
      commissionAnnuelle1: "",
      commissionRecurrente: "",
      commissionRecu: "",
      typeCommission: ""
    };
  }

  const compKey = String(compagnie).toUpperCase().trim().replace(/[^A-Z0-9]/g, ''); // Normalisation du nom pour correspondre aux clés des settings
  
  const annee1Key = `commission_${compKey}_annee1`;
  const recurrentKey = `commission_${compKey}_recurrent`;
  
  const annee1 = parseFloat(settings[annee1Key]) || 0;
  const recurrent = parseFloat(settings[recurrentKey]) || 0;

  // Determine type based on annee1 and recurrent values, or add a specific setting for type if needed
  // For now, we'll infer based on the provided Google Apps Script logic
  let typeCommission = 'Linéaire'; // Default type
  if (compKey === 'SPVIE' || compKey === 'HARMONIEMUTUELLE' || compKey === 'ASSOLUTIONS' ||
      compKey === 'NEOLIANE' || compKey === 'ZENIOO' || compKey === 'AVA' ||
      compKey === 'MALAKOFFHUMANIS' || compKey === 'ASAF&AFPS' ||
      compKey === 'ECACAPITALSENIOR' || compKey === 'ECASERENISSIME' || compKey === 'ECAAUTRES') {
    typeCommission = 'Précompte';
  }

  // Calcul des valeurs
  const cotisationAnnuelle = cotisation * 12;
  const commissionMensuel = cotisation * (annee1 / 100);
  const commissionAnnuelle = cotisationAnnuelle * (annee1 / 100);
  const commissionAnnuelle1 = commissionAnnuelle * 0.875;
  const commissionRecurrente = cotisationAnnuelle * (recurrent / 100);
  const commissionRecu = commissionRecurrente * 0.875;
  
  return {
    cotisationAnnuelle,
    commissionMensuel,
    commissionAnnuelle,
    commissionAnnuelle1,
    commissionRecurrente,
    commissionRecu,
    typeCommission
  };
};

export { calculateCommission };
