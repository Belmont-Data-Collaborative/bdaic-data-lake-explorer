import { Search, RefreshCw, Brain } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatasetSearch } from "./dataset-search";
import { useDatasetRefresh, useGenerateInsights } from "@/hooks/use-api-mutations";
import { ErrorBoundaryWrapper } from "./error-boundary-wrapper";

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
  const refreshDatasetsMutation = useDatasetRefresh();
  const generateInsightsMutation = useGenerateInsights();

  const handleRefresh = () => {
    refreshDatasetsMutation.mutate();
    onRefresh();
  };

  return (
    <ErrorBoundaryWrapper level="component" componentName="SearchFilters">
      <section className="flex flex-col space-y-4 mb-8" role="search" aria-label="Dataset search and filters">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="relative flex-1">
            <Search 
              className="absolute left-3 top-2.5 text-muted-foreground" 
              size={20} 
              aria-hidden="true"
            />
            <Input
              type="text"
              placeholder="Search datasets..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 touch-target"
              aria-label="Search datasets by name, source, or description"
            />
          </div>

          <div className="flex items-center space-x-4" role="group" aria-label="Filter options">
            <Select value={formatFilter} onValueChange={onFormatChange}>
              <SelectTrigger className="w-48 touch-target" aria-label="Filter by file format">
                <SelectValue placeholder="All Formats" />
              </SelectTrigger>
              <SelectContent role="listbox">
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="parquet">Parquet</SelectItem>
                <SelectItem value="avro">Avro</SelectItem>
              </SelectContent>
            </Select>
            
            {showFolderFilter && (
              <Select value="all" onValueChange={() => {}}>
                <SelectTrigger className="w-48 touch-target" aria-label="Filter by folder">
                  <SelectValue placeholder="All Folders" />
                </SelectTrigger>
                <SelectContent role="listbox">
                  <SelectItem value="all">All Folders</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder} value={folder}>
                      {folder.replace(/_/g, " ").toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {onSelectDataset && <DatasetSearch onSelectDataset={onSelectDataset} />}
            
            <Button
              variant="secondary"
              onClick={() => generateInsightsMutation.mutate()}
              disabled={generateInsightsMutation.isPending}
              className="bg-accent-500 hover:bg-accent-600 text-white touch-target"
              aria-label="Generate AI insights for all datasets"
            >
              {generateInsightsMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" aria-hidden="true"></div>
                  <span>Generating...</span>
                  <span className="sr-only">Generating AI insights for all datasets</span>
                </>
              ) : (
                <>
                  <Brain className="mr-2" size={16} aria-hidden="true" />
                  <span>AI Insights</span>
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshDatasetsMutation.isPending || isRefreshing}
              className="touch-target"
              aria-label="Refresh datasets from AWS S3"
            >
              {(refreshDatasetsMutation.isPending || isRefreshing) ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground mr-2" aria-hidden="true"></div>
                  <span>{isRefreshing ? "Auto-refreshing..." : "Refreshing..."}</span>
                  <span className="sr-only">Refreshing datasets from AWS S3</span>
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2" size={16} aria-hidden="true" />
                  <span>Refresh</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </section>
    </ErrorBoundaryWrapper>
  );
}