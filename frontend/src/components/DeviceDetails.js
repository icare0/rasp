import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Cpu,
  MemoryStick,
  Thermometer,
  HardDrive,
  Network,
  Clock,
  Server,
  RefreshCw,
  Terminal as TerminalIcon,
  AlertTriangle,
  Activity
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { api } from '../services/api';
import '../styles/Dashboard.css';

const DeviceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [device, setDevice] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('1h');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const [deviceRes, metricsRes, alertsRes] = await Promise.all([
        api.getDevice(id),
        api.getDeviceMetrics(id, period),
        api.getDeviceAlerts(id, 'active', 10)
      ]);

      setDevice(deviceRes.data.data);
      setMetrics(metricsRes.data.data);
      setAlerts(alertsRes.data.data);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // S'abonner aux mises à jour en temps réel
    api.subscribeToDevice(id);

    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(() => {
      loadData(false);
    }, 30000);

    return () => {
      api.unsubscribeFromDevice(id);
      clearInterval(interval);
    };
  }, [id, period]);

  // Écouter les mises à jour temps réel
  useEffect(() => {
    const socket = api.getSocket();
    if (!socket) return;

    socket.on('metrics-update', (data) => {
      if (data.deviceId === id) {
        setDevice(prev => ({
          ...prev,
          lastMetrics: data.metrics
        }));
      }
    });

    socket.on('device-status', (data) => {
      if (data.deviceId === id) {
        setDevice(prev => ({
          ...prev,
          isOnline: data.isOnline
        }));
      }
    });

    socket.on('new-alert', (data) => {
      if (data.device.id === id) {
        setAlerts(prev => [data.alert, ...prev].slice(0, 10));
      }
    });

    return () => {
      socket.off('metrics-update');
      socket.off('device-status');
      socket.off('new-alert');
    };
  }, [id]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenTerminal = () => {
    navigate(`/devices/${id}/terminal`);
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
          <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="dashboard-container">
        <div className="empty-state">
          <Server className="empty-state-icon" size={64} />
          <h3 className="empty-state-title">Appareil non trouvé</h3>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} />
            Retour au dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentMetrics = device.lastMetrics || {};
  const systemInfo = device.systemInfo || {};

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="dashboard-title" style={{ fontSize: '1.25rem' }}>
                {device.deviceName}
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {device.machineId}
              </p>
            </div>
          </div>

          <div className="dashboard-actions">
            <div className={`device-status-badge ${device.isOnline ? 'online' : 'offline'}`}>
              <span className="status-dot"></span>
              {device.isOnline ? 'En ligne' : 'Hors ligne'}
            </div>

            <button className="btn btn-ghost btn-sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'loading-spinner' : ''} />
            </button>

            <button className="btn btn-primary btn-sm" onClick={handleOpenTerminal}>
              <TerminalIcon size={16} />
              Terminal
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Métriques actuelles */}
        {device.isOnline && (
          <div className="stats-grid">
            <CurrentMetricCard
              title="CPU"
              value={currentMetrics.cpu?.usage?.toFixed(1) || 0}
              unit="%"
              icon={<Cpu size={24} />}
              color="var(--cpu-color)"
              alert={currentMetrics.cpu?.usage > 90}
            />
            <CurrentMetricCard
              title="Mémoire"
              value={currentMetrics.memory?.usagePercent?.toFixed(1) || 0}
              unit="%"
              icon={<MemoryStick size={24} />}
              color="var(--memory-color)"
              subtitle={`${formatBytes(currentMetrics.memory?.used)} / ${formatBytes(currentMetrics.memory?.total)}`}
              alert={currentMetrics.memory?.usagePercent > 85}
            />
            {currentMetrics.temperature?.main && (
              <CurrentMetricCard
                title="Température"
                value={currentMetrics.temperature.main.toFixed(1)}
                unit="°C"
                icon={<Thermometer size={24} />}
                color="var(--temp-color)"
                alert={currentMetrics.temperature.main > 80}
              />
            )}
            <CurrentMetricCard
              title="Disque"
              value={currentMetrics.disk?.[0]?.usagePercent?.toFixed(1) || 0}
              unit="%"
              icon={<HardDrive size={24} />}
              color="var(--disk-color)"
              subtitle={`${formatBytes(currentMetrics.disk?.[0]?.used)} / ${formatBytes(currentMetrics.disk?.[0]?.size)}`}
              alert={currentMetrics.disk?.[0]?.usagePercent > 90}
            />
          </div>
        )}

        {/* Graphiques */}
        {device.isOnline && metrics && (
          <div style={{ marginTop: '2rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem'
            }}>
              <h2 className="section-title">
                <Activity size={20} />
                Historique des métriques
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['1h', '6h', '24h', '7d'].map(p => (
                  <button
                    key={p}
                    className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setPeriod(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              <MetricsChart
                title="CPU (%)"
                data={metrics.metrics}
                dataKey="avgCpu"
                color="var(--cpu-color)"
              />
              <MetricsChart
                title="Mémoire (%)"
                data={metrics.metrics}
                dataKey="avgMemory"
                color="var(--memory-color)"
              />
              {metrics.metrics.some(m => m.avgTemp) && (
                <MetricsChart
                  title="Température (°C)"
                  data={metrics.metrics}
                  dataKey="avgTemp"
                  color="var(--temp-color)"
                />
              )}
            </div>
          </div>
        )}

        {/* Alertes actives */}
        {alerts.length > 0 && (
          <div className="alerts-panel" style={{ marginTop: '2rem' }}>
            <div className="alerts-header">
              <h3 className="alerts-title">
                <AlertTriangle size={20} />
                Alertes actives ({alerts.length})
              </h3>
            </div>
            <div className="alerts-list">
              {alerts.map(alert => (
                <AlertItem key={alert._id} alert={alert} />
              ))}
            </div>
          </div>
        )}

        {/* Informations système */}
        {systemInfo.os && (
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            padding: '1.5rem',
            marginTop: '2rem'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Server size={20} />
              Informations système
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem'
            }}>
              <InfoItem label="OS" value={`${systemInfo.os.distro} ${systemInfo.os.release}`} />
              <InfoItem label="Kernel" value={systemInfo.os.kernel} />
              <InfoItem label="Architecture" value={systemInfo.os.arch} />
              <InfoItem label="Hostname" value={systemInfo.os.hostname} />
              {systemInfo.cpu && (
                <>
                  <InfoItem label="CPU" value={systemInfo.cpu.brand} />
                  <InfoItem label="Cœurs" value={`${systemInfo.cpu.cores} (${systemInfo.cpu.physicalCores} physiques)`} />
                </>
              )}
              {currentMetrics.uptime && (
                <InfoItem label="Uptime" value={device.uptimeFormatted || formatUptime(currentMetrics.uptime)} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const CurrentMetricCard = ({ title, value, unit, icon, color, subtitle, alert }) => {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        <div className="stat-card-icon" style={{
          background: alert ? 'rgba(239, 68, 68, 0.1)' : `${color}20`,
          color: alert ? 'var(--error)' : color
        }}>
          {icon}
        </div>
      </div>
      <div className="stat-card-value" style={{ color: alert ? 'var(--error)' : color }}>
        {value}{unit}
      </div>
      {subtitle && (
        <div className="stat-card-subtitle">{subtitle}</div>
      )}
    </div>
  );
};

const MetricsChart = ({ title, data, dataKey, color }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius)',
        padding: '1.5rem'
      }}>
        <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{title}</h4>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
          Aucune donnée disponible
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--border-radius)',
      padding: '1.5rem'
    }}>
      <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{title}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis
            dataKey="_id"
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
            formatter={(value) => [value?.toFixed(2), title]}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const AlertItem = ({ alert }) => {
  return (
    <div className={`alert-item ${alert.severity}`}>
      <div className="alert-icon">
        <AlertTriangle size={20} />
      </div>
      <div className="alert-content">
        <div className="alert-message">{alert.message}</div>
        <div className="alert-meta">
          <span>{new Date(alert.createdAt).toLocaleString('fr-FR')}</span>
          <span>•</span>
          <span className={`alert-badge ${alert.severity}`}>{alert.severity}</span>
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ label, value }) => {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
        {value || 'N/A'}
      </div>
    </div>
  );
};

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatUptime(seconds) {
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
}

export default DeviceDetails;
