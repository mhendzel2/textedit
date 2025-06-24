import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { PlotStructureAnalysis } from '@shared/schema';
import { BookOpen, TrendingUp, TrendingDown, Target } from 'lucide-react';

interface PlotStructureAnalysisDisplayProps {
  results: PlotStructureAnalysis;
}

export default function PlotStructureAnalysisDisplay({ results }: PlotStructureAnalysisDisplayProps) {
  if (!results) {
    return <p className="text-gray-400">No plot structure analysis data available.</p>;
  }

  return (
    <div className="p-1 space-y-4">
      <Card className="bg-dark-bg border-dark-border">
        <CardHeader>
          <CardTitle className="text-lg text-white">Plot Structure Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-300">{results.summary || "No summary provided."}</p>
        </CardContent>
      </Card>

      {results.comparisonToModel && (
        <Card className="bg-dark-surface border-dark-border">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center">
              <Target className="mr-2 h-5 w-5" />
              {results.comparisonToModel.modelName} Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-300">{results.comparisonToModel.alignmentNotes}</p>
          </CardContent>
        </Card>
      )}

      <Accordion type="multiple" defaultValue={['plot-points', 'strengths', 'weaknesses']} className="w-full space-y-2">
        {results.identifiedPlotPoints?.length > 0 && (
          <AccordionItem value="plot-points" className="border-dark-border bg-dark-surface rounded-lg">
            <AccordionTrigger className="text-blue-400 hover:no-underline px-4 py-3">
              <BookOpen className="mr-2 h-5 w-5" /> Plot Points Identified
            </AccordionTrigger>
            <AccordionContent className="p-4 space-y-3">
              {results.identifiedPlotPoints.map((point, i) => (
                <div key={i} className="p-3 border border-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-blue-300 border-blue-500/50">
                      {point.pointName}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{point.description}</p>
                  <p className="text-xs text-gray-500 italic">
                    Location: "{point.locationInText}"
                  </p>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}

        {results.strengths?.length > 0 && (
          <AccordionItem value="strengths" className="border-dark-border bg-dark-surface rounded-lg">
            <AccordionTrigger className="text-green-400 hover:no-underline px-4 py-3">
              <TrendingUp className="mr-2 h-5 w-5" /> Strengths
            </AccordionTrigger>
            <AccordionContent className="p-4 space-y-2">
              {results.strengths.map((strength, i) => (
                <div key={i} className="p-2 border-l-2 border-green-500/50">
                  <p className="text-sm text-gray-300">{strength}</p>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}

        {results.weaknesses?.length > 0 && (
          <AccordionItem value="weaknesses" className="border-dark-border bg-dark-surface rounded-lg">
            <AccordionTrigger className="text-red-400 hover:no-underline px-4 py-3">
              <TrendingDown className="mr-2 h-5 w-5" /> Areas for Improvement
            </AccordionTrigger>
            <AccordionContent className="p-4 space-y-2">
              {results.weaknesses.map((weakness, i) => (
                <div key={i} className="p-2 border-l-2 border-red-500/50">
                  <p className="text-sm text-gray-300">{weakness}</p>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}