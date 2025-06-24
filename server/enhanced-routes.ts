import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import mammoth from "mammoth";
import pdf from "pdf-parse";
import { Packer, Document as DocxDocument, Paragraph, TextRun } from "docx";
import { storage } from "./storage";
import { insertDocumentSchema } from "@shared/schema";
import {
  performDevelopmentalEdit,
  performLineEdit,
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
  analyzeCharacterInteractions,
  generatePromptSuggestions,
  reviewChangesWithInstructions,
  crossVerifyAnalysis,
  multiProviderConsensus,
  enhancedAnalysisWithVerification,
  type AIProvider
} from "./ai-services-enhanced";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // --- Document CRUD & Upload ---
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ message: "Failed to retrieve documents" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      if (!document) return res.status(404).json({ message: "Document not found" });
      res.json(document);
    } catch (error) {
      console.error('Get document error:', error);
      res.status(500).json({ message: "Failed to retrieve document" });
    }
  });

  app.post("/api/documents/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      
      let content = "";
      const { mimetype, buffer, originalname } = req.file;

      if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer });
        content = result.value;
      } else if (mimetype === 'application/pdf') {
        const data = await pdf(buffer);
        content = data.text;
      } else {
        content = buffer.toString('utf-8');
      }

      const document = await storage.createDocument({
        name: originalname,
        content: content,
        originalContent: content,
        mimeType: mimetype
      });

      res.status(201).json(document);
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: "Failed to upload and process document" });
    }
  });

  // --- AI Editing ---
  app.post("/api/documents/:id/ai-edit", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { instructions, editType, provider = 'openai' } = req.body;
      const document = await storage.getDocument(id);
      if (!document) return res.status(404).json({ message: "Document not found" });

      const result = editType === 'developmental'
        ? await performDevelopmentalEdit(document.content, instructions, provider as AIProvider)
        : await performLineEdit(document.content, instructions, provider as AIProvider);

      // Create revision with changes
      const revision = await storage.createRevision({
        documentId: id,
        content: result.editedContent,
        summary: result.summary,
        changes: result.changes,
        isAccepted: false
      });

      // Create individual change records
      for (const change of result.changes) {
        await storage.createChange({
          revisionId: revision.id,
          type: change.type,
          lineNumber: change.lineNumber,
          content: change.content,
          originalContent: change.originalContent,
          explanation: change.explanation,
          status: 'pending'
        });
      }

      res.json({ ...result, revisionId: revision.id });
    } catch (error) {
      console.error('AI edit error:', error);
      res.status(500).json({ message: "Failed to perform AI editing" });
    }
  });

  // --- Prompt Suggestions ---
  app.post("/api/documents/:id/prompt-suggestions", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { context } = req.body;
      const document = await storage.getDocument(id);
      if (!document) return res.status(404).json({ message: "Document not found" });

      const suggestions = await generatePromptSuggestions(document.content, context);
      res.json({ suggestions });
    } catch (error) {
      console.error('Prompt suggestions error:', error);
      res.status(500).json({ message: "Failed to generate prompt suggestions" });
    }
  });

  // --- Review Changes ---
  app.post("/api/documents/:id/review-changes", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { changes, instructions, provider = 'openai' } = req.body;
      
      const reviewedChanges = await reviewChangesWithInstructions(changes, instructions, provider as AIProvider);
      res.json({ changes: reviewedChanges });
    } catch (error) {
      console.error('Review changes error:', error);
      res.status(500).json({ message: "Failed to review changes" });
    }
  });

  // --- Analysis Endpoints ---
  const analysisEndpoints = [
    { type: 'metaphor', endpoint: 'analyze-metaphors', handler: analyzeMetaphors },
    { type: 'characterVoice', endpoint: 'analyze-character-voice', handler: analyzeCharacterVoice, requiredBody: ['characterNames'] },
    { type: 'worldBuilding', endpoint: 'check-world-building', handler: checkWorldBuildingConsistency, requiredBody: ['worldRules'] },
    { type: 'pacing', endpoint: 'analyze-pacing', handler: analyzePacing },
    { type: 'plotStructure', endpoint: 'analyze-plot-structure', handler: analyzePlotStructure },
    { type: 'theme', endpoint: 'analyze-themes', handler: analyzeThemesAndMotifs },
    // New Enhanced Analysis Endpoints
    { type: 'readability', endpoint: 'analyze-readability', handler: analyzeReadability },
    { type: 'dialogue', endpoint: 'analyze-dialogue', handler: analyzeDialogue },
    { type: 'clarity', endpoint: 'analyze-clarity', handler: analyzeClarity },
    { type: 'sentiment', endpoint: 'analyze-sentiment', handler: analyzeSentimentArc },
    { type: 'interaction', endpoint: 'analyze-interactions', handler: analyzeCharacterInteractions },
  ];

  analysisEndpoints.forEach(({ type, endpoint, handler, requiredBody }) => {
    app.post(`/api/documents/:id/${endpoint}`, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const { provider = 'openai', ...bodyParams } = req.body;
        
        const document = await storage.getDocument(id);
        if (!document) return res.status(404).json({ message: "Document not found" });
        
        const handlerArgs = requiredBody ? requiredBody.map(key => bodyParams[key]) : [];
        const analysis = await (handler as Function)(document.content, ...handlerArgs, provider);
        
        res.json(analysis);
      } catch (error) {
        console.error(`${type} analysis error:`, error);
        res.status(500).json({ message: `Failed to analyze ${type}` });
      }
    });
  });

  // --- Cross-Verification Endpoints ---
  app.post("/api/documents/:id/cross-verify", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { originalAnalysis, analysisType, primaryProvider = 'openai', verificationProvider = 'anthropic' } = req.body;
      
      const document = await storage.getDocument(id);
      if (!document) return res.status(404).json({ message: "Document not found" });
      
      const verifiedAnalysis = await crossVerifyAnalysis(
        originalAnalysis,
        analysisType,
        document.content,
        primaryProvider as AIProvider,
        verificationProvider as AIProvider
      );
      
      res.json(verifiedAnalysis);
    } catch (error) {
      console.error('Cross-verification error:', error);
      res.status(500).json({ message: "Failed to cross-verify analysis" });
    }
  });

  app.post("/api/documents/:id/consensus-analysis", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { analysisType, providers = ['openai', 'google', 'anthropic'] } = req.body;
      
      const document = await storage.getDocument(id);
      if (!document) return res.status(404).json({ message: "Document not found" });
      
      // Map analysis type to function
      const analysisMap: Record<string, Function> = {
        'readability': analyzeReadability,
        'dialogue': analyzeDialogue,
        'clarity': analyzeClarity,
        'sentiment': analyzeSentimentArc,
        'interaction': analyzeCharacterInteractions,
        'metaphor': analyzeMetaphors,
        'pacing': analyzePacing,
        'theme': analyzeThemesAndMotifs
      };
      
      const analysisFunction = analysisMap[analysisType];
      if (!analysisFunction) {
        return res.status(400).json({ message: "Invalid analysis type" });
      }
      
      const consensusAnalysis = await multiProviderConsensus(
        document.content,
        analysisType,
        analysisFunction,
        providers as AIProvider[]
      );
      
      res.json(consensusAnalysis);
    } catch (error) {
      console.error('Consensus analysis error:', error);
      res.status(500).json({ message: "Failed to generate consensus analysis" });
    }
  });

  app.post("/api/documents/:id/enhanced-analysis", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { analysisType, primaryProvider = 'openai', verificationProvider = 'anthropic' } = req.body;
      
      const document = await storage.getDocument(id);
      if (!document) return res.status(404).json({ message: "Document not found" });
      
      // Map analysis type to function
      const analysisMap: Record<string, Function> = {
        'readability': analyzeReadability,
        'dialogue': analyzeDialogue,
        'clarity': analyzeClarity,
        'sentiment': analyzeSentimentArc,
        'interaction': analyzeCharacterInteractions,
        'metaphor': analyzeMetaphors,
        'pacing': analyzePacing,
        'theme': analyzeThemesAndMotifs
      };
      
      const analysisFunction = analysisMap[analysisType];
      if (!analysisFunction) {
        return res.status(400).json({ message: "Invalid analysis type" });
      }
      
      const enhancedAnalysis = await enhancedAnalysisWithVerification(
        document.content,
        analysisType,
        analysisFunction,
        primaryProvider as AIProvider,
        verificationProvider as AIProvider
      );
      
      res.json(enhancedAnalysis);
    } catch (error) {
      console.error('Enhanced analysis error:', error);
      res.status(500).json({ message: "Failed to generate enhanced analysis" });
    }
  });

  // --- DOCX Export ---
  app.get("/api/documents/:id/export/docx", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      if (!document) return res.status(404).json({ message: "Document not found" });

      const doc = new DocxDocument({
          sections: [{
              children: document.content.split('\n').map(line => 
                new Paragraph({ children: [new TextRun(line)] })
              ),
          }],
      });

      const buffer = await Packer.toBuffer(doc);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${document.name.replace(/\.[^/.]+$/, "")}.docx"`);
      res.send(buffer);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ message: "Failed to export document" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}