# 🚀 GUIDE DE DÉMARRAGE RAPIDE

## 🎯 En 5 minutes, monitorer vos Raspberry Pi !

---

## 📍 Étape 1 : Démarrer le Serveur (sur votre PC/serveur)

### Backend

```bash
cd backend
npm install
cp .env.example .env
nano .env  # Configurez MONGODB_URI et JWT_SECRET
node ../create-admin.js  # Créez votre compte admin
npm start  # Le serveur démarre sur le port 5000
```

### Frontend (nouveau terminal)

```bash
cd frontend
npm install
cp .env.example .env
# Pas besoin de modifier si le backend est sur localhost:5000
npm start  # Le dashboard s'ouvre sur http://localhost:3000
```

✅ **Connectez-vous au dashboard** avec le compte admin créé !

---

## 📍 Étape 2 : Ajouter une Raspberry Pi

### Sur le dashboard web :

1. Cliquez sur **"Ajouter"**
2. Entrez le nom : `Raspberry-Salon` (par exemple)
3. **Copiez la clé API** affichée (vous en aurez besoin !)
4. Cliquez sur "Créer"

---

## 📍 Étape 3 : Installer l'Agent (sur chaque Raspberry Pi)

### Sur votre Raspberry Pi :

```bash
# 1. Cloner le projet
git clone https://github.com/icare0/rasp.git
cd rasp/raspberry-agent

# 2. Installer automatiquement
chmod +x install.sh
./install.sh

# 3. Configurer
nano .env
# Remplacez :
# - SERVER_URL=http://192.168.1.XXX:5000  (IP de votre serveur)
# - API_KEY=la-cle-copiee-a-l-etape-2

# 4. Tester
npm start
# Vous devriez voir "✅ Connecté au serveur"

# 5. Installer comme service (optionnel mais recommandé)
sudo node install-service.js
```

---

## 📍 Étape 4 : Profiter ! 🎉

Retournez sur le dashboard → Votre Raspberry Pi apparaît en **vert** avec toutes ses métriques !

### Ce que vous pouvez faire :

- 📊 **Voir les stats en temps réel** (CPU, RAM, température, disque)
- 📈 **Visualiser l'historique** avec des graphiques
- 🔔 **Recevoir des alertes** automatiques
- 💻 **Exécuter des commandes** à distance via le terminal web
- 🔄 **Gérer plusieurs Raspberry Pi** depuis un seul dashboard

---

## 🎨 Interface du Dashboard

### Vue principale
```
┌──────────────────────────────────────────────────┐
│  🍓 Raspberry Pi Manager                    [+]  │
├──────────────────────────────────────────────────┤
│                                                   │
│  📊 Statistiques Globales                        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│  │  2   │ │ 35%  │ │ 67%  │ │ 52°C │           │
│  │Online│ │ CPU  │ │ RAM  │ │ Temp │           │
│  └──────┘ └──────┘ └──────┘ └──────┘           │
│                                                   │
│  🟢 Appareils en ligne (2)                       │
│  ┌─────────────────┐  ┌─────────────────┐       │
│  │ Raspberry-Salon │  │ Raspberry-Bureau│       │
│  │ 🟢 En ligne     │  │ 🟢 En ligne     │       │
│  │ CPU:  25%  ████ │  │ CPU:  45%  ████ │       │
│  │ RAM:  60%  ████ │  │ RAM:  74%  ████ │       │
│  │ Temp: 48°C      │  │ Temp: 56°C      │       │
│  │ 📊 ⚙️  💻       │  │ 📊 ⚙️  💻       │       │
│  └─────────────────┘  └─────────────────┘       │
└──────────────────────────────────────────────────┘
```

### Page de détails
```
┌──────────────────────────────────────────────────┐
│  ← Raspberry-Salon                    💻 Terminal│
├──────────────────────────────────────────────────┤
│  🟢 En ligne                                      │
│                                                   │
│  📊 Métriques actuelles                          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│  │ 25% │ │ 60% │ │ 48°C│ │ 75% │               │
│  │ CPU │ │ RAM │ │TEMP │ │DISK │               │
│  └─────┘ └─────┘ └─────┘ └─────┘               │
│                                                   │
│  📈 Historique [1h] [6h] [24h] [7d]             │
│  ┌──────────────────────────────────────┐        │
│  │        Graphique CPU                  │        │
│  │   %                                   │        │
│  │  100│                                 │        │
│  │   50│  ╱─╲  ╱─╲                       │        │
│  │    0└────────────────────────         │        │
│  └──────────────────────────────────────┘        │
└──────────────────────────────────────────────────┘
```

---

## 🔧 Configuration Réseau

### Si vous avez un routeur

Trouvez l'IP de votre serveur :
```bash
# Sur Linux/Mac
ifconfig | grep "inet "
# ou
ip addr show

# Sur Windows
ipconfig
```

Utilisez cette IP dans `SERVER_URL` sur les Raspberry Pi.

### Exemple
```
Serveur : 192.168.1.10
Raspberry Pi 1 : 192.168.1.20
Raspberry Pi 2 : 192.168.1.21

Dans le .env de chaque Raspberry :
SERVER_URL=http://192.168.1.10:5000
```

---

## 🔥 Astuces Pro

### 1. Accès depuis l'extérieur

Utilisez un service comme **ngrok** pour exposer votre serveur :
```bash
ngrok http 5000
# Utilisez l'URL fournie dans SERVER_URL
```

### 2. Démarrage automatique du serveur

Utilisez **PM2** :
```bash
npm install -g pm2
cd backend
pm2 start server.js --name raspberry-manager
pm2 save
pm2 startup
```

### 3. Surveiller plusieurs Raspberry Pi

Répétez l'étape 2 et 3 pour chaque Raspberry Pi !
Chaque Raspberry aura sa propre clé API.

### 4. Alertes personnalisées

Sur le dashboard, cliquez sur une Raspberry Pi → ⚙️ Paramètres
Modifiez les seuils d'alerte selon vos besoins.

---

## 🆘 Problèmes Courants

### ❌ "Cannot connect to MongoDB"
**Solution** : Installez MongoDB ou utilisez MongoDB Atlas (gratuit)
```bash
# MongoDB Atlas : https://www.mongodb.com/cloud/atlas
# Copiez l'URI de connexion dans backend/.env
```

### ❌ "Port 5000 already in use"
**Solution** : Changez le port dans `backend/.env`
```env
PORT=5001  # Ou autre port disponible
```
Puis mettez à jour `REACT_APP_API_URL` dans `frontend/.env`

### ❌ L'agent ne se connecte pas
**Solution** : Vérifiez le firewall
```bash
# Sur le serveur, autorisez le port 5000
sudo ufw allow 5000
```

### ❌ "Module not found"
**Solution** : Réinstallez les dépendances
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Documentation Complète

- **README.md** : Documentation principale du projet
- **CHECKLIST.md** : Liste complète de ce qui a été créé
- **raspberry-agent/README.md** : Guide détaillé de l'agent

---

## 🎯 Checklist de Démarrage

### Serveur
- [ ] Backend installé et démarré
- [ ] Frontend installé et démarré
- [ ] Compte admin créé
- [ ] Dashboard accessible sur http://localhost:3000

### Première Raspberry Pi
- [ ] Appareil créé sur le dashboard
- [ ] Clé API copiée
- [ ] Agent installé sur la Raspberry
- [ ] Fichier .env configuré
- [ ] Agent démarré et connecté
- [ ] Raspberry visible sur le dashboard

### Deuxième Raspberry Pi
- [ ] Appareil créé sur le dashboard
- [ ] Clé API copiée
- [ ] Agent installé sur la Raspberry
- [ ] Fichier .env configuré
- [ ] Agent démarré et connecté
- [ ] Raspberry visible sur le dashboard

---

## 🎉 C'est parti !

Vous avez maintenant un **dashboard professionnel** pour surveiller toutes vos Raspberry Pi en temps réel !

**Prochaines étapes suggérées :**
1. Configurez les alertes par email (à venir)
2. Créez des comptes pour d'autres utilisateurs
3. Explorez le terminal web
4. Configurez SSL avec Let's Encrypt pour la production

---

**Besoin d'aide ?** Consultez la documentation complète ou ouvrez une issue sur GitHub.

**⭐ N'oubliez pas de star le repo si ça vous plaît !**
