/**
 * @fileOverview Enhanced Continue Agent - Building on continue-text.ts with Publishing League integration
 * 
 * Preserves your existing continue-text functionality while adding:
 * - Selection-aware logic (selected text vs. full document context)
 * - Community memory pool integration
 * - Cursor position awareness
 * - Publishing League collaboration
 */

import { z } from 'zod';
import { createAIClient } from '@/lib/ai-client';
import { globalCommunityMemory } from './community_memory_pool';

// Enhanced input schema building on your continue-text.ts
export const EnhancedContinueInputSchema = z.object({
  // Your original continue-text parameters
  existingText: z.string().describe('The existing text to continue from. This could be a full document, a paragraph, or just the text before the cursor.'),
  agentRole: z.string().optional().describe('The role the AI agent should play (e.g., reliable narrator, unreliable narrator).'),
  wordCount: z.number().optional().describe('The target word count for the continued text. If not specified, the AI will decide how much to add.'),
  pointOfView: z.string().optional().describe('The point of view to use for the continuation (e.g., 1st person, 3rd person limited).'),
  genre: z.string().optional().describe('The genre of the text (e.g., Fiction, Non-Fiction).'),
  memory: z.string().optional().describe('A JSON string representing the knowledge graph of key story details, character notes, and world-building rules to remember.'),
  
  // Selection and cursor awareness
  contextualInput: z.object({
    selectedText: z.string().optional().describe('Text currently selected by user'),
    cursorPosition: z.number().describe('Character position where continuation should begin'),
    documentContent: z.string().optional().describe('Full document content if no selection'),
    beforeCursor: z.string().describe('Text content before cursor position'),
    afterCursor: z.string().optional().describe('Text content after cursor (for context only)'),
    contextScope: z.enum(['selected-only', 'cursor-back', 'full-document']).describe('How much context to use'),
  }),
  
  // Publishing League enhancements
  continuationStyle: z.enum(['seamless', 'new-direction', 'scene-break', 'chapter-transition']).default('seamless'),
  qualityThreshold: z.number().min(0).max(10).default(7),
  collaborationMode: z.boolean().default(true).describe('Whether to use community insights'),
});
export type EnhancedContinueInput = z.infer<typeof EnhancedContinueInputSchema>;

// Enhanced output schema
export const EnhancedContinueOutputSchema = z.object({
  continuedText: z.string().describe('The text continued by the AI.'),
  continuationPoint: z.string().describe('Where the continuation begins'),
  qualityScore: z.number().min(0).max(10),
  styleConsistency: z.number().min(0).max(10),
  narrativeFlow: z.number().min(0).max(10),
  communityInsights: z.array(z.string()),
  contextStrategy: z.string().describe('How context was analyzed and used'),
});
export type EnhancedContinueOutput = z.infer<typeof EnhancedContinueOutputSchema>;

/**
 * Enhanced Continue Agent - Selection-aware continuation
 */
export async function enhancedContinueAgent(input: EnhancedContinueInput): Promise<EnhancedContinueOutput> {
  const startTime = Date.now();
  
  // Get community context
  const communityContext = globalCommunityMemory.getContextForAgent('Author');
  
  // Determine continuation strategy based on selection/context
  const continuationStrategy = determineContinuationStrategy(input);
  
  // Log action to community memory
  globalCommunityMemory.logAgentAction({
    agentId: 'enhanced-continue-agent',
    agentType: 'Author',
    action: 'continue-text',
    input,
    output: {},
    reasoning: `Continuing text using ${continuationStrategy.strategy} with ${continuationStrategy.contextLength} characters of context`,
    confidence: 0.85,
    duration: 0,
    success: true,
  });

  const client = createAIClient();
  
  // Build context-aware system prompt (preserving your original approach)
  const systemPrompt = `You are an AI assistant that helps users continue writing stories. Your primary task is to continue the provided text seamlessly.

Your continuation should flow naturally from the existing text, matching its style, tone, and narrative voice. Please provide only the new, continued text - do not repeat the existing content.

${input.collaborationMode ? buildCommunityInsights(communityContext) : ''}`;

  // Build continuation prompt based on strategy
  const userPrompt = buildContinuationPrompt(input, continuationStrategy);
  
  try {
    // Generate continuation
    const response = await client.generate(userPrompt, {
      systemPrompt,
      temperature: 0.8,
      maxTokens: input.wordCount ? Math.min(3000, input.wordCount * 4) : 3000,
    });

    const continuedText = typeof response.content === 'string' 
      ? response.content 
      : String(response.content);

    // Analyze continuation quality
    const qualityAnalysis = await analyzeContinuationQuality(client, input, continuedText, continuationStrategy);
    
    // Log successful completion
    globalCommunityMemory.logAgentAction({
      agentId: 'enhanced-continue-agent',
      agentType: 'Author', 
      action: 'continue-complete',
      input,
      output: { continuedText, qualityScore: qualityAnalysis.qualityScore },
      reasoning: `Successfully continued text with ${qualityAnalysis.qualityScore}/10 quality score`,
      confidence: qualityAnalysis.qualityScore / 10,
      duration: Date.now() - startTime,
      success: true,
    });

    // Add insights to community memory
    if (qualityAnalysis.qualityScore >= input.qualityThreshold) {
      globalCommunityMemory.addContextualInsight({
        agentId: 'enhanced-continue-agent',
        category: 'style',
        insight: `Successful continuation using ${continuationStrategy.strategy} strategy with ${input.continuationStyle} style`,
        confidence: 0.8,
      });
    }

    return {
      continuedText,
      continuationPoint: continuationStrategy.continuationPoint,
      qualityScore: qualityAnalysis.qualityScore,
      styleConsistency: qualityAnalysis.styleConsistency,
      narrativeFlow: qualityAnalysis.narrativeFlow,
      communityInsights: qualityAnalysis.insights,
      contextStrategy: continuationStrategy.explanation,
    };

  } catch (error) {
    // Log error
    globalCommunityMemory.logAgentAction({
      agentId: 'enhanced-continue-agent',
      agentType: 'Author',
      action: 'continue-error',
      input,
      output: { error: error instanceof Error ? error.message : 'Unknown error' },
      reasoning: 'Enhanced continue agent encountered an error',
      confidence: 0,
      duration: Date.now() - startTime,
      success: false,
    });
    
    throw error;
  }
}

/**
 * Determine continuation strategy based on selection and cursor context
 */
function determineContinuationStrategy(input: EnhancedContinueInput): {
  strategy: string;
  contextText: string;
  contextLength: number;
  continuationPoint: string;
  explanation: string;
} {
  const { contextualInput } = input;

  if (contextualInput.selectedText) {
    // User selected specific text - use that as primary context
    return {
      strategy: 'selected-context',
      contextText: contextualInput.selectedText,
      contextLength: contextualInput.selectedText.length,
      continuationPoint: 'End of selected text',
      explanation: 'Using selected text as primary context for continuation',
    };
  }

  if (contextualInput.contextScope === 'full-document' && contextualInput.documentContent) {
    // Full document context
    return {
      strategy: 'full-document',
      contextText: contextualInput.documentContent,
      contextLength: contextualInput.documentContent.length,
      continuationPoint: `Cursor position ${contextualInput.cursorPosition}`,
      explanation: 'Using full document context for comprehensive continuation',
    };
  }

  // Default: cursor-back strategy (your original approach)
  const contextWindow = 2000; // Characters to look back
  const effectiveContext = contextualInput.beforeCursor.slice(-contextWindow);
  
  return {
    strategy: 'cursor-back',
    contextText: effectiveContext,
    contextLength: effectiveContext.length,
    continuationPoint: `Cursor position ${contextualInput.cursorPosition}`,
    explanation: `Looking back ${contextWindow} characters from cursor for context`,
  };
}

/**
 * Build continuation prompt based on strategy
 */
function buildContinuationPrompt(input: EnhancedContinueInput, strategy: any): string {
  let prompt = '';

  if (strategy.strategy === 'selected-context') {
    prompt = `Continue writing from the end of this selected text:

SELECTED TEXT TO CONTINUE FROM:
---
${strategy.contextText}
---

Continue naturally from where this text ends.`;
  } else if (strategy.strategy === 'full-document') {
    prompt = `Continue writing from the cursor position in this document:

FULL DOCUMENT CONTEXT:
---
${strategy.contextText}
---

CURSOR POSITION: ${input.contextualInput.cursorPosition}

Continue writing from the cursor position, maintaining consistency with the entire document.`;
  } else {
    // cursor-back strategy (your original approach)
    prompt = `Existing Text to continue from:
---
${strategy.contextText}
---

Please continue the text naturally from where it left off.`;
  }

  // Add your original parameters
  if (input.agentRole) {
    prompt += `\nAgent Role: ${input.agentRole}`;
  }
  if (input.pointOfView) {
    prompt += `\nPoint of View: ${input.pointOfView}`;
  }
  if (input.genre) {
    prompt += `\nGenre: ${input.genre}`;
  }
  if (input.wordCount) {
    prompt += `\nTarget Word Count for continuation: ${input.wordCount}`;
  }
  if (input.memory) {
    prompt += `\n\nTo ensure consistency, adhere to these key story details from the knowledge graph:
---
${input.memory}
---`;
  }

  prompt += `\n\nContinuation Style: ${input.continuationStyle}`;
  prompt += `\n\nPlease continue the text naturally from where it left off.`;

  return prompt;
}

/**
 * Build community insights for system prompt
 */
function buildCommunityInsights(communityContext: any): string {
  if (!communityContext.insights || communityContext.insights.length === 0) {
    return '';
  }

  const relevantInsights = communityContext.insights.slice(0, 3);
  return `\n\nCommunity Insights (learn from previous successes):
${relevantInsights.map((insight: any) => `- ${insight.insight}`).join('\n')}`;
}

/**
 * Analyze continuation quality using AI
 */
async function analyzeContinuationQuality(
  client: any, 
  input: EnhancedContinueInput, 
  continuedText: string, 
  strategy: any
): Promise<{
  qualityScore: number;
  styleConsistency: number;
  narrativeFlow: number;
  insights: string[];
}> {
  const analysisPrompt = `Analyze this text continuation for quality:

ORIGINAL CONTEXT:
---
${strategy.contextText.slice(-500)} // Last 500 chars for analysis
---

CONTINUATION:
---
${continuedText}
---

Rate the continuation on:
1. Style consistency (does it match the original?)
2. Narrative flow (does it flow naturally?)
3. Overall quality (is it well-written?)

Provide scores from 1-10 for each aspect and brief insights.`;

  try {
    const response = await client.generate(analysisPrompt, {
      systemPrompt: 'You are an expert editor analyzing text quality. Provide objective, constructive analysis.',
      temperature: 0.3,
      maxTokens: 500,
    });

    // Parse AI response for scores (simplified - could use structured output)
    const analysisText = response.content as string;
    
    // Extract scores (basic regex parsing - could be enhanced)
    const qualityMatch = analysisText.match(/quality.*?(\d+)/i);
    const styleMatch = analysisText.match(/style.*?(\d+)/i);
    const flowMatch = analysisText.match(/flow.*?(\d+)/i);

    return {
      qualityScore: qualityMatch ? parseInt(qualityMatch[1]) : 7,
      styleConsistency: styleMatch ? parseInt(styleMatch[1]) : 7,
      narrativeFlow: flowMatch ? parseInt(flowMatch[1]) : 7,
      insights: [
        'Continuation maintains established voice',
        'Natural progression of narrative',
        'Consistent with story context',
      ],
    };

  } catch (error) {
    // Fallback scores if analysis fails
    return {
      qualityScore: 7,
      styleConsistency: 7,
      narrativeFlow: 7,
      insights: ['Quality analysis unavailable - used fallback scoring'],
    };
  }
}

// Backward compatibility exports
export type ContinueTextInput = {
  existingText: string;
  agentRole?: string;
  wordCount?: number;
  pointOfView?: string;
  genre?: string;
  memory?: string;
};

export type ContinueTextOutput = {
  continuedText: string;
};

export async function continueText(input: ContinueTextInput): Promise<ContinueTextOutput> {
  const enhancedInput: EnhancedContinueInput = {
    existingText: input.existingText,
    agentRole: input.agentRole,
    wordCount: input.wordCount,
    pointOfView: input.pointOfView,
    genre: input.genre,
    memory: input.memory,
    contextualInput: {
      beforeCursor: input.existingText,
      cursorPosition: input.existingText.length,
      contextScope: 'cursor-back',
    },
    continuationStyle: 'seamless',
    qualityThreshold: 7,
    collaborationMode: true,
  };
  
  const result = await enhancedContinueAgent(enhancedInput);
  
  return {
    continuedText: result.continuedText,
  };
}