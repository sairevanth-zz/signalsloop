'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard, CheckCircle } from 'lucide-react';

export default function PaymentTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const testPayment = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Test the Stripe checkout API
      const response = await fetch('/api/stripe/test-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          successUrl: `${window.location.origin}/billing/success`,
          cancelUrl: `${window.location.origin}/payment-test`,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        setResult('✅ Stripe checkout URL generated successfully!');
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        setResult(`❌ Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setResult(`❌ Network error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Flow Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Test the Stripe payment integration without authentication.
          </p>
          
          <Button 
            onClick={testPayment} 
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Test Stripe Checkout
              </>
            )}
          </Button>

          {result && (
            <div className={`p-3 rounded-lg text-sm ${
              result.includes('✅') 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {result}
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Test Card:</strong> 4242 4242 4242 4242</p>
            <p><strong>Expiry:</strong> Any future date</p>
            <p><strong>CVC:</strong> Any 3 digits</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
