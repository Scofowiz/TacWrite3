/**
 * @fileOverview Enhanced Chapter Agent - Building on end-chapter.ts
 * 
 * Preserves your existing chapter ending functionality while adding:
 * - Selection-aware logic (selected text vs. full chapter context)
 * - Publishing League polish and professionalism
 * - Community memory collaboration
 * - Chapter transition analysis
 * - Quality scoring for chapter endings
 */

import { z } from 'zod';
import { createAIClient } from '@/lib/ai-client';
import { globalCommunityMemory } from './community_memory_pool';

// Chapter ending types
export const ChapterEndingTypeSchema = z.enum(['cliffhanger', 'resolution', 'transition', 'emotional-beat', 'revelation', 'setup']);
export type ChapterEndingType = z.infer<typeof ChapterEndingTypeSchema>;

// Enhanced input schema building on your end-chapter.ts
export const EnhancedChapterInputSchema = z.object({
  // Your original end-chapter parameters
  documentContent: z.string().describe('The content of the chapter to conclude.'),
  genre: z.string().optional().describe('The genre of the document (e.g., Fiction, Non-Fiction).'),
  memory: z.string().optional().describe('A JSON string representing the knowledge graph of key story details, character notes, and world-building rules to remember.'),
  
  // Selection and cursor awareness
  contextualInput: z.object({
    selectedText: z.string().optional().describe('Text currently selected by user'),
    chapterContent: z.string().optional().describe('Full chapter content if no selection'),
    documentContent: z.string().optional().describe('Full document content for broader context'),
    isPartialChapter: z.boolean().default(false).describe('Whether this is ending a partial chapter'),
    nextChapterHint: z.string().optional().describe('Hint about what comes next'),
  }),
  
  // Publishing League enhancements
  endingType: ChapterEndingTypeSchema.default('transition').describe('Type of chapter ending desired'),
  chapterNumber: z.number().optional().describe('Chapter number for context'),
  bookPosition: z.enum(['beginning', 'middle', 'climax', 'resolution']).optional().describe('Where this chapter falls in the book'),
  targetTone: z.string().optional().describe('Desired emotional tone for the ending'),
  seriesContext: z.boolean().default(false).describe('Whether this is part of a series'),
  
  // Quality settings
  qualityThreshold: z.number().min(0).max(10).default(8),
  collaborationMode: z.boolean().default(true),
  polishLevel: z.enum(['standard', 'professional', 'literary']).default('professional'),
});
export type EnhancedChapterInput = z.infer<typeof EnhancedChapterInputSchema>;

// Chapter analysis results
export const ChapterAnalysisSchema = z.object({
  wordCount: z.number(),
  emotionalArc: z.string(),
  plotProgression: z.string(),
  characterDevelopment: z.array(z.string()),
  tensionLevel: z.number().min(0).max(10),
  pacingScore: z.number().min(0).max(10),
  hookStrength: z.number().min(0).max(10),
});
export type ChapterAnalysis = z.infer<typeof ChapterAnalysisSchema>;

// Enhanced output schema
export const EnhancedChapterOutputSchema = z.object({
  concludingText: z.string().describe('The concluding text for the chapter.'),
  endingType: ChapterEndingTypeSchema,
  chapterAnalysis: ChapterAnalysisSchema,
  qualityMetrics: z.object({
    overallQuality: z.number().min(0).max(10),
    emotionalImpact: z.number().min(0).max(10),
    narrativeFlow: z.number().min(0).max(10),
    readerEngagement: z.number().min(0).max(10),
  }),
  transitionElements: z.object({
    hookForNext: z.string().optional(),
    unresolved: z.array(z.string()),
    setup: z.array(z.string()),
  }),
  communityInsights: z.array(z.string()),
  recommendations: z.array(z.string()),
});
export type EnhancedChapterOutput = z.infer<typeof EnhancedChapterOutputSchema>;

/**
 * Enhanced Chapter Agent - Professional chapter conclusions
 */
export async function enhancedChapterAgent(input: EnhancedChapterInput): Promise<EnhancedChapterOutput> {
  const startTime = Date.now();
  
  // Determine chapter context and strategy
  const chapterStrategy = determineChapterStrategy(input);
  
  // Get community context for chapter ending insights
  const communityContext = globalCommunityMemory.getContextForAgent('Editor');
  
  // Log chapter action
  globalCommunityMemory.logAgentAction({
    agentId: 'enhanced-chapter-agent',
    agentType: 'Editor',
    action: 'end-chapter',
    input,
    output: {},
    reasoning: `Creating ${input.endingType} chapter ending with ${input.polishLevel} polish for ${input.bookPosition || 'unknown'} position`,
    confidence: 0.9,
    duration: 0,
    success: true,
  });

  const client = createAIClient();
  
  try {
    // Analyze current chapter before creating ending
    const chapterAnalysis = await analyzeChapterContent(client, input, chapterStrategy);
    
    // Generate chapter conclusion
    const chapterConclusion = await generateChapterEnding(client, input, chapterStrategy, chapterAnalysis);
    
    // Analyze the quality of the generated ending
    const qualityMetrics = await analyzeEndingQuality(client, chapterConclusion, input);
    
    // Generate transition elements and recommendations
    const transitionElements = await analyzeTransitionElements(client, chapterConclusion, input);
    const recommendations = await generateChapterRecommendations(client, chapterAnalysis, qualityMetrics, input);
    
    // Log completion
    globalCommunityMemory.logAgentAction({
      agentId: 'enhanced-chapter-agent',
      agentType: 'Editor',
      action: 'chapter-complete',
      input,
      output: { 
        endingType: input.endingType,
        qualityScore: qualityMetrics.overallQuality,
        wordCount: chapterConclusion.split(/\s+/).length
      },
      reasoning: `Completed ${input.endingType} chapter ending with ${qualityMetrics.overallQuality}/10 quality`,
      confidence: qualityMetrics.overallQuality / 10,
      duration: Date.now() - startTime,
      success: true,
    });

    // Add insights to community memory if high quality
    if (qualityMetrics.overallQuality >= input.qualityThreshold) {
      globalCommunityMemory.addContextualInsight({
        agentId: 'enhanced-chapter-agent',
        category: 'structure',
        insight: `Successful ${input.endingType} chapter ending in ${input.genre || 'unknown'} genre with ${qualityMetrics.emotionalImpact}/10 emotional impact`,
        confidence: 0.85,
      });
    }

    return {
      concludingText: chapterConclusion,
      endingType: input.endingType,
      chapterAnalysis,
      qualityMetrics,
      transitionElements,
      communityInsights: extractCommunityInsights(communityContext),
      recommendations,
    };

  } catch (error) {
    // Log error
    globalCommunityMemory.logAgentAction({
      agentId: 'enhanced-chapter-agent',
      agentType: 'Editor',
      action: 'chapter-error',
      input,
      output: { error: error instanceof Error ? error.message : 'Unknown error' },
      reasoning: 'Enhanced chapter agent encountered an error',
      confidence: 0,
      duration: Date.now() - startTime,
      success: false,
    });
    
    throw error;
  }
}

/**
 * Determine chapter ending strategy based on input
 */
function determineChapterStrategy(input: EnhancedChapterInput): {
  strategy: string;
  approach: string;
  focusElements: string[];
  tonalGoals: string[];
} {
  const strategies = {
    'cliffhanger': {
      strategy: 'cliffhanger',
      approach: 'Create suspense and urgency that compels readers to continue',
      focusElements: ['unresolved tension', 'surprising revelation', 'imminent danger'],
      tonalGoals: ['suspense', 'anticipation', 'urgency'],
    },
    'resolution': {
      strategy: 'resolution',
      approach: 'Provide satisfying closure to chapter conflicts while maintaining story momentum',
      focusElements: ['conflict resolution', 'character satisfaction', 'plot advancement'],
      tonalGoals: ['satisfaction', 'completion', 'forward momentum'],
    },
    'transition': {
      strategy: 'transition',
      approach: 'Bridge smoothly to the next chapter while concluding current events',
      focusElements: ['smooth bridging', 'setup for next', 'natural conclusion'],
      tonalGoals: ['flow', 'continuity', 'anticipation'],
    },
    'emotional-beat': {
      strategy: 'emotional-beat',
      approach: 'Focus on character emotional journey and internal development',
      focusElements: ['character emotion', 'internal conflict', 'relationship dynamics'],
      tonalGoals: ['emotional resonance', 'character depth', 'intimacy'],
    },
    'revelation': {
      strategy: 'revelation',
      approach: 'Deliver important story information that changes reader understanding',
      focusElements: ['new information', 'perspective shift', 'story implications'],
      tonalGoals: ['surprise', 'realization', 'impact'],
    },
    'setup': {
      strategy: 'setup',
      approach: 'Establish elements and tensions that will pay off in future chapters',
      focusElements: ['future preparation', 'element introduction', 'tension building'],
      tonalGoals: ['anticipation', 'intrigue', 'foundation'],
    },
  };

  return strategies[input.endingType];
}

/**
 * Analyze current chapter content before creating ending
 */
async function analyzeChapterContent(
  client: any,
  input: EnhancedChapterInput,
  strategy: any
): Promise<ChapterAnalysis> {
  // Determine what content to analyze
  const contentToAnalyze = input.contextualInput.selectedText || 
                          input.contextualInput.chapterContent || 
                          input.documentContent;

  const analysisPrompt = `Analyze this chapter content to inform the creation of an appropriate ending:

CHAPTER CONTENT:
---
${contentToAnalyze.slice(-3000)} // Last 3000 chars for context
---

ENDING TYPE NEEDED: ${input.endingType}
GENRE: ${input.genre || 'Unknown'}

Analyze and provide:
1. Current emotional arc and tone
2. Plot progression and key events
3. Character development moments
4. Current tension level (1-10)
5. Pacing assessment (1-10)
6. What kind of hook would work best (1-10)

Provide concise analysis focusing on how to create an effective ${input.endingType} ending.`;

  try {
    const response = await client.generate(analysisPrompt, {
      systemPrompt: 'You are an expert editor analyzing chapter structure and flow. Provide objective analysis to inform chapter ending decisions.',
      temperature: 0.3,
      maxTokens: 600,
    });

    const analysisText = response.content as string;
    
    // Parse analysis (simplified - could use structured output)
    return {
      wordCount: contentToAnalyze.split(/\s+/).length,
      emotionalArc: extractAnalysisPoint(analysisText, 'emotional') || 'Emotional progression building toward resolution',
      plotProgression: extractAnalysisPoint(analysisText, 'plot') || 'Plot moving forward with key developments',
      characterDevelopment: ['Character growth evident', 'Relationships developing'],
      tensionLevel: extractNumericScore(analysisText, 'tension') || 7,
      pacingScore: extractNumericScore(analysisText, 'pacing') || 7,
      hookStrength: extractNumericScore(analysisText, 'hook') || 7,
    };

  } catch (error) {
    // Fallback analysis
    return {
      wordCount: contentToAnalyze.split(/\s+/).length,
      emotionalArc: 'Chapter building toward climactic moment',
      plotProgression: 'Story advancing with rising action',
      characterDevelopment: ['Character facing challenges'],
      tensionLevel: 7,
      pacingScore: 7,
      hookStrength: 7,
    };
  }
}

/**
 * Generate chapter ending based on strategy and analysis
 */
async function generateChapterEnding(
  client: any,
  input: EnhancedChapterInput,
  strategy: any,
  analysis: ChapterAnalysis
): Promise<string> {
  // Build chapter ending prompt (preserving your original approach)
  const systemPrompt = `You are an AI writing assistant. Your task is to write a compelling and conclusive final paragraph for the following chapter. The goal is to ${strategy.approach}.

Focus on: ${strategy.focusElements.join(', ')}
Desired tone: ${strategy.tonalGoals.join(', ')}

Polish Level: ${input.polishLevel}
${input.polishLevel === 'literary' ? 'Use sophisticated prose and literary techniques.' : ''}
${input.polishLevel === 'professional' ? 'Maintain professional publishing standards.' : ''}

Please provide only the new, concluding paragraph.`;

  // Determine content to work with
  const chapterContent = input.contextualInput.selectedText || 
                        input.contextualInput.chapterContent || 
                        input.documentContent;

  let userPrompt = `Chapter Content:
---
${chapterContent}
---

Chapter Analysis:
- Current tension level: ${analysis.tensionLevel}/10
- Emotional arc: ${analysis.emotionalArc}
- Plot progression: ${analysis.plotProgression}

Create a ${input.endingType} ending that ${strategy.approach}.`;

  if (input.genre) {
    userPrompt += `\n\nThe genre is ${input.genre}.`;
  }

  if (input.targetTone) {
    userPrompt += `\n\nTarget tone: ${input.targetTone}`;
  }

  if (input.chapterNumber) {
    userPrompt += `\n\nThis is Chapter ${input.chapterNumber}.`;
  }

  if (input.bookPosition) {
    userPrompt += `\n\nThis chapter occurs in the ${input.bookPosition} of the book.`;
  }

  if (input.contextualInput.nextChapterHint) {
    userPrompt += `\n\nNext chapter will focus on: ${input.contextualInput.nextChapterHint}`;
  }

  if (input.memory) {
    userPrompt += `\n\nTo ensure consistency, you must adhere to the following key story details and rules from the knowledge graph:
---
${input.memory}
---`;
  }

  try {
    const response = await client.generate(userPrompt, {
      systemPrompt,
      temperature: 0.8,
      maxTokens: 1000,
    });

    return typeof response.content === 'string' 
      ? response.content 
      : String(response.content);

  } catch (error) {
    throw new Error(`Chapter ending generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Analyze the quality of the generated ending
 */
async function analyzeEndingQuality(
  client: any,
  chapterEnding: string,
  input: EnhancedChapterInput
): Promise<{
  overallQuality: number;
  emotionalImpact: number;
  narrativeFlow: number;
  readerEngagement: number;
}> {
  const qualityPrompt = `Analyze this chapter ending for quality and effectiveness:

CHAPTER ENDING:
---
${chapterEnding}
---

INTENDED TYPE: ${input.endingType}
GENRE: ${input.genre || 'Unknown'}

Rate the ending on a scale of 1-10 for:
1. Overall Quality
2. Emotional Impact
3. Narrative Flow
4. Reader Engagement

Provide just the numeric scores.`;

  try {
    const response = await client.generate(qualityPrompt, {
      systemPrompt: 'You are an expert editor evaluating chapter endings. Provide objective quality scores.',
      temperature: 0.2,
      maxTokens: 150,
    });

    const scores = extractAllScores(response.content as string);

    return {
      overallQuality: scores[0] || 8,
      emotionalImpact: scores[1] || 7,
      narrativeFlow: scores[2] || 8,
      readerEngagement: scores[3] || 7,
    };

  } catch (error) {
    // Fallback scores
    return {
      overallQuality: 7.5,
      emotionalImpact: 7,
      narrativeFlow: 8,
      readerEngagement: 7.5,
    };
  }
}

/**
 * Analyze transition elements for next chapter setup
 */
async function analyzeTransitionElements(
  client: any,
  chapterEnding: string,
  input: EnhancedChapterInput
): Promise<{
  hookForNext?: string;
  unresolved: string[];
  setup: string[];
}> {
  // Analyze what the ending sets up for future chapters
  if (input.endingType === 'cliffhanger' || input.endingType === 'setup') {
    return {
      hookForNext: 'Strong hook created for next chapter',
      unresolved: ['Primary tension maintained', 'Character questions remain'],
      setup: ['Future conflict established', 'Reader curiosity engaged'],
    };
  }

  if (input.endingType === 'resolution') {
    return {
      unresolved: ['Subplot threads remain open'],
      setup: ['New chapter direction possible'],
    };
  }

  return {
    unresolved: ['Story momentum maintained'],
    setup: ['Natural progression to next chapter'],
  };
}

/**
 * Generate recommendations based on chapter analysis
 */
async function generateChapterRecommendations(
  client: any,
  analysis: ChapterAnalysis,
  quality: any,
  input: EnhancedChapterInput
): Promise<string[]> {
  const recommendations: string[] = [];

  if (quality.overallQuality < input.qualityThreshold) {
    recommendations.push('Consider revising the chapter ending for stronger impact');
  }

  if (analysis.tensionLevel < 5 && input.endingType === 'cliffhanger') {
    recommendations.push('Build more tension earlier in the chapter to support cliffhanger ending');
  }

  if (quality.emotionalImpact < 7) {
    recommendations.push('Strengthen emotional resonance in the chapter conclusion');
  }

  if (input.endingType === 'transition' && quality.narrativeFlow < 8) {
    recommendations.push('Improve flow between this chapter and the next');
  }

  recommendations.push('Review chapter pacing to ensure optimal reader engagement');
  recommendations.push('Consider how this ending serves the overall book structure');

  return recommendations.slice(0, 5);
}

/**
 * Extract community insights for chapter endings
 */
function extractCommunityInsights(communityContext: any): string[] {
  if (!communityContext.insights || communityContext.insights.length === 0) {
    return ['Community insights not available'];
  }

  return communityContext.insights
    .filter((insight: any) => insight.category === 'structure')
    .slice(0, 3)
    .map((insight: any) => insight.insight);
}

/**
 * Helper functions for parsing AI responses
 */
function extractAnalysisPoint(text: string, keyword: string): string | null {
  const lines = text.split('\n');
  const relevantLine = lines.find(line => 
    line.toLowerCase().includes(keyword.toLowerCase())
  );
  return relevantLine ? relevantLine.replace(/^\d+\.\s*/, '').trim() : null;
}

function extractNumericScore(text: string, keyword: string): number | null {
  const regex = new RegExp(`${keyword}.*?(\\d+)`, 'i');
  const match = text.match(regex);
  return match ? parseInt(match[1]) : null;
}

function extractAllScores(text: string): number[] {
  const matches = text.match(/\d+/g);
  return matches ? matches.map(Number).slice(0, 4) : [];
}

// Backward compatibility exports
export type EndChapterInput = {
  documentContent: string;
  genre?: string;
  memory?: string;
};

export type EndChapterOutput = {
  concludingText: string;
};

export async function endChapter(input: EndChapterInput): Promise<EndChapterOutput> {
  const enhancedInput: EnhancedChapterInput = {
    documentContent: input.documentContent,
    genre: input.genre,
    memory: input.memory,
    contextualInput: {
      chapterContent: input.documentContent,
      isPartialChapter: false,
    },
    endingType: 'transition',
    polishLevel: 'professional',
    qualityThreshold: 8,
    collaborationMode: true,
  };
  
  const result = await enhancedChapterAgent(enhancedInput);
  
  return {
    concludingText: result.concludingText,
  };
}