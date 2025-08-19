# TACWrite - AI-Powered Writing Assistant

## Overview

TACWrite is a full-stack web application built for AI-powered writing assistance with advanced agent orchestration capabilities. The system combines a React frontend with an Express backend, featuring sophisticated AI agents that provide contextual writing assistance, autonomous content generation, and educational tutoring features. The application is designed with a modular architecture that supports both free and premium tiers, with usage tracking and subscription management.

## User Preferences

Preferred communication style: Simple, everyday language.

**Editor Requirements:**
- Cursor awareness for AI continuations using 600 characters before cursor
- No pre-filled examples in enhancement or instruction boxes
- Undo/redo functionality with keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- Clean UI without placeholder text interfering with user input

## System Architecture

### Frontend Architecture
The client is built using **React 18** with **TypeScript** and follows a modern component-based architecture:
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: Radix UI primitives with shadcn/ui component system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Type Safety**: Full TypeScript coverage with strict mode enabled

The frontend is structured with clear separation of concerns:
- `/pages` - Main application views (editor, tutoring, analytics)
- `/components` - Reusable UI components organized by feature
- `/hooks` - Custom React hooks for business logic
- `/lib` - Utility functions and configuration
- `/types` - TypeScript type definitions

**Editor Features (Added August 2025):**
- Document undo/redo functionality with 50-state history
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
- Cursor-aware AI continuations
- Clean input boxes without pre-filled examples
- Real-time auto-save with visual feedback

### Backend Architecture
The server uses **Express.js** with **TypeScript** in ESM format:
- **Runtime**: Node.js with tsx for development
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL session store
- **API Design**: RESTful endpoints with consistent error handling
- **Build Strategy**: esbuild for production bundling

Key backend patterns:
- Modular route registration system
- Abstract storage interface for data operations
- Centralized error handling middleware
- Request/response logging for debugging

### Database Schema
Uses **Drizzle ORM** with PostgreSQL, featuring:
- **Users table**: Authentication, subscription tiers, and usage tracking
- **Documents table**: User documents with AI assistant state and metadata
- **AI Interactions table**: Comprehensive logging of all AI agent interactions
- **Learning Progress table**: Educational module completion tracking
- **Achievements table**: Gamification and progress rewards
- **Writing Analytics table**: Daily writing statistics and trends

The schema is designed for scalability with UUID primary keys and proper foreign key relationships.

### AI Agent System
The application features a sophisticated multi-agent AI architecture with simplified, reliable text generation:

**Core Architecture:**
- **Agent Container System**: Provides fault tolerance, health monitoring, and lifecycle management
- **Community Memory Pool**: Shared intelligence system for agent collaboration and learning
- **Agent Orchestrator**: Central coordination managing 6 specialized agent types
- **Simplified Text Generation**: Clean, dependency-free AI client system with mock and production modes
- **Cursor-Aware Context**: Uses 600 characters before cursor position for proper continuation handling

**Agent Types:**
- **Writing Assistant**: Basic text enhancement and improvement
- **Autonomous Writer**: Premium content generation and auto-completion
- **Contextual Enhancer**: Rich atmospheric and sensory detail addition
- **WFA Agent**: Market trend integration and commercial appeal optimization
- **Tutoring Agent**: Educational guidance with Purdue OWL integration
- **Doctor Agent**: Issue diagnosis and targeted quality improvements

**Key Features:**
- Reinforcement learning through user feedback loops with rating system
- Quality scoring and confidence metrics
- Cross-agent memory sharing for collaborative intelligence
- Premium feature gating with usage tracking
- Health monitoring and automatic error recovery
- Contextual pattern recognition for writing improvements
- Cursor-aware continuations that don't overwrite existing text
- Empty input boxes without pre-filled examples

### Premium Feature System
The application implements a freemium model with:
- **Usage Limits**: Free users limited to 5 interactions, premium users get unlimited
- **Feature Gating**: Advanced AI agents and analytics restricted to premium users
- **Subscription Management**: Backend endpoints for tier upgrades
- **Usage Tracking**: Real-time monitoring of API calls and feature usage

### Session and Authentication
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **User Management**: Complete user lifecycle with subscription state
- **Demo Mode**: Hardcoded demo user for development and testing

## External Dependencies

### Database Services
- **PostgreSQL**: Primary database with Neon serverless driver
- **Drizzle Kit**: Database migrations and schema management

### UI and Styling Libraries
- **Radix UI**: Comprehensive primitive component library for accessibility
- **Tailwind CSS**: Utility-first CSS framework with PostCSS processing
- **Lucide React**: Modern icon library
- **React Hook Form**: Form validation with Zod schema validation

### Development and Build Tools
- **Vite**: Frontend build tool with React plugin
- **esbuild**: Backend bundling for production
- **TypeScript**: Static typing across the entire stack
- **Replit Integration**: Development environment optimization plugins

### AI and Machine Learning
**Simplified AI Client System:**
- **Development Mode**: Sophisticated mock AI client with realistic, contextual responses
- **Production Mode**: Pluggable interface supporting various AI providers
- **Text Generation**: Clean implementation without complex dependencies
- **Agent Integration**: Seamless integration with multi-agent orchestration system

**Learning Systems:**
- **Community Memory**: Collaborative learning across agent interactions
- **Quality Metrics**: Multi-dimensional scoring with user feedback integration
- **Pattern Recognition**: Contextual writing improvement suggestions
- **Reinforcement Learning**: Continuous improvement through usage analytics

### State Management and HTTP
- **TanStack Query**: Server state management with caching and synchronization
- **Wouter**: Lightweight routing solution
- **Native Fetch**: HTTP client with custom request wrapper

The system is designed for deployment on platforms that support Node.js applications with PostgreSQL databases, with specific optimizations for Replit's development environment.