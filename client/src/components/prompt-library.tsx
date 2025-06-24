import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, BookOpen, Edit, Trash2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SavedPrompt {
  id: string;
  name: string;
  content: string;
  type: 'developmental' | 'line';
  category: string;
  createdAt: Date;
}

interface PromptLibraryProps {
  onPromptSelect: (prompt: string) => void;
  editType: 'developmental' | 'line';
}

export default function PromptLibrary({ onPromptSelect, editType }: PromptLibraryProps) {
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([
    {
      id: '1',
      name: 'Structure Improvement',
      content: 'Improve the overall structure and flow of this document. Focus on logical organization, clear transitions between sections, and ensuring each paragraph contributes to the main argument.',
      type: 'developmental',
      category: 'Structure',
      createdAt: new Date(),
    },
    {
      id: '2',
      name: 'Grammar & Style Polish',
      content: 'Polish the grammar, punctuation, and writing style. Fix any grammatical errors, improve sentence variety, and ensure consistent tone throughout.',
      type: 'line',
      category: 'Style',
      createdAt: new Date(),
    },
    {
      id: '3',
      name: 'Clarity Enhancement',
      content: 'Enhance clarity and readability. Simplify complex sentences, replace jargon with accessible language, and ensure the main points are clearly communicated.',
      type: 'developmental',
      category: 'Clarity',
      createdAt: new Date(),
    },
  ]);
  
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPrompt, setNewPrompt] = useState({
    name: '',
    content: '',
    category: '',
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { toast } = useToast();

  const categories = ['all', ...Array.from(new Set(savedPrompts.map(p => p.category)))];
  const filteredPrompts = savedPrompts.filter(prompt => 
    prompt.type === editType && 
    (selectedCategory === 'all' || prompt.category === selectedCategory)
  );

  const handleSavePrompt = () => {
    if (!newPrompt.name.trim() || !newPrompt.content.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both name and content for the prompt.",
        variant: "destructive",
      });
      return;
    }

    const prompt: SavedPrompt = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPrompt.name,
      content: newPrompt.content,
      type: editType,
      category: newPrompt.category || 'General',
      createdAt: new Date(),
    };

    setSavedPrompts(prev => [...prev, prompt]);
    setNewPrompt({ name: '', content: '', category: '' });
    setShowSaveDialog(false);
    
    toast({
      title: "Prompt saved",
      description: `"${prompt.name}" has been added to your library.`,
    });
  };

  const handleDeletePrompt = (id: string) => {
    setSavedPrompts(prev => prev.filter(p => p.id !== id));
    toast({
      title: "Prompt deleted",
      description: "The prompt has been removed from your library.",
    });
  };

  const handleCopyPrompt = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      description: "The prompt has been copied to your clipboard.",
    });
  };

  return (
    <Card className="bg-dark-bg border-dark-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-gray-300 flex items-center">
            <BookOpen className="h-4 w-4 mr-2" />
            Prompt Library
          </CardTitle>
          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-dark-surface border-dark-border">
              <DialogHeader>
                <DialogTitle className="text-white">Save New Prompt</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Name</label>
                  <Input
                    value={newPrompt.name}
                    onChange={(e) => setNewPrompt(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter prompt name..."
                    className="bg-dark-bg border-dark-border text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Category</label>
                  <Input
                    value={newPrompt.category}
                    onChange={(e) => setNewPrompt(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g., Structure, Style, Clarity..."
                    className="bg-dark-bg border-dark-border text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Content</label>
                  <Textarea
                    value={newPrompt.content}
                    onChange={(e) => setNewPrompt(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter the prompt content..."
                    className="bg-dark-bg border-dark-border text-white min-h-[120px]"
                    rows={5}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSavePrompt} className="bg-vscode-blue hover:bg-blue-600">
                    Save Prompt
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Category Filter */}
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="bg-dark-bg border-dark-border text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-dark-surface border-dark-border">
            {categories.map(category => (
              <SelectItem key={category} value={category} className="text-white capitalize">
                {category === 'all' ? 'All Categories' : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator className="bg-dark-border" />

        {/* Prompts List */}
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {filteredPrompts.length === 0 ? (
              <div className="text-center py-6">
                <BookOpen className="h-6 w-6 text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No {editType} prompts saved</p>
                <p className="text-xs text-gray-600">Create your first prompt to get started</p>
              </div>
            ) : (
              filteredPrompts.map((prompt) => (
                <div key={prompt.id} className="border border-dark-border rounded p-3 bg-dark-surface">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-medium text-white">{prompt.name}</h4>
                      <Badge variant="secondary" className="bg-vscode-blue text-white text-xs mt-1">
                        {prompt.category}
                      </Badge>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyPrompt(prompt.content)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePrompt(prompt.id)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-2 line-clamp-2">{prompt.content}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPromptSelect(prompt.content)}
                    className="w-full bg-transparent border-dark-border text-gray-300 hover:bg-vscode-blue hover:text-white"
                  >
                    Use This Prompt
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}