import React, { memo, useMemo, useCallback } from 'react';
import { Dataset } from '@shared/schema';
import { useVirtualGrid } from '@/hooks/use-virtual-scroll';
import OptimizedDatasetCard from './optimized-dataset-card';
import { ErrorBoundaryWrapper } from './error-boundary-wrapper';

interface VirtualizedDatasetListProps {
  datasets: Dataset[];
  onSelectDataset?: (datasetId: number) => void;
  containerHeight?: number;
  searchTerm?: string;
}

const CARD_WIDTH = 380;
const CARD_HEIGHT = 440;
const GAP = 16;

/**
 * Virtualized dataset list for optimal performance with large datasets
 * Only renders visible cards to maintain 60fps scrolling
 */
const VirtualizedDatasetList = memo(function VirtualizedDatasetList({
  datasets,
  onSelectDataset,
  containerHeight = 600,
  searchTerm = ''
}: VirtualizedDatasetListProps) {
  // Calculate container width based on available space
  const containerWidth = useMemo(() => {
    if (typeof window !== 'undefined') {
      return Math.min(window.innerWidth - 64, 1200); // Max width with padding
    }
    return 1200;
  }, []);

  const {
    visibleItems,
    scrollElementProps,
    containerProps,
    totalItems,
    visibleCount
  } = useVirtualGrid({
    items: datasets,
    itemWidth: CARD_WIDTH,
    itemHeight: CARD_HEIGHT,
    containerWidth,
    containerHeight,
    gap: GAP,
    overscan: 2
  });

  // Memoize the card renderer to prevent unnecessary re-renders
  const renderCard = useCallback((item: Dataset & { style: React.CSSProperties; virtualIndex: number }) => (
    <div
      key={`dataset-${item.id}-${item.virtualIndex}`}
      style={item.style}
      className="absolute"
    >
      <OptimizedDatasetCard
        dataset={item}
        onSelectDataset={onSelectDataset}
        searchTerm={searchTerm}
      />
    </div>
  ), [onSelectDataset, searchTerm]);

  // Performance debug info (only in development)
  const debugInfo = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      return {
        totalItems,
        visibleCount,
        renderRatio: ((visibleCount / totalItems) * 100).toFixed(1)
      };
    }
    return null;
  }, [totalItems, visibleCount]);

  if (datasets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">No datasets found</p>
          <p className="text-sm mt-2">Try adjusting your search filters or refresh the data</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundaryWrapper level="component" componentName="VirtualizedDatasetList">
      <div className="w-full">
        {/* Performance debug info in development */}
        {debugInfo && (
          <div className="mb-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
            Virtual Scroll: {debugInfo.visibleCount}/{debugInfo.totalItems} items rendered ({debugInfo.renderRatio}%)
          </div>
        )}

        {/* Virtualized scroll container */}
        <div {...scrollElementProps} className="w-full">
          <div {...containerProps}>
            {visibleItems.map(renderCard)}
          </div>
        </div>

        {/* Item count summary */}
        <div className="mt-4 text-sm text-muted-foreground text-center">
          Showing {datasets.length} dataset{datasets.length !== 1 ? 's' : ''}
          {searchTerm && (
            <span> matching "{searchTerm}"</span>
          )}
        </div>
      </div>
    </ErrorBoundaryWrapper>
  );
});

export default VirtualizedDatasetList;