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
Your Groq API key is already configured in your `.env` file:

```env
GROQ_API_KEY=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
VITE_GROQ_API_KEY=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
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
- `POST /api/ai/groq/generate/stream` - Streaming text generation

## Client-Side Usage

```javascript
import { createAIClient } from '../lib/ai-client';

// Use default provider (from environment)
const client = createAIClient();

// Or specify a specific provider
const groqClient = createAIClient('groq');
const geminiClient = createAIClient('gemini');

// Generate text
const response = await groqClient.generate('Write a paragraph about time travel', {
  temperature: 0.7,
  maxTokens: 500,
  model: 'mixtral-8x7b-32768'
});

console.log(response.content);
```

## Switching Between Providers

### Method 1: Environment Variable (Recommended)
Edit your `.env` file:
```env
VITE_AI_PROVIDER=groq  # or gemini, cloudflare, mock
```

Then restart your development server:
```bash
npm run dev
```

### Method 2: Runtime Switching
For advanced use cases, you can switch providers at runtime:

```javascript
// Quick comparison test
const geminiResponse = await createAIClient('gemini').generate(prompt);
const groqResponse = await createAIClient('groq').generate(prompt);

// Compare responses, speeds, etc.
```

## Testing

A test file `test-groq.html` has been created to help you verify the integration:

1. Start your development server: `npm run dev`
2. Open `test-groq.html` in your browser
3. Use the dropdown to select different providers
4. Click "Test AI Generation" to see responses from each provider

## Groq Model Options

Groq offers several models optimized for different use cases:

- `mixtral-8x7b-32768` - **Default** - Fast, efficient, great for general writing
- `llama3-8b-8192` - Balanced performance and quality
- `gemma2-9b-it` - Lightweight, fast responses
- `qwen-32b` - Higher quality for complex tasks
- `llama-3.1-405b` - Most powerful (requires sufficient credits)

## Performance Notes

- **Groq** is optimized for speed and cost efficiency
- Responses typically generate faster than Gemini
- Usage tracking includes token counts for monitoring costs
- Streaming support provides real-time response updates

## Troubleshooting

### API Key Issues
- Verify `GROQ_API_KEY` is set in your environment
- Check the API key has sufficient credits at console.groq.com
- Ensure server is restarted after configuration changes

### Fallback Behavior
If Groq fails, the system automatically falls back to mock responses:
- Check console for error messages
- Verify network connectivity to Groq API
- Ensure server routes are properly configured

### Provider Not Working
1. Check environment variables are properly set
2. Verify the server is running: `npm run dev`
3. Check browser console for JavaScript errors
4. Restart the development server after configuration changes
5. Ensure API keys have sufficient credits/balance

### Error Handling
The system now properly propagates real API errors instead of falling back to mock data. If you see AI generation errors, check:
- API key validity and available credits
- Network connectivity to AI providers
- Environment variable configuration
- Server-side API endpoint functionality

## Next Steps

You can now easily switch between providers by changing the `VITE_AI_PROVIDER` environment variable. Each provider has its strengths:

- **Gemini**: Best for complex reasoning and creative writing
- **Groq**: Excellent for fast generation and cost efficiency
- **Cloudflare**: Good for edge deployment scenarios
- **Mock**: Perfect for development and testing

The configuration is flexible - change one environment variable and restart to explore different AI capabilities!
