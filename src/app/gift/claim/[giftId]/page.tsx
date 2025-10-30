'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Gift, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mail,
  Calendar,
  User,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';

interface GiftDetails {
  id: string;
  project_id: string;
  gifter_email: string;
  recipient_email: string;
  gift_type: string;
  duration_months: number;
  status: 'pending' | 'claimed' | 'expired' | 'cancelled';
  expires_at: string;
  claimed_at?: string;
  gift_message?: string;
  created_at: string;
  project_name?: string;
}

export default function GiftClaimPage() {
  const params = useParams();
  const router = useRouter();
  const giftId = params.giftId as string;
  
  const [gift, setGift] = useState<GiftDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (giftId) {
      loadGiftDetails();
    }
  }, [giftId]);

  const loadGiftDetails = async () => {
    try {
      const response = await fetch(`/api/gifts/details/${giftId}`);
      if (response.ok) {
        const data = await response.json();
        setGift(data.gift);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Gift not found');
      }
    } catch (error) {
      console.error('Error loading gift details:', error);
      setError('Failed to load gift details');
    } finally {
      setLoading(false);
    }
  };

  const claimGift = async () => {
    if (!supabase) {
      toast.error('Authentication service not available');
      return;
    }

    setClaiming(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Failed to get Supabase session during gift claim:', sessionError);
      }

      const accessToken = session?.access_token ?? null;
      const user = session?.user ?? null;

      if (!user) {
        toast.error('Please sign in to claim your gift');
        router.push('/login');
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`/api/gifts/claim/${giftId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Gift claimed successfully! Welcome to Pro!');
        router.push('/app');
      } else {
        toast.error(data.error || 'Failed to claim gift');
        setError(data.error || 'Failed to claim gift');
      }
    } catch (error) {
      console.error('Error claiming gift:', error);
      toast.error('Failed to claim gift');
      setError('Failed to claim gift');
    } finally {
      setClaiming(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !gift) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Gift Not Found</h2>
            <p className="text-gray-600 mb-4">
              {error || 'This gift subscription could not be found or has expired.'}
            </p>
            <Button onClick={() => router.push('/')}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(gift.expires_at) < new Date();
  const canClaim = gift.status === 'pending' && !isExpired;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">You've Received a Gift!</CardTitle>
          <CardDescription>
            Someone has gifted you a Pro subscription
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Gift Details */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="font-semibold">Pro Subscription</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-gray-500" />
                <span>{gift.duration_months} month{gift.duration_months > 1 ? 's' : ''} of Pro access</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-gray-500" />
                <span>From: {gift.gifter_email}</span>
              </div>
              
              {gift.project_name && (
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-gray-500" />
                  <span>Project: {gift.project_name}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-gray-500" />
                <span>Expires: {formatDate(gift.expires_at)}</span>
              </div>
            </div>
          </div>

          {/* Gift Message */}
          {gift.gift_message && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Personal Message:</h4>
              <p className="text-sm text-gray-700 italic">"{gift.gift_message}"</p>
            </div>
          )}

          {/* Status */}
          {gift.status === 'claimed' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                This gift has already been claimed on {formatDate(gift.claimed_at!)}.
              </AlertDescription>
            </Alert>
          )}

          {isExpired && gift.status === 'pending' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                This gift has expired. Gifts must be claimed within 30 days.
              </AlertDescription>
            </Alert>
          )}

          {/* Claim Button */}
          {canClaim ? (
            <Button 
              onClick={claimGift} 
              disabled={claiming}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {claiming ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Claiming Gift...
                </>
              ) : (
                <>
                  Claim Your Pro Subscription
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={() => router.push('/app')} 
              variant="outline"
              className="w-full"
            >
              Go to Dashboard
            </Button>
          )}

          {/* Benefits */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">What you'll get with Pro:</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Unlimited projects and feedback</li>
              <li>• Advanced analytics and insights</li>
              <li>• Priority support</li>
              <li>• Custom branding options</li>
              <li>• Export and integration features</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
