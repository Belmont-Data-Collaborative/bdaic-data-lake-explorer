import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Shield, UserCheck, UserX, Edit, Trash2, AlertTriangle, RefreshCw } from "lucide-react";
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

interface AdminPanelProps {
  currentUser?: { id: number; username: string; email: string; role: string } | null;
}

export default function AdminPanel({ currentUser }: AdminPanelProps) {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
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
          <p className="text-muted-foreground">Manage users and system settings</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
            toast({
              title: "Refreshing data",
              description: "User data is being refreshed...",
            });
          }}
          className="flex items-center space-x-2"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Reload</span>
        </Button>
      </div>

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
    </div>
  );
}