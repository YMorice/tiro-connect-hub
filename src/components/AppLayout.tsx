
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

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default to closed on mobile
  
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

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Toggle Button for Mobile */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-full bg-background shadow-md"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col transition-transform duration-300 bg-sidebar border-r border-sidebar-border shadow-lg lg:relative lg:transform-none",
          "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-center h-16 border-b border-sidebar-border px-4">
          <img src="/lovable-uploads/c92f520e-b872-478c-9acd-46addb007ada.png" alt="Tiro Logo" className="h-8" />
        </div>

        <div className="flex flex-col flex-1 overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)} // Close sidebar on navigation
                className={cn(
                  "flex items-center p-3 rounded-lg transition-all",
                  isActive(item.href)
                    ? "bg-tiro-primary text-white"
                    : "hover:bg-sidebar-accent text-sidebar-foreground"
                )}
              >
                <item.icon size={20} />
                <span className="ml-3">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              <Avatar className="w-8 h-8 flex-shrink-0">
                {user?.avatar ? (
                  <AvatarImage src={user.avatar} alt={user?.name || "User"} />
                ) : (
                  <AvatarFallback className="bg-tiro-primary text-white">
                    {getUserInitials()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="ml-3 min-w-0 flex-1">
                <p className="font-medium text-sidebar-foreground truncate">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role || "user"}</p>
              </div>
            </div>

            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
              title="Logout"
              className="flex-shrink-0 ml-2"
            >
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto lg:ml-0">
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
