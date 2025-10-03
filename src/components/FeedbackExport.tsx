'use client';

import React, { useState, useEffect } from 'react';
import { Download, Table, FileText, Filter, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeedbackExportProps {
  projectSlug: string;
  projectName: string;
}

interface ExportFilters {
  status: string;
  category: string;
  dateFrom: string;
  dateTo: string;
}

export default function FeedbackExport({ projectSlug, projectName }: FeedbackExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
  const [isExporting, setIsExporting] = useState(false);
  const [postCount, setPostCount] = useState(0);
  const [filters, setFilters] = useState<ExportFilters>({
    status: 'all',
    category: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'closed', label: 'Closed' }
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'general', label: 'General' },
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'improvement', label: 'Improvement' }
  ];

  // Fetch post count when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPostCount();
    }
  }, [isOpen, filters]);

  const fetchPostCount = async () => {
    try {
      const params = new URLSearchParams({
        project_slug: projectSlug,
        count_only: 'true'
      });

      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.category !== 'all') params.set('category', filters.category);
      if (filters.dateFrom) params.set('date_from', filters.dateFrom);
      if (filters.dateTo) params.set('date_to', filters.dateTo);

      const response = await fetch(`/api/export/feedback?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setPostCount(data.count || 0);
      } else {
        console.error('Failed to fetch post count:', data.error);
        setPostCount(0);
      }
    } catch (error) {
      console.error('Error fetching post count:', error);
      setPostCount(0);
    }
  };

  const handleFilterChange = (key: keyof ExportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
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
    if (filters.status !== 'all') activeFilters.push(`Status: ${statusOptions.find(opt => opt.value === filters.status)?.label}`);
    if (filters.category !== 'all') activeFilters.push(`Category: ${categoryOptions.find(opt => opt.value === filters.category)?.label}`);
    if (filters.dateFrom) activeFilters.push(`From: ${filters.dateFrom}`);
    if (filters.dateTo) activeFilters.push(`To: ${filters.dateTo}`);
    
    return activeFilters.length > 0 ? activeFilters.join(', ') : 'No filters applied';
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const params = new URLSearchParams({
        project_slug: projectSlug,
        format: exportFormat
      });

      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.category !== 'all') params.set('category', filters.category);
      if (filters.dateFrom) params.set('date_from', filters.dateFrom);
      if (filters.dateTo) params.set('date_to', filters.dateTo);

      const response = await fetch(`/api/export/feedback?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the filename from response headers or create one
      const filename = response.headers.get('content-disposition')?.split('filename=')[1] || 
                     `${projectName}_feedback_${new Date().toISOString().split('T')[0]}.${exportFormat === 'excel' ? 'xlsx' : 'csv'}`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      // Close modal after successful export
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        className="flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
        onClick={() => {
          console.log('Export button clicked directly!');
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
              margin: '50px auto'
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
              {/* Export Format Selection */}
              <div style={{ marginBottom: '24px' }}>
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
                      gap: '8px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    <Table className="w-4 h-4" />
                    Excel (.xlsx)
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
                      gap: '8px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    CSV (.csv)
                  </button>
                </div>
              </div>

              {/* Filters Section */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Filters</label>
                  <button
                    onClick={resetFilters}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    Reset
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {/* Status Filter */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      style={{
                        padding: '10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        color: '#374151',
                        cursor: 'pointer',
                        width: '100%',
                        fontSize: '14px'
                      }}
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>Category</label>
                    <select
                      value={filters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      style={{
                        padding: '10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        color: '#374151',
                        cursor: 'pointer',
                        width: '100%',
                        fontSize: '14px'
                      }}
                    >
                      {categoryOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* From Date */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>From Date</label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                      style={{
                        padding: '10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        color: '#374151',
                        cursor: 'pointer',
                        width: '100%',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  {/* To Date */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '6px', display: 'block' }}>To Date</label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                      style={{
                        padding: '10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        color: '#374151',
                        cursor: 'pointer',
                        width: '100%',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    Active Filters: {getFilterSummary()}
                  </span>
                </div>
              </div>

              {/* Data Preview Section */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', display: 'block' }}>Data Preview</label>
                <div style={{ 
                  backgroundColor: '#fef2f2', 
                  border: '1px solid #fecaca', 
                  borderRadius: '8px', 
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <MessageSquare className="w-6 h-6 text-gray-600" />
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#374151' }}>{postCount}</div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Posts</div>
                  </div>
                </div>
              </div>
              
              {/* Export Button */}
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={handleExport}
                  disabled={isExporting || postCount === 0}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: postCount === 0 ? '#9ca3af' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: (isExporting || postCount === 0) ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    opacity: (isExporting || postCount === 0) ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '0 auto'
                  }}
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? 'Exporting...' : `Export ${exportFormat.toUpperCase()}`}
                </button>
                {postCount === 0 && (
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                    No posts found with current filters
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}