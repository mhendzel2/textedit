import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CohereClient } from "cohere-ai";
import { 
  Change, CharacterVoiceAnalysis, MetaphorAnalysis, PacingAnalysis, PlotStructureAnalysis, 
  ThemeAnalysis, WorldBuildingAnalysis, ReadabilityAnalysis, DialogueAnalysis, 
  ClarityAnalysis, SentimentArcAnalysis, CharacterInteractionAnalysis 
} from "@shared/schema";

// AI Provider Initialization
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

// Generic JSON Parser
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

export type AIProvider = 'openai' | 'google' | 'anthropic' | 'cohere';

// Generic AI Response Function
async function getAIResponse(
  prompt: string, 
  provider: AIProvider, 
  temperature: number = 0.3, 
  useJsonFormat: boolean = true
): Promise<any> {
    switch (provider) {
      case 'openai':
        const openaiResponse = await openai.chat.completions.create({
          model: "gpt-4o",
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
          model: "claude-3-5-sonnet-20240620", // Corrected model
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

      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
}

// --- Editing and Analysis Functions ---

export interface EditResponse {
  editedContent: string;
  changes: Change[];
  summary: string;
}

export async function performDevelopmentalEdit(content: string, instructions: string, provider: AIProvider): Promise<EditResponse> {
    const prompt = `Perform a developmental edit on the following text based on these instructions: "${instructions}". Focus on structure, pacing, and character arcs. Provide the full edited text and a summary of changes. Format your response as a valid JSON object: {"editedContent": "...", "changes": [...], "summary": "..."}

Text to edit:
${content}`;
    return getAIResponse(prompt, provider, 0.3);
}

export async function performLineEdit(content: string, instructions: string, provider: AIProvider): Promise<EditResponse> {
    const prompt = `Perform a line edit on the following text based on these instructions: "${instructions}". Focus on grammar, syntax, word choice, and flow. Provide the full edited text and a summary of changes. Format your response as a valid JSON object: {"editedContent": "...", "changes": [...], "summary": "..."}

Text to edit:
${content}`;
    return getAIResponse(prompt, provider, 0.2);
}

// Existing Analysis Functions (Metaphor, Character, etc.)
export async function analyzeMetaphors(content: string, provider: AIProvider): Promise<MetaphorAnalysis> {
    const prompt = `Analyze the provided text for repeated metaphors and figurative language. Return a JSON object with a "metaphors" array and a "summary".

Text:
${content}`;
    return getAIResponse(prompt, provider, 0.4);
}

export async function analyzeCharacterVoice(content: string, characterNames: string[], provider: AIProvider): Promise<CharacterVoiceAnalysis> {
    const prompt = `Analyze the voice consistency for the characters: ${characterNames.join(', ')} in the text. Return a JSON object with a "characterAnalyses" array and a "summary".

Text:
${content}`;
    return getAIResponse(prompt, provider, 0.4);
}

export async function checkWorldBuildingConsistency(content: string, worldRules: string, provider: AIProvider): Promise<WorldBuildingAnalysis> {
    const prompt = `Check the text for consistency against these world rules: "${worldRules}". Return a JSON object detailing consistent elements, inconsistencies, and underdeveloped areas.

Text:
${content}`;
    return getAIResponse(prompt, provider, 0.3);
}

export async function analyzePacing(content: string, provider: AIProvider): Promise<PacingAnalysis> {
    const prompt = `Analyze the narrative pacing of the text. Divide it into sections and rate each as 'slow', 'appropriate', or 'fast'. Return JSON with a "sections" array and an "overallPacingAssessment".

Text:
${content}`;
    return getAIResponse(prompt, provider, 0.4);
}

export async function analyzePlotStructure(content: string, narrativeModel: string = 'Three-Act Structure', provider: AIProvider): Promise<PlotStructureAnalysis> {
    const prompt = `Analyze the plot structure of the text using the ${narrativeModel} model. Identify key plot points, strengths, and weaknesses. Return a JSON object with the analysis.

Text:
${content}`;
    return getAIResponse(prompt, provider, 0.4);
}

export async function analyzeThemesAndMotifs(content: string, provider: AIProvider): Promise<ThemeAnalysis> {
    const prompt = `Identify and analyze the major themes and recurring motifs in the text. Return a JSON object with a "themes" array and a "summary".

Text:
${content}`;
    return getAIResponse(prompt, provider, 0.4);
}

// New Analysis Functions
export async function analyzeReadability(content: string, provider: AIProvider): Promise<ReadabilityAnalysis> {
    const prompt = `Calculate the following readability scores for the text: Flesch Reading Ease, Flesch-Kincaid Grade Level, and Gunning Fog Index. Provide an interpretation and summary. Return a valid JSON object with the structure: {"scores": {"fleschReadingEase": ...}, "interpretation": {...}, "summary": "..."}

Text:
${content}`;
    return getAIResponse(prompt, provider, 0.1);
}

export async function analyzeDialogue(content: string, provider: AIProvider): Promise<DialogueAnalysis> {
    const prompt = `Analyze the dialogue in the text. Calculate the dialogue-to-narrative ratio, identify overused dialogue tags (like 'said'), and provide a speaker distribution. Return a valid JSON object with the analysis.

Text:
${content}`;
    return getAIResponse(prompt, provider, 0.4);
}

export async function analyzeClarity(content: string, provider: AIProvider): Promise<ClarityAnalysis> {
    const prompt = `Analyze the text for clichés, redundancies, and jargon. For each, provide a suggestion for improvement. Return a valid JSON object with arrays for "cliches", "redundancies", and "jargon".

Text:
${content}`;
    return getAIResponse(prompt, provider, 0.3);
}

export async function analyzeSentimentArc(content: string, provider: AIProvider): Promise<SentimentArcAnalysis> {
    const prompt = `Analyze the sentiment arc of the text. Divide the text into 10 equal segments. For each segment, provide a sentiment score from -1.0 (very negative) to 1.0 (very positive) and a justification. Return a valid JSON object with a "sentimentArc" array.

Text:
${content}`;
    return getAIResponse(prompt, provider, 0.4);
}

export async function analyzeCharacterInteractions(content: string, provider: AIProvider): Promise<CharacterInteractionAnalysis> {
    const prompt = `Map the interactions between characters in the text. Identify all characters and describe the nature and frequency of their interactions. Return a valid JSON object with a list of "characters" and an "interactions" array.

Text:
${content}`;
    return getAIResponse(prompt, provider, 0.5);
}

export async function generatePromptSuggestions(content: string, context?: string): Promise<string[]> {
  const prompt = `Based on the following text content, suggest 5 specific, actionable editing prompts that would improve the writing. Consider both developmental and line editing aspects.

Content:
${content}

${context ? `Context: ${context}` : ''}

Provide 5 different editing prompts as a JSON object with a single key "suggestions" containing an array of strings. Example: {"suggestions": ["prompt1", "prompt2"]}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const result = parseAIResponseJSON(response.choices[0].message.content || '{}');
  return result.suggestions || [];
}

export async function reviewChangesWithInstructions(
  changes: any[],
  instructions: string,
  provider: AIProvider = 'openai'
): Promise<any[]> {
  const prompt = `You are an executive editor. Your task is to review a list of proposed changes to a document and decide whether to "accept" or "reject" each one based on a provided style guide.

Here is the style guide with the instructions to follow:
---
${instructions}
---

Here is the list of proposed changes in JSON format. For each change, analyze it against the style guide and update its "status" field to either "accepted" or "rejected". Do not modify any other fields.

Proposed Changes:
${JSON.stringify(changes, null, 2)}

Return the complete, updated list of changes in the exact same JSON format, with only the "status" field modified for each change according to your review. The JSON response must contain a single key "changes" which is an array of the updated change objects.`;

  const result = await getAIResponse(prompt, provider, 0.1);
  return result.changes || changes;
}

// AI Cross-Verification Functions
export async function crossVerifyAnalysis(
  originalAnalysis: any,
  analysisType: string,
  content: string,
  primaryProvider: AIProvider,
  verificationProvider: AIProvider
): Promise<any> {
  const prompt = `You are a senior editorial analyst reviewing another AI's analysis. Your task is to verify, critique, and enhance the provided analysis.

Analysis Type: ${analysisType}

Original Content:
${content}

AI Analysis to Review:
${JSON.stringify(originalAnalysis, null, 2)}

Instructions:
1. Verify the accuracy of the original analysis
2. Identify any errors, omissions, or weaknesses
3. Enhance the analysis with additional insights
4. Maintain the same JSON structure but improve the content
5. Add a "verificationNotes" field explaining your changes

Return the enhanced analysis in the same JSON format with improvements and verification notes.`;

  return await getAIResponse(prompt, verificationProvider, 0.3);
}

export async function multiProviderConsensus(
  content: string,
  analysisType: string,
  analysisFunction: Function,
  providers: AIProvider[] = ['openai', 'google', 'anthropic']
): Promise<any> {
  const analyses = [];
  
  // Get analysis from multiple providers
  for (const provider of providers) {
    try {
      const analysis = await analysisFunction(content, provider);
      analyses.push({ provider, analysis });
    } catch (error) {
      console.error(`${provider} analysis failed:`, error);
    }
  }

  if (analyses.length === 0) {
    throw new Error('All AI providers failed to complete analysis');
  }

  if (analyses.length === 1) {
    return analyses[0].analysis;
  }

  // Create consensus analysis
  const consensusPrompt = `You are a master editor synthesizing multiple AI analyses into a single, authoritative result.

Analysis Type: ${analysisType}

Original Content:
${content}

Multiple AI Analyses:
${JSON.stringify(analyses, null, 2)}

Instructions:
1. Compare all analyses for accuracy and completeness
2. Identify areas of agreement and disagreement
3. Synthesize the best insights from each analysis
4. Resolve conflicts using your editorial judgment
5. Create a comprehensive, authoritative final analysis
6. Include a "consensusNotes" field explaining your methodology

Return the final consensus analysis in the standard JSON format.`;

  return await getAIResponse(consensusPrompt, 'openai', 0.2);
}

export async function enhancedAnalysisWithVerification(
  content: string,
  analysisType: string,
  analysisFunction: Function,
  primaryProvider: AIProvider = 'openai',
  verificationProvider: AIProvider = 'anthropic'
): Promise<any> {
  // Get initial analysis
  const initialAnalysis = await analysisFunction(content, primaryProvider);
  
  // Cross-verify and enhance
  const verifiedAnalysis = await crossVerifyAnalysis(
    initialAnalysis,
    analysisType,
    content,
    primaryProvider,
    verificationProvider
  );

  return {
    ...verifiedAnalysis,
    metadata: {
      primaryProvider,
      verificationProvider,
      analysisType,
      timestamp: new Date().toISOString()
    }
  };
}