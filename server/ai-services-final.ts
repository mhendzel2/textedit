import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Change, CharacterVoiceAnalysis, MetaphorAnalysis, PacingAnalysis, PlotStructureAnalysis, ThemeAnalysis, WorldBuildingAnalysis } from "@shared/schema";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

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

export interface EditResponse {
  editedContent: string;
  changes: Change[];
  summary: string;
}

export async function performDevelopmentalEdit(
  content: string, 
  instructions: string,
  provider: 'openai' | 'google' = 'openai'
): Promise<EditResponse> {
  const prompt = `You are a professional developmental editor. Your task is to improve the following text according to the detailed editing instructions provided. 

The instructions may come from:
- A developmental editing style guide document (PDF/TXT)
- Specific editing criteria from uploaded instruction files
- Custom editing requirements

Focus on applying these instructions precisely:

1. Overall structure and organization
2. Clarity and flow of ideas
3. Content development and depth
4. Audience appropriateness
5. Coherence and logical progression
6. Any specific criteria mentioned in the instruction document

Original text to edit:
${content}

Detailed editing instructions from uploaded document:
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
  "summary": "overall summary of the developmental changes made based on the provided instruction document"
}`;

  if (provider === 'openai') {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    return parseAIResponseJSON(response.choices[0].message.content || '{}');
  } else {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return parseAIResponseJSON(response.text());
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

Instructions (may be from uploaded style guide):
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
    return parseAIResponseJSON(response.choices[0].message.content || '{}');
  } else {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return parseAIResponseJSON(response.text());
  }
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
  provider: 'openai' | 'google' = 'openai'
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

  if (provider === 'openai') {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });
    const result = parseAIResponseJSON(response.choices[0].message.content || '{}');
    return result.changes || changes;
  } else {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const parsed = parseAIResponseJSON(response.text());
    return parsed.changes || changes;
  }
}

// Literary analysis functions with fallback support
export async function analyzeMetaphors(content: string, provider: 'openai' | 'google' = 'openai'): Promise<MetaphorAnalysis> {
  const prompt = `Analyze the following text for repeated metaphors and figurative language. Identify patterns, frequency, and effectiveness.

Text to analyze:
${content}

Provide your analysis as a JSON object with this structure:
{
  "metaphors": [
    {
      "text": "the actual metaphorical phrase",
      "type": "type of metaphor (e.g., 'nature metaphor', 'war metaphor')",
      "frequency": number_of_occurrences,
      "contexts": ["context1", "context2"],
      "suggestions": ["improvement1", "improvement2"]
    }
  ],
  "summary": "overall analysis of metaphor usage and patterns"
}`;

  try {
    if (provider === 'openai') {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });
      return parseAIResponseJSON(response.choices[0].message.content || '{}');
    } else {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return parseAIResponseJSON(response.text());
    }
  } catch (error) {
    console.error(`${provider} metaphor analysis failed:`, error);
    throw new Error(`Metaphor analysis failed with ${provider} provider`);
  }
}

export async function analyzeCharacterVoice(
  content: string,
  characterNames: string[],
  provider: 'openai' | 'google' = 'openai'
): Promise<CharacterVoiceAnalysis> {
  const prompt = `You are a literary analyst. Analyze the provided text for character voice consistency for the specified characters: ${characterNames.join(', ')}.

For each character, identify:
1. Unique voice characteristics (vocabulary, sentence structure, tone)
2. Consistent dialogue examples
3. Any inconsistencies in voice
4. Suggestions for improvement

Text to analyze:
${content}

Provide your analysis as a JSON object with this structure:
{
  "characterAnalyses": [
    {
      "characterName": "character name",
      "voiceDescription": "description of their unique voice",
      "consistentLines": ["example1", "example2"],
      "inconsistentLines": [
        {
          "line": "problematic dialogue",
          "reason": "explanation of inconsistency",
          "suggestion": "how to fix it"
        }
      ]
    }
  ],
  "summary": "overall assessment of character voice consistency"
}`;

  try {
    if (provider === 'openai') {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });
      return parseAIResponseJSON(response.choices[0].message.content || '{}');
    } else {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return parseAIResponseJSON(response.text());
    }
  } catch (error) {
    console.error(`${provider} character voice analysis failed:`, error);
    throw new Error(`Character voice analysis failed with ${provider} provider`);
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

Identify:
1. Elements that are consistent with the world rules
2. Any inconsistencies or contradictions
3. Underdeveloped areas that need more detail

Provide your analysis as a JSON object with this structure:
{
  "consistentElements": [
    {
      "element": "world element name",
      "description": "how it's portrayed",
      "examples": ["example1", "example2"]
    }
  ],
  "inconsistencies": [
    {
      "item": "inconsistent element",
      "description": "what the inconsistency is",
      "locationInText": "where it appears"
    }
  ],
  "underdevelopedAreas": [
    {
      "area": "area needing development",
      "suggestion": "how to improve it"
    }
  ],
  "summary": "overall world-building assessment"
}`;

  try {
    if (provider === 'openai') {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });
      return parseAIResponseJSON(response.choices[0].message.content || '{}');
    } else {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return parseAIResponseJSON(response.text());
    }
  } catch (error) {
    console.error(`${provider} world-building analysis failed:`, error);
    throw new Error(`World-building analysis failed with ${provider} provider`);
  }
}

export async function analyzePacing(
  content: string,
  provider: 'openai' | 'google' = 'openai'
): Promise<PacingAnalysis> {
  const prompt = `You are a narrative pacing expert. Analyze the provided text for pacing issues and flow.

Text to analyze:
${content}

Evaluate:
1. Scene and chapter pacing
2. Dialogue vs. action balance
3. Information dumps or rushed sections
4. Overall narrative rhythm

Provide your analysis as a JSON object with this structure:
{
  "sections": [
    {
      "description": "section identifier",
      "paceRating": "slow|appropriate|fast",
      "comment": "detailed assessment",
      "suggestions": ["suggestion1", "suggestion2"]
    }
  ],
  "overallPacingAssessment": "general pacing evaluation",
  "summary": "key pacing insights and recommendations"
}`;

  try {
    if (provider === 'openai') {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });
      return parseAIResponseJSON(response.choices[0].message.content || '{}');
    } else {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return parseAIResponseJSON(response.text());
    }
  } catch (error) {
    console.error(`${provider} pacing analysis failed:`, error);
    throw new Error(`Pacing analysis failed with ${provider} provider`);
  }
}

export async function analyzePlotStructure(
  content: string,
  narrativeModel?: string,
  provider: 'openai' | 'google' = 'openai'
): Promise<PlotStructureAnalysis> {
  const modelInfo = narrativeModel ? `Use the ${narrativeModel} narrative model as reference.` : 'Use standard narrative structure analysis.';
  
  const prompt = `You are a plot structure analyst. Analyze the provided text for narrative structure and plot development. ${modelInfo}

Text to analyze:
${content}

Identify:
1. Key plot points (inciting incident, rising action, climax, etc.)
2. Structural strengths and weaknesses
3. How well it aligns with the narrative model

Provide your analysis as a JSON object with this structure:
{
  "identifiedPlotPoints": [
    {
      "pointName": "plot point name",
      "description": "what happens",
      "locationInText": "where it occurs"
    }
  ],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "comparisonToModel": {
    "modelName": "${narrativeModel || 'Three-Act Structure'}",
    "alignmentNotes": "how well it follows the model"
  },
  "summary": "overall structural assessment"
}`;

  try {
    if (provider === 'openai') {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });
      return parseAIResponseJSON(response.choices[0].message.content || '{}');
    } else {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return parseAIResponseJSON(response.text());
    }
  } catch (error) {
    console.error(`${provider} plot structure analysis failed:`, error);
    throw new Error(`Plot structure analysis failed with ${provider} provider`);
  }
}

export async function analyzeThemesAndMotifs(
  content: string,
  provider: 'openai' | 'google' = 'openai'
): Promise<ThemeAnalysis> {
  const prompt = `You are a literary theme analyst. Analyze the provided text for themes, motifs, and symbolic elements.

Text to analyze:
${content}

Identify:
1. Major and minor themes
2. Recurring motifs and symbols
3. How themes are developed throughout the text

Provide your analysis as a JSON object with this structure:
{
  "themes": [
    {
      "themeName": "theme name",
      "description": "what the theme represents",
      "occurrences": [
        {
          "text": "relevant passage",
          "locationInText": "where it appears"
        }
      ],
      "developmentAssessment": "how well the theme is developed"
    }
  ],
  "summary": "overall thematic analysis and recommendations"
}`;

  try {
    if (provider === 'openai') {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });
      return parseAIResponseJSON(response.choices[0].message.content || '{}');
    } else {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return parseAIResponseJSON(response.text());
    }
  } catch (error) {
    console.error(`${provider} theme analysis failed:`, error);
    throw new Error(`Theme analysis failed with ${provider} provider`);
  }
}