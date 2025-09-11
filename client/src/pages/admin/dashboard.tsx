import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Users, Shield, UserCheck, RefreshCw, Database, Activity } from "lucide-react";
import { Link } from "wouter";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface AdminDashboardProps {
  currentUser?: { id: number; username: string; email: string; role: string } | null;
}

export default function AdminDashboard({ }: AdminDashboardProps) {
  // Fetch all users for statistics
  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const res = await apiRequest('GET', '/api/admin/users', null, {
        'Authorization': `Bearer ${token}`
      });
      
      return res.json();
    },
  });

  // Fetch system stats
  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/stats');
      return res.json();
    },
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and quick actions</p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/admin/users">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">User Management</CardTitle>
              <Users className="h-6 w-6 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Manage users, roles, and permissions</p>
              <div className="mt-4 text-2xl font-bold">
                {users?.length || 0} Total Users
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/admin/folders">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">Folder Access</CardTitle>
              <Shield className="h-6 w-6 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Configure folder permissions and access control</p>
              <div className="mt-4 text-2xl font-bold">
                {stats?.dataSources || 0} Data Sources
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'Loading...' : 'Registered users'}
            </p>
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
            <p className="text-xs text-muted-foreground">
              Administrator accounts
            </p>
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
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Datasets</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDatasets || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total datasets
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>System Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Data Lake Size</h3>
              <p className="text-lg font-semibold">{stats?.totalSize || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Last Updated</h3>
              <p className="text-lg font-semibold">{stats?.lastUpdated || 'Never'}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Data Sources</h3>
              <p className="text-lg font-semibold">{stats?.dataSources || 0}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Community Data Points</h3>
              <p className="text-lg font-semibold">
                {stats?.totalCommunityDataPoints?.toLocaleString() || 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}