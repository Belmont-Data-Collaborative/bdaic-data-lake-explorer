import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Database, Book, Cloud, LogOut, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  return (
    <div className="min-h-screen bg-background">
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
          <div className="border-t border-border">
            <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
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
      <main>
        {children}
      </main>
    </div>
  );
}