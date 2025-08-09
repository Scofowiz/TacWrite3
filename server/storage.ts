import { 
  type User, 
  type InsertUser, 
  type Document, 
  type InsertDocument,
  type AiInteraction,
  type InsertAiInteraction,
  type LearningProgress,
  type InsertLearningProgress,
  type Achievement,
  type InsertAchievement,
  type WritingAnalytics,
  type InsertWritingAnalytics
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Document operations
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByUser(userId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<boolean>;

  // AI Interaction operations
  createAiInteraction(interaction: InsertAiInteraction): Promise<AiInteraction>;
  getAiInteractionsByUser(userId: string): Promise<AiInteraction[]>;
  getAiInteractionsByDocument(documentId: string): Promise<AiInteraction[]>;

  // Learning Progress operations
  getLearningProgress(userId: string): Promise<LearningProgress[]>;
  createLearningProgress(progress: InsertLearningProgress): Promise<LearningProgress>;
  updateLearningProgress(id: string, updates: Partial<LearningProgress>): Promise<LearningProgress | undefined>;

  // Achievement operations
  getAchievements(userId: string): Promise<Achievement[]>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;

  // Analytics operations
  getWritingAnalytics(userId: string): Promise<WritingAnalytics[]>;
  createWritingAnalytics(analytics: InsertWritingAnalytics): Promise<WritingAnalytics>;
  updateWritingAnalytics(userId: string, date: Date, updates: Partial<WritingAnalytics>): Promise<WritingAnalytics | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private documents: Map<string, Document> = new Map();
  private aiInteractions: Map<string, AiInteraction> = new Map();
  private learningProgress: Map<string, LearningProgress> = new Map();
  private achievements: Map<string, Achievement> = new Map();
  private writingAnalytics: Map<string, WritingAnalytics> = new Map();

  constructor() {
    // Initialize with sample user and data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const userId = randomUUID();
    const sampleUser: User = {
      id: userId,
      username: "demo_user",
      email: "demo@tacwrite.com",
      password: "hashed_password",
      subscriptionTier: "free",
      usageCount: 3,
      maxUsage: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(userId, sampleUser);

    // Sample documents
    const docId1 = randomUUID();
    const sampleDoc1: Document = {
      id: docId1,
      userId,
      title: "Research Paper Draft",
      content: "Climate change represents one of the most pressing challenges of our time...",
      wordCount: 2341,
      lastModified: new Date(),
      aiAssistantActive: true,
      context: { genre: "academic", audience: "undergraduate" },
      genre: "research paper",
      targetAudience: "academic",
      createdAt: new Date(),
    };
    this.documents.set(docId1, sampleDoc1);

    const docId2 = randomUUID();
    const sampleDoc2: Document = {
      id: docId2,
      userId,
      title: "Essay: Climate Change",
      content: "The effects of climate change are becoming increasingly visible...",
      wordCount: 1892,
      lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000),
      aiAssistantActive: false,
      context: null,
      genre: "essay",
      targetAudience: "general",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    };
    this.documents.set(docId2, sampleDoc2);

    // Sample learning progress
    const progressId1 = randomUUID();
    const progress1: LearningProgress = {
      id: progressId1,
      userId,
      courseModule: "research-citation",
      lessonId: "apa-basics",
      lessonTitle: "APA Citation Format",
      completionPercentage: 40,
      isCompleted: false,
      score: null,
      timeSpent: 15,
      lastAccessed: new Date(),
      createdAt: new Date(),
    };
    this.learningProgress.set(progressId1, progress1);

    // Sample achievements
    const achievementId1 = randomUUID();
    const achievement1: Achievement = {
      id: achievementId1,
      userId,
      achievementType: "citation-master",
      title: "Citation Master",
      description: "Completed 5 citation exercises",
      iconClass: "fas fa-medal",
      unlockedAt: new Date(),
    };
    this.achievements.set(achievementId1, achievement1);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Document operations
  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(doc => doc.userId === userId)
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const document: Document = {
      ...insertDocument,
      id,
      lastModified: new Date(),
      createdAt: new Date(),
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;

    const updatedDocument = { ...document, ...updates, lastModified: new Date() };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteDocument(id: string): Promise<boolean> {
    return this.documents.delete(id);
  }

  // AI Interaction operations
  async createAiInteraction(insertInteraction: InsertAiInteraction): Promise<AiInteraction> {
    const id = randomUUID();
    const interaction: AiInteraction = {
      ...insertInteraction,
      id,
      createdAt: new Date(),
    };
    this.aiInteractions.set(id, interaction);
    return interaction;
  }

  async getAiInteractionsByUser(userId: string): Promise<AiInteraction[]> {
    return Array.from(this.aiInteractions.values())
      .filter(interaction => interaction.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getAiInteractionsByDocument(documentId: string): Promise<AiInteraction[]> {
    return Array.from(this.aiInteractions.values())
      .filter(interaction => interaction.documentId === documentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Learning Progress operations
  async getLearningProgress(userId: string): Promise<LearningProgress[]> {
    return Array.from(this.learningProgress.values())
      .filter(progress => progress.userId === userId);
  }

  async createLearningProgress(insertProgress: InsertLearningProgress): Promise<LearningProgress> {
    const id = randomUUID();
    const progress: LearningProgress = {
      ...insertProgress,
      id,
      lastAccessed: new Date(),
      createdAt: new Date(),
    };
    this.learningProgress.set(id, progress);
    return progress;
  }

  async updateLearningProgress(id: string, updates: Partial<LearningProgress>): Promise<LearningProgress | undefined> {
    const progress = this.learningProgress.get(id);
    if (!progress) return undefined;

    const updatedProgress = { ...progress, ...updates, lastAccessed: new Date() };
    this.learningProgress.set(id, updatedProgress);
    return updatedProgress;
  }

  // Achievement operations
  async getAchievements(userId: string): Promise<Achievement[]> {
    return Array.from(this.achievements.values())
      .filter(achievement => achievement.userId === userId)
      .sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime());
  }

  async createAchievement(insertAchievement: InsertAchievement): Promise<Achievement> {
    const id = randomUUID();
    const achievement: Achievement = {
      ...insertAchievement,
      id,
      unlockedAt: new Date(),
    };
    this.achievements.set(id, achievement);
    return achievement;
  }

  // Analytics operations
  async getWritingAnalytics(userId: string): Promise<WritingAnalytics[]> {
    return Array.from(this.writingAnalytics.values())
      .filter(analytics => analytics.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async createWritingAnalytics(insertAnalytics: InsertWritingAnalytics): Promise<WritingAnalytics> {
    const id = randomUUID();
    const analytics: WritingAnalytics = {
      ...insertAnalytics,
      id,
      date: new Date(),
    };
    this.writingAnalytics.set(id, analytics);
    return analytics;
  }

  async updateWritingAnalytics(userId: string, date: Date, updates: Partial<WritingAnalytics>): Promise<WritingAnalytics | undefined> {
    const analytics = Array.from(this.writingAnalytics.values())
      .find(a => a.userId === userId && a.date.toDateString() === date.toDateString());
    
    if (!analytics) return undefined;

    const updatedAnalytics = { ...analytics, ...updates };
    this.writingAnalytics.set(analytics.id, updatedAnalytics);
    return updatedAnalytics;
  }
}

export const storage = new MemStorage();
