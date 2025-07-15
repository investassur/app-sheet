import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Modèle de séquence de relance (exemple statique, à remplacer par backend plus tard)
const SEQUENCES_EXEMPLE = [
  {
    id: 1,
    nom: "Relance prospects injoignables",
    description: "Séquence multi-canal pour relancer les leads injoignables (J+1, J+3, J+7)",
    canaux: ["Email"],
    criteres: ["Statut: Injoignable", "Origine: Facebook"],
    etapes: [
      { jour: 1, canal: "Email", message: "Bonjour, nous n'avons pas réussi à vous joindre..." },
      { jour: 3, canal: "Email", message: "Toujours intéressé ? Contactez-nous !" },
      { jour: 7, canal: "Email", message: "Dernière relance avant clôture du dossier." },
    ],
    actif: true,
  },
  {
    id: 2,
    nom: "Relance devis sans réponse",
    description: "Relance automatique pour les prospects ayant reçu un devis mais sans retour.",
    canaux: ["Email"],
    criteres: ["Statut: Devis envoyé"],
    etapes: [
      { jour: 2, canal: "Email", message: "Avez-vous eu le temps d'étudier notre devis ?" },
      { jour: 5, canal: "Email", message: "Nous restons à votre disposition pour toute question." },
    ],
    actif: true,
  },
];

export default function CampagnesRelance() {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // À remplacer par un appel backend plus tard
    setSequences(SEQUENCES_EXEMPLE);
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-10" style={{ fontFamily: 'Inter, Nunito, sans-serif' }}>
      <h1 className="text-3xl font-extrabold mb-8 text-gray-800 tracking-tight">Campagnes de Relance Automatisées</h1>
      <div className="mb-8">
        <button className="px-5 py-3 bg-violet-600 text-white rounded-lg font-semibold shadow hover:bg-violet-700 transition">+ Nouvelle séquence</button>
      </div>
      {loading ? (
        <div className="text-gray-400">Chargement...</div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          {sequences.map(seq => (
            <div key={seq.id} className="bg-white rounded-xl shadow p-6 border-t-4 border-violet-500 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">{seq.nom}</h2>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${seq.actif ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{seq.actif ? 'Actif' : 'Inactif'}</span>
              </div>
              <div className="text-gray-500 text-sm mb-2">{seq.description}</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {seq.canaux.map(c => <span key={c} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-medium">{c}</span>)}
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {seq.criteres.map(c => <span key={c} className="bg-violet-100 text-violet-700 px-2 py-1 rounded text-xs font-medium">{c}</span>)}
              </div>
              <div>
                <b>Étapes :</b>
                <ol className="list-decimal ml-6 mt-1 text-sm text-gray-700">
                  {seq.etapes.map((etape, i) => (
                    <li key={i}><b>J+{etape.jour}</b> [{etape.canal}] : {etape.message}</li>
                  ))}
                </ol>
              </div>
              <div className="flex gap-3 mt-4">
                <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-semibold shadow hover:bg-indigo-600 transition">Modifier</button>
                <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold shadow hover:bg-gray-300 transition">Désactiver</button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold shadow hover:bg-green-700 transition">Lancer maintenant</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Historique des relances</h2>
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100 text-gray-500 italic">À venir : affichage de l’historique des relances par prospect, canal, statut, etc.</div>
      </div>
    </div>
  );
}
