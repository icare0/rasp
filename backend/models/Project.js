const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  directory: {
    type: String,
    required: true
  },
  commands: {
    start: {
      type: String,
      required: true
    },
    stop: {
      type: String
    },
    restart: {
      type: String
    },
    status: {
      type: String
    }
  },
  isRunning: {
    type: Boolean,
    default: false
  },
  processId: {
    type: Number
  },
  lastStarted: {
    type: Date
  },
  lastStopped: {
    type: Date
  },
  autoStart: {
    type: Boolean,
    default: false
  },
  icon: {
    type: String,
    default: '🖥️'
  },
  category: {
    type: String,
    enum: ['bot', 'website', 'script', 'service', 'other'],
    default: 'other'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);