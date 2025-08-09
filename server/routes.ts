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

  // AI Enhancement endpoint
  app.post("/api/ai/enhance", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("demo_user");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { text, enhancementType, documentId } = req.body;
      
      // Check usage limits for free users
      if (user.subscriptionTier === "free" && user.usageCount >= user.maxUsage) {
        return res.status(403).json({ 
          message: "Usage limit reached. Upgrade to premium for unlimited access.",
          requiresUpgrade: true 
        });
      }

      // Simulate AI enhancement (replace with actual AI integration)
      const enhancedText = `${text} [Enhanced with better clarity and flow]`;
      const qualityScore = Math.random() * 3 + 7; // 7-10 range

      // Log AI interaction
      await storage.createAiInteraction({
        userId: user.id,
        documentId,
        agentType: "writing-assistant",
        inputText: text,
        outputText: enhancedText,
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
        enhancedText,
        qualityScore,
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
          enhancedText = `${text} This is an AI-generated continuation that maintains context and style...`;
          break;
        case "market-insights":
          agentType = "wfa-agent";
          enhancedText = `${text} [Market analysis: This content aligns with current industry trends...]`;
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

  const httpServer = createServer(app);
  return httpServer;
}
