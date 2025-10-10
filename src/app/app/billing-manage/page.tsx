'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft,
  CreditCard, 
  Calendar,
  Download,
  X,
  CheckCircle,
  AlertCircle,
  Crown
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';

export default function BillingManagePage() {
  const router = useRouter();
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBillingInfo();
  }, []);

  const loadBillingInfo = async () => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/login');
        return;
      }

      // Get user's primary project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .eq('plan', 'pro')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (projectError) {
        console.error('Error fetching pro project for billing manage:', projectError);
        toast.error('Failed to load billing information');
        router.push('/app/billing');
        return;
      }

      if (!project) {
        toast.info('No active Pro subscription to manage.');
        router.replace('/app/billing');
        return;
      }

      setBillingInfo(project);
    } catch (error) {
      console.error('Error loading billing info:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to Pro features at the end of your billing period.')) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: billingInfo.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      toast.success('Subscription cancelled successfully');
      router.push('/app/billing');
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billing information...</p>
        </div>
      </div>
    );
  }

  if (!billingInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-600">No Subscription Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              You don't have an active Pro subscription.
            </p>
            <Button onClick={() => router.push('/app/billing')} className="w-full">
              Go to Billing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = billingInfo.subscription_status === 'active';
  const isTrialing = billingInfo.subscription_status === 'trialing';
  const isCancelled = billingInfo.cancel_at_period_end;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Billing</h1>
            <p className="text-gray-600">Manage your Pro subscription and billing details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subscription Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Plan</span>
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                  Pro Plan
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-medium">Status</span>
                <Badge 
                  variant={isActive ? "default" : isTrialing ? "secondary" : "destructive"}
                  className={
                    isActive 
                      ? "bg-green-100 text-green-800" 
                      : isTrialing 
                      ? "bg-blue-100 text-blue-800"
                      : "bg-red-100 text-red-800"
                  }
                >
                  {isActive ? 'Active' : isTrialing ? 'Trialing' : 'Inactive'}
                </Badge>
              </div>

              {billingInfo.current_period_end && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Next Billing Date</span>
                  <span className="text-sm text-gray-600">
                    {new Date(billingInfo.current_period_end).toLocaleDateString()}
                  </span>
                </div>
              )}

              {billingInfo.stripe_customer_id && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Customer ID</span>
                  <span className="text-sm text-gray-600 font-mono">
                    {billingInfo.stripe_customer_id.slice(0, 8)}...
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isActive && !isCancelled && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You can cancel your subscription at any time. You'll keep Pro features until the end of your billing period.
                  </AlertDescription>
                </Alert>
              )}

              {isCancelled && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your subscription has been cancelled and will end on {billingInfo.current_period_end ? new Date(billingInfo.current_period_end).toLocaleDateString() : 'the end of your billing period'}.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                {isActive && !isCancelled && (
                  <Button
                    variant="destructive"
                    onClick={handleCancelSubscription}
                    disabled={loading}
                    className="w-full"
                  >
                    Cancel Subscription
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => router.push('/app/billing')}
                  className="w-full"
                >
                  Back to Billing Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Support */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2">Need Help?</h3>
              <p className="text-gray-600 mb-4">
                If you have any questions about your billing or subscription, please contact our support team.
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" asChild>
                  <a href="mailto:support@signalsloop.com">
                    Email Support
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://signalsloop.com/docs" target="_blank" rel="noopener noreferrer">
                    Documentation
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
