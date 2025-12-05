/**
 * NotificationSettings - Component for managing notification preferences
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationPreferences } from '@/lib/notifications/types';

interface NotificationSettingsProps {
  projectId: string;
  className?: string;
}

interface SettingItem {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
  icon: string;
}

const SETTINGS: SettingItem[] = [
  {
    key: 'critical',
    label: 'Critical Alerts',
    description: 'High-priority feedback with negative sentiment',
    icon: '🚨',
  },
  {
    key: 'anomalies',
    label: 'Anomaly Detection',
    description: 'Unusual patterns in feedback volume or sentiment',
    icon: '📊',
  },
  {
    key: 'competitive',
    label: 'Competitor Updates',
    description: 'New insights about competitors',
    icon: '🎯',
  },
  {
    key: 'mentions',
    label: 'Mentions',
    description: 'When you\'re mentioned in feedback',
    icon: '💬',
  },
  {
    key: 'specs',
    label: 'Spec Updates',
    description: 'New AI-generated specs and comments',
    icon: '📝',
  },
  {
    key: 'roadmap',
    label: 'Roadmap Changes',
    description: 'Priority changes and status updates',
    icon: '🗺️',
  },
  {
    key: 'weekly',
    label: 'Weekly Digest',
    description: 'Summary of the week\'s insights',
    icon: '📈',
  },
];

export function NotificationSettings({
  projectId,
  className,
}: NotificationSettingsProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

  // Load current subscription status
  useEffect(() => {
    async function checkSubscription() {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        setIsLoading(false);
        return;
      }

      try {
        // First check if there's an existing registration
        const existingReg = await navigator.serviceWorker.getRegistration();
        
        if (!existingReg) {
          // No service worker registered yet - not subscribed
          setIsLoading(false);
          setServiceWorkerReady(false);
          return;
        }

        // Wait for service worker with a timeout
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 3000);
        });

        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          timeoutPromise
        ]);

        if (!registration) {
          // Timed out waiting for service worker
          setIsLoading(false);
          setServiceWorkerReady(false);
          return;
        }

        setServiceWorkerReady(true);
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          setIsSubscribed(true);
          // Load preferences from backend
          await loadPreferences(subscription.endpoint);
        }
      } catch (err) {
        console.error('Error checking subscription:', err);
      } finally {
        setIsLoading(false);
      }
    }

    checkSubscription();
  }, [projectId]);

  const loadPreferences = async (endpoint: string) => {
    try {
      const response = await fetch(`/api/notifications/preferences?endpoint=${encodeURIComponent(endpoint)}`);
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
    }
  };

  const handleToggle = useCallback(async (key: keyof NotificationPreferences) => {
    if (!preferences) return;

    const newValue = !preferences[key];
    const newPreferences = { ...preferences, [key]: newValue };
    
    setPreferences(newPreferences);
    setIsSaving(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        throw new Error('No subscription found');
      }

      const response = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          preferences: { [key]: newValue },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }
    } catch (err) {
      // Revert on error
      setPreferences(preferences);
      setError('Failed to save preferences');
      console.error('Error updating preferences:', err);
    } finally {
      setIsSaving(false);
    }
  }, [preferences]);

  const handleUnsubscribe = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setIsSubscribed(false);
      setPreferences(null);
    } catch (err) {
      setError('Failed to unsubscribe');
      console.error('Error unsubscribing:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <div className={cn('p-6 bg-gray-50 rounded-lg text-center border border-gray-200', className)}>
        <BellOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Notifications Not Enabled</h3>
        <p className="text-sm text-gray-600 mb-4">
          Enable push notifications above to receive alerts for critical feedback and updates.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Bell className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Push Notifications</h3>
            <p className="text-sm text-green-600">Enabled</p>
          </div>
        </div>
        <button
          onClick={handleUnsubscribe}
          disabled={isSaving}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          Disable
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Settings List */}
      <div className="space-y-1">
        <p className="text-sm text-gray-600 mb-3">Choose which notifications you want to receive:</p>
        
        {SETTINGS.map((setting) => (
          <div
            key={setting.key}
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{setting.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{setting.label}</p>
                <p className="text-xs text-gray-500">{setting.description}</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle(setting.key)}
              disabled={isSaving || !preferences}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors',
                preferences?.[setting.key]
                  ? 'bg-purple-600'
                  : 'bg-gray-300'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
                  preferences?.[setting.key] ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Save indicator */}
      {isSaving && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}
