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
        if (error.response?.status === 401) {
          this.handleUnauthorized();
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

    this.socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
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
}

export const api = new ApiService();
