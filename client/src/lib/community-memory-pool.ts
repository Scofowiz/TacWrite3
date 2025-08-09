/**
 * Community Memory Pool - Global shared intelligence system
 * 
 * This provides cross-agent learning and collaboration capabilities.
 */

import type { AgentAction, CommunityMemory } from './ai-schemas';

/**
 * Global Community Memory Pool for agent collaboration
 */
class CommunityMemoryPool {
  private memory: CommunityMemory;
  private maxActions = 1000; // Keep last 1000 actions

  constructor() {
    this.memory = {
      actions: [],
      patterns: {},
      insights: [],
      lastUpdated: new Date(),
    };
  }

  /**
   * Log an agent action to the community memory
   */
  logAgentAction(action: Omit<AgentAction, 'timestamp'>): void {
    const actionWithTimestamp: AgentAction = {
      ...action,
      timestamp: new Date(),
    };

    this.memory.actions.push(actionWithTimestamp);
    
    // Keep only the most recent actions
    if (this.memory.actions.length > this.maxActions) {
      this.memory.actions = this.memory.actions.slice(-this.maxActions);
    }

    this.memory.lastUpdated = new Date();
    this.updatePatterns();
  }

  /**
   * Get successful patterns for a specific agent type
   */
  getSuccessfulPatterns(agentType: string): string[] {
    return this.memory.actions
      .filter(action => 
        action.agentType === agentType && 
        action.success && 
        action.confidence > 0.8
      )
      .slice(-10) // Last 10 successful actions
      .map(action => action.reasoning);
  }

  /**
   * Get insights for improving agent performance
   */
  getInsights(agentType?: string): string[] {
    if (agentType) {
      return this.memory.insights.filter(insight => 
        insight.toLowerCase().includes(agentType.toLowerCase())
      );
    }
    return this.memory.insights;
  }

  /**
   * Get performance metrics for an agent
   */
  getAgentMetrics(agentId: string): {
    totalActions: number;
    successRate: number;
    averageConfidence: number;
    averageDuration: number;
  } {
    const agentActions = this.memory.actions.filter(a => a.agentId === agentId);
    
    if (agentActions.length === 0) {
      return {
        totalActions: 0,
        successRate: 0,
        averageConfidence: 0,
        averageDuration: 0,
      };
    }

    const successCount = agentActions.filter(a => a.success).length;
    const totalConfidence = agentActions.reduce((sum, a) => sum + a.confidence, 0);
    const totalDuration = agentActions.reduce((sum, a) => sum + a.duration, 0);

    return {
      totalActions: agentActions.length,
      successRate: successCount / agentActions.length,
      averageConfidence: totalConfidence / agentActions.length,
      averageDuration: totalDuration / agentActions.length,
    };
  }

  /**
   * Update pattern recognition based on recent actions
   */
  private updatePatterns(): void {
    // Analyze recent successful actions for patterns
    const recentSuccessful = this.memory.actions
      .filter(a => a.success && a.confidence > 0.7)
      .slice(-50);

    // Group by agent type and action
    const patterns: Record<string, number> = {};
    
    recentSuccessful.forEach(action => {
      const key = `${action.agentType}:${action.action}`;
      patterns[key] = (patterns[key] || 0) + 1;
    });

    this.memory.patterns = patterns;

    // Generate insights from patterns
    this.generateInsights();
  }

  /**
   * Generate insights from observed patterns
   */
  private generateInsights(): void {
    const insights: string[] = [];
    
    // Analyze agent performance patterns
    const agentTypes = Array.from(new Set(this.memory.actions.map(a => a.agentType)));
    
    agentTypes.forEach(agentType => {
      const actions = this.memory.actions.filter(a => a.agentType === agentType);
      const successRate = actions.filter(a => a.success).length / actions.length;
      
      if (successRate > 0.9) {
        insights.push(`${agentType} agent showing excellent performance (${Math.round(successRate * 100)}% success rate)`);
      } else if (successRate < 0.7) {
        insights.push(`${agentType} agent may need optimization (${Math.round(successRate * 100)}% success rate)`);
      }
    });

    // Analyze common failure patterns
    const failures = this.memory.actions.filter(a => !a.success);
    if (failures.length > 0) {
      const commonFailureReasons = failures
        .map(f => f.reasoning)
        .reduce((acc, reason) => {
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const mostCommonFailure = Object.entries(commonFailureReasons)
        .sort(([, a], [, b]) => b - a)[0];

      if (mostCommonFailure && mostCommonFailure[1] > 2) {
        insights.push(`Common failure pattern detected: ${mostCommonFailure[0]}`);
      }
    }

    this.memory.insights = insights.slice(-20); // Keep last 20 insights
  }

  /**
   * Export memory for analysis
   */
  exportMemory(): CommunityMemory {
    return { ...this.memory };
  }

  /**
   * Clear memory (useful for testing)
   */
  clearMemory(): void {
    this.memory = {
      actions: [],
      patterns: {},
      insights: [],
      lastUpdated: new Date(),
    };
  }
}

// Export singleton instance
export const globalCommunityMemory = new CommunityMemoryPool();