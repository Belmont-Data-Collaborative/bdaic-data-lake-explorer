
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Folder, Edit, Shield, Save, X, RefreshCw } from "lucide-react";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Manual refresh function
  const handleRefreshData = async () => {
    toast({
      title: "Refreshing data...",
      description: "Updating folder access information.",
    });
    
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users-folder-access'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] })
    ]);

    toast({
      title: "Data refreshed",
      description: "Folder access information has been updated.",
    });
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

  // Fetch users with folder access
  const { data: usersWithAccess = [], isLoading: accessLoading } = useQuery({
    queryKey: ['/api/admin/users-folder-access'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const res = await apiRequest('GET', '/api/admin/users-folder-access', null, {
        'Authorization': `Bearer ${token}`
      });
      return res.json();
    },
  });

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
      
      // Force immediate cache invalidation and refetch
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users-folder-access'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/user/accessible-folders'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/folders'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/datasets'] })
      ]);
      
      // Force immediate refetch for the table data
      await queryClient.refetchQueries({ queryKey: ['/api/admin/users-folder-access'] });
      
      setEditingUserId(null);
      setSelectedFolders([]);
      setDialogOpen(false);
    },
  });

  const handleEditFolderAccess = (user: UserWithFolderAccess) => {
    setEditingUserId(user.userId);
    setSelectedFolders(user.folders || []);
    setDialogOpen(true);
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Folders</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allFolders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users with Access</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersWithAccess.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manageable Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nonAdminUsers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Folder Access Management Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Folder Access Management</CardTitle>
              <CardDescription>
                Manage which folders each user can access. Admins have access to all folders by default.
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshData}
              disabled={updateFolderAccessMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Accessible Folders</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Show admin users with all access */}
              {users.filter((user: User) => user.role === 'admin').map((user: User) => (
                <TableRow key={user.id} className="bg-blue-50">
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <span>{user.username}</span>
                      <Badge variant="default">Admin</Badge>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">All Folders (Admin)</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">No action needed</span>
                  </TableCell>
                </TableRow>
              ))}

              {/* Show non-admin users */}
              {nonAdminUsers.map((user: User) => {
                const userAccess = usersWithAccess.find((ua: UserWithFolderAccess) => ua.userId === user.id);
                const folderCount = userAccess?.folders?.length || 0;

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {folderCount > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {userAccess!.folders.slice(0, 3).map((folder: string) => (
                            <Badge key={folder} variant="outline" className="text-xs">
                              {folder.replace(/_/g, ' ').toUpperCase()}
                            </Badge>
                          ))}
                          {folderCount > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{folderCount - 3} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No folder access</span>
                      )}
                    </TableCell>
                    <TableCell>
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
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit Access
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Folder Access for {user.username}</DialogTitle>
                            <DialogDescription>
                              Select which folders this user can access
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
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
