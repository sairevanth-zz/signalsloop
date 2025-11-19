'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Upload, Link as LinkIcon, FileText } from 'lucide-react';

interface IngestDialogProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function IngestDialog({ projectId, onClose, onSuccess }: IngestDialogProps) {
  const [mode, setMode] = useState<'url' | 'manual'>('url');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL mode fields
  const [fileUrl, setFileUrl] = useState('');
  const [source, setSource] = useState<'csv' | 'zip' | 'api'>('csv');

  // Manual mode fields
  const [transcripts, setTranscripts] = useState([
    { customer: '', transcript: '', amount: '', stage: '', deal_id: '' },
  ]);

  function addTranscript() {
    setTranscripts([
      ...transcripts,
      { customer: '', transcript: '', amount: '', stage: '', deal_id: '' },
    ]);
  }

  function removeTranscript(index: number) {
    setTranscripts(transcripts.filter((_, i) => i !== index));
  }

  function updateTranscript(index: number, field: string, value: string) {
    const updated = [...transcripts];
    updated[index] = { ...updated[index], [field]: value };
    setTranscripts(updated);
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);

    try {
      let body: any = { projectId };

      if (mode === 'url') {
        if (!fileUrl) {
          setError('Please enter a file URL');
          setLoading(false);
          return;
        }
        body.source = source;
        body.fileUrl = fileUrl;
      } else {
        // Manual mode
        const validTranscripts = transcripts.filter((t) => t.transcript.trim());

        if (validTranscripts.length === 0) {
          setError('Please enter at least one transcript');
          setLoading(false);
          return;
        }

        body.source = 'manual';
        body.transcripts = validTranscripts.map((t) => ({
          customer: t.customer || undefined,
          transcript: t.transcript,
          amount: t.amount ? parseFloat(t.amount) : undefined,
          stage: t.stage || undefined,
          deal_id: t.deal_id || undefined,
        }));
      }

      const response = await fetch('/api/calls/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to ingest calls');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ingest calls');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Ingest Call Transcripts</CardTitle>
              <CardDescription>
                Upload transcripts via URL or enter them manually
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>

          <CardContent>
            {/* Mode Selection */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={mode === 'url' ? 'default' : 'outline'}
                onClick={() => setMode('url')}
                className="flex-1"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                File URL
              </Button>
              <Button
                variant={mode === 'manual' ? 'default' : 'outline'}
                onClick={() => setMode('manual')}
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                Manual Entry
              </Button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            {mode === 'url' ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="source">Source Type</Label>
                  <select
                    id="source"
                    className="w-full mt-1 p-2 border rounded"
                    value={source}
                    onChange={(e) => setSource(e.target.value as any)}
                  >
                    <option value="csv">CSV File</option>
                    <option value="zip">ZIP Archive</option>
                    <option value="api">API Integration</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="fileUrl">File URL</Label>
                  <Input
                    id="fileUrl"
                    type="url"
                    placeholder="https://example.com/calls.csv"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    CSV format: customer, transcript, amount (optional), stage (optional), deal_id (optional)
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {transcripts.map((transcript, index) => (
                  <div key={index} className="border rounded p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">Call #{index + 1}</h4>
                      {transcripts.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTranscript(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`customer-${index}`}>Customer</Label>
                        <Input
                          id={`customer-${index}`}
                          placeholder="Acme Corp"
                          value={transcript.customer}
                          onChange={(e) =>
                            updateTranscript(index, 'customer', e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor={`deal-${index}`}>Deal ID</Label>
                        <Input
                          id={`deal-${index}`}
                          placeholder="DEAL-001"
                          value={transcript.deal_id}
                          onChange={(e) =>
                            updateTranscript(index, 'deal_id', e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor={`amount-${index}`}>Amount ($)</Label>
                        <Input
                          id={`amount-${index}`}
                          type="number"
                          placeholder="50000"
                          value={transcript.amount}
                          onChange={(e) =>
                            updateTranscript(index, 'amount', e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor={`stage-${index}`}>Stage</Label>
                        <Input
                          id={`stage-${index}`}
                          placeholder="Negotiation"
                          value={transcript.stage}
                          onChange={(e) =>
                            updateTranscript(index, 'stage', e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`transcript-${index}`}>
                        Transcript <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id={`transcript-${index}`}
                        placeholder="Enter the full call transcript here..."
                        rows={4}
                        value={transcript.transcript}
                        onChange={(e) =>
                          updateTranscript(index, 'transcript', e.target.value)
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}

                <Button variant="outline" onClick={addTranscript} className="w-full">
                  + Add Another Call
                </Button>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Ingest Calls
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
