import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const ProjectCard = ({ project, onAction, onDelete, canManage }) => {
  const [loading, setLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const handleAction = async (action) => {
    setLoading(true);
    try {
      await onAction(project._id, action);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (logsLoading) return;
    
    setLogsLoading(true);
    try {
      const response = await api.getProjectLogs(project._id, { limit: 20 });
      if (response.data.success) {
        setLogs(response.data.logs);
      }
    } catch (error) {
      console.error('Erreur chargement logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (showLogs && logs.length === 0) {
      fetchLogs();
    }
  }, [showLogs]);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  const getStatusColor = () => {
    return project.isRunning ? '#4ade80' : '#6b7280';
  };

  const getCategoryColor = () => {
    const colors = {
      bot: '#8b5cf6',
      website: '#06b6d4',
      script: '#f59e0b',
      service: '#10b981',
      other: '#6b7280'
    };
    return colors[project.category] || colors.other;
  };

  return (
    <div className="project-card">
      <div className="project-header">
        <div className="project-title">
          <span className="project-icon">{project.icon}</span>
          <div className="project-info">
            <h3 className="project-name">{project.name}</h3>
            <div className="project-meta">
              <span 
                className="project-category"
                style={{ backgroundColor: getCategoryColor() }}
              >
                {project.category}
              </span>
              <span 
                className="project-status"
                style={{ color: getStatusColor() }}
              >
                ● {project.isRunning ? 'En cours' : 'Arrêté'}
              </span>
            </div>
          </div>
        </div>

        {canManage && (
          <div className="project-menu">
            <button 
              className="menu-button"
              onClick={() => onDelete && onDelete(project._id)}
              title="Supprimer le projet"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {project.description && (
        <p className="project-description">{project.description}</p>
      )}

      <div className="project-details">
        <div className="detail-item">
          <span className="detail-label">📁 Répertoire:</span>
          <span className="detail-value">{project.directory}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">⚙️ Commande:</span>
          <code className="detail-value">{project.commands.start}</code>
        </div>
        {project.lastStarted && (
          <div className="detail-item">
            <span className="detail-label">🕐 Dernier démarrage:</span>
            <span className="detail-value">
              {formatTimestamp(project.lastStarted)}
            </span>
          </div>
        )}
      </div>

      <div className="project-actions">
        <div className="action-buttons">
          <button
            className={`action-button start ${project.isRunning ? 'disabled' : ''}`}
            onClick={() => handleAction('start')}
            disabled={loading || project.isRunning}
            title="Démarrer le projet"
          >
            {loading ? '⏳' : '▶️'} Start
          </button>

          <button
            className={`action-button stop ${!project.isRunning ? 'disabled' : ''}`}
            onClick={() => handleAction('stop')}
            disabled={loading || !project.isRunning}
            title="Arrêter le projet"
          >
            {loading ? '⏳' : '⏹️'} Stop
          </button>

          <button
            className="action-button restart"
            onClick={() => handleAction('restart')}
            disabled={loading}
            title="Redémarrer le projet"
          >
            {loading ? '⏳' : '🔄'} Restart
          </button>

          <button
            className="action-button logs"
            onClick={() => setShowLogs(!showLogs)}
            title="Voir les logs"
          >
            📋 Logs
          </button>
        </div>
      </div>

      {showLogs && (
        <div className="project-logs">
          <div className="logs-header">
            <h4>📋 Logs récents</h4>
            <div className="logs-actions">
              <button 
                onClick={fetchLogs}
                disabled={logsLoading}
                className="refresh-logs"
              >
                {logsLoading ? '⏳' : '🔄'}
              </button>
              <button 
                onClick={() => setShowLogs(false)}
                className="close-logs"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="logs-content">
            {logsLoading ? (
              <div className="logs-loading">Chargement...</div>
            ) : logs.length === 0 ? (
              <div className="logs-empty">Aucun log disponible</div>
            ) : (
              <div className="logs-list">
                {logs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`log-entry ${log.error ? 'error' : 'success'}`}
                  >
                    <div className="log-meta">
                      <span className="log-time">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <span className="log-duration">
                        {formatDuration(log.executionTime)}
                      </span>
                      <span className={`log-status ${log.exitCode === 0 ? 'success' : 'error'}`}>
                        {log.exitCode === 0 ? '✅' : '❌'} {log.exitCode}
                      </span>
                    </div>
                    
                    <div className="log-command">
                      <code>{log.command}</code>
                    </div>
                    
                    {log.output && (
                      <div className="log-output">
                        <pre>{log.output.slice(0, 500)}</pre>
                        {log.output.length > 500 && (
                          <span className="log-truncated">... (tronqué)</span>
                        )}
                      </div>
                    )}
                    
                    {log.error && (
                      <div className="log-error">
                        <pre>{log.error}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCard;
