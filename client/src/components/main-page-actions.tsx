import { useMutation } from "@tanstack/react-query";
import { RefreshCw, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DatasetSearch } from "./dataset-search";

interface MainPageActionsProps {
  folders: string[];
  onRefresh: () => void;
  onSelectDataset?: (datasetId: number) => void;
  isRefreshing?: boolean;
}

export function MainPageActions({
  folders,
  onRefresh,
  onSelectDataset,
  isRefreshing = false,
}: MainPageActionsProps) {
  const { toast } = useToast();

  const refreshDatasetsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/datasets/refresh");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Datasets refreshed",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folders/community-data-points"] });
      onRefresh();
    },
    onError: (error: any) => {
      toast({
        title: "Error refreshing datasets",
        description: error.message || "Failed to refresh datasets from S3",
        variant: "destructive",
      });
    },
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/datasets/bulk-insights");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "AI insights generated",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error generating insights",
        description: error.message || "Failed to generate AI insights",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        {/* Find Dataset component */}
        <div className="flex-1">
          <DatasetSearch onSelectDataset={onSelectDataset} />
        </div>
        
        {/* Action buttons */}
        <div className="flex space-x-3">
          <Button
            variant="outline"
            size="default"
            onClick={() => generateInsightsMutation.mutate()}
            disabled={generateInsightsMutation.isPending}
            className="flex items-center space-x-2"
          >
            <Brain className="text-purple-600" size={16} />
            <span>
              {generateInsightsMutation.isPending
                ? "Generating..."
                : "AI Insights"}
            </span>
          </Button>
          
          <Button
            variant="outline"
            size="default"
            onClick={() => refreshDatasetsMutation.mutate()}
            disabled={refreshDatasetsMutation.isPending || isRefreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw
              className={`text-blue-600 ${
                refreshDatasetsMutation.isPending || isRefreshing
                  ? "animate-spin"
                  : ""
              }`}
              size={16}
            />
            <span>
              {refreshDatasetsMutation.isPending || isRefreshing
                ? "Refreshing..."
                : "Refresh"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}