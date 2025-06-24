import { useState, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Document, Change } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { generateDiff, diffToChanges } from "@/lib/diff-utils";
import { useToast } from "@/hooks/use-toast";

export function useEditor(document?: Document) {
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [changes, setChanges] = useState<Change[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Initialize content when document changes
  useEffect(() => {
    if (document) {
      setContent(document.content);
      setOriginalContent(document.originalContent || document.content);
      setHistory([document.content]);
      setHistoryIndex(0);
    } else {
      setContent("");
      setOriginalContent("");
      setChanges([]);
      setHistory([""]);
      setHistoryIndex(0);
    }
  }, [document]);

  // Generate changes when content changes
  useEffect(() => {
    if (originalContent && content !== originalContent) {
      const diff = generateDiff(originalContent, content);
      const newChanges = diffToChanges(diff);
      setChanges(newChanges);
    } else {
      setChanges([]);
    }
  }, [content, originalContent]);

  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    
    // Update history for undo/redo
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!document) {
        // Create new document
        const response = await apiRequest('POST', '/api/documents', {
          name: 'Untitled Document.txt',
          content,
          originalContent: content,
        });
        return response.json();
      } else {
        // Update existing document
        const response = await apiRequest('PUT', `/api/documents/${document.id}`, {
          content,
        });
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      if (document) {
        queryClient.invalidateQueries({ queryKey: ['/api/documents', document.id] });
      }
      toast({
        title: "Document saved",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "There was an error saving your document.",
        variant: "destructive",
      });
    },
  });

  const acceptChange = useCallback((changeId: string) => {
    setChanges(prev => 
      prev.map(change => 
        change.id === changeId 
          ? { ...change, status: 'accepted' as const }
          : change
      )
    );
  }, []);

  const rejectChange = useCallback((changeId: string) => {
    setChanges(prev => 
      prev.map(change => 
        change.id === changeId 
          ? { ...change, status: 'rejected' as const }
          : change
      )
    );
  }, []);

  const acceptAllChanges = useCallback(() => {
    setChanges(prev => 
      prev.map(change => ({ ...change, status: 'accepted' as const }))
    );
    setOriginalContent(content);
  }, [content]);

  const rejectAllChanges = useCallback(() => {
    setContent(originalContent);
    setChanges([]);
  }, [originalContent]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setContent(history[newIndex]);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setContent(history[newIndex]);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    content,
    setContent: updateContent,
    changes,
    acceptChange,
    rejectChange,
    acceptAllChanges,
    rejectAllChanges,
    saveDocument: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    canUndo,
    canRedo,
    undo,
    redo,
  };
}
