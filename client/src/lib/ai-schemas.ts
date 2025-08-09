/**
 * AI Schemas - Common schema definitions for AI agent system
 */

import { z } from 'zod';

// Knowledge Graph Schema
export const KnowledgeGraphEntitySchema = z.object({
  id: z.string(),
  type: z.enum(['Character', 'Location', 'Item', 'Plot Point', 'World Rule', 'Other']),
  name: z.string(),
  description: z.string(),
  attributes: z.record(z.any()),
  created: z.date(),
  updated: z.date(),
});

export const KnowledgeGraphRelationSchema = z.object({
  id: z.string(),
  fromEntity: z.string(),
  toEntity: z.string(),
  type: z.string(),
  description: z.string(),
  strength: z.number().min(0).max(1),
  created: z.date(),
});

export const KnowledgeGraphSchema = z.object({
  entities: z.array(KnowledgeGraphEntitySchema),
  relations: z.array(KnowledgeGraphRelationSchema),
  themes: z.array(z.string()),
  plotThreads: z.array(z.string()),
  metadata: z.object({
    lastUpdated: z.date(),
    version: z.string(),
    wordCount: z.number(),
  }),
});

export type KnowledgeGraphEntity = z.infer<typeof KnowledgeGraphEntitySchema>;
export type KnowledgeGraphRelation = z.infer<typeof KnowledgeGraphRelationSchema>;
export type KnowledgeGraph = z.infer<typeof KnowledgeGraphSchema>;

// Community Memory Schema
export const AgentActionSchema = z.object({
  agentId: z.string(),
  agentType: z.string(),
  action: z.string(),
  input: z.any(),
  output: z.any(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  duration: z.number(),
  success: z.boolean(),
  timestamp: z.date().default(() => new Date()),
});

export type AgentAction = z.infer<typeof AgentActionSchema>;

export const CommunityMemorySchema = z.object({
  actions: z.array(AgentActionSchema),
  patterns: z.record(z.any()),
  insights: z.array(z.string()),
  lastUpdated: z.date(),
});

export type CommunityMemory = z.infer<typeof CommunityMemorySchema>;