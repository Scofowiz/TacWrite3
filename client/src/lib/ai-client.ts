/**
 * AI Client - Simplified interface for AI operations
 * 
 * This provides a clean abstraction for AI text generation without complex dependencies.
 * Can be easily swapped out for different AI providers or implementations.
 */

export interface AIClientConfig {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIClient {
  generate(prompt: string, config?: AIClientConfig): Promise<AIResponse>;
}

/**
 * Mock AI Client for development - provides realistic responses for testing
 */
class MockAIClient implements AIClient {
  async generate(prompt: string, config?: AIClientConfig): Promise<AIResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
    
    // Generate contextual responses based on prompt content
    let response = '';
    
    if (prompt.toLowerCase().includes('character') || prompt.toLowerCase().includes('protagonist')) {
      response = `The character stood at the crossroads, feeling the weight of destiny pressing down like a heavy cloak. In the distance, storm clouds gathered on the horizon, their dark tendrils reaching toward the earth like grasping fingers. This was the moment everything would change—the decision that would ripple through time itself.

Sarah had always known this day would come, though she'd hoped it would be later, when she was more prepared. The ancient prophecy spoke of a choice between light and shadow, between salvation and destruction. Now, as the winds began to howl and the first drops of rain kissed her cheek, she understood that preparation was a luxury she'd never truly possessed.

The path ahead split into three directions: one leading to the gleaming spires of the capital, where power and politics awaited; another winding into the dark forest, where secrets and magic dwelled; and the third stretching toward the distant mountains, where truth and sacrifice beckoned. Each choice carried its own weight, its own consequences, its own price.`;
    } else if (prompt.toLowerCase().includes('dialogue') || prompt.toLowerCase().includes('conversation')) {
      response = `"You can't be serious," Marcus said, his voice barely containing his disbelief. "After everything we've been through, you're just going to walk away?"

Elena turned slowly, her eyes reflecting a pain that cut deeper than any blade. "It's not walking away, Marcus. It's accepting reality."

"Reality?" He laughed bitterly. "Our reality is what we make it. We've proven that time and again."

"Have we?" She gestured to the ruins around them, the crumbling walls that had once been their sanctuary. "Look around. This is what our choices have brought us. How many more people have to suffer for our ideals?"

Marcus stepped closer, his hand reaching out instinctively before falling back to his side. "Those people chose to follow us. They believed in what we were fighting for."

"They believed in us," Elena corrected, her voice soft but firm. "And we let them down."`;
    } else if (prompt.toLowerCase().includes('description') || prompt.toLowerCase().includes('setting')) {
      response = `The ancient library stretched endlessly in all directions, its vaulted ceilings disappearing into shadow-wrapped heights. Towering shelves, carved from what appeared to be living wood, twisted and curved in impossible geometries, their surfaces gleaming with an inner light that seemed to pulse with the rhythm of a distant heartbeat.

Books of every conceivable size and material filled the shelves: leather-bound tomes that whispered when touched, crystal volumes that sang with trapped starlight, and metal codices whose pages rang like chimes in the perpetual twilight. The air itself seemed thick with knowledge, charged with the accumulated wisdom of countless ages.

Floating wisps of luminescent energy drifted between the stacks, casting dancing shadows that seemed to tell stories of their own. The floor beneath was a mosaic of polished stones, each one inscribed with symbols from languages long forgotten, creating patterns that shifted and changed as one walked across them.

In the distance, barely visible through the maze of knowledge, a figure in robes the color of starlight moved with purpose, their footsteps echoing with a sound like turning pages.`;
    } else {
      // Generic high-quality prose
      response = `The world had changed in ways both subtle and profound. Where once there had been certainty, now questions bloomed like flowers after rain. The old ways of thinking, the familiar patterns that had guided generations, seemed suddenly inadequate for the challenges that lay ahead.

In the quiet moments between action and reflection, when the noise of daily life fell away like autumn leaves, there was space to consider what truly mattered. The connections between people, the stories that shaped understanding, the dreams that drove progress—these were the threads from which the future would be woven.

Change was inevitable, but direction was still a choice. The path forward required both courage to embrace the unknown and wisdom to learn from what had come before. It was a delicate balance, like walking a tightrope stretched between yesterday and tomorrow, with only hope as a safety net.

The journey ahead would not be easy, but it would be meaningful. And in a world where meaning often felt scarce, that was perhaps the most valuable treasure of all.`;
    }
    
    return {
      content: response,
      usage: {
        promptTokens: prompt.length / 4, // Rough estimate
        completionTokens: response.length / 4,
        totalTokens: (prompt.length + response.length) / 4
      }
    };
  }
}

/**
 * Production AI Client - would integrate with actual AI services
 */
class ProductionAIClient implements AIClient {
  private apiKey?: string;
  private baseUrl: string = '/api/ai/generate';

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string, config?: AIClientConfig): Promise<AIResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        body: JSON.stringify({
          prompt,
          ...config
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Production AI client error:', error);
      // Fallback to mock client for development
      const mockClient = new MockAIClient();
      return mockClient.generate(prompt, config);
    }
  }
}

/**
 * Factory function to create AI client based on environment
 */
export function createAIClient(): AIClient {
  // In development, use mock client
  if (import.meta.env.DEV) {
    return new MockAIClient();
  }
  
  // In production, use real AI client with API key from environment
  const apiKey = import.meta.env.VITE_AI_API_KEY;
  return new ProductionAIClient(apiKey);
}

// Export for testing and advanced usage
export { MockAIClient, ProductionAIClient };