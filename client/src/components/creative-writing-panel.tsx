import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { NovelSkeleton, ChapterOutline } from '@shared/schema';
import { Loader2, Wand2 } from 'lucide-react';

interface CreativeWritingPanelProps {
    onSampleGenerated: (sample: string) => void;
}

export default function CreativeWritingPanel({ onSampleGenerated }: CreativeWritingPanelProps) {
    const [concept, setConcept] = useState("");
    const [skeleton, setSkeleton] = useState<NovelSkeleton | null>(null);
    const [chapterNumber, setChapterNumber] = useState(1);
    const [outline, setOutline] = useState<ChapterOutline | null>(null);
    const [worldAnvil, setWorldAnvil] = useState("");

    const skeletonMutation = useMutation({
        mutationFn: (concept: string) => apiRequest('POST', '/api/creative/generate-skeleton', { concept }),
        onSuccess: async (res) => {
            const data = await res.json();
            setSkeleton(data);
            toast({ title: "Novel skeleton generated!" });
        },
        onError: () => toast({ title: "Failed to generate skeleton", variant: "destructive" }),
    });

    const outlineMutation = useMutation({
        mutationFn: (params: { skeleton: NovelSkeleton; chapterNumber: number }) => 
            apiRequest('POST', '/api/creative/generate-chapter-outline', params),
        onSuccess: async (res) => {
            const data = await res.json();
            setOutline(data);
            toast({ title: `Chapter ${chapterNumber} outline generated!` });
        },
        onError: () => toast({ title: "Failed to generate outline", variant: "destructive" }),
    });

    const sampleMutation = useMutation({
        mutationFn: (params: { outline: ChapterOutline; worldAnvil: string }) =>
            apiRequest('POST', '/api/creative/generate-chapter-sample', params),
        onSuccess: async (res) => {
            const data = await res.json();
            onSampleGenerated(data.sample);
            toast({ title: "Chapter sample generated!" });
        },
        onError: () => toast({ title: "Failed to generate sample", variant: "destructive" }),
    });

    return (
        <div className="w-96 bg-dark-surface border-l border-dark-border p-4 space-y-4 overflow-y-auto">
            <h3 className="text-lg font-semibold text-white flex items-center">
                <Wand2 className="h-5 w-5 mr-2 text-vscode-blue" />
                Creative Writing Assistant
            </h3>

            <Accordion type="multiple" defaultValue={['concept']} className="w-full space-y-2">
                <AccordionItem value="concept">
                    <AccordionTrigger>Step 1: The Concept</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                        <Textarea 
                            placeholder="Enter your high-level novel concept here..."
                            value={concept}
                            onChange={(e) => setConcept(e.target.value)}
                            className="bg-dark-bg border-dark-border"
                        />
                        <Button onClick={() => skeletonMutation.mutate(concept)} disabled={!concept || skeletonMutation.isPending} className="w-full">
                            {skeletonMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Generate Novel Skeleton
                        </Button>
                    </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="outline" disabled={!skeleton}>
                    <AccordionTrigger>Step 2: Chapter Outline</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                        <Input 
                            type="number"
                            placeholder="Chapter Number"
                            value={chapterNumber}
                            onChange={(e) => setChapterNumber(parseInt(e.target.value))}
                            className="bg-dark-bg border-dark-border"
                        />
                        <Button onClick={() => skeleton && outlineMutation.mutate({ skeleton, chapterNumber })} disabled={!skeleton || outlineMutation.isPending} className="w-full">
                            {outlineMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Generate Chapter Outline
                        </Button>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sample" disabled={!outline}>
                    <AccordionTrigger>Step 3: Generate Sample</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                        <Textarea 
                            placeholder="Enter your world-building details and sensory information (the 'World Anvil')..."
                            value={worldAnvil}
                            onChange={(e) => setWorldAnvil(e.target.value)}
                            className="bg-dark-bg border-dark-border min-h-[100px]"
                        />
                        <Button onClick={() => outline && sampleMutation.mutate({ outline, worldAnvil })} disabled={!outline || !worldAnvil || sampleMutation.isPending} className="w-full">
                            {sampleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Generate Chapter Sample
                        </Button>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            {skeleton && (
                <Card className="bg-dark-bg border-dark-border">
                    <CardHeader>
                        <CardTitle className="text-white text-sm">Novel Skeleton</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-gray-300">
                        <p><strong>Title:</strong> {skeleton.title}</p>
                        <p><strong>Logline:</strong> {skeleton.logline}</p>
                        <p><strong>Themes:</strong> {skeleton.themes.join(', ')}</p>
                        <p><strong>Characters:</strong> {skeleton.characters.map(c => c.name).join(', ')}</p>
                    </CardContent>
                </Card>
            )}

            {outline && (
                <Card className="bg-dark-bg border-dark-border">
                    <CardHeader>
                        <CardTitle className="text-white text-sm">Chapter {outline.chapter}: {outline.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-gray-300">
                        <p>{outline.summary}</p>
                        <p><strong>Scenes:</strong> {outline.scenes.length}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}