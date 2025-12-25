'use client';

/**
 * Decision Panel Component
 * Final GO/NO-GO/CONDITIONAL decision buttons
 */

import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DecisionPanelProps {
    currentDecision: 'go' | 'no_go' | 'conditional' | null | undefined;
    onDecision: (decision: 'go' | 'no_go' | 'conditional') => void;
}

export function DecisionPanel({ currentDecision, onDecision }: DecisionPanelProps) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-200 dark:border-white/10">
            <div className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold mb-2 text-center">
                Ready to decide?
            </div>

            <div className="flex gap-2 mb-2">
                <Button
                    onClick={() => onDecision('go')}
                    className={cn(
                        'flex-1 gap-1',
                        currentDecision === 'go'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                    )}
                    size="sm"
                >
                    <CheckCircle className="w-4 h-4" />
                    GO
                </Button>
                <Button
                    onClick={() => onDecision('no_go')}
                    className={cn(
                        'flex-1 gap-1',
                        currentDecision === 'no_go'
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                    )}
                    size="sm"
                >
                    <XCircle className="w-4 h-4" />
                    NO-GO
                </Button>
            </div>

            <Button
                onClick={() => onDecision('conditional')}
                variant="outline"
                className={cn(
                    'w-full gap-1',
                    currentDecision === 'conditional'
                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-700 dark:text-yellow-300'
                        : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                )}
                size="sm"
            >
                <AlertCircle className="w-4 h-4" />
                Conditional
            </Button>

            {currentDecision && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center mt-2">
                    Current decision: <span className="font-semibold">{currentDecision.replace('_', '-').toUpperCase()}</span>
                </p>
            )}
        </div>
    );
}

export default DecisionPanel;
