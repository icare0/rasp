# Guide d'Installation pour le Développement Local

## 🐛 Problème Actuel

Le serveur backend démarre correctement, mais **MongoDB n'est pas connecté**. Cela signifie que :
- ✅ Le serveur backend répond sur `http://localhost:5000`
- ✅ Le problème CORS est résolu
- ❌ L'authentification ne fonctionne pas (nécessite MongoDB)
- ❌ Aucune donnée ne peut être sauvegardée

## 🔧 Solutions

### Option 1 : MongoDB avec Docker (Recommandé - Plus Simple)

Si vous avez Docker installé :

```bash
# Démarrer MongoDB dans un conteneur Docker
docker run -d \
  --name mongodb-rasp \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:latest

# Vérifier que MongoDB fonctionne
docker ps | grep mongodb-rasp
```

Ensuite, modifiez votre fichier `backend/.env` :
```env
MONGODB_URI=mongodb://localhost:27017/raspberry-pi-manager
```

### Option 2 : MongoDB Local (Installation Complète)

#### Sur Ubuntu/Debian :
```bash
# Importer la clé publique GPG de MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Créer le fichier de liste pour MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Mettre à jour les packages et installer MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Démarrer MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Vérifier le statut
sudo systemctl status mongod
```

#### Sur macOS :
```bash
# Avec Homebrew
brew tap mongodb/brew
brew install mongodb-community@7.0

# Démarrer MongoDB
brew services start mongodb-community@7.0
```

#### Sur Windows :
1. Téléchargez MongoDB depuis : https://www.mongodb.com/try/download/community
2. Installez avec l'assistant d'installation
3. MongoDB démarrera automatiquement comme service Windows

Ensuite, modifiez votre fichier `backend/.env` :
```env
MONGODB_URI=mongodb://localhost:27017/raspberry-pi-manager
```

### Option 3 : MongoDB Atlas (Cloud - Actuel mais ne fonctionne pas)

Votre configuration actuelle utilise MongoDB Atlas, mais il semble y avoir un problème de connexion. Pour résoudre :

1. **Vérifiez votre connexion Internet**

2. **Vérifiez les paramètres MongoDB Atlas** :
   - Connectez-vous à https://cloud.mongodb.com
   - Vérifiez que le cluster existe toujours
   - Whitelist votre adresse IP dans "Network Access"
   - Vérifiez les credentials dans "Database Access"

3. **Testez la connexion** :
   ```bash
   # Si mongosh est installé
   mongosh "mongodb+srv://icareletroisieme:Valentine44%26@ticket.drqbyfm.mongodb.net/?retryWrites=true&w=majority&appName=ticket"
   ```

## 🚀 Après Installation de MongoDB

### 1. Redémarrer le serveur backend

```bash
# Arrêter le serveur actuel
pkill -f "node.*server.js"

# Redémarrer
cd backend
npm start
```

### 2. Créer un utilisateur admin

```bash
cd /home/user/rasp
node create-admin.js
```

Suivez les instructions pour créer votre premier compte administrateur.

### 3. Tester l'authentification

1. Ouvrez le frontend : `http://localhost:3000`
2. Connectez-vous avec les identifiants créés
3. Vous devriez maintenant pouvoir vous authentifier ! 🎉

## 🧪 Vérifier que tout fonctionne

```bash
# 1. Vérifier que MongoDB est accessible
curl -s http://localhost:27017
# Devrait afficher: "It looks like you are trying to access MongoDB over HTTP..."

# 2. Vérifier que le backend répond
curl -s http://localhost:5000/api/health
# Devrait retourner: {"success":true,"message":"Serveur Raspberry Pi Manager opérationnel"...}

# 3. Vérifier les logs backend
cat /tmp/backend.log
# Devrait afficher: "MongoDB connecté: localhost" (ou l'host Atlas)
```

## 📝 Configuration Actuelle

Vos fichiers `.env` ont été créés avec les bonnes valeurs pour le développement local :

### `backend/.env`
```env
MONGODB_URI=mongodb+srv://... (Atlas - ne fonctionne pas actuellement)
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
SOCKET_URL=http://localhost:3000
```

### `frontend/.env`
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## 🔐 Note de Sécurité

Les fichiers `.env` contiennent vos credentials et ne sont **PAS** commités dans Git grâce au `.gitignore`.

Si vous changez de machine ou clonez le projet, vous devrez recréer les fichiers `.env` en copiant les `.env.example` :

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Puis éditez-les avec vos propres valeurs.

## ❓ Besoin d'Aide ?

Si vous rencontrez des problèmes :
1. Vérifiez les logs du backend : `cat /tmp/backend.log`
2. Vérifiez que MongoDB fonctionne : `systemctl status mongod` ou `docker ps`
3. Vérifiez les ports : `netstat -tuln | grep -E "5000|27017"`
