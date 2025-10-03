'use client';

import React, { useState } from 'react';
import { Download, Table, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeedbackExportProps {
  projectSlug: string;
  projectName: string;
}

export default function FeedbackExport({ projectSlug, projectName }: FeedbackExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Here you would implement the actual export logic
      console.log(`Exporting ${exportFormat} for project: ${projectSlug}`);
      
      // Close modal after successful export
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
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
}