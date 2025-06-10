import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { logger } from '@/services/logger-service';

// Stockage des tokens CSRF (en production, utilisez Redis ou une base de données)
const csrfTokens = new Map<string, { token: string; expires: number }>();

// Durée de validité du token CSRF (1 heure)
const TOKEN_EXPIRY = 60 * 60 * 1000;

// Méthodes HTTP qui nécessitent une protection CSRF
const PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

// Middleware de génération de token CSRF
export const generateCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  // Générer un token CSRF
  const token = randomBytes(32).toString('hex');
  const expires = Date.now() + TOKEN_EXPIRY;

  // Stocker le token
  csrfTokens.set(req.session?.id || req.ip, { token, expires });

  // Envoyer le token au client
  res.setHeader('X-CSRF-Token', token);
  
  // Ajouter le token aux cookies pour les requêtes AJAX
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY
  });

  next();
};

// Middleware de vérification du token CSRF
export const validateCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  // Vérifier si la méthode nécessite une protection CSRF
  if (!PROTECTED_METHODS.includes(req.method)) {
    return next();
  }

  const sessionId = req.session?.id || req.ip;
  const storedToken = csrfTokens.get(sessionId);

  // Vérifier si le token existe et n'est pas expiré
  if (!storedToken || storedToken.expires < Date.now()) {
    logger.warn('Token CSRF invalide ou expiré', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    return res.status(403).json({
      status: 'error',
      code: 'INVALID_CSRF_TOKEN',
      message: 'Token CSRF invalide ou expiré',
    });
  }

  // Récupérer le token de la requête
  const token = req.headers['x-csrf-token'] || req.cookies['XSRF-TOKEN'];

  // Vérifier si le token correspond
  if (token !== storedToken.token) {
    logger.warn('Token CSRF ne correspond pas', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    return res.status(403).json({
      status: 'error',
      code: 'INVALID_CSRF_TOKEN',
      message: 'Token CSRF invalide',
    });
  }

  // Nettoyer les tokens expirés
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expires < Date.now()) {
      csrfTokens.delete(key);
    }
  }

  next();
};

// Middleware de nettoyage des tokens CSRF
export const cleanupCsrfTokens = () => {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of csrfTokens.entries()) {
      if (value.expires < now) {
        csrfTokens.delete(key);
      }
    }
  }, 60 * 60 * 1000); // Nettoyage toutes les heures
}; 