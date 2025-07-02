module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  ALLOWED_DIRECTORIES: [
    '/home/pi/projects',
    '/home/pi/bots',
    '/home/pi/websites',
    '/opt/projects'
  ],
  MAX_LOG_LINES: 1000,
  COMMAND_TIMEOUT: 30000 // 30 secondes
};