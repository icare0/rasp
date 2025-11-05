#!/bin/bash

echo "🍓 Démarrage du Raspberry Pi Manager"
echo "===================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour vérifier si un port est occupé
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    echo "Installez Node.js depuis https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) détecté${NC}"

# Vérifier si les dépendances sont installées
echo ""
echo -e "${BLUE}📦 Vérification des dépendances...${NC}"

cd backend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installation des dépendances backend...${NC}"
    npm install
fi
cd ..

cd frontend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installation des dépendances frontend...${NC}"
    npm install
fi
cd ..

cd raspberry-agent
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installation des dépendances agent...${NC}"
    npm install
fi
cd ..

echo -e "${GREEN}✓ Toutes les dépendances sont installées${NC}"

# Démarrer le backend
echo ""
echo -e "${BLUE}🚀 Démarrage du backend (port 5000)...${NC}"
cd backend

if check_port 5000; then
    echo -e "${YELLOW}⚠️  Le port 5000 est déjà utilisé${NC}"
    echo "Arrêtez le processus existant ou changez le port"
else
    npm start &
    BACKEND_PID=$!
    echo -e "${GREEN}✓ Backend démarré (PID: $BACKEND_PID)${NC}"
fi
cd ..

# Attendre que le backend soit prêt
echo "Attente du démarrage du backend..."
sleep 5

# Démarrer le frontend
echo ""
echo -e "${BLUE}🚀 Démarrage du frontend (port 3000)...${NC}"
cd frontend

if check_port 3000; then
    echo -e "${YELLOW}⚠️  Le port 3000 est déjà utilisé${NC}"
    echo "Arrêtez le processus existant ou changez le port"
else
    npm start &
    FRONTEND_PID=$!
    echo -e "${GREEN}✓ Frontend démarré (PID: $FRONTEND_PID)${NC}"
fi
cd ..

# Démarrer l'agent (optionnel, pour tester en local)
echo ""
echo -e "${BLUE}🍓 Démarrage de l'agent Raspberry Pi...${NC}"
cd raspberry-agent
node agent.js &
AGENT_PID=$!
echo -e "${GREEN}✓ Agent démarré (PID: $AGENT_PID)${NC}"
cd ..

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Tous les services sont démarrés !${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📍 URLs:${NC}"
echo -e "   Frontend: ${YELLOW}http://localhost:3000${NC}"
echo -e "   Backend:  ${YELLOW}http://localhost:5000${NC}"
echo ""
echo -e "${BLUE}📝 PIDs des processus:${NC}"
if [ ! -z "$BACKEND_PID" ]; then
    echo "   Backend: $BACKEND_PID"
fi
if [ ! -z "$FRONTEND_PID" ]; then
    echo "   Frontend: $FRONTEND_PID"
fi
if [ ! -z "$AGENT_PID" ]; then
    echo "   Agent: $AGENT_PID"
fi
echo ""
echo -e "${YELLOW}💡 Pour arrêter les services, utilisez:${NC}"
echo -e "   ${BLUE}./stop-all.sh${NC}"
echo ""
echo -e "${YELLOW}📖 Première connexion:${NC}"
echo "   1. Ouvrez http://localhost:3000"
echo "   2. Créez votre premier compte (admin automatique)"
echo "   3. L'agent devrait se connecter automatiquement"
echo ""

# Garder le script actif
echo "Appuyez sur Ctrl+C pour arrêter tous les services..."
wait
