// Emplacement: /home/pi/raspberry-pi-manager/backend/routes/projects.js
const express = require('express');
const Project = require('../models/Project');
const { auth, adminAuth } = require('../middleware/auth');
const CommandExecutor = require('../utils/commandExecutor');

const router = express.Router();

// @route   GET /api/projects
// @desc    Obtenir tous les projets
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('createdBy', 'username')
      .sort({ name: 1 });

    // Vérifier le statut de chaque projet
    const projectsWithStatus = await Promise.all(
      projects.map(async (project) => {
        try {
          const isRunning = await CommandExecutor.checkProcessStatus(
            project.commands.start,
            project.directory
          );
          
          if (project.isRunning !== isRunning) {
            project.isRunning = isRunning;
            await project.save();
          }
          
          return project;
        } catch (error) {
          console.error(`Erreur vérification statut projet ${project.name}:`, error);
          return project;
        }
      })
    );

    res.json({
      success: true,
      projects: projectsWithStatus
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des projets:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des projets'
    });
  }
});

// @route   POST /api/projects
// @desc    Créer un nouveau projet
// @access  Private (Admin uniquement)
router.post('/', adminAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      directory,
      commands,
      autoStart,
      icon,
      category
    } = req.body;

    // Validation
    if (!name || !directory || !commands?.start) {
      return res.status(400).json({
        success: false,
        message: 'Nom, répertoire et commande de démarrage requis'
      });
    }

    // Vérifier que le répertoire est autorisé
    if (!CommandExecutor.validateDirectory(directory)) {
      return res.status(400).json({
        success: false,
        message: 'Répertoire non autorisé'
      });
    }

    // Vérifier que le répertoire existe
    if (!(await CommandExecutor.directoryExists(directory))) {
      return res.status(400).json({
        success: false,
        message: 'Le répertoire spécifié n\'existe pas'
      });
    }

    // Créer le projet
    const project = await Project.create({
      name,
      description,
      directory,
      commands,
      autoStart: autoStart || false,
      icon: icon || '🖥️',
      category: category || 'other',
      createdBy: req.user._id
    });

    await project.populate('createdBy', 'username');

    res.status(201).json({
      success: true,
      message: 'Projet créé avec succès',
      project
    });

  } catch (error) {
    console.error('Erreur lors de la création du projet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du projet'
    });
  }
});

// @route   PUT /api/projects/:id
// @desc    Modifier un projet
// @access  Private (Admin uniquement)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    const {
      name,
      description,
      directory,
      commands,
      autoStart,
      icon,
      category
    } = req.body;

    // Validation du répertoire si modifié
    if (directory && directory !== project.directory) {
      if (!CommandExecutor.validateDirectory(directory)) {
        return res.status(400).json({
          success: false,
          message: 'Répertoire non autorisé'
        });
      }

      if (!(await CommandExecutor.directoryExists(directory))) {
        return res.status(400).json({
          success: false,
          message: 'Le répertoire spécifié n\'existe pas'
        });
      }
    }

    // Mettre à jour le projet
    Object.assign(project, {
      name: name || project.name,
      description: description !== undefined ? description : project.description,
      directory: directory || project.directory,
      commands: commands || project.commands,
      autoStart: autoStart !== undefined ? autoStart : project.autoStart,
      icon: icon || project.icon,
      category: category || project.category
    });

    await project.save();
    await project.populate('createdBy', 'username');

    res.json({
      success: true,
      message: 'Projet mis à jour avec succès',
      project
    });

  } catch (error) {
    console.error('Erreur lors de la modification du projet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du projet'
    });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Supprimer un projet
// @access  Private (Admin uniquement)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    // Arrêter le projet s'il est en cours d'exécution
    if (project.isRunning && project.commands.stop) {
      try {
        await CommandExecutor.executeCommand(
          project.commands.stop,
          project.directory,
          req.user._id,
          project._id
        );
      } catch (error) {
        console.error('Erreur lors de l\'arrêt du projet avant suppression:', error);
      }
    }

    await Project.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Projet supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression du projet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du projet'
    });
  }
});

module.exports = router;