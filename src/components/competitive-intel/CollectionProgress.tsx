import React from 'react';
import { Loader2, CheckCircle, XCircle, Circle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface CollectionProgressProps {
    status: 'pending' | 'collecting' | 'analyzing' | 'completed' | 'failed';
}

export function CollectionProgress({ status }: CollectionProgressProps) {
    const steps = [
        { id: 'collecting', label: 'Collecting Reviews' },
        { id: 'analyzing', label: 'Analyzing Sentiment & Insights' },
        { id: 'completed', label: 'Finalizing Report' },
    ];

    const currentStepIdx = steps.findIndex(s => s.id === status);
    const progress = status === 'completed' ? 100 :
        status === 'analyzing' ? 66 :
            status === 'collecting' ? 33 : 0;

    return (
        <div className="w-full max-w-md mx-auto space-y-8 p-6">
            <div className="space-y-2 text-center">
                <h3 className="text-xl font-semibold">Generating Intelligence...</h3>
                <p className="text-muted-foreground">We're reading reviews from across the web.</p>
            </div>

            <Progress value={progress} className="h-2" />

            <div className="space-y-4">
                {steps.map((step, idx) => {
                    let state: 'waiting' | 'active' | 'done' = 'waiting';
                    if (status === 'completed') state = 'done';
                    else if (idx < currentStepIdx) state = 'done';
                    else if (idx === currentStepIdx) state = 'active';

                    return (
                        <div key={step.id} className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                                {state === 'done' ? (
                                    <CheckCircle className="h-6 w-6 text-green-500" />
                                ) : state === 'active' ? (
                                    <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                                ) : (
                                    <Circle className="h-6 w-6 text-muted-foreground" />
                                )}
                            </div>
                            <div className={`font-medium ${state === 'waiting' ? 'text-muted-foreground' : ''}`}>
                                {step.label}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
