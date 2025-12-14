import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Document, User } from "@shared/schema";
import { useCommunityMemory } from "@/hooks/use-ai-assistant";
import { ContentUpdateMeta } from "@/context/undo-redo-context";

interface AiAssistantPanelProps {
  document: Document;
  onClose: () => void;
  onPremiumFeature: () => void;
  onTextUpdate?: (text: string, meta?: ContentUpdateMeta | null) => void;
  narrativeMode?: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

type EnhancementTracking = Record<string, any> & {
  enhancedText: string;
  enhancementType?: string;
  cursorPosition?: number;
  selectionStart?: number;
  selectionEnd?: number;
  originalSelection?: string | null;
  isFromCursor?: boolean;
};

interface EnhancementRequest {
  text: string;
  enhancementType: string;
  documentId: string;
  useStreaming?: boolean;
  selectionStart?: number;
  selectionEnd?: number;
  originalSelection?: string | null;
  cursorPosition?: number;
  conversationHistory?: ChatMessage[];
}

const ANALYTICS_PREFIXES = [
  /^(analysis|process|reflection|reasoning|critique|quality score|score|metrics|insight|notes?)[\s:]/i,
  /^\s*(step|phase|round)\s*\d+/i,
  /^\s*plan\s*:/i,
  /^\s*final answer[:\-]/i,
  /^\s*system diagnostics/i,
];

const stripCodeFences = (input: string) => input.replace(/```[\s\S]*?```/g, "");

const sanitizeEnhancedText = (input: string) => {
  if (!input) return "";
  const withoutFences = stripCodeFences(input).replace(/\uFEFF/g, "");
  const lines = withoutFences.split(/\r?\n/);
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    return !ANALYTICS_PREFIXES.some((regex) => regex.test(trimmed));
  });
  return filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

const trimContinuationPrefix = (insertion: string, beforeContext: string) => {
  if (!insertion || !beforeContext) return insertion;
  const windowText = beforeContext.slice(-200);
  const normalizedInsertion = insertion.replace(/\s+/g, " ").toLowerCase();
  for (let length = Math.min(windowText.length, 120); length >= 30; length -= 10) {
    const suffix = windowText.slice(-length);
    const normalizedSuffix = suffix.replace(/\s+/g, " ").toLowerCase();
    if (normalizedSuffix && normalizedInsertion.startsWith(normalizedSuffix)) {
      return insertion.slice(suffix.length).trimStart();
    }
  }
  return insertion;
};

const trimSelectionPrefix = (insertion: string, selection: string | null) => {
  if (!insertion || !selection) return insertion;
  const normalizedSelection = selection.replace(/\s+/g, " ").toLowerCase().trim();
  if (!normalizedSelection) return insertion;
  const normalizedInsertion = insertion.replace(/\s+/g, " ").toLowerCase();
  if (normalizedInsertion === normalizedSelection) {
    return "";
  }
  if (normalizedInsertion.startsWith(normalizedSelection) && insertion.length > selection.length) {
    return insertion.slice(selection.length).trimStart();
  }
  return insertion;
};

export default function AiAssistantPanel({
  document,
  onClose,
  onPremiumFeature,
  onTextUpdate,
  narrativeMode = "continue"
}: AiAssistantPanelProps) {
  // Panel mode state
  const [panelMode, setPanelMode] = useState<'normal' | 'minimized' | 'expanded' | 'lens'>('normal');
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'chat' | 'actions'>('actions');
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [useChatContext, setUseChatContext] = useState(true); // Toggle for using chat as context
  
  // Existing state
  const [selectedText, setSelectedText] = useState("");
  const [lastSelectionRange, setLastSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [lastCursorPosition, setLastCursorPosition] = useState<number | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastEnhancement, setLastEnhancement] = useState<string | null>(null);
  const [lastEnhancementData, setLastEnhancementData] = useState<EnhancementTracking | null>(null);
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

  useEffect(() => {
    const textarea = window.document.querySelector('[data-testid="textarea-document-content"]') as HTMLTextAreaElement | null;
    if (!textarea) {
      setSelectedText("");
      setLastSelectionRange(null);
      setLastCursorPosition(null);
      return;
    }

    const updateSelection = () => {
      const start = textarea.selectionStart ?? 0;
      const end = textarea.selectionEnd ?? start;
      const value = textarea.value ?? "";

      setLastCursorPosition(end);
      if (start !== end) {
        setSelectedText(value.substring(start, end));
        setLastSelectionRange({ start, end });
      } else {
        setSelectedText("");
        setLastSelectionRange({ start, end });
      }
    };

    updateSelection();

    textarea.addEventListener('select', updateSelection);
    textarea.addEventListener('keyup', updateSelection);
    textarea.addEventListener('mouseup', updateSelection);
    textarea.addEventListener('input', updateSelection);

    return () => {
      textarea.removeEventListener('select', updateSelection);
      textarea.removeEventListener('keyup', updateSelection);
      textarea.removeEventListener('mouseup', updateSelection);
      textarea.removeEventListener('input', updateSelection);
    };
  }, [document.id]);

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

  const enhanceTextMutation = useMutation<any, Error, EnhancementRequest>({
    mutationFn: async (request) => {
      const provider = localStorage.getItem('ai-provider-preference') || 'gemini';
      const supportsStreaming = provider === 'gemini';

      const textarea = window.document.querySelector('[data-testid="textarea-document-content"]') as HTMLTextAreaElement | null;

      const selectionStart = typeof request.selectionStart === 'number'
        ? request.selectionStart
        : (textarea?.selectionStart ?? lastSelectionRange?.start ?? lastCursorPosition ?? 0);

      const selectionEnd = typeof request.selectionEnd === 'number'
        ? request.selectionEnd
        : (textarea?.selectionEnd ?? lastSelectionRange?.end ?? lastCursorPosition ?? selectionStart);

      const cursorPosition = typeof request.cursorPosition === 'number' ? request.cursorPosition : selectionEnd;

      const requestedSelection = request.originalSelection ?? (
        selectionStart !== selectionEnd
          ? (textarea ? textarea.value.substring(selectionStart, selectionEnd) : selectedText || null)
          : null
      );
      const originalSelection = requestedSelection && requestedSelection.length > 0 ? requestedSelection : null;

      let contextAfter = "";
      let contextText = request.text?.trim()?.length ? request.text : "";
      const isFromCursor = request.enhancementType === 'continue' || request.enhancementType === 'auto-complete';

      if (textarea) {
        if (isFromCursor) {
          contextAfter = textarea.value.substring(selectionEnd, selectionEnd + 400);
          if (!contextText) {
            const beforeSlice = textarea.value.substring(Math.max(0, selectionEnd - 1000), selectionEnd);
            contextText = beforeSlice || textarea.value;
          }
        } else if (!contextText && selectionStart !== selectionEnd) {
          contextText = textarea.value.substring(selectionStart, selectionEnd);
        }
      }

      if (!contextText) {
        const fallbackSource = document.content || '';
        if (isFromCursor) {
          contextText = fallbackSource.slice(-1000) || fallbackSource;
          if (!contextAfter) {
            contextAfter = fallbackSource.substring(cursorPosition, cursorPosition + 400);
          }
        } else if (selectionStart !== selectionEnd) {
          contextText = fallbackSource.substring(selectionStart, selectionEnd) || fallbackSource.slice(-1000);
        } else {
          contextText = fallbackSource.slice(-1000) || fallbackSource;
        }
      }

      if (request.useStreaming && isFromCursor && supportsStreaming) {
        return {
          useStreaming: true,
          cursorPosition,
          contextAfter,
          isFromCursor,
          contextText,
          provider,
          selectionStart,
          selectionEnd,
          originalSelection,
        };
      }

      const response = await apiRequest("POST", "/api/ai/enhance", {
        text: contextText,
        enhancementType: request.enhancementType,
        documentId: request.documentId,
        cursorPosition,
        isFromCursor,
        contextAfter,
        provider,
        conversationHistory: request.conversationHistory,
      });

      const result = await response.json();
      return {
        ...result,
        cursorPosition,
        isFromCursor,
        provider,
        selectionStart,
        selectionEnd,
        originalSelection,
      };
    },
    onSuccess: (data, variables) => {
      if (data.useStreaming) {
        handleStreamingEnhancement({
          cursorPosition: data.cursorPosition ?? variables.cursorPosition ?? variables.selectionEnd ?? variables.selectionStart ?? 0,
          contextAfter: data.contextAfter ?? '',
          isFromCursor: data.isFromCursor ?? (variables.enhancementType === 'continue' || variables.enhancementType === 'auto-complete'),
          contextText: data.contextText,
          provider: data.provider,
          selectionStart: variables.selectionStart,
          selectionEnd: variables.selectionEnd,
          originalSelection: variables.originalSelection ?? null,
          enhancementType: variables.enhancementType ?? '',
        });
        return;
      }

      const sanitizedText = sanitizeEnhancedText(data.enhancedText) || data.enhancedText?.trim() || "";
      setLastEnhancement(sanitizedText);
      const trackingPayload: EnhancementTracking = {
        ...data,
        enhancedText: sanitizedText,
        cursorPosition: data.cursorPosition ?? variables.cursorPosition ?? variables.selectionEnd ?? variables.selectionStart ?? 0,
        selectionStart: variables.selectionStart,
        selectionEnd: variables.selectionEnd,
        originalSelection: variables.originalSelection ?? null,
        isFromCursor: data.isFromCursor ?? (variables.enhancementType === 'continue' || variables.enhancementType === 'auto-complete'),
      };
      setLastEnhancementData(trackingPayload);

      if (activeTab === 'chat') {
        setChatMessages(prev => {
          const updated = [...prev];
          const lastAiIndex = updated.findLastIndex(msg => msg.role === 'ai');
          if (lastAiIndex !== -1) {
            updated[lastAiIndex] = {
              role: 'ai',
              content: sanitizedText,
              timestamp: new Date(),
              isStreaming: false,
            };
          }
          return updated;
        });
      }

      if (data.processNotes) {
        setProcessNotes(data.processNotes);
      }
      setShowFeedback(true);
      toast({
        title: 'Text Enhanced',
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
  const handleStreamingEnhancement = async (config: {
    cursorPosition: number;
    contextAfter: string;
    isFromCursor: boolean;
    contextText?: string;
    provider?: string;
    selectionStart?: number;
    selectionEnd?: number;
    originalSelection?: string | null;
    enhancementType?: string;
  }) => {
    setIsStreaming(true);
    setStreamedText("");
    setLastCursorPosition(config.cursorPosition);
    if (typeof config.selectionStart === 'number' && typeof config.selectionEnd === 'number') {
      setLastSelectionRange({ start: config.selectionStart, end: config.selectionEnd });
    }

    try {
      const textarea = window.document.querySelector('[data-testid="textarea-document-content"]') as HTMLTextAreaElement;
      const docContent = textarea?.value || document.content || "";
      const selectionEnd = textarea ? textarea.selectionEnd : config.cursorPosition;
      const insertionPoint = typeof selectionEnd === 'number' ? selectionEnd : config.cursorPosition;

      const providerPreference = config.provider || localStorage.getItem('ai-provider-preference') || 'gemini';

      const baseContext = config.contextText && config.contextText.trim().length > 0
        ? config.contextText
        : docContent.substring(Math.max(0, insertionPoint - 1000), insertionPoint);
      const contextWindow = baseContext.slice(-1000);
      const forwardContext = (config.contextAfter && config.contextAfter.length > 0)
        ? config.contextAfter
        : docContent.substring(insertionPoint, insertionPoint + 400);
      
      const response = await fetch('/api/ai/enhance/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: contextWindow,
          enhancementType: 'continue',
          documentId: document.id,
          cursorPosition: config.cursorPosition,
          isFromCursor: config.isFromCursor,
          contextAfter: forwardContext,
          provider: providerPreference,
          conversationHistory: useChatContext ? chatMessages.slice(-6) : undefined
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
                const newChunk = data.chunk;
                setStreamedText(prev => prev + newChunk);
                
                // ALSO update chat in real-time (if in chat tab)
                if (activeTab === 'chat') {
                  setChatMessages(prev => {
                    const updated = [...prev];
                    const lastAiIndex = updated.findLastIndex(msg => msg.role === 'ai');
                    if (lastAiIndex !== -1) {
                      updated[lastAiIndex] = {
                        ...updated[lastAiIndex],
                        content: updated[lastAiIndex].content + newChunk,
                        isStreaming: true
                      };
                    }
                    return updated;
                  });
                }
              }
              if (data.done) {
                const sanitizedFullText = sanitizeEnhancedText(data.fullText) || data.fullText?.trim() || "";
                setStreamedText(sanitizedFullText);
                setLastEnhancement(sanitizedFullText);
                setLastEnhancementData({
                  ...data,
                  enhancedText: sanitizedFullText,
                  cursorPosition: config.cursorPosition,
                  isFromCursor: config.isFromCursor,
                  selectionStart: config.selectionStart,
                  selectionEnd: config.selectionEnd,
                  originalSelection: config.originalSelection ?? null,
                  enhancementType: config.enhancementType,
                });
                setShowFeedback(true);
                
                // Mark chat message as complete
                if (activeTab === 'chat') {
                  setChatMessages(prev => {
                    const updated = [...prev];
                    const lastAiIndex = updated.findLastIndex(msg => msg.role === 'ai');
                    if (lastAiIndex !== -1) {
                      updated[lastAiIndex] = {
                        ...updated[lastAiIndex],
                        content: sanitizedFullText,
                        isStreaming: false
                      };
                    }
                    return updated;
                  });
                }
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
    let contextText = selectedText;

    if (!contextText || contextText.trim().length === 0) {
      const fullContent = document.content || "";
      contextText = fullContent.length > 1000 ? fullContent.slice(-1000) : fullContent;
    }

    const textarea = window.document.querySelector('[data-testid="textarea-document-content"]') as HTMLTextAreaElement | null;
    const selectionStart = textarea?.selectionStart ?? lastSelectionRange?.start ?? lastCursorPosition ?? 0;
    const selectionEnd = textarea?.selectionEnd ?? lastSelectionRange?.end ?? lastCursorPosition ?? selectionStart;
    const cursorPosition = selectionEnd;
    const originalSelection = selectionStart !== selectionEnd
      ? (textarea ? textarea.value.substring(selectionStart, selectionEnd) : selectedText || null)
      : null;

    setProcessNotes(null);

    enhanceTextMutation.mutate({
      text: contextText,
      enhancementType: type,
      documentId: document.id,
      useStreaming,
      selectionStart,
      selectionEnd,
      originalSelection,
      cursorPosition,
      conversationHistory: useChatContext ? chatMessages.slice(-6) : undefined,
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

  const applyEnhancement = (overrideContent?: string) => {
    const rawContent = overrideContent ?? lastEnhancement;
    if (!rawContent || !onTextUpdate) {
      return;
    }

    const enhancementMeta = lastEnhancementData;

    const sanitizeOrFallback = (text: string) => {
      const cleaned = sanitizeEnhancedText(text);
      return cleaned.length > 0 ? cleaned : text.trim();
    };

    let contentToApply = sanitizeOrFallback(rawContent);

    if (!overrideContent && enhancementMeta?.enhancementType && (
      enhancementMeta.enhancementType.includes('analyze') ||
      enhancementMeta.enhancementType.includes('suggestion')
    )) {
      toast({
        title: "Analysis Complete",
        description: "Review the suggestions without modifying your content.",
      });
      return;
    }

    const textarea = window.document.querySelector('[data-testid="textarea-document-content"]') as HTMLTextAreaElement | null;
    const currentContent = textarea?.value ?? document?.content ?? '';

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

    const resolveRange = () => {
      if (overrideContent) {
        if (textarea) {
          const start = textarea.selectionStart ?? currentContent.length;
          const end = textarea.selectionEnd ?? start;
          return { start, end };
        }
        if (lastSelectionRange) {
          return lastSelectionRange;
        }
        if (typeof lastCursorPosition === 'number') {
          return { start: lastCursorPosition, end: lastCursorPosition };
        }
      }

      if (!overrideContent && lastEnhancementData) {
        if (typeof lastEnhancementData.selectionStart === 'number' && typeof lastEnhancementData.selectionEnd === 'number') {
          return {
            start: lastEnhancementData.selectionStart,
            end: lastEnhancementData.selectionEnd,
          };
        }
        if (typeof lastEnhancementData.cursorPosition === 'number') {
          return {
            start: lastEnhancementData.cursorPosition,
            end: lastEnhancementData.cursorPosition,
          };
        }
      }

      if (textarea) {
        const start = textarea.selectionStart ?? currentContent.length;
        const end = textarea.selectionEnd ?? start;
        return { start, end };
      }

      if (lastSelectionRange) {
        return lastSelectionRange;
      }

      if (typeof lastCursorPosition === 'number') {
        return { start: lastCursorPosition, end: lastCursorPosition };
      }

      return { start: currentContent.length, end: currentContent.length };
    };

    const range = resolveRange();
    let start = clamp(range.start ?? 0, 0, currentContent.length);
    let end = clamp(range.end ?? start, start, currentContent.length);

    const expectedOriginal = !overrideContent
      ? enhancementMeta?.originalSelection ?? null
      : end > start
        ? currentContent.slice(start, end)
        : null;
    const currentSegment = currentContent.slice(start, end);

    if (!overrideContent && enhancementMeta?.isFromCursor) {
      const beforeContext = currentContent.slice(0, start);
      const trimmed = trimContinuationPrefix(contentToApply, beforeContext);
      if (trimmed.length < contentToApply.length) {
        contentToApply = trimmed;
      }
    }

    if (end > start && expectedOriginal) {
      const trimmed = trimSelectionPrefix(contentToApply, expectedOriginal);
      if (trimmed.length < contentToApply.length) {
        contentToApply = trimmed;
        end = start + expectedOriginal.length; // keep original bounds for duplicate check
      }
    }

    if (end > start && expectedOriginal && currentSegment !== expectedOriginal) {
      end = start;
    }

    const newContent = `${currentContent.slice(0, start)}${contentToApply}${currentContent.slice(end)}`;

    if (newContent === currentContent) {
      toast({
        title: "Nothing Applied",
        description: "The document already contains this suggestion.",
      });
      return;
    }

    const insertionEnd = start + contentToApply.length;
    const updateMeta: ContentUpdateMeta = {
      source: overrideContent ? 'ai-chat-apply' : 'ai-enhancement',
      cursorPosition: insertionEnd,
      selectionStart: start,
      selectionEnd: insertionEnd,
      originalSelection: expectedOriginal ?? (end > start ? currentSegment : null),
    };

    onTextUpdate(newContent, updateMeta);

    setLastCursorPosition(insertionEnd);
    setLastSelectionRange({ start: insertionEnd, end: insertionEnd });

    if (textarea) {
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(insertionEnd, insertionEnd);
      }, 10);
    }

    setStreamedText('');
    setLastEnhancement(null);
    setLastEnhancementData(null);

    if (!overrideContent) {
      setShowFeedback(false);
      setProcessNotes(null);
      toast({
        title: "Enhancement Applied",
        description: enhancementMeta?.isFromCursor
          ? "Text continuation added at cursor position."
          : "The enhanced text has been applied to your document.",
      });
    } else {
      toast({
        title: "Applied to Document",
        description: "AI suggestion inserted at the current selection.",
      });
    }
  };

  const dismissSuggestion = () => {
    setCurrentSuggestion("");
    setLastEnhancement(null);
    setLastEnhancementData(null);
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
  const handleChatSubmit = async (message?: string) => {
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
    const aiPlaceholder: ChatMessage = {
      role: 'ai',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    setChatMessages(prev => [...prev, aiPlaceholder]);
    setIsStreaming(true);

    try {
      // Call the chat endpoint with context
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          documentContext: document.content,
          documentTitle: document.title,
          conversationHistory: chatMessages.slice(-6) // Last 6 messages for context
        })
      });

      if (!response.ok) throw new Error('Chat failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.chunk) {
                aiResponse += data.chunk;
                // Update the last message with accumulated response
                setChatMessages(prev => {
                  const newMessages = [...prev];
                  const lastMsg = newMessages[newMessages.length - 1];
                  if (lastMsg.role === 'ai') {
                    lastMsg.content = aiResponse;
                    lastMsg.isStreaming = true;
                  }
                  return newMessages;
                });
              }
              
              if (data.done) {
                // Mark streaming complete
                setChatMessages(prev => {
                  const newMessages = [...prev];
                  const lastMsg = newMessages[newMessages.length - 1];
                  if (lastMsg.role === 'ai') {
                    lastMsg.content = aiResponse;
                    lastMsg.isStreaming = false;
                  }
                  return newMessages;
                });
                setIsStreaming(false);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Chat Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
      // Remove the placeholder message on error
      setChatMessages(prev => prev.slice(0, -1));
      setIsStreaming(false);
    }
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

  // Render panel content (used in both normal and lens modes)
  const renderPanelContent = () => {
    const contentMaxHeight = panelMode === 'lens' ? '100%' : 'calc(80vh - 200px)';
    
    return (
      <div className="overflow-y-auto flex-1" style={{ maxHeight: contentMaxHeight }}>
        {activeTab === 'chat' ? renderChatInterface() : renderQuickActions()}
      </div>
    );
  };

  const renderChatInterface = () => (
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
                  <>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    {/* Apply button for AI responses */}
                    {msg.role === 'ai' && msg.content && !msg.isStreaming && (
                      <div className="mt-2 pt-2 border-t border-neutral-200 flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="text-xs"
                          onClick={() => applyEnhancement(msg.content)}
                        >
                          <i className="fas fa-check mr-1"></i>
                          Apply to Document
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => {
                            toast({ description: "Suggestion dismissed" });
                          }}
                        >
                          <i className="fas fa-times mr-1"></i>
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </>
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

      {/* Chat Context Indicator & Toggle */}
      {chatMessages.length > 0 && (
        <div className="px-4 py-2 border-t border-neutral-200 bg-neutral-50">
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer">
              <input
                type="checkbox"
                checked={useChatContext}
                onChange={(e) => setUseChatContext(e.target.checked)}
                className="rounded border-neutral-300"
              />
              <span className="font-medium">Use chat to guide AI enhancements</span>
            </label>
            {useChatContext && chatMessages.slice(-6).length > 0 && (
              <span className="text-xs text-accent font-medium">
                {chatMessages.slice(-6).length} messages active
              </span>
            )}
          </div>
          
          {useChatContext && chatMessages.slice(-6).length > 0 && (
            <div className="bg-white border border-accent/20 rounded p-2 max-h-24 overflow-y-auto">
              <div className="text-xs text-neutral-500 mb-1">Recent context for AI:</div>
              <div className="space-y-1">
                {chatMessages.slice(-6).map((msg, idx) => (
                  <div key={idx} className="text-xs truncate">
                    <span className={msg.role === 'user' ? 'text-accent font-medium' : 'text-neutral-600'}>
                      {msg.role === 'user' ? '→' : '←'}
                    </span>
                    <span className="ml-1 text-neutral-700">{msg.content.substring(0, 60)}{msg.content.length > 60 ? '...' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
  );

  const renderQuickActions = () => null; // Will implement this next

  // Minimized FAB
  if (panelMode === 'minimized') {
    return (
      <button
        onClick={() => setPanelMode('normal')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 z-50 flex items-center justify-center"
        title="Open AI Assistant"
      >
        <i className="fas fa-magic text-xl"></i>
      </button>
    );
  }

  // Lens mode - full screen overlay
  if (panelMode === 'lens') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop blur */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setPanelMode('normal')}></div>
        
        {/* Lens content */}
        <div className="relative bg-white/95 rounded-2xl shadow-2xl border-2 border-purple-500 w-[90vw] h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <i className="fas fa-magic text-xl"></i>
              <span className="font-bold text-lg">AI Lens</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPanelMode('normal')}
              className="text-white hover:bg-white/20"
            >
              <i className="fas fa-compress mr-2"></i>
              Exit Lens
            </Button>
          </div>
          
          {/* Lens content - reuse the same content structure */}
          <div className="flex-1 overflow-hidden flex flex-col p-6">
            <div className="flex gap-4 mb-6">
              <Button
                variant={activeTab === 'chat' ? 'default' : 'outline'}
                onClick={() => setActiveTab('chat')}
                size="lg"
              >
                <i className="fas fa-comments mr-2"></i>
                Chat
              </Button>
              <Button
                variant={activeTab === 'actions' ? 'default' : 'outline'}
                onClick={() => setActiveTab('actions')}
                size="lg"
              >
                <i className="fas fa-bolt mr-2"></i>
                Quick Actions
              </Button>
            </div>
            {/* Render the full content */}
            {renderPanelContent()}
          </div>
        </div>
      </div>
    );
  }

  // Calculate panel size based on mode
  const panelWidth = panelMode === 'expanded' ? 'w-[600px]' : 'w-80';
  const panelStyle = panelMode === 'expanded' 
    ? { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
    : { left: position.x, top: position.y };

  return (
    <div 
      ref={panelRef}
      className={`fixed ${panelWidth} bg-white rounded-lg shadow-lg border border-neutral-200 z-20 cursor-move overflow-hidden`}
      style={{ 
        ...panelStyle,
        transform: isDragging ? 'scale(1.02)' : (panelMode === 'expanded' ? 'translate(-50%, -50%)' : 'scale(1)'),
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
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setPanelMode('lens')}
              title="AI Lens Mode"
            >
              <i className="fas fa-expand text-sm"></i>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setPanelMode(panelMode === 'expanded' ? 'normal' : 'expanded')}
              title="Expand Panel"
            >
              <i className={`fas ${panelMode === 'expanded' ? 'fa-compress-alt' : 'fa-expand-alt'} text-sm`}></i>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setPanelMode('minimized')}
              title="Minimize"
            >
              <i className="fas fa-minus text-sm"></i>
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} title="Close">
              <i className="fas fa-times text-sm"></i>
            </Button>
          </div>
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
                        <>
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                          {/* Apply button for AI responses */}
                          {msg.role === 'ai' && msg.content && !msg.isStreaming && (
                            <div className="mt-2 pt-2 border-t border-neutral-200 flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="text-xs"
                                onClick={() => applyEnhancement(msg.content)}
                              >
                                <i className="fas fa-check mr-1"></i>
                                Apply to Document
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => {
                                  toast({ description: "Suggestion dismissed" });
                                }}
                              >
                                <i className="fas fa-times mr-1"></i>
                                Dismiss
                              </Button>
                            </div>
                          )}
                        </>
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

            {/* Chat Context Indicator & Toggle */}
            {chatMessages.length > 0 && (
              <div className="px-4 py-2 border-t border-neutral-200 bg-neutral-50">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useChatContext}
                      onChange={(e) => setUseChatContext(e.target.checked)}
                      className="rounded border-neutral-300"
                    />
                    <span className="font-medium">Use chat to guide AI enhancements</span>
                  </label>
                  {useChatContext && chatMessages.slice(-6).length > 0 && (
                    <span className="text-xs text-accent font-medium">
                      {chatMessages.slice(-6).length} messages active
                    </span>
                  )}
                </div>
                
                {useChatContext && chatMessages.slice(-6).length > 0 && (
                  <div className="bg-white border border-accent/20 rounded p-2 max-h-24 overflow-y-auto">
                    <div className="text-xs text-neutral-500 mb-1">Recent context for AI:</div>
                    <div className="space-y-1">
                      {chatMessages.slice(-6).map((msg, idx) => (
                        <div key={idx} className="text-xs truncate">
                          <span className={msg.role === 'user' ? 'text-accent font-medium' : 'text-neutral-600'}>
                            {msg.role === 'user' ? '→' : '←'}
                          </span>
                          <span className="ml-1 text-neutral-700">{msg.content.substring(0, 60)}{msg.content.length > 60 ? '...' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
                      onClick={() => applyEnhancement()}
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
