#!/usr/bin/env node

/**
 * Script d'installation de l'agent comme service systemd
 * Permet de démarrer automatiquement l'agent au démarrage du système
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const SERVICE_NAME = 'raspberry-agent';
const CURRENT_DIR = __dirname;
const NODE_PATH = process.execPath;

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, type = 'info') {
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warn: colors.yellow,
    error: colors.red
  };
  const color = colorMap[type] || colors.reset;
  console.log(`${color}${message}${colors.reset}`);
}

function checkRoot() {
  if (process.getuid && process.getuid() !== 0) {
    log('❌ Ce script doit être exécuté avec les privilèges root (sudo)', 'error');
    log('💡 Utilisez: sudo node install-service.js', 'warn');
    process.exit(1);
  }
}

function createServiceFile() {
  const serviceContent = `[Unit]
Description=Raspberry Pi Monitoring Agent
After=network.target

[Service]
Type=simple
User=${os.userInfo().username}
WorkingDirectory=${CURRENT_DIR}
ExecStart=${NODE_PATH} ${path.join(CURRENT_DIR, 'agent.js')}
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
`;

  const servicePath = `/etc/systemd/system/${SERVICE_NAME}.service`;

  try {
    fs.writeFileSync(servicePath, serviceContent);
    log(`✅ Fichier de service créé: ${servicePath}`, 'success');
    return true;
  } catch (error) {
    log(`❌ Erreur lors de la création du fichier de service: ${error.message}`, 'error');
    return false;
  }
}

function enableAndStartService() {
  try {
    log('🔄 Rechargement de systemd...', 'info');
    execSync('systemctl daemon-reload');

    log('🔄 Activation du service...', 'info');
    execSync(`systemctl enable ${SERVICE_NAME}.service`);

    log('🚀 Démarrage du service...', 'info');
    execSync(`systemctl start ${SERVICE_NAME}.service`);

    log('✅ Service installé et démarré avec succès !', 'success');
    return true;
  } catch (error) {
    log(`❌ Erreur lors de l'activation/démarrage du service: ${error.message}`, 'error');
    return false;
  }
}

function showStatus() {
  try {
    log('\n📊 Statut du service:', 'info');
    execSync(`systemctl status ${SERVICE_NAME}.service`, { stdio: 'inherit' });
  } catch (error) {
    // systemctl status retourne un code d'erreur si le service n'est pas actif
  }
}

function showInstructions() {
  log('\n' + colors.cyan + colors.bright + '═'.repeat(60), 'info');
  log('📝 Commandes utiles pour gérer le service:', 'info');
  log('═'.repeat(60) + colors.reset, 'info');
  log(`  Voir le statut:     ${colors.bright}systemctl status ${SERVICE_NAME}${colors.reset}`);
  log(`  Démarrer:           ${colors.bright}sudo systemctl start ${SERVICE_NAME}${colors.reset}`);
  log(`  Arrêter:            ${colors.bright}sudo systemctl stop ${SERVICE_NAME}${colors.reset}`);
  log(`  Redémarrer:         ${colors.bright}sudo systemctl restart ${SERVICE_NAME}${colors.reset}`);
  log(`  Voir les logs:      ${colors.bright}sudo journalctl -u ${SERVICE_NAME} -f${colors.reset}`);
  log(`  Désactiver:         ${colors.bright}sudo systemctl disable ${SERVICE_NAME}${colors.reset}`);
  log(colors.cyan + '═'.repeat(60) + colors.reset);
}

// Programme principal
log(colors.cyan + colors.bright + `
╔═══════════════════════════════════════════╗
║  🔧 Installation du Service systemd 🔧   ║
╚═══════════════════════════════════════════╝
${colors.reset}`);

// Vérifier les privilèges root
checkRoot();

// Vérifier que le fichier .env existe
if (!fs.existsSync(path.join(CURRENT_DIR, '.env'))) {
  log('⚠️  Le fichier .env n\'existe pas !', 'warn');
  log('📝 Créez un fichier .env basé sur .env.example et configurez-le avant de continuer', 'warn');
  process.exit(1);
}

// Créer le fichier de service
if (!createServiceFile()) {
  process.exit(1);
}

// Activer et démarrer le service
if (!enableAndStartService()) {
  process.exit(1);
}

// Attendre un peu puis afficher le statut
setTimeout(() => {
  showStatus();
  showInstructions();
}, 2000);
