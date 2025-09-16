'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function PaymentSuccessTestPage() {
  const testSessionId = 'cs_test_1234567890abcdef';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Payment Success Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Test the success page with a mock session ID.
          </p>
          
          <div className="space-y-3">
            <Link href={`/billing/success?session_id=${testSessionId}`}>
              <Button className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
                <CheckCircle className="w-4 h-4 mr-2" />
                Test Success Page
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>

            <Link href="/payment-test">
              <Button variant="outline" className="w-full">
                Back to Payment Test
              </Button>
            </Link>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Test Session ID:</strong> {testSessionId}</p>
            <p><strong>Note:</strong> This will show mock payment data</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
