'use client';

import React, { useState } from 'react';
import { CSVImport } from '@/components/admin/csv-import';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface ImportResults {
  successCount: number;
  errorCount: number;
  errors: string[];
  createdPosts: any[];
}

export default function CSVImportDemo() {
  const [importResults, setImportResults] = useState<ImportResults | null>(null);

  const handleImportComplete = (results: ImportResults) => {
    setImportResults(results);
    console.log('Import completed:', results);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CSV Import Demo</h1>
              <p className="text-gray-600 mt-2">
                Test the CSV import functionality with sample data
              </p>
            </div>
            <Link href="/app">
              <Button variant="outline">
                ← Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Import Component */}
          <div className="lg:col-span-2">
            <CSVImport
              projectId="demo-project"
              boardId="demo-board"
              onImportComplete={handleImportComplete}
            />
          </div>

          {/* Sidebar with Info and Results */}
          <div className="space-y-6">
            {/* Import Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Import Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">Required Fields:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Title (required)</li>
                    <li>• Description (optional)</li>
                    <li>• Status (optional)</li>
                    <li>• Author Email (optional)</li>
                    <li>• Vote Count (optional)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">Status Values:</h4>
                  <div className="flex flex-wrap gap-1">
                    {['open', 'planned', 'in_progress', 'done', 'declined'].map(status => (
                      <Badge key={status} variant="outline" className="text-xs">
                        {status}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">File Limits:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Max size: 10MB</li>
                    <li>• Max rows: 1000</li>
                    <li>• Formats: .csv, .txt</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Sample CSV Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Sample CSV Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono">
                  <div>title,description,status,author_email,votes</div>
                  <div>"Fix login bug","Users can't login with special chars","bug","user@example.com","5"</div>
                  <div>"Dark mode toggle","Add dark mode option","feature","designer@example.com","12"</div>
                  <div>"Mobile optimization","Improve mobile experience","improvement","mobile@example.com","8"</div>
                  <div>"API documentation","Need better API docs","documentation","dev@example.com","3"</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Copy this sample data to a .csv file to test the import
                </p>
              </CardContent>
            </Card>

            {/* Import Results */}
            {importResults && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Import Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {importResults?.successCount || 0}
                      </div>
                      <div className="text-xs text-green-800">Successful</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="text-lg font-bold text-red-600">
                        {importResults?.errorCount || 0}
                      </div>
                      <div className="text-xs text-red-800">Errors</div>
                    </div>
                  </div>
                  
                  {importResults?.errors && importResults.errors.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-red-800 mb-2">Errors:</h4>
                      <div className="max-h-32 overflow-y-auto bg-red-50 rounded p-2">
                        {importResults.errors.slice(0, 5).map((error: {row: number, message: string}, index: number) => (
                          <div key={index} className="text-xs text-red-700 mb-1">
                            Row {error.row}: {error.message}
                          </div>
                        ))}
                        {importResults.errors.length > 5 && (
                          <div className="text-xs text-red-600 italic">
                            ... and {importResults.errors.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {importResults?.createdPosts && importResults.createdPosts.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-green-800 mb-2">Created Posts:</h4>
                      <div className="max-h-32 overflow-y-auto bg-green-50 rounded p-2">
                        {importResults.createdPosts.slice(0, 5).map((post: {title: string}, index: number) => (
                          <div key={index} className="text-xs text-green-700 mb-1">
                            • {post.title}
                          </div>
                        ))}
                        {importResults.createdPosts.length > 5 && (
                          <div className="text-xs text-green-600 italic">
                            ... and {importResults.createdPosts.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Drag & drop file upload
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Column mapping interface
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Data preview before import
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Progress tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Error reporting & download
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Batch processing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Vote seeding
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
