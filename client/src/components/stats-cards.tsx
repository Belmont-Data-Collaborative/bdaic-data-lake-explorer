import { Folder, HardDrive, Map, Clock, BarChart3 } from "lucide-react";
import { useDynamicTime } from "@/hooks/use-dynamic-time";

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
  
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      title: "Total Datasets",
      value: stats.totalDatasets.toString(),
      icon: Folder,
      bgColor: "bg-primary-100",
      iconColor: "text-primary-600",
    },
    {
      title: "Total Size",
      value: stats.totalSize,
      icon: HardDrive,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Data Sources",
      value: stats.dataSources.toString(),
      icon: Map,
      bgColor: "bg-accent-100",
      iconColor: "text-accent-600",
    },
    {
      title: "Last Updated",
      value: dynamicLastUpdated,
      icon: Clock,
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
    },
    {
      title: "Community Data Points",
      value: stats.totalCommunityDataPoints ? stats.totalCommunityDataPoints.toLocaleString() : "0",
      icon: BarChart3,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
      {statItems.map((item) => (
        <div key={item.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{item.title}</p>
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
            </div>
            <div className={`w-12 h-12 ${item.bgColor} rounded-lg flex items-center justify-center`}>
              <item.icon className={`${item.iconColor} text-xl`} size={24} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
