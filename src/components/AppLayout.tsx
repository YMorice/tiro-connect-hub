
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

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
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

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Toggle Button for Mobile */}
      <div className="lg:hidden absolute top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-full"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 bg-sidebar border-r border-sidebar-border shadow-lg lg:relative",
          sidebarOpen ? "w-64" : "w-0 lg:w-20 overflow-hidden"
        )}
      >
        <div className="flex items-center justify-center h-16 border-b border-sidebar-border">
          {sidebarOpen ? (
            <img src="/lovable-uploads/9652b78a-5ef3-4f37-b36c-3afe824ddfbe.png" alt="Tiro Logo" className="h-8" />
          ) : (
            <img src="/lovable-uploads/9652b78a-5ef3-4f37-b36c-3afe824ddfbe.png" alt="Tiro Logo" className="h-6" />
          )}
        </div>

        <div className="flex flex-col flex-1 overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center p-3 rounded-lg transition-all",
                  isActive(item.href)
                    ? "bg-tiro-primary text-white"
                    : "hover:bg-sidebar-accent text-sidebar-foreground"
                )}
              >
                <item.icon size={20} />
                {sidebarOpen && <span className="ml-3">{item.label}</span>}
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-tiro-primary text-white flex items-center justify-center">
                {user?.name?.charAt(0) || "U"}
              </div>
              {sidebarOpen && (
                <div className="ml-3">
                  <p className="font-medium text-sidebar-foreground">{user?.name || "User"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.role || "user"}</p>
                </div>
              )}
            </div>

            {sidebarOpen ? (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut size={20} />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleLogout}
                className="mt-2"
                title="Logout"
              >
                <LogOut size={20} />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
