import { Button } from "@/components/ui/button";
import { DatasetCard } from "./dataset-card";
import type { Dataset } from "@shared/schema";

interface DatasetListProps {
  datasets: Dataset[];
  isLoading: boolean;
  selectedDatasetId?: number | null;
  showPagination?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function DatasetList({ 
  datasets, 
  isLoading, 
  selectedDatasetId, 
  showPagination = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange
}: DatasetListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4" aria-live="polite" aria-label="Loading datasets">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl shadow-sm border border-border p-6">
            <div className="animate-pulse flex space-x-4">
              <div className="w-10 h-10 bg-muted rounded-lg" aria-hidden="true"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" aria-hidden="true"></div>
                <div className="h-3 bg-muted rounded w-1/2" aria-hidden="true"></div>
              </div>
            </div>
          </div>
        ))}
        <span className="sr-only">Loading datasets, please wait...</span>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-1 1m0 0l-1 1m2-2h2M9 7l1 1m0 0l1 1M7 7h2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No datasets found</h3>
        <p className="text-gray-600 mb-4">
          Configure your AWS S3 settings and refresh to load datasets from your bucket.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {datasets.map((dataset) => (
        <DatasetCard 
          key={dataset.id} 
          dataset={dataset} 
          initiallyOpen={selectedDatasetId === dataset.id}
        />
      ))}
      

    </div>
  );
}
