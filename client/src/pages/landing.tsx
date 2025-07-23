import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCards } from "@/components/stats-cards";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, Cloud, BarChart3, Shield, Download, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Dataset } from "@shared/schema";

interface Stats {
  totalDatasets: number;
  totalSize: string;
  dataSources: number;
  lastUpdated: string;
  lastRefreshTime: string | null;
  totalCommunityDataPoints?: number;
}

interface GlobalStatsResponse {
  totalDatasets: number;
  totalSize: string;
  dataSources: number;
  lastUpdated: string;
  lastRefreshTime: string | null;
}

interface LandingPageProps {
  onLogin: () => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { toast } = useToast();

  // Fetch global statistics for public display
  const { data: globalStats } = useQuery<GlobalStatsResponse>({
    queryKey: ['/api/stats'],
  });

  // Fetch datasets for comprehensive stats
  const { data: datasetsResponse } = useQuery<{
    datasets: Dataset[];
    totalCount: number;
    totalPages: number;
  }>({
    queryKey: ['/api/datasets'],
    queryFn: async () => {
      const response = await fetch('/api/datasets?page=1&limit=10000&folder=all');
      if (!response.ok) {
        throw new Error('Failed to fetch datasets');
      }
      return response.json();
    },
  });

  const allDatasets = datasetsResponse?.datasets || [];

  // Helper functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const extractDataSources = (datasets: Dataset[]): Set<string> => {
    const sources = new Set<string>();
    for (const dataset of datasets) {
      if (dataset.metadata && (dataset.metadata as any).dataSource) {
        const dataSources = (dataset.metadata as any).dataSource
          .split(",")
          .map((source: string) => source.trim())
          .filter((source: string) => source.length > 0);
        dataSources.forEach((source: string) => sources.add(source));
      }
    }
    return sources;
  };

  const calculateStats = (datasetsToCalculate: Dataset[]): Stats => {
    const totalDatasets = datasetsToCalculate.length;
    const totalSizeBytes = datasetsToCalculate.reduce((total, dataset) => total + (dataset.sizeBytes || 0), 0);
    const uniqueDataSources = extractDataSources(datasetsToCalculate);
    
    const totalCommunityDataPoints = datasetsToCalculate
      .filter((d) => d.metadata && (d.metadata as any).recordCount && (d.metadata as any).columnCount && (d.metadata as any).completenessScore)
      .reduce((total, d) => {
        const recordCount = parseInt((d.metadata as any).recordCount);
        const columnCount = (d.metadata as any).columnCount;
        const completenessScore = (d.metadata as any).completenessScore / 100.0;
        return total + recordCount * columnCount * completenessScore;
      }, 0);

    return {
      totalDatasets,
      totalSize: formatFileSize(totalSizeBytes),
      dataSources: uniqueDataSources.size,
      lastUpdated: globalStats?.lastUpdated || "Never",
      lastRefreshTime: globalStats?.lastRefreshTime || null,
      totalCommunityDataPoints: Math.round(totalCommunityDataPoints),
    };
  };

  const stats: Stats | undefined = allDatasets.length > 0 ? calculateStats(allDatasets) : globalStats;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast({
        title: "Password required",
        description: "Please enter your password to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        toast({
          title: "Login successful",
          description: "Welcome to the Data Lake Explorer!",
        });
        onLogin();
      } else {
        const errorData = await response.json();
        toast({
          title: "Login failed",
          description: errorData.message || "Invalid password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Database className="text-primary" size={32} />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Data Lake Explorer</h1>
                <p className="text-sm text-muted-foreground">Advanced data management and exploration</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="login">Access Portal</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <div className="text-center py-8">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Comprehensive Data Lake Statistics
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Explore and analyze your data lake with advanced tools for dataset discovery, 
                metadata extraction, and AI-powered insights.
              </p>
            </div>

            <ErrorBoundary>
              <StatsCards stats={stats || undefined} />
            </ErrorBoundary>

            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="text-primary" size={20} />
                      <span>Dataset Distribution</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Datasets</span>
                      <span className="font-medium">{stats.totalDatasets}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data Sources</span>
                      <span className="font-medium">{stats.dataSources}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Community Data Points</span>
                      <span className="font-medium">{stats.totalCommunityDataPoints?.toLocaleString() || 0}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Cloud className="text-primary" size={20} />
                      <span>Storage Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Size</span>
                      <span className="font-medium">{stats.totalSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average per Dataset</span>
                      <span className="font-medium">
                        {stats.totalDatasets > 0 
                          ? formatFileSize(
                              allDatasets.reduce((total, dataset) => total + (dataset.sizeBytes || 0), 0) / stats.totalDatasets
                            )
                          : "0 B"
                        }
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="text-primary" size={20} />
                      <span>Last Updated</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data Refresh</span>
                      <span className="font-medium">{stats.lastUpdated}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <div className="text-center py-8">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Powerful Data Exploration Features
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Advanced tools and capabilities for comprehensive data lake management
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Search className="text-primary" size={20} />
                    <span>Smart Discovery</span>
                  </CardTitle>
                  <CardDescription>
                    Intelligent dataset discovery with metadata extraction and AI-powered insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Automatic metadata parsing</li>
                    <li>• YAML configuration analysis</li>
                    <li>• Column schema detection</li>
                    <li>• Data type inference</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="text-primary" size={20} />
                    <span>Download Tracking</span>
                  </CardTitle>
                  <CardDescription>
                    Comprehensive download monitoring with real-time statistics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Sample file downloads (10%)</li>
                    <li>• Full dataset access</li>
                    <li>• Metadata file downloads</li>
                    <li>• Usage analytics</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="text-primary" size={20} />
                    <span>Secure Access</span>
                  </CardTitle>
                  <CardDescription>
                    Enterprise-grade security with role-based access control
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Password protection</li>
                    <li>• Session management</li>
                    <li>• Audit logging</li>
                    <li>• Access monitoring</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="login" className="space-y-6">
            <div className="max-w-md mx-auto">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center space-x-2">
                    <Shield className="text-primary" size={24} />
                    <span>Access Data Lake Explorer</span>
                  </CardTitle>
                  <CardDescription>
                    Enter your credentials to access the full data lake explorer interface
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        disabled={isLoggingIn}
                        className="mt-1"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoggingIn}
                    >
                      {isLoggingIn ? "Signing in..." : "Access Explorer"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}