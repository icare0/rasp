const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  command: {
    type: String,
    required: true
  },
  output: {
    type: String
  },
  error: {
    type: String
  },
  exitCode: {
    type: Number
  },
  executedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  executionTime: {
    type: Number // en millisecondes
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
logSchema.index({ projectId: 1, timestamp: -1 });
logSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Log', logSchema);