
/**
 * @fileOverview A Socratic learning flow for a creative writing course.
 *
 * - socraticTutor - A function that facilitates a Socratic dialogue with the user.
 * - SocraticTutorInput - The input type for the socraticTutor function.
 * - SocraticTutorOutput - The return type for the socraticTutor function.
 */

import { z } from 'zod';
import { createAIClient } from '@/lib/ai-client';

const MessageSchema = z.object({
  sender: z.enum(['user', 'ai']),
  text: z.string(),
});

const SocraticTutorInputSchema = z.object({
  lessonId: z.string().describe('The topic and description of the current lesson (e.g., "The Writing Process: Introduction to Process Writing").'),
  messageHistory: z.array(MessageSchema).describe("The complete history of the conversation so far, including the user's most recent message.")
});
export type SocraticTutorInput = z.infer<typeof SocraticTutorInputSchema>;

const SocraticTutorOutputSchema = z.object({
  response: z.string().describe("The AI tutor's Socratic, engaging, and empathetic response."),
});
export type SocraticTutorOutput = z.infer<typeof SocraticTutorOutputSchema>;

export async function socraticTutor(input: SocraticTutorInput): Promise<SocraticTutorOutput> {
  const client = createAIClient();
  
  const systemPrompt = `You are an educational lesson generator for creative writing courses. Your role is to create structured, collegiate-level lesson content with clear learning objectives and measurable outcomes.

EDUCATIONAL APPROACH:
- Create formal lesson plans with clear structure and progression
- Present learning objectives at the beginning of each section
- Provide concrete examples and exercises for each concept
- Use academic language appropriate for college-level instruction
- Focus on skill development through systematic practice
- Include assessment criteria and success metrics

LESSON STRUCTURE REQUIREMENTS:
- Learning Objective: What the student will be able to do
- Key Concepts: 3-4 main points to cover
- Examples: Concrete illustrations of each concept
- Practice Activity: Hands-on application exercise
- Assessment: How progress will be measured
- Next Steps: Clear path to the next learning milestone

CONTENT DELIVERY:
- Present information clearly and systematically
- Use bullet points and numbered lists for clarity
- Provide specific, actionable instructions
- Include rubrics or criteria for evaluation
- Reference established writing pedagogy and theory
- Maintain professional, instructional tone throughout

AVOID:
- Casual conversation or chat-like responses
- Personal opinions or subjective commentary
- Overly familiar language or nicknames
- Meandering discussions without clear direction
- Questions without specific learning purpose

Your goal is to deliver structured educational content that advances the student's writing skills through systematic instruction and practice.`;

  const conversationText = input.messageHistory
    .map(msg => `${msg.sender}: ${msg.text}`)
    .join('\n');

  // Extract key context from conversation
  const userMessages = input.messageHistory.filter(msg => msg.sender === 'user');
  const latestUserMessage = userMessages[userMessages.length - 1];
  const conversationLength = input.messageHistory.length;
  
  const prompt = `LESSON TOPIC: ${input.lessonId}

STUDENT PROGRESS ANALYSIS:
- Current session: Message #${conversationLength}
- Student's current input: "${latestUserMessage?.text || 'Starting lesson'}"
- Learning stage: ${conversationLength <= 2 ? 'Introduction/Objective Setting' : conversationLength <= 6 ? 'Concept Instruction' : conversationLength <= 10 ? 'Practice Application' : 'Assessment/Review'}

CONVERSATION HISTORY:
${conversationText}

INSTRUCTION:
Generate the next section of a structured lesson plan following proper instructional design principles:

**CRITICAL REQUIREMENT**: Always teach concepts BEFORE asking students to apply them. Never ask students to identify, analyze, or evaluate something they haven't been taught yet.

**PROPER SEQUENCE**:
- Introduction/Objectives: Set clear learning goals
- Concept Instruction: Teach foundational knowledge first
- Guided Examples: Show concrete illustrations
- Practice Application: Students apply what they've learned
- Assessment: Test understanding of taught concepts

Provide:

1. **SECTION HEADER**: Clear title for this part of the lesson
2. **LEARNING OBJECTIVE**: What the student will accomplish in this section  
3. **INSTRUCTIONAL CONTENT**: Teach the concepts/knowledge needed
4. **EXAMPLES**: Concrete illustrations of the concepts
5. **STUDENT ACTIVITY**: Practice applying the taught concepts
6. **SUCCESS CRITERIA**: How to measure completion

If this is early in the lesson, focus on teaching foundational concepts. Only introduce application exercises after concepts have been thoroughly explained with examples.`;

  const response = await client.generate(prompt, {
    systemPrompt,
    temperature: 0.3, // More structured and consistent
    maxTokens: 500 // More comprehensive lesson content
  });

  return {
    response: response.content as string
  };
}
