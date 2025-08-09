import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertDocumentSchema, 
  insertAiInteractionSchema,
  insertLearningProgressSchema,
  insertAchievementSchema,
  insertWritingAnalyticsSchema
} from "@shared/schema";
import { z } from "zod";

// AI generation types
const aiEnhanceSchema = z.object({
  text: z.string(),
  enhancementType: z.string(),
  documentId: z.string().optional(),
});

const aiGenerateSchema = z.object({
  prompt: z.string(),
  genre: z.string().optional(),
  memory: z.string().optional(),
  contextualPrompt: z.string().optional(),
});

// Mock AI functions for demonstration
async function mockEnhanceText(text: string, enhancementType: string): Promise<{
  enhancedText: string;
  qualityScore: string;
  improvements: string[];
}> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  const improvements = [
    "Enhanced descriptive language",
    "Improved sentence flow",
    "Strengthened character voice",
    "Added emotional depth",
    "Clarified meaning"
  ];
  
  return {
    enhancedText: `[Enhanced: ${enhancementType}] ${text} This text has been improved with richer vocabulary, better pacing, and more engaging prose that draws the reader deeper into the narrative.`,
    qualityScore: (8.5 + Math.random() * 1.5).toFixed(1),
    improvements: improvements.slice(0, 2 + Math.floor(Math.random() * 3))
  };
}

async function mockGenerateText(prompt: string, options: any = {}): Promise<{
  text: string;
  qualityScore: string;
}> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2500));
  
  const responses = [
    "The mist rolled across the ancient stones, carrying with it whispers of forgotten times. In the distance, a lone figure approached, their footsteps echoing against the silence that had settled over the ruins like a shroud.",
    
    "Sarah's fingers trembled as she opened the letter. The words on the page would change everything—she knew it even before her eyes traced the first line. Outside, rain began to fall, as if the sky itself mourned what was to come.",
    
    "The marketplace buzzed with activity, a symphony of voices haggling, laughing, and calling out their wares. Among the crowd, Marcus moved with purpose, his eyes scanning for the face he'd been told to find.",
    
    "At the edge of the world, where the sea met the sky in an endless embrace, stood the lighthouse. Its beam cut through the darkness like hope itself, guiding lost souls home to safety.",
    
    "The clock tower chimed midnight as Elena slipped through the shadows of the old quarter. Every step was calculated, every breath measured. Tonight, the revolution would begin."
  ];
  
  const selectedResponse = responses[Math.floor(Math.random() * responses.length)];
  
  return {
    text: selectedResponse,
    qualityScore: (8.0 + Math.random() * 2.0).toFixed(1)
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get current user (hardcoded for demo)
  app.get("/api/user/current", async (req, res) => {
    try {
      const users = await storage.getUserByUsername("demo_user");
      if (!users) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Update user subscription
  app.patch("/api/user/:id/subscription", async (req, res) => {
    try {
      const { id } = req.params;
      const { subscriptionTier } = req.body;
      
      const updatedUser = await storage.updateUser(id, { 
        subscriptionTier,
        maxUsage: subscriptionTier === "premium" ? 999999 : 5,
        updatedAt: new Date()
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // Get documents for user
  app.get("/api/documents", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("demo_user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const documents = await storage.getDocumentsByUser(user.id);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to get documents" });
    }
  });

  // Get specific document
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to get document" });
    }
  });

  // Create new document
  app.post("/api/documents", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("demo_user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const validatedData = insertDocumentSchema.parse({
        ...req.body,
        userId: user.id,
      });
      
      const document = await storage.createDocument(validatedData);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  // Update document
  app.patch("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedDocument = await storage.updateDocument(id, updates);
      
      if (!updatedDocument) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(updatedDocument);
    } catch (error) {
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  // AI Enhancement endpoint - Enhanced with multiple agent types
  app.post("/api/ai/enhance", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("demo_user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { text, enhancementType, documentId, agentType = "writing-assistant" } = req.body;
      
      // Check usage limits for free users
      if (user.subscriptionTier === "free" && user.usageCount >= user.maxUsage) {
        return res.status(403).json({ 
          message: "Usage limit reached. Upgrade to premium for unlimited access.",
          requiresUpgrade: true 
        });
      }

      let enhancementResult;
      let responseAgentType = agentType;

      // Route to different enhancement types based on agent
      switch (agentType) {
        case 'repetition-checker':
          enhancementResult = {
            enhancedText: `Repetition analysis for: "${text.substring(0, 100)}..." - Found 2-3 repetitive patterns that could be varied for better flow.`,
            qualityScore: "8.5",
            improvements: ["Identified repetitive patterns", "Provided variation suggestions", "Enhanced readability"]
          };
          responseAgentType = "doctor-agent";
          break;
          
        case 'contextual-enhancer':
          enhancementResult = await mockEnhanceText(text, "contextual enhancement");
          responseAgentType = "contextual-enhancer";
          break;
          
        case 'style-improver':
          enhancementResult = await mockEnhanceText(text, "style improvement");
          break;
          
        default:
          enhancementResult = await mockEnhanceText(text, enhancementType);
      }

      const qualityScore = parseFloat(enhancementResult.qualityScore);

      // Log AI interaction
      await storage.createAiInteraction({
        userId: user.id,
        documentId,
        agentType: responseAgentType,
        inputText: text,
        outputText: enhancementResult.enhancedText,
        enhancementType,
        qualityScore: qualityScore.toString(),
        isPremiumFeature: false,
        responseTime: Math.floor(Math.random() * 2000) + 500,
      });

      // Update user usage count
      await storage.updateUser(user.id, {
        usageCount: user.usageCount + 1,
      });

      res.json({
        enhancedText: enhancementResult.enhancedText,
        qualityScore,
        improvements: enhancementResult.improvements,
        agentType: responseAgentType,
        usageRemaining: user.maxUsage - (user.usageCount + 1),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to enhance text" });
    }
  });

  // Premium AI features (autonomous writer, WFA agent)
  app.post("/api/ai/premium/:feature", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("demo_user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.subscriptionTier !== "premium") {
        return res.status(403).json({ 
          message: "Premium feature requires subscription upgrade.",
          requiresUpgrade: true 
        });
      }

      const { feature } = req.params;
      const { text, context, documentId } = req.body;

      let agentType = "autonomous-writer";
      let enhancedText = text;

      switch (feature) {
        case "auto-complete":
          agentType = "autonomous-writer";
          const generationResult = await mockGenerateText(`Continue this text maintaining the same style and tone: ${text}`, { type: "continuation" });
          enhancedText = `${text} ${generationResult.text}`;
          break;
        case "market-insights":
          agentType = "wfa-agent";
          enhancedText = `${text}\n\n[WFA Analysis: This content shows strong alignment with current market trends. The themes resonate with contemporary reader interests, particularly in the target demographic. Consider amplifying the emotional stakes and ensuring cultural relevance to maximize appeal.]`;
          break;
        case "contextual-enhancement":
          agentType = "contextual-enhancer";
          const contextResult = await mockEnhanceText(text, "atmospheric enhancement");
          enhancedText = contextResult.enhancedText;
          break;
        case "tutoring-feedback":
          agentType = "tutoring-agent";
          enhancedText = `Educational Analysis:\n\nStrengths: Your writing shows ${text.length > 200 ? 'good development and detail' : 'clear expression'}.\n\nAreas for Growth: Consider ${text.includes('.') ? 'varying sentence structure' : 'adding more specific details'} to enhance engagement.\n\nNext Steps: Focus on developing your unique voice while maintaining clarity for your intended audience.`;
          break;
        default:
          return res.status(400).json({ message: "Unknown premium feature" });
      }

      const qualityScore = Math.random() * 2 + 8; // 8-10 range for premium

      // Log premium AI interaction
      await storage.createAiInteraction({
        userId: user.id,
        documentId,
        agentType,
        inputText: text,
        outputText: enhancedText,
        enhancementType: feature,
        qualityScore: qualityScore.toString(),
        isPremiumFeature: true,
        responseTime: Math.floor(Math.random() * 3000) + 1000,
      });

      res.json({
        enhancedText,
        qualityScore,
        agentType,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process premium feature" });
    }
  });

  // Get learning progress
  app.get("/api/learning/progress", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("demo_user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const progress = await storage.getLearningProgress(user.id);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to get learning progress" });
    }
  });

  // Update learning progress
  app.patch("/api/learning/progress/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedProgress = await storage.updateLearningProgress(id, updates);
      
      if (!updatedProgress) {
        return res.status(404).json({ message: "Progress not found" });
      }
      
      res.json(updatedProgress);
    } catch (error) {
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Get achievements
  app.get("/api/achievements", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("demo_user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const achievements = await storage.getAchievements(user.id);
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ message: "Failed to get achievements" });
    }
  });

  // Get AI interactions for analytics
  app.get("/api/analytics/interactions", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("demo_user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const interactions = await storage.getAiInteractionsByUser(user.id);
      res.json(interactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get analytics" });
    }
  });

  // Get writing analytics
  app.get("/api/analytics/writing", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("demo_user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const analytics = await storage.getWritingAnalytics(user.id);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to get writing analytics" });
    }
  });

  // Enhanced Agent System Demo
  app.post("/api/ai/enhanced-agents", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("demo_user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { text, agentType, action, documentId } = req.body;

      let result;
      switch (agentType) {
        case 'repetition-checker':
          result = {
            analysis: `Repetition Analysis for "${text.substring(0, 50)}..."\n\nFound 3 patterns:\n• "very" appears 4 times - Consider using "extremely", "quite", or "remarkably"\n• "good" appears 3 times - Try "excellent", "impressive", or "effective"\n• "really" appears 2 times - Use "genuinely", "truly", or remove for stronger impact`,
            agentType: 'doctor-agent',
            confidence: 0.9
          };
          break;

        case 'contextual-enhancer':
          result = {
            enhanced: `${text}\n\n[Enhanced Context]: The scene comes alive with rich atmospheric details - the soft whisper of wind through leaves, the way shadows dance across weathered stone, and the subtle tension that hangs in the air like morning mist. Each element adds depth to the narrative landscape.`,
            agentType: 'contextual-enhancer',
            confidence: 0.85
          };
          break;

        case 'wfa-agent':
          result = {
            marketAnalysis: `WFA Market Intelligence Report:\n\n📈 Trend Alignment: Your content aligns with 3 major trends:\n• Cozy Fantasy (+89% popularity)\n• Character-driven narratives (+76% reader preference)\n• Atmospheric storytelling (+82% engagement)\n\n🎯 Optimization Suggestions:\n• Amplify emotional stakes for broader appeal\n• Consider adding contemporary themes for relevance\n• Perfect timing for seasonal content positioning`,
            agentType: 'wfa-agent',
            confidence: 0.95
          };
          break;

        case 'tutoring-agent':
          result = {
            guidance: `Writing Tutorial Session: Narrative Structure\n\n📚 Learning Objective: Strengthen story foundation through effective structure\n\n✨ Strengths in Your Writing:\n• Clear voice and engaging tone\n• Good use of descriptive language\n\n🎯 Areas for Growth:\n• Vary sentence length for better rhythm\n• Add more concrete sensory details\n\n📝 Practice Exercise:\nRewrite the first paragraph focusing on one specific sense (sight, sound, or touch). This will deepen reader immersion.`,
            agentType: 'tutoring-agent',
            confidence: 0.92
          };
          break;

        default:
          return res.status(400).json({ message: "Unknown agent type" });
      }

      // Log the enhanced agent interaction
      await storage.createAiInteraction({
        userId: user.id,
        documentId,
        agentType: result.agentType,
        inputText: text,
        outputText: JSON.stringify(result),
        enhancementType: action || 'analysis',
        qualityScore: result.confidence.toString(),
        isPremiumFeature: true,
        responseTime: Math.floor(Math.random() * 1500) + 800,
      });

      res.json({
        success: true,
        result,
        agentSystem: 'enhanced-multi-agent',
        communityLearning: true
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process enhanced agent request" });
    }
  });

  // Premium Writing Coach endpoint
  app.post("/api/coach/session", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("demo_user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check premium access
      if (user.subscriptionTier !== "premium") {
        return res.status(403).json({ 
          message: "Premium writing coach requires a premium subscription.",
          requiresUpgrade: true 
        });
      }

      const { sessionType, recentWriting, specificQuestion } = req.body;

      // Get user's analytics data
      const interactions = await storage.getAiInteractionsByUser(user.id);
      const recentInteractions = interactions.slice(-10);
      const averageQuality = recentInteractions.length > 0 
        ? recentInteractions.reduce((sum, i) => sum + parseFloat(i.qualityScore), 0) / recentInteractions.length
        : 7.5;
      
      const wordsWritten = recentWriting ? recentWriting.length : 
        recentInteractions.reduce((sum, i) => sum + i.inputText.length, 0);

      // Mock coaching session response based on analytics
      const coachingResponse = {
        coachingType: sessionType || 'daily_checkin',
        personalizedMessage: generateCoachingMessage(user, averageQuality, wordsWritten, sessionType),
        styleInsights: generateStyleInsights(recentInteractions, averageQuality),
        marketIntelligence: generateMarketInsights(sessionType),
        actionableAdvice: generateActionableAdvice(averageQuality, wordsWritten),
        encouragement: generateEncouragement(averageQuality, wordsWritten),
        nextSessionFocus: determineNextFocus(sessionType, averageQuality),
        confidence: 0.9,
        analyticsUsed: {
          totalInteractions: interactions.length,
          averageQuality,
          wordsAnalyzed: wordsWritten,
          recentSessions: recentInteractions.length
        }
      };

      // Log coaching session
      await storage.createAiInteraction({
        userId: user.id,
        documentId: req.body.documentId || null,
        agentType: "premium-coach",
        inputText: specificQuestion || `${sessionType} coaching session`,
        outputText: JSON.stringify(coachingResponse),
        enhancementType: "coaching",
        qualityScore: "9.5",
        isPremiumFeature: true,
        responseTime: Math.floor(Math.random() * 2000) + 1000,
      });

      res.json({
        success: true,
        coaching: coachingResponse,
        sessionId: `coach-${Date.now()}`,
        nextSessionRecommended: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to conduct coaching session" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Premium coaching helper functions
function generateCoachingMessage(user: any, avgQuality: number, wordsWritten: number, sessionType: string): string {
  const qualityLevel = avgQuality > 8 ? 'excellent' : avgQuality > 6 ? 'solid' : 'developing';
  const wordLevel = wordsWritten > 2000 ? 'prolific' : wordsWritten > 1000 ? 'consistent' : 'steady';
  
  const greetings = [
    "Well hello there, wordsmith! 📝",
    "Look who's back for more literary wisdom! ✨",
    "Ready to dive into your writing journey? 🚀",
    "Time for some data-driven inspiration! 📊"
  ];

  const greeting = greetings[Math.floor(Math.random() * greetings.length)];

  switch (sessionType) {
    case 'style_analysis':
      return `${greeting}\n\nI've been analyzing your writing patterns, and I must say - your ${qualityLevel} work is really coming together! You've been ${wordLevel} in your output, which tells me you're finding your rhythm.\n\nYour writing style is developing its own personality. I'm seeing some distinctive patterns that make your voice uniquely yours. Let's dig into what makes your writing tick and how we can amplify those strengths!`;
    
    case 'market_insights':
      return `${greeting}\n\nTime for some market intelligence! Based on your ${qualityLevel} writing quality and current trends, I've got some exciting insights about where your style fits in today's literary landscape.\n\nThe good news? Your authentic voice is exactly what readers are craving right now. Let's explore how to leverage current trends while staying true to your unique style.`;
    
    case 'growth_planning':
      return `${greeting}\n\nLet's chart your course for literary greatness! With ${qualityLevel} quality scores and ${wordLevel} output, you're building solid foundations.\n\nEvery great writer has a roadmap - not just for stories, but for skill development. Today we're creating your personalized growth plan based on your analytics and market opportunities.`;
    
    default: // daily_checkin
      return `${greeting}\n\nDaily check-in time! I've been watching your progress, and your ${qualityLevel} writing quality paired with ${wordLevel} output tells a story of genuine commitment.\n\nYou know what I love most about your recent work? You're not just writing - you're evolving. Each session shows growth, and that's the secret sauce every successful writer has.`;
  }
}

function generateStyleInsights(interactions: any[], avgQuality: number): string[] {
  const insights = [];
  
  if (interactions.length > 0) {
    const agentUsage = interactions.reduce((acc, i) => {
      acc[i.agentType] = (acc[i.agentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topAgent = Object.entries(agentUsage).sort(([,a], [,b]) => b - a)[0];
    
    if (topAgent) {
      switch (topAgent[0]) {
        case 'writing-assistant':
          insights.push("You're a careful craftsperson - I love how you focus on polishing and refinement!");
          break;
        case 'contextual-enhancer':
          insights.push("Your attention to atmospheric detail is impressive - you create vivid, immersive scenes!");
          break;
        case 'autonomous-writer':
          insights.push("You're ambitious with content generation - that creative drive is your superpower!");
          break;
        default:
          insights.push("You're exploring diverse techniques - that curiosity will serve you well!");
      }
    }
  }
  
  if (avgQuality > 8) {
    insights.push("Your quality consistency is outstanding - you've developed reliable instincts!");
  } else if (avgQuality > 6) {
    insights.push("Your quality is solid and improving - you're on an excellent trajectory!");
  } else {
    insights.push("Every writer starts somewhere - your willingness to practice is already setting you apart!");
  }
  
  insights.push("Your unique voice is emerging with each piece you write - trust the process!");
  
  return insights;
}

function generateMarketInsights(sessionType?: string): string[] {
  const trendInsights = [
    "📈 Character-driven narratives are dominating - your focus on authentic voices is spot-on!",
    "🔥 Readers are craving atmospheric, immersive fiction - perfect for your descriptive strengths!",
    "⭐ Authentic storytelling beats formulaic writing every time - your genuine voice is your advantage!",
    "💡 Cross-genre fusion is trending - don't be afraid to blend elements from different styles!",
    "🎯 Micro-fiction and serialized content are gaining traction - consider experimenting with format!",
  ];
  
  const marketAdvice = [
    "The market rewards consistency over perfection - keep showing up!",
    "Your authentic voice will find its audience - stay true to your style while being open to growth!",
    "Current trends favor writers who can balance commercial appeal with literary quality!",
  ];
  
  return [
    trendInsights[Math.floor(Math.random() * trendInsights.length)],
    marketAdvice[Math.floor(Math.random() * marketAdvice.length)]
  ];
}

function generateActionableAdvice(avgQuality: number, wordsWritten: number): any[] {
  const advice = [];
  
  // Daily practice advice
  if (wordsWritten < 1000) {
    advice.push({
      category: "Daily Momentum",
      suggestion: "Aim for 300 words daily - consistency beats marathon sessions every time!",
      difficulty: "easy",
      marketRelevance: 9
    });
  } else {
    advice.push({
      category: "Skill Expansion", 
      suggestion: "Try writing in a different genre for 15 minutes - cross-training for writers!",
      difficulty: "moderate",
      marketRelevance: 8
    });
  }
  
  // Quality improvement advice
  if (avgQuality < 7) {
    advice.push({
      category: "Fundamentals",
      suggestion: "Focus on one aspect per session: dialogue, description, or pacing",
      difficulty: "easy",
      marketRelevance: 10
    });
  } else {
    advice.push({
      category: "Voice Development",
      suggestion: "Experiment with different narrative perspectives to strengthen your unique voice",
      difficulty: "moderate", 
      marketRelevance: 9
    });
  }
  
  // Market-aligned advice
  advice.push({
    category: "Market Awareness",
    suggestion: "Read one story in your target genre this week - analyze what hooks you as a reader",
    difficulty: "easy",
    marketRelevance: 10
  });
  
  // Advanced technique
  advice.push({
    category: "Craft Mastery",
    suggestion: "Practice 'show don't tell' by rewriting a descriptive paragraph using only action and dialogue",
    difficulty: "challenging",
    marketRelevance: 7
  });
  
  return advice;
}

function generateEncouragement(avgQuality: number, wordsWritten: number): string {
  const encouragements = [
    "You're building something special - every word counts toward your unique voice! 🌟",
    "I see real growth in your patterns - trust the process, you're exactly where you need to be! 💪",
    "Your commitment to improvement is inspiring - that's the mindset of successful writers! ✨",
    "Each session makes you stronger - you're not just writing, you're becoming a writer! 🚀",
    "Your willingness to experiment and grow sets you apart - keep pushing those boundaries! 🎯"
  ];
  
  return encouragements[Math.floor(Math.random() * encouragements.length)];
}

function determineNextFocus(sessionType?: string, avgQuality?: number): string {
  if (sessionType === 'style_analysis') {
    return "Voice refinement exercises and signature style development";
  } else if (sessionType === 'market_insights') {
    return "Authentic trend integration while maintaining your unique voice";
  } else if (avgQuality && avgQuality < 7) {
    return "Fundamental technique strengthening and consistent practice";
  } else {
    return "Advanced craft techniques and market-aware writing strategies";
  }
}
