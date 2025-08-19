import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Document, User } from "@shared/schema";
import { useCommunityMemory } from "@/hooks/use-ai-assistant";

interface AiAssistantPanelProps {
  document: Document;
  onClose: () => void;
  onPremiumFeature: () => void;
  onTextUpdate?: (text: string) => void;
}

export default function AiAssistantPanel({
  document,
  onClose,
  onPremiumFeature,
  onTextUpdate
}: AiAssistantPanelProps) {
  const [selectedText, setSelectedText] = useState("");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastEnhancement, setLastEnhancement] = useState<string | null>(null);
  const [lastEnhancementData, setLastEnhancementData] = useState<any>(null);
  const [currentSuggestion, setCurrentSuggestion] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { recordInteraction } = useCommunityMemory();

  // Initialize position on mount
  useEffect(() => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setPosition({ 
        x: window.innerWidth - rect.width - 24, 
        y: 24 
      });
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // Don't drag when clicking buttons
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging && typeof window !== 'undefined') {
      const doc = window.document;
      doc.addEventListener('mousemove', handleMouseMove);
      doc.addEventListener('mouseup', handleMouseUp);
      return () => {
        doc.removeEventListener('mousemove', handleMouseMove);
        doc.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user/current"],
  });

  const enhanceTextMutation = useMutation({
    mutationFn: async (data: { text: string; enhancementType: string; documentId: string }) => {
      // Get current cursor position
      const selection = window.getSelection();
      let cursorPosition = 0;
      let isFromCursor = false;
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        cursorPosition = range.startOffset;
        isFromCursor = data.enhancementType === 'continue' || data.enhancementType === 'auto-complete';
      }

      const response = await apiRequest("POST", "/api/ai/enhance", {
        text: data.text,
        enhancementType: data.enhancementType,
        documentId: data.documentId,
        cursorPosition,
        isFromCursor
      });
      return response.json();
    },
    onSuccess: (data) => {
      setLastEnhancement(data.enhancedText);
      setLastEnhancementData(data);
      setShowFeedback(true);
      toast({
        title: "Text Enhanced",
        description: `Quality score: ${data.qualityScore}/10`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/current"] });
    },
    onError: (error: any) => {
      if (error.message.includes("Usage limit reached")) {
        onPremiumFeature();
      } else {
        toast({
          title: "Enhancement Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const handleEnhancement = (type: string) => {
    // Use selected text or document content
    const contextText = selectedText || document.content || "";
    
    enhanceTextMutation.mutate({ 
      text: contextText, 
      enhancementType: type,
      documentId: document.id
    });
  };

  const handleFeedback = async (rating: 'good' | 'ok' | 'poor' | 'decline') => {
    if (lastEnhancementData) {
      await recordInteraction(
        lastEnhancementData.agentType || 'writing-assistant',
        'text-enhancement',
        { text: selectedText || document.content, enhancementType: lastEnhancementData.enhancementType },
        { enhancedText: lastEnhancementData.enhancedText, qualityScore: lastEnhancementData.qualityScore },
        rating
      );
      
      setShowFeedback(false);
      toast({
        title: "Feedback Recorded",
        description: "Thank you! This helps improve our AI agents.",
      });
    }
  };

  const applyEnhancement = () => {
    if (lastEnhancement && onTextUpdate) {
      onTextUpdate(lastEnhancement);
      setLastEnhancement(null);
      toast({
        title: "Enhancement Applied",
        description: "The enhanced text has been applied to your document.",
      });
    }
  };

  const dismissSuggestion = () => {
    setCurrentSuggestion("");
    setLastEnhancement(null);
    setShowFeedback(false);
    toast({
      title: "Suggestion Dismissed",
      description: "The suggestion has been dismissed.",
    });
  };

  const usagePercentage = user ? (user.usageCount / user.maxUsage) * 100 : 0;

  return (
    <div 
      ref={panelRef}
      className="fixed w-80 bg-white rounded-lg shadow-lg border border-neutral-200 z-20 cursor-move overflow-hidden"
      style={{ 
        left: position.x, 
        top: position.y,
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        transition: isDragging ? 'none' : 'transform 0.2s ease',
        maxHeight: '80vh',
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="p-4 border-b border-neutral-200 select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-accent rounded flex items-center justify-center">
              <i className="fas fa-magic text-white text-xs"></i>
            </div>
            <h3 className="text-sm font-medium text-neutral-800">AI Writing Assistant</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <i className="fas fa-times text-sm"></i>
          </Button>
        </div>
      </div>
      
      <div className="p-4 space-y-4 overflow-y-auto max-h-96">
        {/* Current Suggestion */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center mt-0.5">
              <i className="fas fa-lightbulb text-white text-xs"></i>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-800 mb-1">Enhancement Suggestion</p>
              <p className="text-sm text-neutral-600 break-words">
                {lastEnhancement ? `Enhanced: ${lastEnhancement.substring(0, 100)}${lastEnhancement.length > 100 ? '...' : ''}` : (currentSuggestion || "Ready to enhance your text...")}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                {lastEnhancement ? (
                  <>
                    <Button
                      size="sm"
                      onClick={applyEnhancement}
                      className="text-xs"
                    >
                      Apply Enhancement
                    </Button>
                    {showFeedback && (
                      <div className="flex items-center space-x-1 ml-2">
                        <span className="text-xs text-neutral-500">Rate:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback('good')}
                          className="text-xs px-1 py-0 h-6 text-green-600 hover:text-green-700"
                          title="Good response"
                        >
                          <i className="fas fa-thumbs-up"></i>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback('ok')}
                          className="text-xs px-1 py-0 h-6 text-yellow-600 hover:text-yellow-700"
                          title="Okay response"
                        >
                          <i className="fas fa-meh"></i>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback('poor')}
                          className="text-xs px-1 py-0 h-6 text-red-600 hover:text-red-700"
                          title="Poor response"
                        >
                          <i className="fas fa-thumbs-down"></i>
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleEnhancement("clarity")}
                    disabled={enhanceTextMutation.isPending}
                    className="text-xs"
                  >
                    {enhanceTextMutation.isPending ? "Enhancing..." : "Enhance Text"}
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-xs" onClick={dismissSuggestion}>
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="text-sm font-medium text-neutral-700 mb-2">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEnhancement("continue")}
              disabled={enhanceTextMutation.isPending}
              className="p-2 h-auto flex flex-col items-center text-xs"
            >
              <i className="fas fa-plus-circle text-accent mb-1"></i>
              <span>Continue Writing</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEnhancement("polish")}
              disabled={enhanceTextMutation.isPending}
              className="p-2 h-auto flex flex-col items-center text-xs"
            >
              <i className="fas fa-edit text-primary mb-1"></i>
              <span>Polish Text</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEnhancement("auto-complete")}
              disabled={enhanceTextMutation.isPending}
              className="p-2 h-auto flex flex-col items-center text-xs"
            >
              <i className="fas fa-magic text-secondary mb-1"></i>
              <span>Auto-Complete</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEnhancement("market-insights")}
              disabled={enhanceTextMutation.isPending}
              className="p-2 h-auto flex flex-col items-center text-xs"
            >
              <i className="fas fa-chart-line text-orange-500 mb-1"></i>
              <span>Market Insights</span>
            </Button>
          </div>
        </div>

        {/* Feature Status - All Premium Features Unlocked */}
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <i className="fas fa-check text-white text-xs"></i>
            </div>
            <span className="text-sm font-medium text-green-800">All Features Unlocked</span>
          </div>
          <p className="text-xs text-green-700 break-words">
            Premium AI features are now available for unlimited use. Try Auto-Complete, Market Insights, and Coach features!
          </p>
        </div>
      </div>
    </div>
  );
}
