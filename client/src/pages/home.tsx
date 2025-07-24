import { useState, useMemo } from "react";
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
import { usePerformanceMonitor } from "@/hooks/use-performance-monitor";
import type { Dataset, AwsConfig } from "@shared/schema";

interface Stats {
  totalDatasets: number;
  totalSize: string;
  dataSources: number;
  lastUpdated: string;
  lastRefreshTime: string | null;
  totalCommunityDataPoints?: number;
}

interface HomeProps {}

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(
    null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Monitor performance for optimization insights
  const performanceMetrics = usePerformanceMonitor();

  // Remove preload data reference for now - using direct queries

  const { data: awsConfig } = useQuery<AwsConfig>({
    queryKey: ["/api/aws-config"],
    staleTime: 300000, // 5 minutes
  });

  // Query for all datasets (used for folder cards and when no folder selected)
  const {
    data: allDatasetsResponse,
    isLoading: allDatasetsLoading,
    refetch: refetchAllDatasets,
  } = useQuery<{
    datasets: Dataset[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: ["/api/datasets", "all"],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "10000", // Load all datasets
        folder: "all",
      });
      console.log("All datasets query URL:", `/api/datasets?${params}`);
      const response = await fetch(`/api/datasets?${params}`);
      return response.json();
    },
    staleTime: 60000, // 1 minute cache
    gcTime: 300000, // 5 minutes garbage collection
  });

  // Query for filtered datasets (when folder is selected)
  const {
    data: filteredDatasetsResponse,
    isLoading: filteredDatasetsLoading,
    refetch: refetchFilteredDatasets,
  } = useQuery<{
    datasets: Dataset[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: [
      "/api/datasets",
      "filtered",
      selectedFolder,
      searchTerm,
      formatFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "10000",
        folder: selectedFolder || "all",
        ...(selectedFolder && searchTerm && { search: searchTerm }),
        ...(selectedFolder && formatFilter !== "all" && { format: formatFilter }),
      });
      const response = await fetch(`/api/datasets?${params}`);
      return response.json();
    },
    enabled: !!selectedFolder, // Only run when folder is selected
    staleTime: 0, // No caching for folder queries
    gcTime: 0, // No caching for folder queries
  });

  // Use filtered data when folder is selected, otherwise use all data
  const datasetsResponse = selectedFolder
    ? filteredDatasetsResponse
    : allDatasetsResponse;
  const datasetsLoading = selectedFolder
    ? filteredDatasetsLoading
    : allDatasetsLoading;
  const datasets = datasetsResponse?.datasets || [];

  // Always use all datasets for folder cards
  const allDatasets = allDatasetsResponse?.datasets || [];

  const refetchDatasets = () => {
    refetchAllDatasets();
    if (selectedFolder) {
      refetchFilteredDatasets();
    }
  };

  // Use direct API queries with enhanced caching for maximum performance
  const { data: globalStats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    staleTime: 1800000, // 30 minutes cache
    gcTime: 3600000, // 1 hour garbage collection
  });

  const { data: quickStats } = useQuery<{
    totalCount: number;
    folders: string[];  
    lastUpdated: string;
  }>({
    queryKey: ["/api/datasets/quick-stats"],
    staleTime: 300000, // 5 minutes cache
    gcTime: 600000, // 10 minutes garbage collection
  });

  const { data: folders = [] } = useQuery<string[]>({
    queryKey: ["/api/folders"],
    staleTime: 3600000, // 1 hour cache
    gcTime: 7200000, // 2 hours garbage collection
  });

  // Debug logging
  console.log("Folders from API:", folders);
  console.log("All datasets count:", allDatasets.length);
  console.log(
    "Folders with datasets:",
    folders.map((folder) => ({
      folder,
      count: allDatasets.filter((d) => d.topLevelFolder === folder).length,
    })),
  );

  const { data: folderDataPoints = [] } = useQuery<
    Array<{ folder_label: string; total_community_data_points: number }>
  >({
    queryKey: ["/api/folders/community-data-points"],
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });

  // Group datasets by folder for folder cards and stats
  const datasetsByFolder = allDatasets.reduce(
    (acc, dataset) => {
      const folder = dataset.topLevelFolder || "uncategorized";
      if (!acc[folder]) acc[folder] = [];
      acc[folder].push(dataset);
      return acc;
    },
    {} as Record<string, Dataset[]>,
  );

  // Helper function to extract unique data sources from datasets
  const extractDataSources = (datasets: Dataset[]): Set<string> => {
    const sources = new Set<string>();

    for (const dataset of datasets) {
      if (dataset.metadata && (dataset.metadata as any).dataSource) {
        // Split by comma and clean up each source
        const dataSources = (dataset.metadata as any).dataSource
          .split(",")
          .map((source: string) => source.trim())
          .filter((source: string) => source.length > 0);

        dataSources.forEach((source: string) => sources.add(source));
      }
    }

    return sources;
  };

  // Calculate stats based on current selection (folder or global)
  const calculateStats = (datasetsToCalculate: Dataset[]): Stats => {
    const totalDatasets = datasetsToCalculate.length;
    const totalSizeBytes = datasetsToCalculate.reduce(
      (total, dataset) => total + (dataset.sizeBytes || 0),
      0,
    );

    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    const uniqueDataSources = extractDataSources(datasetsToCalculate);

    // Calculate community data points for the filtered datasets
    const totalCommunityDataPoints = datasetsToCalculate
      .filter(
        (d) =>
          d.metadata &&
          (d.metadata as any).recordCount &&
          (d.metadata as any).columnCount &&
          (d.metadata as any).completenessScore,
      )
      .reduce((total, d) => {
        const recordCount = parseInt((d.metadata as any).recordCount);
        const columnCount = (d.metadata as any).columnCount;
        const completenessScore = (d.metadata as any).completenessScore / 100.0;
        return total + recordCount * columnCount * completenessScore;
      }, 0);

    return {
      totalDatasets,
      totalSize: formatFileSize(totalSizeBytes),
      dataSources: uniqueDataSources.size,
      lastUpdated: globalStats?.lastUpdated || "Never",
      lastRefreshTime: globalStats?.lastRefreshTime || null,
      totalCommunityDataPoints: Math.round(totalCommunityDataPoints),
    };
  };

  // Get proper stats for folder view
  const stats = selectedFolder
    ? (() => {
        // For folder view, calculate stats based on the selected folder's datasets only
        const folderDatasets = datasetsByFolder[selectedFolder] || [];
        if (folderDatasets.length === 0 && datasetsLoading) {
          // If data is still loading, show loading state
          return {
            totalDatasets: 0,
            totalSize: "Loading...",
            dataSources: 0,
            lastUpdated: globalStats?.lastUpdated || "Never",
            lastRefreshTime: globalStats?.lastRefreshTime || null,
            totalCommunityDataPoints: 0,
          };
        }

        // If we have folder datasets from allDatasets, use those for accurate stats
        if (folderDatasets.length > 0) {
          return calculateStats(folderDatasets);
        }

        // Fallback: use server response count but calculate other stats from available data
        return {
          totalDatasets: datasetsResponse?.totalCount || 0,
          totalSize: "Calculating...",
          dataSources: 0,
          lastUpdated: globalStats?.lastUpdated || "Never",
          lastRefreshTime: globalStats?.lastRefreshTime || null,
          totalCommunityDataPoints: 0,
        };
      })()
    : globalStats;

  // Datasets are already filtered by the server query based on selectedFolder
  const filteredDatasets = datasets;

  const handleSelectDataset = (datasetId: number) => {
    // Find the dataset by ID
    const dataset = datasets.find((d) => d.id === datasetId);
    if (!dataset) {
      console.error("Dataset not found:", datasetId);
      return;
    }

    // Get the folder for this dataset
    const datasetFolder = dataset.topLevelFolder;

    // If we're not in the correct folder, navigate to it first
    if (datasetFolder && selectedFolder !== datasetFolder) {
      setSelectedFolder(datasetFolder);
      // Wait for the folder to load, then scroll to the dataset
      setSelectedDatasetId(datasetId);
      setTimeout(() => {
        scrollToDataset(datasetId);
      }, 300); // Give time for the folder view to render
    } else {
      // We're already in the correct folder or global view, scroll immediately
      setSelectedDatasetId(datasetId);
      setTimeout(() => {
        scrollToDataset(datasetId);
      }, 200);
    }
  };

  const scrollToDataset = (datasetId: number) => {
    const element = document.getElementById(`dataset-${datasetId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Add a temporary highlight effect
      element.classList.add(
        "ring-2",
        "ring-blue-500",
        "ring-opacity-75",
        "bg-blue-50",
      );
      setTimeout(() => {
        element.classList.remove(
          "ring-2",
          "ring-blue-500",
          "ring-opacity-75",
          "bg-blue-50",
        );
        // Clear the selection after highlighting
        setSelectedDatasetId(null);
      }, 4000);
    }
  };

  const handleFolderSelect = (folderName: string) => {
    console.log("Selecting folder:", folderName);
    setSelectedFolder(folderName);
  };

  // Filter folders to only show those with datasets
  const foldersWithDatasets = folders.filter(folder => {
    const datasetCount = allDatasets.filter(d => d.topLevelFolder === folder).length;
    return datasetCount > 0;
  });

  // Show all folders with datasets (no pagination)
  const paginatedFolders = foldersWithDatasets;
  
  // Additional debug logging for filtered folders
  console.log("Folders after filtering:", foldersWithDatasets);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="relative">
          {selectedFolder && (
            <div className="absolute -top-2 left-4 z-10">
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                {selectedFolder.replace(/_/g, " ").toUpperCase()} ONLY
              </div>
            </div>
          )}
          <ErrorBoundary>
            <StatsCards stats={stats} />
          </ErrorBoundary>
        </div>

        {selectedFolder ? (
          <>
            {/* Folder Navigation */}
            <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFolder(null)}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Folders</span>
                  </Button>
                  <div className="h-6 w-px bg-border" />
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedFolder.replace(/_/g, " ").toUpperCase()} Datasets
                  </h2>
                </div>
              </div>
              <SearchFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                formatFilter={formatFilter}
                onFormatChange={setFormatFilter}
                folders={folders}
                onRefresh={() => {
                  refetchDatasets();
                  setIsRefreshing(false);
                }}
                onSelectDataset={handleSelectDataset}
                isRefreshing={isRefreshing}
                showFolderFilter={false}
              />
            </div>

            {/* Dataset List */}
            <div className="space-y-4 relative">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">
                  Datasets
                </h2>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  {isRefreshing && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Auto-refreshing...</span>
                    </div>
                  )}
                  <span>
                    ({filteredDatasets.length}{" "}
                    {selectedFolder ? "folder" : "total"} datasets)
                  </span>
                </div>
              </div>

              {isRefreshing && (
                <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center z-10">
                  <div className="bg-white rounded-lg shadow-lg p-6 flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-gray-700">
                      Refreshing datasets from S3...
                    </span>
                  </div>
                </div>
              )}

              <ErrorBoundary>
                <DatasetList
                  datasets={filteredDatasets}
                  isLoading={datasetsLoading || isRefreshing}
                  selectedDatasetId={selectedDatasetId}
                  showPagination={false}
                />
              </ErrorBoundary>
            </div>
          </>
        ) : (
          <>
            {/* Main Page Actions */}
            <MainPageActions
              folders={folders}
              onRefresh={() => {
                refetchAllDatasets();
                setIsRefreshing(false);
              }}
              onSelectDataset={handleSelectDataset}
              isRefreshing={isRefreshing}
            />

            {/* Folder Cards */}
            <div className="space-y-4 relative">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Data Sources
                </h2>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  {isRefreshing && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Auto-refreshing...</span>
                    </div>
                  )}
                  <span>{foldersWithDatasets.length}</span>
                  <span>folders</span>
                </div>
              </div>

              {isRefreshing && (
                <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center z-10">
                  <div className="bg-white rounded-lg shadow-lg p-6 flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-gray-700">
                      Refreshing datasets from S3...
                    </span>
                  </div>
                </div>
              )}

              <ErrorBoundary>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allDatasetsLoading ? (
                    // Show skeleton cards while loading
                    Array.from({ length: 12 }, (_, index) => (
                      <SkeletonFolderCard key={`skeleton-${index}`} index={index} />
                    ))
                  ) : (
                    paginatedFolders.map((folderName, index) => {
                      // Use all datasets to find datasets for this folder
                      const folderDatasets = allDatasets.filter(
                        (dataset) => dataset.topLevelFolder === folderName,
                      );
                      // Find community data points for this folder
                      const folderDataPointsEntry = folderDataPoints.find((entry) =>
                        entry.folder_label
                          .toLowerCase()
                          .startsWith(folderName.replace(/_/g, " ").toLowerCase()),
                      );

                      return (
                        <div key={folderName} className={`opacity-0 animate-slide-up stagger-${Math.min(index, 11)}`}>
                          <FolderCard
                            folderName={folderName}
                            datasets={folderDatasets}
                            onClick={() => handleFolderSelect(folderName)}
                            totalCommunityDataPoints={
                              folderDataPointsEntry?.total_community_data_points
                            }
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </ErrorBoundary>
            </div>
          </>
        )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center">
                <Database className="text-white" size={12} />
              </div>
              <span className="text-sm text-gray-600">
                Data Lake Explorer v1.0
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
