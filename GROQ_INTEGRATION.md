# Groq AI Integration Guide

## Overview
TacWrite3 now supports **Groq AI** alongside the existing **Gemini** and **Cloudflare** providers. This allows you to easily switch between different AI providers based on your needs. The system now properly fails with clear error messages when AI providers are unavailable, preventing memory pollution from fallback data.

## Quick Start

### 1. Set Default Provider
Edit your `.env` file and change the default provider:

```env
# Set VITE_AI_PROVIDER to: gemini, groq, cloudflare, or mock
VITE_AI_PROVIDER=groq
```

### 2. Configure Groq Models
The following Groq models are supported (edit these in your `.env` file):

```env
# Fast, efficient option (default)
GROQ_MODEL=mixtral-8x7b-32768

# Alternative models:
# GROQ_MODEL=llama3-8b-8192          # Balanced performance
# GROQ_MODEL=gemma2-9b-it           # Lightweight
# GROQ_MODEL=qwen-32b                 # High quality
```

### 3. Set Your Groq API Key
Add your Groq API key to your `.env` file:

```env
GROQ_API_KEY=your_groq_api_key_here
VITE_GROQ_API_KEY=your_groq_api_key_here
```

## Available AI Providers

| Provider | Environment Variable | Description | Best For |
|----------|---------------------|-------------|-----------|
| `gemini` | `VITE_AI_PROVIDER=gemini` | Google's Gemini Pro | High quality, reasoning |
| `groq` | `VITE_AI_PROVIDER=groq` | Groq's fast inference | Speed, cost efficiency |
| `cloudflare` | `VITE_AI_PROVIDER=cloudflare` | Workers AI | Edge deployment |
| `mock` | `VITE_AI_PROVIDER=mock` | Development fallback | Testing, development |

## API Endpoints

The following Groq endpoints are now available:

- `POST /api/ai/groq/generate` - Standard text generation
- `POST /api/ai/groq/enhance` - Text enhancement
- `POST /api/ai/groq/chat` - Chat completions

## Getting a Groq API Key

1. Visit https://console.groq.com/
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key to your `.env` file

## Troubleshooting

If you encounter errors:

1. Verify your API key is correct
2. Check that the model name is valid
3. Ensure your Groq account has available credits
4. Check the server logs for detailed error messages
