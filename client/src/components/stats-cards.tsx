import { Folder, HardDrive, Map, Clock, BarChart3 } from "lucide-react";
import { useDynamicTime } from "@/hooks/use-dynamic-time";
import { useCountAnimation } from "@/hooks/use-count-animation";
import { formatNumber } from "@/lib/format-number";

interface Stats {
  totalDatasets: number;
  totalSize: string;
  dataSources: number;
  lastUpdated: string;
  lastRefreshTime: string | null;
  totalCommunityDataPoints?: number;
}

interface StatsCardsProps {
  stats?: Stats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const dynamicLastUpdated = useDynamicTime(stats?.lastRefreshTime || null);
  
  // Always call hooks at the top level - never conditionally
  // Animated counting for numeric stats (will be used when stats are available)
  const animatedDatasets = useCountAnimation({
    target: stats?.totalDatasets || 0,
    duration: 1800,
    delay: 100,
  });
  
  const animatedDataSources = useCountAnimation({
    target: stats?.dataSources || 0,
    duration: 1600,
    delay: 300,
  });
  
  const animatedCommunityPoints = useCountAnimation({
    target: stats?.totalCommunityDataPoints || 0,
    duration: 2200,
    delay: 500,
  });

  // Debug: Check if stats are being received
  console.log('StatsCards - stats received:', !!stats);
  console.log('StatsCards - totalCommunityDataPoints:', stats?.totalCommunityDataPoints);
  console.log('StatsCards - Full stats object:', JSON.stringify(stats, null, 2));
  
  // Check if we received an error object instead of stats
  if (stats && (stats as any).message && !stats.totalDatasets) {
    console.log('StatsCards received error response:', (stats as any).message);
    // Don't render stats for error responses - let loading state show
    stats = undefined;
  }


  // Loading state placeholders (will be used when stats are not available)
  const placeholderDatasets = useCountAnimation({ target: 250, duration: 2000 });
  const placeholderSources = useCountAnimation({ target: 15, duration: 1800, delay: 200 });
  const placeholderPoints = useCountAnimation({ target: 15000000, duration: 2500, delay: 400 });

  // Loading state with animated placeholders
  if (!stats) {
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        {/* Total Datasets Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Datasets</p>
              <p className="text-2xl font-bold text-gray-900">{placeholderDatasets.value}</p>
            </div>
            <div className={`w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center ${placeholderDatasets.isAnimating ? 'animate-stat-pulse' : ''}`}>
              <Folder className="text-primary-600" size={24} />
            </div>
          </div>
        </div>
        
        {/* Total Size Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Size</p>
              <p className="text-2xl font-bold text-gray-900">Loading...</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center animate-pulse">
              <HardDrive className="text-green-600" size={24} />
            </div>
          </div>
        </div>
        
        {/* Data Sources Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Data Sources</p>
              <p className="text-2xl font-bold text-gray-900">{placeholderSources.value}</p>
            </div>
            <div className={`w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center ${placeholderSources.isAnimating ? 'animate-stat-pulse' : ''}`}>
              <Map className="text-accent-600" size={24} />
            </div>
          </div>
        </div>
        
        {/* Last Updated Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Last Updated</p>
              <p className="text-2xl font-bold text-gray-900">Loading...</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center animate-pulse">
              <Clock className="text-orange-600" size={24} />
            </div>
          </div>
        </div>
        
        {/* Community Data Points Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Community Data Points</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(placeholderPoints.value)}</p>
            </div>
            <div className={`w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center ${placeholderPoints.isAnimating ? 'animate-stat-pulse' : ''}`}>
              <BarChart3 className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statItems = [
    {
      title: "Total Datasets",
      value: animatedDatasets.value.toString(),
      icon: Folder,
      bgColor: "bg-primary-100",
      iconColor: "text-primary-600",
      isAnimating: animatedDatasets.isAnimating,
    },
    {
      title: "Total Size",
      value: stats.totalSize,
      icon: HardDrive,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      isAnimating: false, // Size doesn't animate
    },
    {
      title: "Data Sources",
      value: animatedDataSources.value.toString(),
      icon: Map,
      bgColor: "bg-accent-100",
      iconColor: "text-accent-600",
      isAnimating: animatedDataSources.isAnimating,
    },
    {
      title: "Last Updated",
      value: dynamicLastUpdated,
      icon: Clock,
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
      isAnimating: false, // Time doesn't animate
    },
    {
      title: "Community Data Points",
      value: formatNumber(animatedCommunityPoints.value),
      icon: BarChart3,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      isAnimating: animatedCommunityPoints.isAnimating,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
      {statItems.map((item) => (
        <div key={item.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{item.title}</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums stat-number">{item.value}</p>
            </div>
            <div className={`w-12 h-12 ${item.bgColor} rounded-lg flex items-center justify-center ${
              item.isAnimating ? 'animate-stat-pulse' : ''
            }`}>
              <item.icon className={`${item.iconColor} text-xl`} size={24} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
