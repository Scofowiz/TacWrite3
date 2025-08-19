/**
 * Global Community Memory Instance - Shared across all agents
 */

import { globalCommunityMemory } from './community-memory-pool';

// Initialize community memory with sample learning data
globalCommunityMemory.logAgentAction({
  agentId: 'writing-assistant-v1',
  agentType: 'writing-assistant',
  action: 'text-enhancement',
  input: { text: 'sample text', enhancementType: 'clarity' },
  output: { enhancedText: 'improved sample text', qualityScore: '8.5' },
  reasoning: 'Applied clarity enhancement with focus on readability',
  confidence: 0.85,
  duration: 1200,
  success: true,
});

globalCommunityMemory.logAgentAction({
  agentId: 'contextual-enhancer-v1',
  agentType: 'contextual-enhancer',
  action: 'text-enhancement',
  input: { text: 'story fragment', enhancementType: 'polish' },
  output: { enhancedText: 'polished story fragment', qualityScore: '9.2' },
  reasoning: 'Enhanced narrative flow and character development',
  confidence: 0.92,
  duration: 1800,
  success: true,
});

// Export for use across the application
export { globalCommunityMemory as communityMemory };