import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.socket = null;

    // Intercepteur pour les erreurs
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Ne pas rediriger automatiquement pour les routes d'auth
        const isAuthRoute = error.config?.url?.includes('/auth/');

        if (error.response?.status === 401 && !isAuthRoute) {
          // Seulement rediriger si on a un token stocké (donc user était connecté)
          const token = localStorage.getItem('token');
          if (token) {
            console.log('Token invalide, déconnexion automatique');
            this.handleUnauthorized();
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token) {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      this.initSocket(token);
    } else {
      delete this.api.defaults.headers.common['Authorization'];
      this.disconnectSocket();
    }
  }

  initSocket(token) {
    if (this.socket) {
      this.socket.disconnect();
    }

    // Connexion au namespace /client pour les utilisateurs du dashboard
    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    this.socket = io(`${socketUrl}/client`, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Socket connecté');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket déconnecté');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Erreur socket:', error);
    });

    // Événements en temps réel
    this.socket.on('device-connected', (data) => {
      console.log('Device connecté:', data);
    });

    this.socket.on('device-disconnected', (data) => {
      console.log('Device déconnecté:', data);
    });

    this.socket.on('new-alert', (data) => {
      console.log('Nouvelle alerte:', data);
    });
  }

  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  handleUnauthorized() {
    localStorage.removeItem('token');
    this.setAuthToken(null);
    window.location.href = '/login';
  }

  // Méthodes API génériques
  async get(url, config = {}) {
    return this.api.get(url, config);
  }

  async post(url, data = {}, config = {}) {
    return this.api.post(url, data, config);
  }

  async put(url, data = {}, config = {}) {
    return this.api.put(url, data, config);
  }

  async delete(url, config = {}) {
    return this.api.delete(url, config);
  }

  // Méthodes spécifiques à l'application
  
  // Authentification
  async login(credentials) {
    return this.post('/auth/login', credentials);
  }

  async register(userData) {
    return this.post('/auth/register', userData);
  }

  async getProfile() {
    return this.get('/auth/me');
  }

  // Projets
  async getProjects() {
    return this.get('/projects');
  }

  async createProject(projectData) {
    return this.post('/projects', projectData);
  }

  async updateProject(id, projectData) {
    return this.put(`/projects/${id}`, projectData);
  }

  async deleteProject(id) {
    return this.delete(`/projects/${id}`);
  }

  // Commandes
  async startProject(projectId) {
    return this.post(`/commands/start/${projectId}`);
  }

  async stopProject(projectId) {
    return this.post(`/commands/stop/${projectId}`);
  }

  async restartProject(projectId) {
    return this.post(`/commands/restart/${projectId}`);
  }

  async getProjectStatus(projectId) {
    return this.get(`/commands/status/${projectId}`);
  }

  async executeCommand(command, directory, projectId = null) {
    return this.post('/commands/execute', { command, directory, projectId });
  }

  async getProjectLogs(projectId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    return this.get(`/commands/logs/${projectId}?limit=${limit}&offset=${offset}`);
  }

  async getAllLogs(limit = 100) {
    return this.get(`/commands/logs?limit=${limit}`);
  }

  // Système
  async getSystemHealth() {
    return this.get('/health');
  }

  // Gestion des utilisateurs (admin seulement)
  async getUsers() {
    return this.get('/users');
  }

  async createUser(userData) {
    return this.post('/users', userData);
  }

  async updateUser(id, userData) {
    return this.put(`/users/${id}`, userData);
  }

  async deleteUser(id) {
    return this.delete(`/users/${id}`);
  }

  async changePassword(id, passwordData) {
    return this.put(`/users/${id}/password`, passwordData);
  }

  async getUserStats() {
    return this.get('/users/stats');
  }

  // Gestion des devices (Raspberry Pi)
  async getDevices() {
    return await this.get('/devices');
  }

  async getDevice(id) {
    return await this.get(`/devices/${id}`);
  }

  async createDevice(deviceData) {
    return this.post('/devices', deviceData);
  }

  async updateDevice(id, deviceData) {
    return this.put(`/devices/${id}`, deviceData);
  }

  async deleteDevice(id) {
    return this.delete(`/devices/${id}`);
  }

  async regenerateApiKey(id) {
    return this.post(`/devices/${id}/regenerate-key`);
  }

  async getDeviceMetrics(id, period = '24h') {
    return this.get(`/devices/${id}/metrics?period=${period}`);
  }

  async getDeviceAlerts(id, status = 'active', limit = 50) {
    return this.get(`/devices/${id}/alerts?status=${status}&limit=${limit}`);
  }

  async getDevicesSummary() {
    return this.get('/devices/stats/summary');
  }

  // Gestion des alertes
  async getAlerts(params = {}) {
    const { status = 'active', severity, type, deviceId, limit = 100, page = 1 } = params;
    let url = `/alerts?status=${status}&limit=${limit}&page=${page}`;
    if (severity) url += `&severity=${severity}`;
    if (type) url += `&type=${type}`;
    if (deviceId) url += `&deviceId=${deviceId}`;
    return this.get(url);
  }

  async getAlert(id) {
    return this.get(`/alerts/${id}`);
  }

  async acknowledgeAlert(id) {
    return this.put(`/alerts/${id}/acknowledge`);
  }

  async resolveAlert(id, notes) {
    return this.put(`/alerts/${id}/resolve`, { notes });
  }

  async bulkAcknowledgeAlerts(alertIds) {
    return this.post('/alerts/bulk/acknowledge', { alertIds });
  }

  async bulkResolveAlerts(alertIds, notes) {
    return this.post('/alerts/bulk/resolve', { alertIds, notes });
  }

  async deleteAlert(id) {
    return this.delete(`/alerts/${id}`);
  }

  async getAlertsSummary() {
    return this.get('/alerts/summary/global');
  }

  // Helper pour s'abonner aux mises à jour d'un device
  subscribeToDevice(deviceId) {
    if (this.socket) {
      this.socket.emit('subscribe-device', deviceId);
    }
  }

  unsubscribeFromDevice(deviceId) {
    if (this.socket) {
      this.socket.emit('unsubscribe-device', deviceId);
    }
  }

  // ========================================
  // WORKFLOWS
  // ========================================

  async getWorkflows(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/workflows${queryString ? `?${queryString}` : ''}`);
  }

  async getWorkflow(id) {
    return this.get(`/workflows/${id}`);
  }

  async createWorkflow(workflowData) {
    return this.post('/workflows', workflowData);
  }

  async updateWorkflow(id, workflowData) {
    return this.put(`/workflows/${id}`, workflowData);
  }

  async deleteWorkflow(id) {
    return this.delete(`/workflows/${id}`);
  }

  async executeWorkflow(id, deviceIds, executionMode = 'parallel') {
    return this.post(`/workflows/${id}/execute`, { deviceIds, executionMode });
  }

  async getWorkflowExecutions(id, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/workflows/${id}/executions${queryString ? `?${queryString}` : ''}`);
  }

  async toggleWorkflowFavorite(id) {
    return this.post(`/workflows/${id}/favorite`);
  }

  async getWorkflowTemplates() {
    return this.get('/workflows/templates/list');
  }

  // ========================================
  // QUICK ACTIONS
  // ========================================

  async getQuickActions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/quick-actions${queryString ? `?${queryString}` : ''}`);
  }

  async createQuickAction(actionData) {
    return this.post('/quick-actions', actionData);
  }

  async updateQuickAction(id, actionData) {
    return this.put(`/quick-actions/${id}`, actionData);
  }

  async deleteQuickAction(id) {
    return this.delete(`/quick-actions/${id}`);
  }

  async executeQuickAction(id, deviceIds) {
    return this.post(`/quick-actions/${id}/execute`, { deviceIds });
  }

  async getQuickActionPresets() {
    return this.get('/quick-actions/presets/list');
  }
}

export const api = new ApiService();
