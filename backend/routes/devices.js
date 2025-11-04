const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const Metrics = require('../models/Metrics');
const Alert = require('../models/Alert');
const { protect, authorize } = require('../middleware/auth');
const crypto = require('crypto');

/**
 * @route   GET /api/devices
 * @desc    Obtenir tous les appareils
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const devices = await Device.find({ isActive: true })
      .populate('owner', 'username email')
      .sort({ deviceName: 1 });

    res.json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des appareils:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des appareils'
    });
  }
});

/**
 * @route   GET /api/devices/:id
 * @desc    Obtenir un appareil spécifique
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id)
      .populate('owner', 'username email');

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Appareil non trouvé'
      });
    }

    res.json({
      success: true,
      data: device
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'appareil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'appareil'
    });
  }
});

/**
 * @route   POST /api/devices
 * @desc    Créer un nouvel appareil (générer une clé API)
 * @access  Private (Admin only)
 */
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { deviceName, machineId, notes, tags } = req.body;

    // Vérifier si le machineId existe déjà
    if (machineId) {
      const existing = await Device.findOne({ machineId });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Un appareil avec cet ID machine existe déjà'
        });
      }
    }

    // Générer une clé API unique
    const apiKey = crypto.randomBytes(32).toString('hex');

    // Créer l'appareil
    const device = await Device.create({
      deviceName,
      machineId: machineId || `manual-${Date.now()}`,
      apiKey,
      owner: req.user._id,
      notes,
      tags
    });

    res.status(201).json({
      success: true,
      data: device,
      message: 'Appareil créé avec succès. Conservez la clé API en sécurité.'
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'appareil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'appareil'
    });
  }
});

/**
 * @route   PUT /api/devices/:id
 * @desc    Mettre à jour un appareil
 * @access  Private (Admin only)
 */
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { deviceName, notes, tags, alerts } = req.body;

    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Appareil non trouvé'
      });
    }

    // Mettre à jour les champs
    if (deviceName) device.deviceName = deviceName;
    if (notes !== undefined) device.notes = notes;
    if (tags) device.tags = tags;
    if (alerts) device.alerts = { ...device.alerts, ...alerts };

    await device.save();

    res.json({
      success: true,
      data: device,
      message: 'Appareil mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'appareil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'appareil'
    });
  }
});

/**
 * @route   DELETE /api/devices/:id
 * @desc    Supprimer un appareil (soft delete)
 * @access  Private (Admin only)
 */
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Appareil non trouvé'
      });
    }

    // Soft delete
    device.isActive = false;
    await device.save();

    res.json({
      success: true,
      message: 'Appareil supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'appareil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'appareil'
    });
  }
});

/**
 * @route   POST /api/devices/:id/regenerate-key
 * @desc    Régénérer la clé API d'un appareil
 * @access  Private (Admin only)
 */
router.post('/:id/regenerate-key', protect, authorize('admin'), async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Appareil non trouvé'
      });
    }

    // Générer une nouvelle clé API
    device.apiKey = crypto.randomBytes(32).toString('hex');
    await device.save();

    res.json({
      success: true,
      data: device,
      message: 'Clé API régénérée avec succès. L\'ancien agent ne pourra plus se connecter.'
    });
  } catch (error) {
    console.error('Erreur lors de la régénération de la clé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la régénération de la clé'
    });
  }
});

/**
 * @route   GET /api/devices/:id/metrics
 * @desc    Obtenir les métriques d'un appareil
 * @access  Private
 */
router.get('/:id/metrics', protect, async (req, res) => {
  try {
    const { period = '24h' } = req.query;

    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Appareil non trouvé'
      });
    }

    const metrics = await Metrics.getAggregated(req.params.id, period);
    const stats = await Metrics.getStats(req.params.id, period);

    res.json({
      success: true,
      data: {
        metrics,
        stats,
        current: device.lastMetrics
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des métriques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des métriques'
    });
  }
});

/**
 * @route   GET /api/devices/:id/alerts
 * @desc    Obtenir les alertes d'un appareil
 * @access  Private
 */
router.get('/:id/alerts', protect, async (req, res) => {
  try {
    const { status = 'active', limit = 50 } = req.query;

    const query = { deviceId: req.params.id };
    if (status !== 'all') {
      query.status = status;
    }

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('resolvedBy', 'username');

    const summary = await Alert.getSummary(req.params.id);

    res.json({
      success: true,
      count: alerts.length,
      summary,
      data: alerts
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des alertes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des alertes'
    });
  }
});

/**
 * @route   GET /api/devices/stats/summary
 * @desc    Obtenir un résumé de tous les appareils
 * @access  Private
 */
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const totalDevices = await Device.countDocuments({ isActive: true });
    const onlineDevices = await Device.countDocuments({ isActive: true, isOnline: true });
    const offlineDevices = totalDevices - onlineDevices;

    const alertSummary = await Alert.getSummary();

    const devices = await Device.find({ isActive: true, isOnline: true })
      .select('deviceName lastMetrics')
      .lean();

    // Calculer les moyennes globales
    let totalCpu = 0, totalMemory = 0, totalTemp = 0;
    let countCpu = 0, countMemory = 0, countTemp = 0;

    devices.forEach(device => {
      if (device.lastMetrics) {
        if (device.lastMetrics.cpu && device.lastMetrics.cpu.usage) {
          totalCpu += device.lastMetrics.cpu.usage;
          countCpu++;
        }
        if (device.lastMetrics.memory && device.lastMetrics.memory.usagePercent) {
          totalMemory += device.lastMetrics.memory.usagePercent;
          countMemory++;
        }
        if (device.lastMetrics.temperature && device.lastMetrics.temperature.main) {
          totalTemp += device.lastMetrics.temperature.main;
          countTemp++;
        }
      }
    });

    res.json({
      success: true,
      data: {
        devices: {
          total: totalDevices,
          online: onlineDevices,
          offline: offlineDevices
        },
        alerts: alertSummary,
        averages: {
          cpu: countCpu > 0 ? (totalCpu / countCpu).toFixed(2) : 0,
          memory: countMemory > 0 ? (totalMemory / countMemory).toFixed(2) : 0,
          temperature: countTemp > 0 ? (totalTemp / countTemp).toFixed(2) : null
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du résumé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du résumé'
    });
  }
});

module.exports = router;
