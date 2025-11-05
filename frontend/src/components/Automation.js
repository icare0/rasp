import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Plus,
  Zap,
  Workflow as WorkflowIcon,
  Layers,
  RefreshCw,
  Settings,
  Trash2,
  Edit,
  Check,
  X,
  Server
} from 'lucide-react';
import { api } from '../services/api';
import '../styles/Dashboard.css';

const Automation = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('quick-actions');
  const [devices, setDevices] = useState([]);
  const [quickActions, setQuickActions] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [devicesRes, actionsRes, workflowsRes, templatesRes] = await Promise.all([
        api.getDevices(),
        api.getQuickActions(),
        api.getWorkflows(),
        api.getWorkflowTemplates()
      ]);

      setDevices(devicesRes.data.data);
      setQuickActions(actionsRes.data.data);
      setWorkflows(workflowsRes.data.data);
      setTemplates(templatesRes.data.data);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteQuickAction = async (action) => {
    if (!action.requiresConfirmation || window.confirm(action.confirmationMessage)) {
      setPendingAction({ type: 'quick-action', action });
      setShowDeviceSelector(true);
    }
  };

  const handleExecuteWorkflow = async (workflow) => {
    setPendingAction({ type: 'workflow', workflow });
    setShowDeviceSelector(true);
  };

  const handleConfirmExecution = async () => {
    if (selectedDevices.length === 0) {
      alert('Sélectionnez au moins une Raspberry Pi');
      return;
    }

    setExecuting(true);
    try {
      if (pendingAction.type === 'quick-action') {
        await api.executeQuickAction(pendingAction.action._id, selectedDevices);
        alert('✅ Action envoyée aux appareils !');
      } else if (pendingAction.type === 'workflow') {
        await api.executeWorkflow(pendingAction.workflow._id, selectedDevices);
        alert('✅ Workflow lancé sur les appareils !');
      }
    } catch (error) {
      alert('❌ Erreur lors de l\'exécution');
      console.error(error);
    } finally {
      setExecuting(false);
      setShowDeviceSelector(false);
      setPendingAction(null);
      setSelectedDevices([]);
    }
  };

  const handleCreateWorkflowFromTemplate = async (template) => {
    try {
      await api.createWorkflow(template);
      alert('✅ Workflow créé !');
      loadData();
      setActiveTab('workflows');
    } catch (error) {
      alert('❌ Erreur lors de la création');
    }
  };

  const toggleDeviceSelection = (deviceId) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const selectAllDevices = () => {
    const onlineDevices = devices.filter(d => d.isOnline).map(d => d._id);
    setSelectedDevices(onlineDevices);
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
              <Zap size={24} style={{ color: 'var(--primary)' }} />
              Automatisation
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
            className={`btn ${activeTab === 'quick-actions' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('quick-actions')}
          >
            <Zap size={16} />
            Actions Rapides
          </button>
          <button
            className={`btn ${activeTab === 'workflows' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('workflows')}
          >
            <WorkflowIcon size={16} />
            Workflows
          </button>
          <button
            className={`btn ${activeTab === 'templates' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('templates')}
          >
            <Layers size={16} />
            Templates
          </button>
        </div>

        {/* Quick Actions */}
        {activeTab === 'quick-actions' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h2 className="section-title">Actions Rapides</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Exécutez des commandes rapides sur vos Raspberry Pi en un clic
              </p>
            </div>

            {quickActions.length === 0 ? (
              <div className="empty-state">
                <Zap size={64} style={{ opacity: 0.5 }} />
                <h3 className="empty-state-title">Aucune action rapide</h3>
                <p className="empty-state-description">
                  Créez des actions rapides depuis les presets ci-dessous
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                {quickActions.map(action => (
                  <QuickActionCard
                    key={action._id}
                    action={action}
                    onExecute={() => handleExecuteQuickAction(action)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Workflows */}
        {activeTab === 'workflows' && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2rem'
            }}>
              <div>
                <h2 className="section-title">Workflows</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Automatisez des séquences de commandes complexes
                </p>
              </div>
            </div>

            {workflows.length === 0 ? (
              <div className="empty-state">
                <WorkflowIcon size={64} style={{ opacity: 0.5 }} />
                <h3 className="empty-state-title">Aucun workflow</h3>
                <p className="empty-state-description">
                  Créez un workflow depuis un template ou créez-en un personnalisé
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {workflows.map(workflow => (
                  <WorkflowCard
                    key={workflow._id}
                    workflow={workflow}
                    onExecute={() => handleExecuteWorkflow(workflow)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Templates */}
        {activeTab === 'templates' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h2 className="section-title">Templates de Workflows</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Utilisez ces templates prêts à l'emploi pour déployer vos projets
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {templates.map((template, index) => (
                <TemplateCard
                  key={index}
                  template={template}
                  onCreate={() => handleCreateWorkflowFromTemplate(template)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Device Selector Modal */}
      {showDeviceSelector && (
        <DeviceSelectorModal
          devices={devices}
          selectedDevices={selectedDevices}
          onToggle={toggleDeviceSelection}
          onSelectAll={selectAllDevices}
          onConfirm={handleConfirmExecution}
          onCancel={() => {
            setShowDeviceSelector(false);
            setPendingAction(null);
            setSelectedDevices([]);
          }}
          executing={executing}
          action={pendingAction}
        />
      )}
    </div>
  );
};

// Quick Action Card
const QuickActionCard = ({ action, onExecute }) => {
  const colorMap = {
    blue: '#3b82f6',
    green: '#10b981',
    yellow: '#f59e0b',
    red: '#ef4444',
    purple: '#8b5cf6',
    pink: '#ec4899'
  };

  return (
    <button
      onClick={onExecute}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius)',
        padding: '1.5rem',
        cursor: 'pointer',
        transition: 'all var(--transition-normal)',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = colorMap[action.color];
        e.currentTarget.style.boxShadow = `0 0 20px ${colorMap[action.color]}40`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border-color)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{
        fontSize: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '50px',
        height: '50px',
        borderRadius: '10px',
        background: `${colorMap[action.color]}20`,
        color: colorMap[action.color]
      }}>
        {action.icon}
      </div>
      <div>
        <div style={{
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '0.25rem'
        }}>
          {action.name}
        </div>
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          {action.description}
        </div>
      </div>
      {action.usageCount > 0 && (
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}>
          <Play size={12} />
          {action.usageCount} fois
        </div>
      )}
    </button>
  );
};

// Workflow Card
const WorkflowCard = ({ workflow, onExecute }) => {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--border-radius)',
      padding: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1.5rem',
      transition: 'all var(--transition-normal)'
    }}>
      <div style={{
        fontSize: '2rem',
        width: '60px',
        height: '60px',
        borderRadius: '12px',
        background: 'rgba(99, 102, 241, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {workflow.icon}
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '0.25rem'
        }}>
          {workflow.name}
        </h3>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          marginBottom: '0.75rem'
        }}>
          {workflow.description}
        </p>
        <div style={{
          display: 'flex',
          gap: '1rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          <span>{workflow.steps.length} étapes</span>
          {workflow.runCount > 0 && <span>• Exécuté {workflow.runCount} fois</span>}
          {workflow.successRate < 100 && (
            <span>• Taux de succès: {workflow.successRate}%</span>
          )}
        </div>
      </div>
      <button className="btn btn-primary" onClick={onExecute}>
        <Play size={16} />
        Exécuter
      </button>
    </div>
  );
};

// Template Card
const TemplateCard = ({ template, onCreate }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--border-radius)',
      padding: '1.5rem',
      transition: 'all var(--transition-normal)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{
          fontSize: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '12px',
          background: 'rgba(139, 92, 246, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {template.icon}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '0.25rem'
          }}>
            {template.name}
          </h3>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--text-muted)'
          }}>
            {template.description}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? '▼' : '▶'}
        </button>
        <button className="btn btn-primary" onClick={onCreate}>
          <Plus size={16} />
          Créer
        </button>
      </div>

      {expanded && (
        <div style={{
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-color)'
        }}>
          <h4 style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '0.75rem'
          }}>
            Étapes:
          </h4>
          {template.steps.map((step, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: '1rem',
                padding: '0.75rem',
                marginBottom: '0.5rem',
                background: 'var(--bg-tertiary)',
                borderRadius: '8px'
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                flexShrink: 0
              }}>
                {index + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  marginBottom: '0.25rem'
                }}>
                  {step.name}
                </div>
                <code style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}>
                  {step.command}
                </code>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Device Selector Modal
const DeviceSelectorModal = ({
  devices,
  selectedDevices,
  onToggle,
  onSelectAll,
  onConfirm,
  onCancel,
  executing,
  action
}) => {
  const onlineDevices = devices.filter(d => d.isOnline);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--border-radius)',
        padding: '2rem',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          marginBottom: '1rem',
          color: 'var(--text-primary)'
        }}>
          Sélectionner les Raspberry Pi
        </h2>

        {action && (
          <div style={{
            background: 'var(--bg-tertiary)',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              {action.type === 'quick-action' ? action.action.icon : action.workflow.icon}
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {action.type === 'quick-action' ? action.action.name : action.workflow.name}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={onSelectAll} style={{ width: '100%' }}>
            Sélectionner tous ({onlineDevices.length})
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {onlineDevices.map(device => (
            <label
              key={device._id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                background: selectedDevices.includes(device._id) ? 'var(--primary)20' : 'var(--bg-tertiary)',
                border: `2px solid ${selectedDevices.includes(device._id) ? 'var(--primary)' : 'transparent'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              <input
                type="checkbox"
                checked={selectedDevices.includes(device._id)}
                onChange={() => onToggle(device._id)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <Server size={20} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {device.deviceName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {device.machineId}
                </div>
              </div>
              <div className="device-status-badge online">
                <span className="status-dot"></span>
                En ligne
              </div>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={executing}
            style={{ flex: 1 }}
          >
            <X size={16} />
            Annuler
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={executing || selectedDevices.length === 0}
            style={{ flex: 1 }}
          >
            {executing ? (
              <>
                <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                Exécution...
              </>
            ) : (
              <>
                <Check size={16} />
                Exécuter
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Automation;
