import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
            const response = await axios.post(`${apiUrl}/api/auth/login`, {
                email,
                password,
            });

            if (response.data.success) {
                // Stocker un indicateur de connexion (simple)
                localStorage.setItem('isAuthenticated', 'true');
                navigate('/'); // Rediriger vers le tableau de bord
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Une erreur est survenue.');
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h2>Connexion</h2>
                <form onSubmit={handleSubmit}>
                    {error && <p className="error-message">{error}</p>}
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Mot de passe</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="login-button">Se connecter</button>
                </form>
            </div>
        </div>
    );
};

export default Login;
