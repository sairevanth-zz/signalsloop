/**
 * PushNotificationPrompt - Component to request push notification permission
 * Shown when user hasn't enabled notifications yet
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PushNotificationPromptProps {
  projectId: string;
  onSubscribed?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'banner' | 'card' | 'inline';
}

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function PushNotificationPrompt({
  projectId,
  onSubscribed,
  onDismiss,
  className,
  variant = 'card',
}: PushNotificationPromptProps) {
  const [permission, setPermission] = useState<PermissionState>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if push notifications are supported and if already subscribed
  useEffect(() => {
    async function checkStatus() {
      if (typeof window === 'undefined') return;

      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPermission('unsupported');
        setIsCheckingSubscription(false);
        return;
      }

      setPermission(Notification.permission as PermissionState);

      // Check local storage for dismissed state
      const dismissed = localStorage.getItem(`push-dismissed-${projectId}`);
      if (dismissed) {
        setIsDismissed(true);
      }

      // Check if there's an existing subscription
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          setHasSubscription(!!subscription);
        }
      } catch (err) {
        console.error('Error checking subscription:', err);
      } finally {
        setIsCheckingSubscription(false);
      }
    }

    checkStatus();
  }, [projectId]);

  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers not supported');
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return registration;
  }, []);

  const subscribeToPush = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result !== 'granted') {
        throw new Error('Permission denied');
      }

      // Register service worker
      const registration = await registerServiceWorker();

      // Get VAPID public key
      const vapidResponse = await fetch('/api/notifications/subscribe');
      if (!vapidResponse.ok) {
        throw new Error('Push notifications not configured');
      }
      const { publicKey } = await vapidResponse.json();

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to backend
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          projectId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setHasSubscription(true);
      onSubscribed?.();
    } catch (err) {
      console.error('Error subscribing to push:', err);
      setError(err instanceof Error ? err.message : 'Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, registerServiceWorker, onSubscribed]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    localStorage.setItem(`push-dismissed-${projectId}`, 'true');
    onDismiss?.();
  }, [projectId, onDismiss]);

  // Don't render if still checking, already subscribed, denied, unsupported, or dismissed
  if (isCheckingSubscription) {
    return null;
  }
  
  // Don't show if already has subscription, denied, unsupported, or dismissed (and has subscription)
  if (hasSubscription || permission === 'denied' || permission === 'unsupported') {
    return null;
  }
  
  // If permission granted but no subscription, allow dismissing only temporarily
  // (don't check localStorage dismissed state - user needs to complete subscription)
  if (permission !== 'granted' && isDismissed) {
    return null;
  }

  if (variant === 'inline') {
    return (
      <button
        onClick={subscribeToPush}
        disabled={isLoading}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors',
          className
        )}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        Enable Notifications
      </button>
    );
  }

  if (variant === 'banner') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={cn(
            'fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3',
            className
          )}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Stay updated with push notifications</p>
                <p className="text-sm text-white/80">Get instant alerts for critical feedback and anomalies</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={subscribeToPush}
                disabled={isLoading}
                className="px-4 py-2 bg-white text-blue-600 font-medium rounded-lg hover:bg-white/90 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Enabling...' : 'Enable'}
              </button>
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Default: card variant
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'relative p-4 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg',
        className
      )}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Bell className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">Enable Push Notifications</h3>
          <p className="text-sm text-gray-600 mt-1">
            Get instant alerts for critical feedback, anomalies, and competitor updates.
          </p>
          
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}

          <button
            onClick={subscribeToPush}
            disabled={isLoading}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enabling...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                Enable Notifications
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Convert a base64 string to Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
