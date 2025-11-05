import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Server,
  Key,
  Copy,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Settings as SettingsIcon,
  User,
  Shield,
  Download
} from 'lucide-react';
import { api } from '../services/api';
import '../styles/Dashboard.css';

const Settings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('devices');
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDevice, setNewDevice] = useState({
    deviceName: '',
    machineId: '',
    notes: '',
    tags: []
  });
  const [copiedKey, setCopiedKey] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  // Ouvrir automatiquement le formulaire si aucun appareil
  useEffect(() => {
    if (!loading && devices.length === 0 && user?.role === 'admin') {
      setShowAddDevice(true);
    }
  }, [loading, devices.length, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [devicesRes, userRes] = await Promise.all([
        api.getDevices(),
        api.getProfile()
      ]);
      setDevices(devicesRes.data.data);
      setUser(userRes.data.user);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    try {
      const response = await api.createDevice(newDevice);
      if (response.data.success) {
        alert('✅ Appareil créé avec succès! Copiez la clé API maintenant, elle ne sera plus affichée.');
        await loadData();
        setShowAddDevice(false);
        setNewDevice({ deviceName: '', machineId: '', notes: '', tags: [] });

        // Auto-copier la clé API
        copyToClipboard(response.data.data.apiKey, response.data.data._id);
      }
    } catch (error) {
      alert('❌ Erreur lors de la création: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRegenerateKey = async (deviceId) => {
    if (!window.confirm('⚠️ Attention! Régénérer la clé API déconnectera l\'agent actuel. Êtes-vous sûr?')) {
      return;
    }

    try {
      const response = await api.regenerateApiKey(deviceId);
      if (response.data.success) {
        alert('✅ Nouvelle clé API générée! Copiez-la maintenant.');
        await loadData();
        copyToClipboard(response.data.data.apiKey, deviceId);
      }
    } catch (error) {
      alert('❌ Erreur: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet appareil?')) {
      return;
    }

    try {
      await api.deleteDevice(deviceId);
      alert('✅ Appareil supprimé');
      await loadData();
    } catch (error) {
      alert('❌ Erreur: ' + (error.response?.data?.message || error.message));
    }
  };

  const copyToClipboard = (text, deviceId) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(deviceId);
    setTimeout(() => setCopiedKey(null), 3000);
  };

  const downloadInstallScript = (device) => {
    const script = `#!/bin/bash
# Script d'installation de l'agent Raspberry Pi Manager
# Appareil: ${device.deviceName}

echo "🚀 Installation de l'agent Raspberry Pi Manager..."

# Télécharger l'agent
git clone https://github.com/votre-repo/rasp.git
cd rasp/raspberry-agent

# Installer les dépendances
npm install

# Configurer l'agent
cat > .env << EOF
API_KEY=${device.apiKey}
SERVER_URL=http://votre-serveur:5000
DEVICE_NAME=${device.deviceName}
MACHINE_ID=${device.machineId}
EOF

# Installer le service
sudo npm run install-service

echo "✅ Installation terminée!"
echo "L'agent va démarrer automatiquement au prochain redémarrage."
echo "Pour démarrer maintenant: sudo systemctl start raspberry-manager"
`;

    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `install-${device.machineId}.sh`;
    a.click();
    URL.revokeObjectURL(url);
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

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={16} />
            </button>
            <h1 className="dashboard-title" style={{ fontSize: '1.25rem' }}>
              <SettingsIcon size={24} style={{ color: 'var(--primary)' }} />
              Paramètres
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={loadData}>
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          borderBottom: '1px solid var(--border-color)',
          padding: '0 0 1rem 0'
        }}>
          <button
            className={`btn ${activeTab === 'devices' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('devices')}
          >
            <Server size={16} />
            Appareils & Tokens
          </button>
          <button
            className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={16} />
            Profil
          </button>
        </div>

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2rem'
            }}>
              <div>
                <h2 className="section-title">Gestion des Appareils</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Créez des tokens API pour connecter vos Raspberry Pi
                </p>
              </div>
              {user?.role === 'admin' && (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddDevice(true)}
                >
                  <Plus size={16} />
                  Ajouter un appareil
                </button>
              )}
            </div>

            {/* Add Device Modal */}
            {showAddDevice && (
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                padding: '2rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    Nouvel Appareil
                  </h3>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowAddDevice(false)}
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleAddDevice}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        marginBottom: '0.5rem',
                        color: 'var(--text-secondary)'
                      }}>
                        Nom de l'appareil *
                      </label>
                      <input
                        type="text"
                        required
                        value={newDevice.deviceName}
                        onChange={(e) => setNewDevice({ ...newDevice, deviceName: e.target.value })}
                        placeholder="Mon Raspberry Pi"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        marginBottom: '0.5rem',
                        color: 'var(--text-secondary)'
                      }}>
                        ID Machine (optionnel)
                      </label>
                      <input
                        type="text"
                        value={newDevice.machineId}
                        onChange={(e) => setNewDevice({ ...newDevice, machineId: e.target.value })}
                        placeholder="rasp-pi-001"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        marginBottom: '0.5rem',
                        color: 'var(--text-secondary)'
                      }}>
                        Notes
                      </label>
                      <textarea
                        value={newDevice.notes}
                        onChange={(e) => setNewDevice({ ...newDevice, notes: e.target.value })}
                        placeholder="Description de l'appareil..."
                        rows="3"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '0.875rem',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setShowAddDevice(false)}
                      >
                        Annuler
                      </button>
                      <button type="submit" className="btn btn-primary">
                        <Plus size={16} />
                        Créer l'appareil
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Devices List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {devices.map(device => (
                <DeviceTokenCard
                  key={device._id}
                  device={device}
                  onRegenerateKey={() => handleRegenerateKey(device._id)}
                  onDelete={() => handleDeleteDevice(device._id)}
                  onCopyKey={(key) => copyToClipboard(key, device._id)}
                  onDownloadScript={() => downloadInstallScript(device)}
                  copiedKey={copiedKey}
                  isAdmin={user?.role === 'admin'}
                />
              ))}
            </div>

            {devices.length === 0 && (
              <div className="empty-state">
                <Server size={64} style={{ opacity: 0.5 }} />
                <h3 className="empty-state-title">Aucun appareil</h3>
                <p className="empty-state-description">
                  Créez votre premier appareil pour obtenir un token API
                </p>
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div>
            <h2 className="section-title" style={{ marginBottom: '2rem' }}>
              Informations du Profil
            </h2>

            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '2rem'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: 'white'
                  }}>
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      {user?.username}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {user?.email}
                    </p>
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <Shield size={20} style={{ color: 'var(--primary)' }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Rôle
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Device Token Card Component
const DeviceTokenCard = ({
  device,
  onRegenerateKey,
  onDelete,
  onCopyKey,
  onDownloadScript,
  copiedKey,
  isAdmin
}) => {
  const [showKey, setShowKey] = useState(false);

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--border-radius)',
      padding: '1.5rem',
      transition: 'all var(--transition-normal)'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: device.isOnline ? 'var(--success-bg)' : 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: device.isOnline ? 'var(--success)' : 'var(--text-muted)'
            }}>
              <Server size={24} />
            </div>
            <div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '0.25rem'
              }}>
                {device.deviceName}
              </h3>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                fontFamily: 'monospace'
              }}>
                {device.machineId}
              </div>
            </div>
          </div>

          {device.notes && (
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              marginBottom: '1rem'
            }}>
              {device.notes}
            </p>
          )}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div className={`device-status-badge ${device.isOnline ? 'online' : 'offline'}`}>
              <span className="status-dot"></span>
              {device.isOnline ? 'En ligne' : 'Hors ligne'}
            </div>
            {device.lastSeen && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Dernière connexion: {new Date(device.lastSeen).toLocaleString('fr-FR')}
              </div>
            )}
          </div>

          {/* API Key Section */}
          <div style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '1rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-secondary)'
              }}>
                <Key size={16} />
                Clé API
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowKey(!showKey)}
                style={{ padding: '0.25rem 0.5rem' }}
              >
                {showKey ? 'Masquer' : 'Afficher'}
              </button>
            </div>

            <div style={{
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              color: 'var(--text-primary)',
              wordBreak: 'break-all',
              padding: '0.75rem',
              background: 'var(--bg-primary)',
              borderRadius: '6px',
              marginBottom: '0.75rem'
            }}>
              {showKey ? device.apiKey : '••••••••••••••••••••••••••••••••'}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onCopyKey(device.apiKey)}
                disabled={copiedKey === device._id}
              >
                {copiedKey === device._id ? (
                  <>
                    <Check size={14} />
                    Copié!
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copier
                  </>
                )}
              </button>

              <button
                className="btn btn-ghost btn-sm"
                onClick={onDownloadScript}
              >
                <Download size={14} />
                Script d'installation
              </button>

              {isAdmin && (
                <>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={onRegenerateKey}
                    style={{ color: 'var(--warning)' }}
                  >
                    <RefreshCw size={14} />
                    Régénérer
                  </button>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={onDelete}
                    style={{ color: 'var(--error)' }}
                  >
                    <Trash2 size={14} />
                    Supprimer
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
