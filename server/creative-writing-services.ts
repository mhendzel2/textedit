import { getAIResponse, AIProvider } from "./ai-services";
import { NovelSkeleton, ChapterOutline, NovelSkeletonSchema, ChapterOutlineSchema } from "@shared/schema";
import { z } from "zod";

export async function generateNovelSkeleton(
  concept: string,
  provider: AIProvider = 'openai'
): Promise<NovelSkeleton> {
  const prompt = `Based on the following high-level concept, generate a detailed novel skeleton. The skeleton should include a title, a logline, a list of main themes, character descriptions, and a breakdown of major plot points.

Concept: "${concept}"

Ensure the output is a valid JSON object with the structure defined by NovelSkeletonSchema.`;

  return await getAIResponse(prompt, provider, NovelSkeletonSchema, 0.7);
}

export async function generateChapterOutline(
  novelSkeleton: NovelSkeleton,
  chapterNumber: number,
  provider: AIProvider = 'openai'
): Promise<ChapterOutline> {
  const prompt = `Given the following novel skeleton, generate a detailed chapter outline for Chapter ${chapterNumber}. The outline should include a chapter title, a summary of the chapter, and a breakdown of scenes with settings, characters, and key actions.

Novel Skeleton:
${JSON.stringify(novelSkeleton, null, 2)}

Ensure the output is a valid JSON object with the structure defined by ChapterOutlineSchema.`;

  return await getAIResponse(prompt, provider, ChapterOutlineSchema, 0.6);
}

export async function generateChapterSample(
  chapterOutline: ChapterOutline,
  worldAnvil: string, // Sensory information and world-building rules
  provider: AIProvider = 'openai'
): Promise<{ sample: string }> {
  const prompt = `Write a 1-2 page sample of a chapter based on the provided outline and world-building information. The writing should be engaging, with a strong narrative voice, distinct character voices, rich sensory details from the world anvil, and emotional depth.

Chapter Outline:
${JSON.stringify(chapterOutline, null, 2)}

World Anvil (Sensory Details & Rules):
${worldAnvil}

Return the generated prose as a JSON object with a single key "sample" containing the text.`;

  return await getAIResponse(prompt, provider, z.object({ sample: z.string() }), 0.8);
}