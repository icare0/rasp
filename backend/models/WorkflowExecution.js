const mongoose = require('mongoose');

/**
 * Schéma pour l'historique des exécutions de workflows
 */
const workflowExecutionSchema = new mongoose.Schema({
  // Workflow exécuté
  workflowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true,
    index: true
  },

  // Nom du workflow (dénormalisé)
  workflowName: {
    type: String,
    required: true
  },

  // Appareils sur lesquels le workflow a été exécuté
  devices: [{
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device'
    },
    deviceName: String,
    status: {
      type: String,
      enum: ['pending', 'running', 'success', 'failed', 'cancelled'],
      default: 'pending'
    },
    startedAt: Date,
    completedAt: Date,
    // Résultats de chaque étape
    stepResults: [{
      stepName: String,
      command: String,
      output: String,
      error: String,
      exitCode: Number,
      duration: Number, // en ms
      success: Boolean
    }],
    // Erreur globale si échec
    error: String
  }],

  // Statut global
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'partial'],
    default: 'pending',
    index: true
  },

  // Date de début et fin
  startedAt: {
    type: Date,
    default: Date.now
  },

  completedAt: {
    type: Date
  },

  // Durée totale en ms
  duration: {
    type: Number
  },

  // Utilisateur qui a lancé
  executedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Mode d'exécution
  executionMode: {
    type: String,
    enum: ['sequential', 'parallel'],
    default: 'parallel'
  },

  // Résumé
  summary: {
    totalDevices: Number,
    successCount: Number,
    failedCount: Number,
    totalSteps: Number
  }
}, {
  timestamps: true
});

// Index composés
workflowExecutionSchema.index({ workflowId: 1, createdAt: -1 });
workflowExecutionSchema.index({ executedBy: 1, createdAt: -1 });
workflowExecutionSchema.index({ status: 1, createdAt: -1 });

// TTL Index - Supprimer les exécutions après 90 jours
workflowExecutionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// Méthode pour mettre à jour le statut global
workflowExecutionSchema.methods.updateStatus = function() {
  const devices = this.devices;

  if (devices.every(d => d.status === 'success')) {
    this.status = 'completed';
  } else if (devices.every(d => d.status === 'failed')) {
    this.status = 'failed';
  } else if (devices.some(d => d.status === 'running')) {
    this.status = 'running';
  } else if (devices.some(d => d.status === 'success') && devices.some(d => d.status === 'failed')) {
    this.status = 'partial';
  }

  // Mettre à jour le résumé
  this.summary = {
    totalDevices: devices.length,
    successCount: devices.filter(d => d.status === 'success').length,
    failedCount: devices.filter(d => d.status === 'failed').length,
    totalSteps: devices.reduce((sum, d) => sum + (d.stepResults?.length || 0), 0)
  };

  // Si terminé, calculer la durée
  if (['completed', 'failed', 'partial'].includes(this.status) && !this.completedAt) {
    this.completedAt = new Date();
    this.duration = this.completedAt - this.startedAt;
  }
};

const WorkflowExecution = mongoose.model('WorkflowExecution', workflowExecutionSchema);

module.exports = WorkflowExecution;
