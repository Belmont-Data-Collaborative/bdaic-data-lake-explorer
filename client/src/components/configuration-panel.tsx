import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings, ChevronDown, Check, Info, Plug, Plus, Trash2, Edit3, Database, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AwsConfig } from "@shared/schema";

interface ConfigurationPanelProps {
  onRefreshStateChange?: (isRefreshing: boolean) => void;
}

export function ConfigurationPanel({ onRefreshStateChange }: ConfigurationPanelProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [bucketName, setBucketName] = useState("");
  const [region, setRegion] = useState("us-west-2");
  const [configName, setConfigName] = useState("Default");
  const [isNewConfigDialogOpen, setIsNewConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AwsConfig | null>(null);
  const { toast } = useToast();

  const { data: awsConfig, isLoading } = useQuery<AwsConfig>({
    queryKey: ["/api/aws-config"],
  });

  const { data: allConfigs = [] } = useQuery<AwsConfig[]>({
    queryKey: ["/api/aws-configs"],
  });

  useEffect(() => {
    if (awsConfig) {
      setBucketName(awsConfig.bucketName);
      setRegion(awsConfig.region);
      setConfigName(awsConfig.name || "Default");
    }
  }, [awsConfig]);

  const saveConfigMutation = useMutation({
    mutationFn: async (config: { bucketName: string; region: string; name?: string }) => {
      const response = await apiRequest("POST", "/api/aws-config", config);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aws-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aws-configs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Configuration saved",
        description: "AWS S3 configuration has been updated successfully. Datasets will refresh automatically.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving configuration",
        description: error.message || "Failed to save AWS configuration",
        variant: "destructive",
      });
    },
  });

  const createConfigMutation = useMutation({
    mutationFn: async (config: { bucketName: string; region: string; name: string }) => {
      const response = await apiRequest("POST", "/api/aws-configs", config);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aws-configs"] });
      setIsNewConfigDialogOpen(false);
      setBucketName("");
      setRegion("us-west-2");
      setConfigName("Default");
      toast({
        title: "Configuration created",
        description: "New AWS S3 configuration has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating configuration",
        description: error.message || "Failed to create AWS configuration",
        variant: "destructive",
      });
    },
  });

  const activateConfigMutation = useMutation({
    mutationFn: async (configId: number) => {
      onRefreshStateChange?.(true);
      const response = await apiRequest("POST", `/api/aws-configs/${configId}/activate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aws-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aws-configs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Configuration activated",
        description: "AWS S3 configuration has been activated successfully.",
      });
      onRefreshStateChange?.(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error activating configuration",
        description: error.message || "Failed to activate AWS configuration",
        variant: "destructive",
      });
      onRefreshStateChange?.(false);
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: async (configId: number) => {
      const response = await apiRequest("DELETE", `/api/aws-configs/${configId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aws-configs"] });
      toast({
        title: "Configuration deleted",
        description: "AWS S3 configuration has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting configuration",
        description: error.message || "Failed to delete AWS configuration",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/aws-config/test", {
        bucketName,
        region,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.connected) {
        toast({
          title: "Connection successful",
          description: "Successfully connected to AWS S3 bucket.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/aws-config"] });
      } else {
        toast({
          title: "Connection failed",
          description: "Unable to connect to the S3 bucket. Please check your configuration.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to test AWS connection",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!bucketName.trim()) {
      toast({
        title: "Validation error",
        description: "Bucket name is required.",
        variant: "destructive",
      });
      return;
    }
    saveConfigMutation.mutate({ bucketName: bucketName.trim(), region });
  };

  const handleTestConnection = () => {
    if (!bucketName.trim()) {
      toast({
        title: "Validation error", 
        description: "Please enter a bucket name first.",
        variant: "destructive",
      });
      return;
    }
    testConnectionMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors">
          <div className="flex items-center space-x-3">
            <Settings className="text-primary-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">AWS Configuration</h2>
            <Badge variant={awsConfig?.isConnected ? "default" : "secondary"}>
              {awsConfig?.isConnected ? "Connected" : "Not Connected"}
            </Badge>
          </div>
          <ChevronDown 
            className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} 
            size={20} 
          />
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-6 py-6 space-y-6">
            {/* Saved Configurations Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Database className="text-gray-600" size={18} />
                  <h3 className="font-medium text-gray-900">Saved Configurations</h3>
                  <Badge variant="outline" className="text-xs">
                    {allConfigs.length} saved
                  </Badge>
                </div>
                <Dialog open={isNewConfigDialogOpen} onOpenChange={setIsNewConfigDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center space-x-1">
                      <Plus size={14} />
                      <span>New Config</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Configuration</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor="new-config-name">Configuration Name</Label>
                        <Input
                          id="new-config-name"
                          value={configName}
                          onChange={(e) => setConfigName(e.target.value)}
                          placeholder="e.g., Production, Development"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-bucket-name">S3 Bucket Name</Label>
                        <Input
                          id="new-bucket-name"
                          value={bucketName}
                          onChange={(e) => setBucketName(e.target.value)}
                          placeholder="my-bucket-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-region">AWS Region</Label>
                        <Select value={region} onValueChange={setRegion}>
                          <SelectTrigger id="new-region">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                            <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                            <SelectItem value="us-west-1">US West (N. California)</SelectItem>
                            <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                            <SelectItem value="eu-central-1">Europe (Frankfurt)</SelectItem>
                            <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                            <SelectItem value="ap-northeast-1">Asia Pacific (Tokyo)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex space-x-2 pt-4">
                        <Button 
                          onClick={() => createConfigMutation.mutate({ 
                            name: configName, 
                            bucketName, 
                            region 
                          })}
                          disabled={createConfigMutation.isPending || !configName.trim() || !bucketName.trim()}
                          className="flex-1"
                        >
                          {createConfigMutation.isPending ? "Creating..." : "Create Configuration"}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsNewConfigDialogOpen(false)}
                          disabled={createConfigMutation.isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="space-y-2">
                {allConfigs.map((config) => {
                  const isActive = Boolean(config.isActive);
                  return (
                    <div
                      key={config.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
                        isActive 
                          ? "bg-blue-50 border-blue-200 shadow-sm" 
                          : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          isActive ? "bg-blue-500" : "bg-gray-300"
                        }`} />
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium ${
                              isActive ? "text-blue-900" : "text-gray-900"
                            }`}>
                              {config.name}
                            </span>
                            {isActive && (
                              <Badge variant="default" className="text-xs bg-blue-500">
                                Active
                              </Badge>
                            )}
                            {config.isConnected && (
                              <Check className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {config.bucketName} • {config.region}
                          </div>
                          {config.lastConnected && (
                            <div className="text-xs text-gray-500">
                              Last used: {new Date(config.lastConnected).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            if (!isActive) {
                              activateConfigMutation.mutate(config.id);
                            }
                          }}
                          disabled={activateConfigMutation.isPending || isActive}
                          className={isActive ? "cursor-default" : ""}
                        >
                          {isActive ? "Active" : "Use This"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteConfigMutation.mutate(config.id)}
                          disabled={deleteConfigMutation.isPending || isActive}
                          className="text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                  </div>
                  );
                })}
                {allConfigs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Database className="mx-auto mb-2" size={24} />
                    <p>No saved configurations</p>
                    <p className="text-sm">Create your first configuration to get started</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Current Configuration Editor */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <Edit3 className="text-gray-600" size={18} />
                <span>Current Configuration</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                <Label htmlFor="bucketName" className="text-sm font-medium text-gray-700 mb-2">
                  S3 Bucket Name
                </Label>
                <div className="relative">
                  <Input
                    id="bucketName"
                    type="text"
                    placeholder="my-data-lake-bucket"
                    value={bucketName}
                    onChange={(e) => setBucketName(e.target.value)}
                    className="pr-10"
                  />
                  {awsConfig?.isConnected && (
                    <Check className="absolute right-3 top-3 text-green-500" size={16} />
                  )}
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2">
                  AWS Region
                </Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                    <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                    <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                    <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Info className="text-blue-500" size={16} />
                <span>
                  {awsConfig?.lastConnected 
                    ? `Last connected: ${new Date(awsConfig.lastConnected).toLocaleString()}`
                    : "Never connected"
                  }
                </span>
              </div>
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={handleSave}
                  disabled={saveConfigMutation.isPending}
                >
                  {saveConfigMutation.isPending ? "Saving..." : "Save Config"}
                </Button>
                <Button 
                  onClick={handleTestConnection}
                  disabled={testConnectionMutation.isPending}
                >
                  {testConnectionMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Testing...
                    </>
                  ) : (
                    <>
                      <Plug className="mr-2" size={16} />
                      Test Connection
                    </>
                  )}
                </Button>
              </div>
            </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
