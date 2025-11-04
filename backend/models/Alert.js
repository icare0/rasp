const mongoose = require('mongoose');

/**
 * Schéma pour les alertes générées par le système
 */
const alertSchema = new mongoose.Schema({
  // Appareil concerné
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true
  },

  // Machine ID pour référence
  machineId: {
    type: String,
    required: true
  },

  // Nom de l'appareil (dénormalisé pour performance)
  deviceName: {
    type: String,
    required: true
  },

  // Type d'alerte
  type: {
    type: String,
    required: true,
    enum: ['cpu', 'temperature', 'memory', 'disk', 'network', 'process', 'system', 'custom'],
    index: true
  },

  // Sévérité
  severity: {
    type: String,
    required: true,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
    index: true
  },

  // Message de l'alerte
  message: {
    type: String,
    required: true
  },

  // Valeur actuelle
  value: {
    type: Number
  },

  // Seuil dépassé
  threshold: {
    type: Number
  },

  // Informations supplémentaires
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // Statut de l'alerte
  status: {
    type: String,
    enum: ['active', 'resolved', 'acknowledged'],
    default: 'active',
    index: true
  },

  // Date de résolution
  resolvedAt: {
    type: Date
  },

  // Utilisateur qui a reconnu/résolu l'alerte
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Notes de résolution
  resolutionNotes: {
    type: String
  },

  // Notification envoyée ?
  notificationSent: {
    type: Boolean,
    default: false
  },

  // Horodatage de la notification
  notificationSentAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index composés pour les requêtes fréquentes
alertSchema.index({ deviceId: 1, status: 1, createdAt: -1 });
alertSchema.index({ status: 1, severity: 1, createdAt: -1 });
alertSchema.index({ type: 1, status: 1 });

// TTL Index - Les alertes résolues sont supprimées après 90 jours
alertSchema.index({ resolvedAt: 1 }, {
  expireAfterSeconds: 7776000,
  partialFilterExpression: { status: 'resolved' }
});

// Méthode pour résoudre une alerte
alertSchema.methods.resolve = async function(userId, notes) {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  this.resolvedBy = userId;
  if (notes) this.resolutionNotes = notes;
  await this.save();
};

// Méthode pour reconnaître une alerte
alertSchema.methods.acknowledge = async function(userId) {
  this.status = 'acknowledged';
  this.resolvedBy = userId;
  await this.save();
};

// Méthode statique pour créer une alerte si elle n'existe pas déjà
alertSchema.statics.createIfNotExists = async function(alertData) {
  // Vérifier si une alerte active similaire existe déjà
  const existingAlert = await this.findOne({
    deviceId: alertData.deviceId,
    type: alertData.type,
    status: 'active',
    // Créée dans les dernières 5 minutes
    createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
  });

  if (existingAlert) {
    // Mettre à jour les valeurs de l'alerte existante
    existingAlert.value = alertData.value;
    existingAlert.threshold = alertData.threshold;
    existingAlert.message = alertData.message;
    await existingAlert.save();
    return { alert: existingAlert, created: false };
  }

  // Créer une nouvelle alerte
  const alert = new this(alertData);
  await alert.save();
  return { alert, created: true };
};

// Méthode statique pour résoudre automatiquement les alertes
alertSchema.statics.autoResolve = async function(deviceId, type) {
  await this.updateMany(
    {
      deviceId,
      type,
      status: 'active'
    },
    {
      $set: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolutionNotes: 'Résolu automatiquement - conditions normalisées'
      }
    }
  );
};

// Méthode statique pour obtenir le résumé des alertes
alertSchema.statics.getSummary = async function(deviceId = null) {
  const match = deviceId ? { deviceId: new mongoose.Types.ObjectId(deviceId) } : {};

  const summary = await this.aggregate([
    { $match: { ...match, status: 'active' } },
    {
      $group: {
        _id: '$severity',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    total: 0,
    info: 0,
    warning: 0,
    critical: 0
  };

  summary.forEach(item => {
    result[item._id] = item.count;
    result.total += item.count;
  });

  return result;
};

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
