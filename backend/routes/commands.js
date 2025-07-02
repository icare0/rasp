const express = require('express');
const Project = require('../models/Project');
const Log = require('../models/Log');
const { auth } = require('../middleware/auth');
const CommandExecutor = require('../utils/commandExecutor');

const router = express.Router();

// @route   POST /api/commands/start/:projectId
// @desc    Démarrer un projet
// @access  Private
router.post('/start/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    if (project.isRunning) {
      return res.status(400).json({
        success: false,
        message: 'Le projet est déjà en cours d\'exécution'
      });
    }

    const result = await CommandExecutor.executeCommand(
      project.commands.start,
      project.directory,
      req.user._id,
      project._id
    );

    // Mettre à jour le statut du projet
    project.isRunning = true;
    project.lastStarted = new Date();
    await project.save();

    res.json({
      success: true,
      message: 'Projet démarré avec succès',
      result
    });

  } catch (error) {
    console.error('Erreur lors du démarrage du projet:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors du démarrage du projet'
    });
  }
});

// @route   POST /api/commands/stop/:projectId
// @desc    Arrêter un projet
// @access  Private
router.post('/stop/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    if (!project.isRunning) {
      return res.status(400).json({
        success: false,
        message: 'Le projet n\'est pas en cours d\'exécution'
      });
    }

    let result;
    
    // Utiliser la commande stop si définie, sinon essayer de tuer le processus
    if (project.commands.stop) {
      result = await CommandExecutor.executeCommand(
        project.commands.stop,
        project.directory,
        req.user._id,
        project._id
      );
    } else {
      result = await CommandExecutor.killProcess(
        project.commands.start,
        project.directory,
        req.user._id
      );
    }

    // Mettre à jour le statut du projet
    project.isRunning = false;
    project.lastStopped = new Date();
    await project.save();

    res.json({
      success: true,
      message: 'Projet arrêté avec succès',
      result
    });

  } catch (error) {
    console.error('Erreur lors de l\'arrêt du projet:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'arrêt du projet'
    });
  }
});

// @route   POST /api/commands/restart/:projectId
// @desc    Redémarrer un projet
// @access  Private
router.post('/restart/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    let result;

    // Utiliser la commande restart si définie
    if (project.commands.restart) {
      result = await CommandExecutor.executeCommand(
        project.commands.restart,
        project.directory,
        req.user._id,
        project._id
      );
    } else {
      // Sinon arrêter puis démarrer
      if (project.isRunning) {
        if (project.commands.stop) {
          await CommandExecutor.executeCommand(
            project.commands.stop,
            project.directory,
            req.user._id,
            project._id
          );
        } else {
          await CommandExecutor.killProcess(
            project.commands.start,
            project.directory,
            req.user._id
          );
        }
        
        // Attendre un peu avant de redémarrer
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      result = await CommandExecutor.executeCommand(
        project.commands.start,
        project.directory,
        req.user._id,
        project._id
      );
    }

    // Mettre à jour le statut du projet
    project.isRunning = true;
    project.lastStarted = new Date();
    await project.save();

    res.json({
      success: true,
      message: 'Projet redémarré avec succès',
      result
    });

  } catch (error) {
    console.error('Erreur lors du redémarrage du projet:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors du redémarrage du projet'
    });
  }
});

// @route   GET /api/commands/status/:projectId
// @desc    Vérifier le statut d'un projet
// @access  Private
router.get('/status/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    // Vérifier le statut réel
    const isRunning = await CommandExecutor.checkProcessStatus(
      project.commands.start,
      project.directory
    );

    // Mettre à jour si nécessaire
    if (project.isRunning !== isRunning) {
      project.isRunning = isRunning;
      await project.save();
    }

    res.json({
      success: true,
      status: {
        isRunning,
        lastStarted: project.lastStarted,
        lastStopped: project.lastStopped
      }
    });

  } catch (error) {
    console.error('Erreur lors de la vérification du statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du statut'
    });
  }
});

// @route   POST /api/commands/execute
// @desc    Exécuter une commande personnalisée
// @access  Private
router.post('/execute', auth, async (req, res) => {
  try {
    const { command, directory, projectId } = req.body;

    if (!command || !directory) {
      return res.status(400).json({
        success: false,
        message: 'Commande et répertoire requis'
      });
    }

    const result = await CommandExecutor.executeCommand(
      command,
      directory,
      req.user._id,
      projectId
    );

    res.json({
      success: true,
      message: 'Commande exécutée avec succès',
      result
    });

  } catch (error) {
    console.error('Erreur lors de l\'exécution de la commande:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'exécution de la commande'
    });
  }
});

// @route   GET /api/commands/logs/:projectId
// @desc    Obtenir les logs d'un projet
// @access  Private
router.get('/logs/:projectId', auth, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const logs = await Log.find({ projectId: req.params.projectId })
      .populate('executedBy', 'username')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const totalLogs = await Log.countDocuments({ projectId: req.params.projectId });

    res.json({
      success: true,
      logs,
      pagination: {
        total: totalLogs,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: totalLogs > (parseInt(offset) + parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des logs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des logs'
    });
  }
});

// @route   GET /api/commands/logs
// @desc    Obtenir tous les logs récents
// @access  Private
router.get('/logs', auth, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const logs = await Log.find()
      .populate('executedBy', 'username')
      .populate('projectId', 'name')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      logs
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des logs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des logs'
    });
  }
});

module.exports = router;