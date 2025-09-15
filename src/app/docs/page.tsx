'use client';

import React from 'react';
import { WidgetDocumentation } from '@/components/WidgetDocumentation';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <WidgetDocumentation />
      </div>
    </div>
  );
}
