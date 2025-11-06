const mongoose = require('mongoose');

/**
 * Schéma pour les appareils Raspberry Pi connectés
 */
const deviceSchema = new mongoose.Schema({
  // Identifiant unique de la machine
  machineId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Nom personnalisé de l'appareil
  deviceName: {
    type: String,
    required: true,
    trim: true
  },

  // Clé API pour l'authentification
  apiKey: {
    type: String,
    required: true,
    unique: true
  },

  // Statut de connexion
  isOnline: {
    type: Boolean,
    default: false
  },

  // Socket ID actuel (si connecté)
  socketId: {
    type: String,
    default: null
  },

  // Dernière connexion
  lastSeen: {
    type: Date,
    default: Date.now
  },

  // Informations système statiques
  systemInfo: {
    system: {
      manufacturer: String,
      model: String,
      version: String,
      serial: String,
      uuid: String
    },
    os: {
      platform: String,
      distro: String,
      release: String,
      codename: String,
      kernel: String,
      arch: String,
      hostname: String
    },
    cpu: {
      manufacturer: String,
      brand: String,
      speed: Number,
      cores: Number,
      physicalCores: Number,
      processors: Number
    },
    memory: {
      total: Number
    },
    disk: [{
      name: String,
      type: String,
      size: Number,
      interfaceType: String
    }]
  },

  // Dernières métriques (pour affichage rapide)
  lastMetrics: {
    cpu: {
      usage: Number,
      loadAvg: [Number],
      cores: [{
        load: Number
      }]
    },
    temperature: {
      main: Number,
      cores: [Number],
      max: Number
    },
    memory: {
      total: Number,
      used: Number,
      free: Number,
      available: Number,
      usagePercent: Number,
      swapTotal: Number,
      swapUsed: Number,
      swapFree: Number
    },
    disk: [{
      fs: String,
      type: String,
      size: Number,
      used: Number,
      available: Number,
      usagePercent: Number,
      mount: String
    }],
    network: [{
      iface: String,
      rx_bytes: Number,
      tx_bytes: Number,
      rx_sec: Number,
      tx_sec: Number,
      rx_dropped: Number,
      tx_dropped: Number,
      rx_errors: Number,
      tx_errors: Number
    }],
    processes: {
      all: Number,
      running: Number,
      blocked: Number,
      sleeping: Number,
      list: [{
        pid: Number,
        name: String,
        cpu: Number,
        mem: Number,
        command: String
      }]
    },
    uptime: Number,
    timestamp: Date
  },

  // Configuration des alertes
  alerts: {
    cpu: {
      enabled: { type: Boolean, default: true },
      threshold: { type: Number, default: 90 }
    },
    temperature: {
      enabled: { type: Boolean, default: true },
      threshold: { type: Number, default: 80 }
    },
    memory: {
      enabled: { type: Boolean, default: true },
      threshold: { type: Number, default: 85 }
    },
    disk: {
      enabled: { type: Boolean, default: true },
      threshold: { type: Number, default: 90 }
    }
  },

  // Propriétaire de l'appareil
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Notes et tags
  notes: {
    type: String,
    default: ''
  },

  tags: [{
    type: String,
    trim: true
  }],

  // Actif/Inactif
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index pour les recherches rapides
deviceSchema.index({ isOnline: 1, isActive: 1 });
deviceSchema.index({ owner: 1 });
deviceSchema.index({ 'lastMetrics.timestamp': 1 });

// Méthode pour mettre à jour le statut de connexion
deviceSchema.methods.setOnline = async function(socketId) {
  this.isOnline = true;
  this.socketId = socketId;
  this.lastSeen = new Date();
  await this.save();
};

deviceSchema.methods.setOffline = async function() {
  this.isOnline = false;
  this.socketId = null;
  this.lastSeen = new Date();
  await this.save();
};

// Méthode pour mettre à jour les métriques
deviceSchema.methods.updateMetrics = async function(metrics) {
  console.log(`[Device.updateMetrics] 🔧 DÉBUT pour ${this.deviceName}`);
  console.log(`[Device.updateMetrics] Métriques reçues - CPU: ${metrics.cpu?.usage}%`);

  // Parser les chaînes JSON si nécessaire
  const parseIfString = (value) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  };

  // Nettoyer les métriques en parsant récursivement
  console.log(`[Device.updateMetrics] Nettoyage des métriques...`);
  const cleanedMetrics = {
    cpu: metrics.cpu ? {
      usage: metrics.cpu.usage,
      loadAvg: Array.isArray(parseIfString(metrics.cpu.loadAvg)) ? parseIfString(metrics.cpu.loadAvg) : [],
      cores: Array.isArray(parseIfString(metrics.cpu.cores)) ? parseIfString(metrics.cpu.cores) : []
    } : undefined,
    temperature: metrics.temperature,
    memory: metrics.memory,
    disk: Array.isArray(parseIfString(metrics.disk)) ? parseIfString(metrics.disk) : [],
    network: Array.isArray(parseIfString(metrics.network)) ? parseIfString(metrics.network) : [],
    processes: metrics.processes,
    uptime: metrics.uptime,
    timestamp: new Date()
  };

  console.log(`[Device.updateMetrics] Métriques nettoyées - CPU: ${cleanedMetrics.cpu?.usage}%, RAM: ${cleanedMetrics.memory?.usagePercent}%`);
  console.log(`[Device.updateMetrics] Attribution à this.lastMetrics...`);

  const before = this.lastMetrics ? Object.keys(this.lastMetrics).length : 0;
  this.lastMetrics = cleanedMetrics;
  console.log(`[Device.updateMetrics] lastMetrics avant: ${before} clés, après: ${Object.keys(this.lastMetrics).length} clés`);

  this.lastSeen = new Date();

  console.log(`[Device.updateMetrics] Sauvegarde dans MongoDB...`);
  try {
    const saved = await this.save();
    console.log(`[Device.updateMetrics] ✅ SAUVEGARDE RÉUSSIE - ID: ${saved._id}`);
    console.log(`[Device.updateMetrics] ✅ Vérification après save - CPU: ${saved.lastMetrics?.cpu?.usage}%`);
    return saved;
  } catch (error) {
    console.error(`[Device.updateMetrics] ❌ ERREUR SAUVEGARDE:`, error);
    throw error;
  }
};

// Méthode pour vérifier si une alerte doit être déclenchée
deviceSchema.methods.checkAlerts = function() {
  const alerts = [];

  if (!this.lastMetrics) return alerts;

  // Alerte CPU
  if (this.alerts.cpu.enabled && this.lastMetrics.cpu && this.lastMetrics.cpu.usage > this.alerts.cpu.threshold) {
    alerts.push({
      type: 'cpu',
      severity: 'warning',
      message: `Utilisation CPU élevée: ${this.lastMetrics.cpu.usage.toFixed(2)}%`,
      value: this.lastMetrics.cpu.usage,
      threshold: this.alerts.cpu.threshold
    });
  }

  // Alerte température
  if (this.alerts.temperature.enabled && this.lastMetrics.temperature && this.lastMetrics.temperature.main > this.alerts.temperature.threshold) {
    alerts.push({
      type: 'temperature',
      severity: this.lastMetrics.temperature.main > 85 ? 'critical' : 'warning',
      message: `Température élevée: ${this.lastMetrics.temperature.main}°C`,
      value: this.lastMetrics.temperature.main,
      threshold: this.alerts.temperature.threshold
    });
  }

  // Alerte mémoire
  if (this.alerts.memory.enabled && this.lastMetrics.memory && this.lastMetrics.memory.usagePercent > this.alerts.memory.threshold) {
    alerts.push({
      type: 'memory',
      severity: 'warning',
      message: `Utilisation mémoire élevée: ${this.lastMetrics.memory.usagePercent.toFixed(2)}%`,
      value: this.lastMetrics.memory.usagePercent,
      threshold: this.alerts.memory.threshold
    });
  }

  // Alerte disque
  if (this.alerts.disk.enabled && this.lastMetrics.disk) {
    this.lastMetrics.disk.forEach(disk => {
      if (disk.usagePercent > this.alerts.disk.threshold) {
        alerts.push({
          type: 'disk',
          severity: disk.usagePercent > 95 ? 'critical' : 'warning',
          message: `Espace disque faible sur ${disk.mount}: ${disk.usagePercent.toFixed(2)}%`,
          value: disk.usagePercent,
          threshold: this.alerts.disk.threshold,
          mount: disk.mount
        });
      }
    });
  }

  return alerts;
};

// Méthode virtuelle pour obtenir le temps d'uptime formaté
deviceSchema.virtual('uptimeFormatted').get(function() {
  if (!this.lastMetrics || !this.lastMetrics.uptime) return 'N/A';

  const uptime = this.lastMetrics.uptime;
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  if (days > 0) {
    return `${days}j ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
});

// Inclure les virtuels dans les conversions JSON
deviceSchema.set('toJSON', { virtuals: true });
deviceSchema.set('toObject', { virtuals: true });

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;
