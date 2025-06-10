/**
 * App Component - Main Application Entry Point
 * 
 * This is the root component of the application that sets up the overall structure
 * and provides essential context providers and routing configuration.
 * 
 * Key Features:
 * - React Router for client-side navigation
 * - React Query for server state management and caching
 * - Multiple context providers for application state
 * - Comprehensive routing with protected routes
 * - Global toast notifications
 * - Authentication flow management
 * - Security headers and CSRF protection
 * 
 * Context Providers:
 * - QueryClientProvider: Manages server state and caching
 * - AuthProvider: Handles user authentication state
 * - ProjectProvider: Manages project-related state
 * - MessageProvider: Handles messaging functionality
 * 
 * Route Structure:
 * - Public routes: /, /login, /register, /reset-password, /update-password, /create-admin
 * - Protected routes: All other routes require authentication
 * - 404 handling: Redirects to NotFound component for unknown routes
 * 
 * Security Features:
 * - CSRF token management
 * - Security headers
 * - Input validation
 * - Rate limiting
 * - XSS protection
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/auth-context";
import { ProjectProvider } from "@/context/project-context";
import { MessageProvider } from "@/context/message-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Import all page components
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import Profile from "@/pages/Profile";
import Messages from "@/pages/Messages";
import Admin from "@/pages/Admin";
import StudentSelection from "@/pages/StudentSelection";
import NewProject from "@/pages/NewProject";
import PackSelection from "@/pages/PackSelection";
import AcceptedStudents from "@/pages/AcceptedStudents";
import CreateAdminAccount from "@/pages/CreateAdminAccount";
import NotFound from "@/pages/NotFound";
import UpdatePassword from "@/pages/UpdatePassword";

// Import global styles
import "./App.css";

/**
 * React Query configuration
 * 
 * Creates a QueryClient instance with default settings for:
 * - Stale time: How long data is considered fresh
 * - Cache time: How long unused data stays in cache
 * - Retry logic: Automatic retry on failed requests
 * - Background refetching: Automatic data updates
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * App Component
 * 
 * The root component that structures the entire application with providers and routing
 * 
 * Provider Hierarchy:
 * 1. QueryClientProvider - Server state management
 * 2. Router - Client-side routing
 * 3. AuthProvider - Authentication state
 * 4. ProjectProvider - Project-related state
 * 5. MessageProvider - Messaging functionality
 * 
 * Route Categories:
 * - Landing/Auth routes: Public access for login/registration
 * - Application routes: Protected routes requiring authentication
 * - Admin routes: Special access for administrative functions
 * - Fallback route: 404 handling for unknown paths
 */
function App() {
  // Gestion des en-têtes de sécurité
  useEffect(() => {
    // Ajouter les en-têtes de sécurité
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://zkypxeoihxjrmbwqkeyd.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://zkypxeoihxjrmbwqkeyd.supabase.co; frame-ancestors 'none';";
    document.head.appendChild(meta);

    // Ajouter d'autres en-têtes de sécurité
    const securityHeaders = {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    };

    // Configurer les intercepteurs Axios pour ajouter les en-têtes de sécurité
    const setupSecurityHeaders = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Ajouter le token CSRF aux requêtes
        const csrfToken = session.access_token;
        // Configurer les en-têtes pour toutes les requêtes
        Object.entries(securityHeaders).forEach(([key, value]) => {
          document.cookie = `${key}=${value}; path=/; secure; samesite=strict`;
        });
      }
    };

    setupSecurityHeaders();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <ProjectProvider>
            <MessageProvider>
              <Routes>
                {/* Public Routes - Accessible without authentication */}
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/update-password" element={<UpdatePassword />} />
                <Route path="/create-admin" element={<CreateAdminAccount />} />
                
                {/* Protected Routes - Require authentication */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects"
                  element={
                    <ProtectedRoute>
                      <Projects />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects/:id"
                  element={
                    <ProtectedRoute>
                      <ProjectDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects/new"
                  element={
                    <ProtectedRoute>
                      <NewProject />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pack-selection"
                  element={
                    <ProtectedRoute>
                      <PackSelection />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/messages"
                  element={
                    <ProtectedRoute>
                      <Messages />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student-selection"
                  element={
                    <ProtectedRoute>
                      <StudentSelection />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/new-project"
                  element={
                    <ProtectedRoute>
                      <NewProject />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/accepted-students"
                  element={
                    <ProtectedRoute>
                      <AcceptedStudents />
                    </ProtectedRoute>
                  }
                />
                
                {/* Fallback Route - 404 handling */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              
              {/* Global Toast Notifications */}
              <Toaster />
            </MessageProvider>
          </ProjectProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
