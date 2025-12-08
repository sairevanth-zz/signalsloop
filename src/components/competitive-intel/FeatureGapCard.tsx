import React from 'react';
import { Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CompetitiveAnalysis } from '@/lib/competitive-intel/types';

interface FeatureGapsProps {
    gaps: CompetitiveAnalysis['feature_gaps'];
}

export function FeatureGaps({ gaps }: FeatureGapsProps) {
    if (!gaps || gaps.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Feature Gaps to Exploit</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gaps.map((gap, idx) => (
                    <Card key={idx} className="bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 hover:shadow-md transition-shadow">
                        <CardContent className="pt-6 space-y-3">
                            <h4 className="font-bold text-lg text-blue-900 dark:text-blue-100">{gap.feature}</h4>

                            <div className="text-sm">
                                <p className="text-muted-foreground mb-1">Missing in:</p>
                                <div className="flex flex-wrap gap-1">
                                    {gap.competitors_lacking.map(c => (
                                        <span key={c} className="px-2 py-0.5 bg-background border rounded text-xs">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="text-sm bg-background/50 p-2 rounded">
                                <span className="font-medium">Evidence: </span>
                                {gap.demand_evidence}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
