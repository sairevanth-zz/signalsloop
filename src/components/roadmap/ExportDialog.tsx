'use client';

/**
 * Export Dialog Component
 *
 * Modal for configuring and generating roadmap exports:
 * - Format selection (Markdown, PDF)
 * - Priority filters
 * - Download handling
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Download, FileText, FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface ExportDialogProps {
  projectId: string;
  onClose: () => void;
  selectedPriorities: string[];
}

export function ExportDialog({
  projectId,
  onClose,
  selectedPriorities: initialPriorities
}: ExportDialogProps) {
  const [format, setFormat] = useState<'markdown' | 'pdf'>('markdown');
  const [priorities, setPriorities] = useState<string[]>(initialPriorities);
  const [includeReasoning, setIncludeReasoning] = useState(true);
  const [exporting, setExporting] = useState(false);

  const togglePriority = (priority: string) => {
    setPriorities(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const handleExport = async () => {
    if (priorities.length === 0) {
      toast.error('Please select at least one priority level');
      return;
    }

    setExporting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/roadmap/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          format,
          filters: {
            priorities,
            includeReasoning
          }
        })
      });

      if (response.ok) {
        // Download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `roadmap-${new Date().toISOString().split('T')[0]}.${format === 'markdown' ? 'md' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success('Roadmap exported successfully');
        onClose();
      } else {
        toast.error('Failed to export roadmap');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error exporting roadmap');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Roadmap</DialogTitle>
          <DialogDescription>
            Choose export format and configure filters
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('markdown')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  format === 'markdown'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText className="w-8 h-8 mx-auto mb-2" />
                <p className="font-semibold">Markdown</p>
                <p className="text-xs text-gray-500">For GitHub, Notion</p>
              </button>

              <button
                onClick={() => setFormat('pdf')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  format === 'pdf'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileDown className="w-8 h-8 mx-auto mb-2" />
                <p className="font-semibold">PDF</p>
                <p className="text-xs text-gray-500">For presentations</p>
              </button>
            </div>
          </div>

          {/* Priority Filters */}
          <div className="space-y-3">
            <Label>Include Priorities</Label>
            <div className="space-y-2">
              {(['critical', 'high', 'medium', 'low'] as const).map(priority => (
                <label
                  key={priority}
                  className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                >
                  <Checkbox
                    checked={priorities.includes(priority)}
                    onCheckedChange={() => togglePriority(priority)}
                  />
                  <span className="capitalize">{priority}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Options</Label>
            <label className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
              <Checkbox
                checked={includeReasoning}
                onCheckedChange={(checked) => setIncludeReasoning(!!checked)}
              />
              <span>Include AI reasoning</span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting || priorities.length === 0}>
            {exporting ? (
              <>Exporting...</>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export {format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
