import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Metaphor {
  text: string;
  type: string;
  frequency: number;
  contexts: string[];
  suggestions: string[];
}

interface MetaphorAnalysisResults {
  metaphors: Metaphor[];
  summary: string;
}

interface MetaphorAnalysisDisplayProps {
  results: MetaphorAnalysisResults;
}

export default function MetaphorAnalysisDisplay({ results }: MetaphorAnalysisDisplayProps) {
  if (!results || !results.metaphors) {
    return <p className="text-gray-400">No metaphor analysis data available.</p>;
  }

  return (
    <div className="p-1">
      <Card className="bg-dark-bg border-dark-border mb-4">
        <CardHeader>
          <CardTitle className="text-lg text-white">Metaphor Usage Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-300">{results.summary || "No summary provided."}</p>
        </CardContent>
      </Card>

      {results.metaphors.length > 0 ? (
        <Accordion type="single" collapsible className="w-full">
          {results.metaphors.map((metaphor, index) => (
            <AccordionItem value={`metaphor-${index}`} key={index} className="border-dark-border">
              <AccordionTrigger className="text-white hover:no-underline">
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium">{metaphor.text}</span>
                  <Badge variant="secondary" className="bg-vscode-blue/80 text-white">
                    {metaphor.type} (x{metaphor.frequency})
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-gray-400 bg-dark-bg/50 p-3 rounded-b-md">
                <div className="space-y-2">
                  <div>
                    <h4 className="font-semibold text-gray-300 mb-1">Contexts:</h4>
                    <ul className="list-disc list-inside text-xs space-y-1 max-h-32 overflow-y-auto">
                      {metaphor.contexts.map((ctx, i) => <li key={i}>"{ctx}"</li>)}
                    </ul>
                  </div>
                  {metaphor.suggestions && metaphor.suggestions.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-300 mb-1">Suggestions:</h4>
                      <ul className="list-disc list-inside text-xs space-y-1">
                        {metaphor.suggestions.map((sug, i) => <li key={i}>{sug}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="text-center text-gray-500 py-4">No specific metaphors were identified for detailed analysis.</p>
      )}
    </div>
  );
}