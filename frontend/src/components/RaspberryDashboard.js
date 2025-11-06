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

      console.log('[Dashboard] Devices loaded:', devicesRes.data.data?.length);
      console.log('[Dashboard] Devices with metrics:', devicesRes.data.data?.filter(d => d.lastMetrics).length);

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
      console.log('[Dashboard] 🎯 ========== METRICS UPDATE RECEIVED ==========');
      console.log('[Dashboard] deviceId:', data.deviceId);
      console.log('[Dashboard] metrics existe:', !!data.metrics);
      console.log('[Dashboard] metrics.cpu:', data.metrics?.cpu?.usage);
      console.log('[Dashboard] metrics.memory:', data.metrics?.memory?.usagePercent);
      console.log('[Dashboard] metrics.temperature:', data.metrics?.temperature?.main);
      console.log('[Dashboard] metrics.disk:', data.metrics?.disk?.length);
      console.log('[Dashboard] Structure complète:', JSON.stringify(data.metrics).substring(0, 200));

      // Mettre à jour le device correspondant
      setDevices(prevDevices => {
        const updated = prevDevices.map(device => {
          if (device._id === data.deviceId) {
            console.log(`[Dashboard] Mise à jour du device ${device.deviceName} avec nouvelles métriques`);
            return { ...device, lastMetrics: data.metrics };
          }
          return device;
        });

        const deviceFound = updated.find(d => d._id === data.deviceId);
        if (deviceFound) {
          console.log(`[Dashboard] ✅ Device trouvé et mis à jour: ${deviceFound.deviceName}`);
        } else {
          console.warn(`[Dashboard] ⚠️ Device ${data.deviceId} non trouvé dans la liste`);
        }

        return updated;
      });

      console.log('[Dashboard] 🎯 ========== END METRICS UPDATE ==========\n');
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
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/automation')}
            >
              <Zap size={16} />
              Automatisation
            </button>

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
        {/* Statistiques globales - Style Grafana */}
        <div className="stats-grid">
          <StatCard
            title="Appareils"
            value={summary?.devices?.online || 0}
            subtitle={`${summary?.devices?.total || 0} au total`}
            icon={<Server size={24} />}
            trend={summary?.devices?.online > 0 ? 'positive' : null}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          />

          <StatCard
            title="CPU Moyen"
            value={`${parseFloat(avgCpu).toFixed(1)}%`}
            subtitle="Tous les appareils en ligne"
            icon={<Cpu size={24} />}
            alert={avgCpu > 80}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
          />

          <StatCard
            title="RAM Moyenne"
            value={`${parseFloat(avgMemory).toFixed(1)}%`}
            subtitle="Tous les appareils en ligne"
            icon={<MemoryStick size={24} />}
            alert={avgMemory > 80}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
          />

          {avgTemp && (
            <StatCard
              title="Temp. Moyenne"
              value={`${parseFloat(avgTemp).toFixed(1)}°C`}
              subtitle="Tous les appareils en ligne"
              icon={<Thermometer size={24} />}
              alert={avgTemp > 70}
              gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
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
              gradient="linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)"
            />
          )}
        </div>

        {/* Graphiques de métriques - Style Grafana */}
        {metricsHistory.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <MetricsChart
              title="CPU Usage"
              data={metricsHistory}
              dataKey="cpu"
              color="#f5576c"
              unit="%"
              icon={<Cpu size={16} />}
            />
            <MetricsChart
              title="Utilisation Mémoire"
              data={metricsHistory}
              dataKey="memory"
              color="#00f2fe"
              unit="%"
              icon={<MemoryStick size={16} />}
            />
            {avgTemp && (
              <MetricsChart
                title="Température"
                data={metricsHistory}
                dataKey="temperature"
                color="#fee140"
                unit="°C"
                icon={<Thermometer size={16} />}
              />
            )}
            <MetricsChart
              title="Appareils en ligne"
              data={metricsHistory}
              dataKey="online"
              color="#764ba2"
              unit=""
              icon={<Activity size={16} />}
              areaChart
            />
          </div>
        )}

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

// Composant StatCard avec gradients style Grafana
const StatCard = ({ title, value, subtitle, icon, trend, alert, onClick, clickable, gradient }) => {
  return (
    <div
      className={`stat-card ${clickable ? 'clickable' : ''}`}
      onClick={onClick}
      style={{
        cursor: clickable ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {gradient && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: gradient
        }} />
      )}

      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        <div className="stat-card-icon" style={{
          background: gradient ? `${gradient.match(/#[0-9a-fA-F]{6}/)?.[0]}20` : 'rgba(99, 102, 241, 0.1)',
          color: alert ? 'var(--error)' : 'var(--primary)'
        }}>
          {icon}
        </div>
      </div>
      <div className="stat-card-value" style={{
        color: alert ? 'var(--error)' : 'var(--text-primary)',
        fontSize: '2.5rem'
      }}>
        {value}
      </div>
      {subtitle && (
        <div className="stat-card-subtitle">{subtitle}</div>
      )}
      {trend && (
        <div className={`stat-card-trend ${trend}`}>
          {trend === 'positive' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          Actifs
        </div>
      )}
    </div>
  );
};

// Composant MetricsChart style Grafana
const MetricsChart = ({ title, data, dataKey, color, unit, icon, areaChart = false }) => {
  const latestValue = data.length > 0 ? data[data.length - 1][dataKey] : 0;
  const previousValue = data.length > 1 ? data[data.length - 2][dataKey] : latestValue;
  const trend = latestValue > previousValue ? 'up' : latestValue < previousValue ? 'down' : 'stable';

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--border-radius)',
      padding: '1.5rem',
      transition: 'all var(--transition-normal)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: `${color}20`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {icon}
          </div>
          <h3 style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {title}
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text-primary)'
          }}>
            {latestValue.toFixed(1)}{unit}
          </span>
          {trend !== 'stable' && (
            <div style={{
              color: trend === 'up' ? 'var(--error)' : 'var(--success)',
              display: 'flex',
              alignItems: 'center'
            }}>
              {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        {areaChart ? (
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} />
            <XAxis
              dataKey="time"
              stroke="var(--text-muted)"
              style={{ fontSize: '0.75rem' }}
            />
            <YAxis
              stroke="var(--text-muted)"
              style={{ fontSize: '0.75rem' }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-primary)'
              }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${dataKey})`}
            />
          </AreaChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} />
            <XAxis
              dataKey="time"
              stroke="var(--text-muted)"
              style={{ fontSize: '0.75rem' }}
            />
            <YAxis
              stroke="var(--text-muted)"
              style={{ fontSize: '0.75rem' }}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-primary)'
              }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              dot={{ fill: color, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default RaspberryDashboard;
