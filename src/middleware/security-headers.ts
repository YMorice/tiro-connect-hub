
import { NextFunction, Request, Response } from 'express';

export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Protection contre le clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Protection XSS
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Protection contre le MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Politique de sécurité du contenu (CSP) - Comprehensive version matching vite.config.ts
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' blob: data: https: https://js.stripe.com https://m.stripe.com https://m.stripe.network https://connect-js.stripe.com https://hooks.stripe.com https://*.stripe.com; " +
    "base-uri 'self'; " +
    "object-src 'none'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://connect-js.stripe.com https://cdn.jsdelivr.net https://cdn.gpteng.co https://zkypxeoihxjrmbwqkeyd.supabase.co; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https: https://*.stripe.com; " +
    "connect-src 'self' ws: wss: https://api.stripe.com https://js.stripe.com https://connect-js.stripe.com https://m.stripe.com https://m.stripe.network https://hooks.stripe.com https://zkypxeoihxjrmbwqkeyd.supabase.co; " +
    "frame-src 'self' data: https://js.stripe.com https://connect-js.stripe.com https://hooks.stripe.com https://m.stripe.com https://m.stripe.network https://*.stripe.com; " +
    "child-src 'self' https://*.stripe.com; " +
    "frame-ancestors 'self';"
  );
  
  // Protection contre le HSTS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Protection contre le referrer
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Protection contre les permissions
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};
