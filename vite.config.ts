import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    compress : false,
    host: true,
    port: 8080,
    headers: {
      // Protection contre le clickjacking
      'X-Frame-Options': 'DENY',

      // Protection XSS
      'X-XSS-Protection': '1; mode=block',

      // Protection contre le MIME-type sniffing
      'Content-Security-Policy': "default-src 'self' blob: data: https: https://js.stripe.com https://m.stripe.com https://m.stripe.network https://connect-js.stripe.com https://hooks.stripe.com https://*.stripe.com; base-uri 'self'; object-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://connect-js.stripe.com https://cdn.jsdelivr.net https://cdn.gpteng.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: https://*.stripe.com; connect-src 'self' ws: wss: https://api.stripe.com https://js.stripe.com https://connect-js.stripe.com https://m.stripe.com https://m.stripe.network https://hooks.stripe.com https://zkypxeoihxjrmbwqkeyd.supabase.co; frame-src 'self' data: https://js.stripe.com https://connect-js.stripe.com https://hooks.stripe.com https://m.stripe.com https://m.stripe.network https://*.stripe.com; child-src 'self' https://*.stripe.com; frame-ancestors 'self'",

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
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
