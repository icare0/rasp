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
  MemoryStick,
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { api } from '../services/api';
import DeviceCard from './DeviceCard';
import '../styles/Dashboard.css';
import '../styles/ModernDashboard.css';

const RaspberryDashboard = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [alertsSummary, setAlertsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [metricsHistory, setMetricsHistory] = useState([]);

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

      setDevices(devicesRes.data.data || []);
      setSummary(summaryRes.data.data);
      setAlertsSummary(alertsRes.data.data);
      setUser(userRes.data.user);

      // Ajouter aux historiques de métriques pour les graphiques
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      setMetricsHistory(prev => {
        const newEntry = {
          time: timeStr,
          cpu: parseFloat(summaryRes.data.data.averages?.cpu || 0),
          memory: parseFloat(summaryRes.data.data.averages?.memory || 0),
          temperature: parseFloat(summaryRes.data.data.averages?.temperature || 0),
          online: summaryRes.data.data.devices?.online || 0
        };

        // Garder seulement les 20 dernières entrées
        const updated = [...prev, newEntry].slice(-20);
        return updated;
      });
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
      setDevices(prevDevices => prevDevices.map(device =>
        device._id === data.deviceId
          ? { ...device, lastMetrics: data.metrics }
          : device
      ));
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
    navigate('/settings');
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

  // Calculer les moyennes globales - s'assurer que ce sont des nombres
  const avgCpu = parseFloat(summary?.averages?.cpu) || 0;
  const avgMemory = parseFloat(summary?.averages?.memory) || 0;
  const avgTemp = summary?.averages?.temperature ? parseFloat(summary.averages.temperature) : null;

  return (
    <div className="fade-in">
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--stat-color': 'var(--success)', '--stat-bg': 'var(--success-light)' }}>
          <div className="stat-header">
            <div className="stat-icon">
              <Server size={24} />
            </div>
            {summary?.trends?.devices && (
              <div className={`stat-trend ${summary.trends.devices >= 0 ? 'up' : 'down'}`}>
                {summary.trends.devices >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {Math.abs(summary.trends.devices)}%
              </div>
            )}
          </div>
          <div className="stat-content">
            <div className="stat-value">{onlineDevices.length}</div>
            <div className="stat-label">Devices en ligne</div>
          </div>
          <div className="stat-footer">
            Total: {devices.length} devices
          </div>
        </div>

        <div className="stat-card" style={{ '--stat-color': 'var(--primary)', '--stat-bg': 'var(--primary-light)' }}>
          <div className="stat-header">
            <div className="stat-icon">
              <Cpu size={24} />
            </div>
            {summary?.trends?.cpu && (
              <div className={`stat-trend ${summary.trends.cpu <= 0 ? 'up' : 'down'}`}>
                {summary.trends.cpu <= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {Math.abs(summary.trends.cpu)}%
              </div>
            )}
          </div>
          <div className="stat-content">
            <div className="stat-value">{avgCpu.toFixed(1)}%</div>
            <div className="stat-label">CPU Moyen</div>
          </div>
          <div className="stat-footer">
            Charge système globale
          </div>
        </div>

        <div className="stat-card" style={{ '--stat-color': 'var(--warning)', '--stat-bg': 'var(--warning-light)' }}>
          <div className="stat-header">
            <div className="stat-icon">
              <MemoryStick size={24} />
            </div>
            {summary?.trends?.memory && (
              <div className={`stat-trend ${summary.trends.memory <= 0 ? 'up' : 'down'}`}>
                {summary.trends.memory <= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {Math.abs(summary.trends.memory)}%
              </div>
            )}
          </div>
          <div className="stat-content">
            <div className="stat-value">{avgMemory.toFixed(1)}%</div>
            <div className="stat-label">RAM Moyenne</div>
          </div>
          <div className="stat-footer">
            Utilisation mémoire
          </div>
        </div>

        {avgTemp !== null && (
          <div className="stat-card" style={{ '--stat-color': 'var(--danger)', '--stat-bg': 'var(--danger-light)' }}>
            <div className="stat-header">
              <div className="stat-icon">
                <Thermometer size={24} />
              </div>
              {summary?.trends?.temperature && (
                <div className={`stat-trend ${summary.trends.temperature <= 0 ? 'up' : 'down'}`}>
                  {summary.trends.temperature <= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {Math.abs(summary.trends.temperature)}%
                </div>
              )}
            </div>
            <div className="stat-content">
              <div className="stat-value">{avgTemp.toFixed(1)}°C</div>
              <div className="stat-label">Température</div>
            </div>
            <div className="stat-footer">
              Moyenne des systèmes
            </div>
          </div>
        )}

        {alertsSummary && alertsSummary.total > 0 && (
          <div className="stat-card" style={{ '--stat-color': 'var(--danger)', '--stat-bg': 'var(--danger-light)' }}>
            <div className="stat-header">
              <div className="stat-icon">
                <AlertTriangle size={24} />
              </div>
            </div>
            <div className="stat-content">
              <div className="stat-value">{alertsSummary.total}</div>
              <div className="stat-label">Alertes actives</div>
            </div>
            <div className="stat-footer">
              {alertsSummary.critical > 0 && `${alertsSummary.critical} critiques`}
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      {metricsHistory.length > 0 && (
        <div className="charts-grid">
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Utilisation CPU</h3>
              <div className="chart-actions">
                <button className="chart-action-btn" onClick={handleRefresh}>
                  <RefreshCw size={14} className={refreshing ? 'loading-pulse' : ''} />
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={metricsHistory}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                  }}
                />
                <Area type="monotone" dataKey="cpu" stroke="var(--primary)" fill="url(#colorCpu)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Utilisation RAM</h3>
              <div className="chart-actions">
                <button className="chart-action-btn" onClick={handleRefresh}>
                  <RefreshCw size={14} className={refreshing ? 'loading-pulse' : ''} />
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={metricsHistory}>
                <defs>
                  <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--warning)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--warning)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                  }}
                />
                <Area type="monotone" dataKey="memory" stroke="var(--warning)" fill="url(#colorMemory)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Devices Section */}
      <div className="devices-section-header">
        <h2 className="section-title">
          <Server size={24} />
          Appareils ({onlineDevices.length}/{devices.length})
        </h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={handleRefresh}>
            <RefreshCw size={16} className={refreshing ? 'loading-pulse' : ''} />
          </button>
          {user?.role === 'admin' && (
            <button className="btn btn-primary" onClick={handleAddDevice}>
              <Plus size={16} />
              Ajouter
            </button>
          )}
        </div>
      </div>

      {/* Devices Grid */}
      {devices.length > 0 ? (
        <div className="devices-grid slide-in">
          {devices.map(device => (
            <DeviceCard key={device._id} device={device} />
          ))}
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem 2rem',
          textAlign: 'center',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '2px dashed var(--border-color)'
        }}>
          <Server size={64} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Aucun appareil
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
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
    </div>
  );
};

export default RaspberryDashboard;
