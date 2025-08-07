import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatasetCard } from "./dataset-card";
import { MultiDatasetChat } from "./multi-dataset-chat";
import { useMultiSelect } from "@/hooks/use-multi-select";
import {
  CheckSquare,
  Square,
  X,
  MessageCircle,
  CheckCheck
} from "lucide-react";
import type { Dataset } from "@shared/schema";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

interface DatasetListProps {
  datasets: Dataset[];
  isLoading: boolean;
  selectedDatasetId?: number | null;
  showPagination?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  currentFolder?: string | null;
  userAiEnabled?: boolean;
}

export function DatasetList({
  datasets,
  isLoading,
  selectedDatasetId,
  showPagination = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  currentFolder = null,
  userAiEnabled = false
}: DatasetListProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const multiSelect = useMultiSelect<number>();

  const selectedDatasets = datasets.filter(dataset =>
    multiSelect.isSelected(dataset.id)
  );

  const handleDatasetClick = (dataset: Dataset, event: React.MouseEvent) => {
    if (multiSelect.isSelectionMode) {
      event.preventDefault();
      event.stopPropagation();
      multiSelect.toggleSelection(dataset.id);
    }
  };

  const handleSelectAll = () => {
    if (multiSelect.selectedCount === datasets.length) {
      multiSelect.clearSelection();
    } else {
      multiSelect.selectAll(datasets.map(d => d.id));
    }
  };

  const handleAskAI = () => {
    if (selectedDatasets.length > 0) {
      setIsChatOpen(true);
    }
  };

  const handleClearSelection = () => {
    multiSelect.clearSelection();
  };

  if (isLoading) {
    return (
      <div className="space-y-4" aria-live="polite" aria-label="Loading datasets">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl shadow-sm border border-border p-6">
            <div className="animate-pulse flex space-x-4">
              <div className="w-10 h-10 bg-muted rounded-lg" aria-hidden="true"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" aria-hidden="true"></div>
                <div className="h-3 bg-muted rounded w-1/2" aria-hidden="true"></div>
              </div>
            </div>
          </div>
        ))}
        <span className="sr-only">Loading datasets, please wait...</span>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-8 text-center" role="status" aria-live="polite">
        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4" aria-hidden="true">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-1 1m0 0l-1 1m2-2h2M9 7l1 1m0 0l1 1M7 7h2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No datasets found</h3>
        <p className="text-muted-foreground mb-4">
          Configure your AWS S3 settings and refresh to load datasets from your bucket.
        </p>
      </div>
    );
  }

  return (
    <>
      <section className="space-y-4" role="main" aria-label={`${datasets.length} datasets`}>
        {/* Multi-select controls - only show if AI is enabled */}
        {userAiEnabled && (
          <div className="flex items-center justify-between bg-card rounded-lg border border-border p-3">
            <div className="flex items-center space-x-3">
              <Button
                variant={multiSelect.isSelectionMode ? "default" : "outline"}
                size="sm"
                onClick={multiSelect.toggleSelectionMode}
                className="flex items-center space-x-2"
              >
                {multiSelect.isSelectionMode ? (
                  <>
                    <X className="h-4 w-4" />
                    <span>Exit Selection</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    <span>Select Multiple</span>
                  </>
                )}
              </Button>

              {multiSelect.isSelectionMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="flex items-center space-x-2"
                  >
                    <CheckCheck className="h-4 w-4" />
                    <span>
                      {multiSelect.selectedCount === datasets.length ? 'Deselect All' : 'Select All'}
                    </span>
                  </Button>

                  {multiSelect.selectedCount > 0 && (
                    <Badge variant="secondary" className="px-2 py-1">
                      {multiSelect.selectedCount} selected
                    </Badge>
                  )}
                </>
              )}
            </div>

            {multiSelect.selectedCount > 0 && (
              <Button
                onClick={handleAskAI}
                className="flex items-center space-x-2"
                disabled={multiSelect.selectedCount === 0}
              >
                <MessageCircle className="h-4 w-4" />
                <span>Ask AI ({multiSelect.selectedCount})</span>
              </Button>
            )}
          </div>
        )}

        <h2 className="sr-only">Dataset Results</h2>
        {datasets.map((dataset, index) => (
          <div key={dataset.id} className="relative">
            {/* Selection overlay - only show if AI is enabled */}
            {userAiEnabled && multiSelect.isSelectionMode && (
              <div
                className="absolute top-4 left-4 z-10 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  multiSelect.toggleSelection(dataset.id);
                }}
              >
                {multiSelect.isSelected(dataset.id) ? (
                  <CheckSquare className="h-5 w-5 text-primary bg-background rounded border-2 border-primary" />
                ) : (
                  <Square className="h-5 w-5 text-muted-foreground bg-background rounded border-2 border-muted-foreground hover:border-primary hover:text-primary transition-colors" />
                )}
              </div>
            )}
            <DatasetCard
              dataset={dataset}
              initiallyOpen={selectedDatasetId === dataset.id}
              isSelectionMode={multiSelect.isSelectionMode}
              isSelected={multiSelect.isSelected(dataset.id)}
              onSelectionClick={(e) => handleDatasetClick(dataset, e)}
              userAiEnabled={userAiEnabled}
              currentFolder={currentFolder}
            />
          </div>
        ))}
      </section>

      {userAiEnabled && (
        <MultiDatasetChat
          datasets={selectedDatasets}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          currentFolder={currentFolder}
        />
      )}
    </>
  );
}