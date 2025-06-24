import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ThemeAnalysis } from '@shared/schema';
import { Lightbulb, Quote } from 'lucide-react';

interface ThemeAnalysisDisplayProps {
  results: ThemeAnalysis;
}

export default function ThemeAnalysisDisplay({ results }: ThemeAnalysisDisplayProps) {
  if (!results || !results.themes) {
    return <p className="text-gray-400">No theme analysis data available.</p>;
  }

  return (
    <div className="p-1 space-y-4">
      <Card className="bg-dark-bg border-dark-border">
        <CardHeader>
          <CardTitle className="text-lg text-white">Theme Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-300">{results.summary || "No summary provided."}</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {results.themes.map((theme, index) => (
          <Card key={index} className="bg-dark-surface border-dark-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-5 w-5 text-yellow-400" />
                <CardTitle className="text-base text-white">{theme.themeName}</CardTitle>
              </div>
              <p className="text-sm text-gray-300">{theme.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold text-gray-300 mb-2">Development Assessment:</h4>
                <p className="text-sm text-gray-400">{theme.developmentAssessment}</p>
              </div>
              
              {theme.occurrences && theme.occurrences.length > 0 && (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value={`occurrences-${index}`} className="border-gray-700">
                    <AccordionTrigger className="text-sm text-gray-300 hover:no-underline py-2">
                      <div className="flex items-center gap-2">
                        <Quote className="h-4 w-4" />
                        <span>View Occurrences ({theme.occurrences.length})</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 space-y-2">
                      {theme.occurrences.map((occurrence, i) => (
                        <div key={i} className="p-2 border-l-2 border-yellow-500/50 bg-gray-800/50 rounded">
                          <p className="text-sm text-gray-300 mb-1">"{occurrence.text}"</p>
                          <p className="text-xs text-gray-500 italic">
                            Location: {occurrence.locationInText}
                          </p>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}