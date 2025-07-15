const express = require('express');
const router = express.Router();

// Route pour gérer la connexion
router.post('/login', (req, res) => {
    console.log('Tentative de connexion reçue.');
    console.log('Corps de la requête:', req.body);
    const { email, password } = req.body;

    // Récupérer les identifiants depuis les variables d'environnement
    // C'est plus sécurisé que de les mettre directement dans le code.
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        console.error("Les variables d'environnement ADMIN_EMAIL et ADMIN_PASSWORD ne sont pas définies.");
        return res.status(500).json({ message: "Erreur de configuration du serveur." });
    }

    if (email === adminEmail && password === adminPassword) {
        // Pour une vraie application, on générerait un token JWT ici.
        // Pour l'instant, on renvoie un simple succès.
        res.json({ success: true, message: 'Connexion réussie' });
    } else {
        res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }
});

module.exports = router;