import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Document } from "@/types";
import { AIProviderSelector, AIProvider } from "@/components/layout/ai-provider-selector";
import VersionHistoryModal from "./version-history-modal";
import { useState, useEffect } from "react";

interface DocumentEditorProps {
  document?: Document;
  onAiAssistantToggle: () => void;
  aiAssistantVisible: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  saveStatus?: "saved" | "saving" | "unsaved";
  onManualSave?: () => void;
}

export default function DocumentEditor({
  document,
  onAiAssistantToggle,
  aiAssistantVisible,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  saveStatus = "saved",
  onManualSave
}: DocumentEditorProps) {
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  
  // Initialize from localStorage to persist user's provider preference
  const [currentProvider, setCurrentProvider] = useState<AIProvider>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ai-provider-preference');
      if (saved && ['gemini', 'kimiki2'].includes(saved)) {
        return saved as AIProvider;
      }
    }
    return 'gemini';
  });

  // Sync with localStorage changes from other components
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('ai-provider-preference');
      if (saved && saved !== currentProvider) {
        setCurrentProvider(saved as AIProvider);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentProvider]);
  
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
          {/* Save Status Indicator */}
          <div className="flex items-center space-x-2 text-sm text-neutral-600">
            {saveStatus === "saved" && (
              <>
                <i className="fas fa-check-circle text-green-500"></i>
                <span>Saved</span>
              </>
            )}
            {saveStatus === "saving" && (
              <>
                <i className="fas fa-circle-notch fa-spin text-blue-500"></i>
                <span>Saving...</span>
              </>
            )}
            {saveStatus === "unsaved" && (
              <>
                <i className="fas fa-exclamation-circle text-amber-500"></i>
                <span>Unsaved</span>
                {onManualSave && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onManualSave}
                    className="ml-1 text-xs"
                  >
                    Save Now
                  </Button>
                )}
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-1 border-l border-neutral-200 pl-3">
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
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowVersionHistory(true)}
          >
            <i className="fas fa-history mr-2"></i>
            Version History
          </Button>
          <Button size="sm">
            <i className="fas fa-download mr-2"></i>
            Export
          </Button>
          <AIProviderSelector
            currentProvider={currentProvider}
            onProviderChange={setCurrentProvider}
          />
        </div>
      </div>

      {/* Version History Modal */}
      {document && (
        <VersionHistoryModal
          documentId={document.id}
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
    </div>
  );
}
