const express = require('express');
const router = express.Router();
const QuickAction = require('../models/QuickAction');
const Device = require('../models/Device');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/quick-actions
 * @desc    Obtenir toutes les actions rapides
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { category } = req.query;

    const filter = {
      $or: [
        { createdBy: req.user._id },
        { isPublic: true }
      ],
      isActive: true
    };

    if (category) filter.category = category;

    const actions = await QuickAction.find(filter)
      .populate('createdBy', 'username')
      .sort({ order: 1, usageCount: -1 });

    res.json({
      success: true,
      count: actions.length,
      data: actions
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des actions rapides:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des actions rapides'
    });
  }
});

/**
 * @route   POST /api/quick-actions
 * @desc    Créer une nouvelle action rapide
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const actionData = {
      ...req.body,
      createdBy: req.user._id,
      type: 'user-defined'
    };

    const action = await QuickAction.create(actionData);

    res.status(201).json({
      success: true,
      data: action,
      message: 'Action rapide créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'action rapide:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'action rapide'
    });
  }
});

/**
 * @route   PUT /api/quick-actions/:id
 * @desc    Mettre à jour une action rapide
 * @access  Private
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const action = await QuickAction.findById(req.params.id);

    if (!action) {
      return res.status(404).json({
        success: false,
        message: 'Action rapide non trouvée'
      });
    }

    // Vérifier les permissions
    if (action.type === 'system' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à modifier cette action'
      });
    }

    if (action.createdBy && action.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à modifier cette action'
      });
    }

    Object.assign(action, req.body);
    await action.save();

    res.json({
      success: true,
      data: action,
      message: 'Action rapide mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'action rapide:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'action rapide'
    });
  }
});

/**
 * @route   DELETE /api/quick-actions/:id
 * @desc    Supprimer une action rapide
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const action = await QuickAction.findById(req.params.id);

    if (!action) {
      return res.status(404).json({
        success: false,
        message: 'Action rapide non trouvée'
      });
    }

    // Vérifier les permissions
    if (action.type === 'system' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à supprimer cette action'
      });
    }

    if (action.createdBy && action.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à supprimer cette action'
      });
    }

    action.isActive = false;
    await action.save();

    res.json({
      success: true,
      message: 'Action rapide supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'action rapide:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'action rapide'
    });
  }
});

/**
 * @route   POST /api/quick-actions/:id/execute
 * @desc    Exécuter une action rapide
 * @access  Private
 */
router.post('/:id/execute', protect, async (req, res) => {
  try {
    const action = await QuickAction.findById(req.params.id);

    if (!action) {
      return res.status(404).json({
        success: false,
        message: 'Action rapide non trouvée'
      });
    }

    const { deviceIds } = req.body;

    if (!deviceIds || deviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun appareil spécifié'
      });
    }

    // Vérifier que les appareils existent
    const devices = await Device.find({
      _id: { $in: deviceIds },
      isActive: true,
      isOnline: true
    });

    if (devices.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun appareil en ligne trouvé'
      });
    }

    // Incrémenter le compteur d'usage
    await action.incrementUsage();

    // Exécuter la commande sur chaque appareil via Socket.IO
    const agentNamespace = global.agentNamespace;
    const results = [];

    for (const device of devices) {
      if (device.socketId && agentNamespace) {
        agentNamespace.to(device.socketId).emit('execute_command', {
          command: action.command,
          directory: action.workingDirectory,
          deviceId: device._id,
          actionName: action.name
        });

        results.push({
          deviceId: device._id,
          deviceName: device.deviceName,
          status: 'sent'
        });
      }
    }

    res.json({
      success: true,
      message: 'Action envoyée aux appareils',
      data: results
    });
  } catch (error) {
    console.error('Erreur lors de l\'exécution de l\'action rapide:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'exécution de l\'action rapide'
    });
  }
});

/**
 * @route   GET /api/quick-actions/presets/list
 * @desc    Obtenir les actions rapides pré-configurées
 * @access  Private
 */
router.get('/presets/list', protect, async (req, res) => {
  try {
    const presets = [
      // Git
      { name: 'Git Pull', description: 'Récupérer les dernières modifications', icon: '⬇️', color: 'blue', category: 'git', command: 'git pull origin main', workingDirectory: '/home/pi' },
      { name: 'Git Status', description: 'Voir l\'état du dépôt', icon: '📊', color: 'blue', category: 'git', command: 'git status', workingDirectory: '/home/pi' },
      { name: 'Git Log', description: 'Voir l\'historique des commits', icon: '📜', color: 'blue', category: 'git', command: 'git log --oneline -10', workingDirectory: '/home/pi' },

      // NPM
      { name: 'NPM Install', description: 'Installer les dépendances', icon: '📦', color: 'red', category: 'npm', command: 'npm install', workingDirectory: '/home/pi' },
      { name: 'NPM Update', description: 'Mettre à jour les packages', icon: '🔄', color: 'red', category: 'npm', command: 'npm update', workingDirectory: '/home/pi' },
      { name: 'NPM Audit Fix', description: 'Corriger les vulnérabilités', icon: '🔒', color: 'red', category: 'npm', command: 'npm audit fix', workingDirectory: '/home/pi' },

      // PM2
      { name: 'PM2 List', description: 'Lister les processus PM2', icon: '📋', color: 'green', category: 'pm2', command: 'pm2 list', workingDirectory: '/home/pi' },
      { name: 'PM2 Restart All', description: 'Redémarrer tous les processus', icon: '🔃', color: 'green', category: 'pm2', command: 'pm2 restart all', workingDirectory: '/home/pi' },
      { name: 'PM2 Stop All', description: 'Arrêter tous les processus', icon: '⏹️', color: 'yellow', category: 'pm2', command: 'pm2 stop all', workingDirectory: '/home/pi' },
      { name: 'PM2 Logs', description: 'Voir les logs PM2', icon: '📄', color: 'green', category: 'pm2', command: 'pm2 logs --lines 50', workingDirectory: '/home/pi' },
      { name: 'PM2 Monit', description: 'Monitorer les processus', icon: '📊', color: 'green', category: 'pm2', command: 'pm2 monit', workingDirectory: '/home/pi' },

      // Docker
      { name: 'Docker PS', description: 'Lister les conteneurs', icon: '🐳', color: 'blue', category: 'docker', command: 'docker ps', workingDirectory: '/home/pi' },
      { name: 'Docker Restart', description: 'Redémarrer les conteneurs', icon: '🔄', color: 'blue', category: 'docker', command: 'docker restart $(docker ps -q)', workingDirectory: '/home/pi' },
      { name: 'Docker Prune', description: 'Nettoyer Docker', icon: '🧹', color: 'blue', category: 'docker', command: 'docker system prune -f', workingDirectory: '/home/pi' },

      // Système
      { name: 'Disk Usage', description: 'Voir l\'espace disque', icon: '💾', color: 'purple', category: 'system', command: 'df -h', workingDirectory: '/home/pi' },
      { name: 'Memory Usage', description: 'Voir l\'utilisation mémoire', icon: '🧠', color: 'purple', category: 'system', command: 'free -h', workingDirectory: '/home/pi' },
      { name: 'Top Processes', description: 'Voir les processus gourmands', icon: '⚡', color: 'purple', category: 'system', command: 'ps aux --sort=-%mem | head -10', workingDirectory: '/home/pi' },
      { name: 'Uptime', description: 'Voir le temps de fonctionnement', icon: '⏱️', color: 'purple', category: 'system', command: 'uptime', workingDirectory: '/home/pi' },
      { name: 'Reboot', description: 'Redémarrer le système', icon: '🔄', color: 'red', category: 'system', command: 'sudo reboot', workingDirectory: '/home/pi', requiresConfirmation: true }
    ];

    res.json({
      success: true,
      count: presets.length,
      data: presets
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des presets:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des presets'
    });
  }
});

module.exports = router;
