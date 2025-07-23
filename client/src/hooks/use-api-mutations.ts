import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface ApiMutationOptions {
  onSuccessMessage?: string;
  onErrorMessage?: string;
  invalidateQueries?: string[];
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

/**
 * Custom hook for standardized API mutations with consistent error handling,
 * toast notifications, and cache invalidation
 */
export function useApiMutation(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST',
  options: ApiMutationOptions = {}
) {
  const { toast } = useToast();
  const {
    onSuccessMessage,
    onErrorMessage,
    invalidateQueries = [],
    onSuccess,
    onError
  } = options;

  return useMutation({
    mutationFn: async (data?: any) => {
      const response = await apiRequest(method, endpoint, data);
      return response.json();
    },
    onSuccess: (data) => {
      if (onSuccessMessage) {
        toast({
          title: "Success",
          description: onSuccessMessage,
        });
      }

      // Invalidate specified queries
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });

      onSuccess?.(data);
    },
    onError: (error: any) => {
      const errorMessage = onErrorMessage || error.message || "An error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      onError?.(error);
    },
  });
}

/**
 * Specialized hook for dataset refresh operations
 */
export function useDatasetRefresh() {
  return useApiMutation('/api/datasets/refresh', 'POST', {
    onSuccessMessage: "Datasets refreshed successfully",
    onErrorMessage: "Failed to refresh datasets from S3",
    invalidateQueries: ['/api/datasets', '/api/stats', '/api/datasets/quick-stats', '/api/folders'],
  });
}

/**
 * Specialized hook for generating AI insights
 */
export function useGenerateInsights(datasetId?: number) {
  const endpoint = datasetId 
    ? `/api/datasets/${datasetId}/insights`
    : '/api/datasets/bulk-insights';

  return useApiMutation(endpoint, 'POST', {
    onSuccessMessage: datasetId 
      ? "AI insights generated for dataset"
      : "AI insights generated for all datasets",
    onErrorMessage: "Failed to generate AI insights",
    invalidateQueries: ['/api/datasets'],
  });
}

/**
 * Specialized hook for downloading dataset samples
 */
export function useDownloadSample() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (datasetId: number) => {
      const response = await apiRequest('GET', `/api/datasets/${datasetId}/download-sample`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Download failed');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
        : `dataset-sample-${datasetId}.csv`;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { fileName: filename };
    },
    onSuccess: (data) => {
      toast({
        title: "Download started",
        description: `Sample file ${data.fileName} (10% of original) is downloading.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Download failed",
        description: error.message || "Failed to download sample file",
        variant: "destructive",
      });
    },
  });
}