import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

import {
  ChevronDown,
  Table,
  BarChart3,
  Users,
  FileText,
  Weight,
  Calendar,
  Info,
  Brain,
  Search,
  Download,
  RefreshCw,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getSafeAuthToken } from "@/lib/auth-utils";
import { DatasetChat } from "@/components/dataset-chat";
import { formatNumber } from "@/lib/format-number";
import type { Dataset, DatasetInsights, DatasetMetadata } from "@shared/schema";

interface DatasetCardProps {
  dataset: Dataset;
  initiallyOpen?: boolean;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionClick?: (event: React.MouseEvent) => void;
  userAiEnabled?: boolean;
  currentFolder?: string | null;
}

export function DatasetCard({
  dataset,
  initiallyOpen = false,
  isSelectionMode = false,
  isSelected = false,
  onSelectionClick,
  userAiEnabled = false,
}: DatasetCardProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [columnSearchTerm, setColumnSearchTerm] = useState("");
  const [columnsPerPage, setColumnsPerPage] = useState(8);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { toast } = useToast();

  const metadata = dataset.metadata as DatasetMetadata | null;
  const insights = dataset.insights as DatasetInsights | null;

  // Fetch download statistics
  const { data: downloadStats } = useQuery({
    queryKey: ['/api/datasets', dataset.id, 'download-stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/datasets/${dataset.id}/download-stats`);
      return response.json();
    },
    // Always fetch stats for header display
  });

  // Smart column search with AI-powered semantic similarity
  const [aiSearchResults, setAiSearchResults] = useState<any[]>([]);
  const [isAiSearching, setIsAiSearching] = useState(false);

  // Enhanced column filtering with semantic search
  const filteredColumns = useMemo(() => {
    if (!metadata?.columns) return [];

    // First try exact matching (fast)
    const exactMatches = metadata.columns.filter((column) =>
      column.name.toLowerCase().includes(columnSearchTerm.toLowerCase()) ||
      (column.description && column.description.toLowerCase().includes(columnSearchTerm.toLowerCase()))
    );

    // If we have good exact matches or no search term, return those
    if (exactMatches.length >= 3 || !columnSearchTerm.trim() || columnSearchTerm.length < 3) {
      return exactMatches;
    }

    // If few exact matches and we have AI results, combine them
    if (aiSearchResults.length > 0) {
      const aiMatchedColumns = metadata.columns.filter(column => 
        aiSearchResults.some(result => 
          result.columnName === column.name && result.score > 0.6
        )
      );
      
      // Combine exact matches with AI matches, remove duplicates
      const combined = [...exactMatches];
      aiMatchedColumns.forEach(aiCol => {
        if (!exactMatches.find(exact => exact.name === aiCol.name)) {
          combined.push(aiCol);
        }
      });
      
      return combined;
    }

    return exactMatches;
  }, [metadata?.columns, columnSearchTerm, aiSearchResults]);

  const totalPages = Math.ceil(filteredColumns.length / columnsPerPage);
  const startIndex = (currentPage - 1) * columnsPerPage;
  const endIndex = startIndex + columnsPerPage;
  const visibleColumns = showAllColumns
    ? filteredColumns
    : filteredColumns.slice(startIndex, endIndex);

  // AI-powered semantic column search
  const performAiColumnSearch = async (searchTerm: string) => {
    if (!metadata?.columns || searchTerm.length < 3) {
      console.log('AI search skipped: no columns or term too short');
      return;
    }
    
    if (!userAiEnabled) {
      console.log('AI search skipped: user AI not enabled');
      return;
    }
    
    console.log(`Starting AI search for "${searchTerm}" with ${metadata.columns.length} columns`);
    setIsAiSearching(true);
    
    try {
      const response = await apiRequest('POST', `/api/datasets/${dataset.id}/search-columns`, {
        searchTerm,
        columns: metadata.columns.map(col => ({
          name: col.name,
          type: col.type,
          description: col.description || ''
        }))
      });
      
      const results = await response.json();
      console.log(`AI search results for "${searchTerm}":`, results);
      setAiSearchResults(results.matches || []);
    } catch (error) {
      console.warn('AI column search failed, using exact matching only:', error);
      setAiSearchResults([]);
    } finally {
      setIsAiSearching(false);
    }
  };

  // Enhanced search handler with AI fallback
  const handleSearchChange = (value: string) => {
    setColumnSearchTerm(value);
    setCurrentPage(1);
    setAiSearchResults([]); // Clear previous AI results
    
    // Trigger AI search after a short delay for better semantic results
    if (value.trim() && value.length >= 3) {
      const exactMatches = metadata?.columns?.filter((column) =>
        column.name.toLowerCase().includes(value.toLowerCase()) ||
        (column.description && column.description.toLowerCase().includes(value.toLowerCase()))
      ) || [];
      
      console.log(`Column search for "${value}": found ${exactMatches.length} exact matches`);
      
      // Always try AI search for better semantic understanding
      // AI will find related terms like "location" -> "State", "address", etc.
      setTimeout(() => {
        // Check if search term is still the current one (avoid race conditions)
        if (document.querySelector('input[placeholder*="Search columns"]')?.value === value) {
          console.log(`Triggering AI search for: "${value}"`);
          performAiColumnSearch(value);
        } else {
          console.log(`AI search cancelled for "${value}" - search term changed`);
        }
      }, 500); // Reduced delay for faster response
    }
  };

  const handleColumnsPerPageChange = (value: string) => {
    setColumnsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/datasets/${dataset.id}/insights`,
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Insights generated",
        description: "AI insights have been generated for this dataset.",
      });

      // Update the specific dataset in the cache instead of invalidating all
      queryClient.setQueryData(
        ["/api/datasets"],
        (oldData: Dataset[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((d) =>
            d.id === dataset.id ? { ...d, insights: data.insights } : d,
          );
        },
      );
    },
    onError: (error: any) => {
      toast({
        title: "Error generating insights",
        description: error.message || "Failed to generate AI insights",
        variant: "destructive",
      });
    },
  });

  const downloadSampleMutation = useMutation({
    mutationFn: async () => {
      const token = getSafeAuthToken();
      const response = await fetch(
        `/api/datasets/${dataset.id}/download-sample`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Sample downloads now stream directly from backend (no pre-signed URLs)
      const blob = await response.blob();
      const fileName = response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] || `${dataset.name}-sample.csv`;
      const sampleSize = parseInt(response.headers.get('x-sample-size') || '0');
      const totalSize = parseInt(response.headers.get('x-total-size') || '0');
      
      console.log(`Sample download: ${fileName} (${Math.round(sampleSize / 1024)} KB sample - 1% from ${Math.round(totalSize / 1024 / 1024)} MB total)`);
      
      // Trigger download from blob
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { 
        downloadType: 'stream', 
        fileName, 
        sampleSize,
        totalSize 
      };
    },
    onSuccess: (data: any) => {
      // Sample downloads now stream directly from backend (1% of file size)
      toast({
        title: "Download completed",
        description: `Sample file ${data.fileName} (1% of original) has been downloaded successfully.`,
      });

      // Invalidate download stats cache
      queryClient.invalidateQueries({
        queryKey: ['/api/datasets', dataset.id, 'download-stats']
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

  const downloadFullMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `/api/datasets/${dataset.id}/download-full`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Download failed");
      }

      // Check if response is JSON (pre-signed URL) or blob (direct download)
      const contentType = response.headers.get("Content-Type");
      
      if (contentType && contentType.includes("application/json")) {
        // Large file: Server returned pre-signed URL
        const data = await response.json();
        console.log(`Large file download detected: ${data.fileName} (${data.size ? Math.round(data.size / 1024 / 1024) + ' MB' : 'unknown size'})`);
        
        // Trigger direct download from S3 via pre-signed URL
        const link = document.createElement("a");
        link.href = data.url;
        link.download = data.fileName;
        link.target = "_blank"; // Open in new tab for better UX
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return { 
          downloadType: 'presigned', 
          fileName: data.fileName, 
          size: data.size,
          expiresIn: data.expiresIn 
        };
      } else {
        // Small file: Server streamed file content
        console.log(`Small file download detected: ${dataset.name}`);
        
        // Get filename from Content-Disposition header or create one
        const contentDisposition = response.headers.get("Content-Disposition");
        let fileName = `${dataset.name}.${dataset.format.toLowerCase()}`;

        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
          if (filenameMatch) {
            fileName = filenameMatch[1];
          }
        }

        const blob = await response.blob();
        return { downloadType: 'blob', blob, fileName };
      }
    },
    onSuccess: (data: any) => {
      if (data.downloadType === 'presigned') {
        // Pre-signed URL download (large files)
        toast({
          title: "Download started",
          description: `Large file ${data.fileName} is downloading directly from cloud storage.`,
        });
      } else {
        // Blob download (small files) - use existing logic
        const url = window.URL.createObjectURL(data.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Download started",
          description: `Full file ${data.fileName} is downloading.`,
        });
      }

      // Invalidate download stats cache
      queryClient.invalidateQueries({
        queryKey: ['/api/datasets', dataset.id, 'download-stats']
      });
    },
    onError: (error: any) => {
      toast({
        title: "Download failed",
        description: error.message || "Failed to download full file",
        variant: "destructive",
      });
    },
  });

  const downloadMetadataMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `/api/datasets/${dataset.id}/download-metadata`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Download failed");
      }

      // Get filename from Content-Disposition header or create one
      const contentDisposition = response.headers.get("Content-Disposition");
      let fileName = `${dataset.name}.yaml`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          fileName = filenameMatch[1];
        }
      }

      const blob = await response.blob();
      return { blob, fileName };
    },
    onSuccess: (data: { blob: Blob; fileName: string }) => {
      // Create a temporary link and trigger download
      const url = window.URL.createObjectURL(data.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: `Metadata file ${data.fileName} is downloading.`,
      });

      // Invalidate download stats cache
      queryClient.invalidateQueries({
        queryKey: ['/api/datasets', dataset.id, 'download-stats']
      });
    },
    onError: (error: any) => {
      toast({
        title: "Download failed",
        description: error.message || "Failed to download full file",
        variant: "destructive",
      });
    },
  });

  const getIconForFormat = (format: string) => {
    const formatLower = format.toLowerCase();
    if (formatLower.includes("csv")) return Table;
    if (formatLower.includes("json")) return BarChart3;
    if (formatLower.includes("parquet") || formatLower.includes("avro"))
      return Users;
    return FileText;
  };

  const getIconColorForFormat = (format: string) => {
    const formatLower = format.toLowerCase();
    if (formatLower.includes("csv")) return "text-primary-600 bg-primary-100";
    if (formatLower.includes("json")) return "text-green-600 bg-green-100";
    if (formatLower.includes("parquet") || formatLower.includes("avro"))
      return "text-purple-600 bg-purple-100";
    return "text-gray-600 bg-gray-100";
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "default";
      case "processing":
        return "secondary";
      case "error":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const Icon = getIconForFormat(dataset.format);
  const iconColorClass = getIconColorForFormat(dataset.format);

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      e.stopPropagation();
      if (onSelectionClick) {
        onSelectionClick(e);
      }
    }
  };

  return (
    <article
      id={`dataset-${dataset.id}`}
      className={`bg-card rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all duration-200 ${
        isSelectionMode 
          ? isSelected 
            ? 'border-primary ring-2 ring-primary/20' 
            : 'border-border hover:border-primary/50'
          : 'border-border'
      }`}
      onClick={handleCardClick}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger 
          className={`w-full px-4 sm:px-6 py-4 hover:bg-muted/50 transition-colors touch-target container-safe focus-ring ${
            isSelectionMode ? 'cursor-pointer' : ''
          }`}
          aria-expanded={isOpen}
          aria-controls={`dataset-content-${dataset.id}`}
          aria-label={`${isOpen ? 'Collapse' : 'Expand'} dataset details for ${dataset.name}. Format: ${dataset.format}, Size: ${dataset.size}, Last modified: ${new Date(dataset.lastModified).toLocaleDateString()}`}
          aria-describedby={`dataset-summary-${dataset.id}`}
          disabled={isSelectionMode}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 ${iconColorClass} rounded-lg flex items-center justify-center flex-shrink-0`}
                aria-hidden="true"
              >
                <Icon size={16} className="sm:hidden" />
                <Icon size={20} className="hidden sm:block" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <header>
                  <h3 className="text-base sm:text-lg font-semibold text-contrast-high text-break">
                    {dataset.name}
                  </h3>
                </header>

                <div 
                  id={`dataset-summary-${dataset.id}`}
                  className="sr-only"
                >
                  Dataset {dataset.name} in {dataset.format} format, 
                  {dataset.size} in size, 
                  {downloadStats ? (downloadStats.sample + downloadStats.full + downloadStats.metadata) : 0} total downloads, 
                  last modified on {new Date(dataset.lastModified).toLocaleDateString()}.
                  {metadata?.description && ` Description: ${metadata.description}`}
                </div>

                <div 
                  className="flex items-center flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-contrast-medium mt-1"
                  role="list"
                  aria-label="Dataset properties"
                >
                  <span className="flex items-center space-x-1 flex-shrink-0" role="listitem" aria-label={`File format: ${dataset.format}`}>
                    <FileText size={10} aria-hidden="true" className="sm:w-3 sm:h-3" />
                    <span>{dataset.format}</span>
                  </span>
                  <span className="flex items-center space-x-1 flex-shrink-0" role="listitem" aria-label={`File size: ${dataset.size}`}>
                    <Weight size={10} aria-hidden="true" className="sm:w-3 sm:h-3" />
                    <span>{dataset.size}</span>
                  </span>
                  <span className="flex items-center space-x-1 flex-shrink-0" role="listitem" aria-label={`Total downloads: ${downloadStats ? (downloadStats.sample + downloadStats.full + downloadStats.metadata) : 0}`}>
                    <Download size={10} aria-hidden="true" className="sm:w-3 sm:h-3" />
                    <span>Downloads: {downloadStats ? (downloadStats.sample + downloadStats.full + downloadStats.metadata) : 0}</span>
                  </span>
                  <span className="flex items-center space-x-1 flex-shrink-0" role="listitem" aria-label={`Last modified: ${new Date(dataset.lastModified).toLocaleDateString()}`}>
                    <Calendar size={10} aria-hidden="true" className="sm:w-3 sm:h-3" />
                    <span>Last modified: {new Date(dataset.lastModified).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <Badge 
                variant={getStatusColor(dataset.status)} 
                className="text-xs"
                aria-label={`Dataset status: ${dataset.status}`}
              >
                {dataset.status}
              </Badge>
              <ChevronDown
                className={`text-contrast-muted transition-transform duration-200 w-4 h-4 sm:w-5 sm:h-5 ${isOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent id={`dataset-content-${dataset.id}`}>
          <div className="border-t border-border bg-muted/30 overflow-safe">
            <div className="px-4 sm:px-6 py-4 sm:py-6 container-safe">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {/* Metadata Section */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center">
                    <Info className="text-primary mr-2" size={16} aria-hidden="true" />
                    Metadata
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">
                        Record Count
                      </span>
                      <span className="text-sm font-medium text-foreground text-ellipsis">
                        {metadata?.recordCount && metadata.recordCount !== "" 
                          ? formatNumber(parseInt(metadata.recordCount))
                          : "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">File Size</span>
                      <span className="text-sm font-medium text-foreground text-ellipsis">
                        {dataset.size}
                      </span>
                    </div>
                    {metadata?.completenessScore !== undefined && (
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground flex items-center">
                          Completeness Score
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="ml-1 text-muted-foreground hover:text-foreground cursor-pointer">
                                <Info size={16} />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64">
                              <p>The percentage of non-empty data cells</p>
                            </PopoverContent>
                          </Popover>
                        </span>
                        <span className="text-sm font-medium text-foreground flex items-center">
                          {metadata.completenessScore}%
                          <div className="ml-2 w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                metadata.completenessScore >= 80
                                  ? "bg-green-500"
                                  : metadata.completenessScore >= 60
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                              style={{
                                width: `${metadata.completenessScore}%`,
                              }}
                            />
                          </div>
                        </span>
                      </div>
                    )}

                    {/* Download Statistics */}
                    {downloadStats && (
                      <div className="py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground flex items-center mb-2">
                          Download Statistics
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="ml-1 text-muted-foreground hover:text-foreground cursor-pointer">
                                <Info size={16} />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64">
                              <p>Number of times this dataset has been downloaded</p>
                            </PopoverContent>
                          </Popover>
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-muted/50 p-2 rounded">
                            <div className="font-medium text-foreground">Sample</div>
                            <div className="text-muted-foreground">{downloadStats.sample || 0} downloads</div>
                          </div>
                          <div className="bg-muted/50 p-2 rounded">
                            <div className="font-medium text-foreground">Full File</div>
                            <div className="text-muted-foreground">{downloadStats.full || 0} downloads</div>
                          </div>
                          <div className="bg-muted/50 p-2 rounded">
                            <div className="font-medium text-foreground">Metadata</div>
                            <div className="text-muted-foreground">{downloadStats.metadata || 0} downloads</div>
                          </div>
                          <div className="bg-muted/50 p-2 rounded">
                            <div className="font-medium text-foreground">Total</div>
                            <div className="text-muted-foreground">{downloadStats.total || 0} downloads</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {metadata?.recordCount && 
                      metadata.recordCount !== "" &&
                      metadata?.columnCount &&
                      metadata?.completenessScore && (
                        <div className="flex justify-between items-center py-2 border-b border-border">
                          <span className="text-sm text-muted-foreground flex items-center">
                            Community Data Points
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="ml-1 text-muted-foreground hover:text-foreground cursor-pointer">
                                  <Info size={16} />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64">
                                <p>Records × Columns × Completeness Score</p>
                              </PopoverContent>
                            </Popover>
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {formatNumber(
                              parseInt(metadata.recordCount) *
                              metadata.columnCount *
                              (metadata.completenessScore / 100)
                            )}
                          </span>
                        </div>
                      )}
                    {metadata?.dataSource && (
                      <div className="py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600 block mb-1">
                          Data Source
                        </span>
                        <span className="text-sm font-medium text-gray-900 block leading-relaxed">
                          {metadata.dataSource}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-sm text-gray-600">
                        Last Modified
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(dataset.lastModified).toLocaleDateString()}
                      </span>
                    </div>
                    {metadata?.dateAccessed && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">
                          Date Accessed
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(metadata.dateAccessed).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {metadata?.encoding && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Encoding</span>
                        <span className="text-sm font-medium text-gray-900">
                          {metadata.encoding}
                        </span>
                      </div>
                    )}
                    {metadata?.delimiter && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Delimiter</span>
                        <span className="text-sm font-medium text-gray-900">
                          {metadata.delimiter === ","
                            ? "Comma"
                            : metadata.delimiter === "\t"
                              ? "Tab"
                              : metadata.delimiter === ";"
                                ? "Semicolon"
                                : metadata.delimiter}
                        </span>
                      </div>
                    )}
                    {metadata?.intendedUseCase && (
                      <div className="py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600 block mb-1">
                          Intended Use
                        </span>
                        <span className="text-sm font-medium text-gray-900 block leading-relaxed">
                          {metadata.intendedUseCase}
                        </span>
                      </div>
                    )}
                    {metadata?.targetAudiences &&
                      metadata.targetAudiences.length > 0 && (
                        <div className="py-2 border-b border-gray-200">
                          <span className="text-sm text-gray-600 block mb-2">
                            Target Audience
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {metadata.targetAudiences.map((audience, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs"
                              >
                                {audience}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* YAML Metadata Info */}
                    {metadata?.yamlMetadata && (
                      <div className="pt-2 border-t border-gray-200">
                        <span className="text-sm text-gray-600 mb-2 block">
                          YAML Documentation
                        </span>
                        <div className="space-y-1 text-sm">
                          {metadata.title && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Title:</span>
                              <span className="font-medium text-gray-900">
                                {metadata.title}
                              </span>
                            </div>
                          )}
                          {metadata.description && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Description:
                              </span>
                              <span
                                className="font-medium text-gray-900 text-right max-w-xs truncate"
                                title={metadata.description}
                              >
                                {metadata.description}
                              </span>
                            </div>
                          )}
                          {metadata.license && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">License:</span>
                              <span className="font-medium text-gray-900">
                                {metadata.license}
                              </span>
                            </div>
                          )}
                          {metadata.version && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Version:</span>
                              <span className="font-medium text-gray-900">
                                {metadata.version}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {metadata?.tags && metadata.tags.length > 0 && (
                      <div className="pt-2 border-t border-gray-200">
                        <span className="text-sm text-gray-600 mb-2 block">
                          Tags
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {metadata.tags.map((tag, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column Schema Section */}
                {metadata?.columns && metadata.columns.length > 0 && (
                  <div className="flex flex-col">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                      <Table className="text-green-600 mr-2" size={16} />
                      Column Schema ({filteredColumns.length} of{" "}
                      {metadata.columns.length} columns)
                    </h4>

                    {/* Column Controls */}
                    <div className="space-y-3 mb-4">
                      <div className="relative">
                        <Search
                          className="absolute left-3 top-2.5 text-gray-400"
                          size={14}
                        />
                        <Input
                          type="text"
                          placeholder="Search columns..."
                          value={columnSearchTerm}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          className="pl-9 text-sm"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-600">Show:</span>
                          <Select
                            value={columnsPerPage.toString()}
                            onValueChange={handleColumnsPerPageChange}
                          >
                            <SelectTrigger className="h-7 w-16 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="8">8</SelectItem>
                              <SelectItem value="12">12</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAllColumns(!showAllColumns)}
                          className="h-7 text-xs"
                        >
                          {showAllColumns ? (
                            <>
                              <EyeOff className="mr-1" size={12} />
                              Show Less
                            </>
                          ) : (
                            <>
                              <Eye className="mr-1" size={12} />
                              Show All
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Column List - Fixed height for 8 columns */}
                    <div
                      className="space-y-3 overflow-y-auto"
                      style={{ height: "710px" }}
                    >
                      {visibleColumns.map((column, index) => (
                        <div
                          key={startIndex + index}
                          className="bg-white rounded-lg p-3 border border-gray-200"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {column.name}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {column.type}
                            </Badge>
                          </div>
                          {column.description && (
                            <div className="text-xs text-gray-700 mb-1">
                              {column.description}
                            </div>
                          )}
                          {column.sampleValues &&
                            column.sampleValues.length > 0 && (
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">Sample: </span>
                                {column.sampleValues.slice(0, 2).join(", ")}
                                {column.sampleValues.length > 2 && "..."}
                              </div>
                            )}
                        </div>
                      ))}

                      {filteredColumns.length === 0 && !isAiSearching && (
                        <div className="text-center text-sm text-gray-500 py-4">
                          No columns found matching "{columnSearchTerm}"
                        </div>
                      )}

                      {/* AI Search Loading Indicator */}
                      {isAiSearching && (
                        <div className="text-center text-sm text-blue-600 py-4 flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          AI is searching for semantic matches...
                        </div>
                      )}

                      {/* Helpful hint when there are few results but AI search is done */}
                      {filteredColumns.length > 0 && filteredColumns.length < 3 && !isAiSearching && columnSearchTerm.length >= 3 && (
                        <div className="text-center text-xs text-gray-400 py-2">
                          {aiSearchResults.length > 0 ? "Including AI-suggested matches" : "Search includes exact matches and descriptions"}
                        </div>
                      )}
                    </div>

                    {/* Pagination */}
                    {!showAllColumns && totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                        <span className="text-xs text-gray-600">
                          Showing {startIndex + 1}-
                          {Math.min(endIndex, filteredColumns.length)} of{" "}
                          {filteredColumns.length}
                        </span>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="h-7 w-7 p-0"
                          >
                            <ChevronLeft size={12} />
                          </Button>
                          <span className="text-xs text-gray-600">
                            {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="h-7 w-7 p-0"
                          >
                            <ChevronRight size={12} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Insights Section */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                    <Brain className="text-accent-600 mr-2" size={16} />
                    AI-Generated Insights
                  </h4>

                  {insights ? (
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">
                          Data Summary
                        </h5>
                        <p className="text-sm text-gray-700">
                          {insights.summary}
                        </p>
                      </div>

                      {insights.patterns && insights.patterns.length > 0 && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">
                            Key Patterns
                          </h5>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {insights.patterns.map((pattern, index) => (
                              <li key={index} className="flex items-start">
                                <Check
                                  className="text-green-500 mt-1 mr-2 flex-shrink-0"
                                  size={12}
                                />
                                <span>{pattern}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {insights.useCases && insights.useCases.length > 0 && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">
                            Recommended Use Cases
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {insights.useCases.map((useCase, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="bg-primary-100 text-primary-800"
                              >
                                {useCase}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : userAiEnabled ? (
                    <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                      <Brain className="mx-auto text-gray-400 mb-2" size={24} />
                      <p className="text-sm text-gray-600 mb-3">
                        No AI insights generated yet
                      </p>
                      <Button
                        size="sm"
                        onClick={() => generateInsightsMutation.mutate()}
                        disabled={generateInsightsMutation.isPending}
                        className="bg-accent-500 hover:bg-accent-600 text-white"
                      >
                        {generateInsightsMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                            Generating...
                          </>
                        ) : (
                          "Generate Insights"
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                      <Brain className="mx-auto text-gray-400 mb-2" size={24} />
                      <p className="text-sm text-gray-600">
                        AI features are not enabled for your account
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
                <div className="flex items-center flex-wrap gap-2 sm:gap-4" role="group" aria-label="Dataset actions">
                  {userAiEnabled && (
                    <Button
                      className="bg-primary hover:bg-primary/90 text-primary-foreground touch-target"
                      onClick={() => setIsChatOpen(true)}
                      aria-label={`Open AI chat for ${dataset.name}`}
                    >
                      <Search className="mr-2" size={16} aria-hidden="true" />
                      <span>Ask AI</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => downloadSampleMutation.mutate(dataset.id)}
                    disabled={downloadSampleMutation.isPending}
                    className="touch-target"
                    aria-label={`Download 10% sample of ${dataset.name}`}
                  >
                    {downloadSampleMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground mr-2" aria-hidden="true"></div>
                        <span>Downloading...</span>
                        <span className="sr-only">Downloading sample file</span>
                      </>
                    ) : (
                      <>
                        <Download className="mr-2" size={16} aria-hidden="true" />
                        <span>Download Sample</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => downloadFullMutation.mutate(dataset.id)}
                    disabled={downloadFullMutation.isPending}
                    className="touch-target"
                    aria-label={`Download full file of ${dataset.name}`}
                  >
                    {downloadFullMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground mr-2" aria-hidden="true"></div>
                        <span>Downloading...</span>
                        <span className="sr-only">Downloading full file</span>
                      </>
                    ) : (
                      <>
                        <Download className="mr-2" size={16} aria-hidden="true" />
                        <span>Download Full File</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => downloadMetadataMutation.mutate(dataset.id)}
                    disabled={downloadMetadataMutation.isPending}
                    className="touch-target"
                    aria-label={`Download metadata file for ${dataset.name}`}
                  >
                    {downloadMetadataMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground mr-2" aria-hidden="true"></div>
                        <span>Downloading...</span>
                        <span className="sr-only">Downloading metadata file</span>
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2" size={16} aria-hidden="true" />
                        <span>Download Metadata</span>
                      </>
                    )}
                  </Button>
                  {/* <Button
                    variant="outline"
                    onClick={() => setIsChatOpen(true)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  >
                    <MessageCircle className="mr-2" size={16} />
                    Ask AI
                  </Button> */}
                </div>
                {userAiEnabled && insights && (
                  <Button
                    variant="secondary"
                    onClick={() => generateInsightsMutation.mutate()}
                    disabled={generateInsightsMutation.isPending}
                    className="bg-accent-500 hover:bg-accent-600 text-white"
                  >
                    {generateInsightsMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2" size={16} />
                        Refresh Insights
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Dataset Chat Modal */}
      {userAiEnabled && (
        <DatasetChat
          dataset={dataset}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </article>
  );
}