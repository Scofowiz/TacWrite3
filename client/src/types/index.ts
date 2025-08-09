export interface User {
  id: string;
  username: string;
  email: string;
  subscriptionTier: "free" | "premium";
  usageCount: number;
  maxUsage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  userId: string;
  title: string;
  content: string;
  wordCount: number;
  lastModified: Date;
  aiAssistantActive: boolean;
  context: unknown;
  genre: string | null;
  targetAudience: string | null;
  createdAt: Date;
}

export interface AiInteraction {
  id: string;
  userId: string;
  documentId: string | null;
  agentType: string;
  inputText: string;
  outputText: string;
  enhancementType: string | null;
  qualityScore: string | null;
  userRating: string | null;
  isPremiumFeature: boolean;
  responseTime: number | null;
  createdAt: Date;
}

export interface LearningProgress {
  id: string;
  userId: string;
  courseModule: string;
  lessonId: string;
  lessonTitle: string;
  completionPercentage: number;
  isCompleted: boolean;
  score: number | null;
  timeSpent: number | null;
  lastAccessed: Date;
  createdAt: Date;
}

export interface Achievement {
  id: string;
  userId: string;
  achievementType: string;
  title: string;
  description: string;
  iconClass: string;
  unlockedAt: Date;
}

export interface WritingAnalytics {
  id: string;
  userId: string;
  date: Date;
  wordsWritten: number;
  documentsCreated: number;
  aiAssistsUsed: number;
  averageQualityScore: string | null;
  timeSpentWriting: number | null;
}

export type TabType = "editor" | "tutoring" | "analytics";

export type EnhancementType = "description" | "dialogue" | "style" | "clarity" | "emotion" | "pacing" | "atmosphere" | "character" | "action" | "tension" | "voice" | "general";

export type CourseModule = "research-citation" | "academic-writing" | "grammar-style" | "writing-process";
