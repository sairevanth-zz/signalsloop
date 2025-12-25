'use client';

/**
 * Retrospective Board Detail Page
 * Period-aware retrospective view
 */

import React from 'react';
import { useParams } from 'next/navigation';
import { RetrospectiveDashboard } from '@/components/retro';

export default function RetroBoardPage() {
    const params = useParams();
    const projectSlug = params?.slug as string;
    const boardId = params?.boardId as string;

    return (
        <RetrospectiveDashboard
            boardId={boardId}
            projectSlug={projectSlug}
        />
    );
}
