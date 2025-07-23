import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useMemo } from 'react';

interface OptimizedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  endpoint: string;
  params?: Record<string, any>;
  dependencies?: any[];
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
}

/**
 * Optimized query hook with stale-while-revalidate caching patterns
 * Implements aggressive caching with background refetching
 */
export function useOptimizedQuery<T>({
  endpoint,
  params = {},
  dependencies = [],
  staleTime = 5 * 60 * 1000, // 5 minutes
  cacheTime = 30 * 60 * 1000, // 30 minutes
  refetchOnWindowFocus = false,
  ...options
}: OptimizedQueryOptions<T>) {
  // Memoize query key to prevent unnecessary refetches
  const queryKey = useMemo(() => {
    const paramEntries = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .sort(([a], [b]) => a.localeCompare(b));
    
    return [endpoint, ...paramEntries.flat(), ...dependencies];
  }, [endpoint, params, dependencies]);

  // Memoize query function
  const queryFn = useMemo(() => async () => {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const url = searchParams.toString() 
      ? `${endpoint}?${searchParams.toString()}`
      : endpoint;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Query failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }, [endpoint, params]);

  return useQuery<T>({
    queryKey,
    queryFn,
    staleTime,
    gcTime: cacheTime, // TanStack Query v5 uses gcTime instead of cacheTime
    refetchOnWindowFocus,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options
  });
}

/**
 * Hook for paginated queries with aggressive caching
 */
export function useOptimizedPaginatedQuery<T>({
  endpoint,
  page = 1,
  limit = 50,
  filters = {},
  ...options
}: {
  endpoint: string;
  page?: number;
  limit?: number;
  filters?: Record<string, any>;
} & Omit<OptimizedQueryOptions<T>, 'endpoint' | 'params'>) {
  const params = useMemo(() => ({
    page,
    limit,
    ...filters
  }), [page, limit, filters]);

  return useOptimizedQuery<T>({
    endpoint,
    params,
    staleTime: 2 * 60 * 1000, // 2 minutes for paginated data
    cacheTime: 15 * 60 * 1000, // 15 minutes cache (converted to gcTime internally)
    ...options
  });
}

/**
 * Hook for frequently accessed data with longer cache times
 */
export function useOptimizedStaticQuery<T>({
  endpoint,
  ...options
}: {
  endpoint: string;
} & Omit<OptimizedQueryOptions<T>, 'endpoint'>) {
  return useOptimizedQuery<T>({
    endpoint,
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 2 * 60 * 60 * 1000, // 2 hours (converted to gcTime internally)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options
  });
}