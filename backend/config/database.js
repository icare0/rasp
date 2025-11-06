const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/raspberry-pi-manager', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB connecté: ${conn.connection.host}`);
  } catch (error) {
    console.error('Erreur de connexion MongoDB:', error);

    // En mode développement, continuer sans MongoDB avec un avertissement
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  AVERTISSEMENT: Le serveur démarre sans MongoDB en mode développement');
      console.warn('⚠️  Les fonctionnalités nécessitant la base de données ne fonctionneront pas');
      console.warn('⚠️  Pour résoudre ce problème:');
      console.warn('   1. Installer MongoDB localement: https://www.mongodb.com/try/download/community');
      console.warn('   2. Ou utiliser Docker: docker run -d -p 27017:27017 mongo:latest');
      console.warn('   3. Ou vérifier votre connexion MongoDB Atlas');
    } else {
      // En production, arrêter le serveur
      process.exit(1);
    }
  }
};

module.exports = connectDB;