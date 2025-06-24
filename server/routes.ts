import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import mammoth from "mammoth";
import { Packer, Document as DocxDocument, Paragraph, TextRun } from "docx";
import { storage } from "./storage";
import { insertDocumentSchema, insertRevisionSchema, insertChangeSchema, Change } from "@shared/schema";
import {
  performDevelopmentalEdit,
  performLineEdit,
  generatePromptSuggestions,
  analyzeMetaphors,
  analyzeCharacterVoice,
  checkWorldBuildingConsistency,
  analyzePacing,
  analyzePlotStructure,
  analyzeThemesAndMotifs,
  analyzeReadability,
  analyzeDialogue,
  analyzeClarity,
  analyzeSentimentArc,
  reviewChangesWithInstructions
} from "./ai-services";
import { z } from "zod";
import fs from "fs";
import path from "path";
import archiver from "archiver";

const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Accept DOCX files and text files
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/msword'
    ];
    
    const allowedExtensions = ['.docx', '.doc', '.txt'];
    const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Document routes
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const documentData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid document data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.put("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertDocumentSchema.partial().parse(req.body);
      const document = await storage.updateDocument(id, updateData);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid document data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDocument(id);
      if (!deleted) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // File upload route
  app.post("/api/documents/upload", (req, res) => {
    upload.single('file')(req, res, async (err) => {
      try {
        if (err) {
          console.error('Multer error:', err);
          return res.status(400).json({ message: err.message || "File upload error" });
        }

        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        console.log('File received:', {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        });

        let content = "";
        
        const fileExtension = req.file.originalname.toLowerCase().slice(req.file.originalname.lastIndexOf('.'));
        
        if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
            fileExtension === '.docx') {
          try {
            // Parse DOCX file using mammoth
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            content = result.value;
            console.log('DOCX content extracted, length:', content.length);
          } catch (docxError) {
            console.error('DOCX parsing error:', docxError);
            return res.status(400).json({ message: "Failed to parse DOCX file" });
          }
        } else if (req.file.mimetype === 'application/msword' || fileExtension === '.doc') {
          // For older DOC files, try to extract as text (limited support)
          content = req.file.buffer.toString('utf-8');
        } else {
          // Fallback for text files
          content = req.file.buffer.toString('utf-8');
        }
        
        if (!content.trim()) {
          return res.status(400).json({ message: "No readable content found in the file" });
        }
        
        const document = await storage.createDocument({
          name: req.file.originalname,
          content,
          originalContent: content,
          mimeType: req.file.mimetype || 'application/octet-stream',
        });

        console.log('Document created successfully:', document.id);
        res.status(201).json(document);
      } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ 
          message: "Failed to upload file", 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  });

  // Revision routes
  app.get("/api/documents/:id/revisions", async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const revisions = await storage.getRevisionsByDocument(documentId);
      res.json(revisions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch revisions" });
    }
  });

  app.post("/api/documents/:id/revisions", async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const revisionData = insertRevisionSchema.parse({
        ...req.body,
        documentId,
      });
      const revision = await storage.createRevision(revisionData);
      res.status(201).json(revision);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid revision data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create revision" });
    }
  });

  // Change routes
  app.get("/api/revisions/:id/changes", async (req, res) => {
    try {
      const revisionId = parseInt(req.params.id);
      const changes = await storage.getChangesByRevision(revisionId);
      res.json(changes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch changes" });
    }
  });

  app.post("/api/revisions/:id/changes", async (req, res) => {
    try {
      const revisionId = parseInt(req.params.id);
      const changeData = insertChangeSchema.parse({
        ...req.body,
        revisionId,
      });
      const change = await storage.createChange(changeData);
      res.status(201).json(change);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid change data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create change" });
    }
  });

  app.patch("/api/changes/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const change = await storage.updateChangeStatus(id, status);
      if (!change) {
        return res.status(404).json({ message: "Change not found" });
      }
      res.json(change);
    } catch (error) {
      res.status(500).json({ message: "Failed to update change status" });
    }
  });

  // Export document
  app.get("/api/documents/:id/export", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${document.name}"`);
      
      // For now, just return the text content
      // In a real implementation, you'd convert to DOCX format
      res.send(document.content);
    } catch (error) {
      res.status(500).json({ message: "Failed to export document" });
    }
  });

  // AI Editing routes
  app.post("/api/documents/:id/ai-edit", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { instructions, editType, provider = 'openai' } = req.body;
      
      if (!instructions || !editType) {
        return res.status(400).json({ message: "Instructions and editType are required" });
      }

      if (!['developmental', 'line'].includes(editType)) {
        return res.status(400).json({ message: "editType must be 'developmental' or 'line'" });
      }

      if (!['openai', 'google'].includes(provider)) {
        return res.status(400).json({ message: "provider must be 'openai' or 'google'" });
      }

      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      let editResponse;
      if (editType === 'developmental') {
        editResponse = await performDevelopmentalEdit(document.content, instructions, provider);
      } else {
        editResponse = await performLineEdit(document.content, instructions, provider);
      }

      // Create a new revision with the AI-generated changes
      const revision = await storage.createRevision({
        documentId: id,
        content: editResponse.editedContent,
        changes: editResponse.changes.map(change => ({
          id: Math.random().toString(36).substr(2, 9),
          type: change.type,
          lineNumber: change.lineNumber,
          content: change.content,
          originalContent: change.originalContent,
          status: 'pending'
        })),
        isAccepted: false,
      });

      res.json({
        revision,
        summary: editResponse.summary,
        changes: editResponse.changes
      });
    } catch (error) {
      console.error('AI editing error:', error);
      res.status(500).json({ message: "Failed to perform AI edit" });
    }
  });

  app.post("/api/documents/:id/prompt-suggestions", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { context } = req.body;

      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const suggestions = await generatePromptSuggestions(document.content, context);
      res.json({ suggestions });
    } catch (error) {
      console.error('Prompt suggestions error:', error);
      res.status(500).json({ message: "Failed to generate prompt suggestions" });
    }
  });

  // Export document to DOCX format
  app.get("/api/documents/:id/export/docx", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // For now, we'll export as plain text with DOCX headers
      // In a full implementation, you'd use a library like docx to create proper DOCX files
      const filename = document.name.replace(/\.[^/.]+$/, "") + ".docx";
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(document.content);
    } catch (error) {
      console.error('DOCX export error:', error);
      res.status(500).json({ message: "Failed to export document" });
    }
  });

  // Analyze document for repeated metaphors
  app.post("/api/documents/:id/analyze-metaphors", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const analysis = await analyzeMetaphors(document.content);
      res.json(analysis);
    } catch (error) {
      console.error('Metaphor analysis error:', error);
      res.status(500).json({ message: "Failed to analyze metaphors" });
    }
  });

  app.post("/api/documents/review-changes", async (req, res) => {
    try {
      const { changes, instructions, provider = 'openai' } = req.body;
      if (!changes || !instructions) return res.status(400).json({ message: "A list of changes and instructions are required." });
      const reviewedChanges = await reviewChangesWithInstructions(changes, instructions, provider);
      res.json({ reviewedChanges });
    } catch (error) {
      console.error('Automated review error:', error);
      res.status(500).json({ message: "Failed to perform automated review" });
    }
  });
  
  // Export document to DOCX format
  app.get("/api/documents/:id/export/docx", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      if (!document) return res.status(404).json({ message: "Document not found" });

      const doc = new DocxDocument({
          sections: [{
              children: document.content.split('\n').map(line => new Paragraph({ children: [new TextRun(line)] })),
          }],
      });

      const buffer = await Packer.toBuffer(doc);
      const filename = document.name.replace(/\.[^/.]+$/, "") + ".docx";

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      console.error('DOCX export error:', error);
      res.status(500).json({ message: "Failed to export document" });
    }
  });

  // Analysis routes
  const analysisEndpoints = [
    { type: 'metaphor', endpoint: 'analyze-metaphors', handler: analyzeMetaphors },
    { type: 'characterVoice', endpoint: 'analyze-character-voice', handler: analyzeCharacterVoice },
    { type: 'worldBuilding', endpoint: 'check-world-building', handler: checkWorldBuildingConsistency },
    { type: 'pacing', endpoint: 'analyze-pacing', handler: analyzePacing },
    { type: 'plotStructure', endpoint: 'analyze-plot-structure', handler: analyzePlotStructure },
    { type: 'theme', endpoint: 'analyze-themes', handler: analyzeThemesAndMotifs }
  ];

  analysisEndpoints.forEach(({ type, endpoint, handler }) => {
    app.post(`/api/documents/:id/${endpoint}`, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const document = await storage.getDocument(id);
        if (!document) return res.status(404).json({ message: "Document not found" });
        // @ts-ignore
        const analysis = await handler(document.content, ...Object.values(req.body));
        res.json(analysis);
      } catch (error) {
        console.error(`${type} analysis error:`, error);
        res.status(500).json({ message: `Failed to analyze ${type}` });
      }
    });
  });

  // Download complete project package for local debugging
  app.get("/api/download-package", async (req, res) => {
    try {
      
      // Set response headers
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="texteditor-pro-complete.zip"');
      
      // Create archiver instance
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      // Handle archiver events
      archive.on('error', (err: any) => {
        console.error('Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: "Failed to create download package" });
        }
      });
      
      // Pipe archive to response
      archive.pipe(res);
      
      // Add root configuration files
      const rootFiles = [
        'package.json',
        'package-lock.json', 
        'tsconfig.json',
        'vite.config.ts',
        'tailwind.config.ts',
        'postcss.config.js',
        'components.json',
        'drizzle.config.ts'
      ];
      
      rootFiles.forEach(file => {
        if (fs.existsSync(file)) {
          archive.file(file, { name: file });
        }
      });
      
      // Add source directories
      if (fs.existsSync('client')) {
        archive.directory('client/', 'client/');
      }
      if (fs.existsSync('server')) {
        archive.directory('server/', 'server/');
      }
      if (fs.existsSync('shared')) {
        archive.directory('shared/', 'shared/');
      }
      
      // Add comprehensive README
      archive.append(`# TextEdit Pro - Local Debug Package

A specialized text editor for prompt development with advanced document handling and collaborative workflow tools.

## Quick Start

1. Extract this package to a directory
2. Install dependencies: \`npm install\`
3. Copy \`.env.example\` to \`.env\` and add your API keys
4. Start development server: \`npm run dev\`
5. Open http://localhost:5000

## Required API Keys

### OpenAI API Key
1. Visit https://platform.openai.com/account/api-keys
2. Create a new API key
3. Add to .env as: \`OPENAI_API_KEY=your_key_here\`

### Google AI API Key  
1. Visit https://makersuite.google.com/app/apikey
2. Create a new API key
3. Add to .env as: \`GOOGLE_AI_API_KEY=your_key_here\`

## Features

- **Rich Text Editing** with Monaco Editor
- **AI-Powered Editing** (OpenAI GPT-4o and Google Gemini)
- **DOCX Import/Export** support
- **Metaphor Detection** - Identify repeated figurative language
- **Multiple Export Formats** (TXT, HTML, Markdown, DOCX)
- **Change Tracking** with accept/reject functionality
- **Version Management** with revision history
- **Real-time Saving** and document persistence

## Tech Stack

- Frontend: React, TypeScript, Monaco Editor, Tailwind CSS
- Backend: Express.js, Node.js
- AI Services: OpenAI GPT-4o, Google Gemini
- File Processing: Mammoth.js for DOCX handling
- UI Components: Radix UI, shadcn/ui

## Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run type-check\` - Run TypeScript checks

## Troubleshooting

### API Key Issues
- Ensure API keys are valid and have sufficient quota
- Check billing status on respective platforms

### File Upload Issues
- Ensure DOCX files are valid Microsoft Word documents
- Check file size limits

### Monaco Editor Warnings
- These are cosmetic and don't affect functionality
- Related to web worker configuration

## Project Structure

\`\`\`
├── client/src/          # React frontend
│   ├── components/      # UI components
│   ├── pages/          # Route components
│   ├── hooks/          # Custom React hooks
│   └── lib/            # Utilities
├── server/             # Express backend
│   ├── routes.ts       # API endpoints
│   ├── ai-services.ts  # AI integration
│   └── storage.ts      # Data persistence
├── shared/             # Shared types/schemas
└── components.json     # UI component config
\`\`\`

## License

MIT License
`, { name: 'README.md' });
      
      // Add environment template
      archive.append(`# AI Service API Keys
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Development Settings
NODE_ENV=development
PORT=5000

# Optional: Database settings (if using PostgreSQL instead of in-memory storage)
# DATABASE_URL=postgresql://username:password@localhost:5432/texteditor_pro
`, { name: '.env.example' });

      // Add gitignore
      archive.append(`node_modules/
dist/
build/
.env
.DS_Store
*.log
coverage/
.nyc_output/
.vscode/
.idea/
`, { name: '.gitignore' });
      
      // Finalize archive
      await archive.finalize();
      
    } catch (error) {
      console.error('Package download error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to create download package" });
      }
    }
  });

  // Metaphor Analysis
  app.post("/api/documents/:id/analyze-metaphors", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const analysis = await analyzeMetaphors(document.content);
      res.json(analysis);
    } catch (error) {
      console.error('Metaphor analysis error:', error);
      res.status(500).json({ 
        message: "Metaphor analysis failed", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Character Voice Analysis
  app.post("/api/documents/:id/analyze-character-voice", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { characterNames, provider = 'openai' } = req.body;
      
      if (!characterNames || !Array.isArray(characterNames) || characterNames.length === 0) {
        return res.status(400).json({ message: "Character names are required as a non-empty array" });
      }

      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const analysis = await analyzeCharacterVoice(document.content, characterNames, provider);
      res.json(analysis);
    } catch (error) {
      console.error('Character voice analysis error:', error);
      res.status(500).json({ 
        message: "Character voice analysis failed", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // World Building Consistency Check
  app.post("/api/documents/:id/check-world-building", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { worldRules, provider = 'openai' } = req.body;
      
      if (!worldRules || typeof worldRules !== 'string' || !worldRules.trim()) {
        return res.status(400).json({ message: "World rules are required as a non-empty string" });
      }

      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const analysis = await checkWorldBuildingConsistency(document.content, worldRules, provider);
      res.json(analysis);
    } catch (error) {
      console.error('World building analysis error:', error);
      res.status(500).json({ 
        message: "World building analysis failed", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Pacing Analysis
  app.post("/api/documents/:id/analyze-pacing", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { provider = 'openai' } = req.body;

      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const analysis = await analyzePacing(document.content, provider);
      res.json(analysis);
    } catch (error) {
      console.error('Pacing analysis error:', error);
      res.status(500).json({ 
        message: "Pacing analysis failed", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Plot Structure Analysis
  app.post("/api/documents/:id/analyze-plot-structure", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { narrativeModel, provider = 'openai' } = req.body;

      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const analysis = await analyzePlotStructure(document.content, narrativeModel, provider);
      res.json(analysis);
    } catch (error) {
      console.error('Plot structure analysis error:', error);
      res.status(500).json({ 
        message: "Plot structure analysis failed", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Theme and Motif Analysis
  app.post("/api/documents/:id/analyze-themes", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { provider = 'openai' } = req.body;

      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const analysis = await analyzeThemesAndMotifs(document.content, provider);
      res.json(analysis);
    } catch (error) {
      console.error('Theme analysis error:', error);
      res.status(500).json({ 
        message: "Theme analysis failed", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Creative Writing routes
  app.post("/api/creative/generate-skeleton", async (req, res) => {
    try {
      const { concept, provider = 'openai' } = req.body;
      if (!concept) {
        return res.status(400).json({ message: "Concept is required" });
      }

      const { generateNovelSkeleton } = await import("./creative-writing-services");
      const skeleton = await generateNovelSkeleton(concept, provider);
      res.json(skeleton);
    } catch (error) {
      console.error('Generate skeleton error:', error);
      res.status(500).json({ message: "Failed to generate novel skeleton" });
    }
  });

  app.post("/api/creative/generate-chapter-outline", async (req, res) => {
    try {
      const { skeleton, chapterNumber, provider = 'openai' } = req.body;
      if (!skeleton || !chapterNumber) {
        return res.status(400).json({ message: "Novel skeleton and chapter number are required" });
      }

      const { generateChapterOutline } = await import("./creative-writing-services");
      const outline = await generateChapterOutline(skeleton, chapterNumber, provider);
      res.json(outline);
    } catch (error) {
      console.error('Generate chapter outline error:', error);
      res.status(500).json({ message: "Failed to generate chapter outline" });
    }
  });

  app.post("/api/creative/generate-chapter-sample", async (req, res) => {
    try {
      const { outline, worldAnvil, provider = 'openai' } = req.body;
      if (!outline || !worldAnvil) {
        return res.status(400).json({ message: "Chapter outline and world anvil are required" });
      }

      const { generateChapterSample } = await import("./creative-writing-services");
      const sample = await generateChapterSample(outline, worldAnvil, provider);
      res.json(sample);
    } catch (error) {
      console.error('Generate chapter sample error:', error);
      res.status(500).json({ message: "Failed to generate chapter sample" });
    }
  });



  // New Analysis routes
  app.post("/api/documents/:id/analyze-readability", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { provider = 'openai' } = req.body;
      
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const analysis = await analyzeReadability({ content: document.content, provider });
      res.json(analysis);
    } catch (error) {
      console.error('Readability analysis error:', error);
      res.status(500).json({ message: "Failed to analyze readability" });
    }
  });

  app.post("/api/documents/:id/analyze-dialogue", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { provider = 'openai' } = req.body;
      
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const analysis = await analyzeDialogue({ content: document.content, provider });
      res.json(analysis);
    } catch (error) {
      console.error('Dialogue analysis error:', error);
      res.status(500).json({ message: "Failed to analyze dialogue" });
    }
  });

  app.post("/api/documents/:id/analyze-clarity", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { provider = 'openai' } = req.body;
      
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const analysis = await analyzeClarity({ content: document.content, provider });
      res.json(analysis);
    } catch (error) {
      console.error('Clarity analysis error:', error);
      res.status(500).json({ message: "Failed to analyze clarity" });
    }
  });

  app.post("/api/documents/:id/analyze-sentiment-arc", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { provider = 'openai' } = req.body;
      
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const analysis = await analyzeSentimentArc({ content: document.content, provider });
      res.json(analysis);
    } catch (error) {
      console.error('Sentiment arc analysis error:', error);
      res.status(500).json({ message: "Failed to analyze sentiment arc" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
