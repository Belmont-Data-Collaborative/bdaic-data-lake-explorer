import { Folder, ChevronRight, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { memo } from "react";

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
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg shrink-0">
              <Folder className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-foreground group-hover:text-blue-600 transition-colors">
                {displayName}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {formatCount(count)} dataset{count !== 1 ? 's' : ''}
              </p>
              
              {/* Community Data Points */}
              {communityDataPoints > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <BarChart3 size={14} className="text-blue-500" aria-hidden="true" />
                  <span className="text-xs text-blue-600 font-medium">
                    {formattedCommunityPoints} community data points
                  </span>
                </div>
              )}
              
              {/* Folder badge */}
              <div className="flex flex-wrap gap-1 mt-2">
                <Badge 
                  variant="secondary" 
                  className="text-xs px-2 py-0.5"
                  aria-label={`${count} datasets in folder`}
                >
                  Data Folder
                </Badge>
              </div>
            </div>
          </div>
          
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 transition-colors shrink-0" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
});