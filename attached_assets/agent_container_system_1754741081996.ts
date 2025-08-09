/**
 * @fileOverview Agent Container System - Core infrastructure for fault-tolerant agent management
 * 
 * This provides the foundational containerization system that wraps all AI agents
 * for independence, fault tolerance, and lifecycle management.
 */

import { z } from 'zod';
import { EventEmitter } from 'events';

// Agent status and health monitoring
export const AgentStatusSchema = z.enum(['healthy', 'degraded', 'failed', 'restarting', 'dormant']);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const AgentTypeSchema = z.enum([
  'Author', 'Editor', 'Marketing', 'WFA', 'QualityAnalysis', 
  'Doctor', 'MarieKondo', 'CommunityMemory'
]);
export type AgentType = z.infer<typeof AgentTypeSchema>;

// Health check results
export const HealthStatusSchema = z.object({
  status: AgentStatusSchema,
  responseTime: z.number(),
  memoryUsage: z.number(),
  cpuUsage: z.number(),
  lastActivity: z.date(),
  errorCount: z.number(),
  successRate: z.number().min(0).max(1),
});
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

// Agent container configuration
export const AgentConfigSchema = z.object({
  agentId: z.string(),
  agentType: AgentTypeSchema,
  maxMemoryMB: z.number().default(512),
  maxCpuPercent: z.number().default(50),
  timeoutMs: z.number().default(30000),
  maxRetries: z.number().default(3),
  healthCheckIntervalMs: z.number().default(5000),
  autoRestart: z.boolean().default(true),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Error recovery strategies
export const ErrorRecoveryStrategySchema = z.object({
  restartOnFailure: z.boolean().default(true),
  escalateToDoctor: z.boolean().default(true),
  fallbackAgent: z.string().optional(),
  maxConsecutiveFailures: z.number().default(3),
  cooldownMs: z.number().default(10000),
});
export type ErrorRecoveryStrategy = z.infer<typeof ErrorRecoveryStrategySchema>;

/**
 * AgentContainer - Provides fault tolerance and lifecycle management for AI agents
 */
export class AgentContainer extends EventEmitter {
  private config: AgentConfig;
  private status: AgentStatus = 'healthy';
  private healthData: HealthStatus;
  private errorCount = 0;
  private lastActivity = new Date();
  private isolatedMemory = new Map<string, any>();
  private recoveryStrategy: ErrorRecoveryStrategy;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(
    config: AgentConfig,
    private agentFunction: Function,
    recoveryStrategy?: Partial<ErrorRecoveryStrategy>
  ) {
    super();
    this.config = config;
    this.recoveryStrategy = { ...ErrorRecoveryStrategySchema.parse({}), ...recoveryStrategy };
    
    this.healthData = {
      status: 'healthy',
      responseTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      lastActivity: new Date(),
      errorCount: 0,
      successRate: 1.0,
    };

    this.startHealthMonitoring();
  }

  /**
   * Execute the wrapped agent function with fault tolerance
   */
  async execute(input: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Update activity timestamp
      this.lastActivity = new Date();
      
      // Check if agent is healthy enough to execute
      if (this.status === 'failed') {
        throw new Error(`Agent ${this.config.agentId} is in failed state`);
      }

      // Execute with timeout protection
      const result = await Promise.race([
        this.agentFunction(input),
        this.createTimeoutPromise()
      ]);

      // Update success metrics
      const responseTime = Date.now() - startTime;
      this.updateHealthMetrics(responseTime, true);
      
      this.emit('execution-success', {
        agentId: this.config.agentId,
        responseTime,
        input,
        result
      });

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateHealthMetrics(responseTime, false);
      this.handleError(error as Error);
      
      this.emit('execution-error', {
        agentId: this.config.agentId,
        error: error as Error,
        responseTime,
        input
      });

      throw error;
    }
  }

  /**
   * Perform health check on the agent
   */
  async healthCheck(): Promise<HealthStatus> {
    try {
      const startTime = Date.now();
      
      // Basic responsiveness test
      await this.agentFunction({ healthCheck: true });
      
      const responseTime = Date.now() - startTime;
      
      // Update health status
      this.healthData = {
        ...this.healthData,
        responseTime,
        lastActivity: this.lastActivity,
        errorCount: this.errorCount,
        status: this.status,
      };

      return this.healthData;

    } catch (error) {
      this.status = 'degraded';
      this.healthData.status = 'degraded';
      throw error;
    }
  }

  /**
   * Restart the agent container
   */
  async restart(): Promise<void> {
    this.emit('agent-restarting', { agentId: this.config.agentId });
    
    this.status = 'restarting';
    this.errorCount = 0;
    this.isolatedMemory.clear();
    
    // Simulate restart delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.status = 'healthy';
    this.lastActivity = new Date();
    
    this.emit('agent-restarted', { agentId: this.config.agentId });
  }

  /**
   * Get agent's isolated memory
   */
  getMemory(key: string): any {
    return this.isolatedMemory.get(key);
  }

  /**
   * Set agent's isolated memory
   */
  setMemory(key: string, value: any): void {
    this.isolatedMemory.set(key, value);
  }

  /**
   * Get current agent status
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Stop the agent container
   */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    this.status = 'dormant';
    this.emit('agent-stopped', { agentId: this.config.agentId });
  }

  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Agent ${this.config.agentId} execution timeout`));
      }, this.config.timeoutMs);
    });
  }

  private updateHealthMetrics(responseTime: number, success: boolean): void {
    this.healthData.responseTime = responseTime;
    this.healthData.lastActivity = this.lastActivity;
    
    if (success) {
      this.healthData.successRate = Math.min(1.0, this.healthData.successRate + 0.01);
    } else {
      this.errorCount++;
      this.healthData.errorCount = this.errorCount;
      this.healthData.successRate = Math.max(0.0, this.healthData.successRate - 0.05);
    }
  }

  private handleError(error: Error): void {
    this.errorCount++;
    
    if (this.errorCount >= this.recoveryStrategy.maxConsecutiveFailures) {
      this.status = 'failed';
      
      if (this.recoveryStrategy.escalateToDoctor) {
        this.emit('escalate-to-doctor', {
          agentId: this.config.agentId,
          error,
          errorCount: this.errorCount
        });
      }
      
      if (this.recoveryStrategy.restartOnFailure && this.config.autoRestart) {
        setTimeout(() => this.restart(), this.recoveryStrategy.cooldownMs);
      }
    } else {
      this.status = 'degraded';
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        // Health check failed, but don't throw - just update status
        console.warn(`Health check failed for agent ${this.config.agentId}:`, error);
      }
    }, this.config.healthCheckIntervalMs);
  }
}

/**
 * Agent Registry - Manages all agent containers
 */
export class AgentRegistry extends EventEmitter {
  private agents = new Map<string, AgentContainer>();

  /**
   * Register a new agent container
   */
  register(container: AgentContainer): void {
    const config = container.getConfig();
    this.agents.set(config.agentId, container);
    
    // Forward agent events
    container.on('execution-success', (event) => this.emit('agent-success', event));
    container.on('execution-error', (event) => this.emit('agent-error', event));
    container.on('escalate-to-doctor', (event) => this.emit('escalate-to-doctor', event));
    container.on('agent-restarted', (event) => this.emit('agent-restarted', event));
    
    this.emit('agent-registered', { agentId: config.agentId, agentType: config.agentType });
  }

  /**
   * Get agent container by ID
   */
  getAgent(agentId: string): AgentContainer | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents of a specific type
   */
  getAgentsByType(agentType: AgentType): AgentContainer[] {
    return Array.from(this.agents.values())
      .filter(agent => agent.getConfig().agentType === agentType);
  }

  /**
   * Get system health overview
   */
  async getSystemHealth(): Promise<{ [agentId: string]: HealthStatus }> {
    const healthStatus: { [agentId: string]: HealthStatus } = {};
    
    const agentEntries = Array.from(this.agents.entries());
    for (const [agentId, agent] of agentEntries) {
      try {
        healthStatus[agentId] = await agent.healthCheck();
      } catch (error) {
        healthStatus[agentId] = {
          status: 'failed',
          responseTime: -1,
          memoryUsage: 0,
          cpuUsage: 0,
          lastActivity: new Date(),
          errorCount: 999,
          successRate: 0,
        };
      }
    }
    
    return healthStatus;
  }

  /**
   * Remove agent from registry
   */
  unregister(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.stop();
      this.agents.delete(agentId);
      this.emit('agent-unregistered', { agentId });
    }
  }

  /**
   * Stop all agents
   */
  stopAll(): void {
    const agents = Array.from(this.agents.values());
    for (const agent of agents) {
      agent.stop();
    }
    this.agents.clear();
  }
}

// Global agent registry instance
export const globalAgentRegistry = new AgentRegistry();