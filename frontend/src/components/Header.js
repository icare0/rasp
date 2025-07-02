import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const Header = ({ user, onLogout, darkMode, onToggleDarkMode }) => {
  const [systemInfo, setSystemInfo] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchSystemInfo();
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const systemInterval = setInterval(fetchSystemInfo, 30000); // Actualiser toutes les 30s

    return () => {
      clearInterval(timeInterval);
      clearInterval(systemInterval);
    };
  }, []);

  const fetchSystemInfo = async () => {
    try {
      const response = await api.getSystemHealth();
      if (response.data.success) {
        setSystemInfo(response.data);
      }
    } catch (error) {
      console.error('Erreur système:', error);
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}j ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const handleLogout = () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      onLogout();
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="app-title">
          <h1>🍓 Raspberry Pi Manager</h1>
          <span className="subtitle">Interface de gestion distante</span>
        </div>
      </div>

      <div className="header-center">
        <div className="system-status">
          {systemInfo && (
            <>
              <div className="status-item">
                <span className="status-label">Uptime:</span>
                <span className="status-value">
                  {formatUptime(systemInfo.uptime)}
                </span>
              </div>
              <div className="status-item">
                <span className="status-indicator online"></span>
                <span className="status-value">En ligne</span>
              </div>
            </>
          )}
          <div className="status-item">
            <span className="status-label">Heure:</span>
            <span className="status-value">
              {currentTime.toLocaleTimeString('fr-FR')}
            </span>
          </div>
        </div>
      </div>

      <div className="header-right">
        <div className="header-controls">
          <button
            className="theme-toggle"
            onClick={onToggleDarkMode}
            title={`Basculer en mode ${darkMode ? 'clair' : 'sombre'}`}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          <div className="user-info">
            <div className="user-details">
              <span className="username">{user?.username}</span>
              <span className="user-role">{user?.role}</span>
            </div>
            <div className="user-avatar">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
            title="Se déconnecter"
          >
            🚪 Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
