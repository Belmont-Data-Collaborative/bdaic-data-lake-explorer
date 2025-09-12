import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCards } from "@/components/stats-cards";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Cloud, BarChart3, Shield, Download, Search, Eye, EyeOff, UserPlus, Book, FileText, Brain, Accessibility } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatNumber } from "@/lib/format-number";
import Register from "./register";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  onLogin: (userData?: { token: string; user: any }) => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch global statistics for public display
  const { data: globalStats } = useQuery<GlobalStatsResponse>({
    queryKey: ['/api/stats/public'],
    queryFn: async () => {
      const response = await fetch('/api/stats/public');
      if (!response.ok) {
        throw new Error('Failed to fetch public stats');
      }
      return response.json();
    },
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

  // Fetch API documentation
  useEffect(() => {
    const fetchApiDocs = async () => {
      try {
        setIsLoadingDocs(true);
        setDocsError(null);
        
        const response = await fetch("/api/docs/markdown");
        if (!response.ok) {
          throw new Error(`Failed to fetch documentation: ${response.status}`);
        }
        
        const content = await response.text();
        setMarkdownContent(content);
      } catch (err) {
        console.error("Error fetching API documentation:", err);
        setDocsError(err instanceof Error ? err.message : "Failed to load documentation");
        
        // Fallback content for API documentation
        const fallbackContent = `# 📘 API Documentation

## Overview
This is the API documentation for the Data Lake Explorer application.

**Note**: The full documentation content could not be loaded. Please ensure you have proper access.

## Available Endpoints

### Authentication
- \`POST /api/auth/login\` - Authenticate with credentials
- \`POST /api/auth/register\` - Register a new user account
- \`GET /api/auth/verify\` - Verify JWT token

### AWS Configuration  
- \`GET /api/aws-config\` - Get active AWS configuration
- \`POST /api/aws-config\` - Create/update AWS configuration
- \`GET /api/aws-configs\` - Get all AWS configurations

### Datasets
- \`GET /api/datasets\` - List datasets with pagination and filtering
- \`POST /api/datasets/refresh\` - Refresh datasets from S3
- \`GET /api/datasets/:id\` - Get specific dataset details
- \`POST /api/datasets/:id/insights\` - Generate AI insights for dataset
- \`GET /api/datasets/:id/download\` - Download dataset file
- \`GET /api/datasets/:id/download-sample\` - Download sample of dataset

### Statistics
- \`GET /api/stats\` - Get comprehensive application statistics
- \`GET /api/folders\` - Get list of dataset folders
- \`GET /api/folders/community-data-points\` - Get community data points by folder

For detailed API specifications, please contact the system administrator.`;
        
        setMarkdownContent(fallbackContent);
      } finally {
        setIsLoadingDocs(false);
      }
    };

    // Only fetch when API docs tab is active
    if (activeTab === "api-docs" && !markdownContent) {
      fetchApiDocs();
    }
  }, [activeTab, markdownContent]);

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

  // Enhanced login mutation supporting both JWT and legacy auth
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.token && data.user) {
        // JWT-based authentication
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        toast({
          title: "Login successful",
          description: `Welcome back, ${data.user.username}!`,
        });
        onLogin({ token: data.token, user: data.user });
      } else {
        // Legacy password-based authentication
        toast({
          title: "Login successful",
          description: "Welcome to the Data Lake Explorer!",
        });
        onLogin();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.username.trim() && !loginData.password.trim()) {
      toast({
        title: "Login required",
        description: "Please enter your credentials",
        variant: "destructive",
      });
      return;
    }

    // Clear any existing authentication data before new login attempt
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authenticated');
    // Clear all React Query cache to prevent stale authentication data
    queryClient.clear();
    queryClient.removeQueries({ queryKey: ['/api/auth/verify'] });
    
    // Support legacy password-only login if no username provided
    const credentials = loginData.username.trim() 
      ? loginData 
      : { username: "", password: loginData.password };

    loginMutation.mutate(credentials);
  };

  const handleRegistrationSuccess = (user: any, token: string) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    toast({
      title: "Registration successful",
      description: `Welcome, ${user.username}!`,
    });
    onLogin({ token, user });
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="api-docs">API Documentation</TabsTrigger>
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
                      <span className="font-medium">{formatNumber(stats.totalCommunityDataPoints || 0)}</span>
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

          <TabsContent value="features" className="space-y-8">
            <div className="text-center py-8">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Comprehensive Data Lake Management
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Advanced AWS S3 data exploration with AI-powered insights, role-based authentication, and professional-grade features for enterprise data management
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-2 border-blue-200 bg-blue-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="text-blue-600" size={20} />
                    <span>Smart Dataset Discovery</span>
                  </CardTitle>
                  <CardDescription>
                    Automatically discover and catalog {globalStats?.totalDatasets || '...'} datasets across {globalStats?.dataSources || '...'} S3 folders with intelligent metadata extraction
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Multi-format support (CSV, JSON, Parquet, YAML)</li>
                    <li>• Automatic metadata extraction with 30+ field variations</li>
                    <li>• Real-time S3 synchronization and refresh</li>
                    <li>• Folder-based organization with {globalStats?.dataSources || '...'} active data sources</li>
                    <li>• File size analysis and completeness scoring</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-2 border-purple-200 bg-purple-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="text-purple-600" size={20} />
                    <span>AI-Powered Analytics</span>
                  </CardTitle>
                  <CardDescription>
                    OpenAI GPT-4o integration for intelligent dataset insights and conversational data exploration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Automated pattern recognition and analysis</li>
                    <li>• Interactive dataset chat with conversation history</li>
                    <li>• Use case recommendations and insights generation</li>
                    <li>• Data visualization suggestions</li>
                    <li>• Markdown-formatted AI responses</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-200 bg-green-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="text-green-600" size={20} />
                    <span>Enterprise Authentication</span>
                  </CardTitle>
                  <CardDescription>
                    JWT-based role-based access control with comprehensive user management
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Admin, Editor, and Viewer role hierarchy</li>
                    <li>• Secure bcrypt password hashing</li>
                    <li>• User registration and management system</li>
                    <li>• Session tracking with automatic token refresh</li>
                    <li>• Role-based navigation and feature access</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Search className="text-primary" size={20} />
                    <span>Advanced Search & Filtering</span>
                  </CardTitle>
                  <CardDescription>
                    Powerful search capabilities with folder navigation and format-based filtering
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Full-text search across names, sources, descriptions</li>
                    <li>• Format filtering (CSV, JSON, Parquet)</li>
                    <li>• Size range filtering with byte precision</li>
                    <li>• Folder-first navigation system</li>
                    <li>• Real-time search with debounced queries</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="text-primary" size={20} />
                    <span>Rich Metadata Management</span>
                  </CardTitle>
                  <CardDescription>
                    Comprehensive metadata extraction with YAML integration and completeness scoring
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• YAML metadata prioritization over CSV analysis</li>
                    <li>• Column schema detection with data type inference</li>
                    <li>• Weighted completeness scoring (critical field priority)</li>
                    <li>• Record count and file size tracking</li>
                    <li>• Target audience and use case extraction</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="text-primary" size={20} />
                    <span>Download Analytics</span>
                  </CardTitle>
                  <CardDescription>
                    Real-time download tracking with comprehensive usage statistics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Sample downloads (10% file size) with server-side streaming</li>
                    <li>• Full dataset access with presigned URLs</li>
                    <li>• Metadata file downloads</li>
                    <li>• Real-time statistics with cache invalidation</li>
                    <li>• Usage tracking by type (sample/full/metadata)</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Cloud className="text-primary" size={20} />
                    <span>AWS S3 Integration</span>
                  </CardTitle>
                  <CardDescription>
                    Multi-configuration S3 management with connection testing and bucket switching
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Multiple AWS configuration support</li>
                    <li>• Real-time connection status monitoring</li>
                    <li>• One-click configuration switching</li>
                    <li>• Automatic dataset refresh on config changes</li>
                    <li>• Presigned URL generation for secure access</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="text-primary" size={20} />
                    <span>Performance Monitoring</span>
                  </CardTitle>
                  <CardDescription>
                    Database optimization with comprehensive performance tracking and caching
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Database indexes on frequently queried columns</li>
                    <li>• Intelligent cache headers with varying TTL</li>
                    <li>• Response compression with optimized gzip settings</li>
                    <li>• Slow query detection and performance metrics</li>
                    <li>• Cache hit rate monitoring and optimization</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Accessibility className="text-primary" size={20} />
                    <span>Accessibility Compliance</span>
                  </CardTitle>
                  <CardDescription>
                    WCAG AA compliant interface with comprehensive accessibility features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Full keyboard navigation support</li>
                    <li>• Screen reader optimization with ARIA labels</li>
                    <li>• 4.5:1 color contrast compliance</li>
                    <li>• Focus trapping and management</li>
                    <li>• Motion preferences respect (prefers-reduced-motion)</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 mt-12">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-foreground mb-4">Current Data Lake Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {globalStats?.totalDatasets ? formatNumber(globalStats.totalDatasets) : '...'}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Datasets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {globalStats?.dataSources ? formatNumber(globalStats.dataSources) : '...'}
                    </div>
                    <div className="text-sm text-muted-foreground">Data Sources</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {globalStats?.totalSize || '...'}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Size</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">
                      {globalStats?.totalCommunityDataPoints ? `${formatNumber(globalStats.totalCommunityDataPoints)}+` : '...'}
                    </div>
                    <div className="text-sm text-muted-foreground">Community Data Points</div>
                  </div>
                </div>
                <p className="text-muted-foreground mt-4">
                  Connected to <strong>bdaic-public-transform</strong> S3 bucket with real-time synchronization
                  {globalStats?.lastUpdated && (
                    <span> • Last updated: {globalStats.lastUpdated}</span>
                  )}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="api-docs" className="space-y-6">
            <div className="text-center py-8">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                API Documentation
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Comprehensive API reference for integrating with the Data Lake Explorer
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Book className="text-primary" size={24} />
                  <span>API Reference</span>
                </CardTitle>
                <CardDescription>
                  Complete documentation for all available endpoints and data models
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDocs ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2 text-muted-foreground">Loading documentation...</span>
                  </div>
                ) : docsError ? (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Documentation Error</h3>
                    <p className="text-sm text-muted-foreground mb-4">{docsError}</p>
                    <Button 
                      onClick={() => {
                        setDocsError(null);
                        setMarkdownContent("");
                      }} 
                      variant="outline"
                    >
                      Retry Loading
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px] w-full rounded-md border p-4">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-2xl font-bold text-foreground mb-4 border-b border-border pb-2">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-lg font-medium text-foreground mt-6 mb-2">
                              {children}
                            </h3>
                          ),
                          code: ({ children, className }) => {
                            const isInline = !className;
                            return isInline ? (
                              <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
                                {children}
                              </code>
                            ) : (
                              <code className="block bg-muted p-3 rounded-md text-sm font-mono overflow-x-auto">
                                {children}
                              </code>
                            );
                          },
                          pre: ({ children }) => (
                            <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                              {children}
                            </pre>
                          ),
                          table: ({ children }) => (
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse border border-border">
                                {children}
                              </table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th className="border border-border px-3 py-2 bg-muted font-medium text-left">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="border border-border px-3 py-2">
                              {children}
                            </td>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                              {children}
                            </ul>
                          ),
                          li: ({ children }) => (
                            <li className="text-muted-foreground">
                              {children}
                            </li>
                          ),
                          p: ({ children }) => (
                            <p className="text-muted-foreground mb-4 leading-relaxed">
                              {children}
                            </p>
                          ),
                        }}
                      >
                        {markdownContent}
                      </ReactMarkdown>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="login" className="space-y-6">
            <div className="max-w-md mx-auto">
              {!showRegister ? (
                <Card>
                  <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center space-x-2">
                      <Shield className="text-primary" size={24} />
                      <span>Access Data Lake Explorer</span>
                    </CardTitle>
                    <CardDescription>
                      Enter your credentials to access the full data lake explorer interface
                    </CardDescription>
                    {(localStorage.getItem('authToken') || localStorage.getItem('currentUser')) && (
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            localStorage.removeItem('authToken');
                            localStorage.removeItem('currentUser');
                            localStorage.removeItem('authenticated');
                            queryClient.clear();
                            queryClient.removeQueries();
                            toast({
                              title: "Session cleared",
                              description: "You can now log in with different credentials",
                            });
                            // Force page reload to ensure complete state reset
                            setTimeout(() => window.location.reload(), 100);
                          }}
                        >
                          Switch User / Clear Session
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <Label htmlFor="username">Username (optional for legacy login)</Label>
                        <Input
                          id="username"
                          type="text"
                          value={loginData.username}
                          onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                          placeholder="Enter your username"
                          disabled={loginMutation.isPending}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                            placeholder="Enter your password"
                            disabled={loginMutation.isPending}
                            className="mt-1 pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={loginMutation.isPending}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Signing in..." : "Access Explorer"}
                      </Button>
                    </form>
                    
                    {/* Registration disabled - contact administrator for new accounts */}
                  </CardContent>
                </Card>
              ) : (
                <Register 
                  onRegistrationSuccess={handleRegistrationSuccess}
                  onBackToLogin={() => setShowRegister(false)}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}