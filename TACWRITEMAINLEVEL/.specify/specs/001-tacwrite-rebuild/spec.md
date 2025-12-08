# TacWrite v2.0 Specification

## Overview

TacWrite is an AI-powered writing assistant platform that helps authors enhance, continue, and improve their creative writing. This specification defines the complete rebuild of TacWrite with emphasis on LLM provider independence, mandatory quality iteration, and production-ready architecture.

## User Stories

### US-1: Basic Writing Enhancement
**As a** writer,
**I want to** select text and enhance it with AI assistance,
**So that** my writing quality improves with richer vocabulary and better flow.

**Acceptance Criteria:**
- [ ] User can select text in the editor
- [ ] User can choose enhancement type (clarity, style, emotion, atmosphere, dialogue)
- [ ] AI processes the text through quality iteration loop
- [ ] Enhanced text is returned with quality score
- [ ] User can accept, reject, or iterate further

### US-2: Autonomous Text Continuation
**As a** writer,
**I want to** have AI continue my writing from the cursor position,
**So that** I can overcome writer's block and maintain narrative flow.

**Acceptance Criteria:**
- [ ] AI reads 600 characters before cursor for context
- [ ] Generated continuation matches style and tone
- [ ] Continuation is 200-1000 words (configurable)
- [ ] Quality iteration ensures coherent output
- [ ] Text inserted at exact cursor position

### US-3: LLM Provider Selection
**As a** user,
**I want to** choose which AI provider powers my writing assistant,
**So that** I can use my preferred service or local models.

**Acceptance Criteria:**
- [ ] Settings page shows available providers
- [ ] User can select: OpenAI, Anthropic, Gemini, Ollama, or Mock
- [ ] Provider switch takes effect immediately
- [ ] API key configuration per provider
- [ ] Graceful fallback if provider unavailable

### US-4: Quality Metrics Dashboard
**As a** writer,
**I want to** see quality metrics for AI-generated content,
**So that** I understand how the AI improved my writing.

**Acceptance Criteria:**
- [ ] Each AI response shows quality score (0-10)
- [ ] Metrics include: readability, coherence, improvement delta
- [ ] Iteration count displayed if multiple passes occurred
- [ ] Historical quality trends in analytics

### US-5: Document Management
**As a** user,
**I want to** create, save, and organize my documents,
**So that** my writing projects are preserved and accessible.

**Acceptance Criteria:**
- [ ] Create new documents with title
- [ ] Auto-save every 30 seconds
- [ ] Manual save with Ctrl+S
- [ ] Document list with search
- [ ] Delete documents with confirmation

### US-6: Writing Tutoring Mode
**As a** learning writer,
**I want to** receive educational guidance on writing techniques,
**So that** I improve my skills over time.

**Acceptance Criteria:**
- [ ] Tutoring tab with lesson modules
- [ ] Topics: grammar, style, structure, citation
- [ ] Interactive exercises with feedback
- [ ] Progress tracking per module

### US-7: User Authentication
**As a** user,
**I want to** have my own account with saved preferences,
**So that** my work and settings persist across sessions.

**Acceptance Criteria:**
- [ ] Registration with email/password
- [ ] Login/logout functionality
- [ ] Session persistence
- [ ] Subscription tier tracking (free/premium)
- [ ] Usage limits enforced per tier

## Functional Requirements

### FR-1: LLM Abstraction Layer
The system shall implement a provider-agnostic LLM interface:
```typescript
interface LLMProvider {
  name: string;
  generate(prompt: string, options: GenerateOptions): Promise<LLMResponse>;
  stream(prompt: string, options: GenerateOptions): AsyncIterable<string>;
  isAvailable(): Promise<boolean>;
}
```

Supported providers:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude 3.5, Claude 3)
- Google (Gemini Pro, Gemini Flash)
- Ollama (local models)
- Mock (development/testing)

### FR-2: Quality Iteration Loop
Every AI generation shall pass through:
1. **Generate**: Initial LLM call
2. **Evaluate**: Score against quality metrics
3. **Iterate**: If score < threshold, regenerate with feedback (max 3 times)
4. **Deliver**: Return best result with metadata

Quality metrics:
- Readability score (Flesch-Kincaid or similar)
- Coherence score (semantic consistency)
- Task completion score (did it do what was asked)
- Improvement delta (vs original text)

### FR-3: Editor Features
- Rich text editing with cursor tracking
- Undo/redo with 50-state history (Ctrl+Z, Ctrl+Y)
- Word count display
- Auto-save indicator
- AI enhancement panel (non-modal)

### FR-4: Multi-Agent System
Preserve specialized agents from original:
- Writing Assistant (basic enhancement)
- Autonomous Writer (continuation/generation)
- Contextual Enhancer (atmosphere/detail)
- Doctor Agent (diagnosis/targeted fixes)
- Tutoring Agent (educational guidance)

### FR-5: Analytics & Tracking
- Daily writing statistics
- AI interaction history
- Quality score trends
- Achievement system

## Non-Functional Requirements

### NFR-1: Performance
- Page load < 3 seconds
- API response < 200ms (excluding LLM)
- LLM streaming starts < 500ms
- Support 100 concurrent users

### NFR-2: Reliability
- 99.9% uptime target
- Graceful degradation if LLM unavailable
- Data never lost (auto-save, persistence)

### NFR-3: Security
- HTTPS only
- Password hashing (bcrypt)
- Rate limiting on AI endpoints
- Input sanitization

### NFR-4: Maintainability
- TypeScript strict mode
- Comprehensive test coverage
- Documentation for all APIs
- Modular architecture

## Data Model

### Users
- id (UUID)
- email (unique)
- password_hash
- subscription_tier (free/premium)
- usage_count
- max_usage
- created_at, updated_at

### Documents
- id (UUID)
- user_id (FK)
- title
- content
- word_count
- genre, target_audience
- created_at, last_modified

### AI Interactions
- id (UUID)
- user_id, document_id (FKs)
- provider_used
- agent_type
- input_text, output_text
- quality_score, iteration_count
- response_time_ms
- created_at

### Learning Progress
- id (UUID)
- user_id (FK)
- module, lesson_id
- completion_percentage
- score
- last_accessed

## Review & Acceptance Checklist

- [ ] All user stories have clear acceptance criteria
- [ ] LLM abstraction supports 5+ providers
- [ ] Quality iteration loop is mandatory
- [ ] Database schema supports all features
- [ ] Security requirements addressed
- [ ] Performance requirements achievable
- [ ] Original TacWrite features preserved
- [ ] Constitution principles embedded

---

**Specification Version**: 1.0.0
**Created**: 2025-12-01
**Status**: Draft - Ready for Plan Phase
