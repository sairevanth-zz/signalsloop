
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
        <div className="min-h-screen py-12 px-4" style={{ background: 'linear-gradient(180deg, #FFFAF5 0%, #FFF5EB 100%)' }}>
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF4F00]/10 border border-[#FF4F00]/20 text-[#FF4F00] text-sm font-semibold mb-2">
                        <Flame className="w-4 h-4" />
                        <span>AI-Powered Roadmap Review</span>
                    </div>
                    <h1 className="font-[family-name:var(--font-fraunces)] text-4xl md:text-6xl font-bold tracking-tight text-[#2D2D2A] pb-2">
                        Roast My <span className="text-[#FF4F00]">Roadmap</span>
                    </h1>
                    <p className="text-lg text-[#5C5C57] max-w-2xl mx-auto">
                        Get your product roadmap reviewed by an AI Chief Product Officer.
                        Brutal, honest, and constructive feedback in 30 seconds.
                    </p>
                </div>

                {status === 'idle' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <RoadmapInput onInputChange={handleInputChange} />

                        <div>
                            <div className="px-1 mb-2">
                                <h3 className="text-sm font-semibold text-[#8A8A85] uppercase tracking-wider">Optional Context</h3>
                            </div>
                            <ContextForm data={context} onChange={setContext} />
                        </div>

                        <div className="flex justify-center">
                            <Button
                                size="lg"
                                className="text-lg px-8 py-6 bg-[#FF4F00] hover:bg-[#E64700] text-white shadow-lg shadow-[#FF4F00]/25 transform transition hover:scale-105 rounded-xl font-semibold"
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
