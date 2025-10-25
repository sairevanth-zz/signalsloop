'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Users,
  Mail,
  Shield,
  User,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface InvitationDetails {
  email: string;
  projectName: string;
  projectSlug: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: string;
}

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseClient();

  useEffect(() => {
    if (supabase) {
      checkAuth();
      loadInvitation();
    }
  }, [supabase, token]);

  const checkAuth = async () => {
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  };

  const loadInvitation = async () => {
    if (!token) {
      setError('No invitation token provided');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/invitations/accept?token=${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load invitation');
        setLoading(false);
        return;
      }

      setInvitation(data);
    } catch (err) {
      console.error('Error loading invitation:', err);
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token || !supabase) return;

    setAccepting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Redirect to login with invitation token
        router.push(`/login?redirect=/accept-invitation?token=${token}`);
        return;
      }

      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to accept invitation');
        setAccepting(false);
        return;
      }

      if (data.requiresAuth) {
        // User needs to sign up or log in
        router.push(`/login?redirect=/accept-invitation?token=${token}`);
        return;
      }

      if (data.alreadyMember) {
        toast.success('You are already a member of this project!');
        router.push(`/${data.projectSlug}/board`);
        return;
      }

      toast.success(`Successfully joined ${data.projectName}!`);
      router.push(`/${data.projectSlug}/board`);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      toast.error('Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600">Loading invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">
              {error || 'This invitation link is not valid.'}
            </p>
            <Button onClick={() => router.push('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">Invitation Expired</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">
              This invitation has expired. Please contact the project owner to send you a new invitation.
            </p>
            <Button onClick={() => router.push('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status === 'accepted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">Already Accepted</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">
              You have already accepted this invitation.
            </p>
            <Button onClick={() => router.push(`/${invitation.projectSlug}/board`)} className="w-full">
              Go to Project
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRoleIcon = (role: string) => {
    return role === 'admin' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">Team Invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-gray-600">
              You've been invited to join
            </p>
            <p className="text-2xl font-semibold text-gray-900">
              {invitation.projectName}
            </p>
            <p className="text-sm text-gray-500">
              on SignalsLoop
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">Email</span>
              </div>
              <span className="text-sm text-gray-900">{invitation.email}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-700">
                {getRoleIcon(invitation.role)}
                <span className="text-sm font-medium">Role</span>
              </div>
              <Badge variant="outline" className={invitation.role === 'admin' ? 'border-blue-500 text-blue-700' : ''}>
                {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
              </Badge>
            </div>
          </div>

          {user ? (
            user.email?.toLowerCase() === invitation.email.toLowerCase() ? (
              <Button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="lg"
              >
                {accepting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  'Accept Invitation'
                )}
              </Button>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-900 text-sm">Email Mismatch</p>
                    <p className="text-orange-800 text-sm mt-1">
                      This invitation was sent to <strong>{invitation.email}</strong>, but you're logged in as <strong>{user.email}</strong>.
                    </p>
                    <p className="text-orange-700 text-xs mt-2">
                      Please log out and sign in with the invited email address.
                    </p>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <Button
                onClick={() => router.push(`/login?redirect=/accept-invitation?token=${token}`)}
                className="w-full"
                size="lg"
              >
                Sign In to Accept
              </Button>
              <p className="text-center text-sm text-gray-500">
                Don't have an account?{' '}
                <Link href={`/signup?redirect=/accept-invitation?token=${token}`} className="text-blue-600 hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          )}

          <div className="text-center text-xs text-gray-500">
            Invitation expires on {new Date(invitation.expiresAt).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}
