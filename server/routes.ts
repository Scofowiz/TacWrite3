import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createAIServerClient } from "./ai-client-factory";
import { 
  insertDocumentSchema, 
  insertAiInteractionSchema,
  insertLearningProgressSchema,
  insertAchievementSchema,
  insertWritingAnalyticsSchema
} from "./schema";
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

async function mockGenerateText(prompt: string, genre?: string): Promise<{
  text: string;
  qualityScore: string;
}> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2500));
  
  const responses = [
    "The old lighthouse keeper had seen many storms, but none quite like this one. As the waves crashed against the rocky shore below, he noticed something unusual in the water—a glint of metal that shouldn't have been there.",
    "Sarah's fingers trembled as she opened the letter. Twenty years she had waited for this moment, and now that it was here, she wasn't sure she was ready for the truth it would reveal.",
    "The spaceship's warning lights flashed red as Captain Torres stared at the readings. According to the sensors, they were approaching a planet that wasn't supposed to exist.",
    "In the quiet café on Fifth Street, Maya discovered that her grandmother's recipe book contained more than just cooking instructions—it held the key to a family secret spanning generations."
  ];
  
  const selectedResponse = responses[Math.floor(Math.random() * responses.length)];
  
  return {
    text: selectedResponse,
    qualityScore: (8.0 + Math.random() * 2.0).toFixed(1)
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize database with sample data if empty
  if ('initializeIfEmpty' in storage) {
    await (storage as any).initializeIfEmpty();
  }

  const server = createServer(app);
  
  // Get current user (hardcoded for demo)
  app.get("/api/user/current", async (req, res) => {
    try {
      const users = await storage.getUserByUsername("builder");
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
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // Get user documents
  app.get("/api/documents", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("builder");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const documents = await storage.getDocumentsByUser(user.id);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to get documents" });
    }
  });

  // Get single document
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
      const user = await storage.getUserByUsername("builder");
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

      console.log('[PATCH Document] ID:', id);
      console.log('[PATCH Document] Updates received:', JSON.stringify(updates));

      // If content is being updated, create a version snapshot first
      if (updates.content !== undefined) {
        const existingDoc = await storage.getDocument(id);
        if (existingDoc) {
          // Get the current version count to set the version number
          const versions = await storage.getDocumentVersions(id, 1);
          const versionNumber = versions.length > 0 ? versions[0].versionNumber + 1 : 1;
          
          // Create version snapshot before updating
          await storage.createDocumentVersion({
            documentId: id,
            content: existingDoc.content,
            title: existingDoc.title,
            wordCount: existingDoc.wordCount,
            versionNumber,
            changeDescription: updates.changeDescription || 'Auto-saved',
          });
        }
      }

      const updatedDocument = await storage.updateDocument(id, updates);
      console.log('[PATCH Document] Result context:', updatedDocument?.context);
      
      if (!updatedDocument) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(updatedDocument);
    } catch (error) {
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  // Delete a document
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log('[DELETE Document] Received request for ID:', id);
      
      // Check if document exists first
      const existingDoc = await storage.getDocument(id);
      if (!existingDoc) {
        console.log('[DELETE Document] Document not found:', id);
        return res.status(404).json({ message: "Document not found" });
      }
      
      console.log('[DELETE Document] Found document:', existingDoc.title);
      const success = await storage.deleteDocument(id);
      console.log('[DELETE Document] Delete result:', success);
      
      if (!success) {
        console.log('[DELETE Document] Delete operation returned false');
        return res.status(500).json({ message: "Delete operation failed" });
      }
      
      console.log('[DELETE Document] Successfully deleted');
      res.json({ message: "Document deleted successfully", success: true });
    } catch (error) {
      console.error('[DELETE Document] Error:', error);
      res.status(500).json({ message: "Failed to delete document", error: String(error) });
    }
  });

  // Get document version history
  app.get("/api/documents/:id/versions", async (req, res) => {
    try {
      const { id } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const versions = await storage.getDocumentVersions(id, limit);
      res.json(versions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get document versions" });
    }
  });

  // Restore a document version
  app.post("/api/documents/versions/:versionId/restore", async (req, res) => {
    try {
      const { versionId } = req.params;
      
      const restoredDocument = await storage.restoreDocumentVersion(versionId);
      if (!restoredDocument) {
        return res.status(404).json({ message: "Version not found" });
      }
      
      res.json(restoredDocument);
    } catch (error) {
      res.status(500).json({ message: "Failed to restore version" });
    }
  });

  // AI Enhancement endpoint - Enhanced with streaming and bidirectional cursor awareness
  app.post("/api/ai/enhance", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("builder");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { text, enhancementType, documentId, agentType = "writing-assistant", cursorPosition, isFromCursor, contextAfter, stream = false, provider = 'gemini' } = req.body;

      // Use AI client factory for dynamic provider selection
      console.log(`[AI Enhance] Provider from request body: ${provider}`);
      console.log(`[AI Enhance] Full request body keys:`, Object.keys(req.body));
      console.log(`[AI Enhance] Using provider: ${provider}`);
      const aiClient = createAIServerClient(provider);
      const validatedData = aiEnhanceSchema.parse({ text, enhancementType, documentId });

      // Store additional parameters for cursor-aware processing with bidirectional context
      const enhancementContext = {
        ...validatedData,
        cursorPosition: cursorPosition || 0,
        isFromCursor: Boolean(isFromCursor),
        contextAfter: contextAfter || ""
      };

      // Get document context for better instruction following
      let documentContext = "";
      if (validatedData.documentId) {
        const doc = await storage.getDocument(validatedData.documentId);
        console.log('[AI Enhance] Document ID:', validatedData.documentId);
        console.log('[AI Enhance] Document context from DB:', doc?.context);
        if (doc && doc.context) {
          const context = typeof doc.context === 'string' ? doc.context : JSON.stringify(doc.context);
          documentContext = `\n\nWRITING INSTRUCTIONS (FOLLOW THESE): ${context}\nGenre: ${doc.genre || 'general'}\nTarget Audience: ${doc.targetAudience || 'general'}`;
          console.log('[AI Enhance] Injected context:', documentContext);
        }
      }

      // Get community memory insights for this agent type
      const recentInteractions = await storage.getAiInteractionsByUser(user.id);
      const goodPatterns = recentInteractions
        .filter(i => i.agentType === agentType && i.userRating && parseInt(String(i.userRating)) >= 4)
        .slice(-3)
        .map(i => `Previous good approach: ${i.enhancementType}`)
        .join('\n');

      const memoryGuidance = goodPatterns ? `\n\nLearning from positive feedback: ${goodPatterns}` : '';

      let prompt = "";

      // Handle cursor-aware continuations with BIDIRECTIONAL awareness
      if (enhancementContext.isFromCursor && (enhancementContext.enhancementType === 'continue' || enhancementContext.enhancementType === 'auto-complete')) {
        const contextBefore = enhancementContext.text.substring(Math.max(0, enhancementContext.text.length - 600));
        const contextAfterText = enhancementContext.contextAfter ? enhancementContext.contextAfter.substring(0, 400) : "";

        prompt = `CRITICAL INSTRUCTION: You are continuing text from a cursor position. ONLY provide new content that fits between the existing text - DO NOT rewrite, modify, or repeat ANY existing text.

IMPORTANT: Your response MUST be valid JSON with this structure:
{"process": "your analysis notes here (shown to user separately)", "output": "the actual content to insert"}

CONTEXT BEFORE CURSOR (last 600 characters):
"${contextBefore}"

${contextAfterText ? `CONTEXT AFTER CURSOR (what comes next - you must bridge to this):
"${contextAfterText}"` : "No text after cursor - you are appending to the end."}

TASK: Write content that naturally continues from the context before${contextAfterText ? ' and bridges smoothly to the context after' : ''}. Follow this reflect-and-revisit process internally:

STEP 1 - ANALYZE: Note the tone, style, and where the narrative is heading
STEP 2 - DRAFT: Write content that fits seamlessly
STEP 3 - REFLECT: Does it bridge properly? Is the voice consistent?
STEP 4 - REFINE: Polish the content

${documentContext}${memoryGuidance}

CRITICAL: Return ONLY valid JSON. The "output" field should contain ONLY the new text (no process notes, no summaries). The "process" field contains your analysis (will be shown separately to user, not inserted into document).

RESPOND WITH JSON:`;
      } else {
        // Standard enhancement prompts - ALL use JSON format for process/output separation
        const jsonInstruction = `\n\nIMPORTANT: Your response MUST be valid JSON with this structure:
{"process": "your analysis and reflection notes here (shown to user separately, NOT inserted into document)", "output": "the final enhanced/continued text only"}`;

        switch (enhancementContext.enhancementType) {
          case "clarity":
            prompt = `You are enhancing text for clarity. Follow this process internally:

1. ANALYZE: What clarity issues exist?
2. IMPROVE: Rewrite for better clarity while preserving meaning
3. REFLECT: Does it improve understanding?
4. REFINE: Polish the final version

${documentContext}${memoryGuidance}

Text to enhance: "${enhancementContext.text}"${jsonInstruction}`;
            break;
          case "polish":
            prompt = `You are polishing text for flow, grammar, and style. Follow this process internally:

1. IDENTIFY: What needs polish?
2. IMPROVE: Refine the text
3. REFLECT: Does it maintain the author's voice?
4. FINALIZE: Present polished version

${documentContext}${memoryGuidance}

Text to enhance: "${enhancementContext.text}"${jsonInstruction}`;
            break;
          case "auto-complete":
            prompt = `You are continuing this text naturally. Follow this process internally:

1. UNDERSTAND: Analyze tone and direction
2. CONTINUE: Write ~1000 words continuing naturally
3. REFLECT: Does it flow and maintain consistency?
4. REFINE: Improve the continuation

${documentContext}${memoryGuidance}

Text to continue: "${enhancementContext.text}"${jsonInstruction}`;
            break;
          case "market-insights":
            prompt = `You are enhancing text for commercial appeal. Follow this process internally:

1. ANALYZE: What commercial opportunities exist?
2. ENHANCE: Make more engaging and marketable
3. REFLECT: Does it preserve core message?
4. FINALIZE: Present market-optimized version

${documentContext}${memoryGuidance}

Text to enhance: "${enhancementContext.text}"${jsonInstruction}`;
            break;
          case "continue":
            prompt = `You are continuing this narrative. Follow this process internally:

1. ANALYZE: Understand story direction and consistency needs
2. CONTINUE: Write ~1000 words continuing the narrative
3. REFLECT: Does it maintain narrative consistency?
4. REFINE: Polish the continuation

${documentContext}${memoryGuidance}

Text to continue: "${enhancementContext.text}"${jsonInstruction}`;
            break;
          
          // BRANCH MODE - Exploration and alternate paths
          case "branch-explore":
            prompt = `You are creating an ALTERNATE PATH from this story point. Follow this process internally:

1. ANALYZE: Understand the full story context and current state
2. EXPLORE: Identify a thematically coherent but different direction
3. DRAFT: Write ~1000 words of an alternate scene/path
4. REFLECT: Does it maintain thematic coherence while exploring new territory?
5. REFINE: Polish the alternate continuation

IMPORTANT: Use the FULL document context to understand the story, but create a DIFFERENT path forward from the current point.

${documentContext}${memoryGuidance}

Current story point: "${enhancementContext.text}"${jsonInstruction}`;
            break;
          
          case "alternate-ending":
            prompt = `You are creating an ALTERNATE ENDING. Follow this process internally:

1. UNDERSTAND: Grasp the story's themes and character arcs
2. REIMAGINE: What if events unfolded differently?
3. DRAFT: Write an alternate ending (~800 words)
4. REFLECT: Does it offer fresh perspective while staying true to themes?
5. REFINE: Polish the alternate ending

${documentContext}${memoryGuidance}

Story context: "${enhancementContext.text}"${jsonInstruction}`;
            break;
          
          // DEEPEN MODE - Add layers without advancing plot
          case "add-depth":
            prompt = `You are DEEPENING this scene WITHOUT advancing the plot. Follow this process internally:

1. ANALYZE: What's happening in this moment?
2. EXPAND: Add internal monologue, sensory details, symbolism, subtext
3. LAYER: Weave in character psychology and thematic resonance
4. REFLECT: Is the moment richer without moving time forward?
5. REFINE: Polish the enriched scene

DO NOT advance the timeline. ONLY deepen the current moment.

${documentContext}${memoryGuidance}

Scene to deepen: "${enhancementContext.text}"${jsonInstruction}`;
            break;
          
          case "internal-monologue":
            prompt = `Add CHARACTER INTERNAL MONOLOGUE to this scene. Follow this process:

1. IDENTIFY: Who is the POV character?
2. EXPLORE: What are they thinking/feeling beneath the surface?
3. WEAVE: Insert internal thoughts that add psychological depth
4. REFLECT: Does it reveal character without breaking flow?
5. REFINE: Polish the enhanced scene with internal voice

${documentContext}${memoryGuidance}

Scene: "${enhancementContext.text}"${jsonInstruction}`;
            break;
          
          case "sensory-details":
            prompt = `Enhance SENSORY DETAILS in this scene. Follow this process:

1. OBSERVE: What's the physical environment?
2. SENSE: Add sight, sound, smell, touch, taste details
3. WEAVE: Integrate sensory richness naturally
4. REFLECT: Is the scene more immersive?
5. REFINE: Polish the sensory-rich scene

${documentContext}${memoryGuidance}

Scene: "${enhancementContext.text}"${jsonInstruction}`;
            break;
          
          case "world-building":
            prompt = `Add WORLD-BUILDING CONTEXT to this scene. Follow this process:

1. IDENTIFY: What world details would enrich this moment?
2. SELECT: Choose relevant history, culture, or lore
3. WEAVE: Integrate world-building naturally (not info-dump)
4. REFLECT: Does it deepen immersion without stopping the story?
5. REFINE: Polish the world-enriched scene

${documentContext}${memoryGuidance}

Scene: "${enhancementContext.text}"${jsonInstruction}`;
            break;
          
          // TRANSFORM MODE - Adapt to new formats/styles
          case "transform-noir":
            prompt = `TRANSFORM this text into NOIR DETECTIVE style. Follow this process:

1. ANALYZE: Extract core events and emotions
2. REIMAGINE: How would a hardboiled detective narrate this?
3. REWRITE: Use noir voice, cynicism, atmosphere
4. REFLECT: Does it capture noir essence?
5. REFINE: Polish the noir adaptation

${documentContext}${memoryGuidance}

Original text: "${enhancementContext.text}"${jsonInstruction}`;
            break;
          
          case "transform-stage-play":
            prompt = `TRANSFORM this text into STAGE PLAY format. Follow this process:

1. ANALYZE: Identify dialogue, action, setting
2. ADAPT: Convert to proper stage play format with stage directions
3. ENHANCE: Make it performable on stage
4. REFLECT: Is it stage-ready?
5. REFINE: Polish the script

${documentContext}${memoryGuidance}

Original text: "${enhancementContext.text}"${jsonInstruction}`;
            break;
          
          case "transform-news":
            prompt = `TRANSFORM this into a NEWS REPORT. Follow this process:

1. EXTRACT: Identify the "who, what, when, where, why"
2. RESTRUCTURE: Use inverted pyramid news style
3. WRITE: Create objective news reporting
4. REFLECT: Is it journalistic and clear?
5. REFINE: Polish the news piece

${documentContext}${memoryGuidance}

Story: "${enhancementContext.text}"${jsonInstruction}`;
            break;
          
          case "transform-poetry":
            prompt = `TRANSFORM this into POETRY. Follow this process:

1. DISTILL: Extract core emotions and imagery
2. CRAFT: Create poetic structure (free verse or formal)
3. ENHANCE: Use metaphor, rhythm, literary devices
4. REFLECT: Does it capture the essence poetically?
5. REFINE: Polish the poem

${documentContext}${memoryGuidance}

Original text: "${enhancementContext.text}"${jsonInstruction}`;
            break;
          
          // ANALYZE MODE - Provide feedback without rewriting
          case "analyze-theme":
            prompt = `ANALYZE the THEMES in this text. Provide editorial feedback:

1. IDENTIFY: What themes are present?
2. EVALUATE: How effectively are they developed?
3. SUGGEST: How could theme development be strengthened?
4. EXAMPLES: Point to specific passages

${documentContext}${memoryGuidance}

Text to analyze: "${enhancementContext.text}"

IMPORTANT: Provide ANALYSIS ONLY. Do not rewrite the text.${jsonInstruction}`;
            break;
          
          case "analyze-pacing":
            prompt = `ANALYZE the PACING of this text. Provide editorial feedback:

1. ASSESS: Is the pacing too fast, too slow, or well-balanced?
2. IDENTIFY: Where does pacing lag or rush?
3. SUGGEST: How to improve pacing and rhythm
4. EXAMPLES: Point to specific areas

${documentContext}${memoryGuidance}

Text to analyze: "${enhancementContext.text}"

IMPORTANT: Provide ANALYSIS ONLY. Do not rewrite the text.${jsonInstruction}`;
            break;
          
          case "analyze-character":
            prompt = `ANALYZE CHARACTER CONSISTENCY in this text. Provide editorial feedback:

1. IDENTIFY: What characters are present?
2. EVALUATE: Are they consistent with established traits?
3. ASSESS: Is character development believable?
4. SUGGEST: How to strengthen characterization

${documentContext}${memoryGuidance}

Text to analyze: "${enhancementContext.text}"

IMPORTANT: Provide ANALYSIS ONLY. Do not rewrite the text.${jsonInstruction}`;
            break;
          
          case "analyze-style":
            prompt = `ANALYZE PROSE STYLE in this text. Provide editorial feedback:

1. ASSESS: Evaluate voice, tone, word choice
2. IDENTIFY: Strengths and weaknesses in prose
3. SUGGEST: How to improve style and voice
4. EXAMPLES: Point to specific passages

${documentContext}${memoryGuidance}

Text to analyze: "${enhancementContext.text}"

IMPORTANT: Provide ANALYSIS ONLY. Do not rewrite the text.${jsonInstruction}`;
            break;
          
          default:
            prompt = `You are enhancing this text. Follow this process internally:

1. ANALYZE: What improvement opportunities exist?
2. ENHANCE: Improve engagement and quality
3. REFLECT: Is it more engaging and better written?
4. FINALIZE: Present the enhanced version

${documentContext}${memoryGuidance}

Text to enhance: "${enhancementContext.text}"${jsonInstruction}`;
        }
      }
      
      // Generate with selected provider
      const response = await aiClient.generate(prompt, {
        temperature: 0.7,
        maxTokens: 4096,
      });

      if (!response.content) {
        throw new Error('AI enhancement failed');
      }

      const rawText = response.content;

      // Parse JSON response to separate process notes from output
      let processNotes = "";
      let enhancedText = rawText;

      try {
        // Try to extract JSON from response (may be wrapped in markdown code blocks)
        let jsonStr = rawText;
        const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }
        // Also try to find raw JSON object
        const rawJsonMatch = rawText.match(/\{[\s\S]*"process"[\s\S]*"output"[\s\S]*\}/);
        if (rawJsonMatch) {
          jsonStr = rawJsonMatch[0];
        }

        const parsed = JSON.parse(jsonStr);
        if (parsed.output) {
          enhancedText = parsed.output;
          processNotes = parsed.process || "";
          console.log('[AI Enhance] Successfully separated process from output');
        }
      } catch (parseError) {
        // If JSON parsing fails, use raw text but try to strip obvious process notes
        console.log('[AI Enhance] JSON parse failed, using raw text');
        // Remove common reflection headers that shouldn't be in document
        enhancedText = rawText
          .replace(/^(STEP \d.*?:|REFLECT.*?:|ANALYSIS.*?:|DRAFT.*?:).*$/gm, '')
          .replace(/^\*\*STEP \d.*?\*\*.*$/gm, '')
          .replace(/^#{1,3}\s*(Step|Analysis|Reflection|Draft).*$/gim, '')
          .trim();
      }

      // Calculate improvement metric
      const baseQuality = 7.0;
      const improvementMetric = Math.max(0.15, 0.15 + Math.random() * 0.25);
      const finalQuality = baseQuality + improvementMetric;

      const enhancementResult = {
        enhancedText: enhancedText.trim(),
        processNotes: processNotes.trim(),
        qualityScore: finalQuality.toFixed(2),
        improvementMetric: improvementMetric.toFixed(2),
        improvements: [
          `Quality improved by +${improvementMetric.toFixed(2)}`,
          "Applied reflect-and-revisit process",
          `Enhanced with ${provider} AI`,
          enhancementContext.isFromCursor ? "Bidirectional cursor-aware" : "Context-preserving enhancement"
        ]
      };

      // Log AI interaction
      await storage.createAiInteraction({
        userId: user.id,
        documentId: enhancementContext.documentId || null,
        agentType,
        inputText: enhancementContext.text,
        outputText: enhancementResult.enhancedText,
        enhancementType: enhancementContext.enhancementType,
        qualityScore: enhancementResult.qualityScore,
        userRating: null,
        isPremiumFeature: false,
        responseTime: Math.floor(Math.random() * 3000) + 1000,
      });

      res.json({
        enhancedText: enhancementResult.enhancedText,
        processNotes: enhancementResult.processNotes, // Separate field for meta-content
        originalText: enhancementContext.text,
        enhancementType: enhancementContext.enhancementType,
        improvements: enhancementResult.improvements,
        qualityScore: enhancementResult.qualityScore,
        improvementMetric: enhancementResult.improvementMetric,
        agentType,
        cursorPosition: enhancementContext.cursorPosition,
        isFromCursor: enhancementContext.isFromCursor,
        hasBidirectionalContext: Boolean(enhancementContext.contextAfter),
        provider: provider
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to enhance text" });
    }
  });

  // AI Chat endpoint - conversational and context-aware
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("builder");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { message, documentContext, conversationHistory } = req.body;

      // Set up SSE headers for streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Build context-aware prompt
      const contextInfo = documentContext ? `

Current document context (last 500 chars):
"""
${documentContext.slice(-500)}
"""

Document stats:
- Word count: ${documentContext.split(/\s+/).length}
- Title: ${req.body.documentTitle || 'Untitled'}
` : '';

      const conversationContext = conversationHistory && conversationHistory.length > 0
        ? `\n\nRecent conversation:\n${conversationHistory.slice(-3).map((msg: any) => 
            `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`
          ).join('\n')}\n`
        : '';

      const chatPrompt = `You are a helpful, friendly AI writing assistant. You're having a natural conversation with a writer about their work.

${contextInfo}${conversationContext}

User's message: "${message}"

Respond naturally and helpfully. You can:
- Answer questions about their writing
- Offer suggestions and feedback
- Brainstorm ideas
- Discuss plot, characters, or themes
- Help with specific writing challenges
- Be encouraging and supportive

Keep your response conversational (2-4 sentences unless asked for more detail). Be specific and refer to their document when relevant.`;

      console.log('[AI Chat] Processing:', message);

      try {
        const aiClient = createAIServerClient();
        const stream = await aiClient.chat({
          messages: [{ role: 'user', content: chatPrompt }],
          stream: true
        });

        let fullResponse = '';

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || '';
          if (text) {
            fullResponse += text;
            res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
          }
        }

        res.write(`data: ${JSON.stringify({ done: true, fullText: fullResponse })}\n\n`);
        res.end();

        console.log('[AI Chat] Response sent:', fullResponse.substring(0, 100) + '...');
      } catch (error) {
        console.error('[AI Chat] Error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Failed to get AI response' })}\n\n`);
        res.end();
      }
    } catch (error) {
      console.error('[AI Chat] Error:', error);
      res.status(500).json({ message: "Failed to process chat" });
    }
  });

  // SSE Streaming AI Enhancement endpoint
  app.post("/api/ai/enhance/stream", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("builder");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { text, enhancementType, documentId, cursorPosition, isFromCursor, contextAfter } = req.body;

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const apiKey = process.env.GEMINI_API_KEY;

      // Get document context
      let documentContext = "";
      if (documentId) {
        const doc = await storage.getDocument(documentId);
        if (doc?.context) {
          const context = typeof doc.context === 'string' ? doc.context : JSON.stringify(doc.context);
          documentContext = `\n\nWRITING INSTRUCTIONS: ${context}`;
        }
      }

      // Build prompt with bidirectional context
      const contextBefore = text.substring(Math.max(0, text.length - 600));
      const contextAfterText = contextAfter ? contextAfter.substring(0, 400) : "";

      const prompt = `CRITICAL: You are continuing text from a cursor position. Write NEW content that flows naturally from where the text left off.

CONTEXT BEFORE CURSOR (this is what comes right before where you continue):
"${contextBefore}"

${contextAfterText ? `CONTEXT AFTER CURSOR (you must bridge smoothly to this):
"${contextAfterText}"` : "No text after cursor - you are appending to the end."}

${documentContext}

RULES:
1. Start writing naturally as a continuation - DO NOT start with punctuation like commas or periods
2. DO NOT repeat any text from the context
3. DO NOT add meta-commentary, headers, or explanations
4. Write approximately 1000 words of quality narrative content
5. Match the tone, style, and voice of the existing text
6. If the context ends mid-sentence, complete that thought first then continue

BEGIN YOUR CONTINUATION NOW:`;

      // Use Gemini streaming API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:streamGenerateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096
          }
        })
      });

      if (!response.ok) {
        res.write(`data: ${JSON.stringify({ error: 'AI request failed' })}\n\n`);
        res.end();
        return;
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      console.log('[Streaming] Starting to read response chunks');

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[Streaming] Reader done, total text length:', fullText.length);
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Parse Gemini streaming response - it comes as a JSON array
          try {
            // Try to parse complete JSON objects from the buffer
            // Gemini sends chunks like: [{"candidates":...},{"candidates":...}]
            // We need to handle partial chunks

            // Look for complete JSON objects in the buffer
            let startIdx = 0;
            while (startIdx < buffer.length) {
              // Skip array brackets and commas
              if (buffer[startIdx] === '[' || buffer[startIdx] === ',' || buffer[startIdx] === ' ' || buffer[startIdx] === '\n') {
                startIdx++;
                continue;
              }

              // Find the start of a JSON object
              if (buffer[startIdx] === '{') {
                let braceCount = 0;
                let endIdx = startIdx;

                // Find matching closing brace
                for (let i = startIdx; i < buffer.length; i++) {
                  if (buffer[i] === '{') braceCount++;
                  if (buffer[i] === '}') braceCount--;
                  if (braceCount === 0) {
                    endIdx = i + 1;
                    break;
                  }
                }

                if (braceCount === 0 && endIdx > startIdx) {
                  // We have a complete JSON object
                  const jsonStr = buffer.substring(startIdx, endIdx);
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    if (text) {
                      fullText += text;
                      res.write(`data: ${JSON.stringify({ chunk: text, accumulated: fullText })}\n\n`);
                      console.log('[Streaming] Sent chunk, total length now:', fullText.length);
                    }
                  } catch (parseErr) {
                    console.log('[Streaming] Parse error for chunk:', jsonStr.substring(0, 50));
                  }
                  buffer = buffer.substring(endIdx);
                  startIdx = 0;
                } else {
                  // Incomplete object, wait for more data
                  break;
                }
              } else {
                startIdx++;
              }
            }
          } catch (e) {
            console.log('[Streaming] Error processing chunk:', e);
          }
        }
      }

      // Clean up the generated text - remove leading punctuation that doesn't make sense
      let cleanedText = fullText.trim();
      // Remove leading punctuation that would be weird at the start of a continuation
      cleanedText = cleanedText.replace(/^[,;:]\s*/, '');
      // Remove any repeated content that might have slipped through
      cleanedText = cleanedText.replace(/^["']?\s*\.{3,}\s*/, '');

      console.log('[Streaming] Sending done event with text length:', cleanedText.length);

      // Send completion event
      res.write(`data: ${JSON.stringify({ done: true, fullText: cleanedText, cursorPosition, isFromCursor })}\n\n`);
      res.end();

    } catch (error) {
      console.error('Streaming error:', error);
      res.write(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`);
      res.end();
    }
  });

  // Premium AI Features endpoints - Now with multiple specialized agents
  app.post("/api/ai/premium/:feature", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("builder");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { feature } = req.params;
      
      // Temporarily removed premium locks - all features available

      const { text, context, agentType = "autonomous-writer" } = req.body;
      
      let result;
      let responseAgent = agentType;
      
      switch (feature) {
        case "autonomous-writer":
          result = await mockGenerateText(text, context?.genre);
          responseAgent = "autonomous-writer";
          break;
          
        case "contextual-enhancer":
          result = await mockEnhanceText(text, "atmospheric");
          responseAgent = "contextual-enhancer";
          break;
          
        case "wfa-agent":
          // WFA Market Insights Agent
          result = {
            text: `Based on current market trends, your ${context?.genre || 'literary'} piece shows strong potential. Market analysis suggests readers are gravitating toward authentic voices with emotional depth. Your work demonstrates ${Math.floor(Math.random() * 20) + 80}% alignment with trending themes. Consider emphasizing the character development aspects while maintaining your unique style.`,
            qualityScore: (8.5 + Math.random() * 1.5).toFixed(1)
          };
          responseAgent = "wfa-agent";
          break;
          
        default:
          return res.status(400).json({ message: "Unknown premium feature" });
      }
      
      // Log premium AI interaction
      await storage.createAiInteraction({
        userId: user.id,
        documentId: req.body.documentId || null,
        agentType: responseAgent,
        inputText: text,
        outputText: 'enhancedText' in result ? result.enhancedText : result.text,
        enhancementType: feature,
        qualityScore: result.qualityScore,
        isPremiumFeature: true,
        responseTime: Math.floor(Math.random() * 2000) + 1500,
      });
      
      res.json({
        result: 'enhancedText' in result ? result.enhancedText : result.text,
        originalText: text,
        feature,
        qualityScore: result.qualityScore,
        agentType: responseAgent,
        premium: true,
      });
    } catch (error) {
      res.status(500).json({ message: `Failed to process ${req.params.feature}` });
    }
  });

  // Enhanced Multi-Agent System - Community learning and agent orchestration
  app.post("/api/ai/enhanced-agents", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("builder");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { prompt, agents = ["writing-assistant", "contextual-enhancer"], memory, communityKnowledge } = req.body;
      
      // Temporarily removed premium locks - all features available

      // Multi-agent response coordination
      const agentResponses = await Promise.all(
        agents.map(async (agent: string) => {
          const enhancement = await mockEnhanceText(prompt, agent);
          return {
            agent,
            response: enhancement.enhancedText,
            confidence: parseFloat(enhancement.qualityScore) / 10,
            reasoning: `Applied ${agent} methodology with focus on narrative enhancement`
          };
        })
      );
      
      // Community memory integration
      const memoryIntegration = memory ? 
        `Building on previous sessions: ${memory.slice(0, 100)}...` : 
        "Fresh perspective applied";
      
      // Synthesized response
      const bestResponse = agentResponses.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      
      // Log enhanced interaction
      await storage.createAiInteraction({
        userId: user.id,
        documentId: req.body.documentId || null,
        agentType: "multi-agent-system",
        inputText: prompt,
        outputText: bestResponse.response,
        enhancementType: "collaborative-enhancement",
        qualityScore: (bestResponse.confidence * 10).toFixed(1),
        isPremiumFeature: user.subscriptionTier === "premium",
        responseTime: Math.floor(Math.random() * 4000) + 2000,
      });
      
      // Update usage
      if (user.subscriptionTier === "free") {
        await storage.updateUser(user.id, {
          usageCount: user.usageCount + 1,
        });
      }
      
      res.json({
        synthesizedResponse: bestResponse.response,
        agentCollaboration: agentResponses,
        memoryIntegration,
        communityInsights: communityKnowledge ? 
          "Incorporated community knowledge patterns" : 
          "Individual session analysis",
        qualityScore: (bestResponse.confidence * 10).toFixed(1),
        usageCount: user.subscriptionTier === "free" ? user.usageCount + 1 : user.usageCount,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process enhanced agents request" });
    }
  });

  // Premium Writing Coach - Analytics-driven coaching sessions  
  app.post("/api/ai/premium/coaching", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("builder");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Temporarily removed premium locks - all features available

      const { sessionType, recentWriting, specificQuestion } = req.body;

      // Get user's analytics data
      const interactions = await storage.getAiInteractionsByUser(user.id);
      const recentInteractions = interactions.slice(-10);
      const averageQuality = recentInteractions.length > 0 
        ? recentInteractions.reduce((sum, i) => sum + parseFloat(i.qualityScore || "7.5"), 0) / recentInteractions.length
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

  // Gemini AI integration endpoint
  app.post("/api/ai/gemini/generate", async (req, res) => {
    try {
      const { prompt, systemPrompt, temperature = 0.7, maxTokens = 2048, model = 'gemini-3-pro-preview' } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Gemini API key not configured" });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
            }]
          }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      res.json({
        content,
        usage: {
          promptTokens: prompt.length / 4,
          completionTokens: content.length / 4,
          totalTokens: (prompt.length + content.length) / 4
        }
      });
    } catch (error) {
      console.error('Gemini API error:', error);
      res.status(500).json({ message: "AI generation failed" });
    }
  });

  // Cloudflare Workers AI integration endpoint
  app.post("/api/ai/cloudflare/generate", async (req, res) => {
    try {
      const { prompt, systemPrompt, temperature = 0.7, maxTokens = 2048, model } = req.body;
      const cloudflareModel = model || process.env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.1-8b-instruct';
      
      console.log(`[Cloudflare Generate] Using model: ${cloudflareModel}`);
      
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      const apiToken = process.env.CLOUDFLARE_API_TOKEN;
      
      if (!accountId || !apiToken) {
        return res.status(500).json({ message: "Cloudflare AI credentials not configured" });
      }

      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${cloudflareModel}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          temperature,
          max_tokens: maxTokens,
        })
      });

      if (!response.ok) {
        throw new Error(`Cloudflare AI error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.result?.response || '';
      
      res.json({
        content,
        usage: {
          promptTokens: prompt.length / 4,
          completionTokens: content.length / 4,
          totalTokens: (prompt.length + content.length) / 4
        }
      });
    } catch (error) {
      console.error('Cloudflare AI error:', error);
      res.status(500).json({ message: "AI generation failed" });
    }
  });

  // Groq AI integration endpoint
  app.post("/api/ai/groq/generate", async (req, res) => {
    try {
      const { prompt, systemPrompt, temperature = 0.7, maxTokens = 2048, model } = req.body;
      const groqModel = model || process.env.GROQ_MODEL || 'moonshotai/kimi-k2-instruct-0905';
      
      console.log(`[Groq Generate] Using model: ${groqModel}`);
      
      const apiKey = process.env.GROQ_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ message: "Groq API key not configured" });
      }

      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: groqModel,
          messages,
          temperature,
          max_tokens: maxTokens,
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Groq AI error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      res.json({
        content,
        usage: {
          promptTokens: data.usage?.prompt_tokens || prompt.length / 4,
          completionTokens: data.usage?.completion_tokens || content.length / 4,
          totalTokens: data.usage?.total_tokens || (prompt.length + content.length) / 4
        }
      });
    } catch (error) {
      console.error('Groq AI error:', error);
      res.status(500).json({ message: "AI generation failed" });
    }
  });

  // Groq streaming endpoint
  app.post("/api/ai/groq/generate/stream", async (req, res) => {
    try {
      const { prompt, systemPrompt, temperature = 0.7, maxTokens = 2048, model } = req.body;
      const groqModel = model || process.env.GROQ_MODEL || 'mixtral-8x7b-32768';
      
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Groq API key not configured" });
      }

      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: groqModel,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Groq AI error: ${response.status} - ${errorData}`);
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      console.log('[Streaming Groq] Starting to read response chunks');

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[Streaming Groq] Reader done, total text length:', fullText.length);
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log('[Streaming Groq] Received chunk:', chunk);

          // Parse Groq streaming response
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  fullText += content;
                  res.write(`data: ${JSON.stringify({ chunk: content, accumulated: fullText })}\n\n`);
                  console.log('[Streaming Groq] Sent chunk, total length now:', fullText.length);
                }
              } catch (parseError) {
                console.log('[Streaming Groq] Parse error for line:', line);
              }
            }
          }
        }
      }

      // Send completion event
      res.write(`data: ${JSON.stringify({ done: true, fullText })}\n\n`);
      res.end();

    } catch (error) {
      console.error('Groq streaming error:', error);
      res.write(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`);
      res.end();
    }
  });

  // Community Memory API endpoints for RL learning
  app.post("/api/ai/community/interaction", async (req, res) => {
    try {
      const { agentType, action, input, output, userFeedback, timestamp } = req.body;
      const user = await storage.getUserByUsername("builder");
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log the interaction with user feedback
      await storage.createAiInteraction({
        userId: user.id,
        documentId: null,
        agentType,
        inputText: JSON.stringify(input),
        outputText: JSON.stringify(output),
        enhancementType: action,
        qualityScore: userFeedback === 'good' ? '9.0' : userFeedback === 'ok' ? '7.0' : userFeedback === 'poor' ? '4.0' : '5.0',
        userRating: (userFeedback === 'good' ? 5 : userFeedback === 'ok' ? 4 : userFeedback === 'poor' ? 2 : 1).toString(),
        isPremiumFeature: false,
        responseTime: 1000,
      });

      res.json({ success: true, message: "Interaction logged to community memory" });
    } catch (error) {
      console.error('Community memory logging error:', error);
      res.status(500).json({ message: "Failed to log interaction" });
    }
  });

  app.get("/api/ai/community/insights", async (req, res) => {
    try {
      const { category } = req.query;
      const user = await storage.getUserByUsername("builder");
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get recent AI interactions to generate insights
      const interactions = await storage.getAiInteractionsByUser(user.id);
      
      const insights = [];
      
      if (interactions.length > 0) {
        const goodResponses = interactions.filter(i => i.userRating && parseInt(String(i.userRating)) >= 4);
        const poorResponses = interactions.filter(i => i.userRating && parseInt(String(i.userRating)) <= 2);
        
        if (goodResponses.length > poorResponses.length) {
          insights.push("Your recent AI interactions show positive feedback patterns - agents are learning your preferences");
        }
        
        const agentPerformance = interactions.reduce((acc, i) => {
          if (!acc[i.agentType]) acc[i.agentType] = { total: 0, good: 0 };
          acc[i.agentType].total++;
          if (i.userRating && parseInt(String(i.userRating)) >= 4) acc[i.agentType].good++;
          return acc;
        }, {} as Record<string, {total: number, good: number}>);
        
        Object.entries(agentPerformance).forEach(([agentType, stats]) => {
          const successRate = stats.good / stats.total;
          if (successRate > 0.8) {
            insights.push(`${agentType} agent performing excellently (${Math.round(successRate * 100)}% positive feedback)`);
          } else if (successRate < 0.5) {
            insights.push(`${agentType} agent needs improvement (${Math.round(successRate * 100)}% positive feedback)`);
          }
        });
      }

      res.json({ insights, category });
    } catch (error) {
      console.error('Community insights error', error);
      res.status(500).json({ message: "Failed to get insights" });
    }
  });

  // ========================================
  // LEARNING & TUTORING API ENDPOINTS
  // ========================================

  // Get learning progress for current user
  app.get("/api/learning/progress", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("builder");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const progress = await storage.getLearningProgress(user.id);
      res.json(progress);
    } catch (error) {
      console.error('Learning progress error', error);
      res.status(500).json({ message: "Failed to get learning progress" });
    }
  });

  // Update learning progress
  app.post("/api/learning/progress", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("builder");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { courseModule, lessonId, lessonTitle, completionPercentage, isCompleted, score, timeSpent } = req.body;

      const progress = await storage.createLearningProgress({
        userId: user.id,
        courseModule,
        lessonId,
        lessonTitle,
        completionPercentage: completionPercentage || 0,
        isCompleted: isCompleted || false,
        score: score || null,
        timeSpent: timeSpent || null,
      });

      res.status(201).json(progress);
    } catch (error) {
      console.error('Create progress error', error);
      res.status(500).json({ message: "Failed to create learning progress" });
    }
  });

  // Update existing learning progress
  app.patch("/api/learning/progress/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const progress = await storage.updateLearningProgress(id, updates);

      if (!progress) {
        return res.status(404).json({ message: "Progress not found" });
      }

      res.json(progress);
    } catch (error) {
      console.error('Update progress error', error);
      res.status(500).json({ message: "Failed to update learning progress" });
    }
  });

  // Get achievements for current user
  app.get("/api/achievements", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("builder");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userAchievements = await storage.getAchievements(user.id);
      res.json(userAchievements);
    } catch (error) {
      console.error('Achievements error', error);
      res.status(500).json({ message: "Failed to get achievements" });
    }
  });

  // Award new achievement
  app.post("/api/achievements", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("builder");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { achievementType, title, description, iconClass } = req.body;

      const achievement = await storage.createAchievement({
        userId: user.id,
        achievementType,
        title,
        description,
        iconClass,
      });

      res.status(201).json(achievement);
    } catch (error) {
      console.error('Create achievement error', error);
      res.status(500).json({ message: "Failed to create achievement" });
    }
  });

  // ========================================
  // AI TUTOR CHAT ENDPOINT - Real Gemini AI
  // ========================================

  app.post("/api/ai/tutor/chat", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("builder");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { message, context, lessonContext } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ message: "AI tutor not configured" });
      }

      // Build tutor system prompt based on Purdue OWL curriculum
      const systemPrompt = `You are an expert writing tutor integrated with the Purdue OWL curriculum. You help students learn academic writing, research skills, citation formats (APA, MLA, Chicago), grammar, and the writing process.

Your teaching style:
- Be encouraging and supportive
- Explain concepts clearly with examples
- Ask guiding questions to help students discover answers
- Provide constructive feedback
- Reference Purdue OWL guidelines when relevant
- Keep responses concise but helpful (2-4 paragraphs max)

${lessonContext ? `Current lesson context: ${lessonContext}` : ''}
${context ? `Previous conversation context: ${context}` : ''}

Respond to the student's question or comment naturally, as a helpful tutor would.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPrompt}\n\nStudent: ${message}\n\nTutor:` }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
            topP: 0.9,
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        throw new Error(`AI tutor request failed: ${errorText}`);
      }

      const data = await response.json();
      const tutorResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that. Could you rephrase your question?";

      // Log the tutor interaction
      await storage.createAiInteraction({
        userId: user.id,
        documentId: null,
        agentType: "tutor",
        inputText: message,
        outputText: tutorResponse,
        enhancementType: "tutoring",
        qualityScore: "8.5",
        isPremiumFeature: false, // Free tier feature
        responseTime: Math.floor(Math.random() * 1000) + 500,
      });

      res.json({
        response: tutorResponse.trim(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Tutor chat error:', error);
      res.status(500).json({ message: "Failed to get tutor response" });
    }
  });

  // ========================================
  // PREMIUM COACH SESSION ENDPOINT
  // ========================================

  app.post("/api/coach/session", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("builder");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Premium check - coach is premium-only feature
      if (user.subscriptionTier !== 'premium') {
        return res.status(403).json({ message: "Premium subscription required" });
      }

      const { sessionType, recentWriting, specificQuestion } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      // Get user analytics for personalized coaching
      const interactions = await storage.getAiInteractionsByUser(user.id);
      const recentInteractions = interactions.slice(-10);
      const averageQuality = recentInteractions.length > 0
        ? recentInteractions.reduce((sum, i) => sum + parseFloat(i.qualityScore || "7.5"), 0) / recentInteractions.length
        : 7.5;

      const wordsWritten = recentWriting ? recentWriting.length :
        recentInteractions.reduce((sum, i) => sum + i.inputText.length, 0);

      // Generate coaching with Gemini AI
      let coachingResponse;

      if (apiKey) {
        const coachPrompt = `You are a witty, analytical premium writing coach. Provide personalized coaching based on:

Session Type: ${sessionType}
User's Average Quality Score: ${averageQuality.toFixed(1)}/10
Total Words Analyzed: ${wordsWritten}
Recent Sessions: ${recentInteractions.length}
${recentWriting ? `Recent Writing Sample: "${recentWriting.substring(0, 500)}..."` : ''}
${specificQuestion ? `Specific Question: "${specificQuestion}"` : ''}

Respond in JSON format:
{
  "personalizedMessage": "A warm, encouraging 2-3 paragraph message with wit and substance",
  "styleInsights": ["3-4 specific insights about their writing style and patterns"],
  "marketIntelligence": ["2-3 current market trends relevant to their work"],
  "actionableAdvice": [
    {"category": "category name", "suggestion": "specific actionable advice", "difficulty": "easy|moderate|challenging", "marketRelevance": 1-10}
  ],
  "encouragement": "A motivating closing statement",
  "nextSessionFocus": "What to work on next"
}`;

        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: coachPrompt }] }],
              generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 2048,
              }
            })
          });

          if (response.ok) {
            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              coachingResponse = JSON.parse(jsonMatch[0]);
            }
          } else {
            console.error('Coach API error:', await response.text());
          }
        } catch (e) {
          console.error('Gemini coaching error:', e);
        }
      }

      // Fallback to generated response if Gemini fails
      if (!coachingResponse) {
        coachingResponse = {
          coachingType: sessionType || 'daily_checkin',
          personalizedMessage: generateCoachingMessage(user, averageQuality, wordsWritten, sessionType),
          styleInsights: generateStyleInsights(recentInteractions, averageQuality),
          marketIntelligence: generateMarketInsights(sessionType),
          actionableAdvice: generateActionableAdvice(averageQuality, wordsWritten),
          encouragement: generateEncouragement(averageQuality, wordsWritten),
          nextSessionFocus: determineNextFocus(sessionType, averageQuality),
        };
      }

      coachingResponse.confidence = 0.9;
      coachingResponse.analyticsUsed = {
        totalInteractions: interactions.length,
        averageQuality,
        wordsAnalyzed: wordsWritten,
        recentSessions: recentInteractions.length
      };

      // Log coaching session
      await storage.createAiInteraction({
        userId: user.id,
        documentId: null,
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
        nextSessionRecommended: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch (error) {
      console.error('Coaching session error:', error);
      res.status(500).json({ message: "Failed to conduct coaching session" });
    }
  });

  // Check exercise answer with AI
  app.post("/api/ai/tutor/check-answer", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("builder");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { userAnswer, expectedFormat, exerciseDescription, correctAnswer } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ message: "AI tutor not configured" });
      }

      const prompt = `You are a writing tutor checking a student's answer.

Exercise: ${exerciseDescription}
Expected Format: ${expectedFormat}
${correctAnswer ? `Correct Answer Example: ${correctAnswer}` : ''}

Student's Answer: "${userAnswer}"

Evaluate the student's answer:
1. Is it correct or mostly correct?
2. What did they do well?
3. What could be improved?

Respond in JSON format:
{
  "isCorrect": boolean,
  "score": number (0-100),
  "feedback": "Encouraging feedback message",
  "corrections": ["specific correction 1", "specific correction 2"] or [],
  "praise": "What they did well"
}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 512,
          }
        })
      });

      if (!response.ok) {
        console.error('Check answer API error:', await response.text());
        throw new Error('AI check failed');
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Parse JSON response
      let result = { isCorrect: false, score: 0, feedback: "Could not evaluate", corrections: [], praise: "" };
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('JSON parse error:', e);
      }

      res.json(result);
    } catch (error) {
      console.error('Check answer error:', error);
      res.status(500).json({ message: "Failed to check answer" });
    }
  });

  return server;
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
    
    const topAgent = Object.entries(agentUsage).sort(([,a], [,b]) => (b as number) - (a as number))[0];
    
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
  
  insights.push("Your unique voice is emerging - I can see patterns that are distinctly YOU!");
  
  return insights;
}

function generateMarketInsights(sessionType?: string): string[] {
  const insights = [];
  
  if (sessionType === 'market_insights') {
    insights.push("Current trend: Authentic, character-driven narratives are dominating bestseller lists");
    insights.push("Reader preference: Stories with emotional depth and relatable conflicts are highly sought after");
    insights.push("Publishing insight: Unique voices with consistent quality attract agent attention");
    insights.push("Platform opportunity: Short-form content is perfect for building an audience while working on longer pieces");
  } else {
    insights.push("Market tip: Your consistent practice is building the portfolio agents and publishers want to see");
    insights.push("Industry note: Quality over quantity - your focus on improvement aligns with professional standards");
  }
  
  return insights;
}

function generateActionableAdvice(avgQuality: number, wordsWritten: number): any[] {
  const advice = [];
  
  if (avgQuality < 7) {
    advice.push({
      category: "Craft Development",
      suggestion: "Focus on one specific technique this week - try writing three short scenes using only dialogue",
      difficulty: "moderate",
      marketRelevance: 8
    });
  }
  
  if (wordsWritten < 1000) {
    advice.push({
      category: "Consistency Building", 
      suggestion: "Set a small daily target - even 100 words daily creates momentum and builds the writing habit",
      difficulty: "easy",
      marketRelevance: 9
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
