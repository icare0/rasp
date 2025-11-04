import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Server,
  Activity,
  AlertTriangle,
  Plus,
  RefreshCw,
  Bell,
  Settings,
  LogOut,
  Thermometer,
  MemoryStick
} from 'lucide-react';
import { api } from '../services/api';
import DeviceCard from './DeviceCard';
import '../styles/Dashboard.css';

const RaspberryDashboard = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [alertsSummary, setAlertsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);

  // Charger les données
  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const [devicesRes, summaryRes, alertsRes, userRes] = await Promise.all([
        api.getDevices(),
        api.getDevicesSummary(),
        api.getAlertsSummary(),
        api.getProfile()
      ]);

      setDevices(devicesRes.data.data);
      setSummary(summaryRes.data.data);
      setAlertsSummary(alertsRes.data.data);
      setUser(userRes.data.user);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(() => {
      loadData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [loadData]);

  // Écouter les événements Socket.IO
  useEffect(() => {
    const socket = api.getSocket();
    if (!socket) return;

    socket.on('device-connected', () => {
      loadData(false);
    });

    socket.on('device-disconnected', () => {
      loadData(false);
    });

    socket.on('new-alert', () => {
      loadData(false);
    });

    socket.on('metrics-update', (data) => {
      // Mettre à jour le device correspondant
      setDevices(prevDevices =>
        prevDevices.map(device =>
          device._id === data.deviceId
            ? { ...device, lastMetrics: data.metrics }
            : device
        )
      );
    });

    return () => {
      socket.off('device-connected');
      socket.off('device-disconnected');
      socket.off('new-alert');
      socket.off('metrics-update');
    };
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    api.setAuthToken(null);
    navigate('/login');
  };

  const handleAddDevice = () => {
    navigate('/devices/new');
  };

  const handleViewAlerts = () => {
    navigate('/alerts');
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div className="loading-spinner" style={{ width: '40px', height: '40px' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  const onlineDevices = devices.filter(d => d.isOnline);
  const offlineDevices = devices.filter(d => !d.isOnline);

  // Calculer les moyennes globales
  const avgCpu = summary?.averages?.cpu || 0;
  const avgMemory = summary?.averages?.memory || 0;
  const avgTemp = summary?.averages?.temperature || null;

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <h1 className="dashboard-title">
            <Server className="dashboard-title-icon" size={28} />
            Raspberry Pi Manager
          </h1>

          <div className="dashboard-actions">
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? 'loading-spinner' : ''} />
              Actualiser
            </button>

            {summary?.alerts && summary.alerts.total > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleViewAlerts}
                style={{ position: 'relative' }}
              >
                <Bell size={16} />
                Alertes
                {summary.alerts.total > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: 'var(--error)',
                    color: 'white',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    fontSize: '0.625rem',
                    fontWeight: 'bold'
                  }}>
                    {summary.alerts.total}
                  </span>
                )}
              </button>
            )}

            {user?.role === 'admin' && (
              <button className="btn btn-ghost btn-sm" onClick={handleAddDevice}>
                <Plus size={16} />
                Ajouter
              </button>
            )}

            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/settings')}>
              <Settings size={16} />
            </button>

            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              <LogOut size={16} />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Statistiques globales */}
        <div className="stats-grid">
          <StatCard
            title="Appareils"
            value={summary?.devices?.online || 0}
            subtitle={`${summary?.devices?.total || 0} au total`}
            icon={<Server size={24} />}
            trend={summary?.devices?.online > 0 ? 'positive' : null}
          />

          <StatCard
            title="CPU Moyen"
            value={`${parseFloat(avgCpu).toFixed(1)}%`}
            subtitle="Tous les appareils en ligne"
            icon={<Cpu size={24} />}
            alert={avgCpu > 80}
          />

          <StatCard
            title="RAM Moyenne"
            value={`${parseFloat(avgMemory).toFixed(1)}%`}
            subtitle="Tous les appareils en ligne"
            icon={<MemoryStick size={24} />}
            alert={avgMemory > 80}
          />

          {avgTemp && (
            <StatCard
              title="Temp. Moyenne"
              value={`${parseFloat(avgTemp).toFixed(1)}°C`}
              subtitle="Tous les appareils en ligne"
              icon={<Thermometer size={24} />}
              alert={avgTemp > 70}
            />
          )}

          {summary?.alerts && (
            <StatCard
              title="Alertes Actives"
              value={summary.alerts.total}
              subtitle={`${summary.alerts.critical || 0} critiques`}
              icon={<AlertTriangle size={24} />}
              alert={summary.alerts.total > 0}
              onClick={handleViewAlerts}
              clickable
            />
          )}
        </div>

        {/* Appareils en ligne */}
        {onlineDevices.length > 0 && (
          <section className="devices-section">
            <div className="section-header">
              <h2 className="section-title">
                <Activity size={20} style={{ color: 'var(--success)' }} />
                Appareils en ligne ({onlineDevices.length})
              </h2>
            </div>
            <div className="devices-grid">
              {onlineDevices.map(device => (
                <DeviceCard key={device._id} device={device} />
              ))}
            </div>
          </section>
        )}

        {/* Appareils hors ligne */}
        {offlineDevices.length > 0 && (
          <section className="devices-section">
            <div className="section-header">
              <h2 className="section-title">
                Appareils hors ligne ({offlineDevices.length})
              </h2>
            </div>
            <div className="devices-grid">
              {offlineDevices.map(device => (
                <DeviceCard key={device._id} device={device} />
              ))}
            </div>
          </section>
        )}

        {/* État vide */}
        {devices.length === 0 && (
          <div className="empty-state">
            <Server className="empty-state-icon" size={64} />
            <h3 className="empty-state-title">Aucun appareil</h3>
            <p className="empty-state-description">
              Commencez par ajouter une Raspberry Pi pour voir ses statistiques ici
            </p>
            {user?.role === 'admin' && (
              <button className="btn btn-primary" onClick={handleAddDevice}>
                <Plus size={16} />
                Ajouter votre première Raspberry Pi
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

// Composant StatCard
const StatCard = ({ title, value, subtitle, icon, trend, alert, onClick, clickable }) => {
  return (
    <div
      className={`stat-card ${clickable ? 'clickable' : ''}`}
      onClick={onClick}
      style={{ cursor: clickable ? 'pointer' : 'default' }}
    >
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        <div className="stat-card-icon" style={{
          background: alert ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
          color: alert ? 'var(--error)' : 'var(--primary)'
        }}>
          {icon}
        </div>
      </div>
      <div className="stat-card-value" style={{ color: alert ? 'var(--error)' : 'var(--text-primary)' }}>
        {value}
      </div>
      {subtitle && (
        <div className="stat-card-subtitle">{subtitle}</div>
      )}
      {trend && (
        <div className={`stat-card-trend ${trend}`}>
          {trend === 'positive' ? '↑' : '↓'}
          Actifs
        </div>
      )}
    </div>
  );
};

export default RaspberryDashboard;
