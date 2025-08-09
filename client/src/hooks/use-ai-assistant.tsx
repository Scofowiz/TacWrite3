/**
 * AI Assistant React Hook
 * 
 * Provides React integration for the AI agents system with:
 * - Real-time suggestions based on text content and cursor position
 * - Premium feature detection and gating
 * - Community memory integration for continuous learning
 * - Error handling and loading states
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  aiAgentsClient, 
  AiAssistantSuggestion, 
  EnhancementRequest, 
  EnhancementResult,
  CharacterProfileRequest,
  CharacterProfile,
  isPremiumRequired,
  formatEnhancementSummary
} from '@/lib/ai-agents';
import { Document } from '@shared/schema';

interface UseAiAssistantOptions {
  document?: Document;
  autoSuggest?: boolean;
  debounceMs?: number;
}

interface UseAiAssistantReturn {
  // Suggestions
  suggestions: AiAssistantSuggestion[];
  isLoadingSuggestions: boolean;
  refreshSuggestions: () => void;
  
  // Text Enhancement
  enhanceText: (request: EnhancementRequest) => Promise<EnhancementResult | null>;
  isEnhancing: boolean;
  
  // Character Generation
  generateCharacter: (request: CharacterProfileRequest) => Promise<CharacterProfile | null>;
  isGeneratingCharacter: boolean;
  
  // Premium Features
  autoComplete: (text: string, context?: string) => Promise<string | null>;
  getMarketInsights: (text: string, genre?: string) => Promise<string | null>;
  isUsingPremiumFeature: boolean;
  
  // Quality Analysis
  qualityAnalysis: {
    wordCount: number;
    readabilityScore: number;
    grammarIssues: number;
    readingLevel: string;
    suggestions: string[];
  } | null;
  isAnalyzing: boolean;
  
  // Error handling
  lastError: string | null;
  clearError: () => void;
  
  // Premium upgrade handler
  onPremiumRequired?: () => void;
}

export function useAiAssistant(options: UseAiAssistantOptions = {}): UseAiAssistantReturn {
  const { document, autoSuggest = true, debounceMs = 1000 } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [suggestions, setSuggestions] = useState<AiAssistantSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState(document?.content || '');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [onPremiumRequired, setOnPremiumRequired] = useState<(() => void) | undefined>();
  
  // Refs for debouncing
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTextRef = useRef(textContent);

  // Get current user for premium status
  const { data: user } = useQuery({
    queryKey: ["/api/user/current"],
  });

  // Quality analysis query
  const { data: qualityAnalysis, isLoading: isAnalyzing } = useQuery({
    queryKey: ['/api/ai/quality-analysis', textContent],
    queryFn: async () => {
      if (!textContent || textContent.length < 50) return null;
      return await aiAgentsClient.analyzeWritingQuality(textContent);
    },
    enabled: !!textContent && textContent.length >= 50,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Text enhancement mutation
  const enhanceTextMutation = useMutation({
    mutationFn: async (request: EnhancementRequest) => {
      return await aiAgentsClient.enhanceText(request);
    },
    onSuccess: (result) => {
      toast({
        title: "Text Enhanced Successfully",
        description: formatEnhancementSummary(result),
      });
      
      // Invalidate user data to update usage count
      queryClient.invalidateQueries({ queryKey: ["/api/user/current"] });
    },
    onError: (error: any) => {
      handleAiError(error, 'Text enhancement failed');
    },
  });

  // Character generation mutation
  const generateCharacterMutation = useMutation({
    mutationFn: async (request: CharacterProfileRequest) => {
      return await aiAgentsClient.generateCharacterProfile(request);
    },
    onSuccess: () => {
      toast({
        title: "Character Generated",
        description: "New character profile created successfully",
      });
    },
    onError: (error: any) => {
      handleAiError(error, 'Character generation failed');
    },
  });

  // Premium features mutation
  const premiumFeatureMutation = useMutation({
    mutationFn: async ({ type, text, context }: { type: 'auto-complete' | 'market-insights', text: string, context?: string }) => {
      if (type === 'auto-complete') {
        return await aiAgentsClient.generateContinuation(text, context);
      } else {
        return await aiAgentsClient.getMarketInsights(text, context);
      }
    },
    onSuccess: (result, variables) => {
      toast({
        title: `${variables.type === 'auto-complete' ? 'Auto-completion' : 'Market Insights'} Complete`,
        description: "Premium feature executed successfully",
      });
    },
    onError: (error: any) => {
      handleAiError(error, 'Premium feature failed');
    },
  });

  // Error handler
  const handleAiError = useCallback((error: any, defaultMessage: string) => {
    if (isPremiumRequired(error)) {
      setLastError('This feature requires a premium subscription');
      onPremiumRequired?.();
    } else {
      const errorMessage = error?.message || defaultMessage;
      setLastError(errorMessage);
      toast({
        title: "AI Assistant Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast, onPremiumRequired]);

  // Debounced suggestions refresh
  const refreshSuggestions = useCallback(async () => {
    if (!textContent || textContent.length < 10) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const newSuggestions = await aiAgentsClient.getSuggestions(
        textContent,
        cursorPosition,
        document?.context
      );
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Failed to refresh suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [textContent, cursorPosition, document?.context]);

  // Debounced effect for auto-suggestions
  useEffect(() => {
    if (!autoSuggest || textContent === lastTextRef.current) return;
    
    lastTextRef.current = textContent;
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      refreshSuggestions();
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [textContent, autoSuggest, debounceMs, refreshSuggestions]);

  // Update text content when document changes
  useEffect(() => {
    if (document?.content !== textContent) {
      setTextContent(document?.content || '');
    }
  }, [document?.content]);

  // Public API
  const enhanceText = useCallback(async (request: EnhancementRequest): Promise<EnhancementResult | null> => {
    try {
      const result = await enhanceTextMutation.mutateAsync(request);
      return result;
    } catch (error) {
      return null;
    }
  }, [enhanceTextMutation]);

  const generateCharacter = useCallback(async (request: CharacterProfileRequest): Promise<CharacterProfile | null> => {
    try {
      const result = await generateCharacterMutation.mutateAsync(request);
      return result;
    } catch (error) {
      return null;
    }
  }, [generateCharacterMutation]);

  const autoComplete = useCallback(async (text: string, context?: string): Promise<string | null> => {
    try {
      const result = await premiumFeatureMutation.mutateAsync({ 
        type: 'auto-complete', 
        text, 
        context 
      });
      return result;
    } catch (error) {
      return null;
    }
  }, [premiumFeatureMutation]);

  const getMarketInsights = useCallback(async (text: string, genre?: string): Promise<string | null> => {
    try {
      const result = await premiumFeatureMutation.mutateAsync({ 
        type: 'market-insights', 
        text, 
        context: genre 
      });
      return result;
    } catch (error) {
      return null;
    }
  }, [premiumFeatureMutation]);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  // Setup premium required handler
  useEffect(() => {
    // This would be passed from the parent component
    // setOnPremiumRequired(() => showPremiumModal);
  }, []);

  return {
    // Suggestions
    suggestions,
    isLoadingSuggestions,
    refreshSuggestions,
    
    // Text Enhancement
    enhanceText,
    isEnhancing: enhanceTextMutation.isPending,
    
    // Character Generation
    generateCharacter,
    isGeneratingCharacter: generateCharacterMutation.isPending,
    
    // Premium Features
    autoComplete,
    getMarketInsights,
    isUsingPremiumFeature: premiumFeatureMutation.isPending,
    
    // Quality Analysis
    qualityAnalysis: qualityAnalysis || null,
    isAnalyzing,
    
    // Error handling
    lastError,
    clearError,
    
    // Premium upgrade handler
    onPremiumRequired,
  };
}

/**
 * Hook for managing text selection and cursor position
 */
export function useTextSelection() {
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);

  const handleSelection = useCallback((event: Event) => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      setSelectedText(selection.toString());
      setSelectionRange({
        start: selection.anchorOffset,
        end: selection.focusOffset
      });
    } else {
      setSelectedText('');
      setSelectionRange(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelection);
    return () => {
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, [handleSelection]);

  return {
    selectedText,
    selectionRange,
    hasSelection: !!selectedText,
  };
}

/**
 * Hook for community memory integration (reinforcement learning)
 */
export function useCommunityMemory() {
  const queryClient = useQueryClient();

  const recordInteraction = useCallback(async (
    agentType: string,
    action: string,
    input: any,
    output: any,
    userFeedback?: 'good' | 'ok' | 'poor' | 'decline'
  ) => {
    // This would integrate with the community memory pool from attached assets
    try {
      await fetch('/api/ai/community/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType,
          action,
          input,
          output,
          userFeedback,
          timestamp: new Date().toISOString()
        }),
        credentials: 'include'
      });
    } catch (error) {
      console.error('Failed to record community interaction:', error);
    }
  }, []);

  const getContextualInsights = useCallback(async (category: string) => {
    try {
      const response = await fetch(`/api/ai/community/insights?category=${category}`, {
        credentials: 'include'
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to get contextual insights:', error);
      return [];
    }
  }, []);

  return {
    recordInteraction,
    getContextualInsights,
  };
}
