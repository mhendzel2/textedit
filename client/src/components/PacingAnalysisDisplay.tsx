import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PacingAnalysis } from '@shared/schema';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PacingAnalysisDisplayProps {
  results: PacingAnalysis;
}

export default function PacingAnalysisDisplay({ results }: PacingAnalysisDisplayProps) {
  if (!results || !results.sections) {
    return <p className="text-gray-400">No pacing analysis data available.</p>;
  }

  const getPaceIcon = (pace: 'slow' | 'appropriate' | 'fast') => {
    switch (pace) {
      case 'slow': return <TrendingDown className="h-5 w-5 text-blue-400" />;
      case 'fast': return <TrendingUp className="h-5 w-5 text-red-400" />;
      default: return <Minus className="h-5 w-5 text-green-400" />;
    }
  };

  return (
    <div className="p-1 space-y-4">
      <Card className="bg-dark-bg border-dark-border">
        <CardHeader>
          <CardTitle className="text-lg text-white">Overall Pacing Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-300">{results.overallPacingAssessment || "No overall assessment provided."}</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {results.sections.map((section, index) => (
          <Card key={index} className="bg-dark-surface border-dark-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-white">{section.description}</CardTitle>
                <Badge variant={section.paceRating === 'appropriate' ? 'default' : 'secondary'} className={`capitalize ${section.paceRating === 'fast' ? 'bg-red-500/80' : section.paceRating === 'slow' ? 'bg-blue-500/80' : 'bg-green-500/80'}`}>
                  {getPaceIcon(section.paceRating)}
                  <span className="ml-2">{section.paceRating}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400 mb-3">{section.comment}</p>
              {section.suggestions && section.suggestions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-300 mb-1">Suggestions:</h4>
                  <ul className="list-disc list-inside text-xs space-y-1 text-gray-400">
                    {section.suggestions.map((sug, i) => <li key={i}>{sug}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}