/**
 * Server-side AI client factory for provider abstraction
 * This creates AI clients based on provider selection
 */

export type AIProvider = 'gemini' | 'groq' | 'kimiki2' | 'cloudflare' | 'production' | 'mock';

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Model configurations for each provider
const MODEL_CONFIG = {
  gemini: 'gemini-3-pro-preview',
  groq: 'meta-llama/llama-4-maverick-17b-128e-instruct',  // Llama 4 Maverick on Groq
  kimiki2: 'moonshotai/kimi-k2-instruct-0905',  // Kimi2 on Groq
  cloudflare: '@cf/meta/llama-3.1-8b-instruct',
  production: 'gemini-3-pro-preview',
  mock: 'mock'
};

/**
 * Server-side AI client factory
 */
export function createAIServerClient(provider: AIProvider): AIServerClient {
  const model = MODEL_CONFIG[provider] || MODEL_CONFIG.gemini;

  switch (provider) {
    case 'gemini':
      return new GeminiServerClient(process.env.GEMINI_API_KEY!, model);
    case 'groq':
      return new GroqServerClient(process.env.GROQ_API_KEY!, model);
    case 'kimiki2':
      // Kimiki2 uses Groq backend with moonshotai/kimi-k2-instruct-0905 model
      return new GroqServerClient(process.env.GROQ_API_KEY!, model);
    case 'cloudflare':
      return new CloudflareServerClient(
        process.env.CLOUDFLARE_ACCOUNT_ID!,
        process.env.CLOUDFLARE_API_TOKEN!,
        model
      );
    case 'production':
      return new ProductionServerClient(process.env.VITE_AI_API_KEY);
    case 'mock':
    default:
      return new MockServerClient();
  }
}

interface AIServerClient {
  generate(prompt: string, config?: any): Promise<AIResponse>;
  generateStream(prompt: string, config?: any): AsyncGenerator<string>;
}

class GeminiServerClient implements AIServerClient {
  private apiKey: string;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel: string = 'gemini-3-pro-preview') {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  async generate(prompt: string, config: any = {}): Promise<AIResponse> {
    const model = config.model || this.defaultModel;
    const temperature = config.temperature || 0.7;
    const maxTokens = config.maxTokens || 2048;
    const systemPrompt = config.systemPrompt;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    
    return {
      content,
      usage: {
        promptTokens: prompt.length / 4,
        completionTokens: content.length / 4,
        totalTokens: (prompt.length + content.length) / 4
      }
    };
  }

  async *generateStream(prompt: string, config: any = {}): AsyncGenerator<string> {
    const model = config.model || this.defaultModel;
    const temperature = config.temperature || 0.7;
    const maxTokens = config.maxTokens || 2048;
    const systemPrompt = config.systemPrompt;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available for streaming');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Parse Gemini streaming response
      let startIdx = 0;
      while (startIdx < buffer.length) {
        if (buffer[startIdx] === '[' || buffer[startIdx] === ',' || buffer[startIdx] === ' ' || buffer[startIdx] === '\n') {
          startIdx++;
          continue;
        }

        if (buffer[startIdx] === '{') {
          let braceCount = 0;
          let endIdx = startIdx;

          for (let i = startIdx; i < buffer.length; i++) {
            if (buffer[i] === '{') braceCount++;
            if (buffer[i] === '}') braceCount--;
            if (braceCount === 0) {
              endIdx = i + 1;
              break;
            }
          }

          if (braceCount === 0 && endIdx > startIdx) {
            const jsonStr = buffer.substring(startIdx, endIdx);
            try {
              const parsed = JSON.parse(jsonStr);
              const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (text) {
                yield text;
              }
            } catch (parseErr) {
              console.log('Gemini stream parse error:', parseErr);
            }
            buffer = buffer.substring(endIdx);
            startIdx = 0;
          } else {
            break;
          }
        } else {
          startIdx++;
        }
      }
    }
  }
}

class GroqServerClient implements AIServerClient {
  private apiKey: string;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel: string = 'moonshotai/kimi-k2-instruct-0905') {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
    console.log(`[GroqServerClient] Initialized with model: ${this.defaultModel}`);
  }

  async generate(prompt: string, config: any = {}): Promise<AIResponse> {
    const model = config.model || this.defaultModel;
    console.log(`[GroqServerClient] Generating with model: ${model}`);
    const temperature = config.temperature || 0.7;
    const maxTokens = config.maxTokens || 2048;
    const systemPrompt = config.systemPrompt;

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
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
    
    return {
      content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || prompt.length / 4,
        completionTokens: data.usage?.completion_tokens || content.length / 4,
        totalTokens: data.usage?.total_tokens || (prompt.length + content.length) / 4
      }
    };
  }

  async *generateStream(prompt: string, config: any = {}): AsyncGenerator<string> {
    const model = config.model || this.defaultModel;
    console.log(`[GroqServerClient] Streaming with model: ${model}`);
    const temperature = config.temperature || 0.7;
    const maxTokens = config.maxTokens || 2048;
    const systemPrompt = config.systemPrompt;

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
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

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body available for streaming');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              yield content;
            }
          } catch (parseError) {
            console.log('Groq stream parse error:', line);
          }
        }
      }
    }
  }
}

class CloudflareServerClient implements AIServerClient {
  private accountId: string;
  private apiToken: string;
  private defaultModel: string;

  constructor(accountId: string, apiToken: string, defaultModel: string = '@cf/meta/llama-3.1-8b-instruct') {
    this.accountId = accountId;
    this.apiToken = apiToken;
    this.defaultModel = defaultModel;
  }

  async generate(prompt: string, config: any = {}): Promise<AIResponse> {
    const model = config.model || this.defaultModel;
    const temperature = config.temperature || 0.7;
    const maxTokens = config.maxTokens || 2048;
    const systemPrompt = config.systemPrompt;

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
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
    
    return {
      content,
      usage: {
        promptTokens: prompt.length / 4,
        completionTokens: content.length / 4,
        totalTokens: (prompt.length + content.length) / 4
      }
    };
  }

  async *generateStream(prompt: string, config: any = {}): AsyncGenerator<string> {
    // Cloudflare Workers AI doesn't support streaming in the same way as other providers
    // So we generate normally and yield the full result (though this doesn't provide true streaming)
    const result = await this.generate(prompt, config);
    yield result.content;
  }
}

class ProductionServerClient implements AIServerClient {
  private apiKey?: string;
  private baseUrl: string = '/api/ai/generate';

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string, config: any = {}): Promise<AIResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      },
      body: JSON.stringify({
        prompt,
        ...config
      })
    });

    if (!response.ok) {
      throw new Error(`Production AI error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  }

  async *generateStream(prompt: string, config: any = {}): AsyncGenerator<string> {
    // Fallback to non-streaming for production
    const result = await this.generate(prompt, config);
    yield result.content;
  }
}

class MockServerClient implements AIServerClient {
  async generate(prompt: string, config: any = {}): Promise<AIResponse> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
    
    const mockResponse = `🤖 Mock AI Response: This is a simulated response from ${config.provider || 'Mock AI'} for prompting analysis and demonstration purposes.
    
The content generation system is functioning properly and ready to assist with your writing needs. This mock implementation provides realistic response times and consistent formatting.

Request received at: ${new Date().toISOString()}`;
    
    return {
      content: mockResponse,
      usage: {
        promptTokens: prompt.length / 4,
        completionTokens: mockResponse.length / 4,
        totalTokens: (prompt.length + mockResponse.length) / 4
      }
    };
  }

  async *generateStream(prompt: string, config: any = {}): AsyncGenerator<string> {
    // Mock streaming
    yield '🤖 ';
    await new Promise(resolve => setTimeout(resolve, 200));
    yield 'Mock ';
    await new Promise(resolve => setTimeout(resolve, 200));
    yield 'AI ';
    await new Promise(resolve => setTimeout(resolve, 200));
    yield 'streaming ';
    await new Promise(resolve => setTimeout(resolve, 200));
    yield 'response...';
  }
}
