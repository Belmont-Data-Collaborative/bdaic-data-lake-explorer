import { useQuery } from "@tanstack/react-query";

interface PreloadData {
  stats: {
    totalDatasets: number;
    totalSize: string;
    dataSources: number;
    lastUpdated: string;
    lastRefreshTime: string | null;
  };
  folders: string[];
  quickStats: {
    totalCount: number;
    folders: string[];
    lastUpdated: string;
  };
  preloadTime: string;
}

export function usePreloadData() {
  return useQuery<PreloadData>({
    queryKey: ["/api/preload"],
    queryFn: async () => {
      const response = await fetch("/api/preload");
      if (!response.ok) {
        throw new Error("Failed to preload data");
      }
      return response.json();
    },
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}