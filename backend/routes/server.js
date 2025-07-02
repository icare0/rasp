const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const connectDB = require('./config/database');
const config = require('./config/config');

// Importer les routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const commandRoutes = require('./routes/commands');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Connecter à la base de données
connectDB();

// Middleware de sécurité
app.use(helmet({
  contentSecurityPolicy: false // Désactivé pour le développement
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite chaque IP à 100 requêtes par fenêtre
  message: 'Trop de requêtes depuis cette IP, réessayez plus tard.'
});
app.use('/api/', limiter);

// Rate limiting strict pour les routes d'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limite à 5 tentatives de connexion par IP
  skipSuccessfulRequests: true
});
app.use('/api/auth/login', authLimiter);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Parser JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware pour logger les requêtes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/commands', commandRoutes);

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Serveur Raspberry Pi Manager opérationnel',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Middleware de gestion d'erreur global
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({
    success: false,
    message: config.NODE_ENV === 'production' 
      ? 'Erreur interne du serveur' 
      : err.message
  });
});

// Gestion des routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Configuration Socket.IO pour les logs en temps réel
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, config.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentification socket échouée'));
  }
});

io.on('connection', (socket) => {
  console.log(`Utilisateur connecté via Socket.IO: ${socket.userId}`);

  socket.on('join-project', (projectId) => {
    socket.join(`project-${projectId}`);
    console.log(`Utilisateur ${socket.userId} a rejoint le projet ${projectId}`);
  });

  socket.on('leave-project', (projectId) => {
    socket.leave(`project-${projectId}`);
    console.log(`Utilisateur ${socket.userId} a quitté le projet ${projectId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Utilisateur déconnecté: ${socket.userId}`);
  });
});

// Rendre io disponible globalement pour les logs en temps réel
global.io = io;

const PORT = config.PORT;

server.listen(PORT, () => {
  console.log(`🚀 Serveur Raspberry Pi Manager démarré sur le port ${PORT}`);
  console.log(`📊 Environnement: ${config.NODE_ENV}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
});
