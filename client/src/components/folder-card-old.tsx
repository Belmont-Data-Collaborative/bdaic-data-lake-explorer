import { Folder, ChevronRight, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMemo, memo } from "react";
import type { Dataset } from "@shared/schema";

interface FolderCardProps {
  name: string;
  count: number;
  communityDataPoints?: number;
  onClick: () => void;
}

export const FolderCard = memo(function FolderCard({ name, count, communityDataPoints = 0, onClick }: FolderCardProps) {
  // Use the provided count and data instead of calculating from datasets
  const displayName = name.replace(/_/g, ' ').toUpperCase();
  const formattedCommunityPoints = communityDataPoints.toLocaleString();

  // Simple formatting helper
  const formatCount = (num: number): string => {
    return num.toLocaleString();
  };

  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-2 hover:border-blue-300 group touch-target"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open ${displayName} folder with ${count} datasets`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <Folder className="text-blue-600" size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-foreground mb-2 truncate">
                {folderName.replace(/_/g, ' ').toUpperCase()}
              </h3>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <BarChart3 size={12} />
                  {datasetCount} dataset{datasetCount !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline">
                  {formatFileSize(totalSize)}
                </Badge>
                {totalCommunityDataPoints && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {totalCommunityDataPoints.toLocaleString()} CDP
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {formatCounts.slice(0, 3).map(({ format, count }) => (
                  <Badge key={format} variant="outline" className="text-xs">
                    {format} ({count})
                  </Badge>
                ))}
                {formatCounts.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{formatCounts.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <ChevronRight className="text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0 mt-1" size={20} />
        </div>
      </CardContent>
    </Card>
  );
});