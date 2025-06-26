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
      'Content-Security-Policy': [
        // base
        "default-src 'self'",
        "base-uri  'self'",
        "object-src 'none'",

        // JS externes (Stripe, GPT Eng, jsDelivr)
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' " +
          "https://js.stripe.com https://connect-js.stripe.com " +
          "https://cdn.jsdelivr.net https://cdn.gpteng.co",

        // CSS externes (Google Fonts)
        "style-src  'self' 'unsafe-inline' https://fonts.googleapis.com",

        // Polices Google
        "font-src   'self' https://fonts.gstatic.com",

        // images (logos Stripe)
        "img-src    'self' data: https: https://*.stripe.com",

        // XHR / fetch / websockets
        "connect-src 'self' " +
          "https://api.stripe.com https://js.stripe.com https://connect-js.stripe.com " +
          "https://zkypxeoihxjrmbwqkeyd.supabase.co",

        // iframes Stripe (Elements, 3-D Secure, hCaptcha, etc.)
        "frame-src  'self' https://js.stripe.com https://connect-js.stripe.com https://hooks.stripe.com https://*.stripe.com",

        // certains navigateurs exigent encore child-src
        "child-src  'self' https://*.stripe.com",

        // protection anti-clickjacking
        "frame-ancestors 'self'"
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
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
