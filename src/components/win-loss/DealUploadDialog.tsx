/**
 * Deal Upload Dialog
 * CSV upload component for bulk deal import
 */

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DealUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

export function DealUploadDialog({ open, onOpenChange, projectId, onSuccess }: DealUploadDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv') {
        toast.error('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have header and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const deals = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const deal: any = {};

      headers.forEach((header, index) => {
        const value = values[index];
        if (value) {
          deal[header] = value;
        }
      });

      // Convert amount to number
      if (deal.amount) {
        deal.amount = parseFloat(deal.amount);
      }

      deals.push(deal);
    }

    return deals;
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    try {
      setUploading(true);
      const text = await file.text();
      const deals = parseCSV(text);

      const response = await fetch('/api/deals/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          deals,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        toast.success(`Successfully uploaded ${data.count} deals`);
        setTimeout(() => {
          onOpenChange(false);
          onSuccess();
          setFile(null);
          setResult(null);
        }, 2000);
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Deals from CSV</DialogTitle>
          <DialogDescription>
            Import deals from your CRM. Download the sample CSV to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sample CSV Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-blue-900 mb-1">CSV Format</h4>
                <p className="text-sm text-blue-700 mb-2">
                  Your CSV should include: name, amount, status, stage, competitor, notes, contact_name, contact_company, closed_at
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="/sample-deals.csv" download>
                    Download Sample CSV
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="w-12 h-12 text-gray-400" />
              <div className="text-sm text-gray-600">
                {file ? (
                  <span className="font-medium text-blue-600">{file.name}</span>
                ) : (
                  <>
                    <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                  </>
                )}
              </div>
              <div className="text-xs text-gray-500">CSV files only</div>
            </label>
          </div>

          {/* Result Message */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-green-900 mb-1">Upload Successful</h4>
                  <p className="text-sm text-green-700">
                    Imported {result.count} deals. They will appear in your dashboard shortly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Deals
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
