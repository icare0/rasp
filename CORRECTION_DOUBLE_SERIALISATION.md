# 🔧 Correction de la double sérialisation Socket.IO

## ❌ Problème identifié

L'erreur que tu avais :
```
Cast to [string] failed for value "[\n  {\n    fs: '/dev/mmcblk0p2'..."
```

**Cause** : **Double sérialisation** !
1. L'agent faisait `JSON.stringify(metrics)` → convertit tout en string
2. Socket.IO fait **automatiquement** `JSON.stringify()` → string de string !
3. Le serveur recevait une string au lieu d'un objet

## ✅ Solution appliquée

### 1. Agent (`raspberry-agent/agent.js`)
```javascript
// AVANT ❌
const metricsJSON = JSON.stringify(metrics);
socket.emit('metrics', metricsJSON);

// APRÈS ✅
socket.emit('metrics', metrics);
// Socket.IO gère automatiquement la sérialisation
```

### 2. Backend (`backend/server.js`)
```javascript
// AVANT ❌
socket.on('metrics', async (metricsData) => {
  let metrics;
  if (typeof metricsData === 'string') {
    metrics = JSON.parse(metricsData); // Parsing complexe
  }
  // ...
})

// APRÈS ✅
socket.on('metrics', async (metrics) => {
  // Socket.IO a déjà désérialisé automatiquement
  // Juste valider les types
  const cleanMetrics = {
    ...metrics,
    disk: Array.isArray(metrics.disk) ? metrics.disk : []
  };
})
```

### 3. Configuration Socket.IO
```javascript
// AVANT ❌
const io = socketIo(server, {
  parser: require('socket.io-parser'), // Causait des problèmes
  allowEIO3: true
});

// APRÈS ✅
const io = socketIo(server, {
  transports: ['websocket', 'polling'] // Simple et efficace
});
```

---

## 🚀 Comment tester la correction

### Étape 1 : Arrêter tous les services
```bash
./stop-all.sh
```

### Étape 2 : Mettre à jour le code
```bash
git pull origin claude/fix-rasp-data-auth-issues-011CUpWGuKtRAiXxssmb9KAh
```

### Étape 3 : Redémarrer tous les services
```bash
./start-all.sh
```

### Étape 4 : Vérifier les logs backend

Tu devrais voir dans le terminal backend :
```
[AGENT] 🍓 Agent connecté: pi (...)
[AGENT] 📊 Métriques reçues de pi - CPU: 9.54% | RAM: 87.82% | Disks: 2
```

**Plus d'erreur "Cast to [string] failed" !** ✅

### Étape 5 : Vérifier le dashboard

1. Ouvre http://localhost:3000
2. Tu devrais voir :
   - ✅ Appareil "Online" 🟢
   - ✅ CPU usage en temps réel
   - ✅ Utilisation RAM
   - ✅ Espace disque (2 partitions)
   - ✅ Température
   - ✅ Graphiques qui se mettent à jour

---

## 🐛 Si ça ne marche toujours pas

### Vérification 1 : Backend reçoit bien les données ?
Regarde les logs backend, tu dois voir :
```
[AGENT] 📊 Métriques reçues de pi - CPU: X.XX% | RAM: X.XX% | Disks: 2
```

Si tu vois "Disks: 2", c'est que le parsing fonctionne !

### Vérification 2 : Erreur de sauvegarde Mongoose ?
Si tu vois encore l'erreur "Cast to [string] failed", envoie-moi :
1. La ligne exacte de l'erreur
2. Les logs de l'agent
3. Les logs du backend

### Vérification 3 : Versions Socket.IO compatibles ?
Vérifie que l'agent et le backend utilisent des versions compatibles :
```bash
# Backend
cd backend
npm list socket.io

# Agent
cd raspberry-agent
npm list socket.io-client
```

Versions recommandées :
- Backend : socket.io ^4.x
- Agent : socket.io-client ^4.x

---

## 📊 Ce qui devrait fonctionner maintenant

✅ Connexion de l'agent sans erreur
✅ Réception des métriques toutes les 5 secondes
✅ Sauvegarde dans MongoDB sans erreur
✅ Affichage dans le dashboard
✅ Graphiques temps réel
✅ Alertes si seuils dépassés

---

## 🎯 Commits dans la branche

1. **5b437d7** - Correction CORS, auth, rate limiting + scripts
2. **4676e27** - Premier essai sérialisation (avec JSON.stringify)
3. **21980bd** - Documentation PR
4. **a724902** - ✅ **Correction finale de la double sérialisation**

---

Teste et dis-moi si ça fonctionne maintenant ! 🍓

Si l'erreur persiste, envoie-moi les nouveaux logs complets.
