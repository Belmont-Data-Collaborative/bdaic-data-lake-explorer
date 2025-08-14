import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Shield, UserCheck, Edit, Trash2, AlertTriangle, RefreshCw, ArrowLeft, Clock, Calendar, Activity, Settings, UserPlus, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import FolderAccessManagement from "@/components/folder-access-management";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface AdminUsersProps {
  currentUser?: { id: number; username: string; email: string; role: string } | null;
}

export default function AdminUsers({ currentUser }: AdminUsersProps) {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();



  // Fetch all users
  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      try {
        const res = await apiRequest('GET', '/api/admin/users', null, {
          'Authorization': `Bearer ${token}`
        });
        
        const data = await res.json();
        console.log(`Fetched ${data?.length || 0} users from API`);
        return data;
      } catch (err) {
        console.error('Admin API error:', err);
        throw err;
      }
    },
    staleTime: 0, // Always consider data stale
    gcTime: 0, // No caching
  });



  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: number; updates: Partial<User> }) => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const res = await apiRequest('PUT', `/api/admin/users/${userId}`, updates, {
        'Authorization': `Bearer ${token}`
      });
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User updated",
        description: "User information has been successfully updated.",
      });
      setEditingUser(null);
    },
    onError: (error) => {
      console.error('Update user error:', error);
      toast({
        title: "Update failed",
        description: "Failed to update user. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const res = await apiRequest('POST', '/api/admin/users', userData, {
        'Authorization': `Bearer ${token}`
      });
      
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User created successfully",
        description: `New user ${data.user.username} has been created.`,
      });
      setCreatingUser(false);
      setNewUserData({ username: '', email: '', password: '', role: 'user' });
      setShowPassword(false);
    },
    onError: (error: any) => {
      console.error('Create user error:', error);
      toast({
        title: "Failed to create user",
        description: error.message || "Please check the information and try again.",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const res = await apiRequest('DELETE', `/api/admin/users/${userId}`, null, {
        'Authorization': `Bearer ${token}`
      });
      
      return res.json();
    },
    onMutate: async (userId: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/admin/users'] });

      // Snapshot the previous value
      const previousUsers = queryClient.getQueryData(['/api/admin/users']);

      // Optimistically remove the user from the cache
      queryClient.setQueryData(['/api/admin/users'], (old: any[]) => {
        if (!old) return old;
        return old.filter(user => user.id !== userId);
      });

      // Return context with snapshot
      return { previousUsers, userId };
    },
    onError: (error: any, userId: number, context) => {
      // Revert optimistic update on error
      if (context?.previousUsers) {
        queryClient.setQueryData(['/api/admin/users'], context.previousUsers);
      }
      
      console.error('Delete user error:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: async () => {
      console.log("User deletion successful, refreshing data...");
      
      // Close the dialog immediately
      setDeletingUser(null);
      
      toast({
        title: "User deleted",
        description: "User has been successfully deleted.",
      });
      
      // Clear cache and force fresh fetch
      queryClient.clear();
      
      // Force immediate fresh database fetch
      const token = localStorage.getItem('authToken');
      try {
        const freshResponse = await fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (freshResponse.ok) {
          const freshUsers = await freshResponse.json();
          console.log(`Fetched ${freshUsers.length} users from API`);
          queryClient.setQueryData(['/api/admin/users'], freshUsers);
        }
      } catch (fetchError) {
        console.error('Failed to fetch fresh user data:', fetchError);
        await refetch();
      }
      
      // Also refresh related queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users-folder-access'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-usage'] });
    },
    onSettled: () => {
      // Always ensure queries are refetched
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold text-destructive">Access Error</h2>
          <p className="text-muted-foreground">
            {error.message || 'Unable to load admin panel. Please verify your permissions.'}
          </p>
          <div className="space-x-4">
            <Button onClick={() => {
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
        <div className="flex items-center space-x-4">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage users, roles, and permissions</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Dialog open={creatingUser} onOpenChange={setCreatingUser}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white">
                <UserPlus className="h-4 w-4" />
                <span>Create User</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user account with specified role and permissions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-username">Username</Label>
                  <Input
                    id="new-username"
                    type="text"
                    value={newUserData.username}
                    onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                    placeholder="Enter username"
                    disabled={createUserMutation.isPending}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    placeholder="Enter email address"
                    disabled={createUserMutation.isPending}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                      placeholder="Enter password"
                      className="pr-10"
                      disabled={createUserMutation.isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters long
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-role">Role</Label>
                  <Select
                    value={newUserData.role}
                    onValueChange={(value) => setNewUserData({ ...newUserData, role: value })}
                    disabled={createUserMutation.isPending}
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
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCreatingUser(false);
                      setNewUserData({ username: '', email: '', password: '', role: 'user' });
                      setShowPassword(false);
                    }}
                    disabled={createUserMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createUserMutation.mutate(newUserData)}
                    disabled={createUserMutation.isPending || !newUserData.username || !newUserData.email || !newUserData.password}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
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
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-25 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-blue-900">Total Users</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{users?.length || 0}</div>
            <p className="text-xs text-blue-700 mt-1">Registered accounts</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-25 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-purple-900">Admin Users</CardTitle>
            <Shield className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {users?.filter((user: User) => user.role === 'admin').length || 0}
            </div>
            <p className="text-xs text-purple-700 mt-1">Full access privileges</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-25 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-green-900">Active Users</CardTitle>
            <UserCheck className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {users?.filter((user: User) => user.isActive).length || 0}
            </div>
            <p className="text-xs text-green-700 mt-1">Currently enabled accounts</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-25 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-orange-900">Recent Logins</CardTitle>
            <Activity className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {users?.filter((user: User) => user.lastLoginAt && 
                new Date(user.lastLoginAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length || 0}
            </div>
            <p className="text-xs text-orange-700 mt-1">Logins this week</p>
          </CardContent>
        </Card>
      </div>

      {/* User Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Roles Breakdown */}
        <Card className="shadow-sm border-gray-200 bg-white">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-25 border-b border-indigo-100">
            <CardTitle className="text-indigo-900 font-semibold flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              User Roles
            </CardTitle>
            <CardDescription className="text-indigo-600">
              Breakdown of user access levels
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {['admin', 'user'].map((role) => {
                const roleUsers = users?.filter((user: User) => user.role === role) || [];
                const roleCount = roleUsers.length;
                const percentage = users?.length ? Math.round((roleCount / users.length) * 100) : 0;
                
                return (
                  <div key={role} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        role === 'admin' ? 'bg-purple-500' : 'bg-gray-400'
                      }`}></div>
                      <span className="font-medium capitalize">{role}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{roleCount}</div>
                      <div className="text-xs text-gray-500">{percentage}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Activity Overview */}
        <Card className="shadow-sm border-gray-200 bg-white">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-25 border-b border-emerald-100">
            <CardTitle className="text-emerald-900 font-semibold flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Activity Overview
            </CardTitle>
            <CardDescription className="text-emerald-600">
              User login activity summary
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Never logged in</span>
                <span className="font-semibold">
                  {users?.filter((user: User) => !user.lastLoginAt).length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Last 24 hours</span>
                <span className="font-semibold">
                  {users?.filter((user: User) => user.lastLoginAt && 
                    new Date(user.lastLoginAt).getTime() > Date.now() - 24 * 60 * 60 * 1000).length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">This week</span>
                <span className="font-semibold">
                  {users?.filter((user: User) => user.lastLoginAt && 
                    new Date(user.lastLoginAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">This month</span>
                <span className="font-semibold">
                  {users?.filter((user: User) => user.lastLoginAt && 
                    new Date(user.lastLoginAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000).length || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-sm border-gray-200 bg-white">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-25 border-b border-amber-100">
            <CardTitle className="text-amber-900 font-semibold flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Account Statistics
            </CardTitle>
            <CardDescription className="text-amber-600">
              Registration and activity trends
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Newest user</span>
                <span className="font-semibold text-right">
                  {users?.length ? 
                    users.reduce((newest: User, user: User) => 
                      new Date(user.createdAt) > new Date(newest.createdAt) ? user : newest
                    ).username : 'None'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Inactive accounts</span>
                <span className="font-semibold">
                  {users?.filter((user: User) => !user.isActive).length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total accounts created</span>
                <span className="font-semibold">{users?.length || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Management Tabs */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="folder-access" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Folder Access & AI Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          {/* Users Table */}
      <Card className="shadow-sm border-gray-200 bg-white">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-25 border-b border-gray-100">
          <CardTitle className="text-gray-900 font-semibold">User Management</CardTitle>
          <CardDescription className="text-gray-600">
            View and manage all registered users. Click <strong>"Edit"</strong> to modify user roles and status, or <strong>"Delete"</strong> to remove users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading users...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Information</TableHead>
                  <TableHead>Role & Permissions</TableHead>
                  <TableHead>Account Status</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Last Login Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user: User) => (
                  <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                        <div className="text-xs text-gray-500">ID: {user.id}</div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-2">
                        <Badge 
                          variant={user.role === 'admin' ? 'default' : 'secondary'}
                          className={
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800 border-purple-200 font-medium px-3 py-1'
                              : 'bg-gray-100 text-gray-700 border-gray-200 font-medium px-3 py-1'
                          }
                        >
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                        <div className="text-xs text-gray-500">
                          {user.role === 'admin' 
                            ? 'Full system access' 
                            : 'View & download access'
                          }
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center space-x-2">
                        {user.isActive ? (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-green-700 font-medium">Active</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-red-700 font-medium">Inactive</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-gray-600 font-medium">
                      {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <div className="text-gray-900 font-medium">
                          {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM d, yyyy') : 'Never logged in'}
                        </div>
                        {user.lastLoginAt && (
                          <div className="text-xs text-gray-500">
                            {user.lastLoginAt && new Date(user.lastLoginAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
                              ? 'Recently active'
                              : user.lastLoginAt && new Date(user.lastLoginAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
                              ? 'Active this week'
                              : 'Not recently active'
                            }
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex items-center justify-end space-x-3">
                        {user.id !== currentUser?.id && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingUser(user)}
                                className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 font-medium shadow-sm"
                                title="Edit user role and status"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                            </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit User</DialogTitle>
                              <DialogDescription>
                                Update user role and status
                              </DialogDescription>
                            </DialogHeader>
                            {editingUser && (
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Role</label>
                                  <Select
                                    defaultValue={editingUser.role}
                                    onValueChange={(value) => 
                                      setEditingUser({ ...editingUser, role: value })
                                    }
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
                                    defaultValue={editingUser.isActive ? 'active' : 'inactive'}
                                    onValueChange={(value) => 
                                      setEditingUser({ ...editingUser, isActive: value === 'active' })
                                    }
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
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => setEditingUser(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={() => updateUserMutation.mutate({
                                      userId: editingUser.id,
                                      updates: {
                                        role: editingUser.role,
                                        isActive: editingUser.isActive
                                      }
                                    })}
                                    disabled={updateUserMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm transition-all duration-200"
                                  >
                                    {updateUserMutation.isPending ? 'Updating...' : 'Save Changes'}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                          </Dialog>
                        )}

                        {user.id !== currentUser?.id && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingUser(user)}
                                className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 transition-all duration-200 font-medium shadow-sm"
                                title="Delete user permanently"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Delete</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete User</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete {deletingUser?.username || user.username}? This action cannot be undone.
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
                                  onClick={() => deleteUserMutation.mutate(user.id)}
                                  disabled={deleteUserMutation.isPending}
                                  className="bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm transition-all duration-200"
                                >
                                  {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="folder-access" className="mt-6">
          <FolderAccessManagement />
        </TabsContent>

      </Tabs>
    </div>
  );
}