import React, { memo, useMemo, useCallback, Suspense, lazy } from 'react';
import { useOptimizedQuery } from '@/hooks/use-optimized-query';
import { useDebouncedSearch } from '@/hooks/use-debounced-value';
import { useDatasetFiltering } from '@/hooks/use-dataset-filtering';
import { ErrorBoundaryWrapper } from '@/components/error-boundary-wrapper';
import { SearchFilters } from '@/components/search-filters';
import { StatsCards } from '@/components/stats-cards';
import { FolderCard } from '@/components/folder-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import type { Dataset } from '@shared/schema';

// Lazy load heavy components for code splitting
const VirtualizedDatasetList = lazy(() => import('@/components/virtualized-dataset-list'));
const DatasetChat = lazy(() => import('@/components/dataset-chat').then(module => ({ default: module.DatasetChat })));

interface HomeOptimizedProps {}

/**
 * Optimized home page with virtual scrolling, debounced search, and code splitting
 * Implements performance best practices for handling large dataset lists
 */
const HomeOptimized = memo(function HomeOptimized({}: HomeOptimizedProps) {
  // Debounced search to reduce API calls
  const {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
    isSearching
  } = useDebouncedSearch('', 300);

  const [formatFilter, setFormatFilter] = React.useState('all');
  const [selectedFolder, setSelectedFolder] = React.useState<string | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = React.useState<number | null>(null);

  // Optimized queries with aggressive caching
  const {
    data: foldersData = [],
    isLoading: foldersLoading
  } = useOptimizedQuery<string[]>({
    endpoint: '/api/folders',
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000  // 30 minutes
  });

  const {
    data: statsData,
    isLoading: statsLoading
  } = useOptimizedQuery({
    endpoint: '/api/stats',
    staleTime: 5 * 60 * 1000,
    cacheTime: 15 * 60 * 1000
  });

  const {
    data: communityDataPointsData = []
  } = useOptimizedQuery<Array<{ folder_label: string; total_community_data_points: number }>>({
    endpoint: '/api/folders/community-data-points',
    staleTime: 10 * 60 * 1000
  });

  // Dataset query with debounced search and filters
  const datasetsQueryParams = useMemo(() => ({
    page: 1,
    limit: 10000,
    folder: selectedFolder || 'all',
    search: debouncedSearchTerm,
    format: formatFilter === 'all' ? undefined : formatFilter
  }), [selectedFolder, debouncedSearchTerm, formatFilter]);

  const {
    data: datasetsResponse,
    isLoading: datasetsLoading,
    isFetching: datasetsFetching
  } = useOptimizedQuery<{ datasets: Dataset[] }>({
    endpoint: '/api/datasets',
    params: datasetsQueryParams,
    dependencies: [selectedFolder, debouncedSearchTerm, formatFilter],
    staleTime: 60 * 1000, // 1 minute for dataset data
    cacheTime: 5 * 60 * 1000 // 5 minutes
  });

  const datasets = datasetsResponse?.datasets || [];

  // Simple client-side filtering with memoization
  const filteredDatasets = useMemo(() => {
    let filtered = datasets;
    
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(dataset => 
        dataset.name.toLowerCase().includes(searchLower) ||
        dataset.source.toLowerCase().includes(searchLower)
      );
    }
    
    if (formatFilter !== 'all') {
      filtered = filtered.filter(dataset => dataset.format === formatFilter);
    }
    
    if (selectedFolder) {
      filtered = filtered.filter(dataset => dataset.topLevelFolder === selectedFolder);
    }
    
    return filtered;
  }, [datasets, debouncedSearchTerm, formatFilter, selectedFolder]);

  // Memoized folder data with community data points
  const foldersWithData = useMemo(() => {
    if (!Array.isArray(foldersData)) return [];
    
    return foldersData.map((folder: string) => {
      const folderData = Array.isArray(communityDataPointsData) 
        ? communityDataPointsData.find(
            item => item.folder_label.toLowerCase().replace(/\s+/g, '_') === folder
          )
        : undefined;
      
      return {
        name: folder,
        count: filteredDatasets.filter(dataset => dataset.topLevelFolder === folder).length,
        communityDataPoints: folderData?.total_community_data_points || 0
      };
    });
  }, [foldersData, communityDataPointsData, filteredDatasets]);

  // Memoized callbacks to prevent unnecessary re-renders
  const handleRefresh = useCallback(() => {
    // Refresh logic handled by mutations in SearchFilters
  }, []);

  const handleSelectFolder = useCallback((folder: string) => {
    setSelectedFolder(folder);
    setSearchTerm(''); // Clear search when switching folders
  }, [setSearchTerm]);

  const handleBackToFolders = useCallback(() => {
    setSelectedFolder(null);
  }, []);

  const handleSelectDataset = useCallback((datasetId: number) => {
    setSelectedDatasetId(datasetId);
  }, []);

  const handleCloseChatModal = useCallback(() => {
    setSelectedDatasetId(null);
  }, []);

  // Loading skeleton component
  const LoadingSkeleton = useMemo(() => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-6">
          <Skeleton className="h-6 w-3/4 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6 mb-4" />
          <Skeleton className="h-2 w-full mb-2" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </Card>
      ))}
    </div>
  ), []);

  return (
    <ErrorBoundaryWrapper level="page" componentName="HomeOptimized">
      <div className="space-y-8">
        {/* Stats Cards */}
        <Suspense fallback={<div className="h-32"><Skeleton className="h-full w-full" /></div>}>
          <StatsCards 
            stats={statsData as any} 
            isLoading={statsLoading}
          />
        </Suspense>

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          formatFilter={formatFilter}
          onFormatChange={setFormatFilter}
          folders={Array.isArray(foldersData) ? foldersData : []}
          onRefresh={handleRefresh}
          onSelectDataset={handleSelectDataset}
          isRefreshing={datasetsFetching}
        />

        {/* Loading indicator for search */}
        {isSearching && (
          <div className="text-center text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Searching...
            </div>
          </div>
        )}

        {/* Content Area */}
        {!selectedFolder ? (
          // Folder overview
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Data Folders</h2>
            {foldersLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {foldersWithData.map((folderInfo: any) => (
                  <FolderCard
                    key={folderInfo.name}
                    name={folderInfo.name}
                    count={folderInfo.count}
                    communityDataPoints={folderInfo.communityDataPoints}
                    onClick={() => handleSelectFolder(folderInfo.name)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Dataset list for selected folder
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {selectedFolder.replace(/_/g, ' ').toUpperCase()} Datasets
              </h2>
              <button
                onClick={handleBackToFolders}
                className="text-primary hover:underline"
              >
                ← Back to Folders
              </button>
            </div>

            {datasetsLoading ? (
              LoadingSkeleton
            ) : (
              <Suspense fallback={LoadingSkeleton}>
                <VirtualizedDatasetList
                  datasets={filteredDatasets}
                  onSelectDataset={handleSelectDataset}
                  containerHeight={800}
                  searchTerm={debouncedSearchTerm}
                />
              </Suspense>
            )}
          </div>
        )}

        {/* Chat Modal */}
        {selectedDatasetId && (
          <Suspense fallback={<div>Loading chat...</div>}>
            <DatasetChat
              datasetId={selectedDatasetId}
              onClose={handleCloseChatModal}
            />
          </Suspense>
        )}
      </div>
    </ErrorBoundaryWrapper>
  );
});

export default HomeOptimized;