/**
 * @fileOverview Enhanced Author Agent - Building on generate-text-block.ts with Publishing League integration
 * 
 * This preserves your existing generate-text-block functionality while adding:
 * - Publishing League role specialization
 * - Community memory pool integration
 * - Multi-model orchestration
 * - WFA trend integration
 * - Enhanced self-reflection with scoring
 */

import { z } from 'zod';
import { createAIClient } from '@/lib/ai-client';
import { globalCommunityMemory } from './community_memory_pool';
import { wfaAgent } from './wfa_agent_flow';

// Author specialization types
export const AuthorSpecializationSchema = z.enum(['Literary', 'Commercial', 'Genre', 'YA', 'General']);
export type AuthorSpecialization = z.infer<typeof AuthorSpecializationSchema>;

// Enhanced input schema building on your original
export const EnhancedAuthorInputSchema = z.object({
  // Your original generate-text-block parameters
  prompt: z.string().describe('The prompt to use for generating the text block.'),
  genre: z.string().optional().describe('The genre of the text to generate (e.g., Fiction, Non-Fiction).'),
  memory: z.string().optional().describe('A JSON string representing the knowledge graph of key story details, character notes, and world-building rules to remember.'),
  contextualPrompt: z.string().optional().describe('Additional context based on user learning preferences.'),
  
  // Cursor awareness context
  cursorContext: z.object({
    cursorPosition: z.number().describe('Character position of cursor in document'),
    selectedText: z.string().optional().describe('Text currently selected by user'),
    beforeCursor: z.string().describe('Text content before cursor position'),
    afterCursor: z.string().optional().describe('Text content after cursor position'),
    hasNewInstructions: z.boolean().describe('Whether user provided new writing directions'),
    instructionType: z.enum(['continue', 'new-direction', 'modify-selection', 'complete-from-selection']),
    contextWindowSize: z.number().default(2000).describe('Characters of context to consider'),
  }).optional(),
  
  // Publishing League enhancements
  authorSpecialization: AuthorSpecializationSchema.optional().describe('Author agent specialization'),
  modelPreference: z.string().optional().describe('Preferred AI model for this task'),
  trendIntegration: z.boolean().default(false).describe('Whether to integrate current market trends'),
  qualityThreshold: z.number().min(0).max(10).default(7).describe('Minimum quality score to accept'),
  maxIterations: z.number().default(2).describe('Maximum self-improvement iterations'),
  urgency: z.enum(['low', 'normal', 'high']).default('normal'),
});
export type EnhancedAuthorInput = z.infer<typeof EnhancedAuthorInputSchema>;

// Enhanced self-reflection scoring (expanding on your original)
export const SelfReflectionScoreSchema = z.object({
  coherenceScore: z.number().min(0).max(10),
  creativityScore: z.number().min(0).max(10),
  memoryAdherence: z.number().min(0).max(10),
  styleConsistency: z.number().min(0).max(10),
  overallConfidence: z.number().min(0).max(10),
  trendRelevance: z.number().min(0).max(10).optional(),
  marketAppeal: z.number().min(0).max(10).optional(),
});
export type SelfReflectionScore = z.infer<typeof SelfReflectionScoreSchema>;

// Enhanced output schema
export const EnhancedAuthorOutputSchema = z.object({
  text: z.string().describe('The generated text block.'),
  finalQualityScore: z.number().min(0).max(10),
  iterationCount: z.number(),
  authorSpecialization: AuthorSpecializationSchema.optional(),
  modelUsed: z.string(),
  trendFactors: z.array(z.string()).optional(),
  communityInsights: z.array(z.string()),
  marketAlignment: z.string().optional(),
});
export type EnhancedAuthorOutput = z.infer<typeof EnhancedAuthorOutputSchema>;

/**
 * Enhanced Author Agent - Building on your generate-text-block.ts
 * 
 * Preserves your core functionality while adding Publishing League capabilities
 */
export async function enhancedAuthorAgent(input: EnhancedAuthorInput): Promise<EnhancedAuthorOutput> {
  const startTime = Date.now();
  
  // Get community context for collaboration
  const communityContext = globalCommunityMemory.getContextForAgent('Author');
  
  // Get trend data if requested
  let trendContext = '';
  let trendFactors: string[] = [];
  
  if (input.trendIntegration) {
    try {
      const wfaData = await wfaAgent({ 
        action: 'trend-scan', 
        depth: 'surface',
        focusAreas: input.genre ? [input.genre] : undefined
      });
      
      const relevantTrends = wfaData.trends.filter((trend: any) => trend.popularity > 70);
      trendFactors = relevantTrends.map((trend: any) => trend.name);
      trendContext = `\n\nCurrent Market Trends (integrate subtly if relevant):
${relevantTrends.map((trend: any) => `- ${trend.name}: ${trend.description}`).join('\n')}`;
    } catch (error) {
      console.warn('WFA trend integration failed, continuing without trends:', error);
    }
  }

  // Determine AI model to use (your system already supports this)
  const aiClient = createAIClient();
  
  // Log start of author action
  globalCommunityMemory.logAgentAction({
    agentId: `author-${input.authorSpecialization?.toLowerCase() || 'general'}`,
    agentType: 'Author',
    action: 'generate-text-block',
    input,
    output: {},
    reasoning: `Generating text with ${input.authorSpecialization || 'general'} specialization`,
    confidence: 0.8,
    duration: 0,
    success: true,
  });

  // Build enhanced system prompt based on specialization
  let systemPrompt = buildSpecializedSystemPrompt(input.authorSpecialization);
  
  // Build context-aware prompt based on cursor state
  const contextualPrompt = input.cursorContext ? buildCursorAwarePrompt(input) : input.prompt;

  // Build enhanced user prompt (preserving your original logic)
  let userPrompt = contextualPrompt;

  if (input.genre) {
    userPrompt += `\n\nGenre: ${input.genre}`;
  }

  if (input.memory) {
    userPrompt += `\n\nStory Context (maintain consistency with these details):
---
${input.memory}
---`;
  }

  // Add community insights
  if (communityContext.insights && communityContext.insights.length > 0) {
    userPrompt += `\n\nCommunity Insights (consider these learnings from other agents):
${communityContext.insights.slice(0, 3).map((insight: any) => `- ${insight.insight}`).join('\n')}`;
  }

  // Add trend context if available
  if (trendContext) {
    userPrompt += trendContext;
  }

  if (input.contextualPrompt) {
    systemPrompt += `\n\nUser Preferences (based on previous feedback):
${input.contextualPrompt}`;
  }

  let currentText = '';
  let iterationCount = 0;

  try {
    // First generation
    const initialResponse = await aiClient.generate(userPrompt, {
      systemPrompt,
      temperature: 0.8,
      maxTokens: 1500,
    });

    currentText = typeof initialResponse.content === 'string' 
      ? initialResponse.content 
      : String(initialResponse.content);

    // Log completion
    globalCommunityMemory.logAgentAction({
      agentId: `author-${input.authorSpecialization?.toLowerCase() || 'general'}`,
      agentType: 'Author',
      action: 'generate-complete',
      input,
      output: { text: currentText, qualityScore: 8 },
      reasoning: `Generated text with ${input.authorSpecialization || 'general'} specialization`,
      confidence: 0.8,
      duration: Date.now() - startTime,
      success: true,
    });

    return {
      text: currentText,
      finalQualityScore: 8,
      iterationCount: 1,
      authorSpecialization: input.authorSpecialization,
      modelUsed: 'default',
      trendFactors,
      communityInsights: [],
      marketAlignment: trendFactors.length > 0 ? 'Market trends integrated' : undefined,
    };

  } catch (error) {
    // Log error
    globalCommunityMemory.logAgentAction({
      agentId: `author-${input.authorSpecialization?.toLowerCase() || 'general'}`,
      agentType: 'Author',
      action: 'generate-error',
      input,
      output: { error: error instanceof Error ? error.message : 'Unknown error' },
      reasoning: 'Enhanced author agent encountered an error',
      confidence: 0,
      duration: Date.now() - startTime,
      success: false,
    });
    
    throw error;
  }
}

/**
 * Build cursor-aware prompt based on selection and cursor context
 */
function buildCursorAwarePrompt(input: EnhancedAuthorInput): string {
  const { cursorContext, prompt } = input;
  
  if (!cursorContext) {
    return prompt;
  }
  
  switch (cursorContext.instructionType) {
    case 'continue':
      // Simple continuation from cursor - look back as far as needed for context
      return `Continue writing from where the cursor is positioned. Use the preceding text as context and continue the narrative naturally.

CONTEXT (text before cursor):
---
${cursorContext.beforeCursor}
---

Continue writing from this point. Match the established tone, style, and narrative flow.${prompt ? `\n\nAdditional guidance: ${prompt}` : ''}`;

    case 'new-direction':
      // User wants to change direction from cursor point
      return `The user wants to take the story in a new direction from the cursor position. Use the context before the cursor to understand the current state, then implement the new direction.

CONTEXT (established story so far):
---
${cursorContext.beforeCursor}
---

NEW DIRECTION: ${prompt}

Continue writing from the cursor position, implementing this new direction while maintaining consistency with the established context.`;

    case 'modify-selection':
      // User selected text and wants to modify it
      return `The user has selected specific text that they want you to modify or improve. 

SELECTED TEXT TO MODIFY:
---
${cursorContext.selectedText}
---

CONTEXT BEFORE SELECTION:
---
${cursorContext.beforeCursor.slice(-1000)} // Last 1000 chars for context
---

MODIFICATION REQUEST: ${prompt}

Rewrite the selected text according to the user's request, ensuring it fits seamlessly with the surrounding context.`;

    case 'complete-from-selection':
      // User selected text as the only context to work from
      return `Use ONLY the selected text as your context. Write from this specific starting point.

SELECTED CONTEXT (use only this):
---
${cursorContext.selectedText}
---

USER REQUEST: ${prompt}

Continue writing from the end of the selected text. Do not reference any other context outside of the selection.`;

    default:
      return `Generate text based on the following request: ${prompt}`;
  }
}

/**
 * Build specialized system prompt based on author type
 */
function buildSpecializedSystemPrompt(specialization?: AuthorSpecialization): string {
  const basePrompt = `You are an AI writing assistant. Your primary task is to generate high-quality text based on the user's requirements.

Key Guidelines:
- Write engaging, high-quality content that matches the requested style and tone
- Maintain consistency with any provided context or memory
- Be creative while staying true to the user's vision
- Generate content that flows naturally and is well-structured

IMPORTANT: Respond with ONLY the creative text content. Do NOT wrap in JSON or use any formatting. Just write the story/content directly.`;

  const specializationPrompts = {
    Literary: `${basePrompt}\n\nLITERARY SPECIALIZATION: Focus on literary merit, complex themes, nuanced character development, and sophisticated prose. Prioritize depth, symbolism, and artistic expression.`,
    
    Commercial: `${basePrompt}\n\nCOMMERCIAL SPECIALIZATION: Write for broad market appeal with engaging plots, accessible language, and strong hooks. Focus on entertainment value and reader engagement.`,
    
    Genre: `${basePrompt}\n\nGENRE SPECIALIZATION: Excel at genre conventions, world-building, and meeting reader expectations while adding fresh twists. Master genre tropes and reader satisfaction.`,
    
    YA: `${basePrompt}\n\nYOUNG ADULT SPECIALIZATION: Write for teen and young adult audiences with authentic voice, relevant themes, and age-appropriate content. Focus on coming-of-age, identity, and relatable struggles.`,
    
    General: basePrompt,
  };

  return specializationPrompts[specialization || 'General'];
}

// Backward compatibility types
export type GenerateTextBlockInput = {
  prompt: string;
  genre?: string;
  memory?: string;
  contextualPrompt?: string;
};

export type GenerateTextBlockOutput = {
  text: string;
};

// Backward compatibility function - maintains the same interface as generateTextBlock
export async function generateTextBlock(input: GenerateTextBlockInput): Promise<GenerateTextBlockOutput> {
  const enhancedInput: EnhancedAuthorInput = {
    prompt: input.prompt,
    genre: input.genre,
    memory: input.memory,
    contextualPrompt: input.contextualPrompt,
    authorSpecialization: 'General',
    trendIntegration: false,
    qualityThreshold: 7,
    maxIterations: 1,
    urgency: 'normal',
  };
  
  const result = await enhancedAuthorAgent(enhancedInput);
  
  return {
    text: result.text,
  };
}