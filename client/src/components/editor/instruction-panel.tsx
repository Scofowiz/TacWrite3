import { useState, useEffect, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Document } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import RepetitionChecker from "@/components/editor/repetition-checker";

interface InstructionPanelProps {
  document?: Document;
  onDocumentDeleted?: () => void;
  onNarrativeModeChange?: (mode: string) => void;
}

export default function InstructionPanel({ document, onDocumentDeleted, onNarrativeModeChange }: InstructionPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [context, setContext] = useState(() => {
    if (!document) return "";

    if (document.context) {
      if (typeof document.context === 'string') return document.context;
      if (typeof document.context === 'object' && 'description' in document.context) {
        return (document.context as any).description;
      }
    }

    return "";
  });
  const [narrativeMode, setNarrativeMode] = useState("continue");

  // Notify parent component of narrative mode changes
  useEffect(() => {
    onNarrativeModeChange?.(narrativeMode);
  }, [narrativeMode, onNarrativeModeChange]);

  // Mutation to save context to document
  const saveContextMutation = useMutation({
    mutationFn: async (newContext: string) => {
      if (!document?.id) return;
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: newContext }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to save context');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents', document?.id] });
    }
  });

  // Mutation to delete document
  const deleteDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!document?.id) throw new Error('No document ID');
      
      console.log('[Delete] Sending DELETE request for:', document.id);
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      console.log('[Delete] Response status:', response.status);
      const data = await response.json();
      console.log('[Delete] Response data:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete document');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document deleted",
        description: "The document has been permanently deleted."
      });
      setShowDeleteConfirm(false);
      onDocumentDeleted?.();
    },
    onError: (error: Error) => {
      console.error('[Delete] Error:', error);
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete the document. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation to duplicate document
  const duplicateDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!document?.id) return;
      const response = await fetch(`/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${document.title} (Copy)`,
          content: document.content,
          context: document.context,
          folderId: document.folderId
        }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to duplicate document');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document duplicated",
        description: "A copy of the document has been created."
      });
    },
    onError: () => {
      toast({
        title: "Duplication failed",
        description: "Could not duplicate the document. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Clear content mutation
  const clearContentMutation = useMutation({
    mutationFn: async () => {
      if (!document?.id) return;
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '' }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to clear content');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents', document?.id] });
      toast({
        title: "Content cleared",
        description: "Document content has been cleared."
      });
    }
  });

  // Debounced auto-save for context
  useEffect(() => {
    if (!document?.id) return;
    const timer = setTimeout(() => {
      if (context !== (document.context || '')) {
        saveContextMutation.mutate(context);
      }
    }, 1000); // Save after 1 second of no typing
    return () => clearTimeout(timer);
  }, [context, document?.id]);

  // Update local state when document changes
  useEffect(() => {
    if (document?.context) {
      const docContext = typeof document.context === 'string'
        ? document.context
        : (document.context as any)?.description || '';
      setContext(docContext);
    }
  }, [document?.id]);

  // Calculate real writing statistics from document content
  // MUST be before early return to maintain hook order
  const writingStats = useMemo(() => {
    if (!document) {
      return { words: 0, sentences: 0, paragraphs: 0, readingLevel: "N/A", readabilityScore: 0, avgWordsPerSentence: 0, avgParagraphLength: 0 };
    }
    const content = document.content || "";
    const words = document.wordCount || 0;
    const sentences = content.split(/[.!?]+/).filter(s => s.trim()).length || 1;
    const avgWordsPerSentence = words / sentences;

    // Simple Flesch-Kincaid approximation
    const syllables = content.toLowerCase().replace(/[^a-z]/g, '').length * 0.4;
    const avgSyllablesPerWord = syllables / (words || 1);

    // Reading level based on average sentence length
    let readingLevel = "Elementary";
    if (avgWordsPerSentence > 25) readingLevel = "Graduate";
    else if (avgWordsPerSentence > 20) readingLevel = "College";
    else if (avgWordsPerSentence > 15) readingLevel = "High School";
    else if (avgWordsPerSentence > 10) readingLevel = "Middle School";

    // Readability score (simplified Flesch Reading Ease)
    const readabilityScore = Math.max(0, Math.min(100,
      Math.round(206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord))
    ));

    // Paragraph count
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim()).length;

    // Avg paragraph length
    const avgParagraphLength = paragraphs > 0 ? Math.round(words / paragraphs) : 0;

    return {
      words,
      sentences,
      paragraphs,
      readingLevel,
      readabilityScore,
      avgWordsPerSentence: Math.round(avgWordsPerSentence),
      avgParagraphLength
    };
  }, [document?.content, document?.wordCount]);

  // Dynamic feedback based on actual content
  // MUST be before early return to maintain hook order
  const feedbackItems = useMemo(() => {
    if (!document) return [];
    const items = [];
    const hasContext = context && context.trim().length > 0;

    // Context-based feedback
    if (hasContext) {
      items.push({
        type: "success",
        icon: "fas fa-compass",
        color: "bg-accent",
        message: "Writing direction set - AI will follow your instructions"
      });
    } else {
      items.push({
        type: "info",
        icon: "fas fa-lightbulb",
        color: "bg-blue-500",
        message: "Add context above to steer AI generation"
      });
    }

    // Length feedback
    if (writingStats.words > 500) {
      items.push({
        type: "success",
        icon: "fas fa-check",
        color: "bg-accent",
        message: `Solid length: ${writingStats.words} words across ${writingStats.paragraphs} paragraphs`
      });
    } else if (writingStats.words > 100) {
      items.push({
        type: "info",
        icon: "fas fa-edit",
        color: "bg-primary",
        message: `${writingStats.words} words - use Continue to expand`
      });
    }

    // Sentence variety feedback
    if (writingStats.avgWordsPerSentence > 25) {
      items.push({
        type: "warning",
        icon: "fas fa-exclamation",
        color: "bg-yellow-500",
        message: "Long sentences detected - consider breaking up for readability"
      });
    } else if (writingStats.avgWordsPerSentence < 8 && writingStats.sentences > 5) {
      items.push({
        type: "info",
        icon: "fas fa-lightbulb",
        color: "bg-blue-500",
        message: "Short sentences - try varying length for better flow"
      });
    }

    return items;
  }, [document?.content, context, writingStats]);

  if (!document) {
    return (
      <div className="w-80 bg-white border-l border-neutral-200 flex flex-col">
        <div className="p-4 border-b border-neutral-200">
          <h3 className="text-sm font-semibold text-neutral-800">Writing Instructions & Context</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-neutral-500 text-sm">Select a document to view instructions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-neutral-200 flex flex-col">
      <div className="p-4 border-b border-neutral-200">
        <h3 className="text-sm font-semibold text-neutral-800">Writing Instructions & Context</h3>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
        {/* Context Input */}
        <div>
          <Label className="text-sm font-medium text-neutral-700 block mb-2">
            Document Context
          </Label>
          <Textarea
            placeholder="Describe your writing goals, target audience, tone, style preferences, etc."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="h-24 text-sm resize-none"
          />
        </div>

        {/* Narrative Mode Selector */}
        <div>
          <Label className="text-sm font-medium text-neutral-700 block mb-2">
            <span className="flex items-center gap-2">
              <i className="fas fa-brain text-accent"></i>
              Narrative Mode
            </span>
          </Label>
          <Select value={narrativeMode} onValueChange={setNarrativeMode}>
            <SelectTrigger className="text-sm font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="continue">
                <div className="flex items-center gap-2">
                  <span>→</span>
                  <div>
                    <div className="font-semibold">Continue (Linear)</div>
                    <div className="text-xs text-neutral-500">Keep writing the next logical scene</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="branch">
                <div className="flex items-center gap-2">
                  <span>↳</span>
                  <div>
                    <div className="font-semibold">Branch (Explore)</div>
                    <div className="text-xs text-neutral-500">Show me a different path from here</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="deepen">
                <div className="flex items-center gap-2">
                  <span>⤨</span>
                  <div>
                    <div className="font-semibold">Deepen (Contextualize)</div>
                    <div className="text-xs text-neutral-500">Add layers to what's here</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="transform">
                <div className="flex items-center gap-2">
                  <span>⟲</span>
                  <div>
                    <div className="font-semibold">Transform (Adapt)</div>
                    <div className="text-xs text-neutral-500">Remix into a new style or format</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="analyze">
                <div className="flex items-center gap-2">
                  <span>🔍</span>
                  <div>
                    <div className="font-semibold">Analyze (Understand)</div>
                    <div className="text-xs text-neutral-500">Tell me what's working in this text</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {/* Mode Description */}
          <div className="mt-2 p-2 bg-accent/5 rounded border border-accent/20">
            {narrativeMode === "continue" && (
              <p className="text-xs text-neutral-600">
                <strong>Strict Continuity Mode.</strong> Uses immediate context and character state to advance the plot linearly. Respects the last event as absolute.
              </p>
            )}
            {narrativeMode === "branch" && (
              <p className="text-xs text-neutral-600">
                <strong>Exploration Mode.</strong> Uses full story context to generate a thematically coherent alternate scene or ending. Perfect for brainstorming and beating writer's block.
              </p>
            )}
            {narrativeMode === "deepen" && (
              <p className="text-xs text-neutral-600">
                <strong>Contextual Expansion Mode.</strong> Doesn't advance the plot. Instead, generates depth: internal monologue, sensory details, thematic symbolism, or background lore.
              </p>
            )}
            {narrativeMode === "transform" && (
              <p className="text-xs text-neutral-600">
                <strong>Adaptation Mode.</strong> Uses selected text as source material to regenerate it in a new genre, tone, or format (e.g., noir detective, news report, stage play).
              </p>
            )}
            {narrativeMode === "analyze" && (
              <p className="text-xs text-neutral-600">
                <strong>Editorial Analysis Mode.</strong> Provides feedback on theme, pacing, character consistency, prose style, and potential continuity errors.
              </p>
            )}
          </div>
        </div>

        {/* Real-time Feedback */}
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
          <h4 className="text-sm font-medium text-neutral-800 mb-2">Real-time Feedback</h4>
          <div className="space-y-2">
            {feedbackItems.map((item, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className={`w-4 h-4 ${item.color} rounded-full flex items-center justify-center mt-0.5`}>
                  <i className={`${item.icon} text-white text-xs`}></i>
                </div>
                <p className="text-sm text-neutral-600">{item.message}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Writing Statistics */}
        <div className="border border-neutral-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-neutral-800 mb-3">Writing Statistics</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Words:</span>
              <span className="font-medium">{writingStats.words}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Sentences:</span>
              <span className="font-medium">{writingStats.sentences}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Paragraphs:</span>
              <span className="font-medium">{writingStats.paragraphs}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Reading Level:</span>
              <span className="font-medium">{writingStats.readingLevel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Readability:</span>
              <span className={`font-medium ${
                writingStats.readabilityScore >= 60 ? 'text-accent' :
                writingStats.readabilityScore >= 40 ? 'text-yellow-600' : 'text-red-600'
              }`}>{writingStats.readabilityScore}/100</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Avg Words/Sentence:</span>
              <span className="font-medium">{writingStats.avgWordsPerSentence}</span>
            </div>
          </div>
        </div>

        {/* Repetition Checker */}
        <RepetitionChecker content={document?.content || ""} />

        {/* Context Status */}
        <div className="border border-neutral-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-neutral-800 mb-3">Document Status</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${context.trim() ? 'bg-accent' : 'bg-neutral-300'}`}></div>
                <span className="text-sm text-neutral-600">Context Set</span>
              </div>
              <Badge variant={context.trim() ? "secondary" : "outline"} className="text-xs">
                {context.trim() ? 'Active' : 'None'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${writingStats.words > 0 ? 'bg-accent' : 'bg-neutral-300'}`}></div>
                <span className="text-sm text-neutral-600">Content</span>
              </div>
              <Badge variant={writingStats.words > 0 ? "secondary" : "outline"} className="text-xs">
                {writingStats.words > 500 ? 'Substantial' : writingStats.words > 100 ? 'Building' : writingStats.words > 0 ? 'Started' : 'Empty'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${saveContextMutation.isPending ? 'bg-yellow-500 animate-pulse' : 'bg-accent'}`}></div>
                <span className="text-sm text-neutral-600">Auto-Save</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {saveContextMutation.isPending ? 'Saving...' : 'Ready'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Document Controls */}
        <div className="border border-neutral-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-neutral-800 mb-3">Document Controls</h4>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-sm"
              onClick={() => duplicateDocumentMutation.mutate()}
              disabled={duplicateDocumentMutation.isPending}
            >
              <i className="fas fa-copy mr-2 text-neutral-500"></i>
              {duplicateDocumentMutation.isPending ? 'Duplicating...' : 'Duplicate Document'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-sm"
              onClick={() => clearContentMutation.mutate()}
              disabled={clearContentMutation.isPending || !writingStats.words}
            >
              <i className="fas fa-eraser mr-2 text-neutral-500"></i>
              {clearContentMutation.isPending ? 'Clearing...' : 'Clear Content'}
            </Button>
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <i className="fas fa-trash mr-2"></i>
                Delete Document
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 text-sm"
                  onClick={() => deleteDocumentMutation.mutate()}
                  disabled={deleteDocumentMutation.isPending}
                >
                  {deleteDocumentMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
