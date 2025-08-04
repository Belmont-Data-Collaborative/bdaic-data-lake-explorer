import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, Shield, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  description: string | null;
}

interface UserWithRoles extends User {
  roles?: Role[];
}

export function UserRoleAssignment() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAssignRolesDialogOpen, setIsAssignRolesDialogOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const { toast } = useToast();

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Fetch all roles for assignment
  const { data: allRoles = [] } = useQuery<Role[]>({
    queryKey: ["/api/admin/roles"],
  });

  // Fetch roles for selected user
  const { data: userRoles = [], refetch: refetchUserRoles } = useQuery<Role[]>({
    queryKey: ["/api/admin/users", selectedUser?.id, "roles"],
    enabled: !!selectedUser,
    queryFn: async () => {
      if (!selectedUser?.id) return [];
      console.log('Fetching roles for user:', selectedUser.id);
      const response = await apiRequest("GET", `/api/admin/users/${selectedUser.id}/roles`);
      if (!response.ok) {
        console.error('Failed to fetch user roles:', response.statusText);
        return [];
      }
      const data = await response.json();
      console.log('User roles response:', data);
      return Array.isArray(data) ? data : [];
    },
  });

  // Assign role to user mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: number; roleId: number }) => {
      console.log('Assigning role', roleId, 'to user', userId);
      const response = await apiRequest("POST", `/api/admin/users/${userId}/roles`, { roleId });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate multiple cache keys to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", selectedUser?.id, "roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Role assigned",
        description: "Role has been assigned to the user successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Assignment error:', error);
      toast({
        title: "Error assigning role",
        description: error.message || "Failed to assign role",
        variant: "destructive",
      });
    },
  });

  // Remove role from user mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: number; roleId: number }) => {
      console.log('Removing role', roleId, 'from user', userId);
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}/roles/${roleId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", selectedUser?.id, "roles"] });
    },
    onError: (error: any) => {
      console.error('Removal error:', error);
      toast({
        title: "Error removing role",
        description: error.message || "Failed to remove role",
        variant: "destructive",
      });
    },
  });

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRoleId) return;

    try {
      console.log('Starting role assignment for user', selectedUser.id, 'with role', selectedRoleId);
      console.log('Current user roles:', userRoles);
      
      // For single role per user, we'll simply assign the new role
      // The backend can handle removing existing roles if needed
      const roleId = parseInt(selectedRoleId);
      await assignRoleMutation.mutateAsync({ userId: selectedUser.id, roleId });

      setIsAssignRolesDialogOpen(false);
      setSelectedRoleId("");
      
      // Refresh user roles after successful assignment
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users", selectedUser.id, "roles"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      await refetchUserRoles();
    } catch (error) {
      console.error("Error in handleAssignRole:", error);
      // Error handling is done in mutations
    }
  };

  const openAssignRolesDialog = async (user: User) => {
    console.log('Opening assign roles dialog for user:', user);
    setSelectedUser(user);
    setSelectedRoleId("");
    setIsAssignRolesDialogOpen(true);
    // Force refresh of user roles when opening dialog
    await queryClient.invalidateQueries({ queryKey: ["/api/admin/users", user.id, "roles"] });
  };

  // For displaying roles in the table, we need to fetch roles for each user
  // Currently we only fetch roles for the selected user, so we'll show those when available
  const usersWithRoles: UserWithRoles[] = users.map((user) => {
    // Show roles for the selected user, empty array for others (they'll show "-")
    const roles = selectedUser?.id === user.id ? userRoles : [];
    return { ...user, roles };
  });

  if (usersLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          User Role Assignments
        </CardTitle>
        <CardDescription>
          Manage which roles are assigned to each user
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>System Role</TableHead>
              <TableHead>Assigned Roles</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersWithRoles.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.id === selectedUser?.id && userRoles.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {userRoles.map((role) => (
                        <Badge key={role.id} variant="outline">
                          {role.name}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => removeRoleMutation.mutate({ userId: user.id, roleId: role.id })}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  ) : user.id === selectedUser?.id && userRoles.length === 0 ? (
                    <span className="text-muted-foreground">No roles assigned</span>
                  ) : (
                    <span className="text-muted-foreground">Click "Manage Roles" to view</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString()
                    : "Never"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      openAssignRolesDialog(user);
                      // Load current roles for this user
                      queryClient.invalidateQueries({ 
                        queryKey: ["/api/admin/users", user.id, "roles"] 
                      });
                    }}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Manage Roles
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Assign Roles Dialog */}
        <Dialog open={isAssignRolesDialogOpen} onOpenChange={setIsAssignRolesDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Role to {selectedUser?.username}</DialogTitle>
              <DialogDescription>
                Select a role to assign to this user. Each user can only have one role at a time. Users with admin system role have access to all datasets regardless of role assignments.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Role</label>
                <div className="flex flex-wrap gap-1">
                  {userRoles.length > 0 ? (
                    userRoles.map((role) => (
                      <Badge key={role.id} variant="outline">
                        {role.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No roles assigned</span>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Assign New Role</label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role to assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {allRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">{role.name}</span>
                          {role.description && (
                            <span className="text-sm text-muted-foreground">{role.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {allRoles.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No roles available. Create roles first to assign them to users.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignRolesDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAssignRole}
                disabled={assignRoleMutation.isPending || removeRoleMutation.isPending || !selectedRoleId}
              >
                {assignRoleMutation.isPending || removeRoleMutation.isPending
                  ? "Updating..."
                  : "Assign Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}