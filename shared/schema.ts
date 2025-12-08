import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  subscriptionTier: text("subscription_tier").notNull().default("free"), // free, premium
  usageCount: integer("usage_count").notNull().default(0),
  maxUsage: integer("max_usage").notNull().default(5),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  wordCount: integer("word_count").notNull().default(0),
  lastModified: timestamp("last_modified").notNull().default(sql`now()`),
  aiAssistantActive: boolean("ai_assistant_active").notNull().default(false),
  context: jsonb("context"),
  genre: text("genre"),
  targetAudience: text("target_audience"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// AI Interactions table
export const aiInteractions = pgTable("ai_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  documentId: varchar("document_id").references(() => documents.id, { onDelete: 'cascade' }),
  agentType: text("agent_type").notNull(), // writing-assistant, autonomous-writer, wfa-agent, tutor
  inputText: text("input_text").notNull(),
  outputText: text("output_text").notNull(),
  enhancementType: text("enhancement_type"), // description, dialogue, style, clarity, etc.
  qualityScore: decimal("quality_score", { precision: 3, scale: 1 }),
  userRating: text("user_rating"), // good, ok, poor, decline
  isPremiumFeature: boolean("is_premium_feature").notNull().default(false),
  responseTime: integer("response_time"), // milliseconds
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Learning Progress table
export const learningProgress = pgTable("learning_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  courseModule: text("course_module").notNull(), // research-citation, academic-writing, grammar-style, writing-process
  lessonId: text("lesson_id").notNull(),
  lessonTitle: text("lesson_title").notNull(),
  completionPercentage: integer("completion_percentage").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  score: integer("score"), // percentage score on assessments
  timeSpent: integer("time_spent"), // minutes
  lastAccessed: timestamp("last_accessed").notNull().default(sql`now()`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Achievements table
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  achievementType: text("achievement_type").notNull(), // citation-master, perfect-score, fast-learner
  title: text("title").notNull(),
  description: text("description").notNull(),
  iconClass: text("icon_class").notNull(),
  unlockedAt: timestamp("unlocked_at").notNull().default(sql`now()`),
});

// Document Versions table
export const documentVersions = pgTable("document_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  title: text("title").notNull(),
  wordCount: integer("word_count").notNull().default(0),
  versionNumber: integer("version_number").notNull(),
  changeDescription: text("change_description"), // Auto-saved, AI Enhancement, Manual Edit, etc.
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Writing Analytics table
export const writingAnalytics = pgTable("writing_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull().default(sql`now()`),
  wordsWritten: integer("words_written").notNull().default(0),
  documentsCreated: integer("documents_created").notNull().default(0),
  aiAssistsUsed: integer("ai_assists_used").notNull().default(0),
  averageQualityScore: decimal("average_quality_score", { precision: 3, scale: 1 }),
  timeSpentWriting: integer("time_spent_writing"), // minutes
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  lastModified: true,
  createdAt: true,
});

export const insertAiInteractionSchema = createInsertSchema(aiInteractions).omit({
  id: true,
  createdAt: true,
});

export const insertLearningProgressSchema = createInsertSchema(learningProgress).omit({
  id: true,
  lastAccessed: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  unlockedAt: true,
});

export const insertDocumentVersionSchema = createInsertSchema(documentVersions).omit({
  id: true,
  createdAt: true,
});

export const insertWritingAnalyticsSchema = createInsertSchema(writingAnalytics).omit({
  id: true,
  date: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;
export type DocumentVersion = typeof documentVersions.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertAiInteraction = z.infer<typeof insertAiInteractionSchema>;
export type AiInteraction = typeof aiInteractions.$inferSelect;

export type InsertLearningProgress = z.infer<typeof insertLearningProgressSchema>;
export type LearningProgress = typeof learningProgress.$inferSelect;

export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

export type InsertWritingAnalytics = z.infer<typeof insertWritingAnalyticsSchema>;
export type WritingAnalytics = typeof writingAnalytics.$inferSelect;
