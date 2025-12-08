
"use client";

import { useState } from "react";
import { RoadmapInput } from "@/components/roast-roadmap/RoadmapInput";
import { ContextForm, ContextData } from "@/components/roast-roadmap/ContextForm";
import { RoastProgress } from "@/components/roast-roadmap/RoastProgress";
import { RoastResults, RoastResult } from "@/components/roast-roadmap/RoastResults";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { parseRoadmapAction, generateRoastAction } from "@/lib/roast-roadmap/actions";
import { Flame } from "lucide-react";

export default function RoastPage() {
    const [inputType, setInputType] = useState<'text' | 'image' | 'file'>('text');
    const [inputValue, setInputValue] = useState<string | File>("");
    const [context, setContext] = useState<ContextData>({
        industry: "",
        companyStage: "",
        teamSize: "",
    });

    const [status, setStatus] = useState<'idle' | 'parsing' | 'roasting' | 'completed'>('idle');
    const [roastResult, setRoastResult] = useState<RoastResult | null>(null);
    const [shareToken, setShareToken] = useState<string | undefined>(undefined);

    const handleInputChange = (type: 'text' | 'image' | 'file', value: string | File) => {
        setInputType(type);
        setInputValue(value);
    };

    const handleRoast = async () => {
        if (!inputValue) {
            toast.error("Please provide a roadmap input first.");
            return;
        }

        try {
            setStatus('parsing');

            // prepare form data
            const formData = new FormData();
            formData.append('inputType', inputType);

            if (inputType === 'text') {
                formData.append('rawText', inputValue as string);
            } else if (inputType === 'image') {
                formData.append('imageFile', inputValue as File);
            } else {
                formData.append('documentFile', inputValue as File);
            }

            // 1. Parse
            const parseRes = await parseRoadmapAction(formData);

            if (!parseRes.success || !parseRes.sessionToken) {
                throw new Error(parseRes.error || "Failed to parse roadmap");
            }

            setStatus('roasting');

            // 2. Analyzye
            const roastRes = await generateRoastAction(parseRes.sessionToken, context);

            if (!roastRes.success || !roastRes.roast) {
                throw new Error(roastRes.error || "Failed to generate roast");
            }

            setRoastResult(roastRes.roast);
            setShareToken(roastRes.shareToken);
            setStatus('completed');

        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Something went wrong");
            setStatus('idle');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center p-3 bg-red-100 dark:bg-red-900/30 rounded-full mb-2">
                        <Flame className="w-8 h-8 text-red-600 dark:text-red-500" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                        Roast My Roadmap
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Get your product roadmap reviewed by an AI Chief Product Officer.
                        Brutal, honest, and constructive feedback in 30 seconds.
                    </p>
                </div>

                {status === 'idle' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <RoadmapInput onInputChange={handleInputChange} />

                        <div>
                            <div className="px-1 mb-2">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Optional Context</h3>
                            </div>
                            <ContextForm data={context} onChange={setContext} />
                        </div>

                        <div className="flex justify-center">
                            <Button
                                size="lg"
                                className="text-lg px-8 py-6 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg transform transition hover:scale-105"
                                onClick={handleRoast}
                                disabled={!inputValue}
                            >
                                🔥 Roast My Roadmap
                            </Button>
                        </div>
                    </div>
                )}

                {status !== 'idle' && status !== 'completed' && (
                    <div className="py-12">
                        <RoastProgress step={status} />
                        <p className="text-center text-gray-500 text-sm mt-4 animate-pulse">
                            This usually takes about 20-30 seconds...
                        </p>
                    </div>
                )}

                {status === 'completed' && roastResult && (
                    <RoastResults roast={roastResult} shareToken={shareToken} />
                )}

            </div>
        </div>
    );
}
