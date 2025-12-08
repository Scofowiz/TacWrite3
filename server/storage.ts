import { 
  type User, 
  type InsertUser, 
  type Document, 
  type InsertDocument,
  type DocumentVersion,
  type InsertDocumentVersion,
  type AiInteraction,
  type InsertAiInteraction,
  type LearningProgress,
  type InsertLearningProgress,
  type Achievement,
  type InsertAchievement,
  type WritingAnalytics,
  type InsertWritingAnalytics,
  users,
  documents,
  documentVersions,
  aiInteractions,
  learningProgress,
  achievements,
  writingAnalytics
} from "../shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
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

  // Document Version operations
  getDocumentVersions(documentId: string, limit?: number): Promise<DocumentVersion[]>;
  createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion>;
  restoreDocumentVersion(versionId: string): Promise<Document | undefined>;

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
      username: "builder",
      email: "builder@thoughtstream.com",
      password: "hashed_password",
      subscriptionTier: "premium",
      usageCount: 0,
      maxUsage: 999999,
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
      id,
      username: insertUser.username,
      email: insertUser.email,
      password: insertUser.password,
      subscriptionTier: insertUser.subscriptionTier || "free",
      usageCount: insertUser.usageCount || 0,
      maxUsage: insertUser.maxUsage || 5,
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
      id,
      userId: insertDocument.userId,
      title: insertDocument.title,
      content: insertDocument.content || "",
      wordCount: insertDocument.wordCount || 0,
      aiAssistantActive: insertDocument.aiAssistantActive || false,
      context: insertDocument.context || null,
      genre: insertDocument.genre || null,
      targetAudience: insertDocument.targetAudience || null,
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

  // Document Version operations (stub implementations for MemStorage)
  async getDocumentVersions(documentId: string, limit = 50): Promise<DocumentVersion[]> {
    return []; // Not implemented for in-memory storage
  }

  async createDocumentVersion(insertVersion: InsertDocumentVersion): Promise<DocumentVersion> {
    const id = randomUUID();
    const version: DocumentVersion = {
      id,
      documentId: insertVersion.documentId,
      content: insertVersion.content,
      title: insertVersion.title,
      wordCount: insertVersion.wordCount,
      versionNumber: insertVersion.versionNumber,
      changeDescription: insertVersion.changeDescription || null,
      createdAt: new Date(),
    };
    return version; // Not persisted in memory
  }

  async restoreDocumentVersion(versionId: string): Promise<Document | undefined> {
    return undefined; // Not implemented for in-memory storage
  }

  // AI Interaction operations
  async createAiInteraction(insertInteraction: InsertAiInteraction): Promise<AiInteraction> {
    const id = randomUUID();
    const interaction: AiInteraction = {
      id,
      userId: insertInteraction.userId,
      documentId: insertInteraction.documentId || null,
      agentType: insertInteraction.agentType,
      inputText: insertInteraction.inputText,
      outputText: insertInteraction.outputText,
      enhancementType: insertInteraction.enhancementType || null,
      qualityScore: insertInteraction.qualityScore || null,
      userRating: insertInteraction.userRating || null,
      isPremiumFeature: insertInteraction.isPremiumFeature || false,
      responseTime: insertInteraction.responseTime || null,
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
      id,
      userId: insertProgress.userId,
      courseModule: insertProgress.courseModule,
      lessonId: insertProgress.lessonId,
      lessonTitle: insertProgress.lessonTitle,
      completionPercentage: insertProgress.completionPercentage || 0,
      isCompleted: insertProgress.isCompleted || false,
      score: insertProgress.score || null,
      timeSpent: insertProgress.timeSpent || null,
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
      id,
      userId: insertAnalytics.userId,
      wordsWritten: insertAnalytics.wordsWritten || 0,
      documentsCreated: insertAnalytics.documentsCreated || 0,
      aiAssistsUsed: insertAnalytics.aiAssistsUsed || 0,
      averageQualityScore: insertAnalytics.averageQualityScore || null,
      timeSpentWriting: insertAnalytics.timeSpentWriting || null,
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

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Document operations
  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.lastModified));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(insertDocument)
      .returning();
    return document;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    const [document] = await db
      .update(documents)
      .set({ ...updates, lastModified: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return document || undefined;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Document Version operations
  async getDocumentVersions(documentId: string, limit = 50): Promise<DocumentVersion[]> {
    return await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.createdAt))
      .limit(limit);
  }

  async createDocumentVersion(insertVersion: InsertDocumentVersion): Promise<DocumentVersion> {
    const [version] = await db
      .insert(documentVersions)
      .values(insertVersion)
      .returning();
    return version;
  }

  async restoreDocumentVersion(versionId: string): Promise<Document | undefined> {
    // Get the version
    const [version] = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.id, versionId));
    
    if (!version) return undefined;

    // Update the document with the version's content
    const [document] = await db
      .update(documents)
      .set({
        content: version.content,
        title: version.title,
        wordCount: version.wordCount,
        lastModified: new Date()
      })
      .where(eq(documents.id, version.documentId))
      .returning();
    
    return document || undefined;
  }

  // AI Interaction operations
  async createAiInteraction(insertInteraction: InsertAiInteraction): Promise<AiInteraction> {
    const [interaction] = await db
      .insert(aiInteractions)
      .values(insertInteraction)
      .returning();
    return interaction;
  }

  async getAiInteractionsByUser(userId: string): Promise<AiInteraction[]> {
    return await db
      .select()
      .from(aiInteractions)
      .where(eq(aiInteractions.userId, userId))
      .orderBy(desc(aiInteractions.createdAt));
  }

  async getAiInteractionsByDocument(documentId: string): Promise<AiInteraction[]> {
    return await db
      .select()
      .from(aiInteractions)
      .where(eq(aiInteractions.documentId, documentId))
      .orderBy(desc(aiInteractions.createdAt));
  }

  // Learning Progress operations
  async getLearningProgress(userId: string): Promise<LearningProgress[]> {
    return await db
      .select()
      .from(learningProgress)
      .where(eq(learningProgress.userId, userId));
  }

  async createLearningProgress(insertProgress: InsertLearningProgress): Promise<LearningProgress> {
    const [progress] = await db
      .insert(learningProgress)
      .values(insertProgress)
      .returning();
    return progress;
  }

  async updateLearningProgress(id: string, updates: Partial<LearningProgress>): Promise<LearningProgress | undefined> {
    const [progress] = await db
      .update(learningProgress)
      .set({ ...updates, lastAccessed: new Date() })
      .where(eq(learningProgress.id, id))
      .returning();
    return progress || undefined;
  }

  // Achievement operations
  async getAchievements(userId: string): Promise<Achievement[]> {
    return await db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, userId))
      .orderBy(desc(achievements.unlockedAt));
  }

  async createAchievement(insertAchievement: InsertAchievement): Promise<Achievement> {
    const [achievement] = await db
      .insert(achievements)
      .values(insertAchievement)
      .returning();
    return achievement;
  }

  // Analytics operations
  async getWritingAnalytics(userId: string): Promise<WritingAnalytics[]> {
    return await db
      .select()
      .from(writingAnalytics)
      .where(eq(writingAnalytics.userId, userId))
      .orderBy(desc(writingAnalytics.date));
  }

  async createWritingAnalytics(insertAnalytics: InsertWritingAnalytics): Promise<WritingAnalytics> {
    const [analytics] = await db
      .insert(writingAnalytics)
      .values(insertAnalytics)
      .returning();
    return analytics;
  }

  async updateWritingAnalytics(userId: string, date: Date, updates: Partial<WritingAnalytics>): Promise<WritingAnalytics | undefined> {
    const [analytics] = await db
      .update(writingAnalytics)
      .set(updates)
      .where(eq(writingAnalytics.userId, userId))
      .returning();
    return analytics || undefined;
  }

  // Initialize with sample data if database is empty
  async initializeIfEmpty(): Promise<void> {
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length === 0) {
      // Create sample user with sample documents
      const [user] = await db
        .insert(users)
        .values({
          username: "builder",
          email: "builder@thoughtstream.com",
          password: "hashed_password",
          subscriptionTier: "premium",
          usageCount: 0,
          maxUsage: 999999,
        })
        .returning();

      // Create sample documents
      await db.insert(documents).values([
        {
          userId: user.id,
          title: "Research Paper Draft",
          content: "Climate change represents one of the most pressing challenges of our time...",
          wordCount: 2341,
          aiAssistantActive: true,
          context: { genre: "academic", audience: "undergraduate" },
          genre: "research paper",
          targetAudience: "academic",
        },
        {
          userId: user.id,
          title: "Essay: Climate Change",
          content: "The effects of climate change are becoming increasingly visible...",
          wordCount: 1892,
          aiAssistantActive: false,
          genre: "essay",
          targetAudience: "general",
        },
      ]);
    }
  }
}

export const storage = new DatabaseStorage();
