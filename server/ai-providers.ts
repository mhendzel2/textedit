import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CohereClient } from "cohere-ai";
// Initialize AI providers
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

// Hugging Face Inference API
async function callHuggingFace(model: string, inputs: any) {
  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs }),
  });
  return response.json();
}

// Perplexity AI
async function callPerplexity(messages: any[], model = "llama-3.1-sonar-small-128k-online") {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });
  return response.json();
}

function parseAIResponseJSON(responseText: string): any {
  try {
    const cleanedText = responseText.replace(/^```json\s*|```\s*$/g, '');
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("AI response JSON parsing error:", e);
    console.error("Raw response:", responseText);
    throw new Error('Failed to parse AI response as JSON');
  }
}

export type AIProvider = 'openai' | 'google' | 'anthropic' | 'cohere' | 'azure' | 'huggingface' | 'perplexity';

export async function getAIResponse(
  prompt: string, 
  provider: AIProvider, 
  temperature: number = 0.3, 
  useJsonFormat: boolean = true
): Promise<any> {
  try {
    switch (provider) {
      case 'openai':
        const openaiResponse = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [{ role: "user", content: prompt }],
          response_format: useJsonFormat ? { type: "json_object" } : undefined,
          temperature,
        });
        return parseAIResponseJSON(openaiResponse.choices[0].message.content || '{}');

      case 'google':
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return parseAIResponseJSON(response.text());

      case 'anthropic':
        const anthropicResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514", // the newest Anthropic model is "claude-sonnet-4-20250514" which was released May 14, 2025. Use this by default unless user has already selected claude-3-7-sonnet-20250219
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
          temperature,
        });
        const textContent = anthropicResponse.content.find((block: any) => block.type === 'text');
        return parseAIResponseJSON(textContent ? (textContent as any).text : '{}');

      case 'cohere':
        const cohereResponse = await cohere.generate({
          model: 'command-r-plus',
          prompt,
          temperature,
          maxTokens: 4096,
        });
        return parseAIResponseJSON(cohereResponse.generations[0].text);

      case 'azure':
        // Azure OpenAI implementation would go here with proper credentials
        throw new Error('Azure OpenAI provider requires proper configuration');

      case 'huggingface':
        // Using a specialized literary analysis model
        const hfResponse = await callHuggingFace('microsoft/DialoGPT-large', prompt);
        return parseAIResponseJSON(hfResponse.generated_text || '{}');

      case 'perplexity':
        const perplexityResponse = await callPerplexity([
          { role: "user", content: prompt }
        ]);
        return parseAIResponseJSON(perplexityResponse.choices[0].message.content);

      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  } catch (error) {
    console.error(`Error with ${provider} provider:`, error);
    // Fallback to next available provider
    if (provider !== 'google' && process.env.GOOGLE_AI_API_KEY) {
      console.log(`Falling back to Google AI...`);
      return getAIResponse(prompt, 'google', temperature, useJsonFormat);
    }
    throw error;
  }
}

// Provider-specific optimizations for different analysis types
export function getOptimalProvider(analysisType: string): AIProvider {
  switch (analysisType) {
    case 'character-voice':
    case 'dialogue':
      return 'anthropic'; // Excellent at understanding character nuances
    
    case 'world-building':
    case 'consistency':
      return 'openai'; // Strong logical reasoning
    
    case 'themes':
    case 'metaphors':
      return 'google'; // Good at semantic analysis
    
    case 'pacing':
    case 'structure':
      return 'cohere'; // Strong at classification tasks
    
    case 'fact-checking':
    case 'research':
      return 'perplexity'; // Real-time web access
    
    case 'creative-writing':
      return 'huggingface'; // Access to specialized models
    
    default:
      return 'openai'; // Default fallback
  }
}

export { openai, anthropic, genAI, cohere };