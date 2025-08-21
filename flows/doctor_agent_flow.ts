/**
 * @fileOverview Doctor Agent - System health monitoring, agent spawning, and emergency response
 * 
 * The Doctor Agent manages system health, spawns new agents when needed, and handles
 * emergency recovery protocols for the entire Publishing League ecosystem.
 */

import { z } from 'zod';
import { createAIClient } from '@/lib/ai-client';
import { AgentContainer, AgentConfig, globalAgentRegistry } from './agent_container_system';
import { globalCommunityMemory } from './community_memory_pool';

// System vitals monitoring
export const SystemVitalsSchema = z.object({
  totalAgents: z.number(),
  healthyAgents: z.number(),
  degradedAgents: z.number(),
  failedAgents: z.number(),
  averageResponseTime: z.number(),
  systemLoad: z.number().min(0).max(1),
  memoryUsage: z.number(),
  errorRate: z.number().min(0).max(1),
  lastHealthCheck: z.date(),
});
export type SystemVitals = z.infer<typeof SystemVitalsSchema>;

// Agent spawning request
export const AgentSpawnRequestSchema = z.object({
  requestId: z.string(),
  agentType: z.enum(['Author', 'Editor', 'Marketing', 'WFA', 'QualityAnalysis', 'MarieKondo']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  reason: z.string(),
  configuration: z.record(z.any()).optional(),
  timeoutMs: z.number().default(30000),
  autoRestart: z.boolean().default(true),
});
export type AgentSpawnRequest = z.infer<typeof AgentSpawnRequestSchema>;

// System issue detection
export const SystemIssueSchema = z.object({
  issueId: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.enum(['performance', 'memory', 'agent-failure', 'communication', 'quality']),
  description: z.string(),
  affectedAgents: z.array(z.string()),
  detectedAt: z.date(),
  potentialCauses: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  autoResolvable: z.boolean(),
});
export type SystemIssue = z.infer<typeof SystemIssueSchema>;

// Doctor Agent input/output schemas
export const DoctorAgentInputSchema = z.object({
  command: z.enum(['health-check', 'spawn-agent', 'emergency-response', 'system-optimization', 'predictive-analysis']),
  parameters: z.record(z.any()).optional(),
  urgency: z.enum(['routine', 'high', 'emergency']).default('routine'),
});
export type DoctorAgentInput = z.infer<typeof DoctorAgentInputSchema>;

export const DoctorAgentOutputSchema = z.object({
  status: z.string(),
  systemVitals: SystemVitalsSchema.optional(),
  spawnedAgents: z.array(z.string()).optional(),
  resolvedIssues: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  emergencyActions: z.array(z.string()).optional(),
  predictiveInsights: z.array(z.string()).optional(),
});
export type DoctorAgentOutput = z.infer<typeof DoctorAgentOutputSchema>;

/**
 * Doctor Agent - The system's health manager and emergency responder
 */
export async function doctorAgent(input: DoctorAgentInput): Promise<DoctorAgentOutput> {
  const client = createAIClient();
  
  try {
    // Log action to community memory
    globalCommunityMemory.logAgentAction({
      agentId: 'doctor-agent',
      agentType: 'Doctor',
      action: `doctor-${input.command}`,
      input,
      output: {},
      reasoning: `Executing ${input.command} with ${input.urgency} urgency`,
      confidence: 0.95,
      duration: 0,
      success: true,
    });

    switch (input.command) {
      case 'health-check':
        return await performHealthCheck(client);
      
      case 'spawn-agent':
        return await spawnAgent(client, input.parameters as AgentSpawnRequest);
      
      case 'emergency-response':
        return await handleEmergencyResponse(client, input.parameters);
      
      case 'system-optimization':
        return await optimizeSystem(client);
      
      case 'predictive-analysis':
        return await predictiveAnalysis(client);
      
      default:
        throw new Error(`Unknown doctor command: ${input.command}`);
    }
  } catch (error) {
    // Log error to community memory
    globalCommunityMemory.logAgentAction({
      agentId: 'doctor-agent',
      agentType: 'Doctor',
      action: `doctor-${input.command}`,
      input,
      output: { error: error instanceof Error ? error.message : 'Unknown error' },
      reasoning: 'Doctor agent encountered an error',
      confidence: 0,
      duration: 0,
      success: false,
    });
    
    throw error;
  }
}

/**
 * Perform comprehensive system health check
 */
async function performHealthCheck(client: any): Promise<DoctorAgentOutput> {
  const systemHealth = await globalAgentRegistry.getSystemHealth();
  const memoryPoolState = globalCommunityMemory.getMemoryPool();
  
  const healthyCount = Object.values(systemHealth).filter(h => h.status === 'healthy').length;
  const degradedCount = Object.values(systemHealth).filter(h => h.status === 'degraded').length;
  const failedCount = Object.values(systemHealth).filter(h => h.status === 'failed').length;
  const totalCount = Object.keys(systemHealth).length;
  
  const avgResponseTime = Object.values(systemHealth)
    .reduce((sum, h) => sum + h.responseTime, 0) / totalCount || 0;
  
  const avgSuccessRate = Object.values(systemHealth)
    .reduce((sum, h) => sum + h.successRate, 0) / totalCount || 1;

  const systemVitals: SystemVitals = {
    totalAgents: totalCount,
    healthyAgents: healthyCount,
    degradedAgents: degradedCount,
    failedAgents: failedCount,
    averageResponseTime: avgResponseTime,
    systemLoad: calculateSystemLoad(systemHealth),
    memoryUsage: calculateMemoryUsage(memoryPoolState),
    errorRate: 1 - avgSuccessRate,
    lastHealthCheck: new Date(),
  };

  // Detect issues and generate recommendations
  const issues = detectSystemIssues(systemVitals, systemHealth);
  const recommendations = await generateHealthRecommendations(client, systemVitals, issues);

  return {
    status: failedCount > 0 ? 'critical' : degradedCount > totalCount * 0.3 ? 'warning' : 'healthy',
    systemVitals,
    recommendations,
  };
}

/**
 * Spawn new agent based on request
 */
async function spawnAgent(client: any, request: AgentSpawnRequest): Promise<DoctorAgentOutput> {
  if (!request) {
    throw new Error('Agent spawn request is required');
  }

  // Validate request
  const validatedRequest = AgentSpawnRequestSchema.parse(request);
  
  // Determine agent configuration based on type
  const agentConfig: AgentConfig = {
    agentId: `${validatedRequest.agentType.toLowerCase()}-${Date.now()}`,
    agentType: validatedRequest.agentType,
    maxMemoryMB: 512,
    maxCpuPercent: 50,
    timeoutMs: validatedRequest.timeoutMs,
    autoRestart: validatedRequest.autoRestart,
    healthCheckIntervalMs: 5000,
  };

  // Create agent function based on type
  const agentFunction = createAgentFunction(validatedRequest.agentType);
  
  // Create and register new agent container
  const agentContainer = new AgentContainer(agentConfig, agentFunction);
  globalAgentRegistry.register(agentContainer);
  
  // Register with community memory
  globalCommunityMemory.registerAgent(agentConfig.agentId, getAgentCapabilities(validatedRequest.agentType));

  // Log spawning action
  globalCommunityMemory.logAgentAction({
    agentId: 'doctor-agent',
    agentType: 'Doctor',
    action: 'spawn-agent',
    input: validatedRequest,
    output: { spawnedAgentId: agentConfig.agentId },
    reasoning: `Spawned ${validatedRequest.agentType} agent due to: ${validatedRequest.reason}`,
    confidence: 0.9,
    duration: 1000,
    success: true,
  });

  return {
    status: 'agent-spawned',
    spawnedAgents: [agentConfig.agentId],
    recommendations: [`New ${validatedRequest.agentType} agent ready for work`],
  };
}

/**
 * Handle emergency system response
 */
async function handleEmergencyResponse(client: any, parameters: any): Promise<DoctorAgentOutput> {
  const emergencyActions: string[] = [];
  const resolvedIssues: string[] = [];

  // Get current system state
  const systemHealth = await globalAgentRegistry.getSystemHealth();
  const failedAgents = Object.entries(systemHealth)
    .filter(([_, health]) => health.status === 'failed')
    .map(([agentId, _]) => agentId);

  // Emergency protocol: Restart failed agents
  for (const agentId of failedAgents) {
    const agent = globalAgentRegistry.getAgent(agentId);
    if (agent) {
      try {
        await agent.restart();
        emergencyActions.push(`Restarted failed agent: ${agentId}`);
        resolvedIssues.push(`agent-failure-${agentId}`);
      } catch (error) {
        emergencyActions.push(`Failed to restart agent ${agentId}: ${error}`);
      }
    }
  }

  // Emergency protocol: Spawn backup agents if needed
  const criticalAgentTypes = ['Author', 'Editor', 'QualityAnalysis'];
  for (const agentType of criticalAgentTypes) {
    const agentsOfType = globalAgentRegistry.getAgentsByType(agentType as any);
    const healthyAgents = agentsOfType.filter(agent => agent.getStatus() === 'healthy');
    
    if (healthyAgents.length === 0) {
      // Spawn emergency backup
      try {
        await spawnAgent(client, {
          requestId: `emergency-${Date.now()}`,
          agentType: agentType as any,
          priority: 'urgent',
          reason: `Emergency backup - no healthy ${agentType} agents available`,
        });
        emergencyActions.push(`Spawned emergency ${agentType} agent`);
      } catch (error) {
        emergencyActions.push(`Failed to spawn emergency ${agentType} agent: ${error}`);
      }
    }
  }

  // Call Marie Kondo for emergency cleanup if system is under stress
  const systemLoad = calculateSystemLoad(systemHealth);
  if (systemLoad > 0.8) {
    emergencyActions.push('Summoning Marie Kondo for emergency system cleanup');
    // This would trigger Marie Kondo agent in emergency mode
  }

  return {
    status: 'emergency-response-complete',
    emergencyActions,
    resolvedIssues,
    recommendations: [
      'Monitor system closely for next 30 minutes',
      'Review agent configuration if issues persist',
      'Consider increasing resource allocation if needed',
    ],
  };
}

/**
 * Optimize system performance
 */
async function optimizeSystem(client: any): Promise<DoctorAgentOutput> {
  const systemHealth = await globalAgentRegistry.getSystemHealth();
  const analytics = Object.keys(systemHealth).map(agentId => 
    globalCommunityMemory.getAgentAnalytics(agentId)
  ).filter(Boolean);

  const recommendations: string[] = [];

  // Analyze agent performance patterns
  const underperformingAgents = analytics.filter(agent => 
    agent && agent.averageQuality < 6.0 && agent.totalActions > 10
  );

  const highPerformingAgents = analytics.filter(agent => 
    agent && agent.averageQuality > 8.5 && agent.successRate > 0.95
  );

  // Generate optimization recommendations
  if (underperformingAgents.length > 0) {
    recommendations.push(`Consider retraining or replacing underperforming agents: ${underperformingAgents.map(a => a?.agentId).join(', ')}`);
  }

  if (highPerformingAgents.length > 0) {
    recommendations.push(`Scale up high-performing agent types: ${highPerformingAgents.map(a => a?.agentId).join(', ')}`);
  }

  // Resource optimization
  const avgResponseTime = Object.values(systemHealth)
    .reduce((sum, h) => sum + h.responseTime, 0) / Object.keys(systemHealth).length;

  if (avgResponseTime > 5000) {
    recommendations.push('System response time is high - consider adding more agents or optimizing existing ones');
  }

  return {
    status: 'optimization-complete',
    recommendations,
  };
}

/**
 * Perform predictive analysis for potential issues
 */
async function predictiveAnalysis(client: any): Promise<DoctorAgentOutput> {
  const memoryPool = globalCommunityMemory.getMemoryPool();
  const systemHealth = await globalAgentRegistry.getSystemHealth();
  
  const predictiveInsights: string[] = [];

  // Analyze performance trends
  Object.keys(memoryPool.agentContributions).forEach(agentId => {
    const analytics = globalCommunityMemory.getAgentAnalytics(agentId);
    if (analytics?.recentTrends?.trend === 'declining') {
      predictiveInsights.push(`Agent ${agentId} showing declining performance - intervention may be needed soon`);
    }
  });

  // Resource usage prediction
  const totalMemoryUsage = calculateMemoryUsage(memoryPool);
  if (totalMemoryUsage > 0.8) {
    predictiveInsights.push('Memory usage approaching critical levels - cleanup or scaling recommended');
  }

  // Workload analysis
  const recentActions = Object.values(memoryPool.agentContributions)
    .flatMap(contrib => contrib.recentActions)
    .filter(action => action.timestamp > new Date(Date.now() - 3600000)); // Last hour

  if (recentActions.length > 100) {
    predictiveInsights.push('High activity detected - consider spawning additional agents to handle load');
  }

  return {
    status: 'predictive-analysis-complete',
    predictiveInsights,
  };
}

/**
 * Helper function to detect system issues
 */
function detectSystemIssues(vitals: SystemVitals, healthData: any): SystemIssue[] {
  const issues: SystemIssue[] = [];

  if (vitals.failedAgents > 0) {
    issues.push({
      issueId: `failed-agents-${Date.now()}`,
      severity: 'high',
      category: 'agent-failure',
      description: `${vitals.failedAgents} agents have failed`,
      affectedAgents: Object.keys(healthData).filter(id => healthData[id].status === 'failed'),
      detectedAt: new Date(),
      potentialCauses: ['Resource exhaustion', 'Configuration error', 'External dependency failure'],
      recommendedActions: ['Restart failed agents', 'Check resource allocation', 'Review error logs'],
      autoResolvable: true,
    });
  }

  if (vitals.averageResponseTime > 10000) {
    issues.push({
      issueId: `slow-response-${Date.now()}`,
      severity: 'medium',
      category: 'performance',
      description: 'System response time is degraded',
      affectedAgents: [],
      detectedAt: new Date(),
      potentialCauses: ['High system load', 'Resource contention', 'Network latency'],
      recommendedActions: ['Scale up agents', 'Optimize queries', 'Check network connectivity'],
      autoResolvable: false,
    });
  }

  return issues;
}

/**
 * Calculate system load based on agent health
 */
function calculateSystemLoad(healthData: any): number {
  const totalAgents = Object.keys(healthData).length;
  if (totalAgents === 0) return 0;

  const loadScore = Object.values(healthData).reduce((sum: number, health: any) => {
    const agentLoad = health.status === 'healthy' ? 0.2 : 
                    health.status === 'degraded' ? 0.6 : 1.0;
    return sum + agentLoad;
  }, 0);

  return Math.min(1.0, loadScore / totalAgents);
}

/**
 * Calculate memory usage from memory pool
 */
function calculateMemoryUsage(memoryPool: any): number {
  // Simplified memory calculation based on data size
  const dataSize = JSON.stringify(memoryPool).length;
  const maxSize = 10 * 1024 * 1024; // 10MB max
  return Math.min(1.0, dataSize / maxSize);
}

/**
 * Generate health recommendations using AI
 */
async function generateHealthRecommendations(client: any, vitals: SystemVitals, issues: SystemIssue[]): Promise<string[]> {
  if (issues.length === 0 && vitals.errorRate < 0.1) {
    return ['System is operating optimally'];
  }

  const prompt = `As a system administrator for an AI writing platform, analyze the following system vitals and issues, then provide specific recommendations:

System Vitals:
- Total agents: ${vitals.totalAgents}
- Healthy: ${vitals.healthyAgents}, Degraded: ${vitals.degradedAgents}, Failed: ${vitals.failedAgents}
- Average response time: ${vitals.averageResponseTime}ms
- Error rate: ${(vitals.errorRate * 100).toFixed(1)}%
- System load: ${(vitals.systemLoad * 100).toFixed(1)}%

Current Issues:
${issues.map(issue => `- ${issue.severity}: ${issue.description}`).join('\n')}

Provide 3-5 specific, actionable recommendations to improve system health and performance.`;

  try {
    const response = await client.generate(prompt, {
      systemPrompt: 'You are an expert system administrator. Provide clear, actionable recommendations for system optimization.',
      temperature: 0.3,
      maxTokens: 500,
    });

    return response.content.split('\n')
      .filter((line: string) => line.trim().length > 0 && line.includes('-'))
      .map((line: string) => line.replace(/^[-*]\s*/, '').trim())
      .slice(0, 5);

  } catch (error) {
    return [
      'Review system logs for error patterns',
      'Consider scaling resources if high load persists',
      'Monitor agent performance trends',
      'Implement preventive maintenance schedule',
    ];
  }
}

/**
 * Create agent function based on type
 */
function createAgentFunction(agentType: string): Function {
  // This would return the appropriate agent function based on type
  // For now, returning a placeholder function
  return async (input: any) => {
    if (input.healthCheck) {
      return { status: 'healthy', agentType };
    }
    return { message: `${agentType} agent executed successfully`, input };
  };
}

/**
 * Get agent capabilities based on type
 */
function getAgentCapabilities(agentType: string): string[] {
  const capabilityMap: { [key: string]: string[] } = {
    'Author': ['story-generation', 'character-development', 'dialogue-writing', 'narrative-structure'],
    'Editor': ['content-review', 'style-analysis', 'consistency-checking', 'quality-assessment'],
    'Marketing': ['audience-analysis', 'positioning', 'campaign-development', 'market-research'],
    'WFA': ['trend-analysis', 'market-intelligence', 'social-media-monitoring', 'competitive-analysis'],
    'QualityAnalysis': ['performance-tracking', 'quality-scoring', 'improvement-suggestions', 'pattern-recognition'],
    'MarieKondo': ['system-cleanup', 'optimization', 'maintenance', 'organization'],
  };

  return capabilityMap[agentType] || ['general-purpose'];
}