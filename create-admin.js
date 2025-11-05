const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Importer le modèle User
const User = require('./backend/models/User');

// Charger la configuration
const envPath = path.join(__dirname, 'backend', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  try {
    console.log('🔧 Création d\'un utilisateur administrateur');
    console.log('==========================================');

    // Connexion à MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/raspberry-manager';
    console.log('Connexion à MongoDB...');
    console.log(`URI: ${mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//<user>:<password>@')}`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB');

    // Vérifier les utilisateurs existants
    const userCount = await User.countDocuments();
    console.log(`📊 Nombre d'utilisateurs existants: ${userCount}`);

    if (userCount > 0) {
      const existingUsers = await User.find({}, 'username email role').limit(5);
      console.log('\n👥 Utilisateurs existants:');
      existingUsers.forEach(user => {
        console.log(`  - ${user.username} (${user.email}) - ${user.role}`);
      });

      const proceed = await question('\n❓ Voulez-vous créer un nouvel administrateur malgré tout? (y/N): ');
      if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
        console.log('❌ Création annulée');
        process.exit(0);
      }
    }

    // Demander les informations du nouvel admin
    console.log('\n📝 Informations du nouvel administrateur:');
    const username = await question('Nom d\'utilisateur [admin]: ') || 'admin';
    const email = await question('Email [admin@raspberry-pi.local]: ') || 'admin@raspberry-pi.local';
    let password = await question('Mot de passe [admin123]: ') || 'admin123';

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      console.log('⚠️  Un utilisateur avec ce nom ou email existe déjà!');
      const overwrite = await question('Voulez-vous le remplacer? (y/N): ');
      
      if (overwrite.toLowerCase() === 'y' || overwrite.toLowerCase() === 'yes') {
        await User.deleteOne({ _id: existingUser._id });
        console.log('🗑️  Ancien utilisateur supprimé');
      } else {
        console.log('❌ Création annulée');
        process.exit(0);
      }
    }

    // Créer le nouvel administrateur
    console.log('\n🔨 Création de l\'utilisateur...');
    
    const admin = new User({
      username,
      email,
      password, // Le password sera automatiquement hashé par le pre-save hook
      role: 'admin',
      isActive: true
    });

    await admin.save();
    
    console.log('\n✅ Utilisateur administrateur créé avec succès!');
    console.log('==========================================');
    console.log(`👤 Nom d'utilisateur: ${username}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Mot de passe: ${password}`);
    console.log(`👑 Rôle: admin`);
    console.log('\n⚠️  IMPORTANT: Changez ce mot de passe après la première connexion!');
    console.log(`🌐 Accédez à l'interface: ${process.env.FRONTEND_URL || 'http://localhost'}`);

  } catch (error) {
    console.error('❌ Erreur lors de la création:', error.message);
    
    if (error.code === 11000) {
      console.log('💡 Cet utilisateur existe déjà. Utilisez --force pour le remplacer.');
    }
  } finally {
    await mongoose.disconnect();
    rl.close();
    process.exit(0);
  }
}

// Gestion des arguments de ligne de commande
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔧 Script de création d'administrateur pour Raspberry Pi Manager

Usage:
  node create-admin.js                 # Mode interactif
  node create-admin.js --auto          # Création automatique (admin/admin123)
  node create-admin.js --list          # Lister les utilisateurs existants
  node create-admin.js --reset         # Supprimer tous les utilisateurs

Options:
  --help, -h        Afficher cette aide
  --auto            Créer automatiquement admin/admin123
  --list            Lister les utilisateurs
  --reset           Reset complet des utilisateurs
`);
  process.exit(0);
}

// Mode automatique
if (args.includes('--auto')) {
  createAutoAdmin();
} else if (args.includes('--list')) {
  listUsers();
} else if (args.includes('--reset')) {
  resetUsers();
} else {
  createAdmin();
}

// Fonction pour création automatique
async function createAutoAdmin() {
  try {
    console.log('🚀 Création automatique de l\'administrateur par défaut...');

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/raspberry-manager';
    await mongoose.connect(mongoUri);
    
    // Supprimer l'ancien admin s'il existe
    await User.deleteOne({ username: 'admin' });
    
    const admin = new User({
      username: 'admin',
      email: 'admin@raspberry-pi.local',
      password: 'admin123',
      role: 'admin',
      isActive: true
    });

    await admin.save();
    
    console.log('✅ Administrateur créé automatiquement:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   ⚠️  Changez ce mot de passe immédiatement!');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Fonction pour lister les utilisateurs
async function listUsers() {
  try {
    console.log('👥 Liste des utilisateurs:');
    console.log('=========================');

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/raspberry-manager';
    await mongoose.connect(mongoUri);
    
    const users = await User.find({}, 'username email role isActive createdAt lastLogin');
    
    if (users.length === 0) {
      console.log('📭 Aucun utilisateur trouvé');
      console.log('💡 Utilisez "node create-admin.js --auto" pour créer un admin');
    } else {
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.username}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   👑 Rôle: ${user.role}`);
        console.log(`   ✅ Actif: ${user.isActive ? 'Oui' : 'Non'}`);
        console.log(`   📅 Créé: ${user.createdAt.toLocaleDateString('fr-FR')}`);
        console.log(`   🕐 Dernière connexion: ${user.lastLogin ? user.lastLogin.toLocaleDateString('fr-FR') : 'Jamais'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Fonction pour reset tous les utilisateurs
async function resetUsers() {
  try {
    console.log('⚠️  ATTENTION: Cette action va supprimer TOUS les utilisateurs!');

    const confirm = await question('Êtes-vous sûr? Tapez "SUPPRIMER TOUT" pour confirmer: ');

    if (confirm !== 'SUPPRIMER TOUT') {
      console.log('❌ Action annulée');
      process.exit(0);
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/raspberry-manager';
    await mongoose.connect(mongoUri);
    
    const result = await User.deleteMany({});
    console.log(`🗑️  ${result.deletedCount} utilisateur(s) supprimé(s)`);
    
    // Créer automatiquement un nouvel admin
    const admin = new User({
      username: 'admin',
      email: 'admin@raspberry-pi.local',
      password: 'admin123',
      role: 'admin',
      isActive: true
    });

    await admin.save();
    console.log('✅ Nouvel administrateur créé: admin/admin123');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    rl.close();
    process.exit(0);
  }
}
