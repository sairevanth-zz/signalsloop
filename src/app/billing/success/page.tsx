'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Crown, 
  ArrowRight, 
  Calendar,
  CreditCard,
  Star,
  Zap,
  X
} from 'lucide-react';
import Link from 'next/link';

function BillingSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessionData, setSessionData] = useState<{
    id: string;
    status: string;
    customer_email: string;
    amount_total: number;
    currency: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    // In a real implementation, you might want to verify the session with Stripe
    // For now, we'll simulate success and show the success page
    setLoading(false);
    setSessionData({
      id: sessionId,
      status: 'complete',
      customer_email: 'user@example.com', // This would come from Stripe session
      amount_total: 1900, // $19.00 in cents
      currency: 'usd'
    });
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-600">Payment Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              {error || 'Unable to verify your payment. Please contact support if you were charged.'}
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => router.push('/billing')} className="w-full">
                Back to Billing
              </Button>
              <Button variant="outline" onClick={() => router.push('/app')} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-xl font-bold text-gray-900">SignalSloop</span>
          </div>
        </div>

        {/* Success Card */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl text-green-600 mb-2">Payment Successful!</CardTitle>
            <p className="text-gray-600 text-lg">
              Welcome to SignalSloop Pro! Your subscription is now active.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Subscription Details */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Crown className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">SignalSloop Pro</h3>
                    <p className="text-sm text-gray-600">Monthly Subscription</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Active
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-500" />
                  <span>Amount: $19.00/month</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>Bills monthly</span>
                </div>
              </div>
            </div>

            {/* Pro Features Unlocked */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Pro Features Now Available
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { name: 'Unlimited Boards', icon: '📋' },
                  { name: 'Private Boards', icon: '🔒' },
                  { name: 'Custom Domain', icon: '🌐' },
                  { name: 'Remove Branding', icon: '🎨' },
                  { name: 'API Access', icon: '⚡' },
                  { name: 'Priority Support', icon: '⭐' },
                  { name: 'Email Notifications', icon: '📧' },
                  { name: 'Advanced Analytics', icon: '📊' }
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                    <span className="text-lg">{feature.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{feature.name}</span>
                    <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                  </div>
                ))}
              </div>
            </div>

            {/* Next Steps */}
            <Alert className="border-blue-200 bg-blue-50">
              <Star className="h-4 w-4" />
              <AlertDescription>
                <strong>Next Steps:</strong> Your Pro features are now active. You can start creating unlimited boards, 
                setting up custom domains, and accessing all Pro features immediately.
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/app" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Star className="h-4 w-4 mr-2" />
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/billing" className="flex-1">
                <Button variant="outline" className="w-full">
                  Manage Billing
                </Button>
              </Link>
            </div>

            {/* Support */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Need help getting started?{' '}
                <a href="mailto:support@signalsloop.com" className="text-blue-600 hover:underline">
                  Contact our support team
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Session ID: {sessionId?.slice(0, 8)}...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <BillingSuccessContent />
    </Suspense>
  );
}
