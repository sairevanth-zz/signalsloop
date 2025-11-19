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
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileText, ExternalLink } from 'lucide-react';

interface TopGap {
  theme_id: string;
  theme_name: string;
  description: string;
  count: number;
  avg_sentiment: number;
  arr_at_risk: number;
  priority_score: number;
}

interface ExportGapsModalProps {
  projectId: string;
  topGaps: TopGap[];
  open: boolean;
  onClose: () => void;
}

export function ExportGapsModal({
  projectId,
  topGaps,
  open,
  onClose,
}: ExportGapsModalProps) {
  const [selectedGaps, setSelectedGaps] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<'markdown' | 'csv' | 'json'>('markdown');
  const [exporting, setExporting] = useState(false);

  function toggleGap(themeId: string) {
    const newSelected = new Set(selectedGaps);
    if (newSelected.has(themeId)) {
      newSelected.delete(themeId);
    } else {
      newSelected.add(themeId);
    }
    setSelectedGaps(newSelected);
  }

  function selectAll() {
    setSelectedGaps(new Set(topGaps.map(g => g.theme_id)));
  }

  function deselectAll() {
    setSelectedGaps(new Set());
  }

  function generateMarkdown() {
    const selected = topGaps.filter(g => selectedGaps.has(g.theme_id));

    let markdown = `# Top ${selected.length} Product Gaps from Support Tickets\n\n`;
    markdown += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    markdown += `---\n\n`;

    selected.forEach((gap, index) => {
      markdown += `## ${index + 1}. ${gap.theme_name}\n\n`;
      markdown += `**Description:** ${gap.description}\n\n`;
      markdown += `**Metrics:**\n`;
      markdown += `- Ticket Count: ${gap.count}\n`;
      markdown += `- Average Sentiment: ${gap.avg_sentiment.toFixed(2)}\n`;
      markdown += `- Priority Score: ${gap.priority_score}/10\n`;
      if (gap.arr_at_risk > 0) {
        markdown += `- ARR at Risk: $${gap.arr_at_risk.toFixed(2)}\n`;
      }
      markdown += `\n`;
      markdown += `**Recommendation:** Address this issue to improve customer satisfaction`;
      if (gap.arr_at_risk > 0) {
        markdown += ` and reduce ARR churn risk`;
      }
      markdown += `.\n\n`;
      markdown += `---\n\n`;
    });

    return markdown;
  }

  function generateCSV() {
    const selected = topGaps.filter(g => selectedGaps.has(g.theme_id));

    let csv = 'Rank,Theme,Description,Ticket Count,Sentiment,Priority,ARR at Risk\n';
    selected.forEach((gap, index) => {
      csv += `${index + 1},"${gap.theme_name.replace(/"/g, '""')}","${gap.description.replace(/"/g, '""')}",${gap.count},${gap.avg_sentiment.toFixed(2)},${gap.priority_score},${gap.arr_at_risk.toFixed(2)}\n`;
    });

    return csv;
  }

  function generateJSON() {
    const selected = topGaps.filter(g => selectedGaps.has(g.theme_id));
    return JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        project_id: projectId,
        gaps: selected.map((gap, index) => ({
          rank: index + 1,
          theme_name: gap.theme_name,
          description: gap.description,
          ticket_count: gap.count,
          avg_sentiment: gap.avg_sentiment,
          priority_score: gap.priority_score,
          arr_at_risk: gap.arr_at_risk,
        })),
      },
      null,
      2
    );
  }

  function handleExport() {
    if (selectedGaps.size === 0) {
      alert('Please select at least one gap to export');
      return;
    }

    setExporting(true);

    try {
      let content = '';
      let filename = '';
      let mimeType = '';

      switch (exportFormat) {
        case 'markdown':
          content = generateMarkdown();
          filename = 'support-gaps.md';
          mimeType = 'text/markdown';
          break;
        case 'csv':
          content = generateCSV();
          filename = 'support-gaps.csv';
          mimeType = 'text/csv';
          break;
        case 'json':
          content = generateJSON();
          filename = 'support-gaps.json';
          mimeType = 'application/json';
          break;
      }

      // Create download link
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error exporting gaps:', error);
      alert('Failed to export gaps');
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Top Product Gaps</DialogTitle>
          <DialogDescription>
            Select gaps to export to Markdown, CSV, or JSON format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export Format */}
          <div className="flex gap-2">
            <Button
              variant={exportFormat === 'markdown' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExportFormat('markdown')}
            >
              <FileText className="w-4 h-4 mr-1" />
              Markdown
            </Button>
            <Button
              variant={exportFormat === 'csv' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExportFormat('csv')}
            >
              CSV
            </Button>
            <Button
              variant={exportFormat === 'json' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExportFormat('json')}
            >
              JSON
            </Button>
          </div>

          {/* Selection Controls */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              Deselect All
            </Button>
            <span className="text-sm text-gray-600 ml-auto self-center">
              {selectedGaps.size} of {topGaps.length} selected
            </span>
          </div>

          {/* Gap List */}
          {topGaps.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No gaps identified yet. Analyze some tickets first.
            </div>
          ) : (
            <div className="space-y-3">
              {topGaps.map((gap, index) => (
                <div
                  key={gap.theme_id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleGap(gap.theme_id)}
                >
                  <Checkbox
                    checked={selectedGaps.has(gap.theme_id)}
                    onCheckedChange={() => toggleGap(gap.theme_id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-purple-600">#{index + 1}</span>
                      <h4 className="font-semibold">{gap.theme_name}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{gap.description}</p>
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span>{gap.count} tickets</span>
                      <span>•</span>
                      <span>Sentiment: {gap.avg_sentiment.toFixed(2)}</span>
                      <span>•</span>
                      <span>Priority: {gap.priority_score}/10</span>
                      {gap.arr_at_risk > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-orange-600 font-medium">
                            ${gap.arr_at_risk.toFixed(0)} at risk
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Jira Integration Hint */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <h4 className="font-semibold text-blue-900 mb-1">
              💡 Tip: Export to Jira or Linear
            </h4>
            <p className="text-blue-800">
              Export as Markdown and paste into your project management tool. Each gap can become
              an epic or feature request with all the context included.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={exporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting || selectedGaps.size === 0}>
            {exporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export {selectedGaps.size > 0 ? `(${selectedGaps.size})` : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
