'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AIInsightsPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    // Redirect to the board page since we're using the modal approach now
    const projectSlug = params?.slug as string;
    if (projectSlug) {
      router.replace(`/${projectSlug}/board`);
    }
  }, [params, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <p className="text-gray-600">Redirecting to board...</p>
    </div>
  );
}
