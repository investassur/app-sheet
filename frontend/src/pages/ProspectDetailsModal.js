import React from 'react';
import './ProspectDetailsModal.css';

export default function ProspectDetailsModal({ prospect, onClose }) {
  if (!prospect) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>×</button>
        <h2>Détails du Prospect</h2>
        <div className="details-grid">
          {Object.entries(prospect).map(([key, value]) => (
            <div key={key} className="detail-row">
              <span className="detail-label">{key.replace(/_/g, ' ')}</span>
              <span className="detail-value">{value || <em>(vide)</em>}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
