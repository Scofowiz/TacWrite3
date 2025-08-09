
/**
 * @fileOverview A flow for analyzing text to find and report on repeated words and phrases.
 *
 * - checkRepetitions - A function that analyzes text for repetitions.
 * - RepetitionCheckInput - The input type for the checkRepetitions function.
 * - RepetitionCheckOutput - The return type for the checkRepetitions function.
 */

import { z } from 'zod';
import { createAIClient } from '../client/src/lib/ai-client';

const RepetitionCheckInputSchema = z.object({
  text: z.string().describe('The text to be analyzed for repetitions.'),
});
export type RepetitionCheckInput = z.infer<typeof RepetitionCheckInputSchema>;

const RepetitionSchema = z.object({
    word: z.string().describe("The repeated word or short phrase."),
    count: z.number().describe("The number of times the word/phrase is repeated."),
    suggestion: z.string().describe("A brief suggestion for how to improve the repetition, such as providing synonyms or rephrasing ideas."),
});

const RepetitionCheckOutputSchema = z.object({
  repetitions: z.array(RepetitionSchema).describe('An array of identified repetitions, including the word, its count, and a suggestion for improvement.'),
});
export type RepetitionCheckOutput = z.infer<typeof RepetitionCheckOutputSchema>;

export async function checkRepetitions(input: RepetitionCheckInput): Promise<RepetitionCheckOutput> {
  const client = createAIClient();
  
  const systemPrompt = `You are an expert editor reviewing a piece of writing. Your task is to identify repeated words and short phrases that make the writing less effective.

Analyze the following text and identify the top 5-7 most significant repetitions. For each repetition, provide the word or phrase, how many times it was repeated, and a constructive suggestion for how the author could vary their language. Provide specific synonyms or rephrasing ideas. Focus on non-trivial words (ignore words like 'a', 'the', 'is').

Return your response as a JSON object with this structure:
{
  "repetitions": [
    {
      "word": "example",
      "count": 5,
      "suggestion": "Consider using synonyms like 'instance', 'illustration', or 'sample'"
    }
  ]
}`;

  const prompt = `Text to analyze:
${input.text}`;

  const response = await client.generate(prompt, {
    systemPrompt,
    schema: RepetitionCheckOutputSchema,
    temperature: 0.3,
    maxTokens: 1500
  });

  return response.content as RepetitionCheckOutput;
}
