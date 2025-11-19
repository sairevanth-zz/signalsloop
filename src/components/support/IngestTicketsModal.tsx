'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload } from 'lucide-react';

interface IngestTicketsModalProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function IngestTicketsModal({
  projectId,
  open,
  onClose,
  onSuccess,
}: IngestTicketsModalProps) {
  const [source, setSource] = useState<'zendesk' | 'intercom' | 'csv' | 'api'>('csv');
  const [fileUrl, setFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');

  async function handleIngest() {
    if (!fileUrl) {
      alert('Please provide a CSV file URL');
      return;
    }

    setUploading(true);
    setProgress('Uploading and parsing CSV...');

    try {
      const response = await fetch('/api/support/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          source,
          fileUrl,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProgress(
          `Success! Ingested ${data.inserted} tickets (${data.duplicates} duplicates, ${data.errors} errors)`
        );
        setTimeout(() => {
          onSuccess();
          onClose();
          resetForm();
        }, 2000);
      } else {
        alert(`Ingestion failed: ${data.error}`);
        setProgress('');
      }
    } catch (error) {
      console.error('Error ingesting tickets:', error);
      alert('Failed to ingest tickets');
      setProgress('');
    } finally {
      setUploading(false);
    }
  }

  function resetForm() {
    setFileUrl('');
    setSource('csv');
    setProgress('');
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Ingest Support Tickets</DialogTitle>
          <DialogDescription>
            Upload support tickets from Zendesk, Intercom, or CSV file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Source Selection */}
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select value={source} onValueChange={(v: any) => setSource(v)}>
              <SelectTrigger id="source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV File</SelectItem>
                <SelectItem value="zendesk">Zendesk Export</SelectItem>
                <SelectItem value="intercom">Intercom Export</SelectItem>
                <SelectItem value="api">API Integration</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File URL */}
          <div className="space-y-2">
            <Label htmlFor="fileUrl">CSV File URL</Label>
            <Input
              id="fileUrl"
              type="url"
              placeholder="https://example.com/tickets.csv"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              disabled={uploading}
            />
            <p className="text-xs text-gray-500">
              Provide a publicly accessible URL to your CSV file
            </p>
          </div>

          {/* CSV Format Info */}
          <div className="bg-gray-50 p-4 rounded-lg text-sm">
            <h4 className="font-semibold mb-2">Expected CSV Format:</h4>
            <div className="space-y-1 text-gray-600">
              <p>• <span className="font-mono text-xs">subject</span> - Ticket subject (required)</p>
              <p>• <span className="font-mono text-xs">body</span> - Ticket description (required)</p>
              <p>• <span className="font-mono text-xs">external_id</span> - Original ticket ID (optional)</p>
              <p>• <span className="font-mono text-xs">customer</span> - Customer name/email (optional)</p>
              <p>• <span className="font-mono text-xs">plan</span> - Subscription plan (optional)</p>
              <p>• <span className="font-mono text-xs">arr_value</span> - Annual revenue (optional)</p>
              <p>• <span className="font-mono text-xs">created_at</span> - Ticket date (optional)</p>
            </div>
          </div>

          {/* Progress */}
          {progress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              {progress}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleIngest} disabled={uploading || !fileUrl}>
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Ingesting...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Ingest Tickets
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
