'use client';

/**
 * Public Poll Voting Page
 */

import React from 'react';
import { useParams } from 'next/navigation';
import { VotingInterface } from '@/components/polls/VotingInterface';

export default function PollVotePage() {
    const params = useParams();
    const pollId = params?.id as string;
    const slug = params?.slug as string;

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#1a1d23' }}>
            <div className="w-full max-w-lg">
                <VotingInterface
                    pollId={pollId}
                    showResults={true}
                    onVoteComplete={() => {
                        // Optional: redirect or show additional content
                    }}
                />

                {/* Powered by footer */}
                <div className="mt-6 text-center">
                    <a
                        href="https://signalsloop.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
                    >
                        Powered by SignalsLoop
                    </a>
                </div>
            </div>
        </div>
    );
}
