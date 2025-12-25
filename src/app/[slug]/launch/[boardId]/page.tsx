'use client';

/**
 * Launch Board Detail Page
 * Go/No-Go Dashboard view
 */

import React from 'react';
import { useParams } from 'next/navigation';
import { GoNoGoDashboard } from '@/components/launch';

export default function LaunchBoardPage() {
    const params = useParams();
    const projectSlug = params?.slug as string;
    const boardId = params?.boardId as string;

    return (
        <GoNoGoDashboard
            boardId={boardId}
            projectSlug={projectSlug}
        />
    );
}
