const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config/config');
const Log = require('../models/Log');

class CommandExecutor {
  static validateDirectory(directory) {
    const resolvedPath = path.resolve(directory);
    return config.ALLOWED_DIRECTORIES.some(allowedDir => 
      resolvedPath.startsWith(path.resolve(allowedDir))
    );
  }

  static async directoryExists(directory) {
    try {
      const stats = await fs.stat(directory);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  static sanitizeCommand(command) {
    // Enlever les commandes dangereuses
    const dangerousCommands = ['rm', 'sudo', 'su', 'chmod', 'chown', 'passwd', 'userdel', 'usermod'];
    const commandParts = command.split(' ');
    const baseCommand = commandParts[0];
    
    if (dangerousCommands.some(dangerous => baseCommand.includes(dangerous))) {
      throw new Error(`Commande non autorisée: ${baseCommand}`);
    }
    
    return command;
  }

  static async executeCommand(command, directory, userId, projectId = null) {
    const startTime = Date.now();
    
    try {
      // Validations
      if (!this.validateDirectory(directory)) {
        throw new Error(`Répertoire non autorisé: ${directory}`);
      }

      if (!(await this.directoryExists(directory))) {
        throw new Error(`Répertoire inexistant: ${directory}`);
      }

      const sanitizedCommand = this.sanitizeCommand(command);

      return new Promise((resolve, reject) => {
        const child = exec(sanitizedCommand, {
          cwd: directory,
          timeout: config.COMMAND_TIMEOUT,
          maxBuffer: 1024 * 1024 // 1MB
        }, async (error, stdout, stderr) => {
          const executionTime = Date.now() - startTime;
          
          // Enregistrer le log
          try {
            await Log.create({
              projectId,
              command: sanitizedCommand,
              output: stdout,
              error: stderr,
              exitCode: error ? error.code : 0,
              executedBy: userId,
              executionTime
            });
          } catch (logError) {
            console.error('Erreur lors de l\'enregistrement du log:', logError);
          }

          if (error) {
            reject({
              success: false,
              error: error.message,
              stderr,
              exitCode: error.code,
              executionTime
            });
          } else {
            resolve({
              success: true,
              stdout,
              stderr,
              exitCode: 0,
              executionTime
            });
          }
        });

        // Gérer le timeout
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGTERM');
            reject({
              success: false,
              error: 'Timeout: Commande annulée après 30 secondes',
              exitCode: -1,
              executionTime: Date.now() - startTime
            });
          }
        }, config.COMMAND_TIMEOUT);
      });

    } catch (error) {
      // Enregistrer l'erreur
      try {
        await Log.create({
          projectId,
          command,
          error: error.message,
          exitCode: -1,
          executedBy: userId,
          executionTime: Date.now() - startTime
        });
      } catch (logError) {
        console.error('Erreur lors de l\'enregistrement du log d\'erreur:', logError);
      }

      throw error;
    }
  }

  static async checkProcessStatus(command, directory) {
    try {
      // Vérifier si un processus est en cours pour ce projet
      const result = await this.executeCommand('ps aux', directory, null);
      return result.stdout.includes(command);
    } catch {
      return false;
    }
  }

  static async killProcess(processPattern, directory, userId) {
    try {
      const killCommand = `pkill -f "${processPattern}"`;
      return await this.executeCommand(killCommand, directory, userId);
    } catch (error) {
      throw new Error(`Impossible d'arrêter le processus: ${error.message}`);
    }
  }
}

module.exports = CommandExecutor;
