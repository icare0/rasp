import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, MemoryStick, Thermometer, HardDrive, Clock, AlertTriangle, AlertCircle } from 'lucide-react';
import '../styles/Dashboard.css';

const DeviceCard = ({ device }) => {
  const navigate = useNavigate();

  if (!device) return null;

  const metrics = device.lastMetrics || {};
  const isOnline = device.isOnline;

  // Formater les valeurs
  const cpuUsage = metrics.cpu?.usage?.toFixed(1) || 0;
  const memoryUsage = metrics.memory?.usagePercent?.toFixed(1) || 0;
  const temperature = metrics.temperature?.main?.toFixed(1) || null;
  const diskUsage = metrics.disk?.[0]?.usagePercent?.toFixed(1) || 0;
  const uptime = device.uptimeFormatted || 'N/A';

  // Compter les alertes actives
  const alerts = device.lastMetrics ? countAlerts(device) : { warning: 0, critical: 0 };

  const handleClick = () => {
    navigate(`/devices/${device._id}`);
  };

  return (
    <div
      className={`device-card ${!isOnline ? 'offline' : ''}`}
      onClick={handleClick}
    >
      <div className="device-card-header">
        <div className="device-card-info">
          <h3 className="device-card-name">
            {device.deviceName}
          </h3>
          <p className="device-card-id">{device.machineId}</p>
        </div>
        <div className={`device-status-badge ${isOnline ? 'online' : 'offline'}`}>
          <span className="status-dot"></span>
          {isOnline ? 'En ligne' : 'Hors ligne'}
        </div>
      </div>

      {isOnline && metrics ? (
        <>
          <div className="device-card-metrics">
            <MetricItem
              icon={<Cpu size={14} />}
              label="CPU"
              value={cpuUsage}
              unit="%"
              percent={cpuUsage}
              type="cpu"
              alert={cpuUsage > 90}
            />
            <MetricItem
              icon={<MemoryStick size={14} />}
              label="RAM"
              value={memoryUsage}
              unit="%"
              percent={memoryUsage}
              type="memory"
              alert={memoryUsage > 85}
            />
            {temperature && (
              <MetricItem
                icon={<Thermometer size={14} />}
                label="Temp"
                value={temperature}
                unit="°C"
                percent={(temperature / 100) * 100}
                type="temp"
                alert={temperature > 80}
              />
            )}
            <MetricItem
              icon={<HardDrive size={14} />}
              label="Disque"
              value={diskUsage}
              unit="%"
              percent={diskUsage}
              type="disk"
              alert={diskUsage > 90}
            />
          </div>

          <div className="device-card-footer">
            <div className="device-uptime">
              <Clock size={12} />
              <span>Uptime: {uptime}</span>
            </div>
            {(alerts.warning > 0 || alerts.critical > 0) && (
              <div className="device-alerts">
                {alerts.warning > 0 && (
                  <div className="alert-badge warning">
                    <AlertTriangle size={12} />
                    {alerts.warning}
                  </div>
                )}
                {alerts.critical > 0 && (
                  <div className="alert-badge critical">
                    <AlertCircle size={12} />
                    {alerts.critical}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state" style={{ padding: '2rem 1rem' }}>
          <p style={{ fontSize: '0.875rem' }}>
            {isOnline ? 'Aucune donnée disponible' : 'Appareil hors ligne'}
          </p>
        </div>
      )}
    </div>
  );
};

const MetricItem = ({ icon, label, value, unit, percent, type, alert }) => {
  return (
    <div className="metric-item">
      <div className="metric-label">
        {icon}
        <span>{label}</span>
      </div>
      <div className="metric-value">
        <span className="metric-number" style={{ color: alert ? 'var(--error)' : 'var(--text-primary)' }}>
          {value}
        </span>
        <span className="metric-unit">{unit}</span>
      </div>
      <div className="metric-bar">
        <div
          className={`metric-bar-fill ${type}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        ></div>
      </div>
    </div>
  );
};

// Fonction pour compter les alertes
function countAlerts(device) {
  const alerts = { warning: 0, critical: 0 };

  if (!device.lastMetrics || !device.alerts) return alerts;

  const metrics = device.lastMetrics;
  const config = device.alerts;

  // Vérifier CPU
  if (config.cpu?.enabled && metrics.cpu?.usage > config.cpu.threshold) {
    alerts.warning++;
  }

  // Vérifier température
  if (config.temperature?.enabled && metrics.temperature?.main) {
    if (metrics.temperature.main > 85) {
      alerts.critical++;
    } else if (metrics.temperature.main > config.temperature.threshold) {
      alerts.warning++;
    }
  }

  // Vérifier mémoire
  if (config.memory?.enabled && metrics.memory?.usagePercent > config.memory.threshold) {
    alerts.warning++;
  }

  // Vérifier disque
  if (config.disk?.enabled && metrics.disk) {
    metrics.disk.forEach(disk => {
      if (disk.usagePercent > 95) {
        alerts.critical++;
      } else if (disk.usagePercent > config.disk.threshold) {
        alerts.warning++;
      }
    });
  }

  return alerts;
}

export default DeviceCard;
