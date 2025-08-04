import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Plus, Pencil, Trash2, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Role {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Dataset {
  id: number;
  name: string;
  source: string;
  format: string;
}

export function RoleManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAssignDatasetsDialogOpen, setIsAssignDatasetsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const [selectedDatasets, setSelectedDatasets] = useState<number[]>([]);
  const { toast } = useToast();

  // Fetch all roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/admin/roles"],
  });

  // Fetch all datasets for assignment
  const { data: allDatasets = [] } = useQuery<Dataset[]>({
    queryKey: ["/api/datasets/all"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/datasets?limit=10000");
      const data = await response.json();
      return data.datasets || [];
    },
  });

  // Fetch datasets for a specific role
  const { data: roleDatasets = [] } = useQuery<Dataset[]>({
    queryKey: ["/api/admin/roles", selectedRole?.id, "datasets"],
    enabled: !!selectedRole,
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const response = await apiRequest("POST", "/api/admin/roles", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      setIsCreateDialogOpen(false);
      setNewRole({ name: "", description: "" });
      toast({
        title: "Role created",
        description: "The role has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating role",
        description: error.message || "Failed to create role",
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; description: string } }) => {
      const response = await apiRequest("PUT", `/api/admin/roles/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Role updated",
        description: "The role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating role",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/roles/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
      toast({
        title: "Role deleted",
        description: "The role has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting role",
        description: error.message || "Failed to delete role",
        variant: "destructive",
      });
    },
  });

  // Assign dataset to role mutation
  const assignDatasetMutation = useMutation({
    mutationFn: async ({ roleId, datasetId }: { roleId: number; datasetId: number }) => {
      const response = await apiRequest("POST", `/api/admin/roles/${roleId}/datasets`, { datasetId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles", selectedRole?.id, "datasets"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error assigning dataset",
        description: error.message || "Failed to assign dataset",
        variant: "destructive",
      });
    },
  });

  // Remove dataset from role mutation
  const removeDatasetMutation = useMutation({
    mutationFn: async ({ roleId, datasetId }: { roleId: number; datasetId: number }) => {
      const response = await apiRequest("DELETE", `/api/admin/roles/${roleId}/datasets/${datasetId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles", selectedRole?.id, "datasets"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing dataset",
        description: error.message || "Failed to remove dataset",
        variant: "destructive",
      });
    },
  });

  const handleCreateRole = () => {
    if (!newRole.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a role name",
        variant: "destructive",
      });
      return;
    }
    createRoleMutation.mutate(newRole);
  };

  const handleUpdateRole = () => {
    if (!selectedRole || !newRole.name.trim()) return;
    updateRoleMutation.mutate({
      id: selectedRole.id,
      data: newRole,
    });
  };

  const handleDeleteRole = () => {
    if (!selectedRole) return;
    deleteRoleMutation.mutate(selectedRole.id);
  };

  const handleAssignDatasets = async () => {
    if (!selectedRole) return;

    const currentDatasetIds = roleDatasets.map((d) => d.id);
    const toAdd = selectedDatasets.filter((id) => !currentDatasetIds.includes(id));
    const toRemove = currentDatasetIds.filter((id) => !selectedDatasets.includes(id));

    try {
      // Add new datasets
      for (const datasetId of toAdd) {
        await assignDatasetMutation.mutateAsync({ roleId: selectedRole.id, datasetId });
      }

      // Remove deselected datasets
      for (const datasetId of toRemove) {
        await removeDatasetMutation.mutateAsync({ roleId: selectedRole.id, datasetId });
      }

      setIsAssignDatasetsDialogOpen(false);
      toast({
        title: "Datasets updated",
        description: "Role dataset assignments have been updated successfully.",
      });
    } catch (error) {
      // Error handling is done in mutations
    }
  };

  if (rolesLoading) {
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Management
            </CardTitle>
            <CardDescription>
              Create and manage roles to control dataset access
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>
                  Create a new role to organize dataset access permissions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role-name">Role Name</Label>
                  <Input
                    id="role-name"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    placeholder="e.g., Research Team"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-description">Description</Label>
                  <Textarea
                    id="role-description"
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                    placeholder="Describe the purpose of this role..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRole} disabled={createRoleMutation.isPending}>
                  {createRoleMutation.isPending ? "Creating..." : "Create Role"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No roles created yet
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="max-w-md truncate">
                    {role.description || "No description"}
                  </TableCell>
                  <TableCell>{new Date(role.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRole(role);
                          const currentDatasetIds = roleDatasets.map((d) => d.id);
                          setSelectedDatasets(currentDatasetIds);
                          setIsAssignDatasetsDialogOpen(true);
                        }}
                      >
                        <Database className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRole(role);
                          setNewRole({ name: role.name, description: role.description || "" });
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRole(role);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Edit Role Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription>
                Update the role information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role-name">Role Name</Label>
                <Input
                  id="edit-role-name"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role-description">Description</Label>
                <Textarea
                  id="edit-role-description"
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRole} disabled={updateRoleMutation.isPending}>
                {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Role Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Role</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the role "{selectedRole?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteRole}
                disabled={deleteRoleMutation.isPending}
              >
                {deleteRoleMutation.isPending ? "Deleting..." : "Delete Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Datasets Dialog */}
        <Dialog open={isAssignDatasetsDialogOpen} onOpenChange={setIsAssignDatasetsDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Assign Datasets to {selectedRole?.name}</DialogTitle>
              <DialogDescription>
                Select which datasets users with this role can access
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-96 pr-4">
              <div className="space-y-2">
                {allDatasets.map((dataset) => (
                  <label
                    key={dataset.id}
                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDatasets.includes(dataset.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDatasets([...selectedDatasets, dataset.id]);
                        } else {
                          setSelectedDatasets(selectedDatasets.filter((id) => id !== dataset.id));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{dataset.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {dataset.source} • {dataset.format}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignDatasetsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAssignDatasets}
                disabled={assignDatasetMutation.isPending || removeDatasetMutation.isPending}
              >
                {assignDatasetMutation.isPending || removeDatasetMutation.isPending
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