#!/usr/bin/env node

const io = require('socket.io-client');
const si = require('systeminformation');
const os = require('os');
const { machineIdSync } = require('node-machine-id');
require('dotenv').config();

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
const DEVICE_NAME = process.env.DEVICE_NAME || os.hostname();
const METRICS_INTERVAL = parseInt(process.env.METRICS_INTERVAL) || 5000;
const API_KEY = process.env.API_KEY || '';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Identifiant unique de la machine
let machineId;
try {
  machineId = machineIdSync();
} catch (error) {
  machineId = `fallback-${os.hostname()}-${Date.now()}`;
}

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Fonction de logging avec niveaux
const logLevels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = logLevels[LOG_LEVEL] || 2;

function log(level, message, data = null) {
  if (logLevels[level] > currentLevel) return;

  const timestamp = new Date().toISOString();
  const colorMap = { error: colors.red, warn: colors.yellow, info: colors.green, debug: colors.blue };
  const color = colorMap[level] || colors.reset;

  console.log(`${color}[${timestamp}] [${level.toUpperCase()}]${colors.reset} ${message}`);
  if (data) console.log(data);
}

// Connexion Socket.IO
let socket;
let metricsInterval;
let isConnected = false;

function connectToServer() {
  log('info', `🔌 Connexion au serveur: ${SERVER_URL}`);

  socket = io(`${SERVER_URL}/agent`, {
    auth: {
      apiKey: API_KEY,
      machineId: machineId,
      deviceName: DEVICE_NAME
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity
  });

  // Événements de connexion
  socket.on('connect', () => {
    isConnected = true;
    log('info', `✅ Connecté au serveur avec l'ID: ${socket.id}`);
    log('info', `📡 Machine ID: ${machineId}`);
    log('info', `🖥️  Nom de l'appareil: ${DEVICE_NAME}`);

    // Envoyer les informations d'enregistrement
    registerDevice();

    // Démarrer la collecte des métriques
    startMetricsCollection();
  });

  socket.on('disconnect', (reason) => {
    isConnected = false;
    log('warn', `❌ Déconnecté du serveur: ${reason}`);
    stopMetricsCollection();
  });

  socket.on('connect_error', (error) => {
    log('error', `🔴 Erreur de connexion: ${error.message}`);
  });

  socket.on('reconnect', (attemptNumber) => {
    log('info', `🔄 Reconnexion réussie après ${attemptNumber} tentative(s)`);
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    log('debug', `🔄 Tentative de reconnexion #${attemptNumber}...`);
  });

  // Événements personnalisés du serveur
  socket.on('command', async (data) => {
    log('info', `📨 Commande reçue: ${data.command}`);
    await executeCommand(data);
  });

  // Exécuter une commande (pour workflows et quick actions)
  socket.on('execute_command', async (data) => {
    log('info', `📨 Exécution de commande: ${data.stepName || data.actionName || 'Custom'}`);
    await executeWorkflowCommand(data);
  });

  socket.on('ping', () => {
    log('debug', '🏓 Ping reçu du serveur');
    socket.emit('pong', { machineId, timestamp: Date.now() });
  });

  socket.on('config_update', (config) => {
    log('info', '⚙️  Configuration mise à jour', config);
    // Appliquer la nouvelle configuration si nécessaire
  });
}

// Enregistrer l'appareil auprès du serveur
async function registerDevice() {
  try {
    const staticInfo = await getStaticDeviceInfo();
    socket.emit('device_register', {
      machineId,
      deviceName: DEVICE_NAME,
      ...staticInfo
    });
    log('info', '📝 Appareil enregistré auprès du serveur');
  } catch (error) {
    log('error', `Erreur lors de l'enregistrement: ${error.message}`);
  }
}

// Collecter les informations statiques de l'appareil
async function getStaticDeviceInfo() {
  try {
    const [system, osInfo, cpu, mem, disk] = await Promise.all([
      si.system(),
      si.osInfo(),
      si.cpu(),
      si.mem(),
      si.diskLayout()
    ]);

    return {
      system: {
        manufacturer: system.manufacturer,
        model: system.model,
        version: system.version,
        serial: system.serial,
        uuid: system.uuid
      },
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        codename: osInfo.codename,
        kernel: osInfo.kernel,
        arch: osInfo.arch,
        hostname: osInfo.hostname
      },
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        speed: cpu.speed,
        cores: cpu.cores,
        physicalCores: cpu.physicalCores,
        processors: cpu.processors
      },
      memory: {
        total: mem.total
      },
      disk: disk.map(d => ({
        name: d.name,
        type: d.type,
        size: d.size,
        interfaceType: d.interfaceType
      }))
    };
  } catch (error) {
    log('error', `Erreur lors de la collecte des infos statiques: ${error.message}`);
    return {};
  }
}

// Démarrer la collecte périodique des métriques
function startMetricsCollection() {
  if (metricsInterval) {
    clearInterval(metricsInterval);
  }

  log('info', `📊 Démarrage de la collecte des métriques (intervalle: ${METRICS_INTERVAL}ms)`);

  // Envoyer immédiatement
  collectAndSendMetrics();

  // Puis répéter à intervalle régulier
  metricsInterval = setInterval(() => {
    collectAndSendMetrics();
  }, METRICS_INTERVAL);
}

// Arrêter la collecte des métriques
function stopMetricsCollection() {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
    log('info', '⏸️  Collecte des métriques arrêtée');
  }
}

// Collecter et envoyer les métriques système
async function collectAndSendMetrics() {
  if (!isConnected) return;

  try {
    const startTime = Date.now();

    // Collecter toutes les métriques en parallèle
    const [
      cpuLoad,
      cpuTemp,
      mem,
      diskUsage,
      networkStats,
      processes,
      currentLoad
    ] = await Promise.all([
      si.currentLoad(),
      si.cpuTemperature(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.processes(),
      si.currentLoad()
    ]);

    const metrics = {
      machineId,
      timestamp: Date.now(),
      cpu: {
        usage: parseFloat(currentLoad.currentLoad.toFixed(2)),
        loadAvg: os.loadavg(),
        cores: cpuLoad.cpus.map(core => ({
          load: parseFloat(core.load.toFixed(2))
        }))
      },
      temperature: {
        main: cpuTemp.main || null,
        cores: cpuTemp.cores || [],
        max: cpuTemp.max || null
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        available: mem.available,
        usagePercent: parseFloat(((mem.used / mem.total) * 100).toFixed(2)),
        swapTotal: mem.swaptotal,
        swapUsed: mem.swapused,
        swapFree: mem.swapfree
      },
      disk: diskUsage.map(disk => ({
        fs: disk.fs,
        type: disk.type,
        size: disk.size,
        used: disk.used,
        available: disk.available,
        usagePercent: parseFloat(disk.use.toFixed(2)),
        mount: disk.mount
      })),
      network: networkStats.map(net => ({
        iface: net.iface,
        rx_bytes: net.rx_bytes,
        tx_bytes: net.tx_bytes,
        rx_sec: net.rx_sec,
        tx_sec: net.tx_sec,
        rx_dropped: net.rx_dropped,
        tx_dropped: net.tx_dropped,
        rx_errors: net.rx_errors,
        tx_errors: net.tx_errors
      })),
      processes: {
        all: processes.all,
        running: processes.running,
        blocked: processes.blocked,
        sleeping: processes.sleeping,
        list: processes.list.slice(0, 10).map(proc => ({
          pid: proc.pid,
          name: proc.name,
          cpu: proc.cpu,
          mem: proc.mem,
          command: proc.command
        }))
      },
      uptime: os.uptime()
    };

    const collectionTime = Date.now() - startTime;

    // Envoyer les métriques au serveur
    socket.emit('metrics', metrics);

    log('debug', `📤 Métriques envoyées (collecte: ${collectionTime}ms) - CPU: ${metrics.cpu.usage}% | RAM: ${metrics.memory.usagePercent}% | Temp: ${metrics.temperature.main || 'N/A'}°C`);
  } catch (error) {
    log('error', `Erreur lors de la collecte des métriques: ${error.message}`);
  }
}

// Exécuter une commande reçue du serveur
async function executeCommand(data) {
  const { command, id, args } = data;

  try {
    let result;

    switch (command) {
      case 'reboot':
        result = { success: true, message: 'Redémarrage programmé...' };
        socket.emit('command_result', { id, ...result });
        // Note: Le redémarrage réel nécessiterait des privilèges sudo
        log('warn', '⚠️  Commande reboot reçue (nécessite sudo)');
        break;

      case 'shutdown':
        result = { success: true, message: 'Arrêt programmé...' };
        socket.emit('command_result', { id, ...result });
        log('warn', '⚠️  Commande shutdown reçue (nécessite sudo)');
        break;

      case 'get_info':
        const info = await getStaticDeviceInfo();
        result = { success: true, data: info };
        socket.emit('command_result', { id, ...result });
        break;

      case 'get_processes':
        const processes = await si.processes();
        result = { success: true, data: processes };
        socket.emit('command_result', { id, ...result });
        break;

      default:
        result = { success: false, message: `Commande inconnue: ${command}` };
        socket.emit('command_result', { id, ...result });
        log('warn', `⚠️  Commande inconnue: ${command}`);
    }
  } catch (error) {
    log('error', `Erreur lors de l'exécution de la commande: ${error.message}`);
    socket.emit('command_result', {
      id,
      success: false,
      error: error.message
    });
  }
}

// Exécuter une commande de workflow/quick action
async function executeWorkflowCommand(data) {
  const { command, directory, executionId, deviceId, stepName, actionName, timeout = 60 } = data;
  const { exec } = require('child_process');
  const startTime = Date.now();

  try {
    log('info', `🚀 Exécution: ${stepName || actionName || command}`);
    log('debug', `   Commande: ${command}`);
    log('debug', `   Répertoire: ${directory || 'N/A'}`);

    const result = await new Promise((resolve, reject) => {
      const options = {
        timeout: timeout * 1000,
        maxBuffer: 1024 * 1024, // 1MB
        cwd: directory || undefined
      };

      exec(command, options, (error, stdout, stderr) => {
        const duration = Date.now() - startTime;

        if (error) {
          log('error', `❌ Échec (${duration}ms): ${error.message}`);
          resolve({
            success: false,
            output: stdout,
            error: stderr || error.message,
            exitCode: error.code || 1,
            duration
          });
        } else {
          log('info', `✅ Succès (${duration}ms)`);
          if (stdout) log('debug', `   Output: ${stdout.substring(0, 200)}${stdout.length > 200 ? '...' : ''}`);
          resolve({
            success: true,
            output: stdout,
            error: stderr,
            exitCode: 0,
            duration
          });
        }
      });
    });

    // Envoyer le résultat au serveur
    socket.emit('workflow_command_result', {
      executionId,
      deviceId,
      stepName: stepName || actionName,
      command,
      ...result
    });

  } catch (error) {
    log('error', `💥 Erreur critique: ${error.message}`);
    socket.emit('workflow_command_result', {
      executionId,
      deviceId,
      stepName: stepName || actionName,
      command,
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    });
  }
}

// Gestion de l'arrêt propre
function gracefulShutdown() {
  log('info', '🛑 Arrêt de l\'agent...');

  stopMetricsCollection();

  if (socket) {
    socket.emit('device_disconnect', { machineId });
    socket.disconnect();
  }

  log('info', '👋 Agent arrêté proprement');
  process.exit(0);
}

// Gestion des signaux
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  log('error', `💥 Exception non capturée: ${error.message}`);
  console.error(error);
});

process.on('unhandledRejection', (reason, promise) => {
  log('error', `💥 Promesse rejetée non gérée:`, reason);
});

// Démarrage de l'agent
log('info', `${colors.cyan}${colors.bright}
╔═══════════════════════════════════════════╗
║   🍓 Raspberry Pi Monitoring Agent 🍓    ║
║           Version 1.0.0                   ║
╚═══════════════════════════════════════════╝
${colors.reset}`);

log('info', `🚀 Démarrage de l'agent...`);
connectToServer();
