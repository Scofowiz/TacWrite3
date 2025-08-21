/**
 * Memory Compression System - Natural decay through compression
 * 
 * Instead of time-based weights, memories get compressed and averaged over time.
 * This creates natural decay while preserving essential patterns.
 */

import { z } from 'zod';

// Memory compression levels
export const MemoryCompressionLevelSchema = z.enum(['raw', 'summary', 'pattern', 'essence']);
export type MemoryCompressionLevel = z.infer<typeof MemoryCompressionLevelSchema>;

// Compressed memory item
export const CompressedMemorySchema = z.object({
  id: z.string(),
  userId: z.string(),
  agentType: z.string(),
  compressionLevel: MemoryCompressionLevelSchema,
  originalCount: z.number(), // How many raw memories this represents
  content: z.string(),
  patterns: z.array(z.string()), // Extracted patterns
  confidence: z.number().min(0).max(1),
  createdAt: z.date(),
  lastCompressed: z.date(),
  expiresAt: z.date().optional(), // When this should be compressed further
});
export type CompressedMemory = z.infer<typeof CompressedMemorySchema>;

// Acceptance/rejection pattern
export const FeedbackPatternSchema = z.object({
  patternId: z.string(),
  type: z.enum(['acceptance', 'rejection']),
  context: z.string(),
  reason: z.string(),
  frequency: z.number(),
  lastSeen: z.date(),
  compressionLevel: MemoryCompressionLevelSchema,
});
export type FeedbackPattern = z.infer<typeof FeedbackPatternSchema>;

/**
 * Memory Compression Engine
 */
export class MemoryCompressionEngine {
  
  /**
   * Compress raw memories into patterns
   */
  async compressMemories(
    rawMemories: any[],
    targetCompressionLevel: MemoryCompressionLevel
  ): Promise<CompressedMemory[]> {
    
    switch (targetCompressionLevel) {
      case 'summary':
        return this.compressToSummary(rawMemories);
      case 'pattern':
        return this.compressToPatterns(rawMemories);
      case 'essence':
        return this.compressToEssence(rawMemories);
      default:
        return rawMemories; // No compression for 'raw'
    }
  }

  /**
   * Level 1: Compress to summary (combine similar memories)
   */
  private async compressToSummary(memories: any[]): Promise<CompressedMemory[]> {
    const grouped = this.groupSimilarMemories(memories);
    
    return grouped.map(group => ({
      id: `summary-${Date.now()}-${Math.random()}`,
      userId: group[0].userId,
      agentType: group[0].agentType,
      compressionLevel: 'summary' as MemoryCompressionLevel,
      originalCount: group.length,
      content: this.summarizeGroup(group),
      patterns: this.extractPatterns(group),
      confidence: this.calculateConfidence(group),
      createdAt: new Date(),
      lastCompressed: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    }));
  }

  /**
   * Level 2: Compress to patterns (extract common behaviors)
   */
  private async compressToPatterns(memories: CompressedMemory[]): Promise<CompressedMemory[]> {
    const patternGroups = this.groupByPatterns(memories);
    
    return patternGroups.map(group => ({
      id: `pattern-${Date.now()}-${Math.random()}`,
      userId: group[0].userId,
      agentType: group[0].agentType,
      compressionLevel: 'pattern' as MemoryCompressionLevel,
      originalCount: group.reduce((sum, m) => sum + m.originalCount, 0),
      content: this.distillPatterns(group),
      patterns: this.mergePatterns(group),
      confidence: this.averageConfidence(group),
      createdAt: new Date(),
      lastCompressed: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    }));
  }

  /**
   * Level 3: Compress to essence (core principles only)
   */
  private async compressToEssence(memories: CompressedMemory[]): Promise<CompressedMemory[]> {
    const essenceGroups = this.groupByEssence(memories);
    
    return essenceGroups.map(group => ({
      id: `essence-${Date.now()}-${Math.random()}`,
      userId: group[0].userId,
      agentType: group[0].agentType,
      compressionLevel: 'essence' as MemoryCompressionLevel,
      originalCount: group.reduce((sum, m) => sum + m.originalCount, 0),
      content: this.extractEssence(group),
      patterns: this.corePatterns(group),
      confidence: this.weightedConfidence(group),
      createdAt: new Date(),
      lastCompressed: new Date(),
      // Essence memories don't expire - they're the final distillation
    }));
  }

  /**
   * Group similar memories together
   */
  private groupSimilarMemories(memories: any[]): any[][] {
    const groups: any[][] = [];
    
    memories.forEach(memory => {
      const similarGroup = groups.find(group => 
        this.areMemoriesSimilar(memory, group[0])
      );
      
      if (similarGroup) {
        similarGroup.push(memory);
      } else {
        groups.push([memory]);
      }
    });
    
    return groups;
  }

  /**
   * Check if two memories are similar enough to group
   */
  private areMemoriesSimilar(memory1: any, memory2: any): boolean {
    // Simple similarity check - could be enhanced with NLP
    const text1 = (memory1.inputText + ' ' + memory1.outputText).toLowerCase();
    const text2 = (memory2.inputText + ' ' + memory2.outputText).toLowerCase();
    
    // Check for common words (basic approach)
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    const similarity = intersection.size / union.size;
    return similarity > 0.3; // 30% similarity threshold
  }

  /**
   * Summarize a group of similar memories
   */
  private summarizeGroup(group: any[]): string {
    const enhancementTypes = [...new Set(group.map(m => m.enhancementType))];
    const avgQuality = group.reduce((sum, m) => sum + parseFloat(m.qualityScore || '0'), 0) / group.length;
    const userRatings = group.filter(m => m.userRating).map(m => parseInt(m.userRating));
    const avgRating = userRatings.length > 0 ? userRatings.reduce((sum, r) => sum + r, 0) / userRatings.length : 0;
    
    return `${group.length} similar interactions: ${enhancementTypes.join(', ')}. Avg quality: ${avgQuality.toFixed(1)}, Avg rating: ${avgRating.toFixed(1)}`;
  }

  /**
   * Extract patterns from a group
   */
  private extractPatterns(group: any[]): string[] {
    const patterns: string[] = [];
    
    // Pattern: High acceptance rate for certain types
    const acceptanceRate = group.filter(m => m.userRating && parseInt(m.userRating) >= 4).length / group.length;
    if (acceptanceRate > 0.7) {
      patterns.push(`High acceptance rate (${Math.round(acceptanceRate * 100)}%) for ${group[0].enhancementType}`);
    }
    
    // Pattern: Preferred agent types
    const agentTypes = group.map(m => m.agentType);
    const dominantAgent = this.getMostFrequent(agentTypes);
    if (dominantAgent) {
      patterns.push(`Prefers ${dominantAgent} agent`);
    }
    
    // Pattern: Quality improvements
    const qualityScores = group.map(m => parseFloat(m.qualityScore || '0')).filter(q => q > 0);
    if (qualityScores.length > 0) {
      const avgQuality = qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length;
      if (avgQuality > 8.0) {
        patterns.push(`Consistently high quality output (${avgQuality.toFixed(1)})`);
      }
    }
    
    return patterns;
  }

  /**
   * Calculate confidence based on group consistency
   */
  private calculateConfidence(group: any[]): number {
    // More memories = higher confidence, up to a point
    const sizeConfidence = Math.min(group.length / 10, 1);
    
    // Consistent ratings = higher confidence
    const ratings = group.filter(m => m.userRating).map(m => parseInt(m.userRating));
    let ratingConsistency = 0;
    if (ratings.length > 1) {
      const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      const variance = ratings.reduce((sum, r) => sum + Math.pow(r - avgRating, 2), 0) / ratings.length;
      ratingConsistency = Math.max(0, 1 - variance / 4); // Lower variance = higher consistency
    }
    
    return (sizeConfidence + ratingConsistency) / 2;
  }

  /**
   * Group memories by patterns
   */
  private groupByPatterns(memories: CompressedMemory[]): CompressedMemory[][] {
    // Group by similar patterns
    const groups: CompressedMemory[][] = [];
    
    memories.forEach(memory => {
      const similarGroup = groups.find(group => 
        this.haveSimilarPatterns(memory.patterns, group[0].patterns)
      );
      
      if (similarGroup) {
        similarGroup.push(memory);
      } else {
        groups.push([memory]);
      }
    });
    
    return groups;
  }

  /**
   * Check if pattern lists are similar
   */
  private haveSimilarPatterns(patterns1: string[], patterns2: string[]): boolean {
    const set1 = new Set(patterns1.map(p => p.toLowerCase()));
    const set2 = new Set(patterns2.map(p => p.toLowerCase()));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size > 0.4; // 40% pattern overlap
  }

  /**
   * Distill patterns from a group
   */
  private distillPatterns(group: CompressedMemory[]): string {
    const allPatterns = group.flatMap(m => m.patterns);
    const patternCounts = this.countOccurrences(allPatterns);
    const commonPatterns = Object.entries(patternCounts)
      .filter(([_, count]) => count > 1)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
      .map(([pattern, count]) => `${pattern} (${count}x)`);
    
    return `Distilled from ${group.length} pattern groups: ${commonPatterns.join(', ')}`;
  }

  /**
   * Merge patterns, keeping most frequent
   */
  private mergePatterns(group: CompressedMemory[]): string[] {
    const allPatterns = group.flatMap(m => m.patterns);
    const patternCounts = this.countOccurrences(allPatterns);
    
    return Object.entries(patternCounts)
      .filter(([_, count]) => count > 1) // Only keep patterns that appear multiple times
      .sort(([_, a], [__, b]) => b - a) // Sort by frequency
      .slice(0, 3) // Keep top 3
      .map(([pattern, _]) => pattern);
  }

  /**
   * Average confidence across group
   */
  private averageConfidence(group: CompressedMemory[]): number {
    return group.reduce((sum, m) => sum + m.confidence, 0) / group.length;
  }

  /**
   * Group by essence (highest level abstraction)
   */
  private groupByEssence(memories: CompressedMemory[]): CompressedMemory[][] {
    // Group by agent type and general behavior patterns
    const essenceGroups = new Map<string, CompressedMemory[]>();
    
    memories.forEach(memory => {
      const essence = this.extractEssenceKey(memory);
      if (!essenceGroups.has(essence)) {
        essenceGroups.set(essence, []);
      }
      essenceGroups.get(essence)!.push(memory);
    });
    
    return Array.from(essenceGroups.values());
  }

  /**
   * Extract essence key for grouping
   */
  private extractEssenceKey(memory: CompressedMemory): string {
    // Combine agent type with core behavior indicators
    const corePatterns = memory.patterns
      .filter(p => p.includes('High acceptance') || p.includes('Prefers') || p.includes('Consistently'))
      .slice(0, 2)
      .join(';');
    
    return `${memory.agentType}:${corePatterns}`;
  }

  /**
   * Extract final essence description
   */
  private extractEssence(group: CompressedMemory[]): string {
    const totalOriginal = group.reduce((sum, m) => sum + m.originalCount, 0);
    const dominantPatterns = this.mergePatterns(group);
    
    return `Final essence from ${totalOriginal} original memories: ${dominantPatterns.join(', ')}`;
  }

  /**
   * Get core patterns only
   */
  private corePatterns(group: CompressedMemory[]): string[] {
    return this.mergePatterns(group).slice(0, 2); // Keep only top 2 most essential
  }

  /**
   * Weighted confidence based on original count
   */
  private weightedConfidence(group: CompressedMemory[]): number {
    const totalWeight = group.reduce((sum, m) => sum + m.originalCount, 0);
    const weightedSum = group.reduce((sum, m) => sum + (m.confidence * m.originalCount), 0);
    
    return weightedSum / totalWeight;
  }

  /**
   * Helper: Get most frequent item in array
   */
  private getMostFrequent<T>(arr: T[]): T | null {
    if (arr.length === 0) return null;
    
    const counts = this.countOccurrences(arr);
    return Object.entries(counts)
      .sort(([_, a], [__, b]) => (b as number) - (a as number))[0][0] as T;
  }

  /**
   * Helper: Count occurrences
   */
  private countOccurrences<T>(arr: T[]): Record<string, number> {
    return arr.reduce((acc, item) => {
      const key = String(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

/**
 * Automatic compression scheduler
 */
export class CompressionScheduler {
  private compressionEngine = new MemoryCompressionEngine();

  /**
   * Schedule automatic compression based on memory age and count
   */
  async scheduleCompression(userId: string): Promise<void> {
    // This would run periodically to compress memories
    
    // 1. Raw memories older than 1 week -> Summary
    // 2. Summary memories older than 1 month -> Patterns  
    // 3. Pattern memories older than 3 months -> Essence
    
    // Implementation would depend on your storage system
  }

  /**
   * Manual compression trigger
   */
  async compressUserMemories(
    userId: string, 
    targetLevel: MemoryCompressionLevel
  ): Promise<CompressedMemory[]> {
    // Get raw memories for user
    // Apply compression
    // Replace old memories with compressed versions
    // Return compressed memories
    
    return []; // Placeholder
  }
}
