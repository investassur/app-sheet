import React from 'react';
import './Prospects.css';

// Définition des filtres initiaux
export const initialFilters = {
  phases: {
    Opportunité: true,
    Prospection: true,
    Inexploitable: true,
    Perdu: true,
    Souscription: true,
    Contrat: true,
    'Contrat clôturé': true,
  },
  nomContact: '',
  departement: '',
  telephone: '',
  email: '',
  typeAssurance: '',
  statut: '',
  projetPrioritaire: '',
  origine: '',
  attribution: '',
  dateCreationMin: '',
  dateCreationMax: '',
  dateSignatureMin: '',
  dateSignatureMax: '',
  envoiDevis: '',
  nomPrescripteur: '',
  demarcheCommerciale: '',
  bloctel: '',
  consentement: '',
  nbAppels: '',
};

export default function ProspectsFilters({ filters, setFilters }) {
  // Gestion des cases à cocher pour les phases
  const handlePhaseChange = (phase) => {
    setFilters({
      ...filters,
      phases: {
        ...filters.phases,
        [phase]: !filters.phases[phase]
      }
    });
  };

  // Gestion des autres champs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  return (
    <div className="prospects-filters">
      <div className="filters-title">Filtres</div>
      <div className="filters-row phases">
        <label>Phase du projet&nbsp;:</label>
        {Object.keys(filters.phases).map(phase => (
          <label key={phase} className="filter-checkbox">
            <input type="checkbox" checked={filters.phases[phase]} onChange={() => handlePhaseChange(phase)} />
            {phase}
          </label>
        ))}
      </div>
      <div className="filters-row">
        <input type="text" name="nomContact" placeholder="Nom du contact" value={filters.nomContact} onChange={handleChange} />
        <input type="text" name="departement" placeholder="Département/Code postal" value={filters.departement} onChange={handleChange} />
        <input type="text" name="telephone" placeholder="Téléphone" value={filters.telephone} onChange={handleChange} style={{maxWidth:120}} />
        <input type="text" name="email" placeholder="Email" value={filters.email} onChange={handleChange} />
        <select name="typeAssurance" value={filters.typeAssurance} onChange={handleChange}>
          <option value="">Type d'assurance - Tout</option>
          <option value="Santé">Santé</option>
          <option value="Prévoyance">Prévoyance</option>
          <option value="Emprunteur">Emprunteur</option>
        </select>
      </div>
      <div className="filters-row">
        <select name="statut" value={filters.statut} onChange={handleChange}>
          <option value="">Statut - Tout</option>
          <option value="Nouveau">Nouveau</option>
          <option value="À traiter">À traiter</option>
          <option value="Signé">Signé</option>
          <option value="Perdu">Perdu</option>
        </select>
        <select name="projetPrioritaire" value={filters.projetPrioritaire} onChange={handleChange}>
          <option value="">Projet prioritaire - Tout</option>
          <option value="Oui">Oui</option>
          <option value="Non">Non</option>
        </select>
        <select name="origine" value={filters.origine} onChange={handleChange}>
          <option value="">Origine - Tout</option>
          <option value="FBPR">FBPR</option>
          <option value="Web">Web</option>
        </select>
        <select name="attribution" value={filters.attribution} onChange={handleChange}>
          <option value="">Attribution - Tout</option>
          <option value="Anonyme">Anonyme</option>
          <option value="Equipe 1">Equipe 1</option>
        </select>
      </div>
      <div className="filters-row">
        <label>Date de création</label>
        <input type="date" name="dateCreationMin" value={filters.dateCreationMin} onChange={handleChange} />
        <span>à</span>
        <input type="date" name="dateCreationMax" value={filters.dateCreationMax} onChange={handleChange} />
        <label>Date de signature</label>
        <input type="date" name="dateSignatureMin" value={filters.dateSignatureMin} onChange={handleChange} />
        <span>à</span>
        <input type="date" name="dateSignatureMax" value={filters.dateSignatureMax} onChange={handleChange} />
      </div>
      <div className="filters-row">
        <select name="envoiDevis" value={filters.envoiDevis} onChange={handleChange}>
          <option value="">Envoi de devis - Tout</option>
          <option value="Oui">Oui</option>
          <option value="Non">Non</option>
        </select>
        <input type="text" name="nomPrescripteur" placeholder="Nom du prescripteur" value={filters.nomPrescripteur} onChange={handleChange} />
        <select name="demarcheCommerciale" value={filters.demarcheCommerciale} onChange={handleChange}>
          <option value="">Démarche commerciale - Tout</option>
          <option value="Oui">Oui</option>
          <option value="Non">Non</option>
        </select>
        <select name="bloctel" value={filters.bloctel} onChange={handleChange}>
          <option value="">Bloctel - Tout</option>
          <option value="Oui">Oui</option>
          <option value="Non">Non</option>
        </select>
        <select name="consentement" value={filters.consentement} onChange={handleChange}>
          <option value="">Consentement - Tout</option>
          <option value="Oui">Oui</option>
          <option value="Non">Non</option>
        </select>
        <select name="nbAppels" value={filters.nbAppels} onChange={handleChange}>
          <option value="">Nombre d'appels - Tout</option>
          <option value="0">0</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value=">2">Plus de 2</option>
        </select>
      </div>
    </div>
  );
}
