import { Change } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface ComparisonPanelProps {
  originalContent: string;
  modifiedContent: string;
  changes: Change[];
}

export default function ComparisonPanel({
  originalContent,
  modifiedContent,
  changes,
}: ComparisonPanelProps) {
  const originalLines = (originalContent || "").split('\n');
  const modifiedLines = (modifiedContent || "").split('\n');

  const getChangeForLine = (lineNumber: number) => {
    return changes.find(change => change.lineNumber === lineNumber + 1);
  };

  return (
    <div className="w-1/2 border-l border-dark-border bg-editor-bg">
      <div className="p-4 border-b border-dark-border">
        <h3 className="text-white font-medium">Original Version</h3>
        <p className="text-xs text-gray-400 mt-1">Compare with current changes</p>
      </div>
      
      <div className="flex h-full">
        {/* Original Content */}
        <div className="flex-1 border-r border-dark-border">
          <div className="bg-gray-800 px-4 py-2 border-b border-dark-border">
            <h4 className="text-sm font-medium text-gray-300">Original</h4>
          </div>
          <ScrollArea className="h-full">
            <div className="p-4 font-mono text-sm">
              {originalLines.map((line, index) => (
                <div key={index} className="flex items-start py-1">
                  <span className="text-xs text-gray-500 w-8 text-right mr-4 flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-gray-300 whitespace-pre-wrap break-all">
                    {line || '\u00A0'}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Modified Content */}
        <div className="flex-1">
          <div className="bg-gray-800 px-4 py-2 border-b border-dark-border">
            <h4 className="text-sm font-medium text-gray-300">Modified</h4>
          </div>
          <ScrollArea className="h-full">
            <div className="p-4 font-mono text-sm">
              {modifiedLines.map((line, index) => {
                const change = getChangeForLine(index);
                let bgColor = "";
                let borderColor = "";
                
                if (change) {
                  switch (change.type) {
                    case "addition":
                      bgColor = change.status === "pending" ? "bg-green-900/30" : "bg-green-900/20";
                      borderColor = "border-l-4 border-green-500";
                      break;
                    case "modification":
                      bgColor = change.status === "pending" ? "bg-yellow-900/30" : "bg-yellow-900/20";
                      borderColor = "border-l-4 border-yellow-500";
                      break;
                    case "deletion":
                      bgColor = change.status === "pending" ? "bg-red-900/30" : "bg-red-900/20";
                      borderColor = "border-l-4 border-red-500";
                      break;
                  }
                }

                return (
                  <div 
                    key={index} 
                    className={`flex items-start py-1 relative group ${bgColor} ${borderColor}`}
                  >
                    <span className="text-xs text-gray-500 w-8 text-right mr-4 flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className={`text-gray-300 whitespace-pre-wrap break-all flex-1 ${
                      change?.type === "deletion" ? "line-through" : ""
                    }`}>
                      {line || '\u00A0'}
                    </span>
                    
                    {change && change.status === "pending" && (
                      <div className="absolute right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-green-400 hover:text-green-300"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
