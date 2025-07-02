// Emplacement: /home/pi/raspberry-pi-manager/backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Créer un nouvel utilisateur
// @access  Public (pour le premier utilisateur seulement, sinon admin requis)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Vérifier si c'est le premier utilisateur
    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    // Si ce n'est pas le premier utilisateur, vérifier l'authentification admin
    if (!isFirstUser) {
      // Vérifier si une inscription publique est autorisée ou si c'est un admin
      const authHeader = req.header('Authorization');
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const decoded = jwt.verify(token, config.JWT_SECRET);
          const authUser = await User.findById(decoded.id);
          
          if (!authUser || authUser.role !== 'admin') {
            return res.status(403).json({
              success: false,
              message: 'Seuls les administrateurs peuvent créer de nouveaux comptes'
            });
          }
        } catch (authError) {
          return res.status(401).json({
            success: false,
            message: 'Token invalide'
          });
        }
      } else {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise. Seul le premier utilisateur peut s\'inscrire librement.'
        });
      }
    }

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir tous les champs requis'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email ou nom d\'utilisateur existe déjà'
      });
    }

    // Créer l'utilisateur (premier utilisateur = admin automatiquement)
    const user = await User.create({
      username,
      email,
      password,
      role: isFirstUser ? 'admin' : (role || 'user')
    });

    // Générer le token seulement pour le premier utilisateur (inscription publique)
    let token = null;
    if (isFirstUser) {
      token = jwt.sign(
        { id: user._id },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRE }
      );
    }

    res.status(201).json({
      success: true,
      message: isFirstUser 
        ? 'Premier administrateur créé avec succès ! Vous êtes maintenant connecté.' 
        : 'Utilisateur créé avec succès',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      isFirstUser
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'inscription'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Connexion utilisateur
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir nom d\'utilisateur et mot de passe'
      });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    // Vérifier le mot de passe
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    // Mettre à jour la dernière connexion
    user.lastLogin = new Date();
    await user.save();

    // Générer le token
    const tokenExpire = rememberMe ? '7d' : '1d';
    const token = jwt.sign(
      { id: user._id },
      config.JWT_SECRET,
      { expiresIn: tokenExpire }
    );

    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la connexion'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Obtenir l'utilisateur actuel
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        lastLogin: req.user.lastLogin
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;