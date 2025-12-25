'use client';

/**
 * Decision Panel
 * Final GO/NO-GO/CONDITIONAL decision buttons
 */

import React from 'react';
import { Rocket, XCircle, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DecisionType } from '@/types/launch';

interface DecisionPanelProps {
    currentDecision?: DecisionType;
    onDecision: (decision: DecisionType) => void;
}

export function DecisionPanel({ currentDecision, onDecision }: DecisionPanelProps) {
    const isDecided = !!currentDecision;

    return (
        <div
            className="rounded-xl p-4 border"
            style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 214, 160, 0.1))',
                borderColor: 'rgba(16, 185, 129, 0.4)',
            }}
        >
            {isDecided ? (
                // Show current decision
                <div className="text-center">
                    <div className="text-xs text-gray-400 mb-2">Decision Recorded</div>
                    <div
                        className="text-xl font-bold mb-2"
                        style={{
                            color: currentDecision === 'go' ? '#10b981' : currentDecision === 'no_go' ? '#ef4444' : '#fbbf24',
                        }}
                    >
                        {currentDecision === 'go' && '🚀 GO'}
                        {currentDecision === 'no_go' && '⛔ NO-GO'}
                        {currentDecision === 'conditional' && '⏸️ CONDITIONAL'}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDecision(currentDecision)}
                        className="text-xs border-gray-600 text-gray-400"
                    >
                        Change Decision
                    </Button>
                </div>
            ) : (
                // Show decision buttons
                <>
                    <div className="text-center mb-3">
                        <div className="text-xs text-gray-400">Ready to decide?</div>
                    </div>

                    <div className="flex gap-2 mb-2.5">
                        <Button
                            onClick={() => onDecision('go')}
                            className="flex-1 py-3 font-bold text-[13px]"
                            style={{
                                background: 'linear-gradient(135deg, #10b981, #06d6a0)',
                                color: '#0a0f1a',
                            }}
                        >
                            🚀 GO
                        </Button>
                        <Button
                            onClick={() => onDecision('no_go')}
                            className="flex-1 py-3 font-bold text-[13px] bg-red-500 hover:bg-red-600"
                        >
                            ⛔ NO-GO
                        </Button>
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => onDecision('conditional')}
                        className="w-full py-2.5 font-semibold text-[11px] border-yellow-500/50 text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20"
                    >
                        ⏸️ Conditional
                    </Button>

                    <div className="mt-3 text-[9px] text-gray-500 text-center">
                        On GO: Outcome monitor starts, stakeholders notified
                    </div>
                </>
            )}
        </div>
    );
}

export default DecisionPanel;
