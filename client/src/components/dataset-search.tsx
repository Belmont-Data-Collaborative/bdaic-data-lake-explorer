import { useState } from "react";
import { Search, Brain, FileText, Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface SearchResult {
  id: number;
  name: string;
  relevanceScore: number;
  overview: string;
  matchReason: string;
}

interface DatasetSearchProps {
  onSelectDataset?: (datasetId: number) => void;
}

export function DatasetSearch({ onSelectDataset }: DatasetSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const response = await apiRequest("POST", "/api/datasets/search", { query: searchQuery });
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      setResults(data.results || []);
    },
    onError: (error) => {
      console.error("Search failed:", error);
      setResults([]);
    },
  });

  const handleSearch = () => {
    if (query.trim()) {
      searchMutation.mutate(query.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelectDataset = (datasetId: number) => {
    onSelectDataset?.(datasetId);
    // Close the dialog and show the selected dataset
    setIsOpen(false);
    setQuery("");
    setResults([]);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (score >= 60) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Brain className="h-4 w-4" />
          Find Dataset
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Find Dataset by Topic
          </DialogTitle>
          <DialogDescription>
            Describe what you're looking for and AI will find the most relevant datasets from your data lake.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-2 py-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Describe what you're looking for (e.g., 'food insecurity rates', 'climate data', 'demographics')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
              disabled={searchMutation.isPending}
            />
          </div>
          <Button 
            onClick={handleSearch} 
            disabled={!query.trim() || searchMutation.isPending}
            className="gap-2"
          >
            {searchMutation.isPending ? (
              <>
                <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search
              </>
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {searchMutation.isPending && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!searchMutation.isPending && results.length === 0 && query && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No matches found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or using different keywords to describe the data you're looking for.
              </p>
            </div>
          )}

          {!searchMutation.isPending && results.length === 0 && !query && (
            <div className="text-center py-12">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">AI-Powered Dataset Discovery</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Describe what kind of data you're looking for and our AI will find the most relevant datasets from your data lake.
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4" />
                Found {results.length} relevant dataset{results.length !== 1 ? 's' : ''}
              </div>
              
              {results.map((result) => (
                <Card 
                  key={result.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-transparent hover:border-l-blue-500"
                  onClick={() => handleSelectDataset(result.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg truncate flex items-center gap-2">
                          {result.name}
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </CardTitle>
                        <CardDescription className="mt-1">{result.matchReason}</CardDescription>
                      </div>
                      <Badge className={`ml-2 ${getScoreColor(result.relevanceScore)}`}>
                        {result.relevanceScore}% match
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {result.overview}
                    </p>
                    <p className="text-xs text-blue-600 mt-2 font-medium">
                      Click to view dataset details →
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}