import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const ConsolePanel = ({ projects, onClose }) => {
  const [command, setCommand] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [output, setOutput] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allLogs, setAllLogs] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const outputRef = useRef(null);

  useEffect(() => {
    fetchAllLogs();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchAllLogs, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  useEffect(() => {
    // Scroll automatique vers le bas
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, allLogs]);

  const fetchAllLogs = async () => {
    try {
      const response = await api.getAllLogs(50);
      if (response.data.success) {
        setAllLogs(response.data.logs);
      }
    } catch (error) {
      console.error('Erreur chargement logs:', error);
    }
  };

  const executeCommand = async () => {
    if (!command.trim()) return;

    const selectedProj = projects.find(p => p._id === selectedProject);
    if (!selectedProj) {
      addToOutput('Erreur: Veuillez sélectionner un projet', 'error');
      return;
    }

    setLoading(true);
    addToOutput(`$ ${command}`, 'command');

    try {
      const response = await api.executeCommand(
        command,
        selectedProj.directory,
        selectedProj._id
      );

      if (response.data.success) {
        const result = response.data.result;
        if (result.stdout) {
          addToOutput(result.stdout, 'success');
        }
        if (result.stderr) {
          addToOutput(result.stderr, 'warning');
        }
        addToOutput(`Exécution terminée (${result.executionTime}ms)`, 'info');
      } else {
        addToOutput(`Erreur: ${response.data.message}`, 'error');
      }
    } catch (error) {
      addToOutput(`Erreur: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setLoading(false);
      setCommand('');
      fetchAllLogs(); // Actualiser les logs
    }
  };

  const addToOutput = (text, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    setOutput(prev => [...prev, {
      id: Date.now(),
      timestamp,
      text,
      type
    }]);
  };

  const clearOutput = () => {
    setOutput([]);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const quickCommands = [
    { label: 'ls -la', command: 'ls -la' },
    { label: 'ps aux', command: 'ps aux | grep node' },
    { label: 'disk usage', command: 'df -h' },
    { label: 'memory', command: 'free -h' },
    { label: 'uptime', command: 'uptime' },
    { label: 'git status', command: 'git status' },
    { label: 'git pull', command: 'git pull' },
    { label: 'npm install', command: 'npm install' }
  ];

  return (
    <div className="console-panel">
      <div className="console-header">
        <h3>💻 Console de commandes</h3>
        <div className="console-controls">
          <label className="auto-refresh">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button onClick={fetchAllLogs} title="Actualiser">
            🔄
          </button>
          <button onClick={onClose} title="Fermer">
            ✕
          </button>
        </div>
      </div>

      <div className="console-content">
        <div className="console-left">
          <div className="command-form">
            <div className="form-group">
              <label>Projet:</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                required
              >
                <option value="">Sélectionner un projet</option>
                {projects.map(project => (
                  <option key={project._id} value={project._id}>
                    {project.icon} {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="command-input-group">
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !loading && executeCommand()}
                placeholder="Entrez votre commande..."
                disabled={loading || !selectedProject}
                className="command-input"
              />
              <button
                onClick={executeCommand}
                disabled={loading || !command.trim() || !selectedProject}
                className="execute-button"
              >
                {loading ? '⏳' : '▶️'}
              </button>
            </div>

            <div className="quick-commands">
              <h4>Commandes rapides:</h4>
              <div className="quick-buttons">
                {quickCommands.map((cmd, index) => (
                  <button
                    key={index}
                    className="quick-command"
                    onClick={() => setCommand(cmd.command)}
                    disabled={!selectedProject}
                  >
                    {cmd.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="output-section">
            <div className="output-header">
              <h4>Sortie de la console</h4>
              <button onClick={clearOutput} className="clear-button">
                🗑️ Effacer
              </button>
            </div>
            <div className="output-content" ref={outputRef}>
              {output.length === 0 ? (
                <div className="output-empty">
                  Console vide. Exécutez une commande pour voir la sortie.
                </div>
              ) : (
                output.map(item => (
                  <div key={item.id} className={`output-line ${item.type}`}>
                    <span className="output-time">[{item.timestamp}]</span>
                    <span className="output-text">{item.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="console-right">
          <div className="logs-section">
            <div className="logs-header">
              <h4>📋 Logs système récents</h4>
              <span className="logs-count">({allLogs.length})</span>
            </div>
            <div className="logs-content">
              {allLogs.length === 0 ? (
                <div className="logs-empty">Aucun log récent</div>
              ) : (
                allLogs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`log-entry ${log.error ? 'error' : 'success'}`}
                  >
                    <div className="log-header">
                      <span className="log-time">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <span className="log-project">
                        {log.projectId?.name || 'Console'}
                      </span>
                      <span className={`log-status ${log.exitCode === 0 ? 'success' : 'error'}`}>
                        {log.exitCode === 0 ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="log-command">
                      <code>{log.command}</code>
                    </div>
                    {log.error && (
                      <div className="log-error">
                        {log.error.slice(0, 200)}
                        {log.error.length > 200 && '...'}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsolePanel;
