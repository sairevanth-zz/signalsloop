/**
 * API Documentation Page
 * Interactive Swagger UI for the SignalsLoop API
 */

'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import 'swagger-ui-react/swagger-ui.css';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  ),
});

export default function APIDocsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Custom Header */}
      <header className="bg-slate-900 text-white py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold">S</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">SignalsLoop API</h1>
              <p className="text-sm text-slate-400">v1.0.0</p>
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <a
              href="/"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              ← Back to App
            </a>
            <a
              href="/docs"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Guides
            </a>
            <a
              href="https://github.com/signalsloop/api-examples"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Examples
            </a>
          </nav>
        </div>
      </header>

      {/* Swagger UI */}
      <div className="swagger-wrapper">
        <SwaggerUI
          url="/api/docs/openapi.json"
          docExpansion="list"
          defaultModelsExpandDepth={-1}
          displayRequestDuration
          filter
          showExtensions
          showCommonExtensions
          tryItOutEnabled
        />
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        .swagger-wrapper {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        /* Override Swagger UI styles for better appearance */
        .swagger-ui .topbar {
          display: none;
        }

        .swagger-ui .info {
          margin: 20px 0;
        }

        .swagger-ui .info .title {
          font-size: 2rem;
          font-weight: 600;
        }

        .swagger-ui .info .description {
          font-size: 0.95rem;
          line-height: 1.6;
        }

        .swagger-ui .opblock-tag {
          font-size: 1.1rem;
          font-weight: 600;
          border-bottom: 1px solid #e2e8f0;
        }

        .swagger-ui .opblock {
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-bottom: 12px;
        }

        .swagger-ui .opblock .opblock-summary {
          padding: 12px 16px;
        }

        .swagger-ui .opblock.opblock-get {
          background: rgba(59, 130, 246, 0.05);
          border-color: rgba(59, 130, 246, 0.3);
        }

        .swagger-ui .opblock.opblock-post {
          background: rgba(34, 197, 94, 0.05);
          border-color: rgba(34, 197, 94, 0.3);
        }

        .swagger-ui .opblock.opblock-put {
          background: rgba(249, 115, 22, 0.05);
          border-color: rgba(249, 115, 22, 0.3);
        }

        .swagger-ui .opblock.opblock-delete {
          background: rgba(239, 68, 68, 0.05);
          border-color: rgba(239, 68, 68, 0.3);
        }

        .swagger-ui .opblock.opblock-patch {
          background: rgba(168, 85, 247, 0.05);
          border-color: rgba(168, 85, 247, 0.3);
        }

        .swagger-ui .btn {
          border-radius: 6px;
        }

        .swagger-ui .btn.execute {
          background: #8b5cf6;
          border-color: #8b5cf6;
        }

        .swagger-ui .btn.execute:hover {
          background: #7c3aed;
        }

        .swagger-ui .model-box {
          border-radius: 8px;
        }

        .swagger-ui .model-title {
          font-weight: 600;
        }

        .swagger-ui table tbody tr td {
          padding: 10px 8px;
        }

        .swagger-ui .parameter__name {
          font-weight: 500;
        }

        .swagger-ui .response-col_status {
          font-weight: 600;
        }

        /* Dark mode code blocks */
        .swagger-ui .highlight-code {
          background: #1e293b;
          border-radius: 8px;
        }

        .swagger-ui .highlight-code pre {
          color: #e2e8f0;
        }

        /* Custom scrollbar */
        .swagger-wrapper ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .swagger-wrapper ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        .swagger-wrapper ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .swagger-wrapper ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
