'use client';

import React from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Download, RefreshCw, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const supabase = getSupabaseClient();

interface Backup {
  filename: string;
  size: number;
  sizeFormatted: string;
  lastModified: string;
  key: string;
}

export default function BackupsPage() {
  const [backups, setBackups] = React.useState<Backup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    loadBackups();
  }, []);

  async function loadBackups() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Please log in');
        return;
      }

      const response = await fetch('/api/admin/backups', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load backups');
      }

      const data = await response.json();
      setBackups(data.backups || []);
    } catch (error) {
      console.error('Error loading backups:', error);
      toast.error('Failed to load backups');
    } finally {
      setLoading(false);
    }
  }

  async function createBackup() {
    try {
      setCreating(true);
      toast.loading('Creating backup...', { id: 'backup' });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in');
        return;
      }

      const response = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create backup');
      }

      const data = await response.json();
      toast.success(`Backup created: ${data.backup.filename}`, { id: 'backup' });
      loadBackups();
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Failed to create backup', { id: 'backup' });
    } finally {
      setCreating(false);
    }
  }

  async function downloadBackup(filename: string) {
    try {
      toast.loading('Downloading backup...', { id: 'download' });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in');
        return;
      }

      const response = await fetch(`/api/admin/backups/download?filename=${encodeURIComponent(filename)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download backup');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Backup downloaded', { id: 'download' });
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast.error('Failed to download backup', { id: 'download' });
    }
  }

  async function verifyBackup(filename: string) {
    try {
      toast.loading('Verifying backup...', { id: 'verify' });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in');
        return;
      }

      const response = await fetch(`/api/admin/backups/verify?filename=${encodeURIComponent(filename)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to verify backup');
      }

      const data = await response.json();

      if (data.valid) {
        toast.success('Backup is valid', { id: 'verify' });
      } else {
        toast.error(`Backup is invalid: ${data.errors.join(', ')}`, { id: 'verify' });
      }
    } catch (error) {
      console.error('Error verifying backup:', error);
      toast.error('Failed to verify backup', { id: 'verify' });
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading backups...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Database Backups</h2>
          <p className="text-gray-600 mt-1">Manage and restore database backups</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadBackups} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={createBackup} disabled={creating}>
            <Database className="h-4 w-4 mr-2" />
            {creating ? 'Creating...' : 'Create Backup'}
          </Button>
        </div>
      </div>

      {/* Warning */}
      <Card className="p-4 mb-6 bg-yellow-50 border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900">Important</h3>
            <p className="text-sm text-yellow-800 mt-1">
              Backups are stored in Cloudflare R2. Make sure your R2 credentials are configured.
              Always verify backups before relying on them for disaster recovery.
            </p>
          </div>
        </div>
      </Card>

      {/* Backups List */}
      <div className="space-y-4">
        {backups.length === 0 ? (
          <Card className="p-12 text-center text-gray-500">
            <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No backups found</p>
            <p className="text-sm mt-2">Create your first backup to get started</p>
          </Card>
        ) : (
          backups.map((backup) => (
            <Card key={backup.key} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold">{backup.filename}</h3>
                    <Badge variant="outline">{backup.sizeFormatted}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Created: {new Date(backup.lastModified).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => verifyBackup(backup.filename)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Verify
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadBackup(backup.filename)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Info */}
      <Card className="p-6 mt-6">
        <h3 className="font-semibold mb-3">About Backups</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• Backups are created daily at 2:00 AM UTC via automated cron job</li>
          <li>• Old backups are automatically cleaned up (keeping last 30 backups)</li>
          <li>• Backups include all tables: users, projects, posts, comments, etc.</li>
          <li>• All backups are stored securely in Cloudflare R2</li>
          <li>• Always test restore procedures before relying on backups</li>
        </ul>
      </Card>
    </div>
  );
}
