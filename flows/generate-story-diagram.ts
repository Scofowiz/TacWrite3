
/**
 * @fileOverview A flow for generating a Mermaid.js diagram to visualize story structure.
 *
 * - generateStoryDiagram - A function that generates a Mermaid.js flowchart script.
 * - GenerateStoryDiagramInput - The input type for the generateStoryDiagram function.
 * - GenerateStoryDiagramOutput - The return type for the generateStoryDiagram function.
 */

import { z } from 'zod';
import { createAIClient } from '@/lib/ai-client';

const GenerateStoryDiagramInputSchema = z.object({
  documentContent: z
    .string()
    .describe('The full content of the document to be analyzed.'),
  narrativeStructure: z.string().optional().describe('The narrative structure to use as a template (e.g., "Hero\'s Journey", "Save the Cat").')
});
export type GenerateStoryDiagramInput = z.infer<typeof GenerateStoryDiagramInputSchema>;

const GenerateStoryDiagramOutputSchema = z.object({
  diagramScript: z.string().describe('The generated Mermaid.js flowchart script.'),
});
export type GenerateStoryDiagramOutput = z.infer<typeof GenerateStoryDiagramOutputSchema>;

export async function generateStoryDiagram(input: GenerateStoryDiagramInput): Promise<GenerateStoryDiagramOutput> {
  const client = createAIClient();
  
  const systemPrompt = `You are an expert literary analyst. Your task is to analyze the following document and generate a Mermaid.js flowchart script that visualizes its narrative structure.

Use clear and concise labels for each node in the diagram.

IMPORTANT: Your response MUST contain ONLY the Mermaid.js script itself, without any surrounding text, explanations, or markdown formatting like \`\`\`mermaid.

Example of a valid response format:
graph TD
    A[Start] --> B(Character Introduction: Bilbo);
    B --> C{The Unexpected Party};
    C --> D[The Quest Begins];
    D --> E[Challenges and Obstacles];
    E --> F(Climax: Battle of Five Armies);
    F --> G[Return to the Shire];
    G --> H[End];`;

  let prompt = `Document Content:
${input.documentContent}`;

  if (input.narrativeStructure) {
    prompt = `The flowchart should be based on the **${input.narrativeStructure}** framework.

${prompt}`;
  } else {
    prompt = `The flowchart should identify key plot points, character introductions, rising action, climax, falling action, and resolution.

${prompt}`;
  }

  const response = await client.generate(prompt, {
    systemPrompt,
    temperature: 0.7,
    maxTokens: 2000
  });

  // The model sometimes wraps the script in markdown, so we extract it just in case.
  const diagramScript = (response.content as string).replace(/```mermaid\n/, '').replace(/```$/, '').trim();
  
  return { diagramScript };
}
