// Emplacement: /home/pi/raspberry-pi-manager/backend/server.js
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
const userRoutes = require('./routes/users');
const deviceRoutes = require('./routes/devices');
const alertRoutes = require('./routes/alerts');
const workflowRoutes = require('./routes/workflows');
const quickActionRoutes = require('./routes/quickActions');

// Importer les modèles
const Device = require('./models/Device');
const Metrics = require('./models/Metrics');
const Alert = require('./models/Alert');
const WorkflowExecution = require('./models/WorkflowExecution');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  },
  // Utiliser les transports par défaut
  transports: ['websocket', 'polling']
});

// Connecter à la base de données
connectDB();

// Middleware de sécurité
app.use(helmet({
  contentSecurityPolicy: false // Désactivé pour le développement
}));

// CORS - Configuration permissive pour le développement
const corsOptions = {
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origine (comme les apps mobiles ou curl)
    if (!origin) return callback(null, true);

    // En développement, autoriser localhost sur tous les ports
    if (config.NODE_ENV === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }

    // Sinon, vérifier la FRONTEND_URL
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000"
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // En dev, autoriser quand même
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 heures
};

app.use(cors(corsOptions));

// Préflight pour toutes les routes
app.options('*', cors(corsOptions));

// Rate limiting - Plus permissif en développement
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.NODE_ENV === 'development' ? 1000 : 100, // Beaucoup plus en dev
  message: 'Trop de requêtes depuis cette IP, réessayez plus tard.',
  skip: (req) => config.NODE_ENV === 'development' // Désactiver en dev
});
app.use('/api/', limiter);

// Rate limiting pour les routes d'authentification - Plus permissif en développement
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.NODE_ENV === 'development' ? 100 : 5, // Beaucoup plus en dev
  skipSuccessfulRequests: true,
  skip: (req) => config.NODE_ENV === 'development' // Désactiver en dev
});
app.use('/api/auth/login', authLimiter);

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
app.use('/api/users', userRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/quick-actions', quickActionRoutes);

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

// ============================================
// SOCKET.IO - CONFIGURATION
// ============================================

// Namespace pour les clients web (dashboard)
const clientNamespace = io.of('/client');

// Configuration Socket.IO pour les utilisateurs du dashboard
clientNamespace.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Token manquant'));
    }
    const decoded = jwt.verify(token, config.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    next(new Error('Authentification socket échouée'));
  }
});

clientNamespace.on('connection', (socket) => {
  console.log(`[CLIENT] Utilisateur connecté: ${socket.userId}`);

  // Rejoindre une salle de device pour recevoir les mises à jour
  socket.on('subscribe-device', (deviceId) => {
    socket.join(`device-${deviceId}`);
    console.log(`[CLIENT] Utilisateur ${socket.userId} suit le device ${deviceId}`);
  });

  socket.on('unsubscribe-device', (deviceId) => {
    socket.leave(`device-${deviceId}`);
    console.log(`[CLIENT] Utilisateur ${socket.userId} ne suit plus le device ${deviceId}`);
  });

  // Rejoindre une salle de projet pour les logs
  socket.on('join-project', (projectId) => {
    socket.join(`project-${projectId}`);
    console.log(`[CLIENT] Utilisateur ${socket.userId} a rejoint le projet ${projectId}`);
  });

  socket.on('leave-project', (projectId) => {
    socket.leave(`project-${projectId}`);
    console.log(`[CLIENT] Utilisateur ${socket.userId} a quitté le projet ${projectId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[CLIENT] Utilisateur déconnecté: ${socket.userId}`);
  });
});

// ============================================
// NAMESPACE POUR LES AGENTS RASPBERRY PI
// ============================================

const agentNamespace = io.of('/agent');

// Authentification des agents via API Key
agentNamespace.use(async (socket, next) => {
  try {
    const { apiKey, machineId, deviceName } = socket.handshake.auth;

    if (!apiKey) {
      return next(new Error('API Key manquante'));
    }

    if (!machineId) {
      return next(new Error('Machine ID manquant'));
    }

    // Vérifier si l'appareil existe avec cette API Key
    let device = await Device.findOne({ apiKey, isActive: true });

    if (!device) {
      // Vérifier si l'appareil existe avec ce machineId
      device = await Device.findOne({ machineId, isActive: true });

      if (device) {
        // L'appareil existe mais avec une autre API Key, mettre à jour
        console.log(`[AGENT] Mise à jour API Key pour: ${machineId}`);
        device.apiKey = apiKey;
        await device.save();
      } else {
        // Si l'appareil n'existe pas du tout, créer automatiquement
        console.log(`[AGENT] 🆕 Nouvel appareil détecté: ${machineId} - ${deviceName}`);
        device = await Device.create({
          machineId,
          deviceName: deviceName || machineId,
          apiKey,
          isOnline: false
        });
        console.log(`[AGENT] ✅ Appareil créé avec succès: ${device._id}`);
      }
    }

    socket.deviceId = device._id.toString();
    socket.machineId = device.machineId;
    socket.deviceName = device.deviceName;

    next();
  } catch (err) {
    console.error('[AGENT] Erreur d\'authentification:', err);
    next(new Error('Authentification échouée: ' + err.message));
  }
});

// Gestion des connexions des agents
agentNamespace.on('connection', async (socket) => {
  console.log(`[AGENT] 🍓 Agent connecté: ${socket.deviceName} (${socket.machineId})`);

  try {
    // Marquer l'appareil comme en ligne
    const device = await Device.findById(socket.deviceId);
    if (device) {
      await device.setOnline(socket.id);

      // Notifier les clients web
      clientNamespace.to(`device-${socket.deviceId}`).emit('device-status', {
        deviceId: socket.deviceId,
        isOnline: true,
        timestamp: new Date()
      });

      // Broadcast à tous les clients web
      clientNamespace.emit('device-connected', {
        deviceId: socket.deviceId,
        deviceName: socket.deviceName,
        machineId: socket.machineId
      });
    }
  } catch (error) {
    console.error('[AGENT] Erreur lors de la mise à jour du statut:', error);
  }

  // Enregistrement de l'appareil avec informations statiques
  socket.on('device_register', async (registrationData) => {
    try {
      console.log(`[AGENT] Enregistrement de l'appareil: ${socket.deviceName}`);

      // Parser les données si elles arrivent comme une chaîne JSON
      let data;
      if (typeof registrationData === 'string') {
        try {
          data = JSON.parse(registrationData);
          console.log(`[AGENT] 📦 Données d'enregistrement JSON parsées pour ${socket.deviceName}`);
        } catch (parseError) {
          console.error('[AGENT] ❌ Erreur de parsing JSON:', parseError.message);
          return;
        }
      } else {
        data = registrationData;
      }

      const device = await Device.findById(socket.deviceId);
      if (device) {
        console.log(`[AGENT] 📊 Type de data.disk: ${typeof data.disk}, isArray: ${Array.isArray(data.disk)}`);

        // Parser disk si c'est une string
        let diskParsed = data.disk || [];
        if (typeof diskParsed === 'string') {
          console.log(`[AGENT] ⚠️ systemInfo.disk est une string, parsing...`);
          try {
            diskParsed = JSON.parse(diskParsed);
            console.log(`[AGENT] ✅ systemInfo.disk parsé avec succès, longueur: ${diskParsed.length}`);
          } catch (e) {
            console.error(`[AGENT] ❌ Erreur parsing systemInfo.disk:`, e.message);
            diskParsed = [];
          }
        }

        device.systemInfo = {
          system: data.system || {},
          os: data.os || {},
          cpu: data.cpu || {},
          memory: data.memory || {},
          // S'assurer que disk est un tableau
          disk: Array.isArray(diskParsed) ? diskParsed : []
        };
        device.deviceName = data.deviceName || device.deviceName;

        console.log(`[AGENT] 💾 Sauvegarde des systemInfo...`);
        await device.save();

        console.log(`[AGENT] ✅ Informations système mises à jour pour ${socket.deviceName}`);
      }
    } catch (error) {
      console.error('[AGENT] ❌ Erreur lors de l\'enregistrement:', error);
    }
  });

  // Réception des métriques
  socket.on('metrics', async (metricsData) => {
    console.log(`[AGENT] 🎯 ========== DÉBUT TRAITEMENT MÉTRIQUES ${socket.deviceName} ==========`);
    try {
      console.log(`[AGENT] 1️⃣ Recherche du device ID: ${socket.deviceId}`);
      const device = await Device.findById(socket.deviceId);
      if (!device) {
        console.error(`[AGENT] ❌ Device non trouvé: ${socket.deviceId}`);
        return;
      }
      console.log(`[AGENT] ✅ Device trouvé: ${device.deviceName}`);

      // Parser les données si elles arrivent comme une chaîne JSON
      console.log(`[AGENT] 2️⃣ Type de données reçues: ${typeof metricsData}`);
      let metrics;
      if (typeof metricsData === 'string') {
        try {
          metrics = JSON.parse(metricsData);
          console.log(`[AGENT] 📦 Métriques JSON parsées pour ${socket.deviceName}`);
        } catch (parseError) {
          console.error('[AGENT] ❌ Erreur de parsing JSON:', parseError.message);
          console.error('[AGENT] ❌ Données brutes:', metricsData.substring(0, 200));
          return;
        }
      } else if (typeof metricsData === 'object') {
        metrics = metricsData;
        console.log(`[AGENT] ✅ Métriques reçues comme objet`);
      } else {
        console.error('[AGENT] ❌ Type de métriques invalide:', typeof metricsData);
        return;
      }

      console.log(`[AGENT] 3️⃣ Métriques brutes - CPU: ${metrics.cpu?.usage}%, RAM: ${metrics.memory?.usagePercent}%, Temp: ${metrics.temperature?.main}°C`);

      // Parser récursivement les propriétés qui pourraient être des chaînes JSON
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

      // Validation et nettoyage des types avec parsing récursif
      console.log(`[AGENT] 4️⃣ Nettoyage des métriques...`);
      const cleanMetrics = {
        ...metrics,
        disk: Array.isArray(parseIfString(metrics.disk)) ? parseIfString(metrics.disk) : [],
        network: Array.isArray(parseIfString(metrics.network)) ? parseIfString(metrics.network) : [],
        cpu: {
          ...metrics.cpu,
          loadAvg: Array.isArray(parseIfString(metrics.cpu?.loadAvg)) ? parseIfString(metrics.cpu.loadAvg) : []
        }
      };

      // Log pour debugging
      console.log(`[AGENT] ✅ Métriques nettoyées - CPU: ${cleanMetrics.cpu.usage}% | RAM: ${cleanMetrics.memory.usagePercent}% | Disks: ${cleanMetrics.disk.length}`);
      console.log(`[AGENT] 📊 Structure: cpu=${!!cleanMetrics.cpu}, memory=${!!cleanMetrics.memory}, disk=${Array.isArray(cleanMetrics.disk)}, network=${Array.isArray(cleanMetrics.network)}`);
      console.log(`[AGENT] 📊 Timestamp: ${cleanMetrics.timestamp}, uptime: ${cleanMetrics.uptime}`);

      // Mettre à jour les dernières métriques dans le device
      console.log(`[AGENT] 5️⃣ Mise à jour de Device.lastMetrics...`);
      const beforeUpdate = JSON.stringify(device.lastMetrics).substring(0, 100);
      console.log(`[AGENT] 📝 Avant updateMetrics: ${beforeUpdate}...`);

      await device.updateMetrics(cleanMetrics);

      // Recharger le device pour vérifier
      const updatedDevice = await Device.findById(socket.deviceId);
      console.log(`[AGENT] ✅ Device.lastMetrics mis à jour - CPU: ${updatedDevice.lastMetrics?.cpu?.usage}%`);
      console.log(`[AGENT] 📊 lastMetrics existe: ${!!updatedDevice.lastMetrics}, clés: ${updatedDevice.lastMetrics ? Object.keys(updatedDevice.lastMetrics).join(', ') : 'aucune'}`);

      // Stocker les métriques dans l'historique
      console.log(`[AGENT] 6️⃣ Création du document Metrics pour historique...`);
      const metricsDoc = new Metrics({
        deviceId: socket.deviceId,
        machineId: socket.machineId,
        timestamp: new Date(cleanMetrics.timestamp),
        cpu: {
          usage: cleanMetrics.cpu?.usage,
          loadAvg: cleanMetrics.cpu?.loadAvg
        },
        temperature: {
          main: cleanMetrics.temperature?.main,
          max: cleanMetrics.temperature?.max
        },
        memory: {
          total: cleanMetrics.memory?.total,
          used: cleanMetrics.memory?.used,
          usagePercent: cleanMetrics.memory?.usagePercent
        },
        disk: cleanMetrics.disk?.[0] ? {
          size: cleanMetrics.disk[0].size,
          used: cleanMetrics.disk[0].used,
          usagePercent: cleanMetrics.disk[0].usagePercent,
          mount: cleanMetrics.disk[0].mount
        } : undefined,
        network: {
          rx_sec: cleanMetrics.network?.reduce((sum, net) => sum + (net.rx_sec || 0), 0) || 0,
          tx_sec: cleanMetrics.network?.reduce((sum, net) => sum + (net.tx_sec || 0), 0) || 0
        },
        processes: {
          all: cleanMetrics.processes?.all,
          running: cleanMetrics.processes?.running
        },
        uptime: cleanMetrics.uptime
      });

      console.log(`[AGENT] 📊 Metrics doc créé - CPU: ${metricsDoc.cpu.usage}%, deviceId: ${metricsDoc.deviceId}`);
      console.log(`[AGENT] 💾 Sauvegarde dans MongoDB...`);

      const savedMetrics = await metricsDoc.save();

      console.log(`[AGENT] ✅ Metrics sauvegardé dans MongoDB - ID: ${savedMetrics._id}`);
      console.log(`[AGENT] ✅ Vérification: CPU=${savedMetrics.cpu.usage}%, RAM=${savedMetrics.memory.usagePercent}%`);

      // Vérifier les alertes
      const alerts = device.checkAlerts();

      for (const alertData of alerts) {
        const { alert, created } = await Alert.createIfNotExists({
          deviceId: device._id,
          machineId: device.machineId,
          deviceName: device.deviceName,
          type: alertData.type,
          severity: alertData.severity,
          message: alertData.message,
          value: alertData.value,
          threshold: alertData.threshold,
          metadata: alertData.mount ? { mount: alertData.mount } : {}
        });

        // Si c'est une nouvelle alerte, notifier les clients
        if (created) {
          console.log(`[ALERT] 🚨 Nouvelle alerte pour ${device.deviceName}: ${alertData.message}`);
          clientNamespace.emit('new-alert', {
            alert,
            device: {
              id: device._id,
              name: device.deviceName,
              machineId: device.machineId
            }
          });
        }
      }

      // Si aucune alerte, résoudre automatiquement les alertes du même type
      const alertTypes = ['cpu', 'temperature', 'memory', 'disk'];
      for (const type of alertTypes) {
        const hasAlert = alerts.some(a => a.type === type);
        if (!hasAlert) {
          await Alert.autoResolve(device._id, type);
        }
      }

      // Envoyer les métriques en temps réel aux clients web
      console.log(`[AGENT] 7️⃣ Préparation du broadcast Socket.IO...`);

      // Recharger à nouveau pour être sûr d'avoir les dernières données
      const finalDevice = await Device.findById(socket.deviceId);

      const updateData = {
        deviceId: socket.deviceId,
        metrics: finalDevice.lastMetrics,
        alerts: alerts.length > 0 ? alerts : null
      };

      console.log(`[AGENT] 📊 Données à broadcaster:`);
      console.log(`[AGENT]   - deviceId: ${updateData.deviceId}`);
      console.log(`[AGENT]   - metrics existe: ${!!updateData.metrics}`);
      console.log(`[AGENT]   - metrics.cpu: ${updateData.metrics?.cpu?.usage}%`);
      console.log(`[AGENT]   - metrics.memory: ${updateData.metrics?.memory?.usagePercent}%`);
      console.log(`[AGENT]   - metrics.temperature: ${updateData.metrics?.temperature?.main}°C`);
      console.log(`[AGENT]   - alerts: ${updateData.alerts?.length || 0}`);

      // Compter les clients connectés dans la room
      const room = `device-${socket.deviceId}`;
      const socketsInRoom = await clientNamespace.in(room).fetchSockets();
      console.log(`[AGENT] 👥 Clients connectés dans room ${room}: ${socketsInRoom.length}`);

      console.log(`[AGENT] 📤 Émission de 'metrics-update'...`);
      clientNamespace.to(room).emit('metrics-update', updateData);
      console.log(`[AGENT] ✅ 'metrics-update' émis avec succès`);

      console.log(`[AGENT] 🎯 ========== FIN TRAITEMENT MÉTRIQUES ${socket.deviceName} ==========\n`);

    } catch (error) {
      console.error(`[AGENT] ❌❌❌ ERREUR CRITIQUE lors du traitement des métriques ❌❌❌`);
      console.error(`[AGENT] Erreur:`, error);
      console.error(`[AGENT] Stack:`, error.stack);
    }
  });

  // Réponse à une commande
  socket.on('command_result', (data) => {
    console.log(`[AGENT] Résultat de commande reçu de ${socket.deviceName}`);
    clientNamespace.emit('command-result', {
      deviceId: socket.deviceId,
      ...data
    });
  });

  // Ping/Pong pour vérifier la connexion
  socket.on('pong', (data) => {
    // Mise à jour du lastSeen
    Device.findByIdAndUpdate(socket.deviceId, { lastSeen: new Date() }).catch(err => {
      console.error('[AGENT] Erreur lors de la mise à jour de lastSeen:', err);
    });
  });

  // Déconnexion de l'agent
  socket.on('device_disconnect', async () => {
    console.log(`[AGENT] Agent demande la déconnexion: ${socket.deviceName}`);
  });

  socket.on('disconnect', async (reason) => {
    console.log(`[AGENT] 🍓 Agent déconnecté: ${socket.deviceName} - Raison: ${reason}`);

    try {
      const device = await Device.findById(socket.deviceId);
      if (device) {
        await device.setOffline();

        // Notifier les clients web
        clientNamespace.to(`device-${socket.deviceId}`).emit('device-status', {
          deviceId: socket.deviceId,
          isOnline: false,
          timestamp: new Date()
        });

        clientNamespace.emit('device-disconnected', {
          deviceId: socket.deviceId,
          deviceName: socket.deviceName,
          machineId: socket.machineId
        });
      }
    } catch (error) {
      console.error('[AGENT] Erreur lors de la déconnexion:', error);
    }
  });
});

// Ping périodique vers les agents pour vérifier la connexion
setInterval(() => {
  agentNamespace.emit('ping');
}, 30000); // Toutes les 30 secondes

// Rendre les namespaces disponibles globalement
global.io = io;
global.clientNamespace = clientNamespace;
global.agentNamespace = agentNamespace;

const PORT = config.PORT;

server.listen(PORT, () => {
  console.log(`🚀 Serveur Raspberry Pi Manager démarré sur le port ${PORT}`);
  console.log(`📊 Environnement: ${config.NODE_ENV}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
});
