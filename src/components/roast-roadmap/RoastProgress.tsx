
"use client";

import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoastProgressProps {
    step: 'idle' | 'parsing' | 'roasting' | 'completed';
}

export function RoastProgress({ step }: RoastProgressProps) {
    const steps = [
        { id: 'parsing', label: 'Parsing Roadmap' },
        { id: 'roasting', label: 'Analyzing Blind Spots' },
        { id: 'completed', label: 'Generating Roast' },
    ];

    const getCurrentStepIndex = () => {
        if (step === 'idle') return -1;
        if (step === 'parsing') return 0;
        if (step === 'roasting') return 1;
        if (step === 'completed') return 3; // Finished
        return -1;
    };

    const currentIdx = getCurrentStepIndex();

    return (
        <div className="w-full max-w-md mx-auto py-8">
            <div className="space-y-4">
                {steps.map((s, idx) => {
                    const isCompleted = currentIdx > idx || step === 'completed';
                    const isCurrent = currentIdx === idx && step !== 'completed';

                    return (
                        <motion.div
                            key={s.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.2 }}
                            className="flex items-center gap-3"
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                                isCompleted ? "bg-green-500 border-green-500 text-white" :
                                    isCurrent ? "border-blue-500 text-blue-500" : "border-gray-200 text-gray-300"
                            )}>
                                {isCompleted ? <Check className="w-5 h-5" /> :
                                    isCurrent ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                        <span className="text-xs font-medium">{idx + 1}</span>}
                            </div>
                            <span className={cn(
                                "font-medium transition-colors",
                                isCompleted ? "text-gray-900 dark:text-gray-100" :
                                    isCurrent ? "text-blue-600 dark:text-blue-400" : "text-gray-400"
                            )}>
                                {s.label}
                            </span>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
