import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ErrorBoundary } from "@/components/error-boundary";
import { User, TrendingUp, Download, Calendar, ExternalLink, Eye, Folder, FolderOpen, Database, Activity, Clock, Shield, Settings, BarChart3, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface UserPanelProps {
  currentUser?: User | null;
}

interface DownloadRecord {
  id: number;
  datasetId: number;
  datasetName: string;
  downloadType: 'sample' | 'full' | 'metadata';
  downloadedAt: string;
  ipAddress: string;
  userAgent: string;
}

interface DatasetVisit {
  datasetId: number;
  datasetName: string;
  source: string;
  topLevelFolder: string;
  visitCount: number;
  lastVisited: string;
  format: string;
}

export default function UserPanel({ currentUser }: UserPanelProps) {
  // Fetch user's accessible folders
  const { data: accessibleFolders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['/api/user/accessible-folders'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token || !currentUser) return [];
      
      const response = await fetch('/api/user/accessible-folders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        return response.json();
      }
      return [];
    },
    enabled: !!currentUser && !!localStorage.getItem('authToken'),
  });
  // Mock data for frequently visited data sources
  // In a real implementation, this would come from user activity tracking
  const frequentlyVisited: DatasetVisit[] = [
    {
      datasetId: 6431,
      datasetName: "cdc_places_transform_4ai3-zynv_census_tract_data_2020",
      source: "CDC PLACES: Local Data for Better Health",
      topLevelFolder: "cdc_places",
      visitCount: 15,
      lastVisited: "2025-01-22T10:30:00Z",
      format: "CSV"
    },
    {
      datasetId: 6745,
      datasetName: "census_acs5_b01001_sex_by_age_2020",
      source: "American Community Survey 5-Year Estimates",
      topLevelFolder: "census_acs5",
      visitCount: 12,
      lastVisited: "2025-01-21T14:15:00Z",
      format: "CSV"
    },
    {
      datasetId: 6892,
      datasetName: "epa_ejscreen_2020_data",
      source: "EPA Environmental Justice Screening Tool",
      topLevelFolder: "epa_ejscreen",
      visitCount: 8,
      lastVisited: "2025-01-20T16:45:00Z",
      format: "CSV"
    },
  ];

  // Mock data for download history
  // In a real implementation, this would come from the downloads table
  const downloadHistory: DownloadRecord[] = [
    {
      id: 1,
      datasetId: 6431,
      datasetName: "cdc_places_transform_4ai3-zynv_census_tract_data_2020",
      downloadType: 'full',
      downloadedAt: "2025-01-22T09:15:00Z",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0"
    },
    {
      id: 2,
      datasetId: 6431,
      datasetName: "cdc_places_transform_4ai3-zynv_census_tract_data_2020",
      downloadType: 'sample',
      downloadedAt: "2025-01-21T15:30:00Z",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0"
    },
    {
      id: 3,
      datasetId: 6745,
      datasetName: "census_acs5_b01001_sex_by_age_2020",
      downloadType: 'metadata',
      downloadedAt: "2025-01-21T11:20:00Z",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0"
    },
  ];

  const getDownloadTypeColor = (type: string) => {
    switch (type) {
      case 'full': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'sample': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'metadata': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getFolderColor = (folder: string) => {
    const colors = [
      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    ];
    return colors[folder.length % colors.length];
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <User className="text-primary-foreground" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Panel</h1>
            <p className="text-muted-foreground">
              Your activity and download history in the Data Lake Explorer
            </p>
          </div>
        </div>

        {currentUser && (
          <>
            {/* User Information Section */}
            <div className="grid gap-6 md:grid-cols-3 mb-6">
              {/* Account Details */}
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-25 shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center space-x-2 text-blue-900">
                    <User className="text-blue-600" size={20} />
                    <span>Account Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-800">Username</span>
                      <span className="font-semibold text-blue-900">{currentUser.username}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-800">Email</span>
                      <span className="text-sm text-blue-700 truncate max-w-36" title={currentUser.email}>{currentUser.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-800">User ID</span>
                      <span className="text-sm text-blue-700">#{currentUser.id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-800">Role</span>
                      <Badge variant={currentUser.role === 'admin' ? 'default' : 'secondary'} 
                             className={currentUser.role === 'admin' 
                               ? 'bg-purple-100 text-purple-800 border-purple-200' 
                               : currentUser.role === 'editor' 
                               ? 'bg-blue-100 text-blue-800 border-blue-200'
                               : 'bg-gray-100 text-gray-700 border-gray-200'}>
                        {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Access Summary */}
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-25 shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center space-x-2 text-emerald-900">
                    <Shield className="text-emerald-600" size={20} />
                    <span>Access Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-emerald-800">Data Access</span>
                      <span className="text-sm text-emerald-700">
                        {currentUser.role === 'admin' ? 'Full Access' : 'Restricted'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-emerald-800">Accessible Folders</span>
                      <span className="font-semibold text-emerald-900">
                        {foldersLoading ? '...' : currentUser.role === 'admin' ? 'All' : accessibleFolders.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-emerald-800">Permissions</span>
                      <div className="text-right">
                        <div className="text-xs text-emerald-600">
                          {currentUser.role === 'admin' 
                            ? 'Full system access' 
                            : currentUser.role === 'editor' 
                            ? 'Edit & download access'
                            : 'View & download access'
                          }
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-emerald-800">AI Features</span>
                      <span className={`text-sm font-medium ${
                        (currentUser.role === 'admin' || (currentUser as any).isAiEnabled)
                          ? 'text-emerald-700' 
                          : 'text-gray-500'
                      }`}>
                        {(currentUser.role === 'admin' || (currentUser as any).isAiEnabled) ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-amber-25 shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center space-x-2 text-amber-900">
                    <BarChart3 className="text-amber-600" size={20} />
                    <span>Activity Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-amber-800">Recent Downloads</span>
                      <span className="font-semibold text-amber-900">{downloadHistory.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-amber-800">Datasets Visited</span>
                      <span className="font-semibold text-amber-900">{frequentlyVisited.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-amber-800">Last Activity</span>
                      <div className="text-right">
                        <div className="text-xs text-amber-600">Recent</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Accessible Folders Card */}
            <Card className="mb-6 border-indigo-200 bg-gradient-to-r from-indigo-50 to-indigo-25">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2 text-indigo-900">
                  <Folder className="text-indigo-600" size={20} />
                  <span>Your Data Folders</span>
                </CardTitle>
                <CardDescription className="text-indigo-700">
                  {currentUser.role === 'admin' 
                    ? 'You have administrator access to all data folders in the system'
                    : `Data folders you have been granted access to (${accessibleFolders.length} total)`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {foldersLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    <span className="ml-2 text-indigo-700">Loading your folders...</span>
                  </div>
                ) : currentUser.role === 'admin' ? (
                  <div className="text-center py-6">
                    <Shield className="mx-auto h-12 w-12 text-indigo-500 mb-3" />
                    <p className="text-indigo-800 font-medium">Administrator Access</p>
                    <p className="text-sm text-indigo-600 mt-1">You have full access to all folders in the data lake</p>
                  </div>
                ) : accessibleFolders.length === 0 ? (
                  <div className="text-center py-6">
                    <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-gray-600 font-medium">No Folder Access</p>
                    <p className="text-sm text-gray-500 mt-1">Contact your administrator to request access</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {accessibleFolders.map((folder: string) => (
                      <div key={folder} className="bg-white border border-indigo-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                        <div className="flex items-center space-x-2 mb-2">
                          <Folder className="text-indigo-500" size={16} />
                          <span className="font-medium text-indigo-900 text-sm">
                            {folder.replace(/_/g, " ").toUpperCase()}
                          </span>
                        </div>
                        <Badge className={getFolderColor(folder)} variant="secondary">
                          {folder}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Database className="text-primary" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Explore Datasets</h3>
                    <p className="text-sm text-muted-foreground">
                      Browse and search through your accessible data folders
                    </p>
                  </div>
                </div>
                <Link href="/datasets">
                  <Button className="flex items-center space-x-2">
                    <Database size={16} />
                    <span>Go to Dataset Explorer</span>
                    <ExternalLink size={14} />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200/60 bg-gradient-to-r from-green-50/50 to-green-100/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Activity className="text-green-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Activity Insights</h3>
                    <p className="text-sm text-muted-foreground">
                      View your data exploration patterns and trends
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="flex items-center space-x-2">
                  <BarChart3 size={16} />
                  <span>View Analytics</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="folders" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="folders" className="flex items-center space-x-2">
            <Folder size={16} />
            <span>My Folders</span>
          </TabsTrigger>
          <TabsTrigger value="visited" className="flex items-center space-x-2">
            <TrendingUp size={16} />
            <span>Frequently Visited</span>
          </TabsTrigger>
          <TabsTrigger value="downloads" className="flex items-center space-x-2">
            <Download size={16} />
            <span>Download History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="folders" className="space-y-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-25 border-b border-indigo-100">
              <CardTitle className="flex items-center space-x-2 text-indigo-900">
                <Folder className="text-indigo-600" size={20} />
                <span>Detailed Folder Access</span>
              </CardTitle>
              <CardDescription className="text-indigo-700">
                Complete overview of your data folder permissions and access levels
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {foldersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <span className="ml-2 text-indigo-700">Loading folder permissions...</span>
                </div>
              ) : currentUser?.role === 'admin' ? (
                <div className="text-center py-12">
                  <Shield className="mx-auto h-16 w-16 text-indigo-500 mb-4" />
                  <h3 className="text-lg font-medium text-indigo-900 mb-2">Administrator Access</h3>
                  <p className="text-sm text-indigo-700 max-w-md mx-auto mb-6">
                    As an administrator, you have unrestricted access to all data folders in the system. This includes the ability to view, download, and manage all datasets across the entire data lake.
                  </p>
                  <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 px-4 py-2 text-base">
                    Full System Access
                  </Badge>
                </div>
              ) : accessibleFolders.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No Folder Access Granted</h3>
                  <p className="text-sm text-gray-600 max-w-sm mx-auto mb-6">
                    You currently don't have access to any folders in the Data Lake. Please contact your system administrator to request access to specific data folders that you need for your work.
                  </p>
                  <Button variant="outline" className="mt-4">
                    <FileText size={16} className="mr-2" />
                    Request Access
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Shield className="text-indigo-600" size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-indigo-900">Access Summary</p>
                        <p className="text-sm text-indigo-700">
                          You have permission to access {accessibleFolders.length} out of all available folders
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 px-3 py-1">
                      {currentUser?.role === 'editor' ? 'Editor Access' : 'User Access'}
                    </Badge>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                    {accessibleFolders.map((folder: string) => (
                      <div key={folder} className="border-2 border-gray-100 rounded-lg p-4 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <Folder className="text-indigo-600" size={16} />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {folder.replace(/_/g, " ").toUpperCase()}
                              </h4>
                              <p className="text-sm text-gray-600">Data source folder</p>
                            </div>
                          </div>
                          <Badge className={getFolderColor(folder)} variant="secondary">
                            {folder}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Access Level:</span>
                            <span className="font-medium text-gray-900">
                              {currentUser?.role === 'editor' ? 'Read/Write' : 'Read Only'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Permissions:</span>
                            <span className="font-medium text-gray-900">View & Download</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visited" className="space-y-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-25 border-b border-emerald-100">
              <CardTitle className="flex items-center space-x-2 text-emerald-900">
                <TrendingUp className="text-emerald-600" size={20} />
                <span>Frequently Visited Data Sources</span>
              </CardTitle>
              <CardDescription className="text-emerald-700">
                Your most accessed datasets with detailed visit statistics and quick access options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorBoundary>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {frequentlyVisited.map((dataset) => (
                      <div key={dataset.datasetId} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground truncate mb-1">
                              {dataset.datasetName}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {dataset.source}
                            </p>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <div className="text-2xl font-bold text-primary mb-1">
                              {dataset.visitCount}
                            </div>
                            <div className="text-xs text-muted-foreground">visits</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge className={getFolderColor(dataset.topLevelFolder)} variant="secondary">
                              {dataset.topLevelFolder}
                            </Badge>
                            <Badge variant="outline">
                              {dataset.format}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar size={14} />
                              <span>
                                {formatDistanceToNow(new Date(dataset.lastVisited), { addSuffix: true })}
                              </span>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Eye size={14} className="mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </ErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="downloads" className="space-y-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-25 border-b border-amber-100">
              <CardTitle className="flex items-center space-x-2 text-amber-900">
                <Download className="text-amber-600" size={20} />
                <span>Download History</span>
              </CardTitle>
              <CardDescription className="text-amber-700">
                Complete record of your recent file downloads with timestamps and download types lake
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorBoundary>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {downloadHistory.map((download) => (
                      <div key={download.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground truncate mb-1">
                              {download.datasetName}
                            </h3>
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge className={getDownloadTypeColor(download.downloadType)} variant="secondary">
                                {download.downloadType}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                ID: {download.datasetId}
                              </span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-1">
                              <Calendar size={14} />
                              <span>
                                {formatDistanceToNow(new Date(download.downloadedAt), { addSuffix: true })}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(download.downloadedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div className="text-xs text-muted-foreground">
                            Downloaded from {download.ipAddress}
                          </div>
                          <Button variant="ghost" size="sm">
                            <ExternalLink size={14} className="mr-1" />
                            View Dataset
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </ErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}