
/**
 * @fileOverview A flow for updating a knowledge graph from a document.
 *
 * - updateKnowledgeGraph - A function that handles updating the knowledge graph.
 * - UpdateKnowledgeGraphInput - The input type for the updateKnowledgeGraph function.
 * - UpdateKnowledgeGraphOutput - The return type for the updateKnowledgeGraph function.
 */

import { z } from 'zod';
import { createAIClient } from '../client/src/lib/ai-client';
import { KnowledgeGraphSchema } from '../client/src/lib/ai-schemas';

const UpdateKnowledgeGraphInputSchema = z.object({
  documentContent: z.string().describe('The full content of the document to be analyzed.'),
  existingKnowledgeGraph: KnowledgeGraphSchema.describe('The existing knowledge graph in JSON format.'),
});
export type UpdateKnowledgeGraphInput = z.infer<typeof UpdateKnowledgeGraphInputSchema>;

const UpdateKnowledgeGraphOutputSchema = KnowledgeGraphSchema;
export type UpdateKnowledgeGraphOutput = z.infer<typeof UpdateKnowledgeGraphOutputSchema>;

export async function updateKnowledgeGraph(input: UpdateKnowledgeGraphInput): Promise<UpdateKnowledgeGraphOutput> {
  const client = createAIClient();
  
  const systemPrompt = `You are a highly intelligent knowledge graph extraction and management system for a creative writing project.
Your task is to analyze the provided document content and update the existing knowledge graph.

Read the document carefully. Identify new entities (characters, locations, key items, plot points, world rules), relationships between them, and update existing ones.
Be diligent in categorizing entities correctly into one of the following types: "Character", "Location", "Item", "Plot Point", "World Rule", "Other".
Extract high-level project context like themes and plot threads.

- When creating a new entity, generate a unique, simple ID (e.g., 'character_name_1', 'location_2').
- When updating an entity, add new observations and update the 'updated' timestamp. Do not remove old observations unless they are directly contradicted.
- Ensure all relationships in the 'relations' array use the correct entity IDs.
- Be thorough in your analysis to build a comprehensive and accurate knowledge graph that represents the story.

Update the knowledge graph based on the document content and return the complete, updated JSON object.`;

  const prompt = `Existing Knowledge Graph:
\`\`\`json
${JSON.stringify(input.existingKnowledgeGraph, null, 2)}
\`\`\`

Document Content:
---
${input.documentContent}
---`;

  const response = await client.generate(prompt, {
    systemPrompt,
    schema: UpdateKnowledgeGraphOutputSchema,
    temperature: 0.3,
    maxTokens: 4000
  });

  return response.content as UpdateKnowledgeGraphOutput;
}
