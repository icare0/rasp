const mongoose = require('mongoose');

/**
 * Schéma pour les workflows d'automatisation
 * Un workflow est une séquence de commandes à exécuter
 */
const workflowSchema = new mongoose.Schema({
  // Nom du workflow
  name: {
    type: String,
    required: true,
    trim: true
  },

  // Description
  description: {
    type: String,
    default: ''
  },

  // Icône/Emoji
  icon: {
    type: String,
    default: '⚙️'
  },

  // Catégorie
  category: {
    type: String,
    enum: ['deployment', 'maintenance', 'monitoring', 'backup', 'custom'],
    default: 'custom'
  },

  // Étapes du workflow
  steps: [{
    name: {
      type: String,
      required: true
    },
    command: {
      type: String,
      required: true
    },
    directory: {
      type: String,
      default: '/home/pi'
    },
    // Continuer même si cette étape échoue
    continueOnError: {
      type: Boolean,
      default: false
    },
    // Timeout en secondes
    timeout: {
      type: Number,
      default: 60
    }
  }],

  // Appareils cibles (si vide = demander à chaque exécution)
  targetDevices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device'
  }],

  // Variables d'environnement à définir
  environmentVariables: [{
    key: String,
    value: String
  }],

  // Créateur
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Dernière exécution
  lastRun: {
    type: Date
  },

  // Nombre d'exécutions
  runCount: {
    type: Number,
    default: 0
  },

  // Taux de succès
  successRate: {
    type: Number,
    default: 100
  },

  // Actif/Inactif
  isActive: {
    type: Boolean,
    default: true
  },

  // Tags
  tags: [{
    type: String,
    trim: true
  }],

  // Favoris
  isFavorite: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index
workflowSchema.index({ createdBy: 1, isActive: 1 });
workflowSchema.index({ category: 1 });
workflowSchema.index({ tags: 1 });

// Méthode pour mettre à jour les stats après exécution
workflowSchema.methods.updateStats = async function(success) {
  this.lastRun = new Date();
  this.runCount += 1;

  // Calculer le taux de succès
  if (success) {
    const totalSuccess = Math.round(this.successRate * (this.runCount - 1) / 100) + 1;
    this.successRate = Math.round((totalSuccess / this.runCount) * 100);
  } else {
    const totalSuccess = Math.round(this.successRate * (this.runCount - 1) / 100);
    this.successRate = Math.round((totalSuccess / this.runCount) * 100);
  }

  await this.save();
};

const Workflow = mongoose.model('Workflow', workflowSchema);

module.exports = Workflow;
