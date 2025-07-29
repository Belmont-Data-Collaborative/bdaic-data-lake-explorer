import { useLocation } from "wouter";
import { Database, Cloud, LogOut, Settings, Shield, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import { queryClient } from "@/lib/queryClient";
import type { AwsConfig } from "@shared/schema";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  systemRole?: string;
  customRoleId?: number;
}

interface MainLayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
  currentUser?: User | null;
}

export function MainLayout({ children, onLogout, currentUser }: MainLayoutProps) {
  const [location, navigate] = useLocation();

  const { data: awsConfig } = useQuery<AwsConfig>({
    queryKey: ["/api/aws-config"],
  });

  const currentTab = location === "/user-panel" ? "user-panel" : 
                    location === "/admin" ? "admin" :
                    location === "/aws-config" ? "aws-config" : "home";

  const handleTabChange = (value: string) => {
    if (value === "home") {
      navigate("/");
    } else if (value === "user-panel") {
      navigate("/user-panel");
    } else if (value === "admin") {
      navigate("/admin");
    } else if (value === "aws-config") {
      navigate("/aws-config");
    }
  };

  // Keyboard navigation for tab switching
  const isAdmin = currentUser?.role === 'admin';
  const availableTabs = isAdmin
    ? ["home", "user-panel", "aws-config", "admin"]
    : ["home", "user-panel"];

  useKeyboardNavigation({
    onArrowLeft: () => {
      const currentIndex = availableTabs.indexOf(currentTab);
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : availableTabs.length - 1;
      handleTabChange(availableTabs[prevIndex]!);
    },
    onArrowRight: () => {
      const currentIndex = availableTabs.indexOf(currentTab);
      const nextIndex = currentIndex < availableTabs.length - 1 ? currentIndex + 1 : 0;
      handleTabChange(availableTabs[nextIndex]!);
    },

  });

  const handleLogout = () => {
    // Clear all authentication-related data
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');  
    localStorage.removeItem('authenticated'); // Legacy cleanup

    // Clear query cache to remove any cached user-specific data
    if (queryClient) {
      queryClient.clear();
    }

    onLogout?.();
  };

  return (
    <div className="min-h-screen bg-background overflow-safe">
      {/* Skip Links for Screen Readers */}
      <nav role="navigation" aria-label="Skip links">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <a href="#navigation" className="skip-link">
          Skip to navigation
        </a>
      </nav>

      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm container-safe">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 container-safe">
          <div className="flex justify-between items-center h-16 gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Database className="text-primary-foreground" size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-semibold text-foreground text-ellipsis">
                    Data Lake Explorer
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground text-ellipsis">
                    AWS S3 Dataset Management
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {/* User Info */}
              {currentUser && (
                <div 
                  className="hidden md:flex items-center space-x-2 bg-muted px-3 py-2 rounded-lg"
                  role="status"
                  aria-label={`Current user: ${currentUser.username}, role: ${currentUser.systemRole || currentUser.role}`}
                >
                  <User className="text-primary flex-shrink-0" size={16} aria-hidden="true" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-contrast-high">
                      {currentUser.username}
                    </span>
                    <Badge 
                      variant={isAdmin ? 'destructive' : 'secondary'} 
                      className="text-xs px-1 py-0"
                      aria-label={`User role: ${currentUser.systemRole || currentUser.role}`}
                    >
                      {currentUser.systemRole || currentUser.role}
                    </Badge>
                  </div>
                </div>
              )}

              {/* AWS Config Info */}
              <div 
                className="hidden sm:flex items-center space-x-2 bg-muted px-3 py-2 rounded-lg max-w-48"
                role="status"
                aria-label={`AWS bucket: ${awsConfig?.bucketName || "Not configured"}`}
              >
                <Cloud className="text-primary flex-shrink-0" size={16} aria-hidden="true" />
                <span className="text-sm font-medium text-contrast-medium text-ellipsis">
                  {awsConfig?.bucketName || "Not configured"}
                </span>
              </div>

              {onLogout && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-1 sm:space-x-2 touch-target focus-ring"
                  aria-label="Sign out of your account"
                >
                  <LogOut size={16} aria-hidden="true" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav id="navigation" className="border-t border-border overflow-x-auto" role="navigation" aria-label="Main navigation">
            <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
              <TabsList 
                className={`flex w-full min-w-max sm:grid ${isAdmin ? 'sm:grid-cols-4' : 'sm:grid-cols-2'} sm:max-w-3xl bg-transparent h-auto p-0`}
                role="tablist"
                aria-label="Main navigation tabs"
              >
                <TabsTrigger 
                  value="home" 
                  className="flex items-center space-x-1 sm:space-x-2 py-3 px-2 sm:px-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none touch-target whitespace-nowrap focus-ring"
                  role="tab"
                  aria-selected={currentTab === "home"}
                  aria-controls="main-content"
                >
                  <Database size={16} aria-hidden="true" />
                  <span className="text-responsive-sm">Dataset Explorer</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="user-panel" 
                  className="flex items-center space-x-1 sm:space-x-2 py-3 px-2 sm:px-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none touch-target whitespace-nowrap focus-ring"
                  role="tab"
                  aria-selected={currentTab === "user-panel"}
                  aria-controls="main-content"
                >
                  <User size={16} aria-hidden="true" />
                  <span className="text-responsive-sm">User Panel</span>
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger 
                    value="aws-config" 
                    className="flex items-center space-x-1 sm:space-x-2 py-3 px-2 sm:px-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none touch-target whitespace-nowrap focus-ring"
                    role="tab"
                    aria-selected={currentTab === "aws-config"}
                    aria-controls="main-content"
                  >
                    <Settings size={16} aria-hidden="true" />
                    <span className="text-responsive-sm">AWS Config</span>
                  </TabsTrigger>
                )}
                {isAdmin && (
                  <TabsTrigger 
                    value="admin" 
                    className="flex items-center space-x-1 sm:space-x-2 py-3 px-2 sm:px-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none touch-target whitespace-nowrap focus-ring"
                    role="tab"
                    aria-selected={currentTab === "admin"}
                    aria-controls="main-content"
                  >
                    <Shield size={16} aria-hidden="true" />
                    <span className="text-responsive-sm">Admin Panel</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" role="main" className="container-safe">
        {children}
      </main>
    </div>
  );
}