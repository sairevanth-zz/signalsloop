'use client';

import { ApiKeySettings } from '@/components/ApiKeySettings';

export default function ApiKeysDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-950">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Enhanced API Keys System
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Comprehensive widget management with live preview, analytics, security, and installation guides
          </p>
        </div>
        
        <ApiKeySettings 
          projectId="demo-project"
          projectSlug="demo"
          userPlan="pro"
          onShowNotification={(message, type) => {
            console.log(`${type.toUpperCase()}: ${message}`);
          }}
        />
      </div>
    </div>
  );
}
