/**
 * Simple Generate Text Block - Direct replacement without complex dependencies
 * 
 * This provides the core generate-text-block functionality without enhanced features
 * that depend on community memory, WFA agent, or other complex systems.
 */

import { z } from 'zod';
import { createAIClient } from '@/lib/ai-client';

// Simple input schema
export const SimpleGenerateInputSchema = z.object({
  prompt: z.string().describe('The prompt to use for generating the text block.'),
  genre: z.string().optional().describe('The genre of the text to generate (e.g., Fiction, Non-Fiction).'),
  memory: z.string().optional().describe('A JSON string representing the knowledge graph of key story details, character notes, and world-building rules to remember.'),
  contextualPrompt: z.string().optional().describe('Additional context based on user learning preferences.'),
});
export type SimpleGenerateInput = z.infer<typeof SimpleGenerateInputSchema>;

// Simple output schema
export const SimpleGenerateOutputSchema = z.object({
  text: z.string().describe('The generated text block.'),
});
export type SimpleGenerateOutput = z.infer<typeof SimpleGenerateOutputSchema>;

/**
 * Simple Generate Text Block - Core functionality without dependencies
 */
export async function simpleGenerateTextBlock(input: SimpleGenerateInput): Promise<SimpleGenerateOutput> {
  const client = createAIClient();
  
  // Build system prompt
  let systemPrompt = `You are an AI writing assistant. Your primary task is to generate high-quality text based on the user's requirements.

Key Guidelines:
- Write engaging, high-quality content that matches the requested style and tone
- Maintain consistency with any provided context or memory
- Be creative while staying true to the user's vision
- Generate content that flows naturally and is well-structured
- Generate approximately 1000 words of content unless otherwise specified

IMPORTANT: Respond with ONLY the creative text content. Do NOT wrap in JSON or use any formatting. Just write the story/content directly.`;

  // Add contextual prompt if provided
  if (input.contextualPrompt) {
    systemPrompt += `\n\nUser Preferences (based on previous feedback):
${input.contextualPrompt}`;
  }

  // Build user prompt
  let userPrompt = input.prompt;

  if (input.genre) {
    userPrompt += `\n\nGenre: ${input.genre}`;
  }

  if (input.memory) {
    userPrompt += `\n\nStory Context (maintain consistency with these details):
---
${input.memory}
---`;
  }

  try {
    const response = await client.generate(userPrompt, {
      systemPrompt,
      temperature: 0.8,
      maxTokens: 2000, // Increased to accommodate ~1000 words
    });

    const text = typeof response.content === 'string' 
      ? response.content 
      : String(response.content);

    return { text };

  } catch (error) {
    console.error('Simple generate text block error:', error);
    throw new Error(`Text generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Maintain backward compatibility with existing interface
export type GenerateTextBlockInput = SimpleGenerateInput;
export type GenerateTextBlockOutput = SimpleGenerateOutput;

export async function generateTextBlock(input: GenerateTextBlockInput): Promise<GenerateTextBlockOutput> {
  return simpleGenerateTextBlock(input);
}