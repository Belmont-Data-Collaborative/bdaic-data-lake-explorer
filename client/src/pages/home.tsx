import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

import { SearchFilters } from "@/components/search-filters";
import { StatsCards } from "@/components/stats-cards";
import { DatasetList } from "@/components/dataset-list";
import { FolderCard } from "@/components/folder-card";
import { SkeletonFolderCard } from "@/components/skeleton-folder-card";
import { ErrorBoundary } from "@/components/error-boundary";
import type { Dataset } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface Stats {
  totalDatasets: number;
  totalSize: string;
  dataSources: number;
  lastUpdated: string;
  lastRefreshTime: string | null;
  totalCommunityDataPoints?: number;
}

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(
    null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      tagFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "10000",
        folder: selectedFolder || "all",
        ...(selectedFolder && searchTerm && { search: searchTerm }),
        ...(selectedFolder && formatFilter !== "all" && { format: formatFilter }),
        ...(selectedFolder && tagFilter !== "all" && { tag: tagFilter }),
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

  // Stats query that takes into account the selected folder
  const { data: globalStats } = useQuery<Stats>({
    queryKey: ["/api/stats", selectedFolder || "all"],
    queryFn: async () => {
      const url = selectedFolder 
        ? `/api/stats?folder=${encodeURIComponent(selectedFolder)}`
        : '/api/stats';
      const token = localStorage.getItem('authToken');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return response.json();
    },
    enabled: !!localStorage.getItem('authToken'),
  });

  // Debug logging for stats
  console.log('Stats from server:', globalStats);

  // Get user profile (includes AI enabled status) 
  const { data: userProfile } = useQuery({
    queryKey: ["/api/user/profile"],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();

      return data;
    },
    enabled: !!localStorage.getItem('authToken'),
    staleTime: 0, // Always fetch fresh to get isAiEnabled updates
    gcTime: 30000, // Short cache time
  });

  // Get user's accessible folders
  const { data: accessibleFolders = [], isLoading: accessibleFoldersLoading, error: accessibleFoldersError, isFetched: accessibleFoldersFetched } = useQuery<string[]>({
    queryKey: ["/api/user/accessible-folders"],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No authentication token');

      const res = await apiRequest('GET', '/api/user/accessible-folders', null, {
        'Authorization': `Bearer ${token}`
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 403 || res.status === 401) {
          // Token expired, clear it and redirect to login
          console.log('Authentication expired, clearing token and redirecting...');
          localStorage.removeItem('authToken');
          // Use a small delay to ensure storage is cleared
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
          throw new Error('Authentication expired');
        }
        throw new Error(errorData.message || 'Failed to load accessible folders');
      }

      return res.json();
    },
    enabled: !!localStorage.getItem('authToken'),
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    retry: false, // Don't retry auth errors
  });

  const { data: allFoldersFromAPI = [], isLoading: allFoldersLoading } = useQuery<string[]>({
    queryKey: ["/api/folders", tagFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tagFilter && tagFilter !== "all") {
        params.set("tag", tagFilter);
      }
      const response = await fetch(`/api/folders?${params}`);
      const data = await response.json();
      console.log("All folders from API:", data);
      return data;
    },
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });

  // Filter folders based on user access
  // Data is ready when successfully fetched (regardless of array content)
  // Check if error actually has content (empty object {} is not a real error)
  const hasRealError = accessibleFoldersError && Object.keys(accessibleFoldersError).length > 0;
  const accessibleFoldersReady = accessibleFoldersFetched && !accessibleFoldersLoading && !hasRealError;
  const allFoldersReady = !allFoldersLoading && allFoldersFromAPI.length > 0;

  const folders = (accessibleFoldersReady && allFoldersReady) ? 
    allFoldersFromAPI.filter(folder => accessibleFolders.includes(folder)) : [];

  // Only show loading if either API is still loading or failed to fetch
  const foldersLoading = accessibleFoldersLoading || allFoldersLoading || !accessibleFoldersReady;

  // Debug logging
  console.log("Accessible folders from API:", accessibleFolders);
  console.log("All folders from API:", allFoldersFromAPI);
  console.log("Folders from API:", folders);
  console.log("Accessible folders loading:", accessibleFoldersLoading);
  console.log("All folders loading:", allFoldersLoading);
  console.log("Accessible folders fetched:", accessibleFoldersFetched);
  console.log("Accessible folders error:", accessibleFoldersError);
  console.log("Has real error:", hasRealError);
  console.log("Accessible folders ready:", accessibleFoldersReady);
  console.log("All folders ready:", allFoldersReady);
  console.log("Folders loading state:", foldersLoading);
  console.log("All datasets count:", allDatasets.length);
  console.log("Current tag filter:", tagFilter);
  console.log(
    "Folders with datasets:",
    folders.map((folder) => ({
      folder,
      count: allDatasets.filter((d) => d.topLevelFolder === folder).length,
    })),
  );

  // Use server stats directly with no modifications whatsoever
  const stats = globalStats;

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
  // If allDatasets is still loading, show all folders to prevent flickering
  const foldersWithDatasets = allDatasetsLoading ? folders : folders.filter(folder => {
    const datasetCount = allDatasets.filter(d => d.topLevelFolder === folder).length;
    return datasetCount > 0;
  });

  // Show all folders with datasets (no pagination)
  const paginatedFolders = foldersWithDatasets;

  // Additional debug logging for filtered folders
  console.log("Folders after filtering:", foldersWithDatasets);

  const userAiEnabled = userProfile?.role === 'admin' || userProfile?.isAiEnabled || false;
  


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
            <StatsCards {...(stats && { stats })} />
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
                tagFilter={tagFilter}
                onTagChange={setTagFilter}
                folders={folders}
                onRefresh={() => {
                  refetchDatasets();
                  setIsRefreshing(false);
                }}
                onSelectDataset={handleSelectDataset}
                isRefreshing={isRefreshing}
                showFolderFilter={false}
                currentFolder={selectedFolder}
                userAiEnabled={userAiEnabled} // Pass userAiEnabled here
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
                  currentFolder={selectedFolder}
                  userAiEnabled={userAiEnabled} // Pass userAiEnabled here
                />
              </ErrorBoundary>
            </div>
          </>
        ) : (
          <>
            {/* Main Page Actions with Tag Filtering */}
            <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <SearchFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                formatFilter={formatFilter}
                onFormatChange={setFormatFilter}
                tagFilter={tagFilter}
                onTagChange={setTagFilter}
                folders={folders}
                onRefresh={() => {
                  refetchAllDatasets();
                  setIsRefreshing(false);
                }}
                onSelectDataset={handleSelectDataset}
                isRefreshing={isRefreshing}
                showFolderFilter={false}
                userAiEnabled={userAiEnabled} // Pass userAiEnabled here
              />
            </div>

            {/* Folder Cards */}
            <div className="space-y-4 relative">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Data Sources
                  {tagFilter !== "all" && (
                    <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      Filtered by: {tagFilter.replace(/_/g, " ")}
                    </span>
                  )}
                </h2>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  {foldersLoading && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Filtering folders...</span>
                    </div>
                  )}
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

              {(isRefreshing || (foldersLoading && !allDatasetsLoading)) && (
                <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center z-10">
                  <div className="bg-white rounded-lg shadow-lg p-6 flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-gray-700">
                      {accessibleFoldersLoading ? 'Loading your folder permissions...' : 
                       allFoldersLoading ? 'Loading available folders...' :
                       foldersLoading ? 'Applying folder access controls...' : 
                       'Refreshing datasets from S3...'}
                    </span>
                  </div>
                </div>
              )}

              <ErrorBoundary>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(allDatasetsLoading || foldersLoading || folders.length === 0) ? (
                    // Show skeleton cards while loading or when no folders are available yet
                    Array.from({ length: 12 }, (_, index) => (
                      <SkeletonFolderCard key={`skeleton-${index}`} index={index} />
                    ))
                  ) : (
                    paginatedFolders.map((folderName, index) => {
                      // Use all datasets to find datasets for this folder
                      const folderDatasets = allDatasets.filter(
                        (dataset) => dataset.topLevelFolder === folderName,
                      );
                      return (
                        <div key={folderName} className={`opacity-0 animate-slide-up stagger-${Math.min(index, 11)}`}>
                          <FolderCard
                            folderName={folderName}
                            datasets={folderDatasets}
                            onClick={() => handleFolderSelect(folderName)}
                            totalCommunityDataPoints={
                              folderDatasets.reduce((total, dataset) => {
                                const metadata = dataset.metadata as any;
                                if (!metadata) return total;

                                const records = metadata.recordCount ? parseInt(metadata.recordCount) : 0;
                                const columns = metadata.columnCount ? parseInt(metadata.columnCount) : 0;
                                const completeness = metadata.completenessScore ? parseFloat(metadata.completenessScore) / 100.0 : 1;

                                if (isNaN(records) || isNaN(columns) || isNaN(completeness)) {
                                  return total;
                                }

                                const dataPoints = records * columns * completeness;
                                return total + dataPoints;
                              }, 0)
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