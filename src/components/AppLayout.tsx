
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
  Home,
  Settings,
  ChevronDown,
  HeadphonesIcon,
  FileText
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;

  const handleLogout = React.useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Error logging out. Please try again.");
    }
  }, [logout, navigate]);

  const navItems = React.useMemo(() => ([
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
    }
  ]), []);

  const settingsItems = React.useMemo(() => ([
    {
      label: "Profil",
      icon: UserRound,
      href: "/profile",
    },
    {
      label: "Mes Documents",
      icon: FileText,
      href: "/documents",
    },
    {
      label: "Contacter le support",
      icon: HeadphonesIcon,
      href: "https://tiro.agency/support",
    },
    {
      label: "Déconnexion",
      icon: LogOut,
      action: handleLogout
    }
  ]), [handleLogout]);

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

  // Get avatar URL (no cache-busting to avoid reload on each render)
  const getAvatarUrl = React.useCallback(() => {
    return user?.pp_link || undefined;
  }, [user?.pp_link]);

  // Close sidebar when route changes on mobile
  React.useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  if (isMobile) {
    return (
      <div className="min-h-screen w-full bg-background">
        {/* Mobile Header */}
        <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between h-full px-4">
            <Link to="https://tiro.agency">
              <img 
                src="/lovable-uploads/c92f520e-b872-478c-9acd-46addb007ada.png" 
                alt="Tiro Logo" 
                className="h-10" 
                decoding="async"
                draggable="false"
              />
            </Link>
            <div className="flex items-center space-x-2">
              <Avatar className="w-8 h-8">
                {getAvatarUrl() ? (
                  <AvatarImage 
                    src={getAvatarUrl()} 
                    alt={user?.name || "User"}
                    className="object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <AvatarFallback className="bg-tiro-primary text-white text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
          </div>
        </header>

        {/* Mobile Main Content */}
        <main className="pt-16 pb-20">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border">
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg transition-all min-w-0 flex-1",
                  isActive(item.href)
                    ? "bg-tiro-gray2 text-tiro-black"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon size={18} className="mb-1" />
                <span className="text-xs font-medium truncate">{item.label}</span>
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "flex flex-col items-center justify-center p-2 h-auto min-w-0 flex-1",
                    "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Home size={24} className="mb-1" />
                  <span className="text-xs font-medium truncate">Mon espace</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {settingsItems.map((item) => (
                  <DropdownMenuItem
                    key={item.label}
                    onClick={item.action}
                    asChild={!!item.href}
                  >
                    {item.href ? (
                      <Link to={item.href} className="flex items-center">
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    ) : (
                      <div className="flex items-center cursor-pointer">
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </div>
    );
  }

  // Desktop Layout with Left Sidebar
  return (
    <div className="min-h-screen w-full bg-background flex">
      {/* Left Sidebar */}
      <aside className="fixed left-4 top-4 h-[calc(100vh-2rem)] w-56 bg-tiro-white backdrop-blur-md border border-border rounded-[25px] shadow-lg flex flex-col z-40 overflow-hidden">
        {/* Logo Section */}
        <div className="p-6 flex justify-center">
          <Link to="https://tiro.agency" className="block">
            <img 
              src="/lovable-uploads/c92f520e-b872-478c-9acd-46addb007ada.png" 
              alt="Tiro Logo" 
              className="h-12" 
              decoding="async"
              draggable="false"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center px-4 py-3 rounded-[5px] transition-all text-sm font-medium group",
                isActive(item.href)
                  ? "bg-tiro-gray2 text-tiro-black"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <item.icon size={16} className="mr-3" />
              <span>{item.label}</span>
            </Link>
          ))}
          
          {/* Settings Expandable Section */}
          <div className="space-y-1">
            <Button
              variant="ghost"
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={cn(
                "w-full justify-start px-4 py-3 h-auto text-sm font-medium",
                "text-foreground hover:bg-muted"
              )}
            >
              <Home size={20} className="mr-3" />
              <span>Mon espace</span>
              <ChevronDown 
                size={16} 
                className={cn(
                  "ml-auto transition-transform duration-200",
                  settingsOpen && "rotate-180"
                )} 
              />
            </Button>
            {settingsOpen && (
              <div className="pl-4 space-y-1">
                {settingsItems.map((item) => (
                  item.href ? (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="flex items-center px-4 py-2 rounded-[5px] text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  ) : (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="w-full flex items-center px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  )
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 w-fit mx-auto">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              {getAvatarUrl() ? (
                <AvatarImage 
                  src={getAvatarUrl()} 
                  alt={user?.name || "User"}
                  className="object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <AvatarFallback className="bg-tiro-primary text-white">
                  {getUserInitials()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-muted-foreground capitalize truncate">
                {user?.role === 'student' ? 'Étudiant' : user?.role === 'entrepreneur' ? 'Entrepreneur' : user?.role || "user"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-[15rem]">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
