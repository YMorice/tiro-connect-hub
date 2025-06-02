
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
  LogOut
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
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      label: "Projects",
      icon: FolderOpen,
      href: "/projects",
    },
    {
      label: "Messages",
      icon: MessageCircle,
      href: "/messages",
    },
    {
      label: "Profile",
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
    <div className="h-screen w-screen flex overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-30" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Header with Menu Button */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 h-14 bg-background border-b border-sidebar-border z-20 flex items-center px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-3"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
          <img 
            src="/lovable-uploads/c92f520e-b872-478c-9acd-46addb007ada.png" 
            alt="Tiro Logo" 
            className="h-6" 
          />
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col transition-transform duration-300 bg-sidebar border-r border-sidebar-border shadow-lg",
          "w-64",
          isMobile 
            ? sidebarOpen ? "translate-x-0" : "-translate-x-full"
            : "relative transform-none"
        )}
      >
        {/* Desktop Logo */}
        {!isMobile && (
          <div className="flex items-center justify-center h-16 border-b border-sidebar-border px-4 flex-shrink-0">
            <img 
              src="/lovable-uploads/c92f520e-b872-478c-9acd-46addb007ada.png" 
              alt="Tiro Logo" 
              className="h-8" 
            />
          </div>
        )}

        {/* Mobile spacing for header */}
        {isMobile && <div className="h-14 flex-shrink-0" />}

        <div className="flex flex-col flex-1 overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={cn(
                  "flex items-center p-3 rounded-lg transition-all text-sm lg:text-base",
                  isActive(item.href)
                    ? "bg-tiro-primary text-white"
                    : "hover:bg-sidebar-accent text-sidebar-foreground"
                )}
              >
                <item.icon size={isMobile ? 18 : 20} />
                <span className="ml-3">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* User Info and Logout */}
        <div className="p-4 border-t border-sidebar-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              <Avatar className="w-8 h-8 flex-shrink-0">
                {getAvatarUrl() ? (
                  <AvatarImage 
                    src={getAvatarUrl()} 
                    alt={user?.name || "User"}
                    className="object-cover"
                    onError={(e) => {
                      console.error("Failed to load avatar image in sidebar:", getAvatarUrl());
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <AvatarFallback className="bg-tiro-primary text-white text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="ml-3 min-w-0 flex-1">
                <p className="font-medium text-sidebar-foreground truncate text-sm">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role || "user"}
                </p>
              </div>
            </div>

            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
              title="Logout"
              className="flex-shrink-0 ml-2 h-8 w-8"
            >
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col h-full overflow-hidden",
        isMobile ? "pt-14" : "",
        !isMobile ? "ml-0" : ""
      )}>
        <div className="flex-1 h-full overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
