import { Folder, ChevronRight, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMemo, memo } from "react";
import type { Dataset } from "@shared/schema";

interface FolderCardProps {
  folderName: string;
  datasets: Dataset[];
  onClick: () => void;
  totalCommunityDataPoints?: number;
}

export const FolderCard = memo(function FolderCard({ folderName, datasets, onClick, totalCommunityDataPoints }: FolderCardProps) {
  // Memoize expensive calculations
  const { datasetCount, totalSize, formatCounts } = useMemo(() => {
    const datasetCount = datasets.length;
    const totalSize = datasets.reduce((total, dataset) => total + (dataset.sizeBytes || 0), 0);
    
    // Get unique formats in this folder
    const formatSet = new Set(datasets.map(d => d.format));
    const formats = Array.from(formatSet);
    const formatCounts = formats.map(format => ({
      format,
      count: datasets.filter(d => d.format === format).length
    })).sort((a, b) => b.count - a.count);
    
    return { datasetCount, totalSize, formatCounts };
  }, [datasets]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <article>
      <Card 
        className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-2 hover:border-blue-300 group touch-target focus-ring"
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`Open ${folderName.replace(/_/g, ' ')} folder containing ${datasetCount} datasets, total size ${formatFileSize(totalSize)}`}
        aria-describedby={`folder-${folderName}-description`}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <div 
                className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors"
                aria-hidden="true"
              >
                <Folder className="text-blue-600" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <header>
                  <h3 className="text-lg font-semibold text-contrast-high mb-2 truncate">
                    {folderName.replace(/_/g, ' ').toUpperCase()}
                  </h3>
                </header>
                
                <div 
                  id={`folder-${folderName}-description`}
                  className="sr-only"
                >
                  Folder containing {datasetCount} datasets with a total size of {formatFileSize(totalSize)}. 
                  Available formats: {formatCounts.map(f => `${f.format} (${f.count})`).join(', ')}.
                  {totalCommunityDataPoints && ` Community data points: ${totalCommunityDataPoints.toLocaleString()}.`}
                </div>
                
                <section aria-label="Folder statistics">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary" className="flex items-center gap-1" aria-label={`${datasetCount} datasets in this folder`}>
                      <BarChart3 size={12} aria-hidden="true" />
                      {datasetCount} dataset{datasetCount !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="outline" aria-label={`Total size: ${formatFileSize(totalSize)}`}>
                      {formatFileSize(totalSize)}
                    </Badge>
                    {totalCommunityDataPoints && (
                      <Badge 
                        variant="outline" 
                        className="bg-blue-50 text-blue-700 border-blue-200"
                        aria-label={`${totalCommunityDataPoints.toLocaleString()} community data points`}
                      >
                        {totalCommunityDataPoints.toLocaleString()} CDP
                      </Badge>
                    )}
                  </div>
                </section>
                
                <section aria-label="Available file formats">
                  <div className="flex flex-wrap gap-1">
                    {formatCounts.slice(0, 3).map(({ format, count }) => (
                      <Badge 
                        key={format} 
                        variant="outline" 
                        className="text-xs"
                        aria-label={`${count} ${format} files`}
                      >
                        {format} ({count})
                      </Badge>
                    ))}
                    {formatCounts.length > 3 && (
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        aria-label={`${formatCounts.length - 3} additional formats`}
                      >
                        +{formatCounts.length - 3} more
                      </Badge>
                    )}
                  </div>
                </section>
              </div>
            </div>
            <ChevronRight 
              className="text-contrast-muted group-hover:text-primary transition-colors flex-shrink-0 mt-1" 
              size={20} 
              aria-hidden="true" 
            />
          </div>
        </CardContent>
      </Card>
    </article>
  );
});