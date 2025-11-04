const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/alerts
 * @desc    Obtenir toutes les alertes
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const {
      status = 'active',
      severity,
      type,
      deviceId,
      limit = 100,
      page = 1
    } = req.query;

    // Construire le filtre
    const filter = {};

    if (status !== 'all') {
      filter.status = status;
    }

    if (severity) {
      filter.severity = severity;
    }

    if (type) {
      filter.type = type;
    }

    if (deviceId) {
      filter.deviceId = deviceId;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Récupérer les alertes
    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('deviceId', 'deviceName machineId isOnline')
      .populate('resolvedBy', 'username');

    // Compter le total
    const total = await Alert.countDocuments(filter);

    // Résumé
    const summary = await Alert.getSummary();

    res.json({
      success: true,
      count: alerts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
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
 * @route   GET /api/alerts/:id
 * @desc    Obtenir une alerte spécifique
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('deviceId', 'deviceName machineId isOnline systemInfo')
      .populate('resolvedBy', 'username email');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerte non trouvée'
      });
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'alerte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'alerte'
    });
  }
});

/**
 * @route   PUT /api/alerts/:id/acknowledge
 * @desc    Reconnaître une alerte
 * @access  Private
 */
router.put('/:id/acknowledge', protect, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerte non trouvée'
      });
    }

    await alert.acknowledge(req.user._id);

    res.json({
      success: true,
      data: alert,
      message: 'Alerte reconnue'
    });
  } catch (error) {
    console.error('Erreur lors de la reconnaissance de l\'alerte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la reconnaissance de l\'alerte'
    });
  }
});

/**
 * @route   PUT /api/alerts/:id/resolve
 * @desc    Résoudre une alerte
 * @access  Private
 */
router.put('/:id/resolve', protect, async (req, res) => {
  try {
    const { notes } = req.body;

    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerte non trouvée'
      });
    }

    await alert.resolve(req.user._id, notes);

    res.json({
      success: true,
      data: alert,
      message: 'Alerte résolue'
    });
  } catch (error) {
    console.error('Erreur lors de la résolution de l\'alerte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la résolution de l\'alerte'
    });
  }
});

/**
 * @route   POST /api/alerts/bulk/acknowledge
 * @desc    Reconnaître plusieurs alertes
 * @access  Private
 */
router.post('/bulk/acknowledge', protect, async (req, res) => {
  try {
    const { alertIds } = req.body;

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IDs d\'alertes invalides'
      });
    }

    const result = await Alert.updateMany(
      {
        _id: { $in: alertIds },
        status: 'active'
      },
      {
        $set: {
          status: 'acknowledged',
          resolvedBy: req.user._id
        }
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} alerte(s) reconnue(s)`,
      count: result.modifiedCount
    });
  } catch (error) {
    console.error('Erreur lors de la reconnaissance en masse:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la reconnaissance en masse'
    });
  }
});

/**
 * @route   POST /api/alerts/bulk/resolve
 * @desc    Résoudre plusieurs alertes
 * @access  Private
 */
router.post('/bulk/resolve', protect, async (req, res) => {
  try {
    const { alertIds, notes } = req.body;

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IDs d\'alertes invalides'
      });
    }

    const result = await Alert.updateMany(
      {
        _id: { $in: alertIds },
        status: { $in: ['active', 'acknowledged'] }
      },
      {
        $set: {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: req.user._id,
          resolutionNotes: notes || 'Résolu en masse'
        }
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} alerte(s) résolue(s)`,
      count: result.modifiedCount
    });
  } catch (error) {
    console.error('Erreur lors de la résolution en masse:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la résolution en masse'
    });
  }
});

/**
 * @route   DELETE /api/alerts/:id
 * @desc    Supprimer une alerte (admin seulement)
 * @access  Private (Admin only)
 */
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerte non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Alerte supprimée'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'alerte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'alerte'
    });
  }
});

/**
 * @route   GET /api/alerts/summary/global
 * @desc    Obtenir un résumé global des alertes
 * @access  Private
 */
router.get('/summary/global', protect, async (req, res) => {
  try {
    const summary = await Alert.getSummary();

    // Alertes par type
    const byType = await Alert.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Alertes récentes (dernières 24h)
    const recentCount = await Alert.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      success: true,
      data: {
        summary,
        byType,
        recent24h: recentCount
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
