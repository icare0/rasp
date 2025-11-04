const mongoose = require('mongoose');

/**
 * Schéma pour les actions rapides pré-configurées
 */
const quickActionSchema = new mongoose.Schema({
  // Nom de l'action
  name: {
    type: String,
    required: true,
    trim: true
  },

  // Description
  description: {
    type: String,
    required: true
  },

  // Icône/Emoji
  icon: {
    type: String,
    default: '⚡'
  },

  // Couleur du bouton
  color: {
    type: String,
    enum: ['blue', 'green', 'yellow', 'red', 'purple', 'pink'],
    default: 'blue'
  },

  // Catégorie
  category: {
    type: String,
    enum: ['git', 'npm', 'docker', 'pm2', 'system', 'custom'],
    required: true
  },

  // Commande à exécuter
  command: {
    type: String,
    required: true
  },

  // Répertoire de travail
  workingDirectory: {
    type: String,
    default: '/home/pi'
  },

  // Confirmation requise avant exécution
  requiresConfirmation: {
    type: Boolean,
    default: false
  },

  // Message de confirmation
  confirmationMessage: {
    type: String,
    default: 'Êtes-vous sûr de vouloir exécuter cette action ?'
  },

  // Type d'action
  type: {
    type: String,
    enum: ['system', 'user-defined'],
    default: 'user-defined'
  },

  // Créateur (si user-defined)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Actif/Inactif
  isActive: {
    type: Boolean,
    default: true
  },

  // Nombre d'utilisations
  usageCount: {
    type: Number,
    default: 0
  },

  // Ordre d'affichage
  order: {
    type: Number,
    default: 0
  },

  // Visible pour tous les utilisateurs (si system)
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index
quickActionSchema.index({ category: 1, isActive: 1 });
quickActionSchema.index({ type: 1, isPublic: 1 });
quickActionSchema.index({ createdBy: 1 });

// Méthode pour incrémenter l'usage
quickActionSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  await this.save();
};

const QuickAction = mongoose.model('QuickAction', quickActionSchema);

module.exports = QuickAction;
