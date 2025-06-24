import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CharacterVoiceAnalysis } from '@shared/schema';

interface CharacterVoiceAnalysisDisplayProps {
  results: CharacterVoiceAnalysis;
}

export default function CharacterVoiceAnalysisDisplay({ results }: CharacterVoiceAnalysisDisplayProps) {
  if (!results || !results.characterAnalyses || results.characterAnalyses.length === 0) {
    return (
      <Card className="bg-dark-bg border-dark-border text-center p-6">
        <p className="text-gray-400">No character voice analysis data available.</p>
        <p className="text-xs text-gray-500 mt-2">The AI could not identify distinct characters or voices based on the input provided.</p>
      </Card>
    );
  }

  return (
    <div className="p-1 space-y-4">
      <Card className="bg-dark-bg border-dark-border">
        <CardHeader>
          <CardTitle className="text-lg text-white">Character Voice Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-300">{results.summary || "No summary provided."}</p>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="w-full space-y-2">
        {results.characterAnalyses.map((charAnalysis, index) => (
          <Card key={index} className="bg-dark-bg border-dark-border">
            <AccordionItem value={`character-${index}`} className="border-b-0">
              <AccordionTrigger className="text-white hover:no-underline px-6 py-4">
                <div className="flex items-center justify-between w-full">
                  <span className="text-base font-medium">{charAnalysis.characterName}</span>
                  <Badge variant="outline" className="border-red-400 text-red-400">
                    {charAnalysis.inconsistentLines?.length || 0} inconsistencies
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-gray-400 bg-dark-surface/50 p-6 pt-0 space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-300 mb-2">Voice Description:</h4>
                  <p className="text-sm italic">"{charAnalysis.voiceDescription}"</p>
                </div>

                {charAnalysis.inconsistentLines && charAnalysis.inconsistentLines.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-300 mb-2">Inconsistent Lines:</h4>
                    <ul className="space-y-3">
                      {charAnalysis.inconsistentLines.map((line, i) => (
                        <li key={i} className="text-xs border-l-2 border-red-500/50 pl-3">
                          <blockquote className="italic text-gray-300">"{line.line}"</blockquote>
                          <p className="mt-1"><strong className="text-gray-400">Reason:</strong> {line.reason}</p>
                          {line.suggestion && <p className="mt-1"><strong className="text-green-400">Suggestion:</strong> "{line.suggestion}"</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                 {charAnalysis.consistentLines && charAnalysis.consistentLines.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-300 mb-2 mt-4">Consistent Examples:</h4>
                    <ul className="space-y-2">
                      {charAnalysis.consistentLines.map((line, i) => (
                        <li key={i} className="text-xs italic text-gray-500">"{line}"</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Card>
        ))}
      </Accordion>
    </div>
  );
}