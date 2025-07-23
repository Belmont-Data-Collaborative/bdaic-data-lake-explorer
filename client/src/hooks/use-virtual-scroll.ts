import { useState, useMemo, useCallback } from 'react';

interface UseVirtualScrollOptions {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualScrollResult {
  visibleItems: any[];
  scrollElementProps: {
    style: React.CSSProperties;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  };
  containerProps: {
    style: React.CSSProperties;
  };
}

/**
 * Custom hook for virtual scrolling large lists
 * Only renders visible items plus overscan for performance
 */
export function useVirtualScroll({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: UseVirtualScrollOptions): VirtualScrollResult {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;
  const viewportHeight = containerHeight;

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, viewportHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((item, index) => ({
      ...item,
      virtualIndex: visibleRange.startIndex + index,
      style: {
        position: 'absolute' as const,
        top: (visibleRange.startIndex + index) * itemHeight,
        height: itemHeight,
        width: '100%'
      }
    }));
  }, [items, visibleRange, itemHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const scrollElementProps = useMemo(() => ({
    style: {
      height: containerHeight,
      overflow: 'auto' as const,
      position: 'relative' as const
    },
    onScroll: handleScroll
  }), [containerHeight, handleScroll]);

  const containerProps = useMemo(() => ({
    style: {
      height: totalHeight,
      position: 'relative' as const
    }
  }), [totalHeight]);

  return {
    visibleItems,
    scrollElementProps,
    containerProps
  };
}

/**
 * Hook for virtual grid scrolling (for card layouts)
 */
export function useVirtualGrid({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  gap = 16,
  overscan = 2
}: {
  items: any[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  gap?: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const columnsPerRow = Math.floor(containerWidth / (itemWidth + gap));
  const rowCount = Math.ceil(items.length / columnsPerRow);
  const totalHeight = rowCount * (itemHeight + gap);

  const visibleRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
    const endRow = Math.min(
      rowCount - 1,
      Math.ceil((scrollTop + containerHeight) / (itemHeight + gap)) + overscan
    );

    const startIndex = startRow * columnsPerRow;
    const endIndex = Math.min(items.length - 1, (endRow + 1) * columnsPerRow - 1);

    return { startIndex, endIndex, startRow, endRow };
  }, [scrollTop, itemHeight, gap, containerHeight, rowCount, columnsPerRow, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((item, index) => {
      const itemIndex = visibleRange.startIndex + index;
      const row = Math.floor(itemIndex / columnsPerRow);
      const col = itemIndex % columnsPerRow;

      return {
        ...item,
        virtualIndex: itemIndex,
        style: {
          position: 'absolute' as const,
          top: row * (itemHeight + gap),
          left: col * (itemWidth + gap),
          width: itemWidth,
          height: itemHeight
        }
      };
    });
  }, [items, visibleRange, itemWidth, itemHeight, gap, columnsPerRow]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    scrollElementProps: {
      style: {
        height: containerHeight,
        overflow: 'auto' as const,
        position: 'relative' as const
      },
      onScroll: handleScroll
    },
    containerProps: {
      style: {
        height: totalHeight,
        position: 'relative' as const,
        width: '100%'
      }
    },
    totalItems: items.length,
    visibleCount: visibleRange.endIndex - visibleRange.startIndex + 1
  };
}