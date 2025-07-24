import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Database, Settings, Cloud, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

import { SearchFilters } from "@/components/search-filters";
import { MainPageActions } from "@/components/main-page-actions";
import { StatsCards } from "@/components/stats-cards";
import { DatasetList } from "@/components/dataset-list";
import { FolderCard } from "@/components/folder-card";
import { SkeletonFolderCard } from "@/components/skeleton-folder-card";
import { ErrorBoundary } from "@/components/error-boundary";
import { usePreloadData } from "@/hooks/use-preload-data";
import type { Dataset, AwsConfig } from "@shared/schema";

interface Stats {
  totalDatasets: number;
  totalSize: string;
  dataSources: number;
  lastUpdated: string;
  lastRefreshTime: string | null;
  totalCommunityDataPoints: number;
}

interface PerformanceOptimizedHomeProps {}

export function PerformanceOptimizedHome() {
  const [searchTerm, setSearchTerm] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Critical data preloading for sub-2-second initial load
  const { data: preloadData, isLoading: preloadLoading, error: preloadError } = usePreloadData();

  // Optimized AWS config query
  const { data: awsConfig } = useQuery<AwsConfig>({
    queryKey: ["/api/aws-config"],
    staleTime: 600000, // 10 minutes cache
  });

  // Smart dataset loading - only load when needed
  const { data: allDatasetsResponse, isLoading: allDatasetsLoading } = useQuery<{
    datasets: Dataset[];
    totalCount: number;
  }>({
    queryKey: ["/api/datasets", "optimized"],
    queryFn: async () => {
      // Use cached data from server for instant loading
      const response = await fetch("/api/datasets?page=1&limit=10000&folder=all");
      return response.json();
    },
    staleTime: 300000, // 5 minutes cache
    enabled: !selectedFolder, // Only load when showing all folders
  });

  // Folder-specific datasets (lazy loaded)
  const { data: folderDatasetsResponse } = useQuery<{
    datasets: Dataset[];
    totalCount: number;
  }>({
    queryKey: ["/api/datasets", "folder", selectedFolder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "10000",
        folder: selectedFolder || "all",
      });
      const response = await fetch(`/api/datasets?${params}`);
      return response.json();
    },
    enabled: !!selectedFolder,
    staleTime: 300000, // 5 minutes cache
  });

  // Use preloaded data for instant UI rendering
  const stats = useMemo(() => preloadData?.stats, [preloadData]);
  const folders = useMemo(() => preloadData?.folders || [], [preloadData]);

  // Smart dataset selection based on view
  const datasets = useMemo(() => {
    if (selectedFolder) {
      return folderDatasetsResponse?.datasets || [];
    }
    return allDatasetsResponse?.datasets || [];
  }, [selectedFolder, folderDatasetsResponse, allDatasetsResponse]);

  const allDatasets = useMemo(() => 
    allDatasetsResponse?.datasets || [], 
    [allDatasetsResponse]
  );

  // Optimized folder with dataset counts
  const foldersWithDatasets = useMemo(() => {
    if (!folders.length || !allDatasets.length) return [];
    
    return folders.map(folder => {
      const count = allDatasets.filter(d => d.topLevelFolder === folder).length;
      return { folder, count };
    }).filter(item => item.count > 0);
  }, [folders, allDatasets]);

  // Optimized refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/datasets/refresh", { method: "POST" });
      if (response.ok) {
        // Force cache refresh
        window.location.reload();
      }
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Loading state management
  const isInitialLoading = preloadLoading || (!stats && !preloadError);
  const isDatasetsLoading = !selectedFolder ? allDatasetsLoading : false;

  if (preloadError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Failed to Load Data</h2>
          <p className="text-gray-600 mb-4">Unable to connect to the data lake.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            {selectedFolder && (
              <Button
                variant="ghost"
                onClick={() => setSelectedFolder(null)}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Folders</span>
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold">
                {selectedFolder ? `${selectedFolder} Datasets` : "Data Lake Explorer"}
              </h1>
              <p className="text-muted-foreground">
                {selectedFolder
                  ? `Browse datasets in the ${selectedFolder} collection`
                  : "Browse and explore datasets from your AWS S3 data lake"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <MainPageActions
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              awsConnected={!!awsConfig?.isConnected}
            />
          </div>
        </div>

        {/* Statistics Cards */}
        <ErrorBoundary>
          <StatsCards
            stats={stats}
            selectedFolder={selectedFolder}
            allDatasets={allDatasets}
            isLoading={isInitialLoading}
          />
        </ErrorBoundary>

        {/* Main Content */}
        {!selectedFolder ? (
          // Folder Grid View
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Data Sources</h2>
              <p className="text-muted-foreground">
                {folders.length} data sources available
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {isInitialLoading ? (
                // Loading skeleton
                Array.from({ length: 12 }).map((_, index) => (
                  <SkeletonFolderCard key={index} className={`stagger-${index % 12}`} />
                ))
              ) : (
                foldersWithDatasets.map((folderData, index) => (
                  <FolderCard
                    key={folderData.folder}
                    folderName={folderData.folder}
                    datasetCount={folderData.count}
                    onClick={() => setSelectedFolder(folderData.folder)}
                    className={`stagger-${index % 12}`}
                  />
                ))
              )}
            </div>
          </div>
        ) : (
          // Dataset List View
          <div className="mt-8 space-y-6">
            <SearchFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              formatFilter={formatFilter}
              onFormatChange={setFormatFilter}
              selectedFolder={selectedFolder}
            />

            <ErrorBoundary>
              <DatasetList
                datasets={datasets}
                isLoading={isDatasetsLoading}
                searchTerm={searchTerm}
                formatFilter={formatFilter}
                selectedDatasetId={selectedDatasetId}
                onSelectDataset={setSelectedDatasetId}
              />
            </ErrorBoundary>
          </div>
        )}
      </div>
    </div>
  );
}

export default PerformanceOptimizedHome;