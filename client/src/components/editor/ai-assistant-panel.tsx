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
  narrativeMode?: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export default function AiAssistantPanel({
  document,
  onClose,
  onPremiumFeature,
  onTextUpdate,
  narrativeMode = "continue"
}: AiAssistantPanelProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<'chat' | 'actions'>('actions');
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  
  // Existing state
  const [selectedText, setSelectedText] = useState("");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastEnhancement, setLastEnhancement] = useState<string | null>(null);
  const [lastEnhancementData, setLastEnhancementData] = useState<any>(null);
  const [currentSuggestion, setCurrentSuggestion] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [processNotes, setProcessNotes] = useState<string | null>(null); // Separate meta-content
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
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

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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
    mutationFn: async (data: { text: string; enhancementType: string; documentId: string; useStreaming?: boolean }) => {
      // Get current cursor position and context from the textarea
      let cursorPosition = 0;
      let contextAfter = "";
      let isFromCursor = data.enhancementType === 'continue' || data.enhancementType === 'auto-complete';

      // Find the textarea element to get accurate cursor position and bidirectional context
      const textarea = window.document.querySelector('[data-testid="textarea-document-content"]') as HTMLTextAreaElement;
      if (textarea && isFromCursor) {
        cursorPosition = textarea.selectionStart;
        // Get text AFTER cursor for bidirectional awareness
        contextAfter = textarea.value.substring(cursorPosition, cursorPosition + 400);
      }

      // Use streaming for continue/auto-complete, regular for others
      if (data.useStreaming && isFromCursor) {
        return { useStreaming: true, cursorPosition, contextAfter, isFromCursor };
      }

      // Get current provider from localStorage
      const provider = localStorage.getItem('ai-provider-preference') || 'gemini';
      
      const response = await apiRequest("POST", "/api/ai/enhance", {
        text: data.text,
        enhancementType: data.enhancementType,
        documentId: data.documentId,
        cursorPosition,
        isFromCursor,
        contextAfter, // Send text after cursor for bidirectional awareness
        provider // Include provider selection
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.useStreaming) {
        // Handle streaming separately
        handleStreamingEnhancement(data);
        return;
      }
      setLastEnhancement(data.enhancedText);
      setLastEnhancementData(data);
      // Store process notes separately - NOT for document insertion
      if (data.processNotes) {
        setProcessNotes(data.processNotes);
      }
      setShowFeedback(true);
      toast({
        title: "Text Enhanced",
        description: `Quality score: ${data.qualityScore}/10${data.hasBidirectionalContext ? ' (cursor-aware)' : ''}`,
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

  // Streaming enhancement handler
  const handleStreamingEnhancement = async (config: { cursorPosition: number; contextAfter: string; isFromCursor: boolean }) => {
    setIsStreaming(true);
    setStreamedText("");

    try {
      const textarea = window.document.querySelector('[data-testid="textarea-document-content"]') as HTMLTextAreaElement;
      const text = textarea?.value || document.content || "";

      // Get current provider from localStorage
      const provider = localStorage.getItem('ai-provider-preference') || 'gemini';
      
      const response = await fetch('/api/ai/enhance/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          enhancementType: 'continue',
          documentId: document.id,
          cursorPosition: config.cursorPosition,
          isFromCursor: config.isFromCursor,
          contextAfter: config.contextAfter,
          provider // Include provider selection
        }),
        credentials: 'include'
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

          for (const line of lines) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.chunk) {
                setStreamedText(prev => prev + data.chunk);
              }
              if (data.done) {
                setLastEnhancement(data.fullText);
                setLastEnhancementData({
                  ...data,
                  enhancedText: data.fullText,
                  cursorPosition: config.cursorPosition,
                  isFromCursor: config.isFromCursor
                });
                setShowFeedback(true);
              }
            } catch (e) {
              // Ignore parse errors for partial data
            }
          }
        }
      }
    } catch (error) {
      toast({
        title: "Streaming Failed",
        description: "Could not stream response",
        variant: "destructive"
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleEnhancement = (type: string, useStreaming = false) => {
    // Priority: 1) Selected text, 2) Last 1000 chars, 3) Document content
    let contextText = selectedText;
    
    if (!contextText || contextText.trim().length === 0) {
      const fullContent = document.content || "";
      // Default to last 1000 characters if no selection
      if (fullContent.length > 1000) {
        contextText = fullContent.slice(-1000);
      } else {
        contextText = fullContent;
      }
    }
    
    // Clear previous process notes
    setProcessNotes(null);

    enhanceTextMutation.mutate({
      text: contextText,
      enhancementType: type,
      documentId: document.id,
      useStreaming
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
    if (lastEnhancement && onTextUpdate && lastEnhancementData) {
      // Get the textarea to refresh current content
      const textarea = window.document.querySelector('[data-testid="textarea-document-content"]') as HTMLTextAreaElement;
      const currentContent = textarea?.value || document?.content || '';
      
      // Check if this was a cursor-aware continuation
      if (lastEnhancementData.isFromCursor && lastEnhancementData.cursorPosition !== undefined) {
        // Use the stored cursor position from when the enhancement was requested
        const cursorPos = lastEnhancementData.cursorPosition;
        
        // Insert the enhancement at cursor position without overwriting
        const beforeCursor = currentContent.substring(0, cursorPos);
        const afterCursor = currentContent.substring(cursorPos);
        const newContent = beforeCursor + lastEnhancement + afterCursor;
        
        onTextUpdate(newContent);
        
        // Set cursor position after the inserted text
        if (textarea) {
          setTimeout(() => {
            const newCursorPos = cursorPos + lastEnhancement.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            textarea.focus();
          }, 10);
        }
      } else if (selectedText && currentContent.includes(selectedText)) {
        // Replace only the selected text, preserving the rest
        const newContent = currentContent.replace(selectedText, lastEnhancement);
        onTextUpdate(newContent);
      } else {
        // Fallback: append or replace based on enhancement type
        // For analysis/suggestions, don't replace the entire content
        if (lastEnhancementData.enhancementType?.includes('analyze') || 
            lastEnhancementData.enhancementType?.includes('suggestion')) {
          // Don't replace content for analytical enhancements
          toast({
            title: "Analysis Complete",
            description: "Review the suggestions without modifying your content.",
          });
        } else {
          // For other enhancements, use the enhanced text
          onTextUpdate(lastEnhancement);
        }
      }
      
      setLastEnhancement(null);
      setLastEnhancementData(null);
      toast({
        title: "Enhancement Applied",
        description: lastEnhancementData.isFromCursor 
          ? "Text continuation added at cursor position." 
          : "The enhanced text has been applied to your document.",
      });
    }
  };

  const dismissSuggestion = () => {
    setCurrentSuggestion("");
    setLastEnhancement(null);
    setShowFeedback(false);
    setProcessNotes(null);
    setStreamedText("");
    setIsStreaming(false);
    toast({
      title: "Suggestion Dismissed",
      description: "The suggestion has been dismissed.",
    });
  };

  // Chat handlers
  const handleChatSubmit = (message?: string) => {
    const messageText = message || chatInput.trim();
    if (!messageText) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");

    // Add AI "thinking" message
    const aiMessage: ChatMessage = {
      role: 'ai',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    setChatMessages(prev => [...prev, aiMessage]);

    // Trigger enhancement (reuse existing mutation)
    enhanceTextMutation.mutate({
      text: selectedText || document.content || '',
      enhancementType: messageText, // Use the chat message as the enhancement type
      documentId: document.id,
      useStreaming: true
    });
  };

  const handleQuickAction = (type: string) => {
    // Quick actions can optionally add to chat
    if (activeTab === 'chat') {
      const actionMessage = `[Quick Action: ${type}]`;
      handleChatSubmit(actionMessage);
    } else {
      // Original behavior
      handleEnhancement(type, false);
    }
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
        <div className="flex items-center justify-between mb-3">
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
        
        {/* Tab Navigation */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'chat' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('chat')}
            className="flex-1 text-xs"
          >
            <i className="fas fa-comments mr-1"></i>
            Chat
          </Button>
          <Button
            variant={activeTab === 'actions' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('actions')}
            className="flex-1 text-xs"
          >
            <i className="fas fa-bolt mr-1"></i>
            Quick Actions
          </Button>
        </div>
      </div>
      
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 200px)' }}>
        {activeTab === 'chat' ? (
          /* Chat Interface */
          <div className="flex flex-col h-full">
            {/* Chat Messages */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {chatMessages.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-sm">
                  <i className="fas fa-comments text-3xl mb-2"></i>
                  <p>Start a conversation with AI</p>
                  <p className="text-xs mt-1">Ask questions, request edits, or brainstorm ideas</p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-accent text-white'
                          : 'bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      {msg.isStreaming && !msg.content ? (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}
                      <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-white/70' : 'text-neutral-500'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-neutral-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={enhanceTextMutation.isPending || isStreaming}
                />
                <Button
                  size="sm"
                  onClick={() => handleChatSubmit()}
                  disabled={!chatInput.trim() || enhanceTextMutation.isPending || isStreaming}
                >
                  <i className="fas fa-paper-plane"></i>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Quick Actions Interface (existing) */
          <div className="p-4 space-y-4">
        {/* Context Indicator */}
        {(() => {
          const hasSelection = selectedText && selectedText.trim().length > 0;
          const contextLength = hasSelection ? selectedText.length : Math.min(document.content?.length || 0, 1000);
          const contextType = hasSelection ? "Selected text" : "Last 1000 chars";
          
          if (contextLength > 0) {
            return (
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">
                    <i className={`fas ${hasSelection ? 'fa-i-cursor' : 'fa-file-alt'} mr-1`}></i>
                    {contextType}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {contextLength} chars
                  </Badge>
                </div>
              </div>
            );
          }
          return null;
        })()}
        
        {/* Streaming Preview */}
        {isStreaming && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-blue-800">Streaming...</span>
            </div>
            <p className="text-sm text-blue-700 break-words max-h-32 overflow-y-auto">
              {streamedText || "Waiting for response..."}
            </p>
          </div>
        )}

        {/* Process Notes - Shown separately from document content */}
        {processNotes && !isStreaming && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <i className="fas fa-brain text-amber-600 text-xs"></i>
              <span className="text-xs font-medium text-amber-800">AI Analysis (not in document)</span>
            </div>
            <p className="text-xs text-amber-700 break-words max-h-24 overflow-y-auto">
              {processNotes}
            </p>
          </div>
        )}

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
                    disabled={enhanceTextMutation.isPending || isStreaming}
                    className="text-xs"
                  >
                    {enhanceTextMutation.isPending || isStreaming ? "Enhancing..." : "Enhance Text"}
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-xs" onClick={dismissSuggestion}>
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Narrative Mode Actions */}
        <div>
          <h4 className="text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
            <i className="fas fa-brain text-accent"></i>
            Narrative Mode: <span className="text-accent capitalize">{narrativeMode}</span>
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {narrativeMode === "continue" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhancement("continue", true)}
                  disabled={enhanceTextMutation.isPending || isStreaming}
                  className="p-2 h-auto flex flex-col items-center text-xs"
                >
                  <span className="mb-1">→</span>
                  <span>Continue Story</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhancement("auto-complete", true)}
                  disabled={enhanceTextMutation.isPending || isStreaming}
                  className="p-2 h-auto flex flex-col items-center text-xs"
                >
                  <i className="fas fa-pen-fancy text-secondary mb-1"></i>
                  <span>Auto-Complete</span>
                </Button>
              </>
            )}
            
            {narrativeMode === "branch" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhancement("branch-explore", true)}
                  disabled={enhanceTextMutation.isPending || isStreaming}
                  className="p-2 h-auto flex flex-col items-center text-xs"
                >
                  <span className="mb-1">↳</span>
                  <span>Explore Path</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhancement("alternate-ending", true)}
                  disabled={enhanceTextMutation.isPending || isStreaming}
                  className="p-2 h-auto flex flex-col items-center text-xs"
                >
                  <i className="fas fa-code-branch text-purple-500 mb-1"></i>
                  <span>Alt. Ending</span>
                </Button>
              </>
            )}
            
            {narrativeMode === "deepen" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhancement("add-depth", false)}
                  disabled={enhanceTextMutation.isPending || isStreaming}
                  className="p-2 h-auto flex flex-col items-center text-xs"
                >
                  <span className="mb-1">⤨</span>
                  <span>Add Depth</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhancement("internal-monologue", false)}
                  disabled={enhanceTextMutation.isPending || isStreaming}
                  className="p-2 h-auto flex flex-col items-center text-xs"
                >
                  <i className="fas fa-brain text-indigo-500 mb-1"></i>
                  <span>Inner Thoughts</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhancement("sensory-details", false)}
                  disabled={enhanceTextMutation.isPending || isStreaming}
                  className="p-2 h-auto flex flex-col items-center text-xs"
                >
                  <i className="fas fa-eye text-teal-500 mb-1"></i>
                  <span>Sensory Details</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhancement("world-building", false)}
                  disabled={enhanceTextMutation.isPending || isStreaming}
                  className="p-2 h-auto flex flex-col items-center text-xs"
                >
                  <i className="fas fa-globe text-green-500 mb-1"></i>
                  <span>World-Building</span>
                </Button>
              </>
            )}
            
            {narrativeMode === "transform" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhancement("transform-noir", false)}
                  disabled={enhanceTextMutation.isPending || isStreaming}
                  className="p-2 h-auto flex flex-col items-center text-xs"
                >
                  <span className="mb-1">⟲</span>
                  <span>Noir Style</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhancement("transform-stage-play", false)}
                  disabled={enhanceTextMutation.isPending || isStreaming}
                  className="p-2 h-auto flex flex-col items-center text-xs"
                >
                  <i className="fas fa-theater-masks text-pink-500 mb-1"></i>
                  <span>Stage Play</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhancement("transform-news", false)}
                  disabled={enhanceTextMutation.isPending || isStreaming}
                  className="p-2 h-auto flex flex-col items-center text-xs"
                >
                  <i className="fas fa-newspaper text-blue-500 mb-1"></i>
                  <span>News Report</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhancement("transform-poetry", false)}
                  disabled={enhanceTextMutation.isPending || isStreaming}
                  className="p-2 h-auto flex flex-col items-center text-xs"
                >
                  <i className="fas fa-feather text-purple-500 mb-1"></i>
                  <span>Poetry</span>
                </Button>
              </>
            )}
            
            {narrativeMode === "analyze" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhancement("analyze-theme", false)}
                  disabled={enhanceTextMutation.isPending || isStreaming}
                  className="p-2 h-auto flex flex-col items-center text-xs"
                >
                  <span className="mb-1">🔍</span>
                  <span>Theme Analysis</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhancement("analyze-pacing", false)}
                  disabled={enhanceTextMutation.isPending || isStreaming}
                  className="p-2 h-auto flex flex-col items-center text-xs"
                >
                  <i className="fas fa-tachometer-alt text-orange-500 mb-1"></i>
                  <span>Pacing</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhancement("analyze-character", false)}
                  disabled={enhanceTextMutation.isPending || isStreaming}
                  className="p-2 h-auto flex flex-col items-center text-xs"
                >
                  <i className="fas fa-user text-blue-500 mb-1"></i>
                  <span>Character</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhancement("analyze-style", false)}
                  disabled={enhanceTextMutation.isPending || isStreaming}
                  className="p-2 h-auto flex flex-col items-center text-xs"
                >
                  <i className="fas fa-palette text-pink-500 mb-1"></i>
                  <span>Prose Style</span>
                </Button>
              </>
            )}
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
        )}
      </div>
    </div>
  );
}
