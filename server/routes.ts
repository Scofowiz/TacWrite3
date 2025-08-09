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

  const httpServer = createServer(app);
  return httpServer;
}
