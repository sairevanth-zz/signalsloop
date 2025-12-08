import React from 'react';
import { AlertTriangle, Quote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompetitiveAnalysis } from '@/lib/competitive-intel/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ComplaintsListProps {
    complaints: CompetitiveAnalysis['top_complaints_by_competitor'];
}

export function ComplaintsList({ complaints }: ComplaintsListProps) {
    const competitors = Object.keys(complaints);
    if (competitors.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <h3 className="text-lg font-semibold">Top User Complaints</h3>
            </div>

            <Tabs defaultValue={competitors[0]} className="w-full">
                <TabsList className="mb-4">
                    {competitors.map(c => (
                        <TabsTrigger key={c} value={c}>{c}</TabsTrigger>
                    ))}
                </TabsList>

                {competitors.map(comp => (
                    <TabsContent key={comp} value={comp} className="space-y-4">
                        {complaints[comp].map((item, idx) => (
                            <Card key={idx} className="bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-semibold text-red-700 dark:text-red-400">
                                        {item.complaint}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="flex gap-4 text-muted-foreground">
                                        <span>Frequency: <span className="font-medium text-foreground">{item.frequency}</span></span>
                                        <span>Severity: <span className="font-medium text-foreground uppercase text-xs border px-1 rounded bg-background">{item.severity}</span></span>
                                    </div>

                                    {item.sample_quotes.length > 0 && (
                                        <div className="bg-background/80 p-3 rounded-md italic text-muted-foreground border-l-2 border-red-300">
                                            <Quote className="h-3 w-3 inline mr-1 -mt-1 opacity-50" />
                                            "{item.sample_quotes[0]}"
                                        </div>
                                    )}

                                    <div className="pt-2 border-t border-red-100 dark:border-red-900/30">
                                        <span className="font-semibold text-red-800 dark:text-red-300">Opportunity: </span>
                                        {item.opportunity}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
