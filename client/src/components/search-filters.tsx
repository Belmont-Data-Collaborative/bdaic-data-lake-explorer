import { useMutation } from "@tanstack/react-query";
import { Search, RefreshCw, Brain } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DatasetSearch } from "./dataset-search";

interface SearchFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  formatFilter: string;
  onFormatChange: (value: string) => void;
  folders: string[];
  onRefresh: () => void;
  onSelectDataset?: (datasetId: number) => void;
  isRefreshing?: boolean;
  showFolderFilter?: boolean;
}

export function SearchFilters({
  searchTerm,
  onSearchChange,
  formatFilter,
  onFormatChange,
  folders,
  onRefresh,
  onSelectDataset,
  isRefreshing = false,
  showFolderFilter = false,
}: SearchFiltersProps) {
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={16} />
          <Input
            type="text"
            placeholder="Search datasets..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex space-x-3">
          <Select value={formatFilter} onValueChange={onFormatChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Formats</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="parquet">Parquet</SelectItem>
              <SelectItem value="avro">Avro</SelectItem>
            </SelectContent>
          </Select>
          
          {showFolderFilter && (
            <Select value="all" onValueChange={() => {}}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Folders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Folders</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder} value={folder}>
                    {folder.replace(/_/g, " ").toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <DatasetSearch onSelectDataset={onSelectDataset} />
          
          <Button
            variant="secondary"
            onClick={() => generateInsightsMutation.mutate()}
            disabled={generateInsightsMutation.isPending}
            className="bg-accent-500 hover:bg-accent-600 text-white"
          >
            {generateInsightsMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Brain className="mr-2" size={16} />
                AI Insights
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => refreshDatasetsMutation.mutate()}
            disabled={refreshDatasetsMutation.isPending || isRefreshing}
          >
            {(refreshDatasetsMutation.isPending || isRefreshing) ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                {isRefreshing ? "Auto-refreshing..." : "Refreshing..."}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2" size={16} />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
