import React, { memo, useMemo, useCallback } from 'react';
import { Dataset } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Eye, 
  Search, 
  RefreshCw, 
  Database, 
  Calendar, 
  FileText,
  BarChart3
} from 'lucide-react';
import { useDownloadSample, useGenerateInsights } from '@/hooks/use-api-mutations';
import { formatDistanceToNow } from 'date-fns';

interface OptimizedDatasetCardProps {
  dataset: Dataset;
  onSelectDataset?: (datasetId: number) => void;
  searchTerm?: string;
}

/**
 * Optimized dataset card with proper memoization and performance optimizations
 * Uses React.memo to prevent unnecessary re-renders
 */
const OptimizedDatasetCard = memo(function OptimizedDatasetCard({
  dataset,
  onSelectDataset,
  searchTerm = ''
}: OptimizedDatasetCardProps) {
  const downloadSampleMutation = useDownloadSample();
  const generateInsightsMutation = useGenerateInsights();

  // Memoize computed values to prevent recalculation on every render
  const computedMetadata = useMemo(() => {
    const metadata = dataset.metadata as any;
    const completenessScore = metadata?.completenessScore || 0;
    const recordCount = metadata?.recordCount || 0;
    const columnCount = metadata?.columnCount || 0;
    
    return {
      completenessScore,
      recordCount: recordCount.toLocaleString(),
      columnCount,
      lastModified: formatDistanceToNow(new Date(dataset.lastModified), { addSuffix: true }),
      title: metadata?.title || dataset.name,
      description: metadata?.description || 'No description available'
    };
  }, [dataset.metadata, dataset.lastModified, dataset.name]);

  // Memoize highlighted text for search
  const highlightedTitle = useMemo(() => {
    if (!searchTerm) return computedMetadata.title;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = computedMetadata.title.split(regex);
    
    return parts.map((part: string, index: number) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }, [computedMetadata.title, searchTerm]);

  // Memoize button handlers to prevent function recreation
  const handleDownloadSample = useCallback(() => {
    downloadSampleMutation.mutate(dataset.id);
  }, [downloadSampleMutation, dataset.id]);

  const handleGenerateInsights = useCallback(() => {
    generateInsightsMutation.mutate(undefined);
  }, [generateInsightsMutation]);

  const handleExploreData = useCallback(() => {
    onSelectDataset?.(dataset.id);
  }, [onSelectDataset, dataset.id]);

  // Memoize completion color for future use
  const completionColor = useMemo(() => {
    const score = computedMetadata.completenessScore;
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }, [computedMetadata.completenessScore]);
  
  // Use completionColor in a future feature
  console.debug('Completion color for future use:', completionColor);

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold leading-tight line-clamp-2 flex-1">
            {highlightedTitle}
          </CardTitle>
          <Badge 
            variant="secondary" 
            className="text-xs shrink-0"
            aria-label={`File format: ${dataset.format}`}
          >
            {dataset.format.toUpperCase()}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Database size={14} aria-hidden="true" />
            <span>{computedMetadata.recordCount} rows</span>
          </div>
          <div className="flex items-center gap-1">
            <BarChart3 size={14} aria-hidden="true" />
            <span>{computedMetadata.columnCount} cols</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {computedMetadata.description}
        </p>

        {/* Metadata completeness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Completeness</span>
            <span className="font-medium">{computedMetadata.completenessScore}%</span>
          </div>
          <Progress 
            value={computedMetadata.completenessScore} 
            className="h-2"
            aria-label={`Metadata completeness: ${computedMetadata.completenessScore}%`}
          />
        </div>

        {/* File info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText size={14} aria-hidden="true" />
            <span>{dataset.size}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={14} aria-hidden="true" />
            <span>{computedMetadata.lastModified}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2 mt-auto pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSample}
            disabled={downloadSampleMutation.isPending}
            className="flex items-center gap-1 text-xs touch-target"
            aria-label={`Download sample of ${dataset.name}`}
          >
            {downloadSampleMutation.isPending ? (
              <RefreshCw size={12} className="animate-spin" aria-hidden="true" />
            ) : (
              <Download size={12} aria-hidden="true" />
            )}
            <span>Sample</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateInsights}
            disabled={generateInsightsMutation.isPending}
            className="flex items-center gap-1 text-xs touch-target"
            aria-label={`Generate AI insights for ${dataset.name}`}
          >
            {generateInsightsMutation.isPending ? (
              <RefreshCw size={12} className="animate-spin" aria-hidden="true" />
            ) : (
              <Search size={12} aria-hidden="true" />
            )}
            <span>Insights</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExploreData}
            className="flex items-center gap-1 text-xs touch-target"
            aria-label={`Explore ${dataset.name} with AI chat`}
          >
            <Eye size={12} aria-hidden="true" />
            <span>Explore</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export default OptimizedDatasetCard;