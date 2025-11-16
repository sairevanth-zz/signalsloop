/**
 * Competitive Intelligence Dashboard Page
 */

import { Suspense } from 'react';
import CompetitiveIntelligenceClient from './CompetitiveIntelligenceClient';

export default function CompetitiveIntelligencePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <CompetitiveIntelligenceClient />
    </Suspense>
  );
}
