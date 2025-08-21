/**
 * @fileOverview Community Memory Pool - Shared intelligence system for agent collaboration
 * 
 * This provides the distributed memory system that allows agents to share context,
 * insights, and learnings for seamless handoffs and collective intelligence.
 */

import { z } from 'zod';
import { EventEmitter } from 'events';

// Agent action logging
export const AgentActionSchema = z.object({
  actionId: z.string(),
  agentId: z.string(),
  agentType: z.string(),
  timestamp: z.date(),
  action: z.string(),
  input: z.any(),
  output: z.any(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  context: z.record(z.any()).optional(),
  duration: z.number(),
  success: z.boolean(),
});
export type AgentAction = z.infer<typeof AgentActionSchema>;

// Contextual insights from agents
export const ContextInsightSchema = z.object({
  insightId: z.string(),
  agentId: z.string(),
  timestamp: z.date(),
  category: z.enum(['character', 'plot', 'style', 'structure', 'theme', 'dialogue', 'world-building']),
  insight: z.string(),
  confidence: z.number().min(0).max(1),
  relevantEntities: z.array(z.string()).optional(),
  applicableContexts: z.array(z.string()).optional(),
});
export type ContextInsight = z.infer<typeof ContextInsightSchema>;

// Performance scoring for quality tracking
export const PerformanceScoreSchema = z.object({
  scoreId: z.string(),
  agentId: z.string(),
  timestamp: z.date(),
  taskType: z.string(),
  qualityScore: z.number().min(0).max(10),
  userRating: z.enum(['good', 'ok', 'poor', 'decline']).optional(),
  modelUsed: z.string(),
  iterationCount: z.number(),
  improvements: z.array(z.string()),
  weaknesses: z.array(z.string()),
  contextFactors: z.record(z.any()),
});
export type PerformanceScore = z.infer<typeof PerformanceScoreSchema>;

// Agent capabilities and strengths
export const AgentCapabilitySchema = z.object({
  agentId: z.string(),
  agentType: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  specializations: z.array(z.string()),
  averageQuality: z.number().min(0).max(10),
  reliabilityScore: z.number().min(0).max(1),
  preferredTaskTypes: z.array(z.string()),
  lastUpdated: z.date(),
});
export type AgentCapability = z.infer<typeof AgentCapabilitySchema>;

// Document state snapshot
export const DocumentSnapshotSchema = z.object({
  snapshotId: z.string(),
  timestamp: z.date(),
  wordCount: z.number(),
  lastModifiedBy: z.string(),
  currentSection: z.string().optional(),
  activeThreads: z.array(z.string()),
  pendingTasks: z.array(z.string()),
  qualityScore: z.number().min(0).max(10).optional(),
  checksum: z.string(),
});
export type DocumentSnapshot = z.infer<typeof DocumentSnapshotSchema>;

// Narrative threads tracking
export const NarrativeThreadSchema = z.object({
  threadId: z.string(),
  title: z.string(),
  status: z.enum(['active', 'resolved', 'pending', 'abandoned']),
  createdBy: z.string(),
  lastUpdatedBy: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  relatedCharacters: z.array(z.string()),
  relatedLocations: z.array(z.string()),
  expectedResolution: z.string().optional(),
  notes: z.array(z.string()),
  timestamp: z.date(),
});
export type NarrativeThread = z.infer<typeof NarrativeThreadSchema>;

// Task assignment system
export const TaskSchema = z.object({
  taskId: z.string(),
  assignedTo: z.string(),
  createdBy: z.string(),
  taskType: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  description: z.string(),
  context: z.record(z.any()),
  deadline: z.date().optional(),
  status: z.enum(['pending', 'in-progress', 'completed', 'failed']),
  dependencies: z.array(z.string()),
  estimatedDuration: z.number(),
  actualDuration: z.number().optional(),
  timestamp: z.date(),
});
export type Task = z.infer<typeof TaskSchema>;

// Handoff protocol for agent transitions
export const HandoffProtocolSchema = z.object({
  handoffId: z.string(),
  fromAgent: z.string(),
  toAgent: z.string(),
  timestamp: z.date(),
  contextSummary: z.string(),
  criticalConstraints: z.array(z.string()),
  pendingTasks: z.array(z.string()),
  qualityExpectations: z.string(),
  specificInstructions: z.string(),
  urgencyLevel: z.enum(['low', 'normal', 'high', 'critical']),
  estimatedHandoffTime: z.number(),
});
export type HandoffProtocol = z.infer<typeof HandoffProtocolSchema>;

// Main community memory pool structure
export const CommunityMemoryPoolSchema = z.object({
  poolId: z.string(),
  lastUpdated: z.date(),
  agentContributions: z.record(z.object({
    capabilities: z.array(z.string()),
    recentActions: z.array(AgentActionSchema),
    contextualInsights: z.array(ContextInsightSchema),
    performanceMetrics: z.array(PerformanceScoreSchema),
    lastContribution: z.date(),
  })),
  sharedContext: z.object({
    documentState: DocumentSnapshotSchema,
    activeThreads: z.array(NarrativeThreadSchema),
    characterConsistency: z.array(z.record(z.any())),
    worldBuildingRules: z.array(z.record(z.any())),
    styleGuidelines: z.array(z.string()),
    qualityStandards: z.record(z.number()),
  }),
  handoffProtocol: HandoffProtocolSchema.optional(),
  systemHealth: z.record(z.any()),
  learningPatterns: z.array(z.record(z.any())),
});
export type CommunityMemoryPool = z.infer<typeof CommunityMemoryPoolSchema>;

/**
 * CommunityMemoryManager - Manages shared agent intelligence and context
 */
export class CommunityMemoryManager extends EventEmitter {
  private memoryPool: CommunityMemoryPool;
  private updateListeners = new Set<string>();

  constructor() {
    super();
    
    this.memoryPool = {
      poolId: `pool_${Date.now()}`,
      lastUpdated: new Date(),
      agentContributions: {},
      sharedContext: {
        documentState: {
          snapshotId: `snapshot_${Date.now()}`,
          timestamp: new Date(),
          wordCount: 0,
          lastModifiedBy: 'system',
          activeThreads: [],
          pendingTasks: [],
          checksum: '',
        },
        activeThreads: [],
        characterConsistency: [],
        worldBuildingRules: [],
        styleGuidelines: [],
        qualityStandards: {},
      },
      systemHealth: {},
      learningPatterns: [],
    };
  }

  /**
   * Register an agent with the community memory pool
   */
  registerAgent(agentId: string, capabilities: string[]): void {
    this.memoryPool.agentContributions[agentId] = {
      capabilities,
      recentActions: [],
      contextualInsights: [],
      performanceMetrics: [],
      lastContribution: new Date(),
    };
    
    this.updateTimestamp();
    this.emit('agent-registered', { agentId, capabilities });
  }

  /**
   * Log an agent action to shared memory
   */
  logAgentAction(action: Omit<AgentAction, 'actionId' | 'timestamp'>): void {
    const agentAction: AgentAction = {
      ...action,
      actionId: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    if (!this.memoryPool.agentContributions[action.agentId]) {
      this.registerAgent(action.agentId, []);
    }

    const contribution = this.memoryPool.agentContributions[action.agentId];
    contribution.recentActions.push(agentAction);
    
    // Keep only last 50 actions per agent
    if (contribution.recentActions.length > 50) {
      contribution.recentActions = contribution.recentActions.slice(-50);
    }
    
    contribution.lastContribution = new Date();
    this.updateTimestamp();
    
    this.emit('action-logged', agentAction);
  }

  /**
   * Add contextual insight from an agent
   */
  addContextualInsight(insight: Omit<ContextInsight, 'insightId' | 'timestamp'>): void {
    const contextInsight: ContextInsight = {
      ...insight,
      insightId: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    if (!this.memoryPool.agentContributions[insight.agentId]) {
      this.registerAgent(insight.agentId, []);
    }

    const contribution = this.memoryPool.agentContributions[insight.agentId];
    contribution.contextualInsights.push(contextInsight);
    
    // Keep only last 100 insights per agent
    if (contribution.contextualInsights.length > 100) {
      contribution.contextualInsights = contribution.contextualInsights.slice(-100);
    }
    
    contribution.lastContribution = new Date();
    this.updateTimestamp();
    
    this.emit('insight-added', contextInsight);
  }

  /**
   * Record performance score for quality tracking
   */
  recordPerformanceScore(score: Omit<PerformanceScore, 'scoreId' | 'timestamp'>): void {
    const performanceScore: PerformanceScore = {
      ...score,
      scoreId: `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    if (!this.memoryPool.agentContributions[score.agentId]) {
      this.registerAgent(score.agentId, []);
    }

    const contribution = this.memoryPool.agentContributions[score.agentId];
    contribution.performanceMetrics.push(performanceScore);
    
    // Keep only last 200 scores per agent
    if (contribution.performanceMetrics.length > 200) {
      contribution.performanceMetrics = contribution.performanceMetrics.slice(-200);
    }
    
    contribution.lastContribution = new Date();
    this.updateTimestamp();
    
    this.emit('performance-recorded', performanceScore);
  }

  /**
   * Update document state snapshot
   */
  updateDocumentState(snapshot: Omit<DocumentSnapshot, 'snapshotId' | 'timestamp'>): void {
    this.memoryPool.sharedContext.documentState = {
      ...snapshot,
      snapshotId: `snapshot_${Date.now()}`,
      timestamp: new Date(),
    };
    
    this.updateTimestamp();
    this.emit('document-updated', this.memoryPool.sharedContext.documentState);
  }

  /**
   * Add or update narrative thread
   */
  updateNarrativeThread(thread: Omit<NarrativeThread, 'threadId' | 'timestamp'>): void {
    const narrativeThread: NarrativeThread = {
      ...thread,
      threadId: `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    // Remove existing thread with same title
    this.memoryPool.sharedContext.activeThreads = this.memoryPool.sharedContext.activeThreads
      .filter(t => t.title !== thread.title);
    
    this.memoryPool.sharedContext.activeThreads.push(narrativeThread);
    
    this.updateTimestamp();
    this.emit('thread-updated', narrativeThread);
  }

  /**
   * Create handoff protocol for agent transition
   */
  createHandoff(handoff: Omit<HandoffProtocol, 'handoffId' | 'timestamp'>): string {
    const handoffProtocol: HandoffProtocol = {
      ...handoff,
      handoffId: `handoff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.memoryPool.handoffProtocol = handoffProtocol;
    this.updateTimestamp();
    
    this.emit('handoff-created', handoffProtocol);
    return handoffProtocol.handoffId;
  }

  /**
   * Get context for specific agent type
   */
  getContextForAgent(agentType: string): any {
    const relevantActions = Object.values(this.memoryPool.agentContributions)
      .flatMap(contrib => contrib.recentActions)
      .filter(action => action.agentType === agentType)
      .slice(-10); // Last 10 relevant actions

    const relevantInsights = Object.values(this.memoryPool.agentContributions)
      .flatMap(contrib => contrib.contextualInsights)
      .slice(-20); // Last 20 insights

    return {
      documentState: this.memoryPool.sharedContext.documentState,
      recentActions: relevantActions,
      insights: relevantInsights,
      activeThreads: this.memoryPool.sharedContext.activeThreads,
      handoffContext: this.memoryPool.handoffProtocol,
      styleGuidelines: this.memoryPool.sharedContext.styleGuidelines,
      qualityStandards: this.memoryPool.sharedContext.qualityStandards,
    };
  }

  /**
   * Get agent performance analytics
   */
  getAgentAnalytics(agentId: string): any {
    const contribution = this.memoryPool.agentContributions[agentId];
    if (!contribution) return null;

    const recentScores = contribution.performanceMetrics.slice(-20);
    const averageQuality = recentScores.length > 0 
      ? recentScores.reduce((sum, score) => sum + score.qualityScore, 0) / recentScores.length
      : 0;

    const successRate = contribution.recentActions.length > 0
      ? contribution.recentActions.filter(action => action.success).length / contribution.recentActions.length
      : 0;

    return {
      agentId,
      averageQuality,
      successRate,
      totalActions: contribution.recentActions.length,
      totalInsights: contribution.contextualInsights.length,
      capabilities: contribution.capabilities,
      lastContribution: contribution.lastContribution,
      recentTrends: this.calculatePerformanceTrends(recentScores),
    };
  }

  /**
   * Get full memory pool state
   */
  getMemoryPool(): CommunityMemoryPool {
    return JSON.parse(JSON.stringify(this.memoryPool));
  }

  /**
   * Subscribe to memory updates
   */
  subscribeToUpdates(agentId: string): void {
    this.updateListeners.add(agentId);
  }

  /**
   * Unsubscribe from memory updates
   */
  unsubscribeFromUpdates(agentId: string): void {
    this.updateListeners.delete(agentId);
  }

  private updateTimestamp(): void {
    this.memoryPool.lastUpdated = new Date();
    
    // Notify all subscribed agents of updates
    this.updateListeners.forEach(agentId => {
      this.emit('memory-updated', { agentId, timestamp: this.memoryPool.lastUpdated });
    });
  }

  private calculatePerformanceTrends(scores: PerformanceScore[]): any {
    if (scores.length < 5) return { trend: 'insufficient-data' };

    const recent = scores.slice(-5);
    const earlier = scores.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, score) => sum + score.qualityScore, 0) / recent.length;
    const earlierAvg = earlier.length > 0 
      ? earlier.reduce((sum, score) => sum + score.qualityScore, 0) / earlier.length
      : recentAvg;

    const trendDirection = recentAvg > earlierAvg ? 'improving' : 
                          recentAvg < earlierAvg ? 'declining' : 'stable';

    return {
      trend: trendDirection,
      recentAverage: recentAvg,
      changePercent: ((recentAvg - earlierAvg) / earlierAvg) * 100,
    };
  }
}

// Global community memory manager instance
export const globalCommunityMemory = new CommunityMemoryManager();