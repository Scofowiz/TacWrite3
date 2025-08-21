/**
 * @fileOverview Plot analysis flow that identifies plot holes, inconsistencies, and structural issues.
 *
 * - plotAnalysis - A function that analyzes story structure and identifies issues.
 * - PlotAnalysisInput - The input type for the plotAnalysis function.
 * - PlotAnalysisOutput - The return type for the plotAnalysis function.
 */

import { z } from 'zod';
import { createAIClient } from '@/lib/ai-client';

const PlotAnalysisInputSchema = z.object({
  documentContent: z.string().describe('The story content to analyze for plot issues.'),
  narrativeStructure: z.string().optional().describe('The narrative framework to use for analysis (e.g., Hero\'s Journey).'),
  focusAreas: z.array(z.string()).optional().describe('Specific areas to focus on (plot holes, character consistency, pacing, etc.).'),
  memory: z.string().optional().describe('Knowledge graph context for character and world consistency.'),
  contextualPrompt: z.string().optional().describe('Additional context based on user learning preferences.'),
});
export type PlotAnalysisInput = z.infer<typeof PlotAnalysisInputSchema>;

const PlotIssueSchema = z.object({
  type: z.enum(['plot_hole', 'character_inconsistency', 'timeline_issue', 'pacing_problem', 'logical_gap', 'motivation_unclear']).describe('Type of issue identified'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).describe('How significant this issue is'),
  location: z.string().describe('Where in the story this issue occurs'),
  description: z.string().describe('Clear description of the issue'),
  suggestion: z.string().describe('Specific suggestion for how to fix this issue'),
  affectedElements: z.array(z.string()).optional().describe('Characters, events, or plot points affected by this issue'),
});

const PlotAnalysisOutputSchema = z.object({
  overallAssessment: z.string().describe('High-level assessment of the story\'s structural integrity'),
  strengthScore: z.number().min(0).max(10).describe('Overall plot strength score (0-10)'),
  issues: z.array(PlotIssueSchema).describe('List of identified issues'),
  strengths: z.array(z.string()).describe('What\'s working well in the plot'),
  recommendations: z.array(z.string()).describe('Priority recommendations for improvement'),
  structuralNotes: z.string().optional().describe('Notes about how well the story follows the chosen narrative structure'),
});
export type PlotAnalysisOutput = z.infer<typeof PlotAnalysisOutputSchema>;

export async function plotAnalysis(input: PlotAnalysisInput): Promise<PlotAnalysisOutput> {
  const aiClient = createAIClient();

  // Build the system prompt
  let systemPrompt = `You are an expert story analyst and editor. Your task is to carefully analyze the provided story content and identify plot issues, inconsistencies, and structural problems.

Analysis Guidelines:
- Look for plot holes, logical inconsistencies, and gaps in causation
- Check character motivations and consistency
- Examine timeline and sequence issues
- Assess pacing and story flow
- Consider how well the story follows narrative structure principles
- Be specific and constructive in your feedback
- Prioritize issues by severity (critical issues that break the story vs. minor improvements)

Focus on being helpful and actionable - provide clear suggestions for how to fix each issue identified.`;

  // Build the user prompt
  let userPrompt = `Please analyze the following story content for plot issues and structural problems:

STORY CONTENT:
---
${input.documentContent}
---

ANALYSIS FOCUS:`;

  // Add narrative structure context if provided
  if (input.narrativeStructure) {
    userPrompt += `\n\nNarrative Framework: ${input.narrativeStructure}
Please also assess how well the story follows this structural framework.`;
  }

  // Add specific focus areas if provided
  if (input.focusAreas && input.focusAreas.length > 0) {
    userPrompt += `\n\nSpecific Areas to Focus On: ${input.focusAreas.join(', ')}`;
  }

  // Add memory/knowledge graph context if provided
  if (input.memory) {
    userPrompt += `\n\nStory Context (maintain consistency with these details):
---
${input.memory}
---`;
  }

  // Add contextual learning preferences if provided
  if (input.contextualPrompt) {
    systemPrompt += `\n\nUser Preferences (based on previous feedback):
${input.contextualPrompt}`;
  }

  userPrompt += `\n\nProvide a comprehensive analysis with specific, actionable feedback for improving the story's plot and structure.`;

  try {
    const response = await aiClient.generate<PlotAnalysisOutput>(
      userPrompt,
      {
        schema: PlotAnalysisOutputSchema,
        systemPrompt,
        temperature: 0.3, // Lower temperature for more consistent analysis
        maxTokens: 3000,
      }
    );

    return response.content;
  } catch (error) {
    console.error('Error analyzing plot:', error);
    throw new Error('Failed to analyze plot structure');
  }
}