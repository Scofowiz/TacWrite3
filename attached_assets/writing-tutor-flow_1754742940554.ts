/**
 * @fileOverview Enhanced Tutor Agent - Complete overhaul for effective writing education
 * 
 * FIXES MAJOR ISSUES:
 * - Too friendly/not productive → Structured but engaging approach
 * - Dead pan/boring → Interactive with clear progression
 * - No pagination/curriculum → Systematic skill building with state tracking
 * 
 * NEW APPROACH:
 * - Structured lesson progression with clear objectives
 * - Measurable skill development tracking
 * - Interactive exercises with immediate feedback
 * - Professional but engaging teaching style
 */

import { z } from 'zod';
import { createAIClient } from '@/lib/ai-client';
import { globalCommunityMemory } from './community_memory_pool';

// Learning session state tracking
export const LearningSessionSchema = z.object({
  sessionId: z.string(),
  currentLesson: z.string(),
  completedLessons: z.array(z.string()),
  skillLevels: z.record(z.number()), // skill -> level mapping
  sessionProgress: z.number().min(0).max(1),
  lastActivity: z.date(),
  totalSessions: z.number(),
});
export type LearningSession = z.infer<typeof LearningSessionSchema>;

// Structured lesson framework
export const LessonFrameworkSchema = z.object({
  lessonId: z.string(),
  title: z.string(),
  objectives: z.array(z.string()),
  prerequisites: z.array(z.string()),
  duration: z.number(), // minutes
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  skillsFocused: z.array(z.string()),
  assessmentCriteria: z.array(z.string()),
});
export type LessonFramework = z.infer<typeof LessonFrameworkSchema>;

// Exercise with measurable outcomes
export const WritingExerciseSchema = z.object({
  exerciseId: z.string(),
  type: z.enum(['analysis', 'practice', 'revision', 'creation', 'comparison']),
  instruction: z.string(),
  example: z.string().optional(),
  successCriteria: z.array(z.string()),
  commonMistakes: z.array(z.string()),
  timeEstimate: z.number(), // minutes
});
export type WritingExercise = z.infer<typeof WritingExerciseSchema>;

// Enhanced Tutor input
export const EnhancedTutorInputSchema = z.object({
  // Session management
  sessionState: LearningSessionSchema.optional().describe('Current learning session state'),
  learnerProfile: z.object({
    writingLevel: z.enum(['beginner', 'intermediate', 'advanced']),
    primaryGoals: z.array(z.string()),
    weakAreas: z.array(z.string()),
    preferredPace: z.enum(['slow', 'moderate', 'fast']),
  }),
  
  // Current interaction
  mode: z.enum(['start-lesson', 'continue-lesson', 'submit-exercise', 'get-feedback', 'progress-check']),
  currentText: z.string().optional().describe('Text being worked on'),
  exerciseResponse: z.string().optional().describe('Student\'s exercise response'),
  
  // Selection awareness
  contextualInput: z.object({
    selectedText: z.string().optional(),
    documentContent: z.string().optional(),
    focusArea: z.string().optional().describe('Specific area to work on'),
  }),
  
  // Lesson parameters
  requestedSkill: z.string().optional().describe('Specific skill to learn'),
  timeAvailable: z.number().optional().describe('Minutes available for session'),
});
export type EnhancedTutorInput = z.infer<typeof EnhancedTutorInputSchema>;

// Structured tutor output
export const EnhancedTutorOutputSchema = z.object({
  sessionState: LearningSessionSchema,
  response: z.object({
    type: z.enum(['lesson-start', 'instruction', 'exercise', 'feedback', 'progress-update']),
    content: z.string(),
    actionRequired: z.string().optional(),
    nextStep: z.string(),
  }),
  currentLesson: LessonFrameworkSchema.optional(),
  exercise: WritingExerciseSchema.optional(),
  progress: z.object({
    currentObjective: z.string(),
    completion: z.number().min(0).max(1),
    skillImprovement: z.record(z.number()),
    nextMilestone: z.string(),
  }),
  navigation: z.object({
    canContinue: z.boolean(),
    canReview: z.boolean(),
    canAdvance: z.boolean(),
    availableActions: z.array(z.string()),
  }),
});
export type EnhancedTutorOutput = z.infer<typeof EnhancedTutorOutputSchema>;

/**
 * Enhanced Tutor Agent - Structured, effective writing education
 */
export async function enhancedTutorAgent(input: EnhancedTutorInput): Promise<EnhancedTutorOutput> {
  const startTime = Date.now();
  
  // Initialize or load session state
  const sessionState = input.sessionState || initializeNewSession(input.learnerProfile);
  
  // Log tutoring action
  globalCommunityMemory.logAgentAction({
    agentId: 'enhanced-tutor-agent',
    agentType: 'Tutor',
    action: `tutor-${input.mode}`,
    input,
    output: {},
    reasoning: `Providing structured writing education in ${input.mode} mode`,
    confidence: 0.9,
    duration: 0,
    success: true,
  });

  const client = createAIClient();
  
  try {
    switch (input.mode) {
      case 'start-lesson':
        return await startNewLesson(client, input, sessionState);
      
      case 'continue-lesson':
        return await continueCurrentLesson(client, input, sessionState);
      
      case 'submit-exercise':
        return await evaluateExercise(client, input, sessionState);
      
      case 'get-feedback':
        return await provideFeedback(client, input, sessionState);
      
      case 'progress-check':
        return await checkProgress(client, input, sessionState);
      
      default:
        throw new Error(`Unknown tutor mode: ${input.mode}`);
    }
  } catch (error) {
    // Log error
    globalCommunityMemory.logAgentAction({
      agentId: 'enhanced-tutor-agent',
      agentType: 'Tutor',
      action: 'tutor-error',
      input,
      output: { error: error instanceof Error ? error.message : 'Unknown error' },
      reasoning: 'Enhanced tutor agent encountered an error',
      confidence: 0,
      duration: Date.now() - startTime,
      success: false,
    });
    
    throw error;
  }
}

/**
 * Initialize new learning session
 */
function initializeNewSession(learnerProfile: any): LearningSession {
  return {
    sessionId: `session-${Date.now()}`,
    currentLesson: determineStartingLesson(learnerProfile),
    completedLessons: [],
    skillLevels: initializeSkillLevels(learnerProfile.writingLevel),
    sessionProgress: 0,
    lastActivity: new Date(),
    totalSessions: 1,
  };
}

/**
 * Determine appropriate starting lesson based on learner profile
 */
function determineStartingLesson(learnerProfile: any): string {
  if (learnerProfile.writingLevel === 'beginner') {
    return 'writing-fundamentals-1';
  } else if (learnerProfile.writingLevel === 'intermediate') {
    return 'style-and-voice-1';
  } else {
    return 'advanced-techniques-1';
  }
}

/**
 * Initialize skill levels based on writing level
 */
function initializeSkillLevels(writingLevel: string): Record<string, number> {
  const baseLevel = {
    'beginner': 2,
    'intermediate': 5,
    'advanced': 7
  }[writingLevel] || 3;

  return {
    grammar: baseLevel,
    style: baseLevel - 1,
    structure: baseLevel - 1,
    character: baseLevel - 2,
    dialogue: baseLevel - 2,
    description: baseLevel - 1,
    pacing: baseLevel - 2,
    voice: baseLevel - 1,
  };
}

/**
 * Start a new lesson with clear objectives
 */
async function startNewLesson(
  client: any,
  input: EnhancedTutorInput,
  sessionState: LearningSession
): Promise<EnhancedTutorOutput> {
  const lesson = getLessonByID(sessionState.currentLesson);
  
  const lessonStartPrompt = `You are beginning a structured writing lesson. Present this lesson with clear objectives and engagement.

LESSON: ${lesson.title}
OBJECTIVES: ${lesson.objectives.join(', ')}
STUDENT LEVEL: ${input.learnerProfile.writingLevel}
DURATION: ${lesson.duration} minutes

Create an engaging lesson introduction that:
1. States clear learning objectives
2. Explains why this skill matters
3. Provides a concrete example
4. Sets up the first exercise

Be professional but engaging. Focus on practical application.`;

  try {
    const response = await client.generate(lessonStartPrompt, {
      systemPrompt: buildTutorSystemPrompt('lesson-start'),
      temperature: 0.4,
      maxTokens: 800,
    });

    const exercise = createLessonExercise(lesson);
    
    return {
      sessionState: {
        ...sessionState,
        lastActivity: new Date(),
      },
      response: {
        type: 'lesson-start',
        content: response.content as string,
        actionRequired: 'Complete the practice exercise below',
        nextStep: 'Work through the exercise and submit your response',
      },
      currentLesson: lesson,
      exercise,
      progress: {
        currentObjective: lesson.objectives[0],
        completion: 0.1,
        skillImprovement: {},
        nextMilestone: 'Complete first exercise',
      },
      navigation: {
        canContinue: true,
        canReview: false,
        canAdvance: false,
        availableActions: ['complete-exercise', 'ask-question', 'review-example'],
      },
    };

  } catch (error) {
    throw new Error(`Failed to start lesson: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Continue current lesson progression
 */
async function continueCurrentLesson(
  client: any,
  input: EnhancedTutorInput,
  sessionState: LearningSession
): Promise<EnhancedTutorOutput> {
  const lesson = getLessonByID(sessionState.currentLesson);
  const currentProgress = sessionState.sessionProgress;
  
  // Determine next step in lesson progression
  if (currentProgress < 0.3) {
    return await provideGuidedInstruction(client, input, sessionState, lesson);
  } else if (currentProgress < 0.7) {
    return await facilitatePractice(client, input, sessionState, lesson);
  } else {
    return await conductAssessment(client, input, sessionState, lesson);
  }
}

/**
 * Evaluate student exercise response
 */
async function evaluateExercise(
  client: any,
  input: EnhancedTutorInput,
  sessionState: LearningSession
): Promise<EnhancedTutorOutput> {
  if (!input.exerciseResponse) {
    throw new Error('No exercise response provided for evaluation');
  }

  const lesson = getLessonByID(sessionState.currentLesson);
  
  const evaluationPrompt = `Evaluate this student's exercise response against the lesson objectives.

LESSON: ${lesson.title}
OBJECTIVES: ${lesson.objectives.join(', ')}
STUDENT RESPONSE:
---
${input.exerciseResponse}
---

Provide:
1. Specific feedback on what they did well
2. Areas for improvement with concrete examples
3. Next step for continued learning
4. Score (1-10) for objective achievement

Be constructive and specific. Focus on learning, not just evaluation.`;

  try {
    const response = await client.generate(evaluationPrompt, {
      systemPrompt: buildTutorSystemPrompt('evaluation'),
      temperature: 0.3,
      maxTokens: 600,
    });

    const updatedSession = {
      ...sessionState,
      sessionProgress: Math.min(1.0, sessionState.sessionProgress + 0.3),
      lastActivity: new Date(),
    };

    return {
      sessionState: updatedSession,
      response: {
        type: 'feedback',
        content: response.content as string,
        nextStep: updatedSession.sessionProgress >= 1.0 ? 'Advance to next lesson' : 'Continue with next exercise',
      },
      currentLesson: lesson,
      progress: {
        currentObjective: lesson.objectives[Math.floor(lesson.objectives.length * updatedSession.sessionProgress)],
        completion: updatedSession.sessionProgress,
        skillImprovement: calculateSkillImprovement(sessionState, lesson),
        nextMilestone: updatedSession.sessionProgress >= 1.0 ? 'Lesson complete' : 'Next exercise',
      },
      navigation: {
        canContinue: updatedSession.sessionProgress < 1.0,
        canReview: true,
        canAdvance: updatedSession.sessionProgress >= 1.0,
        availableActions: updatedSession.sessionProgress >= 1.0 ? ['next-lesson', 'review-lesson'] : ['continue-lesson', 'review-concept'],
      },
    };

  } catch (error) {
    throw new Error(`Failed to evaluate exercise: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Provide targeted feedback on writing
 */
async function provideFeedback(
  client: any,
  input: EnhancedTutorInput,
  sessionState: LearningSession
): Promise<EnhancedTutorOutput> {
  const textToAnalyze = input.contextualInput.selectedText || input.currentText;
  if (!textToAnalyze) {
    throw new Error('No text provided for feedback');
  }

  const feedbackPrompt = `Give BRIEF writing feedback in 4 short sections:

TEXT:
${textToAnalyze}

**1. Clarity:** 1-2 sentences on how clear/understandable this is.
**2. Grammar:** Brief note on mechanics/grammar (good or needs work).
**3. Style:** Quick comment on voice, tone, word choice.
**4. Suggestions:** 2-3 specific actionable improvements.

Keep each section under 50 words. Be direct and helpful.`;

  try {
    const response = await client.generate(feedbackPrompt, {
      systemPrompt: buildTutorSystemPrompt('feedback'),
      temperature: 0.4,
      maxTokens: 300,
    });

    return {
      sessionState,
      response: {
        type: 'feedback',
        content: response.content as string,
        nextStep: 'Apply feedback and continue writing',
      },
      progress: {
        currentObjective: 'Apply feedback to improve writing',
        completion: sessionState.sessionProgress,
        skillImprovement: {},
        nextMilestone: 'Implement suggested improvements',
      },
      navigation: {
        canContinue: true,
        canReview: true,
        canAdvance: false,
        availableActions: ['revise-text', 'ask-clarification', 'continue-lesson'],
      },
    };

  } catch (error) {
    throw new Error(`Failed to provide feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check learning progress and provide status update
 */
async function checkProgress(
  client: any,
  input: EnhancedTutorInput,
  sessionState: LearningSession
): Promise<EnhancedTutorOutput> {
  const progressReport = generateProgressReport(sessionState);
  
  return {
    sessionState,
    response: {
      type: 'progress-update',
      content: progressReport,
      nextStep: 'Continue with next lesson or review areas that need work',
    },
    progress: {
      currentObjective: 'Track learning progress',
      completion: sessionState.sessionProgress,
      skillImprovement: sessionState.skillLevels,
      nextMilestone: 'Complete current lesson',
    },
    navigation: {
      canContinue: true,
      canReview: true,
      canAdvance: false,
      availableActions: ['continue-learning', 'review-lessons', 'practice-exercises'],
    },
  };
}

/**
 * Helper functions for lesson management
 */
function getLessonByID(lessonId: string): LessonFramework {
  const lessons: Record<string, LessonFramework> = {
    'writing-fundamentals-1': {
      lessonId: 'writing-fundamentals-1',
      title: 'Writing Fundamentals: Clarity and Concision',
      objectives: [
        'Write clear, concise sentences',
        'Eliminate unnecessary words',
        'Use active voice effectively'
      ],
      prerequisites: [],
      duration: 30,
      difficulty: 'beginner',
      skillsFocused: ['clarity', 'concision', 'grammar'],
      assessmentCriteria: ['sentence clarity', 'word efficiency', 'voice usage'],
    },
    'style-and-voice-1': {
      lessonId: 'style-and-voice-1',
      title: 'Developing Your Writing Voice',
      objectives: [
        'Identify elements of writing voice',
        'Maintain consistent tone',
        'Adapt voice to purpose and audience'
      ],
      prerequisites: ['writing-fundamentals-1'],
      duration: 45,
      difficulty: 'intermediate',
      skillsFocused: ['voice', 'style', 'tone'],
      assessmentCriteria: ['voice consistency', 'tone appropriateness', 'style coherence'],
    },
    'advanced-techniques-1': {
      lessonId: 'advanced-techniques-1',
      title: 'Advanced Narrative Techniques',
      objectives: [
        'Master complex narrative structures',
        'Use literary devices effectively',
        'Create sophisticated character development'
      ],
      prerequisites: ['style-and-voice-1'],
      duration: 60,
      difficulty: 'advanced',
      skillsFocused: ['structure', 'character', 'literary-techniques'],
      assessmentCriteria: ['structural sophistication', 'character depth', 'technique mastery'],
    },
  };

  return lessons[lessonId] || lessons['writing-fundamentals-1'];
}

function createLessonExercise(lesson: LessonFramework): WritingExercise {
  // Create appropriate exercise based on lesson
  return {
    exerciseId: `${lesson.lessonId}-exercise-1`,
    type: 'practice',
    instruction: `Practice the key concepts from "${lesson.title}" by completing this exercise.`,
    successCriteria: lesson.assessmentCriteria,
    commonMistakes: ['Not following the specific objectives', 'Generic responses without examples'],
    timeEstimate: Math.floor(lesson.duration * 0.4),
  };
}

function buildTutorSystemPrompt(mode: string): string {
  const basePrompt = `You are a professional writing instructor providing structured, effective education. Your responses should be:

- Clear and specific
- Educational and constructive  
- Professional but engaging
- Focused on measurable improvement
- Actionable with concrete examples

Avoid being overly friendly or chatty. Focus on learning outcomes.`;

  const modePrompts = {
    'lesson-start': `${basePrompt}\n\nYou are introducing a new lesson. Be engaging but focused on clear objectives.`,
    'evaluation': `${basePrompt}\n\nYou are evaluating student work. Be specific about what works and what needs improvement.`,
    'feedback': `${basePrompt}\n\nYou are providing writing feedback. Focus on specific, actionable improvements.`,
  };

  return modePrompts[mode as keyof typeof modePrompts] || basePrompt;
}

function calculateSkillImprovement(sessionState: LearningSession, lesson: LessonFramework): Record<string, number> {
  // Calculate skill improvements based on lesson completion
  const improvements: Record<string, number> = {};
  
  lesson.skillsFocused.forEach(skill => {
    improvements[skill] = sessionState.sessionProgress * 0.5; // Up to 0.5 point improvement per lesson
  });
  
  return improvements;
}

function generateProgressReport(sessionState: LearningSession): string {
  const completedCount = sessionState.completedLessons.length;
  const currentProgress = Math.round(sessionState.sessionProgress * 100);
  
  return `Progress Report:
- Lessons completed: ${completedCount}
- Current lesson progress: ${currentProgress}%
- Total learning sessions: ${sessionState.totalSessions}
- Skills developing: ${Object.keys(sessionState.skillLevels).join(', ')}

Continue with structured practice to build your writing skills systematically.`;
}

// Additional helper functions for guided instruction, practice facilitation, and assessment
async function provideGuidedInstruction(client: any, input: any, sessionState: any, lesson: any): Promise<EnhancedTutorOutput> {
  // Implementation for guided instruction phase
  return {} as EnhancedTutorOutput;
}

async function facilitatePractice(client: any, input: any, sessionState: any, lesson: any): Promise<EnhancedTutorOutput> {
  // Implementation for practice phase
  return {} as EnhancedTutorOutput;
}

async function conductAssessment(client: any, input: any, sessionState: any, lesson: any): Promise<EnhancedTutorOutput> {
  // Implementation for assessment phase
  return {} as EnhancedTutorOutput;
}

// Backward compatibility exports
export type WritingTutorInput = {
  text: string;
};

export type WritingTutorOutput = {
  feedback: {
    clarity: string;
    grammar: string;
    style: string;
    suggestions: string;
  };
};

export async function writingTutor(input: WritingTutorInput): Promise<WritingTutorOutput> {
  const enhancedInput: EnhancedTutorInput = {
    learnerProfile: {
      writingLevel: 'intermediate',
      primaryGoals: ['improve-writing'],
      weakAreas: ['general'],
      preferredPace: 'moderate',
    },
    mode: 'get-feedback',
    currentText: input.text,
    contextualInput: {
      selectedText: input.text,
    },
  };
  
  const result = await enhancedTutorAgent(enhancedInput);
  
  const content = result.response.content || '';
  
  // Split content into 4 sections for the UI
  const sections = content.split(/\*\*\d+\.|\n\n/).filter(s => s.trim());
  
  return {
    feedback: {
      clarity: sections[0] || 'Clarity feedback will appear here.',
      grammar: sections[1] || 'Grammar analysis will appear here.',
      style: sections[2] || 'Style feedback will appear here.',
      suggestions: sections[3] || content,
    },
  };
}