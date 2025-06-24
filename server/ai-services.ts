import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CohereClient } from "cohere-ai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

const anthropic = new Anthropic({ 
  apiKey: process.env.ANTHROPIC_API_KEY 
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

const cohere = new CohereClient({ 
  token: process.env.COHERE_API_KEY 
});

function parseAIResponseJSON(responseText: string): any {
  try {
    // Remove markdown code blocks if present
    const cleanedText = responseText.replace(/^```json\s*|```\s*$/g, '');
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("AI response JSON parsing error:", e);
    console.error("Raw response:", responseText);
    throw new Error('Failed to parse AI response as JSON');
  }
}

export interface EditRequest {
  content: string;
  instructions: string;
  editType: 'developmental' | 'line';
}

export interface EditResponse {
  editedContent: string;
  changes: Array<{
    type: 'addition' | 'deletion' | 'modification';
    lineNumber: number;
    content: string;
    originalContent?: string;
    explanation: string;
  }>;
  summary: string;
}

export async function performDevelopmentalEdit(
  content: string, 
  instructions: string,
  provider: 'openai' | 'google' = 'openai'
): Promise<EditResponse> {
  const prompt = `You are a professional developmental editor. Your task is to improve the following text according to the detailed editing instructions provided. 

The instructions may come from:
- A developmental editing style guide document
- Specific editing criteria from a PDF or text file
- Custom editing requirements

Focus on applying these instructions precisely:

1. Overall structure and organization
2. Clarity and flow of ideas
3. Content development and depth
4. Audience appropriateness
5. Coherence and logical progression
6. Any specific criteria mentioned in the instructions

Original text to edit:
${content}

Detailed editing instructions:
${instructions}

Apply these instructions systematically to improve the text. Format your response as JSON with the following structure:
{
  "editedContent": "your edited version here",
  "changes": [
    {
      "type": "addition|deletion|modification",
      "lineNumber": number,
      "content": "new or changed content",
      "originalContent": "original content if modified/deleted",
      "explanation": "brief explanation of why this change was made according to the instructions"
    }
  ],
  "summary": "overall summary of the developmental changes made based on the provided instructions"
}`;

  if (provider === 'openai') {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } else {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Invalid response format from Gemini');
  }
}

export async function performLineEdit(
  content: string, 
  instructions: string,
  provider: 'openai' | 'google' = 'openai'
): Promise<EditResponse> {
  const prompt = `You are a professional line editor. Your task is to improve the following text at the sentence and paragraph level according to the given instructions. Focus on:

1. Grammar, punctuation, and syntax
2. Word choice and precision
3. Sentence structure and variety
4. Tone and voice consistency
5. Readability and flow

Original text:
${content}

Instructions:
${instructions}

Please provide your edited version and track all changes made. Format your response as JSON with the following structure:
{
  "editedContent": "your line-edited version here",
  "changes": [
    {
      "type": "addition|deletion|modification",
      "lineNumber": number,
      "content": "new or changed content",
      "originalContent": "original content if modified/deleted",
      "explanation": "brief explanation of the grammatical/stylistic improvement"
    }
  ],
  "summary": "overall summary of the line editing changes made"
}`;

  if (provider === 'openai') {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } else {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Invalid response format from Gemini');
  }
}

export async function generatePromptSuggestions(
  content: string,
  context?: string
): Promise<string[]> {
  const prompt = `Based on the following text content, suggest 5 specific, actionable editing prompts that would improve the writing. Consider both developmental and line editing aspects.

Content:
${content}

${context ? `Context: ${context}` : ''}

Provide 5 different editing prompts as a JSON array of strings:`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  return result.suggestions || [];
}

export interface CharacterVoiceAnalysis {
  characterAnalyses: Array<{
    characterName: string;
    voiceDescription: string;
    consistentLines: string[];
    inconsistentLines: Array<{
      line: string;
      reason: string;
      suggestion?: string;
    }>;
  }>;
  summary: string;
}

export interface WorldBuildingAnalysis {
  consistentElements: Array<{ element: string; description: string; examples: string[] }>;
  inconsistencies: Array<{ item: string; description: string; locationInText: string }>;
  underdevelopedAreas: Array<{ area: string; suggestion: string }>;
  summary: string;
}

export interface PacingAnalysis {
  sections: Array<{
    description: string;
    paceRating: 'slow' | 'appropriate' | 'fast';
    comment: string;
    suggestions?: string[];
  }>;
  overallPacingAssessment: string;
  summary: string;
}

export interface PlotStructureAnalysis {
  identifiedPlotPoints: Array<{ pointName: string; description: string; locationInText: string }>;
  strengths: string[];
  weaknesses: string[];
  comparisonToModel?: { modelName: string; alignmentNotes: string };
  summary: string;
}

export interface ThemeAnalysis {
  themes: Array<{
    themeName: string;
    description: string;
    occurrences: Array<{ text: string; locationInText: string }>;
    developmentAssessment: string;
  }>;
  summary: string;
}

export async function analyzeMetaphors(content: string): Promise<{
  metaphors: Array<{
    text: string;
    type: string;
    frequency: number;
    contexts: string[];
    suggestions: string[];
  }>;
  summary: string;
}> {
  const prompt = `Analyze the following text for repeated metaphors and figurative language. Identify:
1. Metaphors that appear multiple times throughout the text
2. Similar metaphorical concepts or imagery
3. Overused comparisons or descriptions
4. Suggestions for variation or improvement

Content:
${content}

Return your analysis in this JSON format:
{
  "metaphors": [
    {
      "text": "exact metaphor phrase",
      "type": "metaphor type (e.g., 'animal imagery', 'weather metaphor')",
      "frequency": number of occurrences,
      "contexts": ["surrounding context for each occurrence"],
      "suggestions": ["alternative metaphors", "variation suggestions"]
    }
  ],
  "summary": "brief summary of metaphor usage patterns"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      metaphors: result.metaphors || [],
      summary: result.summary || "No analysis available"
    };
  } catch (error) {
    console.error('OpenAI metaphor analysis failed, trying Google AI:', error);
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const parsed = JSON.parse(text);
      return {
        metaphors: parsed.metaphors || [],
        summary: parsed.summary || "No analysis available"
      };
    } catch (geminiError) {
      console.error('Google AI metaphor analysis failed:', geminiError);
      throw new Error('Metaphor analysis failed with both AI services');
    }
  }
}

export async function analyzeCharacterVoice(
  content: string,
  characterNames: string[],
  provider: 'openai' | 'google' = 'openai'
): Promise<CharacterVoiceAnalysis> {
  const prompt = `You are a literary analyst. Analyze the provided text for character voice consistency for the specified characters: ${characterNames.join(', ')}.
  For each character, describe their voice (vocabulary, tone, sentence structure, typical expressions).
  Identify lines of dialogue that seem inconsistent with their established voice and explain why. Suggest improvements if possible.

  Text:
  ${content}

  Return your analysis *strictly* in this JSON format:
  {
    "characterAnalyses": [
      {
        "characterName": "string",
        "voiceDescription": "string",
        "consistentLines": ["example dialogue line 1", "example dialogue line 2"],
        "inconsistentLines": [
          {
            "line": "inconsistent dialogue line",
            "reason": "explanation of inconsistency",
            "suggestion": "optional improved line"
          }
        ]
      }
    ],
    "summary": "Overall summary of character voice consistency and key findings."
  }`;

  if (provider === 'openai') {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });
    return JSON.parse(response.choices[0].message.content || '{}');
  } else {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    try {
      const cleanedText = responseText.replace(/^```json\s*|```\s*$/g, '');
      return JSON.parse(cleanedText);
    } catch (e) {
      console.error("Gemini JSON parsing error:", e);
      throw new Error('Character voice analysis failed');
    }
  }
}

export async function checkWorldBuildingConsistency(
  content: string,
  worldRules: string,
  provider: 'openai' | 'google' = 'openai'
): Promise<WorldBuildingAnalysis> {
  const prompt = `You are a world-building consultant. Analyze the provided text for consistency with the established world rules.

  World Rules:
  ${worldRules}

  Text to analyze:
  ${content}

  Return your analysis *strictly* in this JSON format:
  {
    "consistentElements": [
      {
        "element": "element name",
        "description": "how it's consistent",
        "examples": ["example 1", "example 2"]
      }
    ],
    "inconsistencies": [
      {
        "item": "inconsistent element",
        "description": "how it's inconsistent",
        "locationInText": "brief excerpt from text"
      }
    ],
    "underdevelopedAreas": [
      {
        "area": "area that needs development",
        "suggestion": "how to improve it"
      }
    ],
    "summary": "Overall assessment of world-building consistency."
  }`;

  if (provider === 'openai') {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    return JSON.parse(response.choices[0].message.content || '{}');
  } else {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    try {
      const cleanedText = responseText.replace(/^```json\s*|```\s*$/g, '');
      return JSON.parse(cleanedText);
    } catch (e) {
      console.error("Gemini JSON parsing error:", e);
      throw new Error('World-building analysis failed');
    }
  }
}

export async function analyzePacing(
  content: string,
  provider: 'openai' | 'google' = 'openai'
): Promise<PacingAnalysis> {
  const prompt = `You are a narrative pacing expert. Analyze the provided text for pacing issues and flow.

  Text:
  ${content}

  Return your analysis *strictly* in this JSON format:
  {
    "sections": [
      {
        "description": "section description (e.g., 'Opening scene', 'Chapter 2')",
        "paceRating": "slow|appropriate|fast",
        "comment": "detailed comment about the pacing",
        "suggestions": ["suggestion 1", "suggestion 2"]
      }
    ],
    "overallPacingAssessment": "Overall pacing evaluation",
    "summary": "Summary of pacing analysis and recommendations."
  }`;

  if (provider === 'openai') {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });
    if (!response.choices[0].message.content) {
        throw new Error('OpenAI response content is empty for pacing analysis.');
    }
    return JSON.parse(response.choices[0].message.content);
  } else {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    return parseAIResponseJSON(responseText);
  }
}

export async function analyzePlotStructure(
  content: string,
  narrativeModel?: string,
  provider: 'openai' | 'google' = 'openai'
): Promise<PlotStructureAnalysis> {
  const modelInfo = narrativeModel ? `Use the ${narrativeModel} narrative model as reference.` : 'Use standard narrative structure analysis.';
  
  const prompt = `You are a plot structure analyst. Analyze the provided text for narrative structure and plot development. ${modelInfo}

  Text:
  ${content}

  Return your analysis *strictly* in this JSON format:
  {
    "identifiedPlotPoints": [
      {
        "pointName": "plot point name (e.g., 'Inciting Incident')",
        "description": "description of this plot point",
        "locationInText": "brief excerpt where this occurs"
      }
    ],
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "comparisonToModel": {
      "modelName": "${narrativeModel || 'Three-Act Structure'}",
      "alignmentNotes": "how well the text aligns with this model"
    },
    "summary": "Overall plot structure assessment and recommendations."
  }`;

  if (provider === 'openai') {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });
    if (!response.choices[0].message.content) {
        throw new Error('OpenAI response content is empty for plot structure analysis.');
    }
    return JSON.parse(response.choices[0].message.content);
  } else {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    return parseAIResponseJSON(responseText);
  }
}

export async function analyzeThemesAndMotifs(
  content: string,
  provider: 'openai' | 'google' = 'openai'
): Promise<ThemeAnalysis> {
  const prompt = `You are a literary theme analyst. Analyze the provided text for themes, motifs, and symbolic elements.

  Text:
  ${content}

  Return your analysis *strictly* in this JSON format:
  {
    "themes": [
      {
        "themeName": "theme name",
        "description": "detailed description of the theme",
        "occurrences": [
          {
            "text": "relevant excerpt from text",
            "locationInText": "context or chapter/section reference"
          }
        ],
        "developmentAssessment": "how well this theme is developed"
      }
    ],
    "summary": "Overall thematic analysis and recommendations."
  }`;

  if (provider === 'openai') {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });
    return JSON.parse(response.choices[0].message.content || '{}');
  } else {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    try {
      const cleanedText = responseText.replace(/^```json\s*|```\s*$/g, '');
      return JSON.parse(cleanedText);
    } catch (e) {
      console.error("Gemini JSON parsing error:", e);
      throw new Error('Theme analysis failed');
    }
  }
}

async function getAIResponse(prompt: string, provider: 'openai' | 'google' | 'anthropic', temperature: number, useJsonFormat: boolean = true) {
    if (provider === 'openai') {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            response_format: useJsonFormat ? { type: "json_object" } : undefined,
            temperature,
        });
        return parseAIResponseJSON(response.choices[0].message.content || '{}');
    } else if (provider === 'google') {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return parseAIResponseJSON(response.text());
    } else { // anthropic
        const response = await anthropic.messages.create({
            model: "claude-3-opus-20240229",
            max_tokens: 4096,
            messages: [{ role: "user", content: prompt }],
            temperature,
        });
        const textContent = response.content.find(block => block.type === 'text');
        return parseAIResponseJSON(textContent ? textContent.text : '{}');
    }
}

export async function reviewChangesWithInstructions(
  changes: any[],
  instructions: string,
  provider: 'openai' | 'google' | 'anthropic' = 'openai'
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

  const response = await getAIResponse(prompt, provider, 0.1);
  return response.changes || changes;
}

export async function analyzeReadability(params: { content: string, provider: any }): Promise<any> {
  const prompt = `Calculate readability scores for the following text. Provide Flesch Reading Ease, Flesch-Kincaid Grade Level, Gunning Fog Index, SMOG Index, and Coleman-Liau Index. Include interpretation and summary.

Text: ${params.content}

Return a valid JSON object with this structure:
{
  "scores": {
    "fleschReadingEase": 65.0,
    "fleschKincaidGradeLevel": 8.2,
    "gunningFog": 9.1,
    "smogIndex": 7.8,
    "colemanLiauIndex": 8.5
  },
  "interpretation": {
    "readingEase": "Standard readability",
    "gradeLevel": "8th-9th grade level"
  },
  "summary": "Analysis of text readability and accessibility"
}`;

  return getAIResponse(prompt, params.provider, 0.1);
}

export async function analyzeDialogue(params: { content: string, provider: any }): Promise<any> {
  const prompt = `Analyze dialogue in the following text. Calculate dialogue-to-narrative ratio, identify overused dialogue tags, analyze speaker distribution, and provide variety score.

Text: ${params.content}

Return a valid JSON object with this structure:
{
  "dialogueToNarrativeRatio": {
    "dialogue": 40,
    "narrative": 60
  },
  "dialogueTagAnalysis": {
    "overusedTags": [
      {
        "tag": "said",
        "count": 25,
        "alternatives": ["replied", "stated", "mentioned"]
      }
    ],
    "varietyScore": 75
  },
  "speakerDistribution": [
    {
      "character": "Alice",
      "lineCount": 15
    }
  ],
  "summary": "Analysis of dialogue quality and distribution"
}`;

  return getAIResponse(prompt, params.provider, 0.1);
}

export async function analyzeClarity(params: { content: string, provider: any }): Promise<any> {
  const prompt = `Analyze the text for clarity issues including clichés, redundancies, and jargon. Provide suggestions for improvement.

Text: ${params.content}

Return a valid JSON object with this structure:
{
  "cliches": [
    {
      "cliche": "time will tell",
      "suggestion": "be more specific about timeline"
    }
  ],
  "redundancies": [
    {
      "phrase": "completely and utterly",
      "suggestion": "use either 'completely' or 'utterly'"
    }
  ],
  "jargon": [
    {
      "term": "synergistic optimization",
      "explanation": "business buzzword",
      "suggestion": "working together effectively"
    }
  ],
  "summary": "Analysis of text clarity and conciseness"
}`;

  return getAIResponse(prompt, params.provider, 0.1);
}

export async function analyzeSentimentArc(params: { content: string, provider: any }): Promise<any> {
  const prompt = `Analyze the sentiment arc of the following text. Divide into 10 equal segments and score each from -1.0 (very negative) to 1.0 (very positive).

Text: ${params.content}

Return a valid JSON object with this structure:
{
  "sentimentArc": [
    {
      "segment": 1,
      "score": 0.2,
      "textSample": "Opening scene excerpt",
      "justification": "Slightly positive tone with hopeful elements"
    }
  ],
  "summary": "Analysis of emotional trajectory throughout the text"
}`;

  return getAIResponse(prompt, params.provider, 0.1);
}