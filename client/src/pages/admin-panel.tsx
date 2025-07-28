import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Shield, UserCheck, UserX, Edit, Trash2, AlertTriangle, RefreshCw, Settings, Plus, FolderOpen } from "lucide-react";
import { format } from "date-fns";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface Role {
  id: number;
  name: string;
  description?: string;
  isSystemRole: boolean;
  createdAt: string;
  updatedAt: string;
  datasetCount?: number;
}

interface RoleFormData {
  name: string;
  description: string;
  selectedFolders: string[];
}

interface AdminPanelProps {
  currentUser?: { id: number; username: string; email: string; role: string } | null;
}

export default function AdminPanel({ currentUser }: AdminPanelProps) {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("users");
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [roleFormData, setRoleFormData] = useState<RoleFormData>({
    name: "",
    description: "",
    selectedFolders: []
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      console.log('Admin panel - checking token:', token ? 'Token exists' : 'No token');
      console.log('Current user:', currentUser);
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      try {
        const res = await apiRequest('GET', '/api/admin/users', null, {
          'Authorization': `Bearer ${token}`
        });
        
        console.log('API response status:', res.status);
        
        const data = await res.json();
        console.log('Users data received:', data.length, 'users');
        return data;
      } catch (err) {
        console.error('Admin API error:', err);
        throw err;
      }
    },
    enabled: !!localStorage.getItem('authToken') && !!currentUser,
    retry: false, // Don't retry auth errors
  });

  // Fetch all roles
  const { data: roles, isLoading: rolesLoading, error: rolesError } = useQuery({
    queryKey: ['/api/admin/roles'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      const res = await apiRequest('GET', '/api/admin/roles', null, {
        'Authorization': `Bearer ${token}`
      });
      return res.json();
    },
    enabled: !!localStorage.getItem('authToken') && !!currentUser,
    retry: false,
  });

  // Fetch available folders
  const { data: folders } = useQuery({
    queryKey: ['/api/folders'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const res = await apiRequest('GET', '/api/folders', null, {
        'Authorization': `Bearer ${token}`
      });
      return res.json();
    },
    enabled: !!localStorage.getItem('authToken') && !!currentUser,
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: number; updates: Partial<User> }) => {
      const token = localStorage.getItem('authToken');
      const res = await apiRequest('PUT', `/api/admin/users/${userId}`, updates, {
        'Authorization': `Bearer ${token}`
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "User information has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const token = localStorage.getItem('authToken');
      const res = await apiRequest('DELETE', `/api/admin/users/${userId}`, null, {
        'Authorization': `Bearer ${token}`
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "User has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setDeletingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: { name: string; description: string; selectedFolders: string[] }) => {
      const token = localStorage.getItem('authToken');
      
      // Get dataset IDs for selected folders
      const datasetIds: number[] = [];
      if (roleData.selectedFolders.length > 0) {
        const datasetsRes = await apiRequest('GET', '/api/datasets?limit=10000', null, {
          'Authorization': `Bearer ${token}`
        });
        const datasetsData = await datasetsRes.json();
        const allDatasets = datasetsData.datasets || [];
        
        // Filter datasets by selected folders
        const filteredDatasets = allDatasets.filter((dataset: any) => 
          roleData.selectedFolders.includes(dataset.topLevelFolder)
        );
        datasetIds.push(...filteredDatasets.map((d: any) => d.id));
      }

      const res = await apiRequest('POST', '/api/admin/roles', {
        name: roleData.name,
        description: roleData.description,
        datasetIds
      }, {
        'Authorization': `Bearer ${token}`
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
      setIsCreateRoleOpen(false);
      setRoleFormData({ name: "", description: "", selectedFolders: [] });
      toast({
        title: "Role created",
        description: "The role has been successfully created.",
      });
    },
    onError: (error: any) => {
      console.error("Error creating role:", error);
      toast({
        title: "Error",
        description: "Failed to create role. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      const token = localStorage.getItem('authToken');
      const res = await apiRequest('DELETE', `/api/admin/roles/${roleId}`, null, {
        'Authorization': `Bearer ${token}`
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setDeletingRole(null);
      toast({
        title: "Role deleted",
        description: "The role has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      console.error("Error deleting role:", error);
      toast({
        title: "Error",
        description: "Failed to delete role. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Assign role to user mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: number; roleId: number }) => {
      const token = localStorage.getItem('authToken');
      const res = await apiRequest('POST', `/api/admin/users/${userId}/role`, {
        roleId
      }, {
        'Authorization': `Bearer ${token}`
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.refetchQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Role assigned",
        description: "The role has been successfully assigned to the user.",
      });
    },
    onError: (error: any) => {
      console.error("Error assigning role:", error);
      toast({
        title: "Error",
        description: "Failed to assign role. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateUser = (updates: Partial<User>) => {
    if (editingUser) {
      updateUserMutation.mutate({
        userId: editingUser.id,
        updates,
      });
    }
  };

  const handleDeleteUser = () => {
    if (deletingUser) {
      deleteUserMutation.mutate(deletingUser.id);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === 'admin' ? 'destructive' : 'secondary';
  };

  const getStatusBadgeVariant = (isActive: boolean) => {
    return isActive ? 'default' : 'outline';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading users...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-4">Authentication Error</h2>
          <p className="text-muted-foreground mb-4">
            {error?.message || 'Failed to load user data. Please try logging in again.'}
          </p>
          <div className="space-y-2 mb-4">
            <p className="text-sm text-muted-foreground">
              Please log out and log back in with your credentials:
            </p>
            <p className="text-sm font-mono bg-muted p-2 rounded">
              Username: admin<br />
              Password: admin
            </p>
          </div>
          <div className="space-x-2">
            <Button onClick={() => {
              // Clear all authentication data
              localStorage.removeItem('authToken');
              localStorage.removeItem('currentUser');
              localStorage.removeItem('authenticated');
              window.location.href = '/';
            }}>
              Log Out & Return to Login
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users, roles, and system settings</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
            queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
            toast({
              title: "Refreshing data",
              description: "Admin data is being refreshed...",
            });
          }}
          className="flex items-center space-x-2"
          disabled={isLoading || rolesLoading}
        >
          <RefreshCw className={`h-4 w-4 ${(isLoading || rolesLoading) ? 'animate-spin' : ''}`} />
          <span>Reload</span>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users size={16} />
            <span>User Management</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center space-x-2">
            <Shield size={16} />
            <span>Role Management</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter((user: User) => user.role === 'admin').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter((user: User) => user.isActive).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            View and manage all registered users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user: User) => (
                <TableRow key={user.id} className={currentUser?.id === user.id ? "bg-primary/5" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <span>{user.username}</span>
                      {currentUser?.id === user.id && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {currentUser?.id === user.id ? (
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    ) : (
                      <Select 
                        value={user.role} 
                        onValueChange={(newRole) => {
                          updateUserMutation.mutate({
                            userId: user.id,
                            updates: { role: newRole }
                          });
                        }}
                        disabled={updateUserMutation.isPending}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center space-x-2">
                              <Shield className="h-3 w-3" />
                              <span>Admin</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="user">
                            <div className="flex items-center space-x-2">
                              <Users className="h-3 w-3" />
                              <span>User</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {currentUser?.id === user.id ? (
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    ) : (
                      <Select 
                        value={user.isActive ? 'active' : 'inactive'} 
                        onValueChange={(newStatus) => {
                          updateUserMutation.mutate({
                            userId: user.id,
                            updates: { isActive: newStatus === 'active' }
                          });
                        }}
                        disabled={updateUserMutation.isPending}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">
                            <div className="flex items-center space-x-2">
                              <UserCheck className="h-3 w-3" />
                              <span>Active</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="inactive">
                            <div className="flex items-center space-x-2">
                              <UserX className="h-3 w-3" />
                              <span>Inactive</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {user.lastLoginAt 
                      ? format(new Date(user.lastLoginAt), 'MMM dd, yyyy HH:mm')
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                            <DialogDescription>
                              Update user role and status
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Role</label>
                              <Select
                                defaultValue={editingUser?.role}
                                onValueChange={(value) => {
                                  if (editingUser) {
                                    setEditingUser({ ...editingUser, role: value });
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Status</label>
                              <Select
                                defaultValue={editingUser?.isActive ? "active" : "inactive"}
                                onValueChange={(value) => {
                                  if (editingUser) {
                                    setEditingUser({ ...editingUser, isActive: value === "active" });
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              onClick={() => handleUpdateUser({
                                role: editingUser?.role,
                                isActive: editingUser?.isActive,
                              })}
                              disabled={updateUserMutation.isPending}
                            >
                              {updateUserMutation.isPending ? "Updating..." : "Update User"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingUser(user)}
                                disabled={currentUser?.id === user.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {currentUser?.id === user.id 
                                ? "Cannot delete your own account" 
                                : "Delete user"
                              }
                            </TooltipContent>
                          </Tooltip>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete User</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to delete this user? This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => setDeletingUser(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleDeleteUser}
                              disabled={deleteUserMutation.isPending}
                            >
                              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          {/* Role Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{roles?.length || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Custom Roles</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {roles?.filter((role: Role) => !role.isSystemRole).length || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Folders</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{folders?.length || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Create Role Button */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Role Management</h3>
              <p className="text-sm text-muted-foreground">Create custom roles to control dataset access</p>
            </div>
            <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Role</DialogTitle>
                  <DialogDescription>
                    Create a custom role and select which data folders users with this role can access.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="role-name">Role Name</Label>
                    <Input
                      id="role-name"
                      value={roleFormData.name}
                      onChange={(e) => setRoleFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter role name (e.g., 'CDC Data Access')"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role-description">Description (Optional)</Label>
                    <Textarea
                      id="role-description"
                      value={roleFormData.description}
                      onChange={(e) => setRoleFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this role is for..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Select Data Folders</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Choose which top-level data folders users with this role can access. Users will only see datasets from selected folders.
                    </p>
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                      {folders?.map((folder: string) => (
                        <div key={folder} className="flex items-center space-x-2">
                          <Checkbox
                            id={folder}
                            checked={roleFormData.selectedFolders.includes(folder)}
                            onCheckedChange={(checked) => {
                              setRoleFormData(prev => ({
                                ...prev,
                                selectedFolders: checked
                                  ? [...prev.selectedFolders, folder]
                                  : prev.selectedFolders.filter(f => f !== folder)
                              }));
                            }}
                          />
                          <Label htmlFor={folder} className="text-sm cursor-pointer">
                            {folder.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateRoleOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => createRoleMutation.mutate(roleFormData)}
                      disabled={!roleFormData.name.trim() || createRoleMutation.isPending}
                    >
                      {createRoleMutation.isPending ? "Creating..." : "Create Role"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Roles Table */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Roles</CardTitle>
              <CardDescription>
                Manage custom roles and their folder access permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Folder Access</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles?.map((role: Role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>{role.description || "No description"}</TableCell>
                      <TableCell>
                        <Badge variant={role.isSystemRole ? "default" : "secondary"}>
                          {role.isSystemRole ? "System" : "Custom"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {role.datasetCount ? (
                            <Badge variant="outline">{role.datasetCount} datasets</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No datasets</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(role.createdAt), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {!role.isSystemRole && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingRole(role);
                                  setRoleFormData({
                                    name: role.name,
                                    description: role.description || "",
                                    selectedFolders: [] // TODO: Get actual folder list for this role
                                  });
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDeletingRole(role)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Delete Role</DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to delete the role "{role.name}"? This will remove the role from all users and cannot be undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex justify-end space-x-2">
                                    <Button variant="outline" onClick={() => setDeletingRole(null)}>
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() => deleteRoleMutation.mutate(role.id)}
                                      disabled={deleteRoleMutation.isPending}
                                    >
                                      {deleteRoleMutation.isPending ? "Deleting..." : "Delete Role"}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* User Role Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>User Role Assignment</CardTitle>
              <CardDescription>
                Assign custom roles to users to control their dataset access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>System Role</TableHead>
                    <TableHead>Custom Role</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.username}
                        {currentUser?.id === user.id && (
                          <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.customRoleId ? (
                          <Badge variant="outline">
                            {roles?.find((r: Role) => r.id === user.customRoleId)?.name || "Unknown"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">No custom role</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            Admin - No role assignment needed
                          </Badge>
                        ) : (
                          <Select
                            value={user.customRoleId?.toString() || "none"}
                            onValueChange={(value) => {
                              if (value === "none") {
                                // Remove role
                                const token = localStorage.getItem('authToken');
                                apiRequest('DELETE', `/api/admin/users/${user.id}/role`, null, {
                                  'Authorization': `Bearer ${token}`
                                }).then(() => {
                                  queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
                                  queryClient.refetchQueries({ queryKey: ['/api/admin/users'] });
                                  toast({
                                    title: "Role removed",
                                    description: "Custom role has been removed from user.",
                                  });
                                }).catch((error) => {
                                  console.error("Error removing role:", error);
                                  toast({
                                    title: "Error",
                                    description: "Failed to remove role. Please try again.",
                                    variant: "destructive",
                                  });
                                });
                              } else {
                                // Assign role
                                assignRoleMutation.mutate({
                                  userId: user.id,
                                  roleId: parseInt(value)
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No custom role</SelectItem>
                              {roles?.filter((role: Role) => !role.isSystemRole).map((role: Role) => (
                                <SelectItem key={role.id} value={role.id.toString()}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}