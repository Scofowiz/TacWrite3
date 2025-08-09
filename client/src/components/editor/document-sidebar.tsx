import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Document } from "@/types";

interface DocumentSidebarProps {
  documents: Document[];
  selectedDocumentId: string | null;
  onDocumentSelect: (document: Document) => void;
  onPremiumFeature: () => void;
  isLoading: boolean;
}

export default function DocumentSidebar({
  documents,
  selectedDocumentId,
  onDocumentSelect,
  onPremiumFeature,
  isLoading
}: DocumentSidebarProps) {
  
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (isLoading) {
    return (
      <div className="w-64 bg-white border-r border-neutral-200 flex flex-col">
        <div className="p-4 border-b border-neutral-200">
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-r border-neutral-200 flex flex-col">
      {/* Document List Header */}
      <div className="p-4 border-b border-neutral-200">
        <Button className="w-full" size="sm">
          <i className="fas fa-plus mr-2"></i>
          New Document
        </Button>
      </div>

      {/* Recent Documents */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4">
          <h3 className="text-sm font-medium text-neutral-600 mb-3">Recent Documents</h3>
          <div className="space-y-2">
            {documents.map((document) => (
              <div
                key={document.id}
                onClick={() => onDocumentSelect(document)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedDocumentId === document.id
                    ? "bg-primary/5 border border-primary/20"
                    : "bg-neutral-50 hover:bg-neutral-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">
                      {document.title}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {document.wordCount} words • {formatTimeAgo(document.lastModified)}
                    </p>
                  </div>
                  {selectedDocumentId === document.id && (
                    <div className="w-2 h-2 bg-primary rounded-full ml-2"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Agents */}
        <div className="p-4 border-t border-neutral-200">
          <h3 className="text-sm font-medium text-neutral-600 mb-3">AI Agents</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-accent/5 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-accent rounded flex items-center justify-center">
                  <i className="fas fa-magic text-white text-xs"></i>
                </div>
                <span className="text-sm text-neutral-700">Writing Assistant</span>
              </div>
              <div className="w-2 h-2 bg-accent rounded-full"></div>
            </div>
            
            <button
              onClick={onPremiumFeature}
              className="w-full flex items-center justify-between p-2 hover:bg-neutral-50 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-secondary rounded flex items-center justify-center">
                  <i className="fas fa-robot text-white text-xs"></i>
                </div>
                <span className="text-sm text-neutral-700">Autonomous Writer</span>
              </div>
              <i className="fas fa-crown text-secondary text-xs"></i>
            </button>

            <button
              onClick={onPremiumFeature}
              className="w-full flex items-center justify-between p-2 hover:bg-neutral-50 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                  <i className="fas fa-chart-line text-white text-xs"></i>
                </div>
                <span className="text-sm text-neutral-700">WFA Agent</span>
              </div>
              <i className="fas fa-crown text-secondary text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
