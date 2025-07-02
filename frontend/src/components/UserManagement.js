import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const UserManagement = ({ user: currentUser, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [stats, setStats] = useState(null);

  // Formulaire nouvel utilisateur
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });

  // Formulaire changement de mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      if (response.data.success) {
        setUsers(response.data.users);
        setError('');
      }
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/users/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (!newUser.username || !newUser.email || !newUser.password) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    if (newUser.password.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      const response = await api.post('/users', newUser);
      if (response.data.success) {
        setUsers(prev => [response.data.user, ...prev]);
        setNewUser({ username: '', email: '', password: '', role: 'user' });
        setShowAddUser(false);
        fetchStats();
        alert('Utilisateur créé avec succès !');
      }
    } catch (error) {
      console.error('Erreur création utilisateur:', error);
      alert(error.response?.data?.message || 'Erreur lors de la création');
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      const response = await api.put(`/users/${userId}`, updates);
      if (response.data.success) {
        setUsers(prev => prev.map(user => 
          user._id === userId ? response.data.user : user
        ));
        setEditingUser(null);
        fetchStats();
        alert('Utilisateur mis à jour avec succès !');
      }
    } catch (error) {
      console.error('Erreur mise à jour utilisateur:', error);
      alert(error.response?.data?.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${username}" ?`)) {
      return;
    }

    try {
      const response = await api.delete(`/users/${userId}`);
      if (response.data.success) {
        setUsers(prev => prev.filter(user => user._id !== userId));
        fetchStats();
        alert('Utilisateur supprimé avec succès !');
      }
    } catch (error) {
      console.error('Erreur suppression utilisateur:', error);
      alert(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      const response = await api.put(`/users/${showPasswordModal}/password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data.success) {
        setShowPasswordModal(null);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        alert('Mot de passe modifié avec succès !');
      }
    } catch (error) {
      console.error('Erreur changement mot de passe:', error);
      alert(error.response?.data?.message || 'Erreur lors du changement');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (role) => {
    return role === 'admin' ? '#ef4444' : '#6b7280';
  };

  const getStatusColor = (isActive) => {
    return isActive ? '#10b981' : '#6b7280';
  };

  if (loading) {
    return (
      <div className="user-management-overlay">
        <div className="user-management-modal">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Chargement des utilisateurs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-overlay">
      <div className="user-management-modal">
        <div className="user-management-header">
          <h2>👥 Gestion des utilisateurs</h2>
          <button 
            className="close-button"
            onClick={onClose}
            title="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Statistiques */}
        {stats && (
          <div className="user-stats">
            <div className="stat-card">
              <span className="stat-number">{stats.totalUsers}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.activeUsers}</span>
              <span className="stat-label">Actifs</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.adminUsers}</span>
              <span className="stat-label">Admins</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.recentUsers}</span>
              <span className="stat-label">Récents (30j)</span>
            </div>
          </div>
        )}

        <div className="user-management-actions">
          <button
            className="add-user-button"
            onClick={() => setShowAddUser(!showAddUser)}
          >
            ➕ Nouvel utilisateur
          </button>
          <button
            className="refresh-button"  
            onClick={fetchUsers}
          >
            🔄 Actualiser
          </button>
        </div>

        {/* Formulaire ajout utilisateur */}
        {showAddUser && (
          <div className="add-user-form">
            <h3>➕ Créer un utilisateur</h3>
            <form onSubmit={handleAddUser}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nom d'utilisateur *</label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="johnsmith"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Mot de passe *</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                    minLength="6"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Rôle</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="user">👤 Utilisateur</option>
                    <option value="admin">👑 Administrateur</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowAddUser(false)}>
                  Annuler
                </button>
                <button type="submit" className="primary">
                  Créer l'utilisateur
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Messages d'erreur */}
        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        {/* Liste des utilisateurs */}
        <div className="users-list">
          {users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>Aucun utilisateur</h3>
              <p>Créez le premier utilisateur pour commencer.</p>
            </div>
          ) : (
            <div className="users-table">
              <div className="table-header">
                <span>Utilisateur</span>
                <span>Rôle</span>
                <span>Statut</span>
                <span>Dernière connexion</span>
                <span>Actions</span>
              </div>
              
              {users.map(user => (
                <div key={user._id} className="table-row">
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                      <span className="username">{user.username}</span>
                      <span className="email">{user.email}</span>
                    </div>
                  </div>
                  
                  <div className="user-role">
                    {editingUser === user._id ? (
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateUser(user._id, { ...user, role: e.target.value })}
                      >
                        <option value="user">👤 Utilisateur</option>
                        <option value="admin">👑 Admin</option>
                      </select>
                    ) : (
                      <span 
                        className="role-badge"
                        style={{ backgroundColor: getRoleColor(user.role) }}
                      >
                        {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                      </span>
                    )}
                  </div>

                  <div className="user-status">
                    {editingUser === user._id ? (
                      <label className="status-toggle">
                        <input
                          type="checkbox"
                          checked={user.isActive}
                          onChange={(e) => handleUpdateUser(user._id, { ...user, isActive: e.target.checked })}
                        />
                        <span>{user.isActive ? 'Actif' : 'Inactif'}</span>
                      </label>
                    ) : (
                      <span 
                        className="status-badge"
                        style={{ color: getStatusColor(user.isActive) }}
                      >
                        ● {user.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    )}
                  </div>

                  <div className="user-last-login">
                    {user.lastLogin ? formatDate(user.lastLogin) : 'Jamais'}
                  </div>

                  <div className="user-actions">
                    {editingUser === user._id ? (
                      <>
                        <button
                          className="save-button"
                          onClick={() => setEditingUser(null)}
                          title="Sauvegarder"
                        >
                          ✅
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="edit-button"
                          onClick={() => setEditingUser(user._id)}
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          className="password-button"
                          onClick={() => setShowPasswordModal(user._id)}
                          title="Changer le mot de passe"
                        >
                          🔑
                        </button>
                        {user._id !== currentUser.id && (
                          <button
                            className="delete-button"
                            onClick={() => handleDeleteUser(user._id, user.username)}
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal changement de mot de passe */}
        {showPasswordModal && (
          <div className="password-modal-overlay">
            <div className="password-modal">
              <div className="modal-header">
                <h3>🔑 Changer le mot de passe</h3>
                <button onClick={() => setShowPasswordModal(null)}>✕</button>
              </div>

              <form onSubmit={handleChangePassword}>
                {showPasswordModal === currentUser.id && (
                  <div className="form-group">
                    <label>Mot de passe actuel *</label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Nouveau mot de passe *</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    minLength="6"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Confirmer le mot de passe *</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    minLength="6"
                    required
                  />
                </div>

                <div className="form-actions">
                  <button type="button" onClick={() => setShowPasswordModal(null)}>
                    Annuler
                  </button>
                  <button type="submit" className="primary">
                    Changer le mot de passe
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
