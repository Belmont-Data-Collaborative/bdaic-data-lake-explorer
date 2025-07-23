import { create } from 'zustand';

interface LoadingState {
  // Global loading states
  isAppLoading: boolean;
  isDatasetsLoading: boolean;
  isStatsLoading: boolean;
  isRefreshing: boolean;
  isGeneratingInsights: boolean;
  
  // Component-specific loading states
  componentLoading: Record<string, boolean>;
  
  // Actions
  setAppLoading: (loading: boolean) => void;
  setDatasetsLoading: (loading: boolean) => void;
  setStatsLoading: (loading: boolean) => void;
  setRefreshing: (loading: boolean) => void;
  setGeneratingInsights: (loading: boolean) => void;
  setComponentLoading: (componentId: string, loading: boolean) => void;
  clearComponentLoading: (componentId: string) => void;
  clearAllLoading: () => void;
}

/**
 * Centralized loading state management using Zustand
 * Provides a single source of truth for all loading states across the application
 */
export const useLoadingStore = create<LoadingState>((set, get) => ({
  // Initial state
  isAppLoading: false,
  isDatasetsLoading: false,
  isStatsLoading: false,
  isRefreshing: false,
  isGeneratingInsights: false,
  componentLoading: {},

  // Actions
  setAppLoading: (loading) => set({ isAppLoading: loading }),
  
  setDatasetsLoading: (loading) => set({ isDatasetsLoading: loading }),
  
  setStatsLoading: (loading) => set({ isStatsLoading: loading }),
  
  setRefreshing: (loading) => set({ isRefreshing: loading }),
  
  setGeneratingInsights: (loading) => set({ isGeneratingInsights: loading }),
  
  setComponentLoading: (componentId, loading) => set((state) => ({
    componentLoading: {
      ...state.componentLoading,
      [componentId]: loading
    }
  })),
  
  clearComponentLoading: (componentId) => set((state) => {
    const { [componentId]: _, ...rest } = state.componentLoading;
    return { componentLoading: rest };
  }),
  
  clearAllLoading: () => set({
    isAppLoading: false,
    isDatasetsLoading: false,
    isStatsLoading: false,
    isRefreshing: false,
    isGeneratingInsights: false,
    componentLoading: {}
  })
}));

/**
 * Hook for component-specific loading state management
 */
export function useComponentLoading(componentId: string) {
  const isLoading = useLoadingStore((state) => state.componentLoading[componentId] || false);
  const setLoading = useLoadingStore((state) => state.setComponentLoading);
  const clearLoading = useLoadingStore((state) => state.clearComponentLoading);

  return {
    isLoading,
    setLoading: (loading: boolean) => setLoading(componentId, loading),
    clearLoading: () => clearLoading(componentId)
  };
}

/**
 * Hook for global loading states with helper functions
 */
export function useGlobalLoading() {
  const store = useLoadingStore();
  
  const isAnyLoading = 
    store.isAppLoading || 
    store.isDatasetsLoading || 
    store.isStatsLoading || 
    store.isRefreshing || 
    store.isGeneratingInsights ||
    Object.values(store.componentLoading).some(Boolean);

  return {
    ...store,
    isAnyLoading
  };
}