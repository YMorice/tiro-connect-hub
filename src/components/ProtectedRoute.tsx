
import { useAuth } from "@/context/auth-context";
import { Navigate, useLocation } from "react-router-dom";
import { UserRole } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | undefined;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si un rôle spécifique est requis, vérifier que l'utilisateur l'a
  if (requiredRole && user.role !== requiredRole) {
    console.log(`Accès refusé : Le rôle utilisateur ${user.role} ne correspond pas au rôle requis ${requiredRole}`);
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
