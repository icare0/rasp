#!/bin/bash

echo "🛑 Arrêt du Raspberry Pi Manager..."

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Arrêter les processus Node.js sur les ports utilisés
echo -e "${YELLOW}Arrêt des services...${NC}"

# Backend (port 5000)
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "Arrêt du backend (port 5000)..."
    lsof -ti:5000 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✓ Backend arrêté${NC}"
else
    echo -e "${YELLOW}⚠️  Aucun backend en cours d'exécution${NC}"
fi

# Frontend (port 3000)
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "Arrêt du frontend (port 3000)..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✓ Frontend arrêté${NC}"
else
    echo -e "${YELLOW}⚠️  Aucun frontend en cours d'exécution${NC}"
fi

# Arrêter tous les processus agent.js
if pgrep -f "node.*agent.js" > /dev/null ; then
    echo -e "Arrêt de l'agent..."
    pkill -9 -f "node.*agent.js"
    echo -e "${GREEN}✓ Agent arrêté${NC}"
else
    echo -e "${YELLOW}⚠️  Aucun agent en cours d'exécution${NC}"
fi

echo ""
echo -e "${GREEN}✅ Tous les services ont été arrêtés${NC}"
