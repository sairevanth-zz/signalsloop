'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';

interface NotificationRecipientsManagerProps {
  projectSlug: string;
  currentUserId: string | null | undefined;
}

interface RecipientRecord {
  id: string;
  email: string;
  name: string | null;
  receiveWeeklyDigest: boolean;
  receiveTeamAlerts: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  email: string;
  name: string;
  receiveWeeklyDigest: boolean;
  receiveTeamAlerts: boolean;
}

const defaultFormState: FormState = {
  email: '',
  name: '',
  receiveWeeklyDigest: true,
  receiveTeamAlerts: true,
};

const mapRecipient = (recipient: Record<string, unknown>): RecipientRecord => ({
  id: String(recipient.id),
  email: String(recipient.email).toLowerCase(),
  name: recipient.name ? String(recipient.name) : null,
  receiveWeeklyDigest: Boolean(recipient.receive_weekly_digest),
  receiveTeamAlerts: Boolean(recipient.receive_team_alerts ?? true),
  createdAt: String(recipient.created_at ?? ''),
  updatedAt: String(recipient.updated_at ?? ''),
});

export function NotificationRecipientsManager({
  projectSlug,
  currentUserId,
}: NotificationRecipientsManagerProps) {
  const [recipients, setRecipients] = useState<RecipientRecord[]>([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [authError, setAuthError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setSessionLoading(false);
      setAuthError('Authentication unavailable. Please refresh and sign in again.');
      return;
    }

    let mounted = true;

    client.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        console.error('Failed to get session for notification recipients:', error);
        setAuthError('Unable to load your session. Please sign in again.');
        setSessionLoading(false);
        return;
      }

      const token = data.session?.access_token ?? null;
      setAccessToken(token);
      setAuthError(token ? null : 'You must be signed in to manage notification recipients.');
      setSessionLoading(false);
    });

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const token = session?.access_token ?? null;
      setAccessToken(token);
      setAuthError(token ? null : 'You must be signed in to manage notification recipients.');
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const sessionState = useMemo<'unknown' | 'unauthenticated' | 'authenticated'>(() => {
    if (sessionLoading) return 'unknown';
    if (!accessToken || currentUserId === null) return 'unauthenticated';
    return 'authenticated';
  }, [sessionLoading, accessToken, currentUserId]);

  const loadRecipients = useCallback(async () => {
    if (!accessToken) {
      setAuthError('You must be signed in to manage notification recipients.');
      setRecipients([]);
      setInitialLoadComplete(true);
      return;
    }

    setLoading(true);
    setAuthError(null);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/notification-recipients`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 401) {
        setAuthError('You must be signed in to manage notification recipients.');
        setRecipients([]);
        return;
      }

      if (response.status === 403) {
        setAuthError('Only the project owner can edit notification recipients.');
        setRecipients([]);
        return;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || 'Failed to load recipients');
      }

      const data = (await response.json()) as { recipients: Array<Record<string, unknown>> };
      setRecipients((data.recipients || []).map(mapRecipient).sort((a, b) => a.email.localeCompare(b.email)));
    } catch (error) {
      console.error('Failed to load notification recipients:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load recipients');
    } finally {
      setInitialLoadComplete(true);
      setLoading(false);
    }
  }, [projectSlug, accessToken]);

  useEffect(() => {
    if (sessionState !== 'authenticated') {
      setRecipients([]);
      setInitialLoadComplete(true);
      return;
    }

    setInitialLoadComplete(false);
    loadRecipients();
  }, [sessionState, loadRecipients]);

  useEffect(() => {
    if (sessionState === 'authenticated') {
      loadRecipients();
    }
  }, [projectSlug, sessionState, loadRecipients]);

  const handleFormChange = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddRecipient = async (event: React.FormEvent) => {
    event.preventDefault();

    if (sessionState !== 'authenticated') {
      toast.error(authError || 'You must be signed in to add a recipient.');
      return;
    }

    if (!form.email.trim()) {
      toast.error('Email is required.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/notification-recipients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: form.email.trim(),
          name: form.name.trim(),
          receiveWeeklyDigest: form.receiveWeeklyDigest,
          receiveTeamAlerts: form.receiveTeamAlerts,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || 'Failed to add recipient');
      }

      const data = await response.json();
      setRecipients((prev) => {
        const updated = prev.filter((item) => item.email !== String(data.recipient.email).toLowerCase());
        updated.push(mapRecipient(data.recipient));
        return updated.sort((a, b) => a.email.localeCompare(b.email));
      });

      toast.success('Recipient saved.');
      setForm(defaultFormState);
    } catch (error) {
      console.error('Failed to add notification recipient:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add recipient');
    } finally {
      setSaving(false);
    }
  };

  const updateRecipient = async (
    id: string,
    updates: Partial<Pick<FormState, 'name' | 'receiveTeamAlerts' | 'receiveWeeklyDigest'>>
  ) => {
    if (sessionState !== 'authenticated') {
      toast.error(authError || 'You must be signed in to update recipients.');
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectSlug}/notification-recipients`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || 'Failed to update recipient');
      }

      const data = await response.json();
      setRecipients((prev) =>
        prev
          .map((item) => (item.id === id ? mapRecipient(data.recipient) : item))
          .sort((a, b) => a.email.localeCompare(b.email))
      );
    } catch (error) {
      console.error('Failed to update notification recipient:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update recipient');
    }
  };

  const handleDeleteRecipient = async (id: string) => {
    if (sessionState !== 'authenticated') {
      toast.error(authError || 'You must be signed in to delete recipients.');
      return;
    }

    if (!confirm('Remove this recipient from notifications?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectSlug}/notification-recipients`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || 'Failed to delete recipient');
      }

      setRecipients((prev) => prev.filter((item) => item.id !== id));
      toast.success('Recipient removed.');
    } catch (error) {
      console.error('Failed to delete notification recipient:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete recipient');
    }
  };

  const isAuthenticated = sessionState === 'authenticated';
  const sessionKnown = sessionState !== 'unknown';
  const showEmptyState = isAuthenticated && initialLoadComplete && recipients.length === 0;

  return (
    <Card className="border border-slate-200">
      <CardHeader>
        <CardTitle>Notification Recipients</CardTitle>
        <CardDescription>
          Control who receives team alerts (new feedback) and weekly digests. Once you add at least
          one email, only the selected recipients will be notified. Leave the list empty to fall
          back to the project owner.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAddRecipient} className="grid gap-4 rounded-lg border border-slate-200 p-4">
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="recipient-email">
                Email
              </label>
              <Input
                id="recipient-email"
                type="email"
                required
                placeholder="team@company.com"
                value={form.email}
                onChange={(event) => handleFormChange('email', event.target.value)}
                disabled={!isAuthenticated || saving}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="recipient-name">
                Name (optional)
              </label>
              <Input
                id="recipient-name"
                placeholder="Product Team"
                value={form.name}
                onChange={(event) => handleFormChange('name', event.target.value)}
                disabled={!isAuthenticated || saving}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <Switch
                checked={form.receiveTeamAlerts}
                onCheckedChange={(checked) => handleFormChange('receiveTeamAlerts', checked)}
                disabled={!isAuthenticated || saving}
              />
              Team alerts for new submissions
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <Switch
                checked={form.receiveWeeklyDigest}
                onCheckedChange={(checked) => handleFormChange('receiveWeeklyDigest', checked)}
                disabled={!isAuthenticated || saving}
              />
              Weekly digest summary
            </label>
            <Button
              type="submit"
              disabled={!isAuthenticated || saving}
              className="ml-auto inline-flex items-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add recipient
            </Button>
          </div>
        </form>

        {!sessionKnown ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking authentication…
          </div>
        ) : authError ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            {authError}
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading recipients…
          </div>
        ) : showEmptyState ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            No recipients yet. Add the first email above to start customizing notifications. If the
            list stays empty, we’ll continue notifying the project owner.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2 text-center">Team Alerts</th>
                  <th className="px-3 py-2 text-center">Weekly Digest</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((recipient) => (
                  <tr key={recipient.id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-medium text-slate-800">{recipient.email}</td>
                    <td className="px-3 py-3 text-slate-600">
                      <Input
                        value={recipient.name ?? ''}
                        placeholder="Add a label"
                        onChange={(event) =>
                          updateRecipient(recipient.id, { name: event.target.value })
                        }
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Switch
                        checked={recipient.receiveTeamAlerts}
                        onCheckedChange={(checked) =>
                          updateRecipient(recipient.id, { receiveTeamAlerts: checked })
                        }
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Switch
                        checked={recipient.receiveWeeklyDigest}
                        onCheckedChange={(checked) =>
                          updateRecipient(recipient.id, { receiveWeeklyDigest: checked })
                        }
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRecipient(recipient.id)}
                      >
                        <Trash2 className="h-4 w-4 text-slate-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
