import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [showRegisterOption, setShowRegisterOption] = useState(true);

  // Vérifier s'il y a déjà des utilisateurs au chargement
  useEffect(() => {
    checkUserCount();
  }, []);

  const checkUserCount = async () => {
    try {
      // Essayer de faire une requête qui nous indique s'il y a des utilisateurs
      const response = await api.getSystemHealth();
      // Si l'API répond, c'est que le serveur fonctionne
      // On peut essayer de s'inscrire pour voir si c'est autorisé
    } catch (error) {
      console.log('Pas de vérification du nombre d\'utilisateurs possible');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let response;
      
      if (isRegister) {
        if (!formData.email) {
          setError('Email requis pour l\'inscription');
          return;
        }
        response = await api.register({
          username: formData.username,
          email: formData.email,
          password: formData.password
        });
      } else {
        response = await api.login({
          username: formData.username,
          password: formData.password,
          rememberMe: formData.rememberMe
        });
      }
console.log(response)
      if (response.data.success) {
        if (response.data.isFirstUser) {
          // Premier utilisateur créé, afficher un message de bienvenue
          alert('🎉 Félicitations ! Vous êtes le premier utilisateur et avez été promu administrateur automatiquement.');
        }
        onLogin(response.data.token, response.data.user);
      } else {
        setError(response.data.message || 'Erreur de connexion');
      }
    } catch (error) {
      console.error('Erreur auth:', error);
      console.log(error)
      setError(
        error.response?.data?.message || 
        'Erreur de connexion au serveur'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🍓 Raspberry Pi Manager</h1>
          <p>Interface de gestion distante sécurisée</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">
              Nom d'utilisateur {!isRegister && '/ Email'}
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder={isRegister ? "Nom d'utilisateur" : "Nom d'utilisateur ou email"}
              disabled={loading}
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                required
                placeholder="votre@email.com"
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              disabled={loading}
              minLength="6"
            />
          </div>

          {!isRegister && (
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  disabled={loading}
                />
                <span className="checkmark"></span>
                Se souvenir de moi (7 jours)
              </label>
            </div>
          )}

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                {isRegister ? 'Inscription...' : 'Connexion...'}
              </>
            ) : (
              <>
                {isRegister ? '📝 S\'inscrire' : '🔐 Se connecter'}
              </>
            )}
          </button>

          {showRegisterOption && (
            <div className="switch-mode">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                  setFormData(prev => ({ ...prev, email: '' }));
                }}
                disabled={loading}
                className="switch-button"
              >
                {isRegister 
                  ? 'Déjà un compte ? Se connecter'
                  : 'Pas de compte ? S\'inscrire'
                }
              </button>
            </div>
          )}

          {!showRegisterOption && !isRegister && (
            <div className="info-message">
              <p>💡 L'inscription est désactivée. Contactez un administrateur pour créer un compte.</p>
            </div>
          )}
        </form>

        <div className="login-footer">
          <div className="system-info">
            <span>🖥️ Interface sécurisée</span>
            <span>🔒 Authentification JWT</span>
            <span>⚡ Contrôle en temps réel</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;