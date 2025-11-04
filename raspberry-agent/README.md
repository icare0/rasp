# 🍓 Agent Raspberry Pi - Guide d'Installation

Agent de monitoring pour Raspberry Pi qui collecte et envoie les métriques système à un serveur central.

## 📋 Prérequis

- Raspberry Pi (2 ou supérieur)
- Raspbian OS ou autre distribution Linux
- Connexion Internet
- Node.js 18.x ou supérieur

## 🚀 Installation Rapide

### 1️⃣ Cloner le projet

```bash
git clone https://github.com/votre-repo/raspberry-pi-manager.git
cd raspberry-pi-manager/raspberry-agent
```

### 2️⃣ Lancer l'installation automatique

```bash
chmod +x install.sh
./install.sh
```

Le script va automatiquement :
- ✅ Vérifier et installer Node.js si nécessaire
- ✅ Installer les dépendances npm
- ✅ Créer le fichier `.env`

### 3️⃣ Obtenir une clé API

1. Connectez-vous au dashboard web (http://votre-serveur:3000)
2. Cliquez sur **"Ajouter"** un appareil
3. Donnez un nom à votre Raspberry Pi
4. **Copiez la clé API** générée

### 4️⃣ Configurer l'agent

```bash
nano .env
```

Modifiez les valeurs suivantes :

```env
# ⚠️ IMPORTANT : Remplacez par l'IP de votre serveur
SERVER_URL=http://192.168.1.100:5000

# Nom personnalisé (optionnel)
DEVICE_NAME=Raspberry-Salon

# Coller la clé API copiée à l'étape 3
API_KEY=votre-cle-api-ici
```

Sauvegardez avec `Ctrl+O` puis `Enter`, et quittez avec `Ctrl+X`.

### 5️⃣ Tester l'agent

```bash
npm start
```

Vous devriez voir :

```
╔═══════════════════════════════════════════╗
║   🍓 Raspberry Pi Monitoring Agent 🍓    ║
║           Version 1.0.0                   ║
╚═══════════════════════════════════════════╝

[INFO] 🚀 Démarrage de l'agent...
[INFO] 🔌 Connexion au serveur: http://192.168.1.100:5000
[INFO] ✅ Connecté au serveur avec l'ID: xyz123
[INFO] 📡 Machine ID: abc-def-ghi
[INFO] 🖥️  Nom de l'appareil: Raspberry-Salon
[INFO] 📝 Appareil enregistré auprès du serveur
[INFO] 📊 Démarrage de la collecte des métriques (intervalle: 5000ms)
[DEBUG] 📤 Métriques envoyées (collecte: 45ms) - CPU: 12.3% | RAM: 45.2% | Temp: 52.1°C
```

Si vous voyez ça, **tout fonctionne** ! 🎉

Appuyez sur `Ctrl+C` pour arrêter.

### 6️⃣ Installer comme service (démarrage automatique)

Pour que l'agent démarre automatiquement au boot :

```bash
sudo node install-service.js
```

L'agent démarrera maintenant automatiquement à chaque redémarrage de la Raspberry Pi !

## 📝 Commandes Utiles

### Gérer le service

```bash
# Voir le statut
systemctl status raspberry-agent

# Démarrer
sudo systemctl start raspberry-agent

# Arrêter
sudo systemctl stop raspberry-agent

# Redémarrer
sudo systemctl restart raspberry-agent

# Activer au démarrage (normalement déjà fait)
sudo systemctl enable raspberry-agent

# Désactiver le démarrage automatique
sudo systemctl disable raspberry-agent
```

### Voir les logs

```bash
# Logs en temps réel
sudo journalctl -u raspberry-agent -f

# Derniers 100 logs
sudo journalctl -u raspberry-agent -n 100

# Logs depuis aujourd'hui
sudo journalctl -u raspberry-agent --since today
```

### Désinstaller le service

```bash
sudo systemctl stop raspberry-agent
sudo systemctl disable raspberry-agent
sudo rm /etc/systemd/system/raspberry-agent.service
sudo systemctl daemon-reload
```

## 📊 Métriques Collectées

L'agent collecte et envoie **toutes les 5 secondes** (configurable) :

- **CPU** : Usage global + usage par cœur + load average
- **Mémoire** : Total, utilisé, libre, disponible, swap
- **Température** : Température du CPU (si disponible)
- **Disque** : Usage de tous les points de montage
- **Réseau** : Bytes reçus/transmis par interface
- **Processus** : Nombre total, en cours d'exécution, top 10
- **Uptime** : Temps depuis le dernier démarrage
- **Système** : OS, architecture, hostname, kernel

## ⚙️ Configuration Avancée

### Variables d'environnement (.env)

```env
# URL du serveur central
SERVER_URL=http://192.168.1.100:5000

# Nom personnalisé (optionnel, sinon utilise le hostname)
DEVICE_NAME=Ma-Raspberry

# Intervalle de collecte en millisecondes
# 5000 = 5 secondes (défaut)
# 10000 = 10 secondes
# 60000 = 1 minute
METRICS_INTERVAL=5000

# Clé API (à obtenir depuis le dashboard)
API_KEY=votre-cle-api-ici

# Niveau de log : error, warn, info, debug
LOG_LEVEL=info
```

### Modifier l'intervalle de collecte

Pour collecter les métriques moins souvent (économiser CPU) :

```env
METRICS_INTERVAL=10000  # 10 secondes
# ou
METRICS_INTERVAL=30000  # 30 secondes
```

### Activer les logs debug

Pour voir plus de détails dans les logs :

```env
LOG_LEVEL=debug
```

## 🐛 Dépannage

### L'agent ne se connecte pas

**Vérifiez le SERVER_URL** :
```bash
# Tester la connexion au serveur
curl http://votre-serveur:5000/api/health
```

Si ça ne fonctionne pas :
- Le serveur est-il démarré ?
- Le firewall bloque-t-il le port 5000 ?
- L'IP est-elle correcte ?

**Vérifiez la clé API** :
```bash
# Afficher votre configuration
cat .env
```

La clé API doit correspondre à celle générée sur le dashboard.

### L'agent se déconnecte souvent

Vérifiez votre connexion réseau :
```bash
ping -c 5 votre-serveur
```

Si le ping échoue, problème réseau.

### Erreur "Cannot find module"

Réinstallez les dépendances :
```bash
rm -rf node_modules
npm install
```

### Permission denied

Les scripts doivent être exécutables :
```bash
chmod +x install.sh agent.js install-service.js
```

### Node.js trop ancien

Vérifiez la version :
```bash
node -v  # Doit être >= 18.0.0
```

Pour mettre à jour Node.js :
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 🔒 Sécurité

### Protéger la clé API

**Ne partagez JAMAIS votre clé API** !

Le fichier `.env` contient des informations sensibles. Assurez-vous qu'il n'est pas accessible publiquement.

```bash
# Vérifier les permissions
ls -l .env
# Doit être : -rw-r--r-- (644) ou -rw------- (600)

# Si nécessaire, restreindre l'accès
chmod 600 .env
```

### Régénérer une clé API

Si votre clé API est compromise :

1. Sur le dashboard, allez dans les paramètres de l'appareil
2. Cliquez sur **"Régénérer la clé API"**
3. Copiez la nouvelle clé
4. Mettez à jour le `.env` sur la Raspberry
5. Redémarrez l'agent : `sudo systemctl restart raspberry-agent`

## 📈 Performance

L'agent est très léger :

- **CPU** : ~2-5% en moyenne
- **RAM** : ~50 MB
- **Réseau** : ~10 KB/s (avec intervalle 5s)

## 🆘 Support

### Logs détaillés

En cas de problème, obtenez les logs détaillés :

```bash
# Mode debug
LOG_LEVEL=debug npm start
```

Ou si installé comme service :
```bash
sudo journalctl -u raspberry-agent -n 200 --no-pager > logs.txt
```

### Informations utiles pour le support

- Version de Node.js : `node -v`
- Version de l'OS : `cat /etc/os-release`
- Version de l'agent : `cat package.json | grep version`
- Logs récents : `sudo journalctl -u raspberry-agent -n 50`

## 📝 Fichiers du projet

```
raspberry-agent/
├── agent.js              # Agent principal
├── package.json          # Dépendances
├── install.sh           # Script d'installation
├── install-service.js   # Installation service systemd
├── .env.example         # Configuration exemple
├── .env                 # Votre configuration (à créer)
└── README.md           # Ce fichier
```

## 🔄 Mise à jour

Pour mettre à jour l'agent :

```bash
# Arrêter le service
sudo systemctl stop raspberry-agent

# Récupérer les dernières modifications
git pull

# Réinstaller les dépendances
npm install

# Redémarrer le service
sudo systemctl start raspberry-agent
```

## ✅ Checklist d'installation

- [ ] Node.js 18+ installé
- [ ] Projet cloné
- [ ] Dépendances installées (`npm install`)
- [ ] Fichier `.env` créé et configuré
- [ ] `SERVER_URL` configuré avec l'IP du serveur
- [ ] `API_KEY` configuré avec la clé du dashboard
- [ ] Agent testé (`npm start`)
- [ ] Service installé (`sudo node install-service.js`)
- [ ] Agent visible sur le dashboard

## 🎉 C'est prêt !

Une fois l'installation terminée, votre Raspberry Pi apparaîtra sur le dashboard avec toutes ses métriques en temps réel !

---

**Questions ?** Consultez le README principal du projet ou ouvrez une issue sur GitHub.
