import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { WorldBuildingAnalysis } from '@shared/schema';
import { ShieldCheck, ShieldAlert, Puzzle } from 'lucide-react';

interface WorldBuildingAnalysisDisplayProps {
  results: WorldBuildingAnalysis;
}

export default function WorldBuildingAnalysisDisplay({ results }: WorldBuildingAnalysisDisplayProps) {
  if (!results) {
    return <p className="text-gray-400">No world-building analysis data available.</p>;
  }

  return (
    <div className="p-1 space-y-4">
      <Card className="bg-dark-bg border-dark-border">
        <CardHeader>
          <CardTitle className="text-lg text-white">World-Building Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-300">{results.summary || "No summary provided."}</p>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={['inconsistencies', 'consistent', 'underdeveloped']} className="w-full space-y-2">
        {results.inconsistencies?.length > 0 && (
          <AccordionItem value="inconsistencies" className="border-dark-border bg-dark-surface rounded-lg">
            <AccordionTrigger className="text-red-400 hover:no-underline px-4 py-3"><ShieldAlert className="mr-2 h-5 w-5" /> Inconsistencies</AccordionTrigger>
            <AccordionContent className="p-4 space-y-2">
              {results.inconsistencies.map((item, i) => (
                <div key={i} className="p-2 border-l-2 border-red-500/50">
                    <p className="font-semibold text-gray-300">{item.item}</p>
                    <p className="text-sm text-gray-400">{item.description}</p>
                    <p className="text-xs text-gray-500 italic mt-1">Found in: "{item.locationInText}"</p>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}

        {results.consistentElements?.length > 0 && (
          <AccordionItem value="consistent" className="border-dark-border bg-dark-surface rounded-lg">
            <AccordionTrigger className="text-green-400 hover:no-underline px-4 py-3"><ShieldCheck className="mr-2 h-5 w-5" /> Consistent Elements</AccordionTrigger>
            <AccordionContent className="p-4 space-y-2">
                {results.consistentElements.map((item, i) => (
                    <div key={i} className="p-2">
                        <p className="font-semibold text-gray-300">{item.element}</p>
                        <p className="text-sm text-gray-400">{item.description}</p>
                    </div>
                ))}
            </AccordionContent>
          </AccordionItem>
        )}

         {results.underdevelopedAreas?.length > 0 && (
          <AccordionItem value="underdeveloped" className="border-dark-border bg-dark-surface rounded-lg">
            <AccordionTrigger className="text-yellow-400 hover:no-underline px-4 py-3"><Puzzle className="mr-2 h-5 w-5" /> Underdeveloped Areas</AccordionTrigger>
            <AccordionContent className="p-4 space-y-2">
              {results.underdevelopedAreas.map((item, i) => (
                <div key={i} className="p-2">
                    <p className="font-semibold text-gray-300">{item.area}</p>
                    <p className="text-sm text-gray-400">{item.suggestion}</p>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}