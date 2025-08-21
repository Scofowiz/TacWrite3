
/**
 * @fileOverview A flow for generating a detailed character profile.
 *
 * - generateCharacterProfile - A function that creates a detailed profile for a character.
 * - GenerateCharacterProfileInput - The input type for the function.
 * - GenerateCharacterProfileOutput - The return type for the function.
 */

import { z } from 'zod';
import { createAIClient } from '@/lib/ai-client';

const GenerateCharacterProfileInputSchema = z.object({
  name: z.string().describe("The character's name."),
  description: z.string().describe("A brief description of the character."),
  genre: z.string().optional().describe("The genre of the story."),
});
export type GenerateCharacterProfileInput = z.infer<typeof GenerateCharacterProfileInputSchema>;

const GenerateCharacterProfileOutputSchema = z.object({
  profile: z.object({
    appearance: z.string().describe("The character's physical appearance."),
    personality: z.string().describe("The character's key personality traits and quirks."),
    backstory: z.string().describe("A summary of the character's backstory and motivations."),
    secrets: z.string().describe("A secret the character might be hiding."),
  }),
});
export type GenerateCharacterProfileOutput = z.infer<typeof GenerateCharacterProfileOutputSchema>;

export async function generateCharacterProfile(input: GenerateCharacterProfileInput): Promise<GenerateCharacterProfileOutput> {
  const client = createAIClient();
  
  const systemPrompt = `You are an expert character designer for creative writing. Based on the following character information, create a detailed and compelling character profile.

Flesh out the character with a detailed appearance, a distinct personality, a compelling backstory with clear motivations, and an intriguing secret. Make the character feel real and ready to be dropped into a story.

Return your response as a JSON object with the following structure:
{
  "profile": {
    "appearance": "detailed physical description",
    "personality": "key personality traits and quirks",
    "backstory": "summary of backstory and motivations",
    "secrets": "a secret the character might be hiding"
  }
}`;

  let prompt = `Name: ${input.name}\nDescription: ${input.description}`;
  
  if (input.genre) {
    prompt += `\nGenre: ${input.genre}`;
  }

  const response = await client.generate(prompt, {
    systemPrompt,
    schema: GenerateCharacterProfileOutputSchema,
    temperature: 0.8,
    maxTokens: 2000
  });

  return response.content as GenerateCharacterProfileOutput;
}
