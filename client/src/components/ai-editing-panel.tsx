import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Document, Change, NovelSkeleton, ChapterOutline } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Brain, Wand2, Lightbulb, Sparkles, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PromptLibrary from "@/components/prompt-library";

interface AIEditingPanelProps {
  document: Document | undefined;
  onEditComplete: (summary: string, editedContent: string, changes: Change[]) => void;
  onCreativeGenerate?: (content: string) => void;
}

export default function AIEditingPanel({ document, onEditComplete, onCreativeGenerate }: AIEditingPanelProps) {
  const [instructions, setInstructions] = useState("");
  const [editType, setEditType] = useState<'developmental' | 'line' | 'creative'>('developmental');
  const [provider, setProvider] = useState<'openai' | 'google'>('openai');
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  
  // Creative writing state
  const [novelSkeleton, setNovelSkeleton] = useState<NovelSkeleton | null>(null);
  const [chapterOutlines, setChapterOutlines] = useState<ChapterOutline[]>([]);
  const [creativePrompt, setCreativePrompt] = useState("");
  const [generatedSamples, setGeneratedSamples] = useState<{ id: string; title: string; content: string }[]>([]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: documents = [] } = useQuery<Document[]>({ queryKey: ['/api/documents'] });

  const instructionDocs = documents.filter(doc => 
    doc.mimeType === 'text/plain' || 
    doc.mimeType === 'application/pdf' ||
    doc.name.toLowerCase().endsWith('.txt') ||
    doc.name.toLowerCase().endsWith('.pdf') ||
    (doc.name.toLowerCase().includes('edit') && (doc.mimeType === 'text/plain' || doc.mimeType === 'application/pdf'))
  );

  const { data: suggestions = [], isLoading: isLoadingSuggestions, refetch: refetchSuggestions } = useQuery<string[]>({
    queryKey: ['/api/documents', document?.id, 'prompt-suggestions', editType],
    queryFn: async () => {
      if (!document?.id) return [];
      const response = await apiRequest('POST', `/api/documents/${document.id}/prompt-suggestions`, {
        context: editType === 'developmental' ? 'Focus on structure and content development' : 'Focus on grammar and style'
      });
      const data = await response.json();
      return data.suggestions || [];
    },
    enabled: !!document?.id,
  });

  useEffect(() => {
    if (document?.id) {
      refetchSuggestions();
    }
  }, [editType, document?.id, refetchSuggestions]);

  const aiEditMutation = useMutation({
    mutationFn: async (params: {
      instructions: string;
      editType: 'developmental' | 'line';
      provider: 'openai' | 'google';
    }) => {
      if (!document || !document.id) throw new Error('No document selected');
      
      const response = await apiRequest('POST', `/api/documents/${document.id}/ai-edit`, {
        instructions: params.instructions,
        editType: params.editType,
        provider: params.provider
      });
      return response.json() as Promise<{ editedContent: string, changes: Change[], summary: string }>;
    },
    onSuccess: (data) => {
      toast({
        title: "AI editing suggestions generated",
        description: `${editType === 'developmental' ? 'Developmental' : 'Line'} editing suggestions created with ${data.changes?.length || 0} items. Review them in the editor.`,
      });
      
      onEditComplete(data.summary, data.editedContent, data.changes);
      setInstructions("");
    },
    onError: (error) => {
      toast({
        title: "AI editing failed",
        description: `There was an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        variant: "destructive",
      });
      console.error('AI editing error:', error);
    },
  });

  const novelSkeletonMutation = useMutation({
    mutationFn: async ({ prompt, provider }: { prompt: string; provider: 'openai' | 'google' }) => {
      const response = await apiRequest('POST', '/api/creative/novel-skeleton', {
        prompt,
        provider
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate novel skeleton');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setNovelSkeleton(data);
      toast({
        title: "Novel Skeleton Generated",
        description: "Successfully created novel structure and characters.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const chapterOutlineMutation = useMutation({
    mutationFn: async ({ chapterNumber, provider }: { chapterNumber: number; provider: 'openai' | 'google' }) => {
      if (!novelSkeleton) throw new Error('No novel skeleton available');
      
      const response = await apiRequest('POST', '/api/creative/chapter-outline', {
        skeleton: novelSkeleton,
        chapterNumber,
        provider
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate chapter outline');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setChapterOutlines(prev => [...prev, data]);
      toast({
        title: "Chapter Outline Generated",
        description: `Chapter ${data.chapterNumber} outline created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const chapterSampleMutation = useMutation({
    mutationFn: async ({ outline, worldAnvil, provider }: { outline: ChapterOutline; worldAnvil: string; provider: 'openai' | 'google' }) => {
      const response = await apiRequest('POST', '/api/creative/chapter-sample', {
        outline,
        worldAnvil,
        provider
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate chapter sample');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      const newSample = {
        id: Date.now().toString(),
        title: `Chapter ${data.chapterNumber} Sample`,
        content: data.content
      };
      setGeneratedSamples(prev => [...prev, newSample]);
      if (onCreativeGenerate) {
        onCreativeGenerate(data.content);
      }
      toast({
        title: "Chapter Sample Generated",
        description: "Sample text created and added to editor.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditRequest = () => {
    if (editType === 'creative') {
      handleCreativeRequest();
      return;
    }
    
    if (!instructions.trim()) {
      toast({
        title: "Instructions required",
        description: "Please provide editing instructions before submitting.",
        variant: "destructive",
      });
      return;
    }
    if (!document) {
      toast({
        title: "No Document",
        description: "Please select a document first.",
        variant: "destructive",
      });
      return;
    }

    aiEditMutation.mutate({ instructions, editType, provider });
  };

  const handleCreativeRequest = () => {
    if (!creativePrompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please provide a story prompt or idea.",
        variant: "destructive",
      });
      return;
    }

    if (!novelSkeleton) {
      novelSkeletonMutation.mutate({ prompt: creativePrompt, provider });
    } else if (chapterOutlines.length === 0) {
      chapterOutlineMutation.mutate({ chapterNumber: 1, provider });
    } else {
      const latestOutline = chapterOutlines[chapterOutlines.length - 1];
      chapterSampleMutation.mutate({ 
        outline: latestOutline, 
        worldAnvil: creativePrompt, 
        provider 
      });
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setInstructions(suggestion);
    setSelectedSuggestion(suggestion);
  };

  const handleEditTypeChange = (newEditType: 'developmental' | 'line' | 'creative') => {
    setEditType(newEditType);
    setSelectedSuggestion(null);
    setInstructions("");
  };

  return (
    <div className="w-96 bg-dark-surface border-l border-dark-border p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center space-x-2">
        <Brain className="h-5 w-5 text-vscode-blue" />
        <h3 className="text-lg font-semibold text-white">AI Editor</h3>
      </div>

      {!document && editType !== 'creative' ? (
        <div className="text-center py-8">
          <Sparkles className="h-8 w-8 text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Select a document to start AI editing</p>
        </div>
      ) : (
        <>
          <Card className="bg-dark-bg border-dark-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-300">Edit Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-3 gap-1">
                <Button
                  variant={editType === 'developmental' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleEditTypeChange('developmental')}
                  className={`${editType === 'developmental' ? 'bg-vscode-blue hover:bg-vscode-blue/90' : 'border-dark-border text-gray-300 hover:bg-dark-border'} w-full text-xs`}
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  Dev
                </Button>
                <Button
                  variant={editType === 'line' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleEditTypeChange('line')}
                  className={`${editType === 'line' ? 'bg-vscode-blue hover:bg-vscode-blue/90' : 'border-dark-border text-gray-300 hover:bg-dark-border'} w-full text-xs`}
                >
                  <Brain className="h-3 w-3 mr-1" />
                  Line
                </Button>
                <Button
                  variant={editType === 'creative' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleEditTypeChange('creative')}
                  className={`${editType === 'creative' ? 'bg-vscode-blue hover:bg-vscode-blue/90' : 'border-dark-border text-gray-300 hover:bg-dark-border'} w-full text-xs`}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Story
                </Button>
              </div>
              <p className="text-xs text-gray-500 pt-1">
                {editType === 'developmental' 
                  ? 'Focus on structure, content, and overall organization.'
                  : editType === 'line'
                  ? 'Focus on grammar, style, and sentence-level improvements.'
                  : 'Generate novel skeletons, chapter outlines, and story samples.'
                }
              </p>
            </CardContent>
          </Card>

          <div className="space-y-1">
            <label htmlFor="ai-provider-select" className="text-sm font-medium text-gray-300">AI Provider</label>
            <Select value={provider} onValueChange={(value: 'openai' | 'google') => setProvider(value)}>
              <SelectTrigger id="ai-provider-select" className="bg-dark-bg border-dark-border text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-dark-surface border-dark-border">
                <SelectItem value="openai" className="text-white hover:!bg-vscode-blue/20 focus:!bg-vscode-blue/30">ChatGPT (OpenAI)</SelectItem>
                <SelectItem value="google" className="text-white hover:!bg-vscode-blue/20 focus:!bg-vscode-blue/30">Gemini (Google)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {editType === 'creative' ? (
            <Card className="bg-dark-bg border-dark-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-300 flex items-center">
                  <BookOpen className="h-4 w-4 mr-2 text-purple-400" />
                  Story Generation Workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!novelSkeleton ? (
                  <div className="text-center py-4">
                    <Sparkles className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 mb-2">Start by creating a novel skeleton</p>
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="skeleton" className="border-dark-border">
                      <AccordionTrigger className="text-sm text-gray-300 hover:text-white">
                        Novel Skeleton: {novelSkeleton.title}
                      </AccordionTrigger>
                      <AccordionContent className="text-xs text-gray-400">
                        <div className="space-y-1">
                          <p><strong>Logline:</strong> {novelSkeleton.logline}</p>
                          <p><strong>Characters:</strong> {novelSkeleton.characters.map(c => c.name).join(', ')}</p>
                          <p><strong>Plot Points:</strong> {novelSkeleton.plotPoints.length}</p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    
                    {chapterOutlines.length > 0 && (
                      <AccordionItem value="outlines" className="border-dark-border">
                        <AccordionTrigger className="text-sm text-gray-300 hover:text-white">
                          Chapter Outlines ({chapterOutlines.length})
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-gray-400">
                          {chapterOutlines.map((outline, idx) => (
                            <div key={idx} className="mb-2 p-2 bg-dark-surface rounded">
                              <p><strong>Chapter {outline.chapter}:</strong> {outline.title}</p>
                            </div>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    )}
                    
                    {generatedSamples.length > 0 && (
                      <AccordionItem value="samples" className="border-dark-border">
                        <AccordionTrigger className="text-sm text-gray-300 hover:text-white">
                          Generated Samples ({generatedSamples.length})
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-gray-400">
                          {generatedSamples.map((sample) => (
                            <div key={sample.id} className="mb-2 p-2 bg-dark-surface rounded">
                              <p><strong>{sample.title}</strong></p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onCreativeGenerate && onCreativeGenerate(sample.content)}
                                className="mt-1 text-xs border-dark-border text-gray-300 hover:bg-dark-border"
                              >
                                Load to Editor
                              </Button>
                            </div>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="suggestions" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-dark-bg border-dark-border">
                <TabsTrigger value="suggestions" className="data-[state=active]:bg-vscode-blue/20 data-[state=active]:text-white text-gray-400">Suggestions</TabsTrigger>
                <TabsTrigger value="library" className="data-[state=active]:bg-vscode-blue/20 data-[state=active]:text-white text-gray-400">Library</TabsTrigger>
              </TabsList>
              
              <TabsContent value="suggestions" className="mt-2">
                {isLoadingSuggestions ? (
                  <div className="text-center py-4 text-gray-400"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading suggestions...</div>
                ) : suggestions.length > 0 ? (
                  <Card className="bg-dark-bg border-dark-border">
                    <CardHeader className="pb-2 pt-3">
                      <CardTitle className="text-sm text-gray-300 flex items-center">
                        <Lightbulb className="h-4 w-4 mr-2 text-yellow-400" />
                        AI Suggested Prompts
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 max-h-48 overflow-y-auto p-2">
                      {suggestions.map((suggestion: string, index: number) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSuggestionSelect(suggestion)}
                          className={`w-full text-left text-xs h-auto p-2 text-gray-300 hover:bg-dark-border ${
                            selectedSuggestion === suggestion ? 'border border-vscode-blue bg-vscode-blue/10' : 'border border-transparent'
                          }`}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-4 text-sm text-gray-500">
                    <Lightbulb className="h-6 w-6 mx-auto mb-1" />
                    No suggestions for this edit type.
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="library" className="mt-2">
                <PromptLibrary
                  onPromptSelect={setInstructions}
                  editType={editType}
                />
              </TabsContent>
            </Tabs>
          )}

          <div className="space-y-1">
            <label htmlFor="editing-instructions" className="text-sm font-medium text-gray-300">
              {editType === 'creative' ? 'Story Prompt' : 'Editing Instructions'}
            </label>
            <Textarea
              id="editing-instructions"
              value={editType === 'creative' ? creativePrompt : instructions}
              onChange={(e) => editType === 'creative' ? setCreativePrompt(e.target.value) : setInstructions(e.target.value)}
              placeholder={editType === 'creative' 
                ? "Describe your story idea... e.g., 'A cyberpunk thriller about AI consciousness in 2089 Tokyo'"
                : `Provide specific ${editType} editing instructions... e.g., "Make the tone more formal" or "Clarify the main argument in the first paragraph."`}
              className="bg-dark-bg border-dark-border text-white min-h-[100px] resize-none"
              rows={5}
            />
          </div>

          <Separator className="bg-dark-border my-3" />

          <Button
            onClick={handleEditRequest}
            disabled={editType === 'creative' 
              ? !creativePrompt.trim() || novelSkeletonMutation.isPending || chapterOutlineMutation.isPending || chapterSampleMutation.isPending
              : !instructions.trim() || aiEditMutation.isPending || !document}
            className="w-full bg-vscode-blue hover:bg-blue-600 text-white"
          >
            {(aiEditMutation.isPending || novelSkeletonMutation.isPending || chapterOutlineMutation.isPending || chapterSampleMutation.isPending) ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {editType === 'creative' ? 'Generating...' : 'Processing...'}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {editType === 'creative' 
                  ? (!novelSkeleton ? 'Create Novel Skeleton' 
                     : chapterOutlines.length === 0 ? 'Generate Chapter Outline'
                     : 'Generate Chapter Sample')
                  : 'Generate Edit Suggestions'}
              </>
            )}
          </Button>

          {/* Advanced Analysis Tools */}
          {document && editType !== 'creative' && (
            <Card className="bg-dark-bg border-dark-border mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-300 flex items-center">
                  <Brain className="h-4 w-4 mr-2 text-green-400" />
                  Advanced Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Add readability analysis
                      toast({
                        title: "Readability Analysis",
                        description: "Analyzing text readability metrics...",
                      });
                    }}
                    className="text-xs border-dark-border text-gray-300 hover:bg-dark-border"
                  >
                    Readability
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Add dialogue analysis
                      toast({
                        title: "Dialogue Analysis",
                        description: "Analyzing dialogue quality and distribution...",
                      });
                    }}
                    className="text-xs border-dark-border text-gray-300 hover:bg-dark-border"
                  >
                    Dialogue
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Add clarity analysis
                      toast({
                        title: "Clarity Analysis",
                        description: "Analyzing text clarity and conciseness...",
                      });
                    }}
                    className="text-xs border-dark-border text-gray-300 hover:bg-dark-border"
                  >
                    Clarity
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Add sentiment arc analysis
                      toast({
                        title: "Sentiment Arc",
                        description: "Analyzing emotional trajectory...",
                      });
                    }}
                    className="text-xs border-dark-border text-gray-300 hover:bg-dark-border"
                  >
                    Sentiment
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Comprehensive text analysis tools for professional editing
                </p>
              </CardContent>
            </Card>
          )}

          <div className="text-xs text-gray-500 space-y-1 bg-dark-bg p-3 rounded border border-dark-border mt-2">
            <div className="flex items-center justify-between">
              <span>Provider:</span>
              <Badge variant="secondary" className="bg-vscode-blue/80 text-white">
                {provider === 'openai' ? 'ChatGPT' : 'Gemini'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Mode:</span>
              <Badge variant="outline" className="text-gray-400 border-gray-600">
                {editType === 'developmental' ? 'Structural' : editType === 'line' ? 'Line-by-line' : 'Creative'}
              </Badge>
            </div>
          </div>
        </>
      )}
    </div>
  );
}