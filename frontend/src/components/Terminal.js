import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Trash2, Terminal as TerminalIcon } from 'lucide-react';
import { api } from '../services/api';

const Terminal = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const terminalRef = useRef(null);

  useEffect(() => {
    loadDevice();
  }, [id]);

  useEffect(() => {
    // Auto-scroll vers le bas
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const loadDevice = async () => {
    try {
      const res = await api.getDevice(id);
      setDevice(res.data.data);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'appareil:', error);
    }
  };

  const handleExecute = async (e) => {
    e.preventDefault();
    if (!command.trim() || loading) return;

    const cmdToExecute = command.trim();
    setCommand('');
    setLoading(true);

    // Ajouter la commande à l'historique
    const entry = {
      id: Date.now(),
      command: cmdToExecute,
      output: null,
      error: null,
      loading: true,
      timestamp: new Date()
    };

    setHistory(prev => [...prev, entry]);

    try {
      // Note: Cette fonctionnalité nécessite que le serveur
      // puisse envoyer des commandes aux agents Raspberry Pi
      // Pour l'instant, on utilise l'API existante
      const res = await api.executeCommand(cmdToExecute, '/home/pi', null);

      setHistory(prev =>
        prev.map(item =>
          item.id === entry.id
            ? {
                ...item,
                output: res.data.output,
                error: res.data.error,
                loading: false,
                exitCode: res.data.exitCode
              }
            : item
        )
      );
    } catch (error) {
      setHistory(prev =>
        prev.map(item =>
          item.id === entry.id
            ? {
                ...item,
                error: error.response?.data?.message || 'Erreur lors de l\'exécution',
                loading: false
              }
            : item
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setHistory([]);
  };

  if (!device) {
    return (
      <div className="dashboard-container">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh'
        }}>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/devices/${id}`)}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="dashboard-title" style={{ fontSize: '1.25rem' }}>
                <TerminalIcon size={20} />
                Terminal - {device.deviceName}
              </h1>
            </div>
          </div>
          <div>
            <button className="btn btn-ghost btn-sm" onClick={handleClear}>
              <Trash2 size={16} />
              Effacer
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main" style={{ padding: 0, height: 'calc(100vh - 80px)' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: '#0f0f0f',
          fontFamily: '"Courier New", monospace'
        }}>
          {/* Zone d'affichage */}
          <div
            ref={terminalRef}
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '1.5rem',
              color: '#0f0',
              fontSize: '0.875rem',
              lineHeight: 1.5
            }}
          >
            <div style={{ marginBottom: '1rem', color: '#888' }}>
              Terminal Web - {device.deviceName} ({device.machineId})
              <br />
              Tapez vos commandes ci-dessous. Attention: certaines commandes peuvent être restreintes.
              <br />
              <br />
            </div>

            {history.map((entry) => (
              <div key={entry.id} style={{ marginBottom: '1rem' }}>
                <div style={{ color: '#0ff' }}>
                  <span style={{ color: '#0f0' }}>$</span> {entry.command}
                </div>
                {entry.loading ? (
                  <div style={{ color: '#888', marginTop: '0.5rem' }}>
                    Exécution...
                  </div>
                ) : (
                  <>
                    {entry.output && (
                      <pre style={{
                        marginTop: '0.5rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: '#0f0'
                      }}>
                        {entry.output}
                      </pre>
                    )}
                    {entry.error && (
                      <pre style={{
                        marginTop: '0.5rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: '#f00'
                      }}>
                        {entry.error}
                      </pre>
                    )}
                    {entry.exitCode !== undefined && entry.exitCode !== 0 && (
                      <div style={{ color: '#f80', marginTop: '0.5rem' }}>
                        Code de sortie: {entry.exitCode}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Zone de saisie */}
          <form
            onSubmit={handleExecute}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem',
              background: '#1a1a1a',
              borderTop: '1px solid #333'
            }}
          >
            <span style={{ color: '#0f0' }}>$</span>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Entrez une commande..."
              disabled={loading}
              autoFocus
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#0ff',
                fontSize: '0.875rem',
                fontFamily: 'inherit'
              }}
            />
            <button
              type="submit"
              className="btn btn-success btn-sm"
              disabled={loading || !command.trim()}
            >
              <Send size={16} />
              Exécuter
            </button>
          </form>

          {/* Avertissement */}
          {!device.isOnline && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(239, 68, 68, 0.9)',
              color: 'white',
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center',
              maxWidth: '400px'
            }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Appareil hors ligne</h3>
              <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                L'appareil doit être en ligne pour utiliser le terminal
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Terminal;
