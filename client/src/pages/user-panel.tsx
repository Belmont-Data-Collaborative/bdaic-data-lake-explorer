import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ErrorBoundary } from "@/components/error-boundary";
import { User, TrendingUp, Download, Calendar, ExternalLink, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                    <User className="text-muted-foreground" size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{currentUser.username}</h2>
                    <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                  </div>
                </div>
                <Badge variant={currentUser.role === 'admin' ? 'destructive' : 'secondary'}>
                  {currentUser.role}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="visited" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="visited" className="flex items-center space-x-2">
            <TrendingUp size={16} />
            <span>Frequently Visited</span>
          </TabsTrigger>
          <TabsTrigger value="downloads" className="flex items-center space-x-2">
            <Download size={16} />
            <span>Download History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visited" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="text-primary" size={20} />
                <span>Frequently Visited Data Sources</span>
              </CardTitle>
              <CardDescription>
                Datasets you access most often, sorted by visit frequency
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
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="text-primary" size={20} />
                <span>Download History</span>
              </CardTitle>
              <CardDescription>
                Your recent file downloads from the data lake
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