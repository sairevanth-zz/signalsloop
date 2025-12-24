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
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <div className="w-full max-w-lg">
                <VotingInterface
                    pollId={pollId}
                    projectSlug={slug}
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
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Powered by SignalsLoop
                    </a>
                </div>
            </div>
        </div>
    );
}
