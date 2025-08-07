import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Bot, Brain, RefreshCw, Folder, CheckCircle, XCircle, Clock } from "lucide-react";

interface FolderAiSetting {
  id: number;
  folderName: string;
  isAiEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: number;
}

interface FolderWithAiSetting {
  folderName: string;
  isAiEnabled: boolean;
  datasetCount?: number;
  lastUpdated?: string;
}

export default function FolderAiSettings() {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all folder AI settings
  const { data: folderAiSettings = [], isLoading: settingsLoading, refetch: refetchSettings } = useQuery({
    queryKey: ['/api/admin/folder-ai-settings'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const res = await apiRequest('GET', '/api/admin/folder-ai-settings', null, {
        'Authorization': `Bearer ${token}`
      });
      return res.json();
    },
  });

  // Fetch all available folders to show complete list
  const { data: allFolders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['/api/folders'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/folders');
      return res.json();
    },
  });

  // Create a combined list of folders with their AI settings
  const foldersWithSettings: FolderWithAiSetting[] = allFolders.map((folder: any) => {
    const aiSetting = folderAiSettings.find((setting: FolderAiSetting) => 
      setting.folderName === folder.name
    );
    
    return {
      folderName: folder.name,
      isAiEnabled: aiSetting?.isAiEnabled || false,
      datasetCount: folder.datasetCount,
      lastUpdated: aiSetting?.updatedAt
    };
  });

  // Update folder AI setting mutation
  const updateAiSettingMutation = useMutation({
    mutationFn: async ({ folderName, isAiEnabled }: { folderName: string; isAiEnabled: boolean }) => {
      const token = localStorage.getItem('authToken');
      const res = await apiRequest('PUT', `/api/admin/folder-ai-settings/${encodeURIComponent(folderName)}`, 
        { isAiEnabled }, 
        { 'Authorization': `Bearer ${token}` }
      );
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "AI Setting Updated",
        description: `Ask AI has been ${variables.isAiEnabled ? 'enabled' : 'disabled'} for folder "${variables.folderName}".`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/folder-ai-settings'] });
      setIsUpdating(null);
    },
    onError: (error: any, variables) => {
      console.error('Error updating AI setting:', error);
      toast({
        title: "Update Failed",
        description: `Failed to update AI setting for folder "${variables.folderName}".`,
        variant: "destructive",
      });
      setIsUpdating(null);
    },
  });

  const handleToggleAiSetting = async (folderName: string, currentEnabled: boolean) => {
    setIsUpdating(folderName);
    updateAiSettingMutation.mutate({
      folderName,
      isAiEnabled: !currentEnabled
    });
  };

  const handleRefreshData = async () => {
    toast({
      title: "Refreshing data...",
      description: "Fetching latest folder AI settings.",
    });
    
    try {
      await refetchSettings();
      toast({
        title: "Data refreshed",
        description: "Latest folder AI settings loaded.",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Could not fetch latest data.",
        variant: "destructive",
      });
    }
  };

  const enabledCount = foldersWithSettings.filter(f => f.isAiEnabled).length;
  const totalCount = foldersWithSettings.length;

  if (settingsLoading || foldersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Ask AI Settings
          </CardTitle>
          <CardDescription>Loading folder AI settings...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Ask AI Settings
            </CardTitle>
            <CardDescription>
              Control which folders have Ask AI functionality enabled for users.
              {totalCount > 0 && (
                <span className="block mt-1">
                  {enabledCount} of {totalCount} folders have AI enabled
                </span>
              )}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {foldersWithSettings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No folders found</p>
            <p className="text-sm">Folders will appear here after data discovery is completed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Total Folders</span>
                  </div>
                  <div className="text-2xl font-bold mt-1">{totalCount}</div>
                </CardContent>
              </Card>
              <Card className="bg-green-50 dark:bg-green-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-400">AI Enabled</span>
                  </div>
                  <div className="text-2xl font-bold mt-1 text-green-800 dark:text-green-300">{enabledCount}</div>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 dark:bg-orange-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-orange-700 dark:text-orange-400">AI Disabled</span>
                  </div>
                  <div className="text-2xl font-bold mt-1 text-orange-800 dark:text-orange-300">{totalCount - enabledCount}</div>
                </CardContent>
              </Card>
            </div>

            {/* Folders table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folder Name</TableHead>
                  <TableHead>Datasets</TableHead>
                  <TableHead>AI Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-center">Enable/Disable AI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {foldersWithSettings.map((folder) => (
                  <TableRow key={folder.folderName}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{folder.folderName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {folder.datasetCount || 0} datasets
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={folder.isAiEnabled ? "default" : "secondary"}>
                        {folder.isAiEnabled ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Enabled
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Disabled
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {folder.lastUpdated ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(folder.lastUpdated).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={folder.isAiEnabled}
                        onCheckedChange={() => handleToggleAiSetting(folder.folderName, folder.isAiEnabled)}
                        disabled={isUpdating === folder.folderName}
                        className="data-[state=checked]:bg-green-600"
                      />
                      {isUpdating === folder.folderName && (
                        <RefreshCw className="h-3 w-3 animate-spin ml-2" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}