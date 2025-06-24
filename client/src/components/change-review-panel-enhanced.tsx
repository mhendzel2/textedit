import React, { useState } from "react";
import { Change } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Plus, Minus, Edit, Sparkles, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChangeReviewPanelProps {
  changes: Change[];
  onAcceptChange: (changeId: string) => void;
  onRejectChange: (changeId: string) => void;
  onBulkUpdate: (updatedChanges: Change[]) => void;
}

export default function ChangeReviewPanel({
  changes,
  onAcceptChange,
  onRejectChange,
  onBulkUpdate,
}: ChangeReviewPanelProps) {
  const [instructions, setInstructions] = useState("");
  const [isAutomating, setIsAutomating] = useState(false);
  const { toast } = useToast();

  const handleAutomateReview = async () => {
    if (!instructions.trim()) {
      toast({
        title: "Instructions Required",
        description: "Please provide instructions for the automated review.",
        variant: "destructive",
      });
      return;
    }
    setIsAutomating(true);
    try {
      const response = await apiRequest('POST', '/api/documents/review-changes', {
        changes: changes.filter(c => c.status === 'pending'),
        instructions,
        provider: 'openai'
      });
      const { reviewedChanges } = await response.json();
      onBulkUpdate(reviewedChanges);
      toast({
        title: "Automated Review Complete",
        description: "Review instructions have been applied to all pending changes.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Automation Failed",
        description: "Could not apply review instructions.",
        variant: "destructive",
      });
    } finally {
      setIsAutomating(false);
    }
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case "addition":
        return <Plus className="h-3 w-3 text-green-400" />;
      case "deletion":
        return <Minus className="h-3 w-3 text-red-400" />;
      case "modification":
        return <Edit className="h-3 w-3 text-yellow-400" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-600 text-white">Pending</Badge>;
      case "accepted":
        return <Badge variant="secondary" className="bg-green-600 text-white">Accepted</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-600 text-white">Rejected</Badge>;
      default:
        return null;
    }
  };

  const pendingChanges = changes.filter(change => change.status === 'pending');
  const reviewedChanges = changes.filter(change => change.status !== 'pending');

  return (
    <div className="w-80 bg-dark-surface border-l border-dark-border flex flex-col">
      <div className="p-4 border-b border-dark-border">
        <h3 className="text-sm font-semibold text-white">Change Review</h3>
        <p className="text-xs text-gray-400 mt-1">Review and manage document changes.</p>
      </div>

      <ScrollArea className="flex-1">
        {/* Automated Review Section */}
        <div className="p-4 space-y-2 border-b border-dark-border">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Automate Review</h4>
          <Textarea
            placeholder="Enter review rules, e.g., 'Reject all changes that add contractions.' or paste from a style guide..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="bg-dark-bg border-dark-border text-white text-xs h-24"
          />
          <Button
            size="sm"
            onClick={handleAutomateReview}
            disabled={isAutomating || pendingChanges.length === 0}
            className="w-full bg-vscode-blue hover:bg-blue-600"
          >
            {isAutomating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Apply Instructions to Pending
          </Button>
        </div>

        <div className="p-4">
          {pendingChanges.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                Pending Changes ({pendingChanges.length})
              </h4>
              <div className="space-y-3">
                {pendingChanges.map((change) => (
                  <div key={change.id} className="p-3 border border-dark-border rounded-lg bg-dark-bg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getChangeIcon(change.type)}
                        <span className="text-sm font-medium text-white capitalize">{change.type}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(change.status)}
                        <span className="text-xs text-gray-500">Line {change.lineNumber}</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-300 mb-3">
                      {change.type === "modification" && change.originalContent && (
                        <div className="mb-2">
                          <span className="text-xs text-gray-500">Original:</span>
                          <div className="bg-red-900/20 border-l-2 border-red-500 pl-2 mt-1 text-xs font-mono">{change.originalContent}</div>
                        </div>
                      )}
                      <span className="text-xs text-gray-500">{change.type === "deletion" ? "Removed:" : "New:"}</span>
                      <div className={`border-l-2 pl-2 mt-1 text-xs font-mono ${change.type === "addition" ? "bg-green-900/20 border-green-500" : change.type === "deletion" ? "bg-red-900/20 border-red-500 line-through" : "bg-yellow-900/20 border-yellow-500"}`}>
                        {change.content}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" onClick={() => onAcceptChange(change.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                        <Check className="h-3 w-3 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onRejectChange(change.id)} className="flex-1 bg-red-600 hover:bg-red-700 border-red-600 text-white">
                        <X className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviewedChanges.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                Reviewed Changes ({reviewedChanges.length})
              </h4>
              <div className="space-y-2">
                {reviewedChanges.map((change) => (
                  <div key={change.id} className="p-2 border border-dark-border rounded bg-dark-bg opacity-75">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getChangeIcon(change.type)}
                        <span className="text-xs text-gray-400 capitalize">{change.type}</span>
                        <span className="text-xs text-gray-500">Line {change.lineNumber}</span>
                      </div>
                      {getStatusBadge(change.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {changes.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2"><Check className="h-8 w-8 mx-auto" /></div>
              <p className="text-sm text-gray-500">No changes to review</p>
              <p className="text-xs text-gray-600 mt-1">Start editing to see changes here</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}