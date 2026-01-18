/**
 * Experiment Suggestions Component
 * AI-generated experiment ideas based on feedback themes
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Sparkles,
    Lightbulb,
    ArrowRight,
    RefreshCw,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react';

interface ExperimentSuggestion {
    id: string;
    title: string;
    hypothesis: string;
    expectedImpact: 'high' | 'medium' | 'low';
    category: string;
    basedOn: string;
}

interface ExperimentSuggestionsProps {
    projectId: string;
    onCreateExperiment: (suggestion: ExperimentSuggestion) => void;
}

export function ExperimentSuggestions({ projectId, onCreateExperiment }: ExperimentSuggestionsProps) {
    const [suggestions, setSuggestions] = useState<ExperimentSuggestion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSuggestions();
    }, [projectId]);

    const fetchSuggestions = async () => {
        setLoading(true);
        try {
            // For now, generate static suggestions based on common experiment patterns
            // In production, this would call /api/experiments/suggestions
            const mockSuggestions: ExperimentSuggestion[] = [
                {
                    id: '1',
                    title: 'Social Proof Enhancement',
                    hypothesis: 'Adding customer testimonials and usage stats to the pricing page will increase conversions by 15%',
                    expectedImpact: 'high',
                    category: 'Conversion',
                    basedOn: 'User feedback mentions trust concerns',
                },
                {
                    id: '2',
                    title: 'Simplified Onboarding',
                    hypothesis: 'Reducing onboarding steps from 5 to 3 will improve activation rate by 20%',
                    expectedImpact: 'high',
                    category: 'Activation',
                    basedOn: 'High drop-off during signup detected',
                },
                {
                    id: '3',
                    title: 'Feature Discovery',
                    hypothesis: 'Adding tooltips for key features will increase feature adoption by 25%',
                    expectedImpact: 'medium',
                    category: 'Engagement',
                    basedOn: 'Users request features that already exist',
                },
            ];
            setSuggestions(mockSuggestions);
        } catch (error) {
            console.error('[ExperimentSuggestions] Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const impactColors = {
        high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    };

    const impactIcons = {
        high: TrendingUp,
        medium: Zap,
        low: Users,
    };

    if (loading) {
        return (
            <Card className="p-6">
                <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin text-gray-400 mr-2" />
                    <span className="text-gray-500">Analyzing feedback for experiment ideas...</span>
                </div>
            </Card>
        );
    }

    if (suggestions.length === 0) {
        return null;
    }

    return (
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">AI Experiment Suggestions</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchSuggestions}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Based on your user feedback, here are high-impact experiments to consider:
            </p>

            <div className="space-y-3">
                {suggestions.map((suggestion) => {
                    const ImpactIcon = impactIcons[suggestion.expectedImpact];
                    return (
                        <div
                            key={suggestion.id}
                            className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                                        <span className="font-medium text-gray-900 dark:text-white">{suggestion.title}</span>
                                        <Badge className={impactColors[suggestion.expectedImpact]}>
                                            <ImpactIcon className="h-3 w-3 mr-1" />
                                            {suggestion.expectedImpact} impact
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        {suggestion.hypothesis}
                                    </p>
                                    <p className="text-xs text-purple-600 dark:text-purple-400">
                                        💡 {suggestion.basedOn}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onCreateExperiment(suggestion)}
                                    className="shrink-0"
                                >
                                    Create
                                    <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
