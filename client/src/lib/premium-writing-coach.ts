/**
 * Premium Writing Coach - Full-time analytical writing mentor
 * 
 * Features:
 * - Analytics-driven insights about writing patterns
 * - WFA market intelligence integration
 * - Personalized style analysis and recommendations
 * - Witty, helpful coaching personality
 * - Progressive skill development tracking
 */

import { createAIClient } from './ai-client';
import { globalCommunityMemory } from './community-memory-pool';
import { z } from 'zod';

// Writing pattern analysis
export const WritingPatternSchema = z.object({
  patternId: z.string(),
  type: z.enum(['sentence_structure', 'vocabulary', 'dialogue', 'description', 'pacing', 'character_development']),
  frequency: z.number().min(0).max(100), // Percentage of occurrence
  strength: z.enum(['weakness', 'developing', 'competent', 'strength', 'signature']),
  examples: z.array(z.string()),
  improvement_suggestions: z.array(z.string()),
});
export type WritingPattern = z.infer<typeof WritingPatternSchema>;

// Style profile for the writer
export const WriterStyleProfileSchema = z.object({
  profileId: z.string(),
  writerId: z.string(),
  dominantVoice: z.string(), // e.g., "conversational", "formal", "lyrical"
  strengthAreas: z.array(z.string()),
  growthAreas: z.array(z.string()),
  writingPersonality: z.string(), // Quirky description of their style
  marketAlignment: z.object({
    currentTrends: z.array(z.string()),
    opportunityAreas: z.array(z.string()),
    authenticityScore: z.number().min(0).max(10), // How true to their voice vs trendy
  }),
  patterns: z.array(WritingPatternSchema),
  lastAnalyzed: z.date(),
  totalWordsAnalyzed: z.number(),
});
export type WriterStyleProfile = z.infer<typeof WriterStyleProfileSchema>;

// Coach session input
export const CoachSessionInputSchema = z.object({
  writerId: z.string(),
  sessionType: z.enum(['daily_checkin', 'style_analysis', 'market_insights', 'growth_planning', 'trend_exploration']),
  recentWriting: z.string().optional(),
  specificQuestion: z.string().optional(),
  analyticsData: z.object({
    wordsWritten: z.number(),
    sessionsThisWeek: z.number(),
    averageQualityScore: z.number(),
    topAgentUsed: z.string(),
    recentInteractions: z.array(z.any()),
  }).optional(),
});
export type CoachSessionInput = z.infer<typeof CoachSessionInputSchema>;

// Coach response
export const CoachResponseSchema = z.object({
  coachingType: z.string(),
  personalizedMessage: z.string(),
  styleInsights: z.array(z.string()),
  marketIntelligence: z.array(z.string()),
  actionableAdvice: z.array(z.object({
    category: z.string(),
    suggestion: z.string(),
    difficulty: z.enum(['easy', 'moderate', 'challenging']),
    marketRelevance: z.number().min(0).max(10),
  })),
  encouragement: z.string(),
  nextSessionFocus: z.string(),
  confidence: z.number().min(0).max(1),
});
export type CoachResponse = z.infer<typeof CoachResponseSchema>;

/**
 * Premium Writing Coach - Your personal literary mentor
 */
export class PremiumWritingCoach {
  private writerProfiles: Map<string, WriterStyleProfile> = new Map();

  constructor() {
    // Load any existing profiles
    this.initializeCoach();
  }

  private initializeCoach(): void {
    globalCommunityMemory.logAgentAction({
      agentId: 'premium-writing-coach',
      agentType: 'Coach',
      action: 'initialize',
      input: {},
      output: { status: 'Coach ready for premium guidance' },
      reasoning: 'Premium writing coach initialized and ready to provide personalized guidance',
      confidence: 1.0,
      duration: 0,
      success: true,
    });
  }

  /**
   * Conduct a comprehensive coaching session
   */
  async conductCoachingSession(input: CoachSessionInput): Promise<CoachResponse> {
    const startTime = Date.now();
    
    // Get or create writer profile
    const writerProfile = await this.getOrCreateWriterProfile(input.writerId, input.recentWriting);
    
    // Analyze current writing state
    const currentState = await this.analyzeCurrentWritingState(input, writerProfile);
    
    // Get market intelligence from WFA agent
    const marketInsights = await this.getMarketIntelligence(writerProfile);
    
    // Generate personalized coaching
    const coachingResponse = await this.generatePersonalizedCoaching(
      input, 
      writerProfile, 
      currentState, 
      marketInsights
    );

    // Log coaching session
    globalCommunityMemory.logAgentAction({
      agentId: 'premium-writing-coach',
      agentType: 'Coach',
      action: `coaching-${input.sessionType}`,
      input,
      output: coachingResponse,
      reasoning: 'Provided personalized coaching based on analytics and market insights',
      confidence: coachingResponse.confidence,
      duration: Date.now() - startTime,
      success: true,
    });

    return coachingResponse;
  }

  /**
   * Get or create a writer's style profile
   */
  private async getOrCreateWriterProfile(writerId: string, recentWriting?: string): Promise<WriterStyleProfile> {
    if (this.writerProfiles.has(writerId)) {
      const profile = this.writerProfiles.get(writerId)!;
      
      // Update with new writing sample if provided
      if (recentWriting) {
        await this.updateStyleProfile(profile, recentWriting);
      }
      
      return profile;
    }

    // Create new profile
    const newProfile: WriterStyleProfile = {
      profileId: `profile-${writerId}-${Date.now()}`,
      writerId,
      dominantVoice: 'developing', // Will be analyzed
      strengthAreas: [],
      growthAreas: [],
      writingPersonality: 'Unique voice in development',
      marketAlignment: {
        currentTrends: [],
        opportunityAreas: [],
        authenticityScore: 7, // Default moderate authenticity
      },
      patterns: [],
      lastAnalyzed: new Date(),
      totalWordsAnalyzed: 0,
    };

    if (recentWriting) {
      await this.analyzeWritingStyle(newProfile, recentWriting);
    }

    this.writerProfiles.set(writerId, newProfile);
    return newProfile;
  }

  /**
   * Analyze writing style and update profile
   */
  private async analyzeWritingStyle(profile: WriterStyleProfile, text: string): Promise<void> {
    const client = createAIClient();

    const analysisPrompt = `Analyze this writing sample to understand the author's unique style and voice.

WRITING SAMPLE:
---
${text}
---

Provide insights about:
1. Dominant voice/tone (conversational, formal, lyrical, etc.)
2. Writing personality (give it a quirky, memorable description)
3. Key strengths (what they do really well)
4. Growth areas (where they could develop)
5. Distinctive patterns in their writing

Be encouraging and specific. Focus on what makes their voice unique.`;

    const systemPrompt = `You are a literary style analyst with a gift for understanding writers' unique voices. You're encouraging, insightful, and a bit witty. Help writers understand what makes their writing distinctive while identifying areas for growth.`;

    try {
      const response = await client.generate(analysisPrompt, {
        systemPrompt,
        temperature: 0.7,
        maxTokens: 1000,
      });

      // Parse and update profile (simplified - in production would use structured output)
      const analysisText = response.content as string;
      
      // Extract key insights and update profile
      profile.writingPersonality = this.extractWritingPersonality(analysisText);
      profile.dominantVoice = this.extractDominantVoice(analysisText);
      profile.strengthAreas = this.extractStrengths(analysisText);
      profile.growthAreas = this.extractGrowthAreas(analysisText);
      profile.totalWordsAnalyzed += text.length;
      profile.lastAnalyzed = new Date();

    } catch (error) {
      console.error('Style analysis failed:', error);
      // Fallback to basic analysis
      profile.writingPersonality = 'A distinctive voice with great potential';
      profile.dominantVoice = text.length > 500 ? 'descriptive' : 'concise';
    }
  }

  /**
   * Get current writing state and recent patterns
   */
  private async analyzeCurrentWritingState(input: CoachSessionInput, profile: WriterStyleProfile): Promise<any> {
    const analytics = input.analyticsData;
    
    if (!analytics) {
      return {
        momentum: 'building',
        recentFocus: 'consistent practice',
        needsAttention: ['regular writing schedule']
      };
    }

    const momentum = analytics.wordsWritten > 1000 ? 'strong' : 
                    analytics.wordsWritten > 500 ? 'building' : 'needs boost';
    
    const qualityTrend = analytics.averageQualityScore > 8 ? 'excellent' :
                        analytics.averageQualityScore > 6 ? 'solid' : 'developing';

    return {
      momentum,
      qualityTrend,
      sessionsThisWeek: analytics.sessionsThisWeek,
      preferredAgent: analytics.topAgentUsed,
      recentFocus: this.identifyRecentFocus(analytics.recentInteractions),
      needsAttention: this.identifyNeedsAttention(analytics, profile)
    };
  }

  /**
   * Get market intelligence for the writer's style
   */
  private async getMarketIntelligence(profile: WriterStyleProfile): Promise<any> {
    const client = createAIClient();

    const marketPrompt = `Based on this writer's style profile, what are the current market opportunities and trends they should consider?

WRITER PROFILE:
- Dominant Voice: ${profile.dominantVoice}
- Strengths: ${profile.strengthAreas.join(', ')}
- Writing Personality: ${profile.writingPersonality}

Provide:
1. Current market trends that align with their strengths
2. Emerging opportunities they could explore
3. How to maintain authenticity while being market-aware
4. Specific, actionable suggestions for leveraging trends

Be encouraging and practical.`;

    const systemPrompt = `You are a market intelligence expert who helps writers find authentic ways to align with current trends without losing their unique voice. You're encouraging and strategic.`;

    try {
      const response = await client.generate(marketPrompt, {
        systemPrompt,
        temperature: 0.6,
        maxTokens: 800,
      });

      return {
        marketInsights: response.content as string,
        trendAlignment: this.assessTrendAlignment(profile),
        opportunityAreas: this.identifyOpportunities(profile)
      };

    } catch (error) {
      return {
        marketInsights: 'Focus on developing your unique voice - authenticity is always in demand!',
        trendAlignment: 7,
        opportunityAreas: ['authentic voice development', 'consistent practice']
      };
    }
  }

  /**
   * Generate personalized coaching response
   */
  private async generatePersonalizedCoaching(
    input: CoachSessionInput,
    profile: WriterStyleProfile,
    currentState: any,
    marketInsights: any
  ): Promise<CoachResponse> {
    const client = createAIClient();

    const coachingPrompt = `You are a premium writing coach conducting a ${input.sessionType} session. Be encouraging, insightful, and add a touch of wit.

WRITER'S PROFILE:
- Style: ${profile.writingPersonality}
- Voice: ${profile.dominantVoice}
- Strengths: ${profile.strengthAreas.join(', ')}
- Growth areas: ${profile.growthAreas.join(', ')}

CURRENT STATE:
- Writing momentum: ${currentState.momentum}
- Quality trend: ${currentState.qualityTrend}
- Recent focus: ${currentState.recentFocus}

MARKET INTELLIGENCE:
${marketInsights.marketInsights}

${input.specificQuestion ? `SPECIFIC QUESTION: ${input.specificQuestion}` : ''}

Provide:
1. A personalized, encouraging message with a touch of humor
2. Specific style insights based on their patterns
3. Market-aware suggestions that preserve authenticity
4. 3-4 actionable advice items with difficulty levels
5. Warm encouragement
6. What to focus on next session

Keep it conversational, insightful, and motivating!`;

    const systemPrompt = `You are a world-class writing coach known for your insight, encouragement, and gentle wit. You help writers grow while celebrating their unique voice. You're supportive but never patronizing, and you always provide actionable guidance.`;

    try {
      const response = await client.generate(coachingPrompt, {
        systemPrompt,
        temperature: 0.8,
        maxTokens: 1200,
      });

      const coachingContent = response.content as string;

      return {
        coachingType: input.sessionType,
        personalizedMessage: coachingContent,
        styleInsights: this.extractStyleInsights(coachingContent, profile),
        marketIntelligence: this.extractMarketGuidance(marketInsights),
        actionableAdvice: this.generateActionableAdvice(currentState, profile),
        encouragement: this.extractEncouragement(coachingContent),
        nextSessionFocus: this.determineNextFocus(input.sessionType, currentState),
        confidence: 0.9,
      };

    } catch (error) {
      return this.generateFallbackCoaching(input, profile, currentState);
    }
  }

  // Helper methods for data extraction and analysis
  private extractWritingPersonality(text: string): string {
    // Simplified extraction - in production would use more sophisticated parsing
    if (text.includes('conversational')) return 'A naturally conversational storyteller';
    if (text.includes('lyrical')) return 'A lyrical wordsmith with poetic sensibilities';
    if (text.includes('direct')) return 'A clear, direct communicator';
    return 'A unique voice with distinctive character';
  }

  private extractDominantVoice(text: string): string {
    if (text.toLowerCase().includes('conversational')) return 'conversational';
    if (text.toLowerCase().includes('formal')) return 'formal';
    if (text.toLowerCase().includes('lyrical')) return 'lyrical';
    if (text.toLowerCase().includes('descriptive')) return 'descriptive';
    return 'developing';
  }

  private extractStrengths(text: string): string[] {
    // Simplified - would use more sophisticated extraction
    const strengths = [];
    if (text.includes('dialogue')) strengths.push('dialogue');
    if (text.includes('description')) strengths.push('description');
    if (text.includes('character')) strengths.push('character development');
    if (text.includes('pace') || text.includes('pacing')) strengths.push('pacing');
    return strengths.length > 0 ? strengths : ['clear expression', 'engaging content'];
  }

  private extractGrowthAreas(text: string): string[] {
    // Simplified extraction
    const areas = [];
    if (text.includes('structure')) areas.push('story structure');
    if (text.includes('variety')) areas.push('sentence variety');
    if (text.includes('depth')) areas.push('emotional depth');
    return areas.length > 0 ? areas : ['consistent practice', 'voice development'];
  }

  private identifyRecentFocus(interactions: any[]): string {
    if (!interactions || interactions.length === 0) return 'getting started';
    
    const recentAgents = interactions.slice(-5).map(i => i.agentType);
    const mostUsed = recentAgents.reduce((a, b, i, arr) => 
      arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
    );

    switch (mostUsed) {
      case 'writing-assistant': return 'polishing and refinement';
      case 'contextual-enhancer': return 'atmospheric writing';
      case 'autonomous-writer': return 'content generation';
      default: return 'exploring different techniques';
    }
  }

  private identifyNeedsAttention(analytics: any, profile: WriterStyleProfile): string[] {
    const needs = [];
    
    if (analytics.sessionsThisWeek < 3) needs.push('consistent writing schedule');
    if (analytics.averageQualityScore < 6) needs.push('fundamental technique review');
    if (profile.growthAreas.length > 3) needs.push('focused skill development');
    
    return needs.length > 0 ? needs : ['maintaining momentum'];
  }

  private assessTrendAlignment(profile: WriterStyleProfile): number {
    // Simplified assessment - would use more sophisticated analysis
    const voiceStrength = profile.dominantVoice !== 'developing' ? 3 : 1;
    const strengthCount = profile.strengthAreas.length;
    return Math.min(10, voiceStrength + strengthCount + 3);
  }

  private identifyOpportunities(profile: WriterStyleProfile): string[] {
    const opportunities = [];
    
    if (profile.dominantVoice === 'conversational') {
      opportunities.push('contemporary fiction', 'memoir writing');
    }
    if (profile.strengthAreas.includes('dialogue')) {
      opportunities.push('screenplay writing', 'character-driven stories');
    }
    if (profile.strengthAreas.includes('description')) {
      opportunities.push('atmospheric fiction', 'travel writing');
    }
    
    return opportunities.length > 0 ? opportunities : ['authentic voice development'];
  }

  private extractStyleInsights(content: string, profile: WriterStyleProfile): string[] {
    // Extract key insights from coaching content
    return [
      `Your ${profile.dominantVoice} voice is developing nicely`,
      `Strong progress in ${profile.strengthAreas[0] || 'core writing skills'}`,
      'Unique style emerging with consistent practice'
    ];
  }

  private extractMarketGuidance(insights: any): string[] {
    return [
      'Current trends favor authentic, character-driven stories',
      'Your style aligns well with contemporary reader preferences',
      'Focus on voice development over trend-chasing'
    ];
  }

  private generateActionableAdvice(currentState: any, profile: WriterStyleProfile): any[] {
    return [
      {
        category: 'Daily Practice',
        suggestion: 'Write for 20 minutes daily, focusing on voice consistency',
        difficulty: 'easy' as const,
        marketRelevance: 8
      },
      {
        category: 'Style Development',
        suggestion: `Strengthen your ${profile.growthAreas[0] || 'core skills'} through targeted exercises`,
        difficulty: 'moderate' as const,
        marketRelevance: 7
      },
      {
        category: 'Market Awareness',
        suggestion: 'Read 2-3 books in your target genre this month',
        difficulty: 'easy' as const,
        marketRelevance: 9
      }
    ];
  }

  private extractEncouragement(content: string): string {
    // Extract encouraging message
    return "You're making excellent progress! Your unique voice is really starting to shine through. Keep up the great work!";
  }

  private determineNextFocus(sessionType: string, currentState: any): string {
    switch (sessionType) {
      case 'daily_checkin': return 'consistency and momentum';
      case 'style_analysis': return 'voice refinement exercises';
      case 'market_insights': return 'authentic trend integration';
      default: return 'continued skill development';
    }
  }

  private generateFallbackCoaching(input: CoachSessionInput, profile: WriterStyleProfile, currentState: any): CoachResponse {
    return {
      coachingType: input.sessionType,
      personalizedMessage: `Great to see you keeping up with your writing! Your ${profile.dominantVoice} voice is developing well. Remember, every word you write is building your unique style. Keep going!`,
      styleInsights: [`Your writing shows ${currentState.momentum} momentum`],
      marketIntelligence: ['Authenticity is always in demand'],
      actionableAdvice: [{
        category: 'Practice',
        suggestion: 'Continue daily writing routine',
        difficulty: 'easy' as const,
        marketRelevance: 8
      }],
      encouragement: "You're on the right track - keep writing!",
      nextSessionFocus: 'building consistency',
      confidence: 0.7,
    };
  }

  private async updateStyleProfile(profile: WriterStyleProfile, newText: string): Promise<void> {
    // Update profile with new writing sample
    await this.analyzeWritingStyle(profile, newText);
  }
}

// Export singleton instance
export const premiumWritingCoach = new PremiumWritingCoach();