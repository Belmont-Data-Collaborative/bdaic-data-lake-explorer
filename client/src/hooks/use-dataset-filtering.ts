import { useMemo } from 'react';
import type { Dataset } from '@shared/schema';

interface UseDatasetFilteringOptions {
  datasets: Dataset[];
  searchTerm: string;
  formatFilter: string;
  selectedFolder?: string;
}

interface FilteredDatasetResult {
  filteredDatasets: Dataset[];
  totalCount: number;
  searchCount: number;
  formatCount: number;
  folderCount: number;
}

/**
 * Custom hook for filtering datasets based on search term, format, and folder
 * Provides memoized filtering results and counts for performance optimization
 */
export function useDatasetFiltering({
  datasets,
  searchTerm,
  formatFilter,
  selectedFolder
}: UseDatasetFilteringOptions): FilteredDatasetResult {
  return useMemo(() => {
    let filtered = [...datasets];
    let searchCount = datasets.length;
    let formatCount = datasets.length;
    let folderCount = datasets.length;

    // Apply folder filter first
    if (selectedFolder && selectedFolder !== 'all') {
      filtered = filtered.filter(dataset => 
        dataset.topLevelFolder === selectedFolder
      );
      folderCount = filtered.length;
    }

    // Apply format filter
    if (formatFilter && formatFilter !== 'all') {
      filtered = filtered.filter(dataset => 
        dataset.format.toLowerCase() === formatFilter.toLowerCase()
      );
      formatCount = filtered.length;
    }

    // Apply search filter last
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(dataset =>
        dataset.name.toLowerCase().includes(searchLower) ||
        dataset.source.toLowerCase().includes(searchLower) ||
        (dataset.metadata as any)?.title?.toLowerCase().includes(searchLower) ||
        (dataset.metadata as any)?.description?.toLowerCase().includes(searchLower)
      );
      searchCount = filtered.length;
    }

    return {
      filteredDatasets: filtered,
      totalCount: datasets.length,
      searchCount,
      formatCount,
      folderCount
    };
  }, [datasets, searchTerm, formatFilter, selectedFolder]);
}