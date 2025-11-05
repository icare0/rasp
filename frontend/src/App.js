import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import RaspberryDashboard from './components/RaspberryDashboard';
import DeviceDetails from './components/DeviceDetails';
import Terminal from './components/Terminal';
import Automation from './components/Automation';
import Settings from './components/Settings';
import { api } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        api.setAuthToken(token);
        try {
          const response = await api.get('/auth/me');
          if (response.data.success) {
            setUser(response.data.user);
            setIsAuthenticated(true);
          } else {
            console.log('Token invalide, nettoyage...');
            localStorage.removeItem('token');
            api.setAuthToken(null);
          }
        } catch (error) {
          // Si c'est une erreur réseau, garder le token pour retry plus tard
          if (error.response?.status === 401) {
            console.log('Token expiré, déconnexion');
            localStorage.removeItem('token');
            api.setAuthToken(null);
          } else {
            console.warn('Serveur inaccessible, tentative plus tard');
            // Ne pas supprimer le token si c'est juste une erreur réseau
          }
        }
      }
    } catch (error) {
      console.error('Erreur vérification auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    api.setAuthToken(token);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    api.setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <Login onLogin={handleLogin} />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />

          <Route
            path="/dashboard"
            element={
              isAuthenticated ? (
                <RaspberryDashboard user={user} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/devices/:id"
            element={
              isAuthenticated ? (
                <DeviceDetails />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/devices/:id/terminal"
            element={
              isAuthenticated ? (
                <Terminal />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/automation"
            element={
              isAuthenticated ? (
                <Automation />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/settings"
            element={
              isAuthenticated ? (
                <Settings />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/"
            element={
              <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;