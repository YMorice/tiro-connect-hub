/**
 * Service de journalisation sécurisé
 * 
 * Ce service gère la journalisation des événements et des erreurs de manière sécurisée,
 * en s'assurant que les informations sensibles ne sont pas exposées.
 */

// Types d'événements à journaliser
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
}

// Fonction pour nettoyer les données sensibles
const sanitizeData = (data: any): any => {
  if (!data) return data;
  
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  });
  
  return sanitized;
};

// Fonction de journalisation principale
const log = (level: LogLevel, message: string, context?: Record<string, any>, userId?: string) => {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: context ? sanitizeData(context) : undefined,
    userId
  };

  // En production, envoyer les logs à un service externe
  if (import.meta.env.PROD) {
    // TODO: Implémenter l'envoi des logs à un service externe
    console.log(JSON.stringify(entry));
  } else {
    // En développement, afficher dans la console avec des couleurs
    const colors = {
      info: '\x1b[36m', // Cyan
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      debug: '\x1b[35m', // Magenta
    };
    console.log(`${colors[level]}${JSON.stringify(entry, null, 2)}\x1b[0m`);
  }
};

// Exporter les fonctions de journalisation
export const logger = {
  info: (message: string, context?: Record<string, any>, userId?: string) => 
    log('info', message, context, userId),
  
  warn: (message: string, context?: Record<string, any>, userId?: string) => 
    log('warn', message, context, userId),
  
  error: (message: string, context?: Record<string, any>, userId?: string) => 
    log('error', message, context, userId),
  
  debug: (message: string, context?: Record<string, any>, userId?: string) => 
    log('debug', message, context, userId),
}; 