import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Database, Book, Cloud, LogOut, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import type { AwsConfig } from "@shared/schema";

interface MainLayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

export function MainLayout({ children, onLogout }: MainLayoutProps) {
  const [location, navigate] = useLocation();

  const { data: awsConfig } = useQuery<AwsConfig>({
    queryKey: ["/api/aws-config"],
  });

  const currentTab = location === "/api-docs" ? "api-docs" : 
                    location === "/aws-config" ? "aws-config" : "home";

  const handleTabChange = (value: string) => {
    if (value === "home") {
      navigate("/");
    } else if (value === "aws-config") {
      navigate("/aws-config");
    } else if (value === "api-docs") {
      navigate("/api-docs");
    }
  };

  // Keyboard navigation for tab switching
  useKeyboardNavigation({
    onArrowLeft: () => {
      const tabs = ["home", "aws-config", "api-docs"];
      const currentIndex = tabs.indexOf(currentTab);
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
      handleTabChange(tabs[prevIndex]);
    },
    onArrowRight: () => {
      const tabs = ["home", "aws-config", "api-docs"];
      const currentIndex = tabs.indexOf(currentTab);
      const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
      handleTabChange(tabs[nextIndex]);
    },
    isActive: true,
  });

  return (
    <div className="min-h-screen bg-background">
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
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Database className="text-primary-foreground" size={16} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">
                    Data Lake Explorer
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    AWS S3 Dataset Management
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-muted px-3 py-2 rounded-lg">
                <Cloud className="text-primary" size={16} />
                <span className="text-sm font-medium text-contrast-medium">
                  {awsConfig?.bucketName || "Not configured"}
                </span>
              </div>
              {onLogout && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogout}
                  className="flex items-center space-x-2"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </Button>
              )}
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div id="navigation" className="border-t border-border">
            <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full" role="navigation" aria-label="Main navigation">
              <TabsList className="grid w-full grid-cols-3 max-w-2xl bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="home" 
                  className="flex items-center space-x-2 py-3 px-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none touch-target"
                >
                  <Database size={16} />
                  <span>Dataset Explorer</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="aws-config" 
                  className="flex items-center space-x-2 py-3 px-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none touch-target"
                >
                  <Settings size={16} />
                  <span>AWS Configuration</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="api-docs" 
                  className="flex items-center space-x-2 py-3 px-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none touch-target"
                >
                  <Book size={16} />
                  <span>API Docs</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" role="main">
        {children}
      </main>
    </div>
  );
}