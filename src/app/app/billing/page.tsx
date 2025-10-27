'use client';

import React, { Suspense } from 'react';
import BillingPageInner from './pageInner';

export default function AccountBillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" />
    }>
      <BillingPageInner />
    </Suspense>
  );
}
