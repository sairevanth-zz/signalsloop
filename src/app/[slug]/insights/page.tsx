'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Redirect /insights to /ai-insights for convenience
 */
export default function InsightsRedirectPage() {
    const params = useParams();
    const router = useRouter();

    useEffect(() => {
        if (params?.slug) {
            router.replace(`/${params.slug}/ai-insights`);
        }
    }, [params?.slug, router]);

    return (
        <div className="flex items-center justify-center h-screen">
            <p className="text-gray-600">Redirecting to AI Insights...</p>
        </div>
    );
}
