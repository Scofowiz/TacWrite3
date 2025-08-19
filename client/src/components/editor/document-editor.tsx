import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Document } from "@/types";

interface DocumentEditorProps {
  document?: Document;
  onAiAssistantToggle: () => void;
  aiAssistantVisible: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export default function DocumentEditor({
  document,
  onAiAssistantToggle,
  aiAssistantVisible,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}: DocumentEditorProps) {
  
  if (!document) {
    return null;
  }

  const formatTimeAgo = (date: Date) => {
    const diffMs = Date.now() - new Date(date).getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    const diffMins = Math.floor(diffSecs / 60);
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="bg-white border-b border-neutral-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-800">{document.title}</h1>
          <div className="flex items-center space-x-4 mt-1 text-sm text-neutral-500">
            <span>{document.wordCount} words</span>
            <span>•</span>
            <span>Auto-saved {formatTimeAgo(document.lastModified)}</span>
            <span>•</span>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${document.aiAssistantActive ? 'bg-accent' : 'bg-neutral-300'}`}></div>
              <span>AI Assistant {document.aiAssistantActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 border-r border-neutral-200 pr-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onUndo}
              disabled={!canUndo}
              data-testid="button-undo"
            >
              <i className="fas fa-undo mr-1"></i>
              Undo
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onRedo}
              disabled={!canRedo}
              data-testid="button-redo"
            >
              <i className="fas fa-redo mr-1"></i>
              Redo
            </Button>
          </div>
          <Button variant="ghost" size="sm">
            <i className="fas fa-share-alt mr-2"></i>
            Share
          </Button>
          <Button variant="ghost" size="sm">
            <i className="fas fa-history mr-2"></i>
            Version History
          </Button>
          <Button size="sm">
            <i className="fas fa-download mr-2"></i>
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}
