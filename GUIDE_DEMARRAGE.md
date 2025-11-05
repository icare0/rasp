# 🍓 Guide de démarrage rapide - Raspberry Pi Manager

## 🚀 Démarrage rapide

### 1. Installation initiale

```bash
# Installer les dépendances (première fois seulement)
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd raspberry-agent && npm install && cd ..
```

### 2. Démarrer tous les services

```bash
# Option 1 : Script automatique (recommandé)
./start-all.sh

# Option 2 : Manuel
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Frontend
cd frontend && npm start

# Terminal 3 - Agent (optionnel pour test local)
cd raspberry-agent && node agent.js
```

### 3. Première connexion

1. Ouvrez votre navigateur : **http://localhost:3000**
2. Créez votre premier compte (sera automatiquement administrateur)
3. L'agent devrait se connecter automatiquement et apparaître dans le dashboard

### 4. Arrêter les services

```bash
./stop-all.sh
```

---

## 🔧 Configuration

### Backend (.env)

Le fichier `backend/.env` a été créé automatiquement avec la configuration par défaut :

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=raspberry-pi-manager-super-secret-key-2024
JWT_EXPIRE=7d
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Agent Raspberry Pi (.env)

Le fichier `raspberry-agent/.env` a été créé avec :

```env
SERVER_URL=http://localhost:5000
DEVICE_NAME=Raspberry Pi Local
API_KEY=demo-api-key-12345
METRICS_INTERVAL=5000
LOG_LEVEL=info
```

**Important** : L'agent créera automatiquement l'appareil lors de sa première connexion. Vous n'avez pas besoin de créer l'appareil manuellement dans l'interface.

---

## 🔑 Configuration de l'agent sur une vraie Raspberry Pi

### Installation sur Raspberry Pi

```bash
# Sur votre Raspberry Pi
cd ~
git clone <votre-repo>
cd rasp/raspberry-agent
npm install
```

### Configuration

Éditez `raspberry-agent/.env` :

```bash
nano .env
```

Modifiez :
- `SERVER_URL` : URL de votre serveur (ex: http://192.168.1.100:5000)
- `DEVICE_NAME` : Nom personnalisé pour identifier votre Raspberry Pi
- `API_KEY` : Laissez celle par défaut ou générez-en une unique

### Lancer l'agent

```bash
# Test manuel
node agent.js

# Installer comme service (recommandé)
node install-service.js
```

---

## 🐛 Résolution des problèmes

### Problème : "Cannot connect to server"

**Solutions** :
1. Vérifiez que le backend est démarré :
   ```bash
   curl http://localhost:5000/api/health
   ```
2. Vérifiez que MongoDB est accessible
3. Regardez les logs du backend pour les erreurs

### Problème : "CORS policy error"

**Solutions** :
1. Vérifiez que `FRONTEND_URL` dans `.env` est correct
2. Le serveur a été configuré pour être permissif en développement
3. Redémarrez le backend après modification du .env

### Problème : "Agent ne se connecte pas"

**Solutions** :
1. Vérifiez que `SERVER_URL` dans `raspberry-agent/.env` est correct
2. Vérifiez que l'agent peut accéder au serveur :
   ```bash
   curl http://localhost:5000/api/health
   ```
3. Regardez les logs de l'agent pour voir les erreurs
4. L'agent créera automatiquement l'appareil, pas besoin de le créer manuellement

### Problème : "Déconnexion rapide après login"

**Solutions** :
1. Le backend doit être démarré avant le frontend
2. Videz le cache du navigateur et les cookies
3. Vérifiez que le token JWT est valide dans localStorage
4. Les corrections apportées ont amélioré la gestion des erreurs réseau

### Problème : "Pas de données sur le dashboard"

**Solutions** :
1. Vérifiez que l'agent est bien connecté (devrait apparaître comme "Online")
2. Attendez quelques secondes que les premières métriques arrivent
3. Vérifiez les logs de l'agent pour voir s'il envoie les métriques
4. Ouvrez la console du navigateur pour voir les erreurs

---

## 📊 Utilisation

### Dashboard principal
- Visualisez tous vos appareils connectés
- Statistiques globales : CPU, RAM, température
- Alertes en temps réel

### Détails d'un appareil
- Métriques en temps réel avec graphiques
- Historique des métriques
- Configuration des seuils d'alerte
- Exécution de commandes à distance

### Automation
- Créez des workflows pour automatiser des tâches
- Quick Actions pour des commandes fréquentes
- Exécution sur un ou plusieurs appareils

### Settings
- Gestion des utilisateurs (admin uniquement)
- Configuration générale
- Paramètres de sécurité

---

## 🔐 Sécurité

En production :
1. Changez `JWT_SECRET` pour une valeur unique et sécurisée
2. Utilisez HTTPS avec un certificat SSL
3. Configurez un pare-feu
4. Utilisez des mots de passe forts
5. Limitez l'accès au port 5000 depuis Internet
6. Utilisez MongoDB avec authentification

---

## 📝 Notes importantes

### Auto-création des appareils
- L'agent créera automatiquement l'appareil lors de sa première connexion
- Pas besoin de créer manuellement l'appareil dans l'interface
- L'API_KEY dans le `.env` de l'agent sert d'identifiant unique

### Rate limiting
- En développement, le rate limiting est désactivé
- En production, 100 requêtes/15min et 5 tentatives de login/15min

### CORS
- En développement, tous les origins localhost sont autorisés
- En production, configurez `FRONTEND_URL` correctement

---

## 🆘 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans la console
2. Utilisez les commandes de debug ci-dessus
3. Vérifiez que tous les services sont démarrés
4. Consultez la documentation MongoDB si problème de connexion

Bon monitoring ! 🍓
