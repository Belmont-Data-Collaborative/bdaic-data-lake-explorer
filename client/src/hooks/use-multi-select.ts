import { useState, useCallback } from 'react';

export interface UseMultiSelectReturn<T> {
  selectedItems: Set<T>;
  isSelectionMode: boolean;
  isSelected: (item: T) => boolean;
  toggleSelection: (item: T) => void;
  selectAll: (items: T[]) => void;
  clearSelection: () => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  toggleSelectionMode: () => void;
  selectedCount: number;
}

export function useMultiSelect<T>(): UseMultiSelectReturn<T> {
  const [selectedItems, setSelectedItems] = useState<Set<T>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const isSelected = useCallback((item: T) => {
    return selectedItems.has(item);
  }, [selectedItems]);

  const toggleSelection = useCallback((item: T) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelectedItems(new Set(items));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    clearSelection();
  }, [clearSelection]);

  const toggleSelectionMode = useCallback(() => {
    if (isSelectionMode) {
      exitSelectionMode();
    } else {
      enterSelectionMode();
    }
  }, [isSelectionMode, enterSelectionMode, exitSelectionMode]);

  return {
    selectedItems,
    isSelectionMode,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelectionMode,
    selectedCount: selectedItems.size,
  };
}