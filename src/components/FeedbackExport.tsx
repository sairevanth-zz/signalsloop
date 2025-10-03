'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Download, 
  FileText, 
  Table, 
  Filter,
  Calendar,
  BarChart3,
  Users,
  MessageSquare,
  CheckCircle,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface FeedbackExportProps {
  projectSlug: string;
  projectName: string;
  totalPosts?: number;
  totalComments?: number;
  totalVotes?: number;
}

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'declined', label: 'Declined' }
];

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'Bug', label: '🐛 Bug' },
  { value: 'Feature Request', label: '✨ Feature Request' },
  { value: 'Improvement', label: '⚡ Improvement' },
  { value: 'UI/UX', label: '🎨 UI/UX' },
  { value: 'Integration', label: '🔗 Integration' },
  { value: 'Performance', label: '🚀 Performance' },
  { value: 'Documentation', label: '📚 Documentation' },
  { value: 'Other', label: '📝 Other' }
];

export default function FeedbackExport({ 
  projectSlug, 
  projectName,
  totalPosts = 0,
  totalComments = 0,
  totalVotes = 0
}: FeedbackExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('excel');
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Build query parameters
      const params = new URLSearchParams({
        format: exportFormat,
        status: filters.status,
        category: filters.category,
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo })
      });

      const response = await fetch(`/api/export/${projectSlug}?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `${projectName}_feedback_${new Date().toISOString().split('T')[0]}.${exportFormat === 'excel' ? 'xlsx' : 'csv'}`;

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${exportFormat.toUpperCase()} file downloaded successfully!`);
      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      category: 'all',
      dateFrom: '',
      dateTo: ''
    });
  };

  const getFilterSummary = () => {
    const activeFilters = [];
    if (filters.status !== 'all') activeFilters.push(`Status: ${statusOptions.find(s => s.value === filters.status)?.label}`);
    if (filters.category !== 'all') activeFilters.push(`Category: ${categoryOptions.find(c => c.value === filters.category)?.label}`);
    if (filters.dateFrom) activeFilters.push(`From: ${filters.dateFrom}`);
    if (filters.dateTo) activeFilters.push(`To: ${filters.dateTo}`);
    return activeFilters.length > 0 ? activeFilters.join(', ') : 'No filters applied';
  };

  return (
    <>
      <Button 
        variant="outline" 
        className="flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
        onClick={() => {
          console.log('Export button clicked directly!');
          alert('🎉 EXPORT MODAL TEST: Button works!');
          setIsOpen(true);
        }}
      >
        <Download className="w-4 h-4" />
        Export Data
      </Button>

      {/* Custom Export Modal - Same approach as Share modal */}
      {isOpen && typeof window !== 'undefined' && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 99999999,
            display: 'block',
            padding: '0',
            overflow: 'auto'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'hidden',
              position: 'relative',
              margin: '50px auto',
              border: '5px solid blue'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Export {projectName} Feedback</h2>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
              <div style={{ backgroundColor: '#2563eb', color: 'white', padding: '16px', marginBottom: '16px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                🎉 EXPORT MODAL WORKING! Project: {projectName}
                <br />
                ✅ Export modal using same approach as Share!
              </div>
              
              {/* Export Format Selection */}
              <div>
                <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', display: 'block' }}>Export Format</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <button
                    onClick={() => setExportFormat('excel')}
                    style={{
                      padding: '12px 16px',
                      border: exportFormat === 'excel' ? '2px solid #2563eb' : '1px solid #d1d5db',
                      borderRadius: '8px',
                      backgroundColor: exportFormat === 'excel' ? '#2563eb' : 'white',
                      color: exportFormat === 'excel' ? 'white' : '#374151',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    📊 Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => setExportFormat('csv')}
                    style={{
                      padding: '12px 16px',
                      border: exportFormat === 'csv' ? '2px solid #2563eb' : '1px solid #d1d5db',
                      borderRadius: '8px',
                      backgroundColor: exportFormat === 'csv' ? '#2563eb' : 'white',
                      color: exportFormat === 'csv' ? 'white' : '#374151',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    📄 CSV (.csv)
                  </button>
                </div>
              </div>
              
              {/* Export Button */}
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isExporting ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    opacity: isExporting ? 0.6 : 1
                  }}
                >
                  {isExporting ? 'Exporting...' : `Export ${exportFormat.toUpperCase()}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
          {/* Export Format Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Export Format</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <Button
                variant={exportFormat === 'excel' ? 'default' : 'outline'}
                onClick={() => setExportFormat('excel')}
                className="flex items-center gap-2 justify-start min-touch-target"
              >
                <Table className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Excel (.xlsx)</span>
              </Button>
              <Button
                variant={exportFormat === 'csv' ? 'default' : 'outline'}
                onClick={() => setExportFormat('csv')}
                className="flex items-center gap-2 justify-start min-touch-target"
              >
                <FileText className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">CSV (.csv)</span>
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">Filters</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs"
              >
                Reset
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Filter */}
              <div>
                <Label htmlFor="status-filter" className="text-xs text-gray-600 mb-1 block">
                  Status
                </Label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div>
                <Label htmlFor="category-filter" className="text-xs text-gray-600 mb-1 block">
                  Category
                </Label>
                <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div>
                <Label htmlFor="date-from" className="text-xs text-gray-600 mb-1 block">
                  From Date
                </Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>

              {/* Date To */}
              <div>
                <Label htmlFor="date-to" className="text-xs text-gray-600 mb-1 block">
                  To Date
                </Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            </div>

            {/* Filter Summary */}
            <div className="mt-3 p-2 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Filter className="w-3 h-3" />
                <span className="font-medium">Active Filters:</span>
                <span>{getFilterSummary()}</span>
              </div>
            </div>
          </div>

          {/* Data Preview */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Data Preview</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div className="text-lg font-bold text-blue-700">{totalPosts}</div>
                </div>
                <div className="text-xs text-blue-600">Posts</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div className="text-lg font-bold text-green-700">{totalVotes}</div>
                </div>
                <div className="text-xs text-green-600">Votes</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <div className="text-lg font-bold text-purple-700">{totalComments}</div>
                </div>
                <div className="text-xs text-purple-600">Comments</div>
              </div>
            </div>
          </div>

          {/* Export Information */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              What's Included in Export
            </h4>
            <div className="text-sm text-blue-800 space-y-1">
              {exportFormat === 'excel' ? (
                <>
                  <div>• <strong>Feedback Posts Sheet:</strong> All posts with details, AI categorization, and aggregated comments/votes</div>
                  <div>• <strong>Comments Sheet:</strong> Individual comments with authors and timestamps</div>
                  <div>• <strong>Votes Sheet:</strong> Individual votes with voter information</div>
                  <div>• <strong>Summary Sheet:</strong> Export metadata and statistics</div>
                </>
              ) : (
                <>
                  <div>• All feedback posts with full details</div>
                  <div>• AI categorization and confidence scores</div>
                  <div>• Aggregated comments and votes per post</div>
                  <div>• Author information and timestamps</div>
                </>
              )}
            </div>
          </div>

          {/* Export Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export {exportFormat.toUpperCase()}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
