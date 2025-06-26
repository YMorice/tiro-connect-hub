
import { randomBytes } from 'crypto';

// Stockage des tokens CSRF (en production, utilisez Redis ou une base de données)
const csrfTokens = new Map<string, { token: string; expires: number }>();

// Durée de validité du token CSRF (1 heure)
const TOKEN_EXPIRY = 60 * 60 * 1000;

// Méthodes HTTP qui nécessitent une protection CSRF
const PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

// Simple CSRF token generation for frontend use
export const generateCsrfToken = () => {
  const token = randomBytes(32).toString('hex');
  const expires = Date.now() + TOKEN_EXPIRY;
  
  // Store the token with a generic key (could be improved with user sessions)
  const sessionKey = 'default';
  csrfTokens.set(sessionKey, { token, expires });
  
  return { token, expires };
};

// Simple CSRF token validation for frontend use
export const validateCsrfToken = (token: string) => {
  const sessionKey = 'default';
  const storedToken = csrfTokens.get(sessionKey);

  // Vérifier si le token existe et n'est pas expiré
  if (!storedToken || storedToken.expires < Date.now()) {
    console.warn('Token CSRF invalide ou expiré');
    return false;
  }

  // Vérifier si le token correspond
  if (token !== storedToken.token) {
    console.warn('Token CSRF ne correspond pas');
    return false;
  }

  // Nettoyer les tokens expirés
  cleanupExpiredTokens();
  return true;
};

// Cleanup function for expired tokens
const cleanupExpiredTokens = () => {
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expires < now) {
      csrfTokens.delete(key);
    }
  }
};

// Middleware de nettoyage des tokens CSRF
export const cleanupCsrfTokens = () => {
  setInterval(() => {
    cleanupExpiredTokens();
  }, 60 * 60 * 1000); // Nettoyage toutes les heures
};
