import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DocumentSidebar from "@/components/editor/document-sidebar";
import DocumentEditor from "@/components/editor/document-editor";
import AiAssistantPanel from "@/components/editor/ai-assistant-panel";
import InstructionPanel from "@/components/editor/instruction-panel";
import PremiumUpgradeModal from "@/components/modals/premium-upgrade-modal";
import { Document, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function EditorView() {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [aiAssistantVisible, setAiAssistantVisible] = useState(true);
  const [narrativeMode, setNarrativeMode] = useState("continue");
  const [documentContent, setDocumentContent] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [undoHistory, setUndoHistory] = useState<string[]>([]);
  const [redoHistory, setRedoHistory] = useState<string[]>([]);
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user/current"],
  });

  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: selectedDocument } = useQuery<Document>({
    queryKey: ["/api/documents", selectedDocumentId],
    enabled: !!selectedDocumentId,
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (newDoc: { title: string; content?: string }) => {
      const response = await apiRequest("POST", "/api/documents", newDoc);
      return response.json();
    },
    onSuccess: (newDocument: Document) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setSelectedDocumentId(newDocument.id);
      setDocumentTitle(newDocument.title);
      setDocumentContent(newDocument.content);
      toast({
        title: "Document created",
        description: "New document created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to create document: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async (updates: { title?: string; content?: string; wordCount?: number }) => {
      const response = await apiRequest("PATCH", `/api/documents/${selectedDocumentId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedDocumentId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to save document: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleDocumentSelect = (document: Document) => {
    setSelectedDocumentId(document.id);
    setDocumentTitle(document.title);
    setDocumentContent(document.content);
  };

  const handleNewDocument = () => {
    const newDocTitle = `Untitled Document ${(documents?.length || 0) + 1}`;
    createDocumentMutation.mutate({
      title: newDocTitle,
      content: "",
    });
  };

  const handlePremiumFeature = () => {
    // All features are now available - no premium locks
    toast({
      title: "Feature Available",
      description: "All AI features are now accessible!",
    });
  };

  const handleDocumentDeleted = () => {
    // Clear the selected document after deletion
    setSelectedDocumentId(null);
    setDocumentContent("");
    setDocumentTitle("");
    setLastSavedContent("");
    setSaveStatus("saved");
    setUndoHistory([]);
    setRedoHistory([]);
  };

  const saveDocument = useCallback((content: string, immediate = false) => {
    if (!selectedDocumentId) return; // No document selected
    if (content === lastSavedContent) return; // Already saved
    
    const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    setSaveStatus("saving");
    
    updateDocumentMutation.mutate(
      { content, wordCount },
      {
        onSuccess: () => {
          setLastSavedContent(content);
          setSaveStatus("saved");
        },
        onError: (error: Error) => {
          setSaveStatus("unsaved");
          toast({
            title: "Save failed",
            description: error.message || "Failed to save document",
            variant: "destructive",
          });
        },
      }
    );
  }, [selectedDocumentId, lastSavedContent, updateDocumentMutation, toast]);

  const handleContentChange = (content: string, skipHistory = false) => {
    // Add to undo history if this is a user action (not undo/redo)
    // Also check that content has actually changed
    if (!skipHistory && documentContent !== content) {
      // Only add to history if we have existing content (don't save empty initial states)
      if (documentContent.length > 0) {
        setUndoHistory(prev => [...prev.slice(-49), documentContent]); // Keep last 50 states
      }
      setRedoHistory([]); // Clear redo history on new change
    }
    
    setDocumentContent(content);
    setSaveStatus("unsaved");
    
    // Clear previous timeout
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }
    
    // Auto-save after 2 seconds of no typing
    autoSaveTimeout.current = setTimeout(() => {
      saveDocument(content);
    }, 2000);
  };

  const handleUndo = () => {
    if (undoHistory.length === 0) return;
    
    const previousState = undoHistory[undoHistory.length - 1];
    setRedoHistory(prev => [documentContent, ...prev.slice(0, 49)]);
    setUndoHistory(prev => prev.slice(0, -1));
    handleContentChange(previousState, true);
    
    toast({
      title: "Undone",
      description: "Last change has been undone",
    });
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    
    const nextState = redoHistory[0];
    setUndoHistory(prev => [...prev.slice(-49), documentContent]);
    setRedoHistory(prev => prev.slice(1));
    handleContentChange(nextState, true);
    
    toast({
      title: "Redone",
      description: "Change has been restored",
    });
  };

  const handleTitleChange = (title: string) => {
    setDocumentTitle(title);
    updateDocumentMutation.mutate({ title });
  };

  // Update local state when selected document changes
  useEffect(() => {
    if (selectedDocument) {
      setDocumentTitle(selectedDocument.title);
      setDocumentContent(selectedDocument.content);
      setLastSavedContent(selectedDocument.content);
      setSaveStatus("saved");
      // Reset undo/redo history when switching documents
      setUndoHistory([]);
      setRedoHistory([]);
    }
  }, [selectedDocument]);

  // Periodic auto-save every 30 seconds
  useEffect(() => {
    if (!selectedDocumentId) return;

    const interval = setInterval(() => {
      if (documentContent !== lastSavedContent) {
        saveDocument(documentContent);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [selectedDocumentId, documentContent, lastSavedContent, saveDocument]);

  // Save on page unload to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (documentContent !== lastSavedContent && selectedDocumentId) {
        // Attempt synchronous save
        saveDocument(documentContent, true);
        // Show browser warning
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [documentContent, lastSavedContent, selectedDocumentId, saveDocument]);

  // Add keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undoHistory, redoHistory, documentContent]);

  // Select first document by default
  if (documents && documents.length > 0 && !selectedDocumentId) {
    setSelectedDocumentId(documents[0].id);
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Document Sidebar */}
      <DocumentSidebar
        documents={documents || []}
        selectedDocumentId={selectedDocumentId}
        onDocumentSelect={handleDocumentSelect}
        onPremiumFeature={handlePremiumFeature}
        onNewDocument={handleNewDocument}
        isLoading={documentsLoading}
      />

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        <DocumentEditor
          document={selectedDocument}
          onAiAssistantToggle={() => setAiAssistantVisible(!aiAssistantVisible)}
          aiAssistantVisible={aiAssistantVisible}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={undoHistory.length > 0}
          canRedo={redoHistory.length > 0}
          saveStatus={saveStatus}
          onManualSave={() => saveDocument(documentContent, true)}
        />

        <div className="flex-1 flex">
          {/* Editor Content */}
          <div className="flex-1 relative">
            {selectedDocument ? (
              <div className="h-full p-6 overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                  <div className="prose prose-lg max-w-none">
                    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 min-h-[600px]">
                      {/* Document Title */}
                      <div className="mb-6">
                        <input
                          type="text"
                          value={documentTitle || ""}
                          onChange={(e) => handleTitleChange(e.target.value)}
                          className="text-2xl font-bold w-full border-none outline-none resize-none bg-transparent"
                          placeholder="Document title..."
                          data-testid="input-document-title"
                        />
                      </div>

                      {/* Content with AI suggestions */}
                      <div className="space-y-4 text-neutral-800 leading-relaxed prose-editor">
                        <textarea
                          value={documentContent || ""}
                          onChange={(e) => handleContentChange(e.target.value)}
                          className="min-h-[400px] w-full border-none outline-none resize-none bg-transparent text-base leading-relaxed"
                          placeholder="Start writing..."
                          data-testid="textarea-document-content"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <i className="fas fa-file-alt text-4xl text-neutral-300 mb-4"></i>
                  <p className="text-neutral-500">Select a document to start writing</p>
                </div>
              </div>
            )}

            {/* Floating AI Assistant Panel */}
            {aiAssistantVisible && selectedDocument && (
              <AiAssistantPanel
                document={selectedDocument}
                onClose={() => setAiAssistantVisible(false)}
                onPremiumFeature={handlePremiumFeature}
                onTextUpdate={(content) => {
                  handleContentChange(content);
                  // Immediate save after AI enhancement
                  setTimeout(() => saveDocument(content, true), 100);
                }}
                narrativeMode={narrativeMode}
              />
            )}
          </div>

          {/* Instruction Panel */}
          <InstructionPanel
            document={selectedDocument}
            onNarrativeModeChange={setNarrativeMode}
            onDocumentDeleted={handleDocumentDeleted}
          />
        </div>
      </div>

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />
    </div>
  );
}
