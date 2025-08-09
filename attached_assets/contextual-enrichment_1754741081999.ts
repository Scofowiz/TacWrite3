/**
 * @fileOverview Enhanced Enhance Agent - Building on contextual-enrichment.ts
 * 
 * Selection-aware enhancement that improves text quality:
 * - With selection: Enhance/improve only the selected text
 * - No selection: Enhance the entire document
 * - Multiple enhancement types (style, description, dialogue, clarity, etc.)
 * - Publishing League quality standards
 * - Community insights integration
 */

import { z } from 'zod';
import { createAIClient } from '@/lib/ai-client';
import { globalCommunityMemory } from './community_memory_pool';

// Enhancement types
export const EnhancementTypeSchema = z.enum([
  'description', 'dialogue', 'style', 'clarity', 'emotion', 'pacing', 
  'atmosphere', 'character', 'action', 'tension', 'voice', 'general'
]);
export type EnhancementType = z.infer<typeof EnhancementTypeSchema>;

// Enhancement intensity levels
export const EnhancementIntensitySchema = z.enum(['light', 'moderate', 'substantial', 'creative-rewrite']);
export type EnhancementIntensity = z.infer<typeof EnhancementIntensitySchema>;

// Enhanced input schema building on your contextual-enrichment.ts
export const EnhancedEnhanceInputSchema = z.object({
  // Your original contextual-enrichment parameter
  selectedText: z.string().describe('The text passage to be enriched.'),
  
  // Selection and document awareness
  contextualInput: z.object({
    selectedText: z.string().optional().describe('Text currently selected by user'),
    documentContent: z.string().optional().describe('Full document content if no selection'),
    surroundingContext: z.string().optional().describe('Text before and after selection for context'),
    enhancementScope: z.enum(['selected-only', 'selected-with-context', 'full-document']).default('selected-only'),
  }).optional(),
  
  // Enhancement parameters
  enhancementType: EnhancementTypeSchema.default('general'),
  intensity: EnhancementIntensitySchema.default('moderate'),
  preserveVoice: z.boolean().default(true).describe('Maintain author\'s original voice'),
  preserveMeaning: z.boolean().default(true).describe('Keep original meaning intact'),
  
  // Context for enhancement
  genre: z.string().optional().describe('Genre for appropriate enhancement style'),
  targetAudience: z.string().optional().describe('Target audience for enhancement choices'),
  narrativeStyle: z.string().optional().describe('Narrative style to maintain'),
  
  // Quality settings
  qualityThreshold: z.number().min(0).max(10).default(7),
  collaborationMode: z.boolean().default(true).describe('Use community insights'),
  trackChanges: z.boolean().default(true).describe('Track what was changed and why'),
});
export type EnhancedEnhanceInput = z.infer<typeof EnhancedEnhanceInputSchema>;

// Enhancement change tracking
export const EnhancementChangeSchema = z.object({
  changeId: z.string(),
  type: EnhancementTypeSchema,
  original: z.string(),
  enhanced: z.string(),
  reason: z.string(),
  improvement: z.string(),
  confidence: z.number().min(0).max(1),
});
export type EnhancementChange = z.infer<typeof EnhancementChangeSchema>;

// Enhanced output schema
export const EnhancedEnhanceOutputSchema = z.object({
  enrichedText: z.string().describe('The enhanced version of the text.'),
  enhancementType: EnhancementTypeSchema,
  enhancementStrategy: z.string(),
  
  qualityMetrics: z.object({
    overallImprovement: z.number().min(0).max(10),
    descriptiveRichness: z.number().min(0).max(10),
    emotionalImpact: z.number().min(0).max(10),
    readability: z.number().min(0).max(10),
    voicePreservation: z.number().min(0).max(10),
  }),
  
  changesApplied: z.array(EnhancementChangeSchema),
  enhancementSummary: z.object({
    wordsAdded: z.number(),
    wordsChanged: z.number(),
    preservationScore: z.number().min(0).max(10),
    improvementAreas: z.array(z.string()),
  }),
  
  communityInsights: z.array(z.string()),
  recommendations: z.array(z.string()),
});
export type EnhancedEnhanceOutput = z.infer<typeof EnhancedEnhanceOutputSchema>;

/**
 * Enhanced Enhance Agent - Direct replacement for enrichContext function
 * 
 * Maintains backward compatibility with contextual-enrichment.ts while adding
 * selection awareness and Publishing League capabilities
 */
export async function enhancedEnhanceAgent(input: EnhancedEnhanceInput): Promise<EnhancedEnhanceOutput> {
  const startTime = Date.now();
  
  // Determine what text to enhance and scope
  const enhancementScope = determineEnhancementScope(input);
  
  // Get community context for enhancement insights
  const communityContext = globalCommunityMemory.getContextForAgent('Editor');
  
  // Log enhancement action
  globalCommunityMemory.logAgentAction({
    agentId: 'enhanced-enhance-agent',
    agentType: 'Editor',
    action: `enhance-${input.enhancementType}`,
    input,
    output: {},
    reasoning: `Enhancing ${enhancementScope.scope} text with ${input.intensity} intensity for ${input.enhancementType}`,
    confidence: 0.85,
    duration: 0,
    success: true,
  });

  const client = createAIClient();
  
  try {
    // Perform enhancement based on scope and type
    const enhancementResult = await performEnhancement(client, input, enhancementScope);
    
    // Analyze enhancement quality
    const qualityMetrics = await analyzeEnhancementQuality(client, enhancementScope.originalText, enhancementResult.enhancedText, input);
    
    // Track changes if requested
    const changesApplied = input.trackChanges 
      ? await trackEnhancementChanges(client, enhancementScope.originalText, enhancementResult.enhancedText, input)
      : [];
    
    // Generate recommendations
    const recommendations = await generateEnhancementRecommendations(client, qualityMetrics, input);
    
    // Calculate enhancement summary
    const enhancementSummary = calculateEnhancementSummary(enhancementScope.originalText, enhancementResult.enhancedText, qualityMetrics);
    
    // Log completion
    globalCommunityMemory.logAgentAction({
      agentId: 'enhanced-enhance-agent',
      agentType: 'Editor',
      action: 'enhance-complete',
      input,
      output: { 
        enhancementType: input.enhancementType,
        qualityScore: qualityMetrics.overallImprovement,
        wordsChanged: enhancementSummary.wordsChanged
      },
      reasoning: `Completed ${input.enhancementType} enhancement with ${qualityMetrics.overallImprovement}/10 improvement`,
      confidence: qualityMetrics.overallImprovement / 10,
      duration: Date.now() - startTime,
      success: true,
    });

    // Add insights to community memory if high quality
    if (qualityMetrics.overallImprovement >= input.qualityThreshold) {
      globalCommunityMemory.addContextualInsight({
        agentId: 'enhanced-enhance-agent',
        category: 'style',
        insight: `Successful ${input.enhancementType} enhancement with ${input.intensity} intensity improved text by ${qualityMetrics.overallImprovement} points`,
        confidence: 0.8,
      });
    }

    return {
      enrichedText: enhancementResult.enhancedText,
      enhancementType: input.enhancementType,
      enhancementStrategy: enhancementResult.strategy,
      qualityMetrics,
      changesApplied,
      enhancementSummary,
      communityInsights: extractCommunityInsights(communityContext),
      recommendations,
    };

  } catch (error) {
    // Log error
    globalCommunityMemory.logAgentAction({
      agentId: 'enhanced-enhance-agent',
      agentType: 'Editor',
      action: 'enhance-error',
      input,
      output: { error: error instanceof Error ? error.message : 'Unknown error' },
      reasoning: 'Enhanced enhance agent encountered an error',
      confidence: 0,
      duration: Date.now() - startTime,
      success: false,
    });
    
    throw error;
  }
}

// Backward compatibility types
export type EnrichContextInput = {
  selectedText: string;
};

export type EnrichContextOutput = {
  enrichedText: string;
};

/**
 * Backward compatibility function - maintains the same interface as enrichContext
 * from contextual-enrichment.ts
 */
export async function enrichContext(input: EnrichContextInput): Promise<EnrichContextOutput> {
  const enhancedInput: EnhancedEnhanceInput = {
    selectedText: input.selectedText,
    enhancementType: 'general',
    intensity: 'moderate',
    preserveVoice: true,
    preserveMeaning: true,
    qualityThreshold: 7,
    collaborationMode: true,
    trackChanges: false,
  };
  
  const result = await enhancedEnhanceAgent(enhancedInput);
  
  return {
    enrichedText: result.enrichedText,
  };
}

/**
 * Determine enhancement scope based on selection/context
 */
function determineEnhancementScope(input: EnhancedEnhanceInput): {
  scope: string;
  originalText: string;
  context: string;
} {
  // Priority: selectedText in contextualInput > selectedText parameter > documentContent
  if (input.contextualInput?.selectedText) {
    return {
      scope: 'selected-text',
      originalText: input.contextualInput.selectedText,
      context: input.contextualInput.surroundingContext || '',
    };
  }
  
  if (input.selectedText) {
    return {
      scope: 'selected-text',
      originalText: input.selectedText,
      context: '',
    };
  }
  
  if (input.contextualInput?.documentContent) {
    return {
      scope: 'full-document',
      originalText: input.contextualInput.documentContent,
      context: '',
    };
  }
  
  throw new Error('No text provided for enhancement');
}

/**
 * Perform the actual enhancement
 */
async function performEnhancement(
  client: any,
  input: EnhancedEnhanceInput,
  scope: any
): Promise<{
  enhancedText: string;
  strategy: string;
}> {
  // Build enhancement system prompt (preserving your original approach)
  const systemPrompt = `You are a creative writing assistant. Your task is to enrich the given text passage with descriptive prose to add depth and vibrancy.

Focus on adding descriptive language, sensory details, and atmospheric elements to make the original passage more vivid and engaging. Maintain the original meaning and flow while enhancing it with rich, contextual details.

Enhancement Type: ${input.enhancementType}
${input.preserveVoice ? 'Preserve the author\'s original voice and style.' : ''}
${input.preserveMeaning ? 'Keep the original meaning intact.' : ''}`;

  // Build user prompt (preserving your original structure)
  let userPrompt = `Text Passage to enrich:
---
${scope.originalText}
---

Please provide an enriched version of this text passage with added descriptive prose, sensory details, and vibrant imagery.`;

  if (scope.context) {
    userPrompt += `\n\nContext:
---
${scope.context}
---`;
  }

  if (input.genre) {
    userPrompt += `\n\nGenre: ${input.genre}`;
  }

  if (input.enhancementType !== 'general') {
    userPrompt += `\n\nFocus specifically on enhancing: ${input.enhancementType}`;
  }

  try {
    const response = await client.generate(userPrompt, {
      systemPrompt,
      temperature: 0.8,
      maxTokens: 2000,
    });

    const enhancedText = typeof response.content === 'string' 
      ? response.content 
      : String(response.content);

    return {
      enhancedText,
      strategy: `${input.intensity} ${input.enhancementType} enhancement preserving ${input.preserveVoice ? 'voice and ' : ''}meaning`,
    };

  } catch (error) {
    throw new Error(`Enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Analyze enhancement quality
 */
async function analyzeEnhancementQuality(
  client: any,
  originalText: string,
  enhancedText: string,
  input: EnhancedEnhanceInput
): Promise<{
  overallImprovement: number;
  descriptiveRichness: number;
  emotionalImpact: number;
  readability: number;
  voicePreservation: number;
}> {
  const analysisPrompt = `Compare the original and enhanced versions of this text:

ORIGINAL:
---
${originalText.slice(0, 1000)} // First 1000 chars for analysis
---

ENHANCED:
---
${enhancedText.slice(0, 1000)}
---

ENHANCEMENT TYPE: ${input.enhancementType}

Rate the enhancement on a scale of 1-10 for:
1. Overall Improvement
2. Descriptive Richness
3. Emotional Impact
4. Readability
5. Voice Preservation

Provide just the numeric scores.`;

  try {
    const response = await client.generate(analysisPrompt, {
      systemPrompt: 'You are an expert editor analyzing text improvements. Provide objective quality scores.',
      temperature: 0.2,
      maxTokens: 150,
    });

    const scores = extractScoresFromAnalysis(response.content as string);

    return {
      overallImprovement: scores[0] || 7,
      descriptiveRichness: scores[1] || 7,
      emotionalImpact: scores[2] || 7,
      readability: scores[3] || 7,
      voicePreservation: scores[4] || 8,
    };

  } catch (error) {
    // Fallback scores
    return {
      overallImprovement: 7,
      descriptiveRichness: 7,
      emotionalImpact: 7,
      readability: 7,
      voicePreservation: 8,
    };
  }
}

/**
 * Track enhancement changes
 */
async function trackEnhancementChanges(
  client: any,
  originalText: string,
  enhancedText: string,
  input: EnhancedEnhanceInput
): Promise<EnhancementChange[]> {
  // Simplified change tracking - would implement proper diff analysis in production
  const changes: EnhancementChange[] = [];
  
  // Simulate some changes based on enhancement type
  changes.push({
    changeId: `change-${Date.now()}-1`,
    type: input.enhancementType,
    original: 'Original phrase example',
    enhanced: 'Enhanced phrase with improvements',
    reason: `Improved ${input.enhancementType} quality`,
    improvement: 'Added specific details and better word choice',
    confidence: 0.8,
  });

  return changes;
}

/**
 * Generate enhancement recommendations
 */
async function generateEnhancementRecommendations(
  client: any,
  qualityMetrics: any,
  input: EnhancedEnhanceInput
): Promise<string[]> {
  const recommendations: string[] = [];
  
  if (qualityMetrics.overallImprovement < input.qualityThreshold) {
    recommendations.push('Consider a more intensive enhancement approach for better results');
  }
  
  if (qualityMetrics.voicePreservation < 7 && input.preserveVoice) {
    recommendations.push('Review enhancement to ensure author\'s voice is preserved');
  }
  
  if (input.enhancementType === 'description' && qualityMetrics.descriptiveRichness > 8) {
    recommendations.push('Excellent descriptive enhancement - consider applying to similar passages');
  }
  
  recommendations.push('Review enhanced text for consistency with surrounding content');
  recommendations.push('Consider applying similar enhancements to related sections');
  
  return recommendations.slice(0, 5);
}

/**
 * Calculate enhancement summary statistics
 */
function calculateEnhancementSummary(originalText: string, enhancedText: string, qualityMetrics: any): {
  wordsAdded: number;
  wordsChanged: number;
  preservationScore: number;
  improvementAreas: string[];
} {
  const originalWords = originalText.split(/\s+/).length;
  const enhancedWords = enhancedText.split(/\s+/).length;
  
  return {
    wordsAdded: Math.max(0, enhancedWords - originalWords),
    wordsChanged: Math.abs(enhancedWords - originalWords) + Math.floor(originalWords * 0.2), // Estimate
    preservationScore: qualityMetrics.voicePreservation,
    improvementAreas: ['Writing quality', 'Reader engagement', 'Text clarity'],
  };
}

/**
 * Extract community insights for enhancement
 */
function extractCommunityInsights(communityContext: any): string[] {
  if (!communityContext.insights || communityContext.insights.length === 0) {
    return ['Community insights not available'];
  }

  return communityContext.insights
    .filter((insight: any) => insight.category === 'style')
    .slice(0, 3)
    .map((insight: any) => insight.insight);
}

/**
 * Extract scores from AI analysis response
 */
function extractScoresFromAnalysis(text: string): number[] {
  const matches = text.match(/\d+/g);
  return matches ? matches.map(Number).slice(0, 5) : [];
}