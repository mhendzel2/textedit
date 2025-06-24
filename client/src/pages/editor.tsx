import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Document, Change, MetaphorAnalysis, CharacterVoiceAnalysis, WorldBuildingAnalysis, PacingAnalysis, PlotStructureAnalysis, ThemeAnalysis } from "@shared/schema";
import MonacoEditor, { MonacoEditorRef } from "@/components/monaco-editor";
import FileSidebar from "@/components/file-sidebar";
import ComparisonPanel from "@/components/comparison-panel";
import ChangeReviewPanel from "@/components/change-review-panel-enhanced";
import FileUploadModal from "@/components/file-upload-modal";
import AIEditingPanel from "@/components/ai-editing-panel";
import MetaphorAnalysisDisplay from "@/components/metaphor-analysis-display";
import CharacterVoiceAnalysisDisplay from "@/components/CharacterVoiceAnalysisDisplay";
import WorldBuildingAnalysisDisplay from "@/components/WorldBuildingAnalysisDisplay";
import PacingAnalysisDisplay from "@/components/PacingAnalysisDisplay";
import PlotStructureAnalysisDisplay from "@/components/PlotStructureAnalysisDisplay";
import ThemeAnalysisDisplay from "@/components/ThemeAnalysisDisplay";
import AnalysisInputDialog from "@/components/AnalysisInputDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { 
  Save, Download, Undo, Redo, Check, X, ChevronDown,
  FileText, FileType, Globe, Repeat, Package, Search,
  Settings, Upload, File, FileEdit, Columns, CheckSquare,
  Brain, Sparkles, MessageSquareQuote, BookOpen, BarChart3, Drama, Library, Loader2
} from "lucide-react";
import { useEditor } from "@/hooks/use-editor";
import { apiRequest } from "@/lib/queryClient";

type AnalysisResultType = 'metaphor' | 'characterVoice' | 'worldBuilding' | 'pacing' | 'plotStructure' | 'theme';

interface AnalysisResult {
  type: AnalysisResultType;
  data: any;
  title: string;
  isEnhanced?: boolean;
  isConsensus?: boolean;
}

type AnalysisInputConfig = {
    type: AnalysisResultType;
    endpoint: string;
    title: string;
    description: string;
    label: string;
    placeholder: string;
} | null;

type ViewMode = 'editor' | 'compare' | 'review' | 'ai-edit' | 'analysis';

export default function Editor() {
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [currentAnalysisResult, setCurrentAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [analysisInputConfig, setAnalysisInputConfig] = useState<AnalysisInputConfig>(null);
  
  const queryClient = useQueryClient();
  const monacoEditorRef = useRef<MonacoEditorRef>(null);

  const { data: documents = [] } = useQuery<Document[]>({ queryKey: ['/api/documents'] });
  const { data: currentDocument } = useQuery<Document>({ queryKey: ['/api/documents', selectedDocumentId], enabled: !!selectedDocumentId });

  const {
    content, setContent, changes, acceptChange, rejectChange,
    acceptAllChanges, rejectAllChanges, saveDocument, canUndo, canRedo, undo, redo,
  } = useEditor(currentDocument);

  const [originalContent, setOriginalContent] = useState<string>("");
  const [localChanges, setLocalChanges] = useState<Change[]>([]);

  const handleNewDocument = () => {
    setSelectedDocumentId(null);
    setViewMode('editor');
    setCurrentAnalysisResult(null);
  };
  
  useEffect(() => {
    if (currentDocument && selectedDocumentId !== currentDocument.id) {
        setViewMode('editor');
        setCurrentAnalysisResult(null);
    }
  }, [selectedDocumentId, currentDocument]);

  const handleSave = async () => {
    await saveDocument();
  };

  const handleExport = (format: string) => {
    if (!currentDocument) return;
    
    const filename = currentDocument.name.replace(/\.[^/.]+$/, "");
    let url = '';
    let downloadFilename = '';

    switch (format) {
      case 'txt':
        const blob = new Blob([content], { type: 'text/plain' });
        url = URL.createObjectURL(blob);
        downloadFilename = `${filename}.txt`;
        break;
      case 'docx':
        url = `/api/documents/${currentDocument.id}/export/docx`;
        downloadFilename = `${filename}.docx`;
        break;
      case 'pdf':
        const pdfBlob = new Blob([content], { type: 'application/pdf' });
        url = URL.createObjectURL(pdfBlob);
        downloadFilename = `${filename}.pdf`;
        break;
      default:
        return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (format === 'txt' || format === 'pdf') {
      URL.revokeObjectURL(url);
    }
  };

  const handleOpenAnalysisDialog = (type: 'characterVoice' | 'worldBuilding') => {
    const configs = {
      characterVoice: {
        type: 'characterVoice' as const,
        endpoint: 'analyze-character-voice',
        title: 'Analyze Character Voice',
        description: 'Enter character names to analyze for voice consistency. Separate names with commas.',
        label: 'Character Names',
        placeholder: 'e.g., Alice, Bob, Charlie',
      },
      worldBuilding: {
        type: 'worldBuilding' as const,
        endpoint: 'check-world-building',
        title: 'Check World-Building Consistency',
        description: 'Enter the core rules of your world. The AI will check for inconsistencies in the text.',
        label: 'World Rules',
        placeholder: 'e.g., Magic is powered by sunlight, Gravity is reversed on Tuesdays...',
      }
    };
    setAnalysisInputConfig(configs[type]);
  };

  const handleDialogSubmit = (inputValue: string) => {
    if (!analysisInputConfig) return;
    let body: any;
    if (analysisInputConfig.type === 'characterVoice') {
      body = { characterNames: inputValue.split(',').map(name => name.trim()).filter(Boolean) };
    } else if (analysisInputConfig.type === 'worldBuilding') {
      body = { worldRules: inputValue };
    }
    handleGenericAnalysis(analysisInputConfig.type, analysisInputConfig.endpoint, body);
    setAnalysisInputConfig(null);
  };

  const handleGenericAnalysis = async (analysisType: AnalysisResultType, endpoint: string, body?: any) => {
    if (!currentDocument) {
      toast({ title: "No document selected", variant: "destructive" });
      return;
    }
    setIsAnalysisLoading(true);
    setCurrentAnalysisResult(null);
    setViewMode('analysis');
    try {
      const response = await apiRequest('POST', `/api/documents/${currentDocument.id}/${endpoint}`, body || {});
      const analysisData = await response.json();
      const titles: Record<AnalysisResultType, string> = {
        metaphor: "Metaphor Analysis",
        characterVoice: "Character Voice Analysis",
        worldBuilding: "World-Building Consistency",
        pacing: "Pacing Analysis",
        plotStructure: "Plot Structure Analysis",
        theme: "Theme & Motif Analysis",
      };
      setCurrentAnalysisResult({ type: analysisType, data: analysisData, title: titles[analysisType] });
    } catch (error: any) {
      toast({ title: "Analysis Failed", description: error.message, variant: "destructive" });
      setViewMode('editor');
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const handleEnhancedAnalysis = async (analysisType: AnalysisResultType) => {
    if (!currentDocument) {
      toast({ title: "No document selected", variant: "destructive" });
      return;
    }
    setIsAnalysisLoading(true);
    setCurrentAnalysisResult(null);
    setViewMode('analysis');
    try {
      const response = await apiRequest('POST', `/api/documents/${currentDocument.id}/enhanced-analysis`, {
        analysisType,
        primaryProvider: 'openai',
        verificationProvider: 'anthropic'
      });
      const analysisData = await response.json();
      const titles: Record<AnalysisResultType, string> = {
        metaphor: "Enhanced Metaphor Analysis (Cross-Verified)",
        characterVoice: "Enhanced Character Voice Analysis (Cross-Verified)",
        worldBuilding: "Enhanced World-Building Analysis (Cross-Verified)",
        pacing: "Enhanced Pacing Analysis (Cross-Verified)",
        plotStructure: "Enhanced Plot Structure Analysis (Cross-Verified)",
        theme: "Enhanced Theme Analysis (Cross-Verified)",
      };
      setCurrentAnalysisResult({ 
        type: analysisType, 
        data: analysisData, 
        title: titles[analysisType],
        isEnhanced: true
      });
      toast({ title: "Enhanced Analysis Complete", description: "Analysis verified by multiple AI providers" });
    } catch (error: any) {
      toast({ title: "Enhanced Analysis Failed", description: error.message, variant: "destructive" });
      setViewMode('editor');
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const handleConsensusAnalysis = async (analysisType: AnalysisResultType) => {
    if (!currentDocument) {
      toast({ title: "No document selected", variant: "destructive" });
      return;
    }
    setIsAnalysisLoading(true);
    setCurrentAnalysisResult(null);
    setViewMode('analysis');
    try {
      const response = await apiRequest('POST', `/api/documents/${currentDocument.id}/consensus-analysis`, {
        analysisType,
        providers: ['openai', 'google', 'anthropic']
      });
      const analysisData = await response.json();
      const titles: Record<AnalysisResultType, string> = {
        metaphor: "Consensus Metaphor Analysis (Multi-AI)",
        characterVoice: "Consensus Character Voice Analysis (Multi-AI)",
        worldBuilding: "Consensus World-Building Analysis (Multi-AI)",
        pacing: "Consensus Pacing Analysis (Multi-AI)",
        plotStructure: "Consensus Plot Structure Analysis (Multi-AI)",
        theme: "Consensus Theme Analysis (Multi-AI)",
      };
      setCurrentAnalysisResult({ 
        type: analysisType, 
        data: analysisData, 
        title: titles[analysisType],
        isConsensus: true
      });
      toast({ title: "Consensus Analysis Complete", description: "Analysis synthesized from multiple AI providers" });
    } catch (error: any) {
      toast({ title: "Consensus Analysis Failed", description: error.message, variant: "destructive" });
      setViewMode('editor');
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const handleUploadSuccess = (document: Document) => {
    setSelectedDocumentId(document.id);
    setShowUploadModal(false);
  };
  
  const handleAIEditComplete = async (summary: string, editedContent: string, aiGeneratedChanges: Change[]) => {
    toast({ title: "AI Edit Processed", description: summary });
    
    setContent(editedContent);
    setLocalChanges(aiGeneratedChanges);
    setOriginalContent(content);
    
    queryClient.invalidateQueries({ queryKey: ['/api/documents', selectedDocumentId] });
    queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    
    setViewMode('review');
  };

  const handleCreativeGenerate = (generatedContent: string) => {
    setContent(generatedContent);
    toast({ title: "Creative Content Generated", description: "Sample text added to editor" });
  };

  const handleBulkUpdateChanges = (updatedChanges: Change[]) => {
    if (viewMode === 'review') {
      // Handle local changes for AI edit review mode
      const reviewedMap = new Map(updatedChanges.map(c => [c.id, c.status]));
      const newChanges = localChanges.map(change => {
        if (reviewedMap.has(change.id)) {
          return { ...change, status: reviewedMap.get(change.id)! };
        }
        return change;
      });
      setLocalChanges(newChanges);
    } else {
      // Handle regular document changes - for now just log
      console.log('Bulk update for regular changes:', updatedChanges);
    }
  };
  
  const pendingChangesCount = (changes || []).filter(c => c.status === 'pending').length;

  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen bg-dark-bg text-gray-300 flex flex-col">
      {/* Header */}
      <header className="bg-dark-surface border-b border-dark-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-white">Literary Editor</h1>
            <Separator orientation="vertical" className="h-6 bg-dark-border" />
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowUploadModal(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <Button variant="outline" size="sm" onClick={handleNewDocument}>
                <File className="h-4 w-4 mr-2" />
                New
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {currentDocument && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={!currentDocument || isAnalysisLoading}>
                      <Brain className="h-4 w-4 mr-2" /> Analyze <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleGenericAnalysis('metaphor', 'analyze-metaphors')} disabled={isAnalysisLoading}>
                      <MessageSquareQuote className="mr-2 h-4 w-4" /> Metaphors
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenAnalysisDialog('characterVoice')} disabled={isAnalysisLoading}>
                      <Drama className="mr-2 h-4 w-4" /> Character Voice
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenAnalysisDialog('worldBuilding')} disabled={isAnalysisLoading}>
                      <Library className="mr-2 h-4 w-4" /> World Building
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleGenericAnalysis('pacing', 'analyze-pacing')} disabled={isAnalysisLoading}>
                      <BarChart3 className="mr-2 h-4 w-4" /> Pacing
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleGenericAnalysis('plotStructure', 'analyze-plot-structure')} disabled={isAnalysisLoading}>
                      <BookOpen className="mr-2 h-4 w-4" /> Plot Structure
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleGenericAnalysis('theme', 'analyze-themes')} disabled={isAnalysisLoading}>
                      <Sparkles className="mr-2 h-4 w-4" /> Themes & Motifs
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleEnhancedAnalysis('pacing')} disabled={isAnalysisLoading}>
                      <Brain className="mr-2 h-4 w-4" /> Enhanced Pacing (Cross-Verified)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEnhancedAnalysis('theme')} disabled={isAnalysisLoading}>
                      <Brain className="mr-2 h-4 w-4" /> Enhanced Themes (Cross-Verified)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleConsensusAnalysis('metaphor')} disabled={isAnalysisLoading}>
                      <Settings className="mr-2 h-4 w-4" /> Consensus Metaphors (Multi-AI)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleConsensusAnalysis('plotStructure')} disabled={isAnalysisLoading}>
                      <Settings className="mr-2 h-4 w-4" /> Consensus Plot (Multi-AI)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport('txt')}>
                      <FileText className="mr-2 h-4 w-4" /> Plain Text (.txt)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('docx')}>
                      <FileType className="mr-2 h-4 w-4" /> Word Document (.docx)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={!currentDocument}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="w-72 bg-dark-surface border-r border-dark-border flex flex-col">
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-dark-bg border-dark-border text-white"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-2 pb-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocumentId(doc.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedDocumentId === doc.id
                      ? 'bg-vscode-blue text-white'
                      : 'hover:bg-dark-border text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <FileEdit className="h-5 w-5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs opacity-70 truncate">
                        {doc.content.length} characters
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {filteredDocuments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileEdit className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No documents found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>

        <main className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="bg-dark-surface border-b border-dark-border px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {currentDocument && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('editor')}
                      className={viewMode === 'editor' ? 'bg-dark-border text-white' : 'text-gray-400'}
                    >
                      <FileEdit className="h-4 w-4 mr-2" />
                      Editor
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('compare')}
                      className={viewMode === 'compare' ? 'bg-dark-border text-white' : 'text-gray-400'}
                    >
                      <Columns className="h-4 w-4 mr-2" />
                      Compare
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('review')}
                      className={viewMode === 'review' ? 'bg-dark-border text-white' : 'text-gray-400'}
                      disabled={!changes || changes.length === 0}
                    >
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Review
                      {pendingChangesCount > 0 && (
                        <Badge variant="secondary" className="ml-2 bg-red-600 text-white">
                          {pendingChangesCount}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('ai-edit')}
                      className={viewMode === 'ai-edit' ? 'bg-dark-border text-white' : 'text-gray-400'}
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      AI Edit
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {currentDocument && viewMode === 'editor' && (
                  <>
                    <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo}>
                      <Undo className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo}>
                      <Redo className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex min-h-0">
            {viewMode === 'analysis' ? (
              <ScrollArea className="flex-1 p-4 bg-editor-bg">
                {isAnalysisLoading && (
                  <div className="flex justify-center items-center h-full">
                    <div className="text-center">
                      <Loader2 className="h-12 w-12 animate-spin mx-auto text-vscode-blue" />
                      <p className="mt-4 text-lg text-gray-400">Analysis in progress...</p>
                      <p className="text-sm text-gray-500">This may take a moment.</p>
                    </div>
                  </div>
                )}
                {currentAnalysisResult && !isAnalysisLoading && (
                  <>
                    <h2 className="text-xl font-semibold mb-4 text-white">{currentAnalysisResult.title}</h2>
                    {currentAnalysisResult.type === 'metaphor' && <MetaphorAnalysisDisplay results={currentAnalysisResult.data} />}
                    {currentAnalysisResult.type === 'characterVoice' && <CharacterVoiceAnalysisDisplay results={currentAnalysisResult.data} />}
                    {currentAnalysisResult.type === 'worldBuilding' && <WorldBuildingAnalysisDisplay results={currentAnalysisResult.data} />}
                    {currentAnalysisResult.type === 'pacing' && <PacingAnalysisDisplay results={currentAnalysisResult.data} />}
                    {currentAnalysisResult.type === 'plotStructure' && <PlotStructureAnalysisDisplay results={currentAnalysisResult.data} />}
                    {currentAnalysisResult.type === 'theme' && <ThemeAnalysisDisplay results={currentAnalysisResult.data} />}
                  </>
                )}
              </ScrollArea>
            ) : (
              <div className="flex-1 flex">
                {viewMode === 'editor' && (
                  <div className="flex-1">
                    {currentDocument ? (
                      <MonacoEditor
                        ref={monacoEditorRef}
                        value={content}
                        onChange={setContent}
                        className="h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <FileEdit className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <h3 className="text-xl font-semibold mb-2">No Document Selected</h3>
                          <p className="text-sm">Choose a document from the sidebar or upload a new one to get started.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {viewMode === 'compare' && currentDocument && (
                  <ComparisonPanel
                    original={originalContent || currentDocument.content}
                    modified={content}
                  />
                )}

                {viewMode === 'review' && currentDocument && (
                  <ChangeReviewPanel
                    changes={changes || []}
                    onAcceptChange={acceptChange}
                    onRejectChange={rejectChange}
                    onBulkUpdate={handleBulkUpdateChanges}
                  />
                )}

                {viewMode === 'ai-edit' && (
                  <div className="flex-1 flex">
                    <div className="flex-1">
                      <MonacoEditor
                        ref={monacoEditorRef}
                        value={content}
                        onChange={setContent}
                        className="h-full"
                      />
                    </div>
                    <AIEditingPanel 
                      document={currentDocument} 
                      onEditComplete={handleAIEditComplete}
                      onCreativeGenerate={handleCreativeGenerate}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-dark-surface border-t border-dark-border px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center space-x-4">
            {currentDocument && (
              <>
                <span>{currentDocument.name}</span>
                <Separator orientation="vertical" className="h-4 bg-dark-border" />
                <span>{content.length} characters</span>
                <span>{content.split('\n').length} lines</span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs">Mode: {viewMode}</span>
          </div>
        </div>
      </footer>

      <FileUploadModal open={showUploadModal} onOpenChange={setShowUploadModal} onUploadSuccess={handleUploadSuccess} />

      <AnalysisInputDialog
        open={!!analysisInputConfig}
        onOpenChange={() => setAnalysisInputConfig(null)}
        onSubmit={handleDialogSubmit}
        isLoading={isAnalysisLoading}
        title={analysisInputConfig?.title || ""}
        description={analysisInputConfig?.description || ""}
        label={analysisInputConfig?.label || ""}
        placeholder={analysisInputConfig?.placeholder || ""}
      />
    </div>
  );
}