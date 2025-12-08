
"use client";

import { motion } from "framer-motion";
import { ConfidenceGauge } from "./ConfidenceGauge";
import { RoastSection } from "./RoastSection";
import { ShareButton } from "./ShareButton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Interface matching the backend result
export interface RoastResult {
    confidence_score: number;
    verdict: string;
    one_liner: string;
    score_breakdown: {
        base: number;
        adjustments: { reason: string; points: number }[];
    };
    blind_spots: {
        gap: string;
        why_it_matters: string;
        severity: 'critical' | 'high' | 'medium';
        suggestion: string;
    }[];
    demand_questions: {
        feature: string;
        concern: string;
        question: string;
        validation_idea: string;
    }[];
    assumption_challenges: {
        assumption: string;
        risk: string;
        test: string;
    }[];
    quick_wins: string[];
    whats_good: string[];
}

interface RoastResultsProps {
    roast: RoastResult;
    shareToken?: string;
    isPublicView?: boolean;
}

export function RoastResults({ roast, shareToken, isPublicView = false }: RoastResultsProps) {

    const getVerdictColor = (v: string) => {
        const lower = v.toLowerCase();
        if (lower.includes("strong") || lower.includes("solid")) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
        if (lower.includes("risky") || lower.includes("weak")) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-center gap-8 justify-center p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                <div className="flex-shrink-0">
                    <ConfidenceGauge score={roast.confidence_score} />
                </div>

                <div className="flex-1 text-center md:text-left space-y-4">
                    <div className="space-y-2">
                        <Badge className={`text-base px-4 py-1 rounded-full ${getVerdictColor(roast.verdict)} hover:bg-opacity-80`}>
                            {roast.verdict}
                        </Badge>
                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                            "{roast.one_liner}"
                        </h2>
                    </div>

                    {shareToken && (
                        <div className="pt-2">
                            <ShareButton shareToken={shareToken} />
                        </div>
                    )}
                </div>
            </div>

            {/* Analysis Sections */}
            <div className="space-y-6">

                {/* Blind Spots - Critical */}
                {roast.blind_spots.length > 0 && (
                    <RoastSection title="Blind Spots" count={roast.blind_spots.length} type="blind_spots" defaultOpen>
                        <div className="space-y-4">
                            {roast.blind_spots.map((item, i) => (
                                <Card key={i} className="p-4 border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/10">
                                    <h4 className="font-bold text-red-700 dark:text-red-400 mb-1">{item.gap}</h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{item.why_it_matters}</p>
                                    <p className="text-sm text-gray-500 italic">💡 Suggestion: {item.suggestion}</p>
                                </Card>
                            ))}
                        </div>
                    </RoastSection>
                )}

                {/* Demand Questions */}
                {roast.demand_questions.length > 0 && (
                    <RoastSection title="Questionable Demand" count={roast.demand_questions.length} type="demand">
                        <div className="grid gap-4 md:grid-cols-2">
                            {roast.demand_questions.map((item, i) => (
                                <Card key={i} className="p-4 bg-yellow-50/30 dark:bg-yellow-950/10">
                                    <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{item.feature}</h4>
                                    <p className="text-sm text-yellow-800 dark:text-yellow-500 font-medium mb-1">⚠️ {item.concern}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Ask: "{item.question}"</p>
                                </Card>
                            ))}
                        </div>
                    </RoastSection>
                )}

                {/* Assumptions */}
                {roast.assumption_challenges.length > 0 && (
                    <RoastSection title="Risky Assumptions" count={roast.assumption_challenges.length} type="assumptions">
                        <div className="space-y-3">
                            {roast.assumption_challenges.map((item, i) => (
                                <div key={i} className="flex gap-3 items-start p-3 rounded-lg border bg-card">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 dark:text-gray-100">Assumption: {item.assumption}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Risk: {item.risk}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </RoastSection>
                )}

                {/* Quick Wins & Good Stuff */}
                <div className="grid md:grid-cols-2 gap-6">
                    <RoastSection title="Quick Wins" type="quick_wins">
                        <ul className="space-y-2">
                            {roast.quick_wins.map((win, i) => (
                                <li key={i} className="flex gap-2 items-start text-sm">
                                    <span className="text-blue-500 mt-1">⚡</span>
                                    <span>{win}</span>
                                </li>
                            ))}
                        </ul>
                    </RoastSection>

                    <RoastSection title="What's Good" type="good">
                        <ul className="space-y-2">
                            {roast.whats_good.map((good, i) => (
                                <li key={i} className="flex gap-2 items-start text-sm">
                                    <span className="text-green-500 mt-1">✓</span>
                                    <span>{good}</span>
                                </li>
                            ))}
                        </ul>
                    </RoastSection>
                </div>
            </div>
        </div>
    );
}
