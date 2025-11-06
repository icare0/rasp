import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  X,
  Trash2,
  Filter,
  RefreshCw,
  CheckCheck,
  Clock,
  Server
} from 'lucide-react';
import './Alerts.css';

const Alerts = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlerts, setSelectedAlerts] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    type: 'all',
    deviceId: 'all'
  });
  const [devices, setDevices] = useState([]);
  const [resolveNotes, setResolveNotes] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [currentAlert, setCurrentAlert] = useState(null);

  useEffect(() => {
    loadAlerts();
    loadDevices();
  }, [filters]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const params = {};

      if (filters.status !== 'all') params.status = filters.status;
      if (filters.severity !== 'all') params.severity = filters.severity;
      if (filters.type !== 'all') params.type = filters.type;
      if (filters.deviceId !== 'all') params.deviceId = filters.deviceId;

      const response = await api.getAlerts(params);
      setAlerts(response.data.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des alertes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const response = await api.getDevices();
      setDevices(response.data.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des devices:', error);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await api.acknowledgeAlert(alertId);
      loadAlerts();
    } catch (error) {
      console.error('Erreur lors de l\'acknowledgment:', error);
    }
  };

  const handleResolve = async (alertId, notes) => {
    try {
      await api.resolveAlert(alertId, notes);
      setShowResolveModal(false);
      setResolveNotes('');
      setCurrentAlert(null);
      loadAlerts();
    } catch (error) {
      console.error('Erreur lors de la résolution:', error);
    }
  };

  const handleDelete = async (alertId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette alerte ?')) {
      try {
        await api.deleteAlert(alertId);
        loadAlerts();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const handleBulkAcknowledge = async () => {
    if (selectedAlerts.length === 0) return;
    try {
      await api.bulkAcknowledgeAlerts(selectedAlerts);
      setSelectedAlerts([]);
      loadAlerts();
    } catch (error) {
      console.error('Erreur lors de l\'acknowledgment groupé:', error);
    }
  };

  const handleBulkResolve = async () => {
    if (selectedAlerts.length === 0) return;
    const notes = prompt('Notes de résolution (optionnel):');
    try {
      await api.bulkResolveAlerts(selectedAlerts, notes);
      setSelectedAlerts([]);
      loadAlerts();
    } catch (error) {
      console.error('Erreur lors de la résolution groupée:', error);
    }
  };

  const toggleSelectAlert = (alertId) => {
    setSelectedAlerts(prev =>
      prev.includes(alertId)
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    );
  };

  const selectAllPending = () => {
    const pendingIds = alerts
      .filter(a => a.status === 'pending')
      .map(a => a._id);
    setSelectedAlerts(pendingIds);
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="alert-icon critical" />;
      case 'warning':
        return <AlertCircle className="alert-icon warning" />;
      case 'info':
        return <Info className="alert-icon info" />;
      default:
        return <Info className="alert-icon" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'En attente', color: '#f59e0b', icon: Clock },
      acknowledged: { text: 'Reconnu', color: '#3b82f6', icon: Check },
      resolved: { text: 'Résolu', color: '#10b981', icon: CheckCheck }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className="status-badge" style={{ backgroundColor: badge.color }}>
        <Icon size={14} />
        {badge.text}
      </span>
    );
  };

  const getTypeLabel = (type) => {
    const types = {
      cpu: 'CPU',
      memory: 'Mémoire',
      disk: 'Disque',
      temperature: 'Température',
      network: 'Réseau'
    };
    return types[type] || type;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeviceName = (deviceId) => {
    const device = devices.find(d => d._id === deviceId);
    return device ? device.deviceName : deviceId;
  };

  if (loading) {
    return (
      <div className="alerts-container">
        <div className="loading">
          <RefreshCw className="spin" />
          <p>Chargement des alertes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="alerts-container">
      <div className="alerts-header">
        <div className="header-top">
          <h1>
            <AlertTriangle />
            Alertes
          </h1>
          <button className="btn-refresh" onClick={loadAlerts}>
            <RefreshCw size={18} />
            Actualiser
          </button>
        </div>

        <div className="filters-section">
          <div className="filters-row">
            <div className="filter-group">
              <label>
                <Filter size={16} />
                Statut
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="all">Tous</option>
                <option value="pending">En attente</option>
                <option value="acknowledged">Reconnu</option>
                <option value="resolved">Résolu</option>
              </select>
            </div>

            <div className="filter-group">
              <label>
                <Filter size={16} />
                Sévérité
              </label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              >
                <option value="all">Toutes</option>
                <option value="critical">Critique</option>
                <option value="warning">Avertissement</option>
                <option value="info">Info</option>
              </select>
            </div>

            <div className="filter-group">
              <label>
                <Filter size={16} />
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="all">Tous</option>
                <option value="cpu">CPU</option>
                <option value="memory">Mémoire</option>
                <option value="disk">Disque</option>
                <option value="temperature">Température</option>
              </select>
            </div>

            <div className="filter-group">
              <label>
                <Server size={16} />
                Device
              </label>
              <select
                value={filters.deviceId}
                onChange={(e) => setFilters({ ...filters, deviceId: e.target.value })}
              >
                <option value="all">Tous</option>
                {devices.map(device => (
                  <option key={device._id} value={device._id}>
                    {device.deviceName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedAlerts.length > 0 && (
            <div className="bulk-actions">
              <span className="selection-count">
                {selectedAlerts.length} alerte(s) sélectionnée(s)
              </span>
              <button className="btn-bulk" onClick={handleBulkAcknowledge}>
                <Check size={16} />
                Reconnaître
              </button>
              <button className="btn-bulk resolve" onClick={handleBulkResolve}>
                <CheckCheck size={16} />
                Résoudre
              </button>
              <button className="btn-bulk clear" onClick={() => setSelectedAlerts([])}>
                <X size={16} />
                Annuler
              </button>
            </div>
          )}

          {alerts.some(a => a.status === 'pending') && selectedAlerts.length === 0 && (
            <div className="quick-select">
              <button className="btn-link" onClick={selectAllPending}>
                Sélectionner toutes les alertes en attente
              </button>
            </div>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="no-alerts">
          <CheckCheck size={64} className="no-alerts-icon" />
          <h2>Aucune alerte</h2>
          <p>Tous vos systèmes fonctionnent normalement</p>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map(alert => (
            <div
              key={alert._id}
              className={`alert-card ${alert.status} ${selectedAlerts.includes(alert._id) ? 'selected' : ''}`}
              style={{ borderLeftColor: getSeverityColor(alert.severity) }}
            >
              <div className="alert-select">
                <input
                  type="checkbox"
                  checked={selectedAlerts.includes(alert._id)}
                  onChange={() => toggleSelectAlert(alert._id)}
                  disabled={alert.status === 'resolved'}
                />
              </div>

              <div className="alert-icon-wrapper">
                {getSeverityIcon(alert.severity)}
              </div>

              <div className="alert-content">
                <div className="alert-header-row">
                  <div className="alert-title">
                    <h3>{alert.message}</h3>
                    <span className="alert-type">{getTypeLabel(alert.type)}</span>
                  </div>
                  {getStatusBadge(alert.status)}
                </div>

                <div className="alert-meta">
                  <span className="alert-device">
                    <Server size={14} />
                    {getDeviceName(alert.deviceId)}
                  </span>
                  <span className="alert-time">
                    <Clock size={14} />
                    {formatDate(alert.createdAt)}
                  </span>
                  {alert.value !== undefined && alert.threshold !== undefined && (
                    <span className="alert-values">
                      Valeur: {alert.value}% / Seuil: {alert.threshold}%
                    </span>
                  )}
                </div>

                {alert.resolvedAt && (
                  <div className="alert-resolution">
                    <p><strong>Résolu le:</strong> {formatDate(alert.resolvedAt)}</p>
                    {alert.resolvedBy && (
                      <p><strong>Par:</strong> {alert.resolvedBy.username || alert.resolvedBy}</p>
                    )}
                    {alert.resolutionNotes && (
                      <p><strong>Notes:</strong> {alert.resolutionNotes}</p>
                    )}
                  </div>
                )}

                {alert.acknowledgedAt && !alert.resolvedAt && (
                  <div className="alert-acknowledgment">
                    <p>
                      <Check size={14} />
                      Reconnu le {formatDate(alert.acknowledgedAt)}
                      {alert.acknowledgedBy && ` par ${alert.acknowledgedBy.username || alert.acknowledgedBy}`}
                    </p>
                  </div>
                )}
              </div>

              <div className="alert-actions">
                {alert.status === 'pending' && (
                  <>
                    <button
                      className="btn-icon"
                      onClick={() => handleAcknowledge(alert._id)}
                      title="Reconnaître"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      className="btn-icon resolve"
                      onClick={() => {
                        setCurrentAlert(alert);
                        setShowResolveModal(true);
                      }}
                      title="Résoudre"
                    >
                      <CheckCheck size={18} />
                    </button>
                  </>
                )}
                {alert.status === 'acknowledged' && (
                  <button
                    className="btn-icon resolve"
                    onClick={() => {
                      setCurrentAlert(alert);
                      setShowResolveModal(true);
                    }}
                    title="Résoudre"
                  >
                    <CheckCheck size={18} />
                  </button>
                )}
                {alert.status === 'resolved' && (
                  <button
                    className="btn-icon delete"
                    onClick={() => handleDelete(alert._id)}
                    title="Supprimer"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showResolveModal && currentAlert && (
        <div className="modal-overlay" onClick={() => setShowResolveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Résoudre l'alerte</h2>
              <button className="modal-close" onClick={() => setShowResolveModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p><strong>Message:</strong> {currentAlert.message}</p>
              <p><strong>Device:</strong> {getDeviceName(currentAlert.deviceId)}</p>

              <div className="form-group">
                <label>Notes de résolution (optionnel)</label>
                <textarea
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="Décrivez comment le problème a été résolu..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowResolveModal(false);
                  setResolveNotes('');
                  setCurrentAlert(null);
                }}
              >
                Annuler
              </button>
              <button
                className="btn-primary"
                onClick={() => handleResolve(currentAlert._id, resolveNotes)}
              >
                <CheckCheck size={18} />
                Résoudre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;
