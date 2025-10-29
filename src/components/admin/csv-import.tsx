'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Check, X, AlertCircle, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CSVImportProps {
  projectId: string;
  boardId: string;
  onImportComplete: (results: ImportResults) => void;
}

interface ImportResults {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  createdPosts: Array<{
    id: string;
    title: string;
  }>;
}

interface CSVRow {
  [key: string]: string;
}

interface ColumnMapping {
  csvColumn: string;
  dbField: string;
}

const DB_FIELDS = [
  { value: 'title', label: 'Title (Required)', required: true },
  { value: 'description', label: 'Description', required: false },
  { value: 'status', label: 'Status', required: false },
  { value: 'author_name', label: 'Author Name', required: false },
  { value: 'author_email', label: 'Author Email', required: false },
  { value: 'votes', label: 'Vote Count', required: false },
  { value: 'created_at', label: 'Created Date', required: false },
  { value: 'skip', label: '-- Skip Column --', required: false }
] as const;

const STATUS_OPTIONS = ['open', 'planned', 'in_progress', 'done', 'declined'];

const normalizeHeader = (header: string) =>
  header.trim().toLowerCase();

const tokenizeHeader = (header: string) =>
  normalizeHeader(header)
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);

const collapseHeader = (header: string) =>
  normalizeHeader(header).replace(/[^a-z0-9]/g, '');

const inferFieldForHeader = (header: string, usedFields: Set<string>) => {
  const tokens = tokenizeHeader(header);
  const collapsed = collapseHeader(header);
  const hasToken = (token: string) => tokens.includes(token);

  if (!usedFields.has('title') && (hasToken('title') || collapsed === 'posttitle' || collapsed === 'feedbacktitle' || collapsed === 'requesttitle')) {
    usedFields.add('title');
    return 'title';
  }

  if (!usedFields.has('description') && (hasToken('description') || hasToken('details') || hasToken('summary') || collapsed === 'feedback' || collapsed === 'requestdescription')) {
    usedFields.add('description');
    return 'description';
  }

  if (!usedFields.has('status') && (hasToken('status') || hasToken('state') || collapsed === 'workflowstatus')) {
    usedFields.add('status');
    return 'status';
  }

  if (!usedFields.has('votes') && (collapsed === 'votes' || collapsed === 'votecount' || hasToken('upvotes') || hasToken('score'))) {
    usedFields.add('votes');
    return 'votes';
  }

  if (
    !usedFields.has('created_at') &&
    (
      collapsed === 'createdat' ||
      collapsed === 'createddate' ||
      collapsed === 'submissiondate' ||
      collapsed === 'submitteddate' ||
      collapsed === 'submittedon' ||
      hasToken('date') && (hasToken('created') || hasToken('submitted') || hasToken('reported') || hasToken('captured')) ||
      hasToken('timestamp')
    )
  ) {
    usedFields.add('created_at');
    return 'created_at';
  }

  if (
    !usedFields.has('author_email') &&
    (
      collapsed === 'authoremail' ||
      collapsed === 'submitteremail' ||
      collapsed === 'requesteremail' ||
      normalizeHeader(header) === 'email' ||
      (hasToken('email') && (hasToken('author') || hasToken('submitter') || hasToken('requester') || hasToken('customer') || hasToken('user')))
    )
  ) {
    usedFields.add('author_email');
    return 'author_email';
  }

  if (
    !usedFields.has('author_name') &&
    (
      normalizeHeader(header) === 'name' ||
      collapsed === 'authorname' ||
      collapsed === 'submittername' ||
      collapsed === 'requestername' ||
      (hasToken('name') && (hasToken('author') || hasToken('submitter') || hasToken('requester') || hasToken('customer') || hasToken('user') || hasToken('person')))
    )
  ) {
    usedFields.add('author_name');
    return 'author_name';
  }

  return 'skip';
};

const parseCSV = (text: string) => {
  const rows: string[][] = [];
  let currentValue = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  const pushValue = () => {
    currentRow.push(currentValue);
    currentValue = '';
  };

  const pushRow = () => {
    // Avoid pushing completely empty rows
    if (currentRow.some(cell => cell.trim() !== '')) {
      rows.push(currentRow);
    }
    currentRow = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      pushValue();
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      pushValue();
      pushRow();
      continue;
    }

    currentValue += char;
  }

  if (currentValue !== '' || currentRow.length > 0) {
    pushValue();
    pushRow();
  }

  if (rows.length === 0) {
    return { headers: [] as string[], rows: [] as CSVRow[] };
  }

  const headers = rows[0].map(cell => cell.trim().replace(/^\uFEFF/, ''));
  const dataRows = rows.slice(1).map(row => {
    const record: CSVRow = {};
    headers.forEach((header, index) => {
      record[header] = (row[index] || '').trim();
    });
    return record;
  }).filter(row => Object.values(row).some(value => value));

  return { headers, rows: dataRows };
};

export function CSVImport({ projectId, boardId, onImportComplete }: CSVImportProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'complete'>('upload');
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCSVHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // File upload handling
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const text = await file.text();
    const { headers, rows } = parseCSV(text);

    if (headers.length === 0 || rows.length === 0) {
      alert('CSV must have at least a header row and one data row');
      return;
    }

    const usedFields = new Set<string>();
    const inferredMappings = headers.map(header => ({
      csvColumn: header,
      dbField: inferFieldForHeader(header, usedFields)
    }));

    setCSVHeaders(headers);
    setCSVData(rows);
    setColumnMappings(inferredMappings);
    setStep('mapping');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  // Column mapping handling
  const updateMapping = (csvColumn: string, dbField: string) => {
    setColumnMappings(prev => 
      prev.map(mapping => 
        mapping.csvColumn === csvColumn 
          ? { ...mapping, dbField }
          : mapping
      )
    );
  };

  const validateMappings = () => {
    const titleMapping = columnMappings.find(m => m.dbField === 'title');
    if (!titleMapping || titleMapping.csvColumn === '') {
      alert('Title field is required. Please map at least one column to Title.');
      return false;
    }
    return true;
  };

  // Preview data processing
  const processPreviewData = () => {
    if (!validateMappings()) return;

    const previewData = csvData.slice(0, 5).map((row, index) => {
      const processedRow: any = { rowNumber: index + 1 };
      
      columnMappings.forEach(mapping => {
        if (mapping.dbField !== 'skip') {
          let value = row[mapping.csvColumn];

          if (typeof value === 'string') {
            value = value.trim();
          }
          
          // Process specific fields
          if (mapping.dbField === 'status') {
            value = STATUS_OPTIONS.includes(value?.toLowerCase()) 
              ? value.toLowerCase() 
              : 'open';
          }
          
          if (mapping.dbField === 'votes') {
            value = parseInt(String(value)) || 0;
          }

          if (mapping.dbField === 'author_email' && typeof value === 'string') {
            value = value.toLowerCase();
          }

          if (mapping.dbField === 'author_name' && typeof value === 'string') {
            value = value.replace(/\s+/g, ' ').trim();
          }
          
          processedRow[mapping.dbField] = value;
        }
      });
      
      return processedRow;
    });

    setStep('preview');
    return previewData;
  };

  // Import execution
  const executeImport = async () => {
    setIsImporting(true);
    setImportProgress(0);
    setStep('importing');

    try {
      const results: ImportResults = {
        totalRows: csvData.length,
        successCount: 0,
        errorCount: 0,
        errors: [],
        createdPosts: []
      };

      // Process in batches of 10
      const batchSize = 10;
      for (let i = 0; i < csvData.length; i += batchSize) {
        const batch = csvData.slice(i, i + batchSize);
        
        for (let j = 0; j < batch.length; j++) {
          const row = batch[j];
          const rowNumber = i + j + 1;
          
          try {
            // Build post data from mappings
            const postData: any = {
              board_id: boardId,
              status: 'open'
            };

            columnMappings.forEach(mapping => {
              if (mapping.dbField !== 'skip') {
                let value = row[mapping.csvColumn];
                
                if (typeof value === 'string') {
                  value = value.trim();
                }

                if (mapping.dbField === 'title' && !value?.trim()) {
                  throw new Error('Title is required');
                }
                
                if (mapping.dbField === 'status') {
                  value = STATUS_OPTIONS.includes(value?.toLowerCase()) 
                    ? value.toLowerCase() 
                    : 'open';
                }
                
                if (mapping.dbField === 'votes') {
                  value = Math.min(Math.max(parseInt(String(value)) || 0, 0), 1000);
                }

                if (mapping.dbField === 'author_email' && typeof value === 'string') {
                  value = value.toLowerCase();
                }

                if (mapping.dbField === 'author_name' && typeof value === 'string') {
                  value = value.replace(/\s+/g, ' ').trim();
                }
                
                postData[mapping.dbField] = value;
              }
            });

            // Create post via API
            const response = await fetch('/api/admin/import-post', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(postData)
            });

            if (!response.ok) {
              throw new Error('Failed to create post');
            }

            const createdPost = await response.json();
            
            // Create votes if specified
            const voteCount = postData.votes || 0;
            if (voteCount > 0) {
              await fetch('/api/admin/seed-votes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  postId: createdPost.id, 
                  count: voteCount 
                })
              });
            }

            results.successCount++;
            results.createdPosts.push({
              id: createdPost.id,
              title: postData.title
            });

          } catch (error) {
            results.errorCount++;
            results.errors.push({
              row: rowNumber,
              field: 'general',
              message: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Update progress
        setImportProgress(Math.round(((i + batch.length) / csvData.length) * 100));
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setImportResults(results);
      setStep('complete');
      onImportComplete(results);

    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  // Download error report
  const downloadErrorReport = () => {
    if (!importResults?.errors.length) return;
    
    const csvContent = [
      'Row,Field,Error',
      ...importResults.errors.map(error => 
        `${error.row},"${error.field}","${error.message}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-errors.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Reset to start
  const resetImport = () => {
    setStep('upload');
    setCSVData([]);
    setCSVHeaders([]);
    setColumnMappings([]);
    setImportResults(null);
    setImportProgress(0);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          CSV Import Tool
        </CardTitle>
        <div className="flex gap-2 mt-4">
          {['upload', 'mapping', 'preview', 'importing', 'complete'].map((stepName, index) => (
            <div
              key={stepName}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                step === stepName
                  ? 'bg-blue-100 text-blue-800'
                  : index < ['upload', 'mapping', 'preview', 'importing', 'complete'].indexOf(step)
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                step === stepName ? 'bg-blue-500 text-white' :
                index < ['upload', 'mapping', 'preview', 'importing', 'complete'].indexOf(step) ? 'bg-green-500 text-white' : 'bg-gray-300'
              }`}>
                {index < ['upload', 'mapping', 'preview', 'importing', 'complete'].indexOf(step) ? (
                  <Check className="w-3 h-3" />
                ) : (
                  index + 1
                )}
              </div>
              {stepName.charAt(0).toUpperCase() + stepName.slice(1)}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {/* Step 1: File Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="text-center">
              <Alert className="mb-4">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Upload a CSV file with feedback data. Maximum file size: 10MB, up to 1000 rows.
                </AlertDescription>
              </Alert>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              {isDragActive ? (
                <p className="text-lg text-blue-600">Drop your CSV file here...</p>
              ) : (
                <>
                  <p className="text-lg text-gray-600 mb-2">
                    Drag & drop your CSV file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports .csv and .txt files
                  </p>
                </>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">CSV Format Guidelines:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• First row should contain column headers</li>
                <li>• At least one column must map to "Title" (required)</li>
                <li>• Status values: open, planned, in_progress, done, declined</li>
                <li>• Vote counts should be numbers (0-1000)</li>
                <li>• Dates in ISO format (YYYY-MM-DD)</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-4">Map CSV Columns to Database Fields</h3>
              <p className="text-gray-600 mb-4">
                Found {csvHeaders.length} columns in your CSV. Map them to the appropriate database fields:
              </p>
            </div>

            <div className="grid gap-4">
              {csvHeaders.map((header) => (
                <div key={header} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{header}</div>
                    <div className="text-sm text-gray-500">
                      Sample: "{csvData[0]?.[header] || 'N/A'}"
                    </div>
                  </div>
                  <div className="w-48">
                    <Select
                      value={columnMappings.find(m => m.csvColumn === header)?.dbField || 'skip'}
                      onValueChange={(value) => updateMapping(header, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DB_FIELDS.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button onClick={resetImport} variant="outline">
                Start Over
              </Button>
              <Button onClick={processPreviewData}>
                Continue to Preview
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Data Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-4">Preview Import Data</h3>
              <p className="text-gray-600 mb-4">
                Preview of first 5 rows. {csvData.length} total rows will be imported.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-2 text-left">Row</th>
                    {columnMappings
                      .filter(m => m.dbField !== 'skip')
                      .map(mapping => (
                        <th key={mapping.dbField} className="border border-gray-200 p-2 text-left">
                          {DB_FIELDS.find(f => f.value === mapping.dbField)?.label}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 5).map((row, index) => (
                    <tr key={index}>
                      <td className="border border-gray-200 p-2">{index + 1}</td>
                      {columnMappings
                        .filter(m => m.dbField !== 'skip')
                        .map(mapping => (
                          <td key={mapping.dbField} className="border border-gray-200 p-2 text-sm">
                            {row[mapping.csvColumn] || '-'}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setStep('mapping')} variant="outline">
                Back to Mapping
              </Button>
              <Button onClick={executeImport}>
                Start Import ({csvData.length} rows)
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div className="space-y-4 text-center">
            <div>
              <h3 className="text-lg font-medium mb-4">Importing Data...</h3>
              <p className="text-gray-600 mb-4">
                Please don't close this page while the import is running.
              </p>
            </div>

            <div className="space-y-2">
              <Progress value={importProgress} className="w-full" />
              <p className="text-sm text-gray-600">{importProgress}% complete</p>
            </div>

            <div className="animate-pulse">
              <Upload className="w-8 h-8 mx-auto text-blue-500" />
            </div>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === 'complete' && importResults && (
          <div className="space-y-4">
            <div className="text-center">
              <Check className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Import Complete!</h3>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{importResults.totalRows}</div>
                <div className="text-sm text-blue-800">Total Rows</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importResults.successCount}</div>
                <div className="text-sm text-green-800">Successful</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{importResults.errorCount}</div>
                <div className="text-sm text-red-800">Errors</div>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-red-800">Import Errors:</h4>
                  <Button size="sm" variant="outline" onClick={downloadErrorReport}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Error Report
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto bg-red-50 rounded-lg p-3">
                  {importResults.errors.slice(0, 10).map((error, index) => (
                    <div key={index} className="text-sm text-red-800 mb-1">
                      Row {error.row}: {error.message}
                    </div>
                  ))}
                  {importResults.errors.length > 10 && (
                    <div className="text-sm text-red-600 italic">
                      ... and {importResults.errors.length - 10} more errors
                    </div>
                  )}
                </div>
              </div>
            )}

            {importResults.createdPosts.length > 0 && (
              <div>
                <h4 className="font-medium text-green-800 mb-2">Successfully Created Posts:</h4>
                <div className="max-h-48 overflow-y-auto bg-green-50 rounded-lg p-3">
                  {importResults.createdPosts.slice(0, 10).map((post, index) => (
                    <div key={index} className="text-sm text-green-800 mb-1">
                      • {post.title}
                    </div>
                  ))}
                  {importResults.createdPosts.length > 10 && (
                    <div className="text-sm text-green-600 italic">
                      ... and {importResults.createdPosts.length - 10} more posts
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={resetImport} variant="outline">
                Import Another File
              </Button>
              <Button onClick={() => window.location.href = '/app/admin'}>
                Go to Admin Dashboard
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
