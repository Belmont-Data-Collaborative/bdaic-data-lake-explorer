import { Folder, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SkeletonFolderCardProps {
  index: number;
}

export function SkeletonFolderCard({ index }: SkeletonFolderCardProps) {
  const staggerClass = `stagger-${Math.min(index, 11)}`;
  
  return (
    <article className={`opacity-0 animate-slide-up ${staggerClass}`}>
      <Card className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-2 hover:border-blue-300 group touch-target">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              {/* Folder Icon Placeholder */}
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center shimmer">
                <Folder className="text-gray-400" size={24} />
              </div>
              
              <div className="flex-1 min-w-0">
                {/* Folder Name Placeholder */}
                <div className="mb-2">
                  <div className="h-6 bg-gray-200 rounded shimmer" style={{width: `${60 + Math.random() * 40}%`}}></div>
                </div>
                
                {/* Badges Placeholder */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <div className="h-6 w-20 bg-gray-200 rounded-full shimmer"></div>
                  <div className="h-6 w-16 bg-gray-200 rounded-full shimmer"></div>
                  <div className="h-6 w-24 bg-gray-200 rounded-full shimmer"></div>
                </div>
                
                {/* Format Badges Placeholder */}
                <div className="flex flex-wrap gap-1">
                  <div className="h-5 w-12 bg-gray-200 rounded shimmer"></div>
                  <div className="h-5 w-14 bg-gray-200 rounded shimmer"></div>
                  <div className="h-5 w-10 bg-gray-200 rounded shimmer"></div>
                </div>
              </div>
            </div>
            
            {/* Chevron Icon */}
            <ChevronRight 
              className="text-gray-300 flex-shrink-0 mt-1" 
              size={20} 
              aria-hidden="true" 
            />
          </div>
        </CardContent>
      </Card>
    </article>
  );
}