import { Document, Change } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, File, Clock } from "lucide-react";

interface FileSidebarProps {
  documents: Document[];
  selectedDocumentId: number | null;
  onDocumentSelect: (id: number) => void;
  onUpload: () => void;
  changes: Change[];
}

export default function FileSidebar({
  documents,
  selectedDocumentId,
  onDocumentSelect,
  onUpload,
  changes,
}: FileSidebarProps) {
  const getChangeCount = (documentId: number) => {
    return changes.filter(change => change.status === 'pending').length;
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <aside className="w-80 bg-sidebar-bg border-r border-dark-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">TextEdit Pro</h2>
        </div>
        
        <Button
          onClick={onUpload}
          className="w-full bg-vscode-blue hover:bg-blue-600 text-white"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload DOCX
        </Button>
      </div>

      {/* Recent Files */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wide">
            Recent Files
          </h3>
          
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <File className="h-8 w-8 text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No documents yet</p>
              <p className="text-xs text-gray-600 mt-1">Upload a DOCX file to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((document) => {
                const changeCount = getChangeCount(document.id);
                const isSelected = selectedDocumentId === document.id;
                
                return (
                  <div
                    key={document.id}
                    onClick={() => onDocumentSelect(document.id)}
                    className={`p-3 rounded cursor-pointer transition-colors group ${
                      isSelected
                        ? "bg-vscode-blue text-white"
                        : "bg-dark-surface hover:bg-dark-border text-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0">
                        <File className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {document.name}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(document.updatedAt)}
                          </p>
                        </div>
                      </div>
                      {changeCount > 0 && (
                        <Badge variant="secondary" className="bg-yellow-600 text-white text-xs">
                          {changeCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-t border-dark-border">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between items-center">
            <span>Total Changes:</span>
            <span>{changes.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Accepted:</span>
            <span className="text-green-400">
              {changes.filter(c => c.status === 'accepted').length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Pending:</span>
            <span className="text-yellow-400">
              {changes.filter(c => c.status === 'pending').length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Rejected:</span>
            <span className="text-red-400">
              {changes.filter(c => c.status === 'rejected').length}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
