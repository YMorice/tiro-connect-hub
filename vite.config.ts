import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      // Protection contre le clickjacking
      'X-Frame-Options': 'DENY',
      
      // Protection XSS
      'X-XSS-Protection': '1; mode=block',
      
      // Protection contre le MIME-type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // Politique de sécurité du contenu (CSP)
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://zkypxeoihxjrmbwqkeyd.supabase.co",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self' https://zkypxeoihxjrmbwqkeyd.supabase.co",
        "frame-ancestors 'none'"
      ].join('; '),
      
      // Protection contre le HSTS
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      
      // Protection contre le referrer
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Protection contre les permissions
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    },
    cors: {
      origin: [
        'http://localhost:5173', // Développement local
        'http://localhost:3000', // Alternative
        'https://tiro-connect-hub.vercel.app', // Production
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
      ],
      credentials: true,
      maxAge: 86400 // 24 heures
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
