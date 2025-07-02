import React, { useState, useEffect, useCallback } from 'react';
import ProjectCard from './ProjectCard';
import ConsolePanel from './ConsolePanel';
import UserManagement from './UserManagement';
import { api } from '../services/api';

const Dashboard = ({ user }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showConsole, setShowConsole] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Formulaire pour nouveau projet
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    directory: '',
    commands: {
      start: '',
      stop: '',
      restart: '',
      status: ''
    },
    category: 'other',
    icon: '🖥️',
    autoStart: false
  });

  const categories = [
    { id: 'all', name: 'Tous', icon: '📋' },
    { id: 'bot', name: 'Bots', icon: '🤖' },
    { id: 'website', name: 'Sites Web', icon: '🌐' },
    { id: 'script', name: 'Scripts', icon: '📜' },
    { id: 'service', name: 'Services', icon: '⚙️' },
    { id: 'other', name: 'Autres', icon: '📦' }
  ];

  useEffect(() => {
    fetchProjects();
    
    // Actualiser automatiquement toutes les 30 secondes
    const interval = setInterval(fetchProjects, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await api.getProjects();
      if (response.data.success) {
        setProjects(response.data.projects);
        setError('');
      } else {
        setError('Erreur lors du chargement des projets');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleProjectAction = async (projectId, action) => {
    try {
      let response;
      
      switch (action) {
        case 'start':
          response = await api.startProject(projectId);
          break;
        case 'stop':
          response = await api.stopProject(projectId);
          break;
        case 'restart':
          response = await api.restartProject(projectId);
          break;
        default:
          throw new Error('Action non reconnue');
      }

      if (response.data.success) {
        // Actualiser la liste des projets
        await fetchProjects();
        
        // Notification de succès (optionnel)
        console.log(`${action} réussi pour le projet ${projectId}`);
      } else {
        alert(`Erreur: ${response.data.message}`);
      }
    } catch (error) {
      console.error(`Erreur ${action}:`, error);
      alert(`Erreur lors de l'${action}: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    
    if (!newProject.name || !newProject.directory || !newProject.commands.start) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const response = await api.createProject(newProject);
      if (response.data.success) {
        setProjects(prev => [...prev, response.data.project]);
        setShowAddProject(false);
        setNewProject({
          name: '',
          description: '',
          directory: '',
          commands: { start: '', stop: '', restart: '', status: '' },
          category: 'other',
          icon: '🖥️',
          autoStart: false
        });
      } else {
        alert(`Erreur: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Erreur création projet:', error);
      alert(`Erreur: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
      return;
    }

    try {
      const response = await api.deleteProject(projectId);
      if (response.data.success) {
        setProjects(prev => prev.filter(p => p._id !== projectId));
      } else {
        alert(`Erreur: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert(`Erreur: ${error.response?.data?.message || error.message}`);
    }
  };

  const filteredProjects = selectedCategory === 'all' 
    ? projects 
    : projects.filter(project => project.category === selectedCategory);

  const runningProjects = projects.filter(p => p.isRunning).length;
  const totalProjects = projects.length;

  if (loading && !refreshing) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des projets...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>📊 Tableau de bord</h2>
          <div className="dashboard-stats">
            <span className="stat-item">
              <span className="stat-value">{runningProjects}</span>
              <span className="stat-label">En cours</span>
            </span>
            <span className="stat-divider">•</span>
            <span className="stat-item">
              <span className="stat-value">{totalProjects}</span>
              <span className="stat-label">Total</span>
            </span>
          </div>
        </div>

        <div className="dashboard-actions">
          <button
            className="refresh-button"
            onClick={fetchProjects}
            disabled={refreshing}
            title="Actualiser"
          >
            <span className={refreshing ? 'spinning' : ''}>🔄</span>
          </button>

          <button
            className="console-button"
            onClick={() => setShowConsole(!showConsole)}
            title="Console"
          >
            💻 Console
          </button>

          {user?.role === 'admin' && (
            <>
              <button
                className="user-management-button"
                onClick={() => setShowUserManagement(!showUserManagement)}
                title="Gestion des utilisateurs"
              >
                👥 Utilisateurs
              </button>

              <button
                className="add-project-button"
                onClick={() => setShowAddProject(!showAddProject)}
                title="Ajouter un projet"
              >
                ➕ Nouveau projet
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filtres par catégorie */}
      <div className="category-filters">
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-filter ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.id)}
          >
            <span className="category-icon">{category.icon}</span>
            <span className="category-name">{category.name}</span>
            <span className="category-count">
              {category.id === 'all' 
                ? totalProjects 
                : projects.filter(p => p.category === category.id).length
              }
            </span>
          </button>
        ))}
      </div>

      {/* Formulaire nouveau projet */}
      {showAddProject && user?.role === 'admin' && (
        <div className="add-project-form">
          <div className="form-header">
            <h3>➕ Nouveau projet</h3>
            <button 
              className="close-button"
              onClick={() => setShowAddProject(false)}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleAddProject}>
            <div className="form-row">
              <div className="form-group">
                <label>Nom du projet *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Mon Bot Discord"
                  required
                />
              </div>

              <div className="form-group">
                <label>Catégorie</label>
                <select
                  value={newProject.category}
                  onChange={(e) => setNewProject(prev => ({ ...prev, category: e.target.value }))}
                >
                  {categories.slice(1).map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Icône</label>
                <input
                  type="text"
                  value={newProject.icon}
                  onChange={(e) => setNewProject(prev => ({ ...prev, icon: e.target.value }))}
                  placeholder="🤖"
                  maxLength="2"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newProject.description}
                onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description du projet..."
                rows="2"
              />
            </div>

            <div className="form-group">
              <label>Répertoire *</label>
              <input
                type="text"
                value={newProject.directory}
                onChange={(e) => setNewProject(prev => ({ ...prev, directory: e.target.value }))}
                placeholder="/home/pi/projects/mon-bot"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Commande de démarrage *</label>
                <input
                  type="text"
                  value={newProject.commands.start}
                  onChange={(e) => setNewProject(prev => ({ 
                    ...prev, 
                    commands: { ...prev.commands, start: e.target.value }
                  }))}
                  placeholder="npm start"
                  required
                />
              </div>

              <div className="form-group">
                <label>Commande d'arrêt</label>
                <input
                  type="text"
                  value={newProject.commands.stop}
                  onChange={(e) => setNewProject(prev => ({ 
                    ...prev, 
                    commands: { ...prev.commands, stop: e.target.value }
                  }))}
                  placeholder="npm stop"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => setShowAddProject(false)}>
                Annuler
              </button>
              <button type="submit" className="primary">
                Créer le projet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Messages d'erreur */}
      {error && (
        <div className="error-banner">
          ⚠️ {error}
          <button onClick={fetchProjects}>Réessayer</button>
        </div>
      )}

      {/* Liste des projets */}
      <div className="projects-grid">
        {filteredProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>Aucun projet</h3>
            <p>
              {selectedCategory === 'all' 
                ? "Aucun projet configuré pour le moment."
                : `Aucun projet dans la catégorie "${categories.find(c => c.id === selectedCategory)?.name}".`
              }
            </p>
            {user?.role === 'admin' && selectedCategory === 'all' && (
              <button 
                className="add-first-project"
                onClick={() => setShowAddProject(true)}
              >
                ➕ Créer le premier projet
              </button>
            )}
          </div>
        ) : (
          filteredProjects.map(project => (
            <ProjectCard
              key={project._id}
              project={project}
              onAction={handleProjectAction}
              onDelete={user?.role === 'admin' ? handleDeleteProject : null}
              canManage={user?.role === 'admin'}
            />
          ))
        )}
      </div>

      {/* Panneau console */}
      {showConsole && (
        <ConsolePanel
          projects={projects}
          onClose={() => setShowConsole(false)}
        />
      )}

      {/* Gestion des utilisateurs */}
      {showUserManagement && user?.role === 'admin' && (
        <UserManagement
          user={user}
          onClose={() => setShowUserManagement(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
