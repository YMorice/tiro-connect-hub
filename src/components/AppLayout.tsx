
import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  MessageCircle, 
  FolderOpen, 
  UserRound,
  LogOut,
  Menu,
  X,
  Shield
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

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

  return (
    <div className="flex h-screen bg-gray-50">
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
          "fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 bg-white shadow-lg lg:relative",
          sidebarOpen ? "w-64" : "w-0 lg:w-20 overflow-hidden"
        )}
      >
        <div className="flex items-center justify-center h-16 border-b">
          {sidebarOpen ? (
            <h1 className="text-2xl font-bold text-tiro-purple">Tiro</h1>
          ) : (
            <h1 className="text-xl font-bold text-tiro-purple">T</h1>
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
                    ? "bg-tiro-purple text-white"
                    : "hover:bg-gray-100"
                )}
              >
                <item.icon size={20} />
                {sidebarOpen && <span className="ml-3">{item.label}</span>}
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 rounded-full bg-tiro-purple text-white flex items-center justify-center">
              {user?.name.charAt(0)}
            </div>
            {sidebarOpen && (
              <div className="ml-3">
                <p className="font-medium">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            className={cn(
              "flex items-center w-full",
              !sidebarOpen && "justify-center"
            )}
            onClick={handleLogout}
          >
            <LogOut size={18} />
            {sidebarOpen && <span className="ml-2">Logout</span>}
          </Button>
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
