import { useLocation } from "wouter";
import { Database, Book, Cloud, LogOut, Settings, Shield, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import type { AwsConfig } from "@shared/schema";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
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

  const currentTab = location === "/api-docs" ? "api-docs" : 
                    location === "/aws-config" ? "aws-config" : 
                    location === "/admin" ? "admin" : "home";

  const handleTabChange = (value: string) => {
    if (value === "home") {
      navigate("/");
    } else if (value === "aws-config") {
      navigate("/aws-config");
    } else if (value === "api-docs") {
      navigate("/api-docs");
    } else if (value === "admin") {
      navigate("/admin");
    }
  };

  // Keyboard navigation for tab switching
  const availableTabs = currentUser?.role === 'admin' 
    ? ["home", "aws-config", "api-docs", "admin"]
    : ["home", "aws-config", "api-docs"];

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
    isActive: true,
  });

  return (
    <div className="min-h-screen bg-background overflow-safe">
      {/* Skip Links for Screen Readers */}
      <div className="sr-only">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50">
          Skip to main content
        </a>
        <a href="#navigation" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-32 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50">
          Skip to navigation
        </a>
      </div>
      
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
                <div className="hidden md:flex items-center space-x-2 bg-muted px-3 py-2 rounded-lg">
                  <User className="text-primary flex-shrink-0" size={16} />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-contrast-high">
                      {currentUser.username}
                    </span>
                    <Badge variant={currentUser.role === 'admin' ? 'destructive' : 'secondary'} className="text-xs px-1 py-0">
                      {currentUser.role}
                    </Badge>
                  </div>
                </div>
              )}
              
              {/* AWS Config Info */}
              <div className="hidden sm:flex items-center space-x-2 bg-muted px-3 py-2 rounded-lg max-w-48">
                <Cloud className="text-primary flex-shrink-0" size={16} />
                <span className="text-sm font-medium text-contrast-medium text-ellipsis">
                  {awsConfig?.bucketName || "Not configured"}
                </span>
              </div>
              
              {onLogout && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogout}
                  className="flex items-center space-x-1 sm:space-x-2 touch-target"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              )}
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div id="navigation" className="border-t border-border overflow-x-auto">
            <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full" role="navigation" aria-label="Main navigation">
              <TabsList className={`flex w-full min-w-max sm:grid ${currentUser?.role === 'admin' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} sm:max-w-3xl bg-transparent h-auto p-0`}>
                <TabsTrigger 
                  value="home" 
                  className="flex items-center space-x-1 sm:space-x-2 py-3 px-2 sm:px-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none touch-target whitespace-nowrap"
                >
                  <Database size={16} />
                  <span className="text-responsive-sm">Dataset Explorer</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="aws-config" 
                  className="flex items-center space-x-1 sm:space-x-2 py-3 px-2 sm:px-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none touch-target whitespace-nowrap"
                >
                  <Settings size={16} />
                  <span className="text-responsive-sm">AWS Configuration</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="api-docs" 
                  className="flex items-center space-x-1 sm:space-x-2 py-3 px-2 sm:px-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none touch-target whitespace-nowrap"
                >
                  <Book size={16} />
                  <span className="text-responsive-sm">API Docs</span>
                </TabsTrigger>
                {currentUser?.role === 'admin' && (
                  <TabsTrigger 
                    value="admin" 
                    className="flex items-center space-x-1 sm:space-x-2 py-3 px-2 sm:px-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none touch-target whitespace-nowrap"
                  >
                    <Shield size={16} />
                    <span className="text-responsive-sm">Admin Panel</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" role="main" className="container-safe">
        {children}
      </main>
    </div>
  );
}