'use client';

/**
 * Public Survey Response Page
 */

import React from 'react';
import { useParams } from 'next/navigation';
import { SurveyResponse } from '@/components/surveys/SurveyResponse';

export default function SurveyRespondPage() {
    const params = useParams();
    const surveyId = params?.id as string;

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#1a1d23' }}>
            <div className="w-full max-w-2xl">
                <SurveyResponse
                    surveyId={surveyId}
                    onComplete={() => {
                        // Optional: Additional handling after completion
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
