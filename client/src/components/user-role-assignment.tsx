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
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
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
  const { data: userRoles = [] } = useQuery<Role[]>({
    queryKey: ["/api/admin/users", selectedUser?.id, "roles"],
    enabled: !!selectedUser,
  });

  // Assign role to user mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: number; roleId: number }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/roles`, { roleId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", selectedUser?.id, "roles"] });
    },
    onError: (error: any) => {
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
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}/roles/${roleId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", selectedUser?.id, "roles"] });
      toast({
        title: "Role removed",
        description: "The role has been removed from the user.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing role",
        description: error.message || "Failed to remove role",
        variant: "destructive",
      });
    },
  });

  const handleAssignRoles = async () => {
    if (!selectedUser) return;

    const currentRoleIds = userRoles.map((r) => r.id);
    const toAdd = selectedRoles.filter((id) => !currentRoleIds.includes(id));
    const toRemove = currentRoleIds.filter((id) => !selectedRoles.includes(id));

    try {
      // Add new roles
      for (const roleId of toAdd) {
        await assignRoleMutation.mutateAsync({ userId: selectedUser.id, roleId });
      }

      // Remove deselected roles
      for (const roleId of toRemove) {
        await removeRoleMutation.mutateAsync({ userId: selectedUser.id, roleId });
      }

      setIsAssignRolesDialogOpen(false);
      toast({
        title: "Roles updated",
        description: "User role assignments have been updated successfully.",
      });
    } catch (error) {
      // Error handling is done in mutations
    }
  };

  const openAssignRolesDialog = (user: User) => {
    setSelectedUser(user);
    setIsAssignRolesDialogOpen(true);
  };

  // Merge user roles for display
  const usersWithRoles: UserWithRoles[] = users.map((user) => {
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
                  {user.id === selectedUser?.id ? (
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
                  ) : (
                    <span className="text-muted-foreground">-</span>
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
              <DialogTitle>Assign Roles to {selectedUser?.username}</DialogTitle>
              <DialogDescription>
                Select which roles to assign to this user. Users with admin system role have access to all datasets regardless of role assignments.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-2">
                {allRoles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRoles([...selectedRoles, role.id]);
                        } else {
                          setSelectedRoles(selectedRoles.filter((id) => id !== role.id));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{role.name}</div>
                      {role.description && (
                        <div className="text-sm text-muted-foreground">{role.description}</div>
                      )}
                    </div>
                  </label>
                ))}
                {allRoles.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No roles available. Create roles first to assign them to users.
                  </p>
                )}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignRolesDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAssignRoles}
                disabled={assignRoleMutation.isPending || removeRoleMutation.isPending}
              >
                {assignRoleMutation.isPending || removeRoleMutation.isPending
                  ? "Updating..."
                  : "Save Assignments"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}