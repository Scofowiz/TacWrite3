# TacWrite3 Codebase Overview

**Generated:** December 13, 2025

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [AI Capabilities](#ai-capabilities)
6. [Client-Side Structure](#client-side-structure)
7. [Key Features](#key-features)

---

## Architecture Overview

TacWrite3 is a **full-stack AI-powered writing assistant** with advanced features including:

- Multi-provider AI integration (Gemini, Cloudflare Workers AI, Groq, OpenAI)
- Sophisticated agent orchestration system
- Real-time collaborative writing features
- Learning management system (Purdue OWL curriculum)
- Premium coaching and analytics
- Document version control

**Architecture Pattern:** Client-Server with Express.js backend and React frontend

```text
┌─────────────────────────────────────────┐
│         React Frontend (Vite)           │
│  - Wouter routing                       │
│  - TanStack Query for data fetching     │
│  - Radix UI components                  │
└─────────────┬───────────────────────────┘
              │
              │ REST API
              │
┌─────────────▼───────────────────────────┐
│       Express.js Backend                │
│  - Multiple AI provider integrations    │
│  - Agent orchestration system           │
│  - WebSocket support                    │
└─────────────┬───────────────────────────┘
              │
              │ Drizzle ORM
              │
┌─────────────▼───────────────────────────┐
│       PostgreSQL Database               │
│  (Neon serverless)                      │
└─────────────────────────────────────────┘
```

---

## Technology Stack

### Backend

- **Framework:** Express.js v4.21.2
- **Runtime:** Node.js with TypeScript
- **Database:** PostgreSQL (via Neon serverless)
- **ORM:** Drizzle ORM v0.39.3
- **AI Integration:**
  - OpenAI v5.13.1
  - Google GenAI v1.15.0
  - AgentDB v1.3.9
- **WebSocket:** ws v8.18.0
- **Session Management:** express-session with memorystore
- **Authentication:** Passport.js

### Frontend

- **Framework:** React v18.3.1
- **Build Tool:** Vite v6.0.0
- **Routing:** Wouter v3.3.5
- **State Management:** TanStack Query v5.60.5
- **UI Library:** Radix UI components
- **Styling:** Tailwind CSS v3.4.17
- **Animation:** Framer Motion v11.13.1
- **Forms:** React Hook Form v7.55.0 + Zod validation

### Development

- **Language:** TypeScript v5.6.3
- **Package Manager:** npm
- **Dev Server:** tsx v4.21.0
- **Build:** esbuild v0.27.1

---

## Database Schema

### Tables

#### 1. **users**

User account management with subscription tiers.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar (UUID) | Primary key |
| username | text | Unique username |
| email | text | Unique email |
| password | text | Hashed password |
| subscriptionTier | text | "free" or "premium" |
| usageCount | integer | Current usage count |
| maxUsage | integer | Maximum allowed usage (5 for free, 999999 for premium) |
| createdAt | timestamp | Account creation date |
| updatedAt | timestamp | Last update timestamp |

#### 2. **documents**

Writing documents with metadata and AI context.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar (UUID) | Primary key |
| userId | varchar | Foreign key to users |
| title | text | Document title |
| content | text | Document content |
| wordCount | integer | Word count |
| lastModified | timestamp | Last modification time |
| aiAssistantActive | boolean | AI assistant status |
| context | jsonb | AI context/instructions (JSON) |
| genre | text | Document genre |
| targetAudience | text | Target audience |
| createdAt | timestamp | Creation timestamp |

#### 3. **aiInteractions**

Logs all AI interactions for learning and analytics.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar (UUID) | Primary key |
| userId | varchar | Foreign key to users |
| documentId | varchar | Foreign key to documents (nullable) |
| agentType | text | Agent type (writing-assistant, tutor, etc.) |
| inputText | text | User input |
| outputText | text | AI output |
| enhancementType | text | Type of enhancement |
| qualityScore | decimal(3,1) | Quality score (0-10) |
| userRating | text | User feedback (good/ok/poor/decline) |
| isPremiumFeature | boolean | Premium feature flag |
| responseTime | integer | Response time in milliseconds |
| createdAt | timestamp | Interaction timestamp |

#### 4. **learningProgress**

Tracks user progress through learning modules.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar (UUID) | Primary key |
| userId | varchar | Foreign key to users |
| courseModule | text | Module name (research-citation, academic-writing, etc.) |
| lessonId | text | Lesson identifier |
| lessonTitle | text | Lesson title |
| completionPercentage | integer | Progress percentage (0-100) |
| isCompleted | boolean | Completion status |
| score | integer | Assessment score (percentage) |
| timeSpent | integer | Time spent in minutes |
| lastAccessed | timestamp | Last access time |
| createdAt | timestamp | Creation timestamp |

#### 5. **achievements**

User achievements and badges.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar (UUID) | Primary key |
| userId | varchar | Foreign key to users |
| achievementType | text | Achievement type |
| title | text | Achievement title |
| description | text | Description |
| iconClass | text | CSS icon class |
| unlockedAt | timestamp | Unlock timestamp |

#### 6. **writingAnalytics**

Daily writing analytics.

| Field | Type | Description |
|-------|------|-------------|
| id | varchar (UUID) | Primary key |
| userId | varchar | Foreign key to users |
| date | timestamp | Analytics date |
| wordsWritten | integer | Words written |
| documentsCreated | integer | Documents created |
| aiAssistsUsed | integer | AI assists used |
| averageQualityScore | decimal(3,1) | Average quality score |
| timeSpentWriting | integer | Time in minutes |

---

## API Endpoints

### User Management

- `GET /api/user/current` - Get current user
- `PATCH /api/user/:id/subscription` - Update subscription tier

### Document Management

- `GET /api/documents` - List user documents
- `GET /api/documents/:id` - Get single document
- `POST /api/documents` - Create new document
- `PATCH /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/:id/versions` - Get version history
- `POST /api/documents/versions/:versionId/restore` - Restore version

### AI Enhancement

- `POST /api/ai/enhance` - Enhanced text generation with multiple modes
- `POST /api/ai/enhance/stream` - Streaming enhancement (SSE)
- `POST /api/ai/chat` - AI chat assistant (streaming)
- `POST /api/ai/premium/:feature` - Premium AI features
  - `autonomous-writer` - Autonomous content generation
  - `contextual-enhancer` - Contextual enhancement
  - `wfa-agent` - Market insights agent
- `POST /api/ai/enhanced-agents` - Multi-agent collaboration

### AI Provider Endpoints

- `POST /api/ai/gemini/generate` - Google Gemini AI
- `POST /api/ai/cloudflare/generate` - Cloudflare Workers AI
- `POST /api/ai/groq/generate` - Groq AI
- `POST /api/ai/groq/generate/stream` - Groq streaming

### Learning & Tutoring

- `GET /api/learning/progress` - Get learning progress
- `POST /api/learning/progress` - Create progress entry
- `PATCH /api/learning/progress/:id` - Update progress
- `GET /api/achievements` - Get achievements
- `POST /api/achievements` - Award achievement
- `POST /api/ai/tutor/chat` - AI tutor chat (Gemini-powered)
- `POST /api/ai/tutor/check-answer` - Check exercise answers

### Premium Coaching

- `POST /api/ai/premium/coaching` - Premium coaching session (legacy)
- `POST /api/coach/session` - Premium coaching with analytics

### Community Memory

- `POST /api/ai/community/interaction` - Log interaction
- `GET /api/ai/community/insights` - Get community insights

---

## AI Capabilities

### Enhancement Modes

TacWrite3 supports **20+ enhancement modes** across 4 categories:

#### 1. **Standard Enhancement**

- `clarity` - Improve clarity while preserving meaning
- `polish` - Refine flow, grammar, and style
- `continue` - Continue narrative naturally (~1000 words)
- `auto-complete` - Smart auto-completion from cursor
- `market-insights` - Commercial appeal enhancement

#### 2. **Branch Mode** (Exploration)

- `branch-explore` - Create alternate story paths
- `alternate-ending` - Generate alternate endings

#### 3. **Deepen Mode** (Add layers without advancing plot)

- `add-depth` - Deepen current scene without advancing
- `internal-monologue` - Add character thoughts
- `sensory-details` - Enhance sensory richness
- `world-building` - Add world-building context

#### 4. **Transform Mode** (Format adaptation)

- `transform-noir` - Convert to noir detective style
- `transform-stage-play` - Convert to stage play format
- `transform-news` - Convert to news report
- `transform-poetry` - Transform to poetry

#### 5. **Analyze Mode** (Editorial feedback)

- `analyze-theme` - Theme analysis
- `analyze-pacing` - Pacing analysis
- `analyze-character` - Character consistency analysis
- `analyze-style` - Prose style analysis

### AI Providers

**Multi-provider architecture** with dynamic selection:

1. **Google Gemini** (Primary)
   - Models: `gemini-3-pro-preview`, `gemini-2.0-flash`
   - Features: Streaming, JSON mode, high quality
   - Use: Main enhancement engine

2. **Cloudflare Workers AI**
   - Models: `@cf/meta/llama-3.1-8b-instruct`
   - Features: Low latency, cost-effective
   - Use: Fast completions

3. **Groq**
   - Models: `moonshotai/kimi-k2-instruct-0905`, `mixtral-8x7b-32768`
   - Features: Ultra-fast inference, streaming
   - Use: Real-time generation

4. **OpenAI** (Optional)
   - Models: GPT-3.5/4
   - Features: Highest quality, function calling
   - Use: Premium features

### Agent Orchestration System

**Sophisticated agent management** with:

- **Migration Strategies:** Gradual, immediate, or A/B test
- **Agent Types:**
  - `autonomous` - Creative expansion agent
  - `tutor` - Writing tutor (Purdue OWL)
  - `chapter` - Chapter ending agent
  - `continue` - Seamless continuation agent
  - `quality` - Quality assessment agent

- **Hybrid Execution:** Quality-based selection between old/new implementations
- **Community Memory:** Shared learning across agent instances
- **Container Management:** Resource-isolated agent execution
- **Fallback Support:** Automatic fallback on failure

### Key AI Features

1. **Cursor-Aware Generation**
   - Bidirectional context awareness
   - Smart continuation from cursor position
   - Context before + context after integration

2. **Process/Output Separation**
   - AI returns JSON with `{process, output}`
   - Process notes shown separately (not inserted)
   - Clean output insertion into document

3. **Reflect-and-Revisit Pattern**
   - Internal analysis steps
   - Self-critique and refinement
   - Quality validation

4. **Streaming Support**
   - Server-Sent Events (SSE)
   - Real-time chunk delivery
   - Accumulated text tracking

---

## Client-Side Structure

### Pages

- `Dashboard` - Main editor view
- `CoachPage` - Premium coaching interface
- `MonitoringDashboard` - System monitoring
- `NotFound` - 404 page

### Key Components

#### Editor Components

- `DocumentSidebar` - Document list and navigation
- `DocumentEditor` - Main editor toolbar
- `AiAssistantPanel` - Floating AI assistant panel
- `InstructionPanel` - Document instructions and settings

#### Modals

- `PremiumUpgradeModal` - Premium upgrade prompt

### State Management

**React Query** for server state:

- Document queries
- User queries
- AI interaction mutations

**Local State:**

- Undo/Redo context (custom implementation)
- Document content
- Editor UI state
- Save status tracking

### Auto-Save System

Multi-layered auto-save:

1. **Debounced save** (2 seconds after typing stops)
2. **Periodic save** (every 30 seconds)
3. **Before unload** (page close/refresh)
4. **Manual save** (button click)

### Undo/Redo System

**Custom implementation** with:

- Content snapshots with metadata
- Source tracking (editor, AI, manual)
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- Toast notifications
- Skip history option for AI updates

---

## Key Features

### 1. **Multi-AI Provider Support**

Dynamic provider selection with fallback support across Gemini, Cloudflare, Groq, and OpenAI.

### 2. **Document Version Control**

Automatic versioning on every content update with restore capability.

### 3. **Advanced AI Enhancement**

20+ enhancement modes with cursor-aware, bidirectional context generation.

### 4. **Learning Management System**

Integrated Purdue OWL curriculum with:

- Progress tracking
- Interactive exercises
- AI tutor chat
- Answer validation
- Achievement system

### 5. **Premium Coaching**

Analytics-driven personalized coaching with:

- Style analysis
- Market insights
- Growth planning
- Daily check-ins
- Actionable advice

### 6. **Community Memory**

Shared learning pool across agent instances:

- Performance tracking
- Pattern recognition
- Quality scoring
- Trend integration

### 7. **Real-Time Collaboration**

WebSocket support for future real-time features.

### 8. **Responsive Auto-Save**

Multi-tiered auto-save with visual status indicators.

### 9. **Quality Metrics**

Comprehensive quality scoring for all AI outputs with improvement tracking.

### 10. **Agent Container System**

Resource-isolated agent execution with:

- Memory limits
- CPU throttling
- Health monitoring
- Auto-restart
- Timeout protection

---

## Environment Variables

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://...

# AI Providers
GEMINI_API_KEY=...
OPENAI_API_KEY=... (optional)
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_MODEL=@cf/meta/llama-3.1-8b-instruct
GROQ_API_KEY=...
GROQ_MODEL=moonshotai/kimi-k2-instruct-0905

# Server
PORT=3001
NODE_ENV=development|production
```

---

## Development Workflow

### Setup

```bash
npm install
npm run db:push  # Initialize database
npm run dev      # Start development server
```

### Build

```bash
npm run build    # Build for production
npm start        # Start production server
```

### Type Checking

```bash
npm run check    # TypeScript type checking
```

---

## Architecture Highlights

### Strengths

✅ Multi-provider AI fallback system  
✅ Sophisticated agent orchestration  
✅ Comprehensive error handling  
✅ Real-time streaming support  
✅ Version control for documents  
✅ Community learning integration  
✅ Modular component architecture  
✅ Type-safe with TypeScript + Zod  

### Areas for Enhancement

🔄 Authentication system (currently hardcoded "builder" user)  
🔄 WebSocket real-time collaboration (infrastructure exists, not implemented)  
🔄 More granular permission system  
🔄 Agent container resource monitoring  
🔄 Advanced analytics dashboard  

---

## Summary

TacWrite3 is a **sophisticated AI-powered writing platform** with:

- **Advanced AI integration** across multiple providers
- **Intelligent agent orchestration** with hybrid strategies
- **Comprehensive learning system** (Purdue OWL)
- **Premium coaching** with analytics
- **Version control** and auto-save
- **Community memory** for shared learning
- **Extensible architecture** for future enhancements

The codebase demonstrates **enterprise-grade patterns** including:

- Clean separation of concerns
- Type safety throughout
- Comprehensive error handling
- Scalable agent architecture
- Real-time capabilities
- Quality-focused AI generation

**Total Lines of Code:** ~15,000+ (estimated)  
**Primary Languages:** TypeScript (100%)  
**Architecture:** Clean, modular, type-safe
