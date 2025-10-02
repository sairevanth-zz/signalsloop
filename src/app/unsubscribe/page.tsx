'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [preferences, setPreferences] = useState({
    status_change_emails: true,
    comment_reply_emails: true,
    vote_milestone_emails: true,
    weekly_digest: false,
    mention_emails: true,
  });
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (token) {
      loadPreferences();
    }
  }, [token]);

  const loadPreferences = async () => {
    try {
      const response = await fetch(`/api/email-preferences?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
        setEmail(data.email);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const handleUnsubscribeAll = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch('/api/email-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          action: 'unsubscribe_all',
        }),
      });

      if (response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Unsubscribe error:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch('/api/email-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          action: 'update',
          preferences,
        }),
      });

      if (response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Update preferences error:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Invalid Link
            </h1>
            <p className="text-gray-600">
              This unsubscribe link is invalid or has expired. Please use the link from your email notification.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Preferences Updated!
            </h1>
            <p className="text-gray-600 mb-6">
              Your email preferences have been updated successfully.
            </p>
            <Button
              onClick={() => window.location.href = 'https://www.signalsloop.com'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Return to SignalsLoop
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Something Went Wrong
            </h1>
            <p className="text-gray-600 mb-6">
              We couldn't update your preferences. Please try again or contact support.
            </p>
            <Button
              onClick={() => setStatus('idle')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Mail className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Email Preferences
            </h1>
            {email && (
              <p className="text-gray-600">
                Managing notifications for <strong>{email}</strong>
              </p>
            )}
          </div>

          {/* Preference Options */}
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Choose what emails you'd like to receive:
            </h2>

            <label className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={preferences.status_change_emails}
                onChange={(e) => setPreferences({ ...preferences, status_change_emails: e.target.checked })}
                className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Status Updates</div>
                <div className="text-sm text-gray-600">Get notified when your feedback status changes (Planned, In Progress, Done)</div>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={preferences.comment_reply_emails}
                onChange={(e) => setPreferences({ ...preferences, comment_reply_emails: e.target.checked })}
                className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Comments & Replies</div>
                <div className="text-sm text-gray-600">Get notified when someone comments on your feedback</div>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={preferences.vote_milestone_emails}
                onChange={(e) => setPreferences({ ...preferences, vote_milestone_emails: e.target.checked })}
                className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Vote Milestones</div>
                <div className="text-sm text-gray-600">Celebrate when your feedback reaches voting milestones (10, 25, 50 votes)</div>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={preferences.mention_emails}
                onChange={(e) => setPreferences({ ...preferences, mention_emails: e.target.checked })}
                className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Mentions</div>
                <div className="text-sm text-gray-600">Get notified when someone mentions you in a comment</div>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={preferences.weekly_digest}
                onChange={(e) => setPreferences({ ...preferences, weekly_digest: e.target.checked })}
                className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Weekly Digest</div>
                <div className="text-sm text-gray-600">Receive a weekly summary of all updates</div>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleUpdatePreferences}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Preferences'
              )}
            </Button>

            <Button
              onClick={handleUnsubscribeAll}
              disabled={loading}
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            >
              Unsubscribe from All
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-6">
            You can change these preferences anytime by clicking the unsubscribe link in any email.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

