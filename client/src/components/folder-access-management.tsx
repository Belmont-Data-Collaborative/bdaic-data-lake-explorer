
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Folder, Edit, Shield, Save, X, RefreshCw, UserCheck, Lock, Unlock, Brain, Bot } from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface UserWithFolderAccess {
  userId: number;
  username: string;
  email: string;
  role: string;
  folders: string[];
}

export default function FolderAccessManagement() {
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [folderAiSettings, setFolderAiSettings] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();



  // Manual refresh function - force fresh database fetch
  const handleRefreshData = async () => {
    toast({
      title: "Refreshing data...",
      description: "Fetching latest folder access from database.",
    });
    
    try {
      // Clear cache completely and force fresh fetch
      queryClient.clear();
      await refetchUsersAccess();
      
      toast({
        title: "Data refreshed",
        description: "Latest folder access information loaded from database.",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Could not fetch latest data from database.",
        variant: "destructive",
      });
    }
  };

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const res = await apiRequest('GET', '/api/admin/users', null, {
        'Authorization': `Bearer ${token}`
      });
      return res.json();
    },
  });

  // Fetch all available folders
  const { data: allFolders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['/api/folders'],
    queryFn: async () => {
      const response = await fetch('/api/folders');
      return response.json();
    },
  });

  // Fetch users with folder access - always fetch fresh from database
  const { data: usersWithAccess = [], isLoading: accessLoading, refetch: refetchUsersAccess } = useQuery({
    queryKey: ['/api/admin/users-folder-access'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const res = await apiRequest('GET', '/api/admin/users-folder-access', null, {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      });
      return res.json();
    },
    staleTime: 0, // Always consider stale
    gcTime: 0, // Don't keep in cache
  });

  // Fetch folder AI settings
  const { data: allFolderAiSettings = [], refetch: refetchAiSettings } = useQuery({
    queryKey: ['/api/admin/folder-ai-settings'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const res = await apiRequest('GET', '/api/admin/folder-ai-settings', null, {
        'Authorization': `Bearer ${token}`
      });
      return res.json();
    },
  });

  // Effect to update folderAiSettings when allFolderAiSettings changes
  useEffect(() => {
    const aiSettings: Record<string, boolean> = {};
    allFolderAiSettings.forEach((setting: any) => {
      aiSettings[setting.folderName] = setting.isAiEnabled;
    });
    setFolderAiSettings(aiSettings);
  }, [allFolderAiSettings]);

  // Update folder access mutation
  const updateFolderAccessMutation = useMutation({
    mutationFn: async ({ userId, folderNames }: { userId: number; folderNames: string[] }) => {
      const token = localStorage.getItem('authToken');
      const res = await apiRequest('PUT', `/api/admin/users/${userId}/folder-access`, 
        { folderNames }, 
        { 'Authorization': `Bearer ${token}` }
      );
      return res.json();
    },
    onMutate: async ({ userId, folderNames }) => {
      // Show updating toast
      toast({
        title: "Updating folder access...",
        description: "Please wait while we update the user's folder permissions.",
      });

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/admin/users-folder-access'] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['/api/admin/users-folder-access']);

      // Optimistically update the cache
      queryClient.setQueryData(['/api/admin/users-folder-access'], (old: UserWithFolderAccess[] | undefined) => {
        if (!old) return old;
        
        return old.map(user => 
          user.userId === userId 
            ? { ...user, folders: folderNames }
            : user
        );
      });

      // Return context with snapshot
      return { previousData };
    },
    onError: (err, _variables, context) => {
      // Revert on error
      if (context?.previousData) {
        queryClient.setQueryData(['/api/admin/users-folder-access'], context.previousData);
      }
      toast({
        title: "Update failed",
        description: err.message || "Failed to update folder access",
        variant: "destructive",
      });
    },
    onSuccess: async () => {
      toast({
        title: "Folder access updated",
        description: "User folder permissions have been updated successfully.",
      });
      
      // Clear all caches completely to force fresh database fetch
      queryClient.clear();
      
      // Force fresh database fetch with no cache
      const token = localStorage.getItem('authToken');
      try {
        const freshResponse = await fetch('/api/admin/users-folder-access', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (freshResponse.ok) {
          const freshData = await freshResponse.json();
          // Set fresh data in cache
          queryClient.setQueryData(['/api/admin/users-folder-access'], freshData);
        }
      } catch (error) {
        console.error('Failed to fetch fresh data:', error);
      }
      
      // Also invalidate other related queries
      queryClient.invalidateQueries({ queryKey: ['/api/user/accessible-folders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/datasets'] });
      
      setEditingUserId(null);
      setSelectedFolders([]);
      setDialogOpen(false);
    },
  });

  const handleEditFolderAccess = (user: UserWithFolderAccess) => {
    setEditingUserId(user.userId);
    setSelectedFolders(user.folders || []);
    setDialogOpen(true);
    
    // Refresh AI settings to ensure we have the latest data
    refetchAiSettings();
  };

  const handleSaveFolderAccess = () => {
    if (editingUserId) {
      updateFolderAccessMutation.mutate({
        userId: editingUserId,
        folderNames: selectedFolders,
      });
    }
  };

  const handleFolderToggle = (folderName: string) => {
    setSelectedFolders(prev => 
      prev.includes(folderName)
        ? prev.filter(f => f !== folderName)
        : [...prev, folderName]
    );
  };

  const handleAiToggle = async (folderName: string, isEnabled: boolean) => {
    try {
      // Update UI immediately for better UX
      setFolderAiSettings(prev => ({
        ...prev,
        [folderName]: isEnabled
      }));

      const token = localStorage.getItem('authToken');
      await apiRequest('PUT', `/api/admin/folder-ai-settings/${encodeURIComponent(folderName)}`, 
        { isAiEnabled: isEnabled }, 
        { 'Authorization': `Bearer ${token}` }
      );

      toast({
        title: "AI Setting Updated",
        description: `Ask AI has been ${isEnabled ? 'enabled' : 'disabled'} for folder "${folderName}".`,
      });

      // Refresh AI settings data to ensure consistency
      await refetchAiSettings();
      
    } catch (error) {
      // Revert UI state on error
      setFolderAiSettings(prev => ({
        ...prev,
        [folderName]: !isEnabled
      }));
      
      toast({
        title: "Update Failed",
        description: `Failed to update AI setting for folder "${folderName}".`,
        variant: "destructive",
      });
    }
  };

  const isLoading = usersLoading || foldersLoading || accessLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading folder access data...</span>
        </div>
      </div>
    );
  }

  // Get non-admin users for folder access management
  const nonAdminUsers = users.filter((user: User) => user.role !== 'admin' && user.isActive);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-25 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-900">Total Folders</CardTitle>
            <Folder className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">{allFolders.length}</div>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-25 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-indigo-900">Users with Access</CardTitle>
            <Users className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-900">{usersWithAccess.length}</div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-amber-25 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-amber-900">Manageable Users</CardTitle>
            <Shield className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900">{nonAdminUsers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Folder Access Management Table */}
      <Card className="shadow-sm border-gray-200 bg-white">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-25 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-900 font-semibold">Folder Access Management</CardTitle>
              <CardDescription className="text-gray-600">
                Manage which folders each user can access. Admins have access to all folders by default. Click <strong>"Manage Access"</strong> to edit user permissions.
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshData}
              disabled={updateFolderAccessMutation.isPending}
              className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-200 font-medium shadow-sm"
              title="Refresh folder access data from database"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Information</TableHead>
                <TableHead>Email & Role</TableHead>
                <TableHead>Folder Access Summary</TableHead>
                <TableHead className="text-center">Manage Permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Show admin users with all access */}
              {users.filter((user: User) => user.role === 'admin').map((user: User) => (
                <TableRow key={user.id} className="bg-gradient-to-r from-purple-50 to-purple-25 border-purple-100">
                  <TableCell className="font-semibold py-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-gray-900">{user.username}</span>
                      </div>
                      <div className="text-xs text-gray-500">ID: {user.id}</div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="space-y-2">
                      <div className="text-gray-900 font-medium">{user.email}</div>
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-medium px-2 py-1">Admin</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="space-y-2">
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-medium px-3 py-1">
                        <Unlock className="w-3 h-3 mr-1" />
                        All Folders (Admin)
                      </Badge>
                      <div className="text-xs text-purple-600">Full system access to all {allFolders.length} folders</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center py-4">
                    <span className="text-gray-500 text-sm font-medium italic">No action needed</span>
                  </TableCell>
                </TableRow>
              ))}

              {/* Show non-admin users */}
              {nonAdminUsers.map((user: User) => {
                const userAccess = usersWithAccess.find((ua: UserWithFolderAccess) => ua.userId === user.id);
                const folderCount = userAccess?.folders?.length || 0;

                return (
                  <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900">{user.username}</div>
                        <div className="text-xs text-gray-500">ID: {user.id}</div>
                        <div className={`text-xs flex items-center ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-2">
                        <div className="text-gray-900 font-medium">{user.email}</div>
                        <Badge className={
                          user.role === 'editor'
                            ? 'bg-blue-100 text-blue-800 border-blue-200 font-medium px-2 py-1'
                            : 'bg-gray-100 text-gray-700 border-gray-200 font-medium px-2 py-1'
                        }>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      {folderCount > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                            <span className="font-semibold text-emerald-700">{folderCount} folders accessible</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {userAccess!.folders.slice(0, 3).map((folder: string) => (
                              <Badge key={folder} className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-medium px-2 py-1">
                                {folder.replace(/_/g, ' ').toUpperCase()}
                              </Badge>
                            ))}
                            {folderCount > 3 && (
                              <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs font-medium px-2 py-1">
                                +{folderCount - 3} more
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Access to {Math.round((folderCount / allFolders.length) * 100)}% of available folders
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Lock className="w-4 h-4 text-red-500" />
                            <span className="font-medium text-red-600">No folder access</span>
                          </div>
                          <div className="text-xs text-gray-500">User cannot access any data folders</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <Dialog open={dialogOpen && editingUserId === user.id} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditFolderAccess(userAccess || { 
                              userId: user.id, 
                              username: user.username, 
                              email: user.email, 
                              role: user.role, 
                              folders: [] 
                            })}
                            className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-all duration-200 font-medium shadow-sm"
                            title={`Manage folder access for ${user.username}`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Manage Access
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Manage Permissions for {user.username}</DialogTitle>
                            <DialogDescription>
                              Select folder access and enable Ask AI functionality for this user
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-6">
                            {/* Folder Access Section */}
                            <div className="space-y-3">
                              <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Folder className="h-5 w-5" />
                                Folder Access
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Select which folders this user can access and download data from
                              </p>
                              <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto border rounded-lg p-4 bg-muted/20">
                                {allFolders.map((folder: string) => (
                                  <div key={folder} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`folder-${folder}`}
                                      checked={selectedFolders.includes(folder)}
                                      onCheckedChange={() => handleFolderToggle(folder)}
                                    />
                                    <label 
                                      htmlFor={`folder-${folder}`} 
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                      {folder.replace(/_/g, ' ').toUpperCase()}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* AI Access Section - Only for folders the user has access to */}
                            {selectedFolders.length > 0 && (
                              <div className="space-y-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                  <Bot className="h-5 w-5" />
                                  Ask AI Access
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Enable Ask AI functionality for specific folders this user can access
                                </p>
                                <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
                                  {selectedFolders.map((folder: string) => (
                                    <div key={`ai-${folder}`} className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <Brain className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">
                                          {folder.replace(/_/g, ' ').toUpperCase()}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                          {folderAiSettings[folder] ? 'Enabled' : 'Disabled'}
                                        </span>
                                        <Switch
                                          checked={folderAiSettings[folder] || false}
                                          onCheckedChange={(checked) => handleAiToggle(folder, checked)}
                                          size="sm"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setEditingUserId(null);
                                  setSelectedFolders([]);
                                  setDialogOpen(false);
                                }}
                                disabled={updateFolderAccessMutation.isPending}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                              <Button
                                onClick={handleSaveFolderAccess}
                                disabled={updateFolderAccessMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm transition-all duration-200"
                              >
                                <Save className="h-4 w-4 mr-1" />
                                {updateFolderAccessMutation.isPending ? "Saving..." : "Save Changes"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
