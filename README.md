# 🍓 Raspberry Pi Manager - Dashboard de Monitoring Complet

Un gestionnaire moderne et complet pour superviser et contrôler vos Raspberry Pi à distance en temps réel.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![React](https://img.shields.io/badge/react-18.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Fonctionnalités

### 📊 Monitoring en Temps Réel
- **Métriques système** : CPU, RAM, température, disque, réseau
- **Graphiques historiques** : Visualisation des métriques sur plusieurs périodes (1h, 6h, 24h, 7j)
- **Mises à jour en direct** : Socket.IO pour des données en temps réel
- **Multi-Raspberry** : Gérez plusieurs Raspberry Pi depuis un seul dashboard

### 🔔 Système d'Alertes Intelligent
- **Alertes configurables** : Définissez vos seuils personnalisés
- **Notifications en temps réel** : Soyez averti instantanément
- **3 niveaux de gravité** : Info, Warning, Critical
- **Résolution automatique** : Les alertes se résolvent quand tout revient à la normale

### 💻 Terminal Web Interactif
- **Exécution de commandes** : Lancez des commandes à distance
- **Historique** : Gardez une trace de toutes vos commandes
- **Sécurisé** : Commandes dangereuses bloquées

### 🎨 Interface Moderne
- **Design épuré** : Interface sombre professionnelle
- **Responsive** : Fonctionne sur desktop, tablette et mobile
- **Animations fluides** : Expérience utilisateur optimale
- **Cartes interactives** : Visualisation claire de chaque Raspberry

### 🔐 Sécurité
- **Authentification JWT** : Connexion sécurisée
- **Rôles utilisateurs** : Admin et utilisateurs standards
- **API Keys** : Chaque Raspberry a sa propre clé d'authentification
- **Rate limiting** : Protection contre les abus

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     RASPBERRY PI MANAGER                     │
└─────────────────────────────────────────────────────────────┘

    ┌──────────────┐         ┌──────────────┐
    │  Raspberry   │         │  Raspberry   │
    │   Pi #1      │         │   Pi #2      │
    │   (Agent)    │         │   (Agent)    │
    └──────┬───────┘         └──────┬───────┘
           │                        │
           │    WebSocket (/agent)  │
           └────────┬───────────────┘
                    │
         ┌──────────▼──────────┐
         │   SERVEUR CENTRAL   │
         │                     │
         │  • Node.js/Express  │
         │  • Socket.IO        │
         │  • MongoDB          │
         │  • JWT Auth         │
         └──────────┬──────────┘
                    │
                    │ WebSocket (/client)
                    │
         ┌──────────▼──────────┐
         │  DASHBOARD WEB      │
         │                     │
         │  • React 18         │
         │  • Recharts         │
         │  • Lucide Icons     │
         └─────────────────────┘
```

## 📋 Prérequis

### Pour le Serveur Central
- Node.js 18.x ou supérieur
- MongoDB (local ou Atlas)
- Un serveur Linux/Mac/Windows

### Pour les Raspberry Pi
- Raspberry Pi 2 ou supérieur
- Raspbian OS (ou autre distribution Linux)
- Node.js 18.x
- Connexion Internet

## 🚀 Installation

### 1️⃣ Installation du Serveur Central

```bash
# Cloner le projet
git clone https://github.com/votre-repo/raspberry-pi-manager.git
cd raspberry-pi-manager

# Installer les dépendances du backend
cd backend
npm install

# Configurer les variables d'environnement
cp .env.example .env
nano .env
```

Configurez votre `.env` :
```env
# Serveur
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/raspberry-manager
# Ou MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/raspberry-manager

# JWT
JWT_SECRET=votre-secret-tres-securise-changez-moi
JWT_EXPIRE=7d

# Frontend
FRONTEND_URL=http://localhost:3000
```

```bash
# Créer un utilisateur admin
node ../create-admin.js

# Démarrer le backend
npm start
# Ou en mode développement:
npm run dev
```

### 2️⃣ Installation du Frontend

```bash
# Dans un nouveau terminal
cd frontend
npm install

# Configurer les variables d'environnement
cp .env.example .env
nano .env
```

Configurez votre `.env` :
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

```bash
# Démarrer le frontend
npm start
```

Le dashboard sera accessible sur `http://localhost:3000`

### 3️⃣ Installation de l'Agent sur vos Raspberry Pi

#### Méthode automatique (recommandée)

Sur chaque Raspberry Pi, exécutez :

```bash
# Télécharger le projet
git clone https://github.com/votre-repo/raspberry-pi-manager.git
cd raspberry-pi-manager/raspberry-agent

# Lancer le script d'installation
chmod +x install.sh
./install.sh
```

Le script va :
- ✅ Installer Node.js si nécessaire
- ✅ Installer les dépendances npm
- ✅ Créer le fichier .env

#### Configuration de l'agent

```bash
# Éditer la configuration
nano .env
```

Configurez votre `.env` :
```env
# URL du serveur central (IMPORTANT : remplacez par l'IP de votre serveur)
SERVER_URL=http://192.168.1.100:5000

# Nom de votre Raspberry (optionnel, sinon utilise le hostname)
DEVICE_NAME=Raspberry-Salon

# Intervalle de collecte en millisecondes (5000 = 5 secondes)
METRICS_INTERVAL=5000

# Clé API (à obtenir depuis le dashboard web)
API_KEY=votre-cle-api-ici

# Niveau de log
LOG_LEVEL=info
```

#### Obtenir une clé API

1. Connectez-vous au dashboard web
2. Allez dans "Ajouter un appareil"
3. Créez un nouvel appareil
4. Copiez la clé API générée
5. Collez-la dans le `.env` de votre Raspberry

#### Tester l'agent

```bash
# Tester manuellement
npm start
```

Vous devriez voir :
```
[INFO] 🔌 Connexion au serveur: http://192.168.1.100:5000
[INFO] ✅ Connecté au serveur avec l'ID: xyz123
[INFO] 📡 Machine ID: abc-def-ghi
[INFO] 🖥️  Nom de l'appareil: Raspberry-Salon
[INFO] 📊 Démarrage de la collecte des métriques
```

#### Installer comme service (démarrage automatique)

```bash
# Installer l'agent comme service systemd
sudo node install-service.js
```

L'agent démarrera automatiquement au boot de la Raspberry Pi.

**Commandes utiles :**
```bash
# Voir le statut
systemctl status raspberry-agent

# Démarrer
sudo systemctl start raspberry-agent

# Arrêter
sudo systemctl stop raspberry-agent

# Redémarrer
sudo systemctl restart raspberry-agent

# Voir les logs en temps réel
sudo journalctl -u raspberry-agent -f
```

## 🔑 Première Connexion

1. Ouvrez le dashboard sur `http://localhost:3000` (ou l'IP de votre serveur)
2. Connectez-vous avec le compte admin créé précédemment
3. Ajoutez vos Raspberry Pi :
   - Cliquez sur "Ajouter"
   - Donnez un nom à votre Raspberry
   - Copiez la clé API générée
   - Configurez l'agent sur votre Raspberry avec cette clé
4. Démarrez l'agent sur votre Raspberry
5. Votre Raspberry devrait apparaître en ligne sur le dashboard ! 🎉

## 📊 Utilisation

### Dashboard Principal

- **Vue d'ensemble** : Statistiques globales de tous vos appareils
- **Cartes des appareils** : Chaque Raspberry affiche ses métriques en temps réel
- **Statut en ligne/hors ligne** : Indicateur visuel de l'état de connexion
- **Alertes** : Badge avec le nombre d'alertes actives

### Page de Détails d'un Appareil

Cliquez sur une carte pour accéder aux détails :
- **Métriques en temps réel** : CPU, RAM, température, disque
- **Graphiques historiques** : Visualisez l'évolution sur différentes périodes
- **Alertes actives** : Liste des alertes en cours
- **Informations système** : OS, CPU, architecture, uptime

### Terminal Web

1. Accédez aux détails d'un appareil
2. Cliquez sur "Terminal"
3. Tapez vos commandes
4. Les résultats s'affichent en temps réel

**Commandes restreintes** (pour la sécurité) :
- `rm -rf` : Suppression dangereuse
- `sudo` : Commandes super-utilisateur
- `chmod` : Modification des permissions
- Etc.

### Système d'Alertes

#### Configuration des seuils

Dans les détails d'un appareil, configurez les seuils :
- **CPU** : Alerte si > 90% (par défaut)
- **Température** : Alerte si > 80°C (par défaut)
- **RAM** : Alerte si > 85% (par défaut)
- **Disque** : Alerte si > 90% (par défaut)

#### Types d'alertes

- **Info** (🔵) : Information
- **Warning** (⚠️) : Attention requise
- **Critical** (🔴) : Action immédiate nécessaire

## 🛠️ Configuration Avancée

### Déploiement en Production avec Nginx

#### Configuration Nginx

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    # Frontend
    location / {
        root /var/www/raspberry-manager/frontend/build;
        try_files $uri /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

#### SSL avec Let's Encrypt

```bash
sudo certbot --nginx -d votre-domaine.com
```

### PM2 pour le Backend (Production)

```bash
# Installer PM2
npm install -g pm2

# Démarrer le backend
cd backend
pm2 start server.js --name raspberry-manager

# Sauvegarder la configuration
pm2 save

# Démarrage automatique au boot
pm2 startup
```

## 🐛 Dépannage

### L'agent ne se connecte pas

1. Vérifiez que le `SERVER_URL` dans `.env` est correct
2. Vérifiez que le serveur central est démarré
3. Vérifiez le firewall : le port 5000 doit être ouvert
4. Vérifiez la clé API

```bash
# Tester la connexion au serveur
curl http://votre-serveur:5000/api/health
```

### Le dashboard ne reçoit pas les métriques

1. Vérifiez la console JavaScript (F12)
2. Vérifiez que Socket.IO fonctionne
3. Rechargez la page
4. Vérifiez les logs du backend

### MongoDB ne démarre pas

```bash
# Vérifier le statut de MongoDB
sudo systemctl status mongod

# Démarrer MongoDB
sudo systemctl start mongod

# Activer au démarrage
sudo systemctl enable mongod
```

## 📈 Performance

- **Serveur** : Peut gérer 50+ Raspberry Pi simultanément
- **Base de données** : Métriques stockées 30 jours (configurable)
- **Collecte** : Métriques toutes les 5 secondes par défaut
- **Charge agent** : ~2-5% CPU, ~50 MB RAM

## 🔒 Sécurité

### Bonnes Pratiques

1. **Changez les secrets** : Utilisez des secrets JWT forts et uniques
2. **HTTPS** : Utilisez SSL en production
3. **Firewall** : Limitez l'accès aux ports nécessaires
4. **Mots de passe** : Utilisez des mots de passe forts
5. **Mises à jour** : Gardez Node.js et les dépendances à jour
6. **MongoDB** : Activez l'authentification MongoDB
7. **API Keys** : Régénérez les clés API si compromises

## 📝 License

MIT License

## 👨‍💻 Auteur

Créé avec ❤️ pour la communauté Raspberry Pi

## 🙏 Remerciements

- [Express.js](https://expressjs.com/) - Framework backend
- [React](https://reactjs.org/) - Framework frontend
- [Socket.IO](https://socket.io/) - Communication temps réel
- [MongoDB](https://www.mongodb.com/) - Base de données
- [Recharts](https://recharts.org/) - Graphiques
- [systeminformation](https://www.npmjs.com/package/systeminformation) - Métriques système
- [Lucide Icons](https://lucide.dev/) - Icônes

---

**⭐ Si ce projet vous est utile, n'hésitez pas à lui donner une étoile sur GitHub !**
