'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Upload, FileText, FileArchive, Plug, CheckCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface IngestDialogProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function IngestDialog({ projectId, onClose, onSuccess }: IngestDialogProps) {
  const [mode, setMode] = useState<'file' | 'manual'>('file');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File mode fields
  const [source, setSource] = useState<'csv' | 'zip' | 'api'>('csv');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual mode fields
  const [transcripts, setTranscripts] = useState([
    { customer: '', transcript: '', amount: '', stage: '', deal_id: '' },
  ]);

  // API key for copy
  const apiEndpoint = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calls/ingest`;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (source === 'csv' && !file.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      if (source === 'zip' && !file.name.endsWith('.zip')) {
        setError('Please select a ZIP file');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (source === 'csv' && !file.name.endsWith('.csv')) {
        setError('Please drop a CSV file');
        return;
      }
      if (source === 'zip' && !file.name.endsWith('.zip')) {
        setError('Please drop a ZIP file');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  }

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
      if (mode === 'file' && source !== 'api') {
        // File upload mode
        if (!selectedFile) {
          setError(`Please select a ${source.toUpperCase()} file`);
          setLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('projectId', projectId);
        formData.append('source', source);

        const response = await fetch('/api/calls/ingest-file', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to ingest calls');
        }

        onSuccess();
      } else if (mode === 'manual') {
        // Manual mode
        const validTranscripts = transcripts.filter((t) => t.transcript.trim());

        if (validTranscripts.length === 0) {
          setError('Please enter at least one transcript');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/calls/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            source: 'manual',
            transcripts: validTranscripts.map((t) => ({
              customer: t.customer || undefined,
              transcript: t.transcript,
              amount: t.amount ? parseFloat(t.amount) : undefined,
              stage: t.stage || undefined,
              deal_id: t.deal_id || undefined,
            })),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to ingest calls');
        }

        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ingest calls');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="dark:text-white">Ingest Call Transcripts</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Upload files or enter transcripts manually
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
                variant={mode === 'file' ? 'default' : 'outline'}
                onClick={() => setMode('file')}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                File Upload
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
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {mode === 'file' ? (
              <div className="space-y-4">
                {/* Source Type Selection */}
                <div>
                  <Label htmlFor="source" className="dark:text-gray-300">Source Type</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={source === 'csv' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setSource('csv'); setSelectedFile(null); }}
                      className="flex-1"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      CSV File
                    </Button>
                    <Button
                      variant={source === 'zip' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setSource('zip'); setSelectedFile(null); }}
                      className="flex-1"
                    >
                      <FileArchive className="w-4 h-4 mr-2" />
                      ZIP Archive
                    </Button>
                    <Button
                      variant={source === 'api' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setSource('api'); setSelectedFile(null); }}
                      className="flex-1"
                    >
                      <Plug className="w-4 h-4 mr-2" />
                      API Integration
                    </Button>
                  </div>
                </div>

                {/* File Upload Area (for CSV and ZIP) */}
                {source !== 'api' && (
                  <div>
                    <Label className="dark:text-gray-300">
                      Upload {source.toUpperCase()} File
                    </Label>
                    <div
                      className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${selectedFile
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        }`}
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={source === 'csv' ? '.csv' : '.zip'}
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      {selectedFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle className="w-10 h-10 text-green-500" />
                          <p className="font-medium text-green-700 dark:text-green-400">
                            {selectedFile.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                            }}
                          >
                            Choose Different File
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          {source === 'csv' ? (
                            <FileText className="w-10 h-10 text-gray-400" />
                          ) : (
                            <FileArchive className="w-10 h-10 text-gray-400" />
                          )}
                          <p className="font-medium text-gray-700 dark:text-gray-300">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {source === 'csv'
                              ? 'CSV files only (customer, transcript, amount, stage, deal_id)'
                              : 'ZIP archive containing transcript files (.txt, .json)'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* API Integration Info */}
                {source === 'api' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                        API Integration Setup
                      </h4>
                      <p className="text-sm text-blue-800 dark:text-blue-400 mb-4">
                        Send call transcripts directly to SignalsLoop via our REST API.
                      </p>

                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-blue-700 dark:text-blue-400">
                            Endpoint
                          </Label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="flex-1 bg-white dark:bg-slate-700 px-3 py-2 rounded text-sm border border-blue-200 dark:border-slate-600 text-gray-800 dark:text-gray-200">
                              POST {apiEndpoint}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(apiEndpoint)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-blue-700 dark:text-blue-400">
                            Example Request Body
                          </Label>
                          <div className="relative mt-1">
                            <pre className="bg-white dark:bg-slate-700 px-3 py-2 rounded text-xs border border-blue-200 dark:border-slate-600 overflow-x-auto text-gray-800 dark:text-gray-200">
                              {`{
  "projectId": "${projectId}",
  "source": "api",
  "transcripts": [
    {
      "customer": "Acme Corp",
      "transcript": "Full call transcript...",
      "amount": 50000,
      "stage": "negotiation",
      "deal_id": "DEAL-001"
    }
  ]
}`}
                            </pre>
                            <Button
                              size="sm"
                              variant="outline"
                              className="absolute top-2 right-2"
                              onClick={() => copyToClipboard(`{
  "projectId": "${projectId}",
  "source": "api",
  "transcripts": [
    {
      "customer": "Acme Corp",
      "transcript": "Full call transcript...",
      "amount": 50000,
      "stage": "negotiation",
      "deal_id": "DEAL-001"
    }
  ]
}`)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Use this API to integrate with Gong, Chorus, or any call recording platform.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {transcripts.map((transcript, index) => (
                  <div key={index} className="border dark:border-slate-700 rounded p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm dark:text-white">Call #{index + 1}</h4>
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
                        <Label htmlFor={`customer-${index}`} className="dark:text-gray-300">Customer</Label>
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
                        <Label htmlFor={`deal-${index}`} className="dark:text-gray-300">Deal ID</Label>
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
                        <Label htmlFor={`amount-${index}`} className="dark:text-gray-300">Amount ($)</Label>
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
                        <Label htmlFor={`stage-${index}`} className="dark:text-gray-300">Stage</Label>
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
                      <Label htmlFor={`transcript-${index}`} className="dark:text-gray-300">
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
              {source !== 'api' && (
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
              )}
              <Button variant="outline" onClick={onClose} disabled={loading} className={source === 'api' ? 'flex-1' : ''}>
                {source === 'api' ? 'Close' : 'Cancel'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

