
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/auth-context";
import { ProjectProvider } from "@/context/project-context";
import { MessageProvider } from "@/context/message-context";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import "./App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <ProjectProvider>
            <MessageProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/create-admin" element={<CreateAdminAccount />} />
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
                  path="/pack-selection"
                  element={
                    <ProtectedRoute>
                      <PackSelection />
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
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
            </MessageProvider>
          </ProjectProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
