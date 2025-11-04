const express = require('express');
const router = express.Router();
const Workflow = require('../models/Workflow');
const WorkflowExecution = require('../models/WorkflowExecution');
const Device = require('../models/Device');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/workflows
 * @desc    Obtenir tous les workflows
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { category, tags, favorite } = req.query;

    const filter = {
      $or: [
        { createdBy: req.user._id },
        { isPublic: true }
      ],
      isActive: true
    };

    if (category) filter.category = category;
    if (tags) filter.tags = { $in: tags.split(',') };
    if (favorite === 'true') filter.isFavorite = true;

    const workflows = await Workflow.find(filter)
      .populate('createdBy', 'username')
      .populate('targetDevices', 'deviceName isOnline')
      .sort({ isFavorite: -1, runCount: -1 });

    res.json({
      success: true,
      count: workflows.length,
      data: workflows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des workflows:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des workflows'
    });
  }
});

/**
 * @route   GET /api/workflows/:id
 * @desc    Obtenir un workflow spécifique
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)
      .populate('createdBy', 'username email')
      .populate('targetDevices', 'deviceName machineId isOnline');

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow non trouvé'
      });
    }

    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du workflow'
    });
  }
});

/**
 * @route   POST /api/workflows
 * @desc    Créer un nouveau workflow
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const workflowData = {
      ...req.body,
      createdBy: req.user._id
    };

    const workflow = await Workflow.create(workflowData);

    res.status(201).json({
      success: true,
      data: workflow,
      message: 'Workflow créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du workflow'
    });
  }
});

/**
 * @route   PUT /api/workflows/:id
 * @desc    Mettre à jour un workflow
 * @access  Private
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow non trouvé'
      });
    }

    // Vérifier que l'utilisateur est le créateur ou admin
    if (workflow.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à modifier ce workflow'
      });
    }

    // Mettre à jour
    Object.assign(workflow, req.body);
    await workflow.save();

    res.json({
      success: true,
      data: workflow,
      message: 'Workflow mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du workflow'
    });
  }
});

/**
 * @route   DELETE /api/workflows/:id
 * @desc    Supprimer un workflow (soft delete)
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow non trouvé'
      });
    }

    // Vérifier que l'utilisateur est le créateur ou admin
    if (workflow.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à supprimer ce workflow'
      });
    }

    workflow.isActive = false;
    await workflow.save();

    res.json({
      success: true,
      message: 'Workflow supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du workflow'
    });
  }
});

/**
 * @route   POST /api/workflows/:id/execute
 * @desc    Exécuter un workflow
 * @access  Private
 */
router.post('/:id/execute', protect, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow non trouvé'
      });
    }

    const { deviceIds, executionMode = 'parallel' } = req.body;

    // Déterminer les appareils cibles
    let targetDeviceIds = deviceIds || workflow.targetDevices.map(d => d.toString());

    if (!targetDeviceIds || targetDeviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun appareil cible spécifié'
      });
    }

    // Vérifier que les appareils existent et sont en ligne
    const devices = await Device.find({
      _id: { $in: targetDeviceIds },
      isActive: true
    });

    if (devices.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun appareil valide trouvé'
      });
    }

    // Créer une exécution
    const execution = await WorkflowExecution.create({
      workflowId: workflow._id,
      workflowName: workflow.name,
      executedBy: req.user._id,
      executionMode,
      devices: devices.map(device => ({
        deviceId: device._id,
        deviceName: device.deviceName,
        status: 'pending'
      }))
    });

    // Émettre l'événement aux agents (Socket.IO)
    const agentNamespace = global.agentNamespace;

    // Exécuter le workflow sur chaque appareil
    for (const deviceData of execution.devices) {
      const device = devices.find(d => d._id.toString() === deviceData.deviceId.toString());

      if (!device || !device.isOnline) {
        deviceData.status = 'failed';
        deviceData.error = 'Appareil hors ligne';
        continue;
      }

      deviceData.status = 'running';
      deviceData.startedAt = new Date();

      // Envoyer les commandes à l'agent via Socket.IO
      const socketId = device.socketId;

      if (socketId && agentNamespace) {
        // Envoyer chaque étape du workflow
        for (const step of workflow.steps) {
          try {
            // Émettre la commande à l'agent
            agentNamespace.to(socketId).emit('execute_command', {
              executionId: execution._id,
              deviceId: device._id,
              stepName: step.name,
              command: step.command,
              directory: step.directory,
              timeout: step.timeout,
              continueOnError: step.continueOnError
            });
          } catch (error) {
            console.error(`Erreur lors de l'envoi de la commande à ${device.deviceName}:`, error);
          }
        }
      }
    }

    await execution.save();

    // Note: Les résultats seront mis à jour via Socket.IO
    // quand les agents renverront les résultats

    res.json({
      success: true,
      data: execution,
      message: 'Workflow lancé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'exécution du workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'exécution du workflow'
    });
  }
});

/**
 * @route   GET /api/workflows/:id/executions
 * @desc    Obtenir l'historique des exécutions d'un workflow
 * @access  Private
 */
router.get('/:id/executions', protect, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;

    const executions = await WorkflowExecution.find({
      workflowId: req.params.id
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('executedBy', 'username');

    const total = await WorkflowExecution.countDocuments({
      workflowId: req.params.id
    });

    res.json({
      success: true,
      count: executions.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: executions
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des exécutions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des exécutions'
    });
  }
});

/**
 * @route   POST /api/workflows/:id/favorite
 * @desc    Marquer/démarquer comme favori
 * @access  Private
 */
router.post('/:id/favorite', protect, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow non trouvé'
      });
    }

    workflow.isFavorite = !workflow.isFavorite;
    await workflow.save();

    res.json({
      success: true,
      data: workflow,
      message: workflow.isFavorite ? 'Ajouté aux favoris' : 'Retiré des favoris'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des favoris:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des favoris'
    });
  }
});

/**
 * @route   GET /api/workflows/templates/list
 * @desc    Obtenir les templates pré-configurés
 * @access  Private
 */
router.get('/templates/list', protect, async (req, res) => {
  try {
    const templates = [
      {
        name: 'Déployer Bot Discord',
        description: 'Git pull + npm install + pm2 restart',
        icon: '🤖',
        category: 'deployment',
        steps: [
          { name: 'Git Pull', command: 'git pull origin main', directory: '/home/pi/discord-bot' },
          { name: 'Install Dependencies', command: 'npm install', directory: '/home/pi/discord-bot' },
          { name: 'Restart PM2', command: 'pm2 restart discord-bot', directory: '/home/pi/discord-bot' }
        ]
      },
      {
        name: 'Déployer Site Web',
        description: 'Git pull + npm install + build + pm2 restart',
        icon: '🌐',
        category: 'deployment',
        steps: [
          { name: 'Git Pull', command: 'git pull origin main', directory: '/home/pi/website' },
          { name: 'Install Dependencies', command: 'npm install', directory: '/home/pi/website' },
          { name: 'Build', command: 'npm run build', directory: '/home/pi/website' },
          { name: 'Restart Server', command: 'pm2 restart website', directory: '/home/pi/website' }
        ]
      },
      {
        name: 'Update Système',
        description: 'apt update + apt upgrade + reboot',
        icon: '🔄',
        category: 'maintenance',
        steps: [
          { name: 'Update Package List', command: 'sudo apt update', directory: '/home/pi' },
          { name: 'Upgrade Packages', command: 'sudo apt upgrade -y', directory: '/home/pi' },
          { name: 'Reboot', command: 'sudo reboot', directory: '/home/pi', continueOnError: true }
        ]
      },
      {
        name: 'Backup MongoDB',
        description: 'Exporter la base de données MongoDB',
        icon: '💾',
        category: 'backup',
        steps: [
          { name: 'Create Backup Dir', command: 'mkdir -p ~/backups', directory: '/home/pi' },
          { name: 'Dump Database', command: 'mongodump --out ~/backups/mongodb-$(date +%Y%m%d)', directory: '/home/pi' },
          { name: 'Compress Backup', command: 'tar -czf ~/backups/mongodb-$(date +%Y%m%d).tar.gz ~/backups/mongodb-$(date +%Y%m%d)', directory: '/home/pi' }
        ]
      },
      {
        name: 'Restart Tous les Bots',
        description: 'Redémarre tous les processus PM2',
        icon: '🔃',
        category: 'maintenance',
        steps: [
          { name: 'Restart All PM2', command: 'pm2 restart all', directory: '/home/pi' },
          { name: 'Save PM2 List', command: 'pm2 save', directory: '/home/pi' }
        ]
      },
      {
        name: 'Clean Disk Space',
        description: 'Nettoyer l\'espace disque',
        icon: '🧹',
        category: 'maintenance',
        steps: [
          { name: 'Clean APT Cache', command: 'sudo apt clean', directory: '/home/pi' },
          { name: 'Remove Old Kernels', command: 'sudo apt autoremove -y', directory: '/home/pi' },
          { name: 'Clear Logs', command: 'sudo journalctl --vacuum-time=7d', directory: '/home/pi' }
        ]
      }
    ];

    res.json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des templates:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des templates'
    });
  }
});

module.exports = router;
