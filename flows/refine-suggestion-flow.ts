
/**
 * @fileOverview A flow for refining a text suggestion based on user feedback.
 *
 * - refineSuggestion - A function that takes a suggestion and user feedback to generate a new suggestion.
 * - RefineSuggestionInput - The input type for the refineSuggestion function.
 * - RefineSuggestionOutput - The return type for the refineSuggestion function.
 */

import { z } from 'zod';
import { createAIClient } from '@/lib/ai-client';

const RefineSuggestionInputSchema = z.object({
  originalSuggestion: z.string().describe('The original AI-generated text suggestion that the user wants to refine.'),
  userFeedback: z.string().describe('The user\'s specific feedback, including compliments or criticisms, on the original suggestion.'),
  context: z.string().optional().describe('The preceding text or context for the suggestion.'),
});
export type RefineSuggestionInput = z.infer<typeof RefineSuggestionInputSchema>;

const RefineSuggestionOutputSchema = z.object({
  refinedSuggestion: z.string().describe('The new, refined suggestion generated based on the user\'s feedback.'),
});
export type RefineSuggestionOutput = z.infer<typeof RefineSuggestionOutputSchema>;

export async function refineSuggestion(input: RefineSuggestionInput): Promise<RefineSuggestionOutput> {
  const client = createAIClient();
  
  const systemPrompt = `You are an AI writing assistant. Your previous suggestion was not quite right for the user.
Your task is to generate a new suggestion that incorporates the user's feedback.

Based on this feedback, please provide a new, improved suggestion. The new suggestion should address the user's points, keeping what they liked and changing what they disliked.
Do not repeat the original suggestion. Provide only the new text.`;

  let prompt = `Original Suggestion:
"${input.originalSuggestion}"

User Feedback:
"${input.userFeedback}"`;

  if (input.context) {
    prompt = `Here is the context for the suggestion:
---
${input.context}
---

${prompt}`;
  }

  const response = await client.generate(prompt, {
    systemPrompt,
    temperature: 0.8,
    maxTokens: 1500
  });

  return {
    refinedSuggestion: response.content as string
  };
}
