
import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  MessageCircle, 
  FolderOpen, 
  UserRound,
  Menu,
  X,
  Shield,
  LogOut,
  Home
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    {
      label: "Tableau de bord",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      label: "Projets",
      icon: FolderOpen,
      href: "/projects",
    },
    {
      label: "Messages",
      icon: MessageCircle,
      href: "/messages",
    },
    {
      label: "Profil",
      icon: UserRound,
      href: "/profile",
    },
    // Show admin link only for admin users
    ...(user?.role === "admin" ? [
      {
        label: "Admin",
        icon: Shield,
        href: "/admin",
      }
    ] : [])
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Error logging out. Please try again.");
    }
  };

  // Safely get user initials
  const getUserInitials = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  // Get avatar URL with cache busting
  const getAvatarUrl = () => {
    if (user?.avatar) {
      return `${user.avatar}?t=${Date.now()}`;
    }
    return undefined;
  };

  // Close sidebar when route changes on mobile
  React.useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Glass Morphism Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/80 backdrop-blur-md border-b border-white/20 shadow-lg">
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="https://tiro.agency">
              <img 
                src="/lovable-uploads/c92f520e-b872-478c-9acd-46addb007ada.png" 
                alt="Tiro Logo" 
                className="h-8" 
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-lg transition-all text-sm font-medium",
                    isActive(item.href)
                      ? "bg-tiro-primary/20 text-tiro-primary backdrop-blur-sm"
                      : "hover:bg-white/10 text-foreground"
                  )}
                >
                  <item.icon size={18} className="mr-2" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          )}

          {/* User Section */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <Avatar className="w-8 h-8">
                {getAvatarUrl() ? (
                  <AvatarImage 
                    src={getAvatarUrl()} 
                    alt={user?.name || "User"}
                    className="object-cover"
                    onError={(e) => {
                      console.error("Failed to load avatar image in header:", getAvatarUrl());
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <AvatarFallback className="bg-tiro-primary text-white text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                )}
              </Avatar>
              {!isMobile && (
                <div className="ml-3">
                  <p className="font-medium text-foreground text-sm">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user?.role || "user"}
                  </p>
                </div>
              )}
            </div>

            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
              title="Logout"
              className="h-8 w-8 hover:bg-white/10"
            >
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content with top padding for fixed header */}
      <main className={cn(
        "w-full",
        isMobile ? "pt-16 pb-20" : "pt-16" // Extra bottom padding on mobile for bottom nav
      )}>
        <div className="w-full min-h-[calc(100vh-4rem)] overflow-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-white/20 shadow-lg">
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.slice(0, 4).map((item) => ( // Show only first 4 items to prevent overflow
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg transition-all min-w-0 flex-1",
                  isActive(item.href)
                    ? "bg-tiro-primary/20 text-tiro-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                )}
              >
                <item.icon size={20} className="mb-1" />
                <span className="text-xs font-medium truncate">{item.label}</span>
              </Link>
            ))}
            
            {/* Show admin button if user is admin and we have space */}
            {user?.role === "admin" && (
              <Link
                to="/admin"
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg transition-all min-w-0 flex-1",
                  isActive("/admin")
                    ? "bg-tiro-primary/20 text-tiro-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                )}
              >
                <Shield size={20} className="mb-1" />
                <span className="text-xs font-medium truncate">Admin</span>
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
};

export default AppLayout;
