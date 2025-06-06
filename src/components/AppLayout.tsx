
import React from "react";
import { useAuth } from "@/context/auth-context";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User, MessageSquare, Briefcase, Settings, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      logout();
      navigate("/login");
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Error logging out");
    }
  };

  const navigationItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: Briefcase, label: "Projects", path: "/projects" },
    { icon: MessageSquare, label: "Messages", path: "/messages" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const isActivePath = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen min-h-dvh bg-background flex flex-col w-full">
      {/* Header */}
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-tiro-purple cursor-pointer" onClick={() => navigate("/dashboard")}>
                Tiro
              </h1>
            </div>

            {/* Desktop Navigation */}
            {!isMobile && (
              <nav className="hidden md:flex space-x-8">
                {navigationItems.map((item) => (
                  <Button
                    key={item.path}
                    variant={isActivePath(item.path) ? "default" : "ghost"}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center space-x-2 ${
                      isActivePath(item.path) 
                        ? "bg-tiro-purple text-white" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                ))}
              </nav>
            )}

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{user?.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Mobile Navigation */}
      {isMobile && (
        <nav className="md:hidden bg-white border-t shadow-lg flex-shrink-0 safe-area-bottom">
          <div className="flex justify-around items-center h-16 px-4">
            {navigationItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center space-y-1 p-2 min-w-0 flex-1 ${
                  isActivePath(item.path) 
                    ? "text-tiro-purple" 
                    : "text-gray-600"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActivePath(item.path) ? "text-tiro-purple" : ""}`} />
                <span className="text-xs truncate">{item.label}</span>
              </Button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};

export default AppLayout;
