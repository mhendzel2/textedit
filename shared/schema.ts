import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  originalContent: text("original_content"),
  mimeType: text("mime_type").default("text/plain"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const revisions = pgTable("revisions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id),
  content: text("content").notNull(),
  changes: jsonb("changes").$type<Change[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  isAccepted: boolean("is_accepted").default(false),
});

export const changes = pgTable("changes", {
  id: serial("id").primaryKey(),
  revisionId: integer("revision_id").notNull().references(() => revisions.id),
  type: text("type").notNull(), // 'addition', 'deletion', 'modification'
  lineNumber: integer("line_number").notNull(),
  content: text("content").notNull(),
  originalContent: text("original_content"),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'rejected'
  createdAt: timestamp("created_at").defaultNow(),
});

export type Change = {
  id: string;
  type: 'addition' | 'deletion' | 'modification';
  lineNumber: number;
  content: string;
  originalContent?: string;
  status: 'pending' | 'accepted' | 'rejected';
};

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRevisionSchema = createInsertSchema(revisions).omit({
  id: true,
  createdAt: true,
});

export const insertChangeSchema = createInsertSchema(changes).omit({
  id: true,
  createdAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertRevision = z.infer<typeof insertRevisionSchema>;
export type InsertChange = z.infer<typeof insertChangeSchema>;

export type Document = typeof documents.$inferSelect;
export type Revision = typeof revisions.$inferSelect;
export type ChangeRecord = typeof changes.$inferSelect;

// --- Added Analysis Result Types ---

export interface MetaphorAnalysis {
  metaphors: Array<{
    text: string;
    type: string;
    frequency: number;
    contexts: string[];
    suggestions: string[];
  }>;
  summary: string;
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

// --- New Analysis Types ---

export interface ReadabilityAnalysis {
    scores: {
        fleschReadingEase: number;
        fleschKincaidGradeLevel: number;
        gunningFog: number;
        smogIndex: number;
        colemanLiauIndex: number;
    };
    interpretation: {
        readingEase: string;
        gradeLevel: string;
    };
    summary: string;
}

export interface DialogueAnalysis {
    dialogueToNarrativeRatio: {
        dialogue: number;
        narrative: number;
    };
    dialogueTagAnalysis: {
        overusedTags: Array<{ tag: string; count: number; alternatives: string[] }>;
        varietyScore: number; // 0-100
    };
    speakerDistribution: Array<{
        character: string;
        lineCount: number;
    }>;
    summary: string;
}

export interface ClarityAnalysis {
    cliches: Array<{ cliche: string; suggestion: string }>;
    redundancies: Array<{ phrase: string; suggestion: string }>;
    jargon: Array<{ term: string; explanation: string; suggestion: string }>;
    summary: string;
}

export interface SentimentArcAnalysis {
    sentimentArc: Array<{
        segment: number;
        score: number; // -1 (negative) to 1 (positive)
        textSample: string;
        justification: string;
    }>;
    summary: string;
}

export interface CharacterInteractionAnalysis {
    characters: string[];
    interactions: Array<{
        characters: [string, string];
        interactionType: 'positive' | 'negative' | 'neutral' | 'conflict' | 'cooperation';
        frequency: number;
        keyMoments: string[];
    }>;
    summary: string;
}



// Zod Schemas for validation
export const ReadabilityAnalysisSchema = z.object({
  scores: z.object({
    fleschReadingEase: z.number(),
    fleschKincaidGradeLevel: z.number(),
    gunningFog: z.number(),
    smogIndex: z.number(),
    colemanLiauIndex: z.number(),
  }),
  interpretation: z.object({
    readingEase: z.string(),
    gradeLevel: z.string(),
  }),
  summary: z.string(),
});

export const DialogueAnalysisSchema = z.object({
  dialogueToNarrativeRatio: z.object({
    dialogue: z.number(),
    narrative: z.number(),
  }),
  dialogueTagAnalysis: z.object({
    overusedTags: z.array(z.object({ tag: z.string(), count: z.number(), alternatives: z.array(z.string()) })),
    varietyScore: z.number(),
  }),
  speakerDistribution: z.array(z.object({
    character: z.string(),
    lineCount: z.number(),
  })),
  summary: z.string(),
});

export const ClarityAnalysisSchema = z.object({
  cliches: z.array(z.object({ cliche: z.string(), suggestion: z.string() })),
  redundancies: z.array(z.object({ phrase: z.string(), suggestion: z.string() })),
  jargon: z.array(z.object({ term: z.string(), explanation: z.string(), suggestion: z.string() })),
  summary: z.string(),
});

export const SentimentArcAnalysisSchema = z.object({
  sentimentArc: z.array(z.object({
    segment: z.number(),
    sentimentScore: z.number(),
    justification: z.string(),
  })),
  overallTrend: z.string(),
  summary: z.string(),
});

export const CharacterInteractionAnalysisSchema = z.object({
  characters: z.array(z.string()),
  interactions: z.array(z.object({
    character1: z.string(),
    character2: z.string(),
    nature: z.string(),
    frequency: z.number(),
    examples: z.array(z.string()),
  })),
  summary: z.string(),
});

// Creative Writing Schemas
export const NovelSkeletonSchema = z.object({
  title: z.string(),
  logline: z.string(),
  themes: z.array(z.string()),
  characters: z.array(z.object({
    name: z.string(),
    description: z.string(),
    motivation: z.string(),
  })),
  plotPoints: z.array(z.object({
    act: z.string(),
    point: z.string(),
    description: z.string(),
  })),
});
export type NovelSkeleton = z.infer<typeof NovelSkeletonSchema>;

export const ChapterOutlineSchema = z.object({
  chapter: z.number(),
  title: z.string(),
  summary: z.string(),
  scenes: z.array(z.object({
    scene: z.number(),
    setting: z.string(),
    characters: z.array(z.string()),
    action: z.string(),
  })),
});
export type ChapterOutline = z.infer<typeof ChapterOutlineSchema>;
