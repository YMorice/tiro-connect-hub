
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    compress: false,
    host: true,
    port: 8080,
    headers: {
      // Protection contre le clickjacking
      'X-Frame-Options': 'SAMEORIGIN',

      // Protection XSS
      'X-XSS-Protection': '1; mode=block',

      // Protection contre le MIME-type sniffing
      'X-Content-Type-Options': 'nosniff',

      // Comprehensive CSP with proper Stripe support
      'Content-Security-Policy': [
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
      ].join("; "),

      // Protection contre le HSTS
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',

      // Protection contre le referrer
      'Referrer-Policy': 'strict-origin-when-cross-origin',

      // Protection contre les permissions
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    },
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://192.168.8.158:8080',
        'https://tiro-connect-hub.vercel.app',
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
      maxAge: 86400
    }
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
