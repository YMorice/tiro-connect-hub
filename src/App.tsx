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
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/auth-context";
import { ProjectProvider } from "@/context/project-context";
import { MessageProvider } from "@/context/message-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";

// Import all page components
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import Profile from "@/pages/Profile";
import Messages from "@/pages/Messages";
import Admin from "@/pages/Admin";
import AdminStudents from "@/pages/AdminStudents";
import AdminEntrepreneurs from "@/pages/AdminEntrepreneurs";
import StudentSelection from "@/pages/StudentSelection";
import NewProject from "@/pages/NewProject";
import PackSelection from "@/pages/PackSelection";
import PersonalDocuments from "@/pages/PersonalDocuments";
import AcceptedStudents from "@/pages/AcceptedStudents";
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

                {/* Protected Routes with AppLayout - Require authentication */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
                  <Route path="/projects/new" element={<NewProject />} />
                  <Route path="/pack-selection" element={<PackSelection />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/admin/students" element={<AdminStudents />} />
                  <Route path="/admin/entrepreneurs" element={<AdminEntrepreneurs />} />
                  <Route path="/student-selection" element={<StudentSelection />} />
                  <Route path="/new-project" element={<NewProject />} />
                  <Route path="/accepted-students" element={<AcceptedStudents />} />
                  <Route path="/documents" element={<PersonalDocuments />} />
                </Route>

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
