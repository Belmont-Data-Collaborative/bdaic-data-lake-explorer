import { useQuery } from "@tanstack/react-query";
import { StatsCards } from "@/components/stats-cards";
import { ErrorBoundary } from "@/components/error-boundary";
import { formatNumber } from "@/lib/format-number";
import type { Dataset } from "@shared/schema";

interface Stats {
  totalDatasets: number;
  totalSize: string;
  dataSources: number;
  lastUpdated: string;
  lastRefreshTime: string | null;
  totalCommunityDataPoints?: number;
}

interface GlobalStatsResponse {
  totalDatasets: number;
  totalSize: string;
  dataSources: number;
  lastUpdated: string;
  lastRefreshTime: string | null;
}

export default function StatsPage() {
  // Fetch global statistics
  const { data: globalStats, isLoading: statsLoading } = useQuery<GlobalStatsResponse>({
    queryKey: ['/api/stats'],
  });

  // Fetch all datasets to calculate community data points
  const { data: datasetsResponse, isLoading: datasetsLoading } = useQuery<{
    datasets: Dataset[];
    totalCount: number;
    totalPages: number;
  }>({
    queryKey: ['/api/datasets'],
    queryFn: async () => {
      // Get auth token from localStorage
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/datasets?page=1&limit=10000&folder=all', { headers });
      if (!response.ok) {
        throw new Error('Failed to fetch datasets');
      }
      return response.json();
    },
  });

  const allDatasets = datasetsResponse?.datasets || [];

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Helper function to extract unique data sources from datasets
  const extractDataSources = (datasets: Dataset[]): Set<string> => {
    const sources = new Set<string>();

    for (const dataset of datasets) {
      if (dataset.metadata && (dataset.metadata as any).dataSource) {
        // Split by comma and clean up each source
        const dataSources = (dataset.metadata as any).dataSource
          .split(",")
          .map((source: string) => source.trim())
          .filter((source: string) => source.length > 0);

        dataSources.forEach((source: string) => sources.add(source));
      }
    }

    return sources;
  };

  // Calculate comprehensive stats
  const calculateStats = (datasetsToCalculate: Dataset[]): Stats => {
    const totalDatasets = datasetsToCalculate.length;
    const totalSizeBytes = datasetsToCalculate.reduce(
      (total, dataset) => total + (dataset.sizeBytes || 0),
      0,
    );

    const uniqueDataSources = extractDataSources(datasetsToCalculate);

    // Calculate community data points for the filtered datasets
    const totalCommunityDataPoints = datasetsToCalculate
      .filter(
        (d) =>
          d.metadata &&
          (d.metadata as any).recordCount &&
          (d.metadata as any).columnCount &&
          (d.metadata as any).completenessScore,
      )
      .reduce((total, d) => {
        const recordCount = parseInt((d.metadata as any).recordCount);
        const columnCount = (d.metadata as any).columnCount;
        const completenessScore = (d.metadata as any).completenessScore / 100.0;
        return total + recordCount * columnCount * completenessScore;
      }, 0);

    return {
      totalDatasets,
      totalSize: formatFileSize(totalSizeBytes),
      dataSources: uniqueDataSources.size,
      lastUpdated: globalStats?.lastUpdated || "Never",
      lastRefreshTime: globalStats?.lastRefreshTime || null,
      totalCommunityDataPoints: Math.round(totalCommunityDataPoints),
    };
  };

  // Get comprehensive stats
  const stats: Stats | undefined = allDatasets.length > 0 ? calculateStats(allDatasets) : globalStats;

  const isLoading = statsLoading || datasetsLoading;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Data Lake Statistics
        </h1>
        <p className="text-muted-foreground">
          Overview of your data lake metrics and key statistics
        </p>
      </div>

      <ErrorBoundary>
        <div className="mb-8">
          <StatsCards stats={isLoading ? undefined : stats} />
        </div>
      </ErrorBoundary>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Dataset Distribution</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Datasets</span>
                <span className="font-medium">{stats.totalDatasets}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data Sources</span>
                <span className="font-medium">{stats.dataSources}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Community Data Points</span>
                <span className="font-medium">{formatNumber(stats.totalCommunityDataPoints || 0)}</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Storage Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Size</span>
                <span className="font-medium">{stats.totalSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average per Dataset</span>
                <span className="font-medium">
                  {stats.totalDatasets > 0 
                    ? formatFileSize(
                        allDatasets.reduce((total, dataset) => total + (dataset.sizeBytes || 0), 0) / stats.totalDatasets
                      )
                    : "0 B"
                  }
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Last Updated</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data Refresh</span>
                <span className="font-medium">{stats.lastUpdated}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}