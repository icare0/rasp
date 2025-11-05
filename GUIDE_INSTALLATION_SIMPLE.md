# 🚀 Guide d'Installation Ultra Simple

## 📍 Où mettre quoi ?

### Architecture du système

```
┌─────────────────────────────────────────────────────────┐
│                    TON RÉSEAU LOCAL                      │
│                                                           │
│  ┌──────────────────┐                                    │
│  │  TON PC/SERVEUR  │ ← Ici tu mets backend + frontend  │
│  │  192.168.1.X     │                                    │
│  └──────────────────┘                                    │
│           ↕                                               │
│    (connexion réseau)                                    │
│           ↕                                               │
│  ┌─────────────┐        ┌─────────────┐                 │
│  │ Raspberry 1 │        │ Raspberry 2 │                 │
│  │ 192.168.1.Y │        │ 192.168.1.Z │                 │
│  │  + agent    │        │  + agent    │                 │
│  └─────────────┘        └─────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

## 🎯 ÉTAPE 1 : Installer MongoDB (Une fois)

**Sur ton PC/Serveur :**

### Option A : MongoDB Local (Rapide)
```bash
# Ubuntu/Debian
sudo apt install mongodb -y
sudo systemctl start mongodb
```

### Option B : MongoDB Atlas (Cloud - Gratuit)
1. Va sur https://www.mongodb.com/cloud/atlas
2. Crée un compte gratuit
3. Crée un cluster
4. Copie l'URI de connexion (ex: `mongodb+srv://user:pass@cluster.mongodb.net/rasp`)

## 🎯 ÉTAPE 2 : Installer le Backend (Sur ton PC/Serveur)

### 1. Clone le projet
```bash
cd ~
git clone https://github.com/icare0/rasp.git
cd rasp
```

### 2. Configure le Backend
```bash
cd backend
npm install

# Crée le fichier de configuration
cp .env.example .env
nano .env
```

**Dans le fichier .env, modifie :**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/raspberry-manager
# OU si MongoDB Atlas :
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/rasp

JWT_SECRET=ton-secret-ultra-securise-change-moi-123456
```

Sauvegarde : `Ctrl+O`, `Enter`, `Ctrl+X`

### 3. Crée ton compte admin
```bash
cd ..
node create-admin.js

# Entre ton email et mot de passe quand demandé
# Exemple :
# Email : tonemail@gmail.com
# Password : MonMotDePasseSecure123
```

### 4. Lance le Backend
```bash
cd backend
npm start
```

Tu dois voir : `✅ Serveur démarré sur le port 5000`

**LAISSE CE TERMINAL OUVERT !**

## 🎯 ÉTAPE 3 : Installer le Frontend (Sur ton PC/Serveur)

### Ouvre un NOUVEAU terminal
```bash
cd ~/rasp/frontend
npm install

# Configure l'adresse du backend
cp .env.example .env
# Pas besoin de modifier si backend sur localhost:5000
```

### Lance le Frontend
```bash
npm start
```

Un navigateur s'ouvre sur `http://localhost:3000`

**Login** avec le compte admin créé à l'étape 2.3 !

**LAISSE CE TERMINAL OUVERT aussi !**

## 🎯 ÉTAPE 4 : Créer tes Raspberry Pi sur le Dashboard

### Sur le dashboard web (http://localhost:3000) :

1. **Clique sur le bouton "Ajouter" (+)** en haut à droite
2. **Entre le nom** : `Raspberry-Salon` (ou autre)
3. **COPIE LA CLÉ API** qui s'affiche (tu en auras besoin !)
   - Exemple : `rpi_abc123def456ghi789`
4. Clique sur **"Créer"**

**RÉPÈTE pour ta 2ème Raspberry :**
1. Clique encore sur "Ajouter"
2. Entre le nom : `Raspberry-Bureau`
3. **COPIE LA 2ÈME CLÉ API** (différente de la première !)
4. Clique sur "Créer"

💡 **Note importante :** Chaque Raspberry Pi a SA PROPRE clé API unique !

## 🎯 ÉTAPE 5 : Trouver l'IP de ton serveur

**Sur ton PC/Serveur, dans un terminal :**
```bash
hostname -I
# OU
ip a
```

Tu verras une IP du genre `192.168.1.15` → **NOTE-LA !**

## 🎯 ÉTAPE 6 : Installer l'Agent sur RASPBERRY PI #1

### SSH sur ta première Raspberry
```bash
ssh pi@adresse-ip-de-ta-rasp
# Mot de passe par défaut : raspberry
```

### Sur la Raspberry, installe l'agent
```bash
# 1. Clone le projet
cd ~
git clone https://github.com/icare0/rasp.git
cd rasp/raspberry-agent

# 2. Lance l'installation automatique
chmod +x install.sh
./install.sh

# Appuie sur "n" quand il demande de tester
```

### 3. Configure l'agent
```bash
nano .env
```

**Modifie ces lignes :**
```env
# Remplace 192.168.1.15 par l'IP de TON serveur (trouvée à l'étape 5)
SERVER_URL=http://192.168.1.15:5000

# Nom de cette Raspberry
DEVICE_NAME=Raspberry-Salon

# Colle la PREMIÈRE clé API (copiée à l'étape 4)
API_KEY=rpi_abc123def456ghi789
```

Sauvegarde : `Ctrl+O`, `Enter`, `Ctrl+X`

### 4. Teste l'agent
```bash
npm start
```

Tu dois voir :
```
✅ Connecté au serveur avec l'ID: xyz123
📊 Démarrage de la collecte des métriques
```

**Si ça marche, fais Ctrl+C**

### 5. Installe comme service (démarrage automatique)
```bash
sudo node install-service.js
```

L'agent démarre maintenant automatiquement ! 🎉

### 6. Vérifie sur le dashboard
Retourne sur le dashboard web → Tu dois voir ta **Raspberry-Salon EN VERT** ! 🟢

## 🎯 ÉTAPE 7 : Installer l'Agent sur RASPBERRY PI #2

**MÊME CHOSE que l'étape 6, MAIS :**

1. SSH sur ta DEUXIÈME Raspberry
2. Clone le projet
3. Lance `./install.sh`
4. **Dans le .env :**
   - Même `SERVER_URL` (même IP de serveur)
   - `DEVICE_NAME=Raspberry-Bureau` (nom différent)
   - `API_KEY=` **← LA 2ÈME CLÉ API** (différente de la première !)
5. Teste avec `npm start`
6. Installe comme service : `sudo node install-service.js`

### Vérifie sur le dashboard
Tu dois maintenant voir **2 Raspberry Pi EN VERT** ! 🟢🟢

## 🎉 C'EST TOUT !

Tu peux maintenant :

### 📊 Sur le Dashboard Web
- Voir toutes les stats en temps réel (CPU, RAM, température, disque)
- Cliquer sur une Raspberry pour voir les graphiques détaillés
- Utiliser le terminal web pour exécuter des commandes
- Cliquer sur "Automatisation" pour :
  - Lancer des quick actions (git pull, npm install, pm2 restart, etc.)
  - Créer des workflows pour déployer tes bots Discord/sites web
  - Utiliser les templates pré-configurés

### 🔄 Utiliser l'Automatisation

**Exemple : Déployer un Bot Discord**

1. Clique sur **"Automatisation"** dans le header
2. Va dans l'onglet **"Templates"**
3. Trouve **"Déployer Bot Discord"**
4. Clique sur **"Utiliser ce template"**
5. Modifie le répertoire (ex : `/home/pi/mon-bot-discord`)
6. Sauvegarde
7. Clique sur **"Exécuter"**
8. Sélectionne sur quelle(s) Raspberry Pi lancer
9. Confirme !

Le système va automatiquement :
- Faire un `git pull`
- Faire un `npm install`
- Redémarrer le bot avec `pm2 restart`

## 📝 Commandes Utiles

### Sur le serveur (Backend)
```bash
# Démarrer le backend
cd ~/rasp/backend
npm start

# Avec PM2 (démarrage automatique)
npm install -g pm2
pm2 start server.js --name rasp-backend
pm2 save
pm2 startup
```

### Sur le serveur (Frontend)
```bash
# Mode développement
cd ~/rasp/frontend
npm start

# Mode production
npm run build
# Puis serve les fichiers du dossier build/ avec nginx/apache
```

### Sur les Raspberry Pi
```bash
# Voir le statut
systemctl status raspberry-agent

# Redémarrer l'agent
sudo systemctl restart raspberry-agent

# Voir les logs en temps réel
sudo journalctl -u raspberry-agent -f

# Arrêter l'agent
sudo systemctl stop raspberry-agent
```

## 🆘 Problèmes Courants

### ❌ L'agent ne se connecte pas

**1. Vérifie que le backend est lancé**
```bash
# Sur le serveur
curl http://localhost:5000/api/health
```

**2. Teste depuis la Raspberry**
```bash
# Sur la Raspberry
curl http://IP-DU-SERVEUR:5000/api/health
# Ex: curl http://192.168.1.15:5000/api/health
```

Si ça ne marche pas → **Firewall !**

**Sur le serveur, ouvre le port 5000 :**
```bash
sudo ufw allow 5000
# OU
sudo iptables -A INPUT -p tcp --dport 5000 -j ACCEPT
```

**3. Vérifie la clé API**
```bash
# Sur la Raspberry
cat ~/rasp/raspberry-agent/.env
# La clé API est-elle la bonne ?
```

### ❌ "Module not found"

```bash
# Dans le dossier concerné
rm -rf node_modules package-lock.json
npm install
```

### ❌ Port déjà utilisé

```bash
# Trouve ce qui utilise le port 5000
sudo lsof -i :5000
# Tue le processus ou change le port dans backend/.env
```

## 🌐 Accès depuis l'extérieur (Internet)

### Option 1 : Ngrok (Rapide, gratuit)
```bash
# Sur le serveur
npm install -g ngrok
ngrok http 5000

# Utilise l'URL fournie dans SERVER_URL sur les Raspberry
# Ex: SERVER_URL=https://abc123.ngrok.io
```

### Option 2 : Nom de domaine + Reverse Proxy (Pro)
- Configure un nom de domaine pointant vers ton serveur
- Installe nginx comme reverse proxy
- Configure SSL avec Let's Encrypt

## 📱 Résumé des Fichiers

```
TON PC/SERVEUR :
  ~/rasp/
    ├── backend/        ← Backend Express + Socket.IO
    │   ├── .env        ← Configuration (MongoDB, JWT)
    │   └── server.js   ← npm start ici
    │
    └── frontend/       ← Dashboard React
        ├── .env        ← Configuration (API URL)
        └── src/        ← npm start ici

RASPBERRY PI #1 :
  ~/rasp/
    └── raspberry-agent/    ← Agent de monitoring
        ├── .env            ← SERVER_URL + API_KEY #1
        └── agent.js        ← npm start OU service systemd

RASPBERRY PI #2 :
  ~/rasp/
    └── raspberry-agent/    ← Agent de monitoring
        ├── .env            ← SERVER_URL + API_KEY #2
        └── agent.js        ← npm start OU service systemd
```

## ✅ Checklist Finale

### Serveur
- [ ] MongoDB installé et lancé
- [ ] Backend : `npm install` + `.env` configuré + `npm start`
- [ ] Frontend : `npm install` + `npm start`
- [ ] Dashboard accessible sur http://localhost:3000
- [ ] Compte admin créé et login OK

### Raspberry #1
- [ ] Projet cloné
- [ ] `./install.sh` lancé
- [ ] `.env` configuré (SERVER_URL + API_KEY #1)
- [ ] `npm start` fonctionne
- [ ] Service installé : `sudo node install-service.js`
- [ ] Apparaît en VERT sur le dashboard

### Raspberry #2
- [ ] Projet cloné
- [ ] `./install.sh` lancé
- [ ] `.env` configuré (SERVER_URL + API_KEY #2)
- [ ] `npm start` fonctionne
- [ ] Service installé : `sudo node install-service.js`
- [ ] Apparaît en VERT sur le dashboard

---

## 🎊 PROFITE DE TON DASHBOARD !

Tu as maintenant un système professionnel pour gérer tes Raspberry Pi et déployer tes bots/sites web ! 🚀
