import React, { useState, useEffect } from 'react';

const SettingsSection = ({ title, children }) => (
    <div className="bg-white p-8 rounded-xl shadow-md mt-8 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
        {children}
    </div>
);

const InputField = ({ label, name, value, onChange, type = 'text', placeholder }) => (
    <div className="mb-4">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
    </div>
);

export default function Administration() {
    const [settings, setSettings] = useState({});
    const [commercials, setCommercials] = useState([]);
    const [status, setStatus] = useState({ message: '', type: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [settingsRes, reportsRes] = await Promise.all([
                    fetch('http://localhost:3001/api/admin/settings'),
                    fetch('http://localhost:3001/api/reports') // Pour obtenir la liste des commerciaux
                ]);

                if (!settingsRes.ok) throw new Error('Impossible de charger les paramètres.');
                if (!reportsRes.ok) throw new Error('Impossible de charger la liste des commerciaux.');

                const settingsData = await settingsRes.json();
                const reportsData = await reportsRes.json();
                
                setSettings(settingsData);
                setCommercials(Object.keys(reportsData.byCommercial || {}));

            } catch (error) {
                setStatus({ message: error.message, type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ message: 'Sauvegarde en cours...', type: 'info' });
        try {
            const response = await fetch('http://localhost:3001/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (!response.ok) throw new Error('La sauvegarde a échoué.');
            const result = await response.json();
            setStatus({ message: result.message, type: 'success' });
        } catch (error) {
            setStatus({ message: error.message, type: 'error' });
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <h1 className="text-4xl font-extrabold mb-8 text-gray-900">Administration</h1>

            {loading ? (
                <div className="text-center">Chargement...</div>
            ) : (
                <>
                    <form onSubmit={handleSubmit}>
                        <SettingsSection title="Coûts et Marges">
                            <InputField label="Dépenses Marketing Totales (€)" name="depenses" value={settings.depenses || ''} onChange={handleChange} type="number" />
                            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Charges par Commercial (€)</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {commercials.map(name => {
                                    const key = `charge_${name.replace(/\s+/g, '_')}`;
                                    return (
                                        <div key={name}>
                                            <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">{name}</label>
                                            <input
                                                type="number"
                                                id={key}
                                                name={key}
                                                value={settings[key] || ''}
                                                onChange={handleChange}
                                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </SettingsSection>

                        <SettingsSection title="Paramètres d'Envoi d'Email (SMTP)">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Hôte SMTP" name="smtpHost" value={settings.smtpHost || ''} onChange={handleChange} placeholder="smtp.example.com" />
                                <InputField label="Port SMTP" name="smtpPort" value={settings.smtpPort || ''} onChange={handleChange} placeholder="587" />
                            </div>
                            <InputField label="Utilisateur SMTP" name="smtpUser" value={settings.smtpUser || ''} onChange={handleChange} placeholder="user@example.com" />
                            <InputField label="Mot de passe SMTP" name="smtpPass" value={settings.smtpPass || ''} onChange={handleChange} type="password" />
                        </SettingsSection>

                        <SettingsSection title="Paramètres de Réception d'Email (IMAP)">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Hôte IMAP" name="imapHost" value={settings.imapHost || ''} onChange={handleChange} placeholder="imap.example.com" />
                                <InputField label="Port IMAP" name="imapPort" value={settings.imapPort || ''} onChange={handleChange} placeholder="993" />
                            </div>
                            <InputField label="Utilisateur IMAP" name="imapUser" value={settings.imapUser || ''} onChange={handleChange} placeholder="user@example.com" />
                            <InputField label="Mot de passe IMAP" name="imapPass" value={settings.imapPass || ''} onChange={handleChange} type="password" />
                        </SettingsSection>

                        <SettingsSection title="Paramètres API (Google Gemini)">
                            <InputField label="Clé API Gemini" name="geminiApiKey" value={settings.geminiApiKey || ''} onChange={handleChange} type="password" />
                        </SettingsSection>

                        <div className="mt-8 flex justify-end">
                            <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-300">
                                Sauvegarder les Paramètres
                            </button>
                        </div>
                    </form>

                    {status.message && (
                        <div className={`mt-6 p-4 rounded-md text-center ${status.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {status.message}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
