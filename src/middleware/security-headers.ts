import { NextFunction, Request, Response } from 'express';

export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Protection contre le clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Protection XSS
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Protection contre le MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Politique de sécurité du contenu (CSP)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://zkypxeoihxjrmbwqkeyd.supabase.co; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self' https://zkypxeoihxjrmbwqkeyd.supabase.co; " +
    "frame-ancestors 'none';"
  );
  
  // Protection contre le HSTS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Protection contre le referrer
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Protection contre les permissions
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
}; 