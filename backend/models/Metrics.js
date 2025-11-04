const mongoose = require('mongoose');

/**
 * Schéma pour l'historique des métriques système
 * Permet de stocker les métriques dans le temps pour créer des graphiques
 */
const metricsSchema = new mongoose.Schema({
  // Appareil concerné
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true
  },

  // Machine ID pour référence rapide
  machineId: {
    type: String,
    required: true,
    index: true
  },

  // Horodatage de la collecte
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Métriques CPU
  cpu: {
    usage: Number,
    loadAvg: [Number]
  },

  // Température
  temperature: {
    main: Number,
    max: Number
  },

  // Mémoire
  memory: {
    total: Number,
    used: Number,
    usagePercent: Number
  },

  // Disque (on stocke juste l'usage global du disque principal)
  disk: {
    size: Number,
    used: Number,
    usagePercent: Number,
    mount: String
  },

  // Réseau (agrégé)
  network: {
    rx_sec: Number,  // Bytes reçus par seconde
    tx_sec: Number   // Bytes transmis par seconde
  },

  // Processus
  processes: {
    all: Number,
    running: Number
  },

  // Uptime
  uptime: Number
}, {
  timestamps: false  // On utilise notre propre timestamp
});

// Index composé pour les requêtes de plage temporelle
metricsSchema.index({ deviceId: 1, timestamp: -1 });
metricsSchema.index({ machineId: 1, timestamp: -1 });

// TTL Index - Les métriques sont automatiquement supprimées après 30 jours
metricsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

// Méthode statique pour obtenir les métriques agrégées sur une période
metricsSchema.statics.getAggregated = async function(deviceId, period = '1h') {
  const now = new Date();
  let startDate;
  let groupBy;

  // Définir la période et le groupement
  switch (period) {
    case '1h':
      startDate = new Date(now - 60 * 60 * 1000);
      groupBy = { $dateToString: { format: '%Y-%m-%d %H:%M', date: '$timestamp' } };
      break;
    case '6h':
      startDate = new Date(now - 6 * 60 * 60 * 1000);
      groupBy = { $dateToString: { format: '%Y-%m-%d %H:%M', date: '$timestamp' } };
      break;
    case '24h':
      startDate = new Date(now - 24 * 60 * 60 * 1000);
      groupBy = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } };
      break;
    case '7d':
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      groupBy = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } };
      break;
    case '30d':
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
      break;
    default:
      startDate = new Date(now - 60 * 60 * 1000);
      groupBy = { $dateToString: { format: '%Y-%m-%d %H:%M', date: '$timestamp' } };
  }

  const aggregated = await this.aggregate([
    {
      $match: {
        deviceId: new mongoose.Types.ObjectId(deviceId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: groupBy,
        avgCpu: { $avg: '$cpu.usage' },
        maxCpu: { $max: '$cpu.usage' },
        avgTemp: { $avg: '$temperature.main' },
        maxTemp: { $max: '$temperature.main' },
        avgMemory: { $avg: '$memory.usagePercent' },
        maxMemory: { $max: '$memory.usagePercent' },
        avgDisk: { $avg: '$disk.usagePercent' },
        avgNetworkRx: { $avg: '$network.rx_sec' },
        avgNetworkTx: { $avg: '$network.tx_sec' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  return aggregated;
};

// Méthode statique pour obtenir les statistiques globales d'un appareil
metricsSchema.statics.getStats = async function(deviceId, period = '24h') {
  const now = new Date();
  let startDate;

  switch (period) {
    case '1h':
      startDate = new Date(now - 60 * 60 * 1000);
      break;
    case '24h':
      startDate = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now - 24 * 60 * 60 * 1000);
  }

  const stats = await this.aggregate([
    {
      $match: {
        deviceId: new mongoose.Types.ObjectId(deviceId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        avgCpu: { $avg: '$cpu.usage' },
        maxCpu: { $max: '$cpu.usage' },
        minCpu: { $min: '$cpu.usage' },
        avgTemp: { $avg: '$temperature.main' },
        maxTemp: { $max: '$temperature.main' },
        minTemp: { $min: '$temperature.main' },
        avgMemory: { $avg: '$memory.usagePercent' },
        maxMemory: { $max: '$memory.usagePercent' },
        minMemory: { $min: '$memory.usagePercent' },
        avgDisk: { $avg: '$disk.usagePercent' },
        maxDisk: { $max: '$disk.usagePercent' },
        totalNetworkRx: { $sum: '$network.rx_sec' },
        totalNetworkTx: { $sum: '$network.tx_sec' },
        count: { $sum: 1 }
      }
    }
  ]);

  return stats.length > 0 ? stats[0] : null;
};

const Metrics = mongoose.model('Metrics', metricsSchema);

module.exports = Metrics;
