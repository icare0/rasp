#!/bin/bash

# Script d'installation automatique de l'agent Raspberry Pi
# Ce script installe Node.js (si nécessaire), les dépendances et configure l'agent

set -e  # Arrêter en cas d'erreur

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}"
echo "╔═══════════════════════════════════════════╗"
echo "║  🍓 Installation Agent Raspberry Pi 🍓   ║"
echo "║           Version 1.0.0                   ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Fonction pour afficher les messages
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier si on est sur Raspberry Pi (optionnel)
if [ -f /proc/device-tree/model ]; then
    MODEL=$(cat /proc/device-tree/model)
    log_info "Détection: $MODEL"
fi

# Vérifier si Node.js est installé
log_info "Vérification de Node.js..."
if ! command -v node &> /dev/null; then
    log_warn "Node.js n'est pas installé !"
    log_info "Installation de Node.js via NodeSource..."

    # Installer Node.js 18.x (LTS)
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs

    log_success "Node.js installé avec succès"
else
    NODE_VERSION=$(node -v)
    log_success "Node.js est déjà installé: $NODE_VERSION"
fi

# Vérifier npm
if ! command -v npm &> /dev/null; then
    log_error "npm n'est pas installé !"
    exit 1
fi

NPM_VERSION=$(npm -v)
log_success "npm version: $NPM_VERSION"

# Installer les dépendances
log_info "Installation des dépendances npm..."
npm install

log_success "Dépendances installées"

# Créer le fichier .env s'il n'existe pas
if [ ! -f .env ]; then
    log_info "Création du fichier .env..."
    cp .env.example .env

    log_warn "⚠️  IMPORTANT: Vous devez configurer le fichier .env !"
    echo ""
    echo -e "${YELLOW}${BOLD}Actions requises:${NC}"
    echo -e "  1. Éditer le fichier .env: ${BOLD}nano .env${NC}"
    echo -e "  2. Modifier ${BOLD}SERVER_URL${NC} avec l'adresse de votre serveur"
    echo -e "  3. Modifier ${BOLD}API_KEY${NC} avec la clé API fournie par votre serveur"
    echo -e "  4. (Optionnel) Personnaliser ${BOLD}DEVICE_NAME${NC}"
    echo ""
else
    log_success "Le fichier .env existe déjà"
fi

# Proposer de tester l'agent
echo ""
log_info "Voulez-vous tester l'agent maintenant ? (y/n)"
read -r RESPONSE

if [[ "$RESPONSE" =~ ^[Yy]$ ]]; then
    log_info "Démarrage de l'agent en mode test..."
    echo -e "${CYAN}${BOLD}Appuyez sur Ctrl+C pour arrêter${NC}"
    echo ""
    npm start
else
    echo ""
    log_info "Pour démarrer l'agent manuellement: ${BOLD}npm start${NC}"
    log_info "Pour installer comme service: ${BOLD}sudo node install-service.js${NC}"
fi

echo ""
log_success "Installation terminée !"

echo ""
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════${NC}"
echo -e "${BOLD}📝 Prochaines étapes:${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo "  1. Configurer .env avec vos paramètres"
echo "  2. Tester l'agent: npm start"
echo "  3. Installer comme service: sudo node install-service.js"
echo "  4. Vérifier les logs: sudo journalctl -u raspberry-agent -f"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
