/**
 * @fileOverview Agent Orchestrator - Central coordination system for TACWrite agents
 * 
 * This provides the main orchestration layer that:
 * - Manages transitions between old flows and new enhanced agents
 * - Coordinates with community memory pool
 * - Handles agent container management
 * - Provides unified interface for UI components
 * - Manages contextual selection persistence
 */

import { z } from 'zod';
import { AgentContainer, AgentConfig, globalAgentRegistry } from './agent_container_system';
import { globalCommunityMemory, CommunityMemoryManager } from './community_memory_pool';

// Import old flows
import { autonomousContinuation } from '../flows/autonomous-continuation';
import { writingTutor } from '../flows/writing-tutor-flow';
import { endChapter } from '../flows/end-chapter';
import { generateTextBlock } from '../flows/generate-text-block';

// Import enhanced agents from their integrated files
import { enhancedAutonomousAgent } from './autonomous-continuation';
import { enhancedTutorAgent } from './writing-tutor-flow';
import { enhancedChapterAgent } from './end-chapter';
import { enhancedContinueAgent } from './continue-text';

// Migration strategy configuration
export const MigrationStrategySchema = z.object({
  strategy: z.enum(['gradual', 'immediate', 'a-b-test']).default('gradual'),
  agentMigrationStatus: z.object({
    autonomousAgent: z.enum(['old', 'new', 'hybrid']).default('hybrid'),
    tutorAgent: z.enum(['old', 'new', 'hybrid']).default('hybrid'),
    chapterAgent: z.enum(['old', 'new', 'hybrid']).default('hybrid'),
    continueAgent: z.enum(['old', 'new', 'hybrid']).default('hybrid'),
  }),
  fallbackEnabled: z.boolean().default(true),
  qualityThreshold: z.number().min(0).max(10).default(7),
});
export type MigrationStrategy = z.infer<typeof MigrationStrategySchema>;

// Unified agent request interface
export const AgentRequestSchema = z.object({
  agentType: z.enum(['autonomous', 'tutor', 'chapter', 'continue', 'quality']),
  input: z.any(),
  context: z.object({
    selectedText: z.string().optional(),
    cursorPosition: z.number().optional(),
    documentContent: z.string(),
    userId: z.string(),
    sessionId: z.string().optional(),
  }),
  preferences: z.object({
    useEnhanced: z.boolean().optional(),
    qualityThreshold: z.number().min(0).max(10).default(7),
    enableCommunityLearning: z.boolean().default(true),
    enableTrendIntegration: z.boolean().default(false),
  }).optional(),
});
export type AgentRequest = z.infer<typeof AgentRequestSchema>;

// Unified agent response interface
export const AgentResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  agentUsed: z.enum(['old', 'new', 'hybrid']),
  qualityScore: z.number().min(0).max(10).optional(),
  executionTime: z.number(),
  communityInsights: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  fallbackUsed: z.boolean().default(false),
});
export type AgentResponse = z.infer<typeof AgentResponseSchema>;

/**
 * Agent Orchestrator - Main coordination system for TACWrite agents
 */
export class AgentOrchestrator {
  private migrationStrategy: MigrationStrategy;
  private containerRegistry = new Map<string, AgentContainer>();

  constructor(migrationStrategy?: Partial<MigrationStrategy>) {
    this.migrationStrategy = MigrationStrategySchema.parse(migrationStrategy || {});
    this.initializeAgentContainers();
  }

  /**
   * Execute an agent request with orchestration logic
   */
  async executeAgent(request: AgentRequest): Promise<AgentResponse> {
    const startTime = Date.now();
    const agentStatus = this.getAgentMigrationStatus(request.agentType);
    
    try {
      // Log request to community memory
      globalCommunityMemory.logAgentAction({
        agentId: 'agent-orchestrator',
        agentType: 'CommunityMemory',
        action: 'agent-request',
        input: { agentType: request.agentType, hasSelection: !!request.context.selectedText },
        output: {},
        reasoning: `Routing ${request.agentType} request with ${agentStatus} strategy`,
        confidence: 0.9,
        duration: 0,
        success: true,
      });

      // Determine which implementation to use
      let result: AgentResponse;
      
      switch (agentStatus) {
        case 'new':
          result = await this.executeEnhancedAgent(request);
          break;
        case 'old':
          result = await this.executeLegacyAgent(request);
          break;
        case 'hybrid':
        default:
          result = await this.executeHybridAgent(request);
          break;
      }

      // Calculate execution time
      result.executionTime = Date.now() - startTime;

      // Update community memory with results
      if (result.success && result.qualityScore) {
        globalCommunityMemory.recordPerformanceScore({
          agentId: `${request.agentType}-agent`,
          taskType: request.agentType,
          qualityScore: result.qualityScore,
          modelUsed: 'various',
          iterationCount: 1,
          improvements: result.recommendations || [],
          weaknesses: [],
          contextFactors: {
            hasSelection: !!request.context.selectedText,
            documentLength: request.context.documentContent.length,
            agentUsed: result.agentUsed,
          },
        });
      }

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Log error to community memory
      globalCommunityMemory.logAgentAction({
        agentId: 'agent-orchestrator',
        agentType: 'CommunityMemory',
        action: 'agent-error',
        input: { agentType: request.agentType },
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
        reasoning: 'Agent orchestrator encountered an error',
        confidence: 0,
        duration: executionTime,
        success: false,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        agentUsed: agentStatus,
        executionTime,
        fallbackUsed: false,
      };
    }
  }

  /**
   * Execute enhanced (new) agent implementation
   */
  private async executeEnhancedAgent(request: AgentRequest): Promise<AgentResponse> {
    try {
      let result: any;
      
      switch (request.agentType) {
        case 'autonomous':
          result = await enhancedAutonomousAgent(this.buildEnhancedAutonomousInput(request));
          return this.buildAgentResponse(result, 'new', result.qualityMetrics?.overallQuality);
          
        case 'tutor':
          result = await enhancedTutorAgent(this.buildEnhancedTutorInput(request));
          return this.buildAgentResponse(result, 'new', result.qualityMetrics?.overallQuality);
          
        case 'chapter':
          result = await enhancedChapterAgent(this.buildEnhancedChapterInput(request));
          return this.buildAgentResponse(result, 'new', result.qualityMetrics?.overallQuality);
          
        case 'continue':
          result = await enhancedContinueAgent(this.buildEnhancedContinueInput(request));
          return this.buildAgentResponse(result, 'new', result.qualityMetrics?.overallQuality);
          
        default:
          throw new Error(`Enhanced agent not available for type: ${request.agentType}`);
      }
    } catch (error) {
      if (this.migrationStrategy.fallbackEnabled) {
        console.warn(`Enhanced agent failed, falling back to legacy: ${error}`);
        const fallbackResult = await this.executeLegacyAgent(request);
        return { ...fallbackResult, fallbackUsed: true };
      }
      throw error;
    }
  }

  /**
   * Execute legacy (old) agent implementation
   */
  private async executeLegacyAgent(request: AgentRequest): Promise<AgentResponse> {
    let result: any;
    
    switch (request.agentType) {
      case 'autonomous':
        result = await autonomousContinuation(this.buildLegacyAutonomousInput(request));
        break;
        
      case 'tutor':
        result = await writingTutor(this.buildLegacyTutorInput(request));
        break;
        
      case 'chapter':
        result = await endChapter(this.buildLegacyChapterInput(request));
        break;
        
      case 'continue':
        result = await generateTextBlock(this.buildLegacyContinueInput(request));
        break;
        
      default:
        throw new Error(`Legacy agent not available for type: ${request.agentType}`);
    }
    
    return this.buildAgentResponse(result, 'old');
  }

  /**
   * Execute hybrid approach (quality-based selection)
   */
  private async executeHybridAgent(request: AgentRequest): Promise<AgentResponse> {
    // Use community memory to determine best approach
    const communityContext = globalCommunityMemory.getContextForAgent(request.agentType);
    const recentPerformance = this.analyzeRecentPerformance(communityContext, request.agentType);
    
    // Decision logic: use enhanced if recent performance is good, otherwise use legacy
    const useEnhanced = request.preferences?.useEnhanced ?? 
                       (recentPerformance.enhancedSuccess > recentPerformance.legacySuccess);
    
    if (useEnhanced) {
      try {
        const result = await this.executeEnhancedAgent(request);
        
        // If quality is below threshold, try legacy as fallback
        if (result.qualityScore && result.qualityScore < this.migrationStrategy.qualityThreshold) {
          console.log('Enhanced agent quality below threshold, trying legacy fallback');
          const fallbackResult = await this.executeLegacyAgent(request);
          
          // Return better result
          if (!fallbackResult.qualityScore || 
              (result.qualityScore && result.qualityScore > (fallbackResult.qualityScore || 0))) {
            return result;
          } else {
            return { ...fallbackResult, fallbackUsed: true };
          }
        }
        
        return result;
      } catch (error) {
        console.warn('Enhanced agent failed in hybrid mode, falling back to legacy:', error);
        const fallbackResult = await this.executeLegacyAgent(request);
        return { ...fallbackResult, fallbackUsed: true };
      }
    } else {
      return await this.executeLegacyAgent(request);
    }
  }

  /**
   * Get current migration status for specific agent type
   */
  private getAgentMigrationStatus(agentType: string): 'old' | 'new' | 'hybrid' {
    switch (agentType) {
      case 'autonomous':
        return this.migrationStrategy.agentMigrationStatus.autonomousAgent;
      case 'tutor':
        return this.migrationStrategy.agentMigrationStatus.tutorAgent;
      case 'chapter':
        return this.migrationStrategy.agentMigrationStatus.chapterAgent;
      case 'continue':
        return this.migrationStrategy.agentMigrationStatus.continueAgent;
      default:
        return 'hybrid';
    }
  }

  /**
   * Initialize agent containers
   */
  private initializeAgentContainers(): void {
    const agentTypes = ['autonomous', 'tutor', 'chapter', 'continue', 'quality'];
    
    agentTypes.forEach(type => {
      const config: AgentConfig = {
        agentId: `${type}-agent`,
        agentType: 'Author', // Map to container system types
        maxMemoryMB: 512,
        maxCpuPercent: 50,
        timeoutMs: 30000,
        maxRetries: 3,
        healthCheckIntervalMs: 10000,
        autoRestart: true,
      };

      // Create container with dummy function (will be replaced with actual agent execution)
      const container = new AgentContainer(config, async (input: any) => {
        return `Agent ${type} executed with input`;
      });

      this.containerRegistry.set(type, container);
      globalAgentRegistry.register(container);
    });
  }

  // Input transformation methods for different agent types
  private buildEnhancedAutonomousInput(request: AgentRequest): any {
    return {
      ...request.input,
      contextualInput: {
        selectedText: request.context.selectedText,
        cursorPosition: request.context.cursorPosition,
        documentContent: request.context.documentContent,
        contextScope: request.context.selectedText ? 'selected-only' : 'full-document',
      },
      autonomousMode: 'creative-expansion',
      qualityThreshold: request.preferences?.qualityThreshold || 7,
      collaborationMode: request.preferences?.enableCommunityLearning ?? true,
      trendIntegration: request.preferences?.enableTrendIntegration ?? false,
    };
  }

  private buildEnhancedTutorInput(request: AgentRequest): any {
    return {
      ...request.input,
      contextualInput: {
        selectedText: request.context.selectedText,
        documentContent: request.context.documentContent,
      },
      feedbackMode: 'comprehensive',
      qualityThreshold: request.preferences?.qualityThreshold || 7,
      collaborationMode: request.preferences?.enableCommunityLearning ?? true,
    };
  }

  private buildEnhancedChapterInput(request: AgentRequest): any {
    return {
      ...request.input,
      contextualInput: {
        selectedText: request.context.selectedText,
        documentContent: request.context.documentContent,
      },
      chapterMode: 'natural-conclusion',
      qualityThreshold: request.preferences?.qualityThreshold || 7,
      collaborationMode: request.preferences?.enableCommunityLearning ?? true,
    };
  }

  private buildEnhancedContinueInput(request: AgentRequest): any {
    return {
      ...request.input,
      contextualInput: {
        selectedText: request.context.selectedText,
        cursorPosition: request.context.cursorPosition,
        documentContent: request.context.documentContent,
        contextScope: request.context.selectedText ? 'selected-only' : 'cursor-context',
      },
      continueMode: 'seamless-flow',
      qualityThreshold: request.preferences?.qualityThreshold || 7,
      collaborationMode: request.preferences?.enableCommunityLearning ?? true,
    };
  }

  // Legacy input builders (transform to old format)
  private buildLegacyAutonomousInput(request: AgentRequest): any {
    return {
      documentContent: request.context.selectedText || request.context.documentContent,
      targetWordCount: request.input.targetWordCount || 500,
      direction: request.input.direction,
      genre: request.input.genre,
      memory: request.input.memory,
    };
  }

  private buildLegacyTutorInput(request: AgentRequest): any {
    return {
      text: request.context.selectedText || request.context.documentContent.slice(-1000),
    };
  }

  private buildLegacyChapterInput(request: AgentRequest): any {
    return {
      documentContent: request.context.documentContent,
      genre: request.input.genre,
    };
  }

  private buildLegacyContinueInput(request: AgentRequest): any {
    return {
      prompt: request.input.prompt || 'Continue the story',
      genre: request.input.genre,
      contextualPrompt: request.context.selectedText || request.context.documentContent.slice(-500),
    };
  }

  /**
   * Build standardized agent response
   */
  private buildAgentResponse(result: any, agentUsed: 'old' | 'new' | 'hybrid', qualityScore?: number): AgentResponse {
    return {
      success: true,
      data: result,
      agentUsed,
      qualityScore,
      executionTime: 0, // Will be set by caller
      communityInsights: result.communityInsights || [],
      recommendations: result.recommendations || [],
      fallbackUsed: false,
    };
  }

  /**
   * Analyze recent performance from community memory
   */
  private analyzeRecentPerformance(communityContext: any, agentType: string): {
    enhancedSuccess: number;
    legacySuccess: number;
  } {
    const recentActions = communityContext.recentActions || [];
    
    const enhancedActions = recentActions.filter((action: any) => 
      action.agentId.includes('enhanced') && action.action.includes(agentType)
    );
    
    const legacyActions = recentActions.filter((action: any) => 
      !action.agentId.includes('enhanced') && action.action.includes(agentType)
    );

    const enhancedSuccess = enhancedActions.length > 0 
      ? enhancedActions.filter((action: any) => action.success).length / enhancedActions.length
      : 0.5;
      
    const legacySuccess = legacyActions.length > 0
      ? legacyActions.filter((action: any) => action.success).length / legacyActions.length  
      : 0.5;

    return { enhancedSuccess, legacySuccess };
  }

  /**
   * Update migration strategy
   */
  updateMigrationStrategy(strategy: Partial<MigrationStrategy>): void {
    this.migrationStrategy = { ...this.migrationStrategy, ...strategy };
  }

  /**
   * Get current migration strategy
   */
  getMigrationStrategy(): MigrationStrategy {
    return { ...this.migrationStrategy };
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<any> {
    const containerHealth = await globalAgentRegistry.getSystemHealth();
    const memoryPool = globalCommunityMemory.getMemoryPool();
    
    return {
      containers: containerHealth,
      memoryPool: {
        agentCount: Object.keys(memoryPool.agentContributions).length,
        lastUpdated: memoryPool.lastUpdated,
        activeThreads: memoryPool.sharedContext.activeThreads.length,
      },
      migration: this.migrationStrategy,
    };
  }
}

// Global orchestrator instance
export const globalAgentOrchestrator = new AgentOrchestrator();