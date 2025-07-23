import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Cloud, Edit, Trash2, Play, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface AwsConfig {
  id: number;
  name: string;
  bucketName: string;
  region: string;
  isConnected: boolean;
  lastConnected: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export default function AwsConfiguration() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AwsConfig | null>(null);
  const [deletingConfig, setDeletingConfig] = useState<AwsConfig | null>(null);
  const [newConfig, setNewConfig] = useState({
    name: "",
    bucketName: "",
    region: "us-east-1",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all AWS configurations
  const { data: configs, isLoading } = useQuery({
    queryKey: ['/api/aws-configs'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/aws-configs');
      return res.json();
    },
  });

  // Create configuration mutation
  const createConfigMutation = useMutation({
    mutationFn: async (config: typeof newConfig) => {
      const res = await apiRequest('POST', '/api/aws-configs', config);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration created",
        description: "AWS configuration has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/aws-configs'] });
      setIsCreating(false);
      setNewConfig({ name: "", bucketName: "", region: "us-east-1" });
    },
    onError: (error: any) => {
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create configuration",
        variant: "destructive",
      });
    },
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<AwsConfig> }) => {
      const res = await apiRequest('PUT', `/api/aws-configs/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration updated",
        description: "AWS configuration has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/aws-configs'] });
      setEditingConfig(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update configuration",
        variant: "destructive",
      });
    },
  });

  // Delete configuration mutation
  const deleteConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/aws-configs/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration deleted",
        description: "AWS configuration has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/aws-configs'] });
      setDeletingConfig(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete configuration",
        variant: "destructive",
      });
    },
  });

  // Activate configuration mutation
  const activateConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('POST', `/api/aws-configs/${id}/activate`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration activated",
        description: "AWS configuration is now active and datasets are being refreshed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/aws-configs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/aws-config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Activation failed",
        description: error.message || "Failed to activate configuration",
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (config: { bucketName: string; region: string }) => {
      const res = await apiRequest('POST', '/api/aws-config/test', config);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.connected ? "Connection successful" : "Connection failed",
        description: data.connected 
          ? "Successfully connected to AWS S3 bucket"
          : "Could not connect to the specified S3 bucket",
        variant: data.connected ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test failed",
        description: error.message || "Failed to test connection",
        variant: "destructive",
      });
    },
  });

  const handleCreateConfig = () => {
    createConfigMutation.mutate(newConfig);
  };

  const handleUpdateConfig = (updates: Partial<AwsConfig>) => {
    if (editingConfig) {
      updateConfigMutation.mutate({
        id: editingConfig.id,
        updates,
      });
    }
  };

  const handleDeleteConfig = () => {
    if (deletingConfig) {
      deleteConfigMutation.mutate(deletingConfig.id);
    }
  };

  const handleActivateConfig = (id: number) => {
    activateConfigMutation.mutate(id);
  };

  const handleTestConnection = (config: { bucketName: string; region: string }) => {
    testConnectionMutation.mutate(config);
  };

  const getStatusBadge = (config: AwsConfig) => {
    if (config.isActive) {
      return <Badge variant="default" className="bg-green-500">Active</Badge>;
    }
    if (config.isConnected) {
      return <Badge variant="secondary">Connected</Badge>;
    }
    return <Badge variant="outline">Not Connected</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading configurations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">AWS Configuration</h1>
          <p className="text-muted-foreground">Manage AWS S3 connections and bucket configurations</p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus size={16} />
              <span>Add Configuration</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add AWS Configuration</DialogTitle>
              <DialogDescription>
                Configure a new AWS S3 bucket connection
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Configuration Name</Label>
                <Input
                  id="name"
                  value={newConfig.name}
                  onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                  placeholder="e.g., Production Data Lake"
                />
              </div>
              <div>
                <Label htmlFor="bucketName">S3 Bucket Name</Label>
                <Input
                  id="bucketName"
                  value={newConfig.bucketName}
                  onChange={(e) => setNewConfig({ ...newConfig, bucketName: e.target.value })}
                  placeholder="my-data-bucket"
                />
              </div>
              <div>
                <Label htmlFor="region">AWS Region</Label>
                <Input
                  id="region"
                  value={newConfig.region}
                  onChange={(e) => setNewConfig({ ...newConfig, region: e.target.value })}
                  placeholder="us-east-1"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handleTestConnection({ 
                    bucketName: newConfig.bucketName, 
                    region: newConfig.region 
                  })}
                  disabled={!newConfig.bucketName || !newConfig.region || testConnectionMutation.isPending}
                >
                  {testConnectionMutation.isPending ? "Testing..." : "Test Connection"}
                </Button>
                <Button
                  onClick={handleCreateConfig}
                  disabled={!newConfig.name || !newConfig.bucketName || !newConfig.region || createConfigMutation.isPending}
                >
                  {createConfigMutation.isPending ? "Creating..." : "Create Configuration"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Configurations Table */}
      <Card>
        <CardHeader>
          <CardTitle>AWS S3 Configurations</CardTitle>
          <CardDescription>
            Manage your AWS S3 bucket connections and switch between different data sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configs?.length === 0 ? (
            <div className="text-center py-8">
              <Cloud className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No configurations</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get started by adding your first AWS S3 configuration
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus size={16} className="mr-2" />
                Add Configuration
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Bucket</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Connected</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs?.map((config: AwsConfig) => (
                  <TableRow key={config.id} className={config.isActive ? "bg-primary/5" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <span>{config.name}</span>
                        {config.isActive && (
                          <Badge variant="outline" className="text-xs">Active</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{config.bucketName}</TableCell>
                    <TableCell>{config.region}</TableCell>
                    <TableCell>{getStatusBadge(config)}</TableCell>
                    <TableCell>
                      {config.lastConnected 
                        ? format(new Date(config.lastConnected), 'MMM dd, yyyy HH:mm')
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      {format(new Date(config.createdAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {!config.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivateConfig(config.id)}
                            disabled={activateConfigMutation.isPending}
                          >
                            <Play size={16} />
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingConfig(config)}
                            >
                              <Edit size={16} />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Configuration</DialogTitle>
                              <DialogDescription>
                                Update AWS S3 configuration settings
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="edit-name">Configuration Name</Label>
                                <Input
                                  id="edit-name"
                                  defaultValue={editingConfig?.name}
                                  onChange={(e) => {
                                    if (editingConfig) {
                                      setEditingConfig({ ...editingConfig, name: e.target.value });
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-bucketName">S3 Bucket Name</Label>
                                <Input
                                  id="edit-bucketName"
                                  defaultValue={editingConfig?.bucketName}
                                  onChange={(e) => {
                                    if (editingConfig) {
                                      setEditingConfig({ ...editingConfig, bucketName: e.target.value });
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-region">AWS Region</Label>
                                <Input
                                  id="edit-region"
                                  defaultValue={editingConfig?.region}
                                  onChange={(e) => {
                                    if (editingConfig) {
                                      setEditingConfig({ ...editingConfig, region: e.target.value });
                                    }
                                  }}
                                />
                              </div>
                              <Button
                                onClick={() => handleUpdateConfig({
                                  name: editingConfig?.name || "",
                                  bucketName: editingConfig?.bucketName || "",
                                  region: editingConfig?.region || "",
                                })}
                                disabled={updateConfigMutation.isPending}
                              >
                                {updateConfigMutation.isPending ? "Updating..." : "Update Configuration"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletingConfig(config)}
                              disabled={config.isActive}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="flex items-center space-x-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                <span>Delete Configuration</span>
                              </DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete configuration "{deletingConfig?.name}"? 
                                This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                onClick={() => setDeletingConfig(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={handleDeleteConfig}
                                disabled={deleteConfigMutation.isPending}
                              >
                                {deleteConfigMutation.isPending ? "Deleting..." : "Delete Configuration"}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}