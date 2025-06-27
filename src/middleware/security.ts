
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Configuration du rate limiter
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite chaque IP à 100 requêtes par fenêtre
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware de sécurité
export const securityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Protection contre le clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Protection XSS
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Protection contre le MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Comprehensive CSP with proper Stripe support
  const csp = [
    "default-src 'self' blob: data: https:",
    "base-uri 'self'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://connect-js.stripe.com https://cdn.jsdelivr.net https://cdn.gpteng.co https://zkypxeoihxjrmbwqkeyd.supabase.co",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' ws: wss: https://api.stripe.com https://js.stripe.com https://connect-js.stripe.com https://m.stripe.com https://m.stripe.network https://hooks.stripe.com https://zkypxeoihxjrmbwqkeyd.supabase.co",
    "frame-src 'self' https://js.stripe.com https://connect-js.stripe.com https://hooks.stripe.com https://m.stripe.com https://m.stripe.network https://*.stripe.com data:",
    "child-src 'self' https://js.stripe.com https://connect-js.stripe.com https://*.stripe.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'"
  ].join("; ");
  
  res.setHeader('Content-Security-Policy', csp);
  
  // Protection contre le HSTS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Protection contre le referrer
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Protection contre les permissions
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Configuration CORS
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://192.168.8.158:8080',
    'https://tiro-connect-hub.vercel.app'
  ];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Gestion des requêtes OPTIONS (pre-flight)
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
};

// Middleware de protection contre les attaques par force brute
export const bruteForceProtection = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5, // 5 tentatives
  message: 'Trop de tentatives de connexion, veuillez réessayer dans une heure',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Middleware de protection contre les attaques par injection
export const injectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeInput = (input: string) => {
    return input
      .replace(/[<>]/g, '') // Supprime les balises HTML
      .replace(/javascript:/gi, '') // Supprime les protocoles javascript:
      .replace(/on\w+=/gi, '') // Supprime les gestionnaires d'événements
      .trim();
  };

  // Nettoyer les paramètres de requête
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeInput(req.query[key] as string);
      }
    });
  }

  // Nettoyer le corps de la requête
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    });
  }

  next();
};
