/**
 * CSV Import Component
 * Drag-and-drop CSV upload for importing feedback
 */

'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Upload,
    FileSpreadsheet,
    Check,
    X,
    AlertCircle,
    Loader2,
    Download,
} from 'lucide-react';

interface CSVImportProps {
    projectId: string;
    open: boolean;
    onClose: () => void;
    onComplete: (result: { imported: number; skipped: number }) => void;
}

interface ImportResult {
    success: boolean;
    imported: number;
    skipped: number;
    errors: string[];
    message?: string;
}

export function CSVImport({ projectId, open, onClose, onComplete }: CSVImportProps) {
    const [file, setFile] = useState<File | null>(null);
    const [sourceLabel, setSourceLabel] = useState('');
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            setError(null);
            setResult(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.csv'],
        },
        maxFiles: 1,
        maxSize: 5 * 1024 * 1024, // 5MB
    });

    const handleImport = async () => {
        if (!file) return;

        setImporting(true);
        setProgress(10);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', projectId);
            formData.append('sourceLabel', sourceLabel || 'CSV Import');

            setProgress(30);

            const response = await fetch('/api/inbox/import', {
                method: 'POST',
                body: formData,
            });

            setProgress(80);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Import failed');
            }

            setProgress(100);
            setResult(data);
            onComplete({ imported: data.imported, skipped: data.skipped });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setSourceLabel('');
        setProgress(0);
        setResult(null);
        setError(null);
        onClose();
    };

    const downloadTemplate = () => {
        const template = `title,content,author_name,author_email,category,created_at
"Feature Request: Dark Mode","Would love to see a dark mode option in the app. It would be much easier on the eyes.","John Doe","john@example.com","feature_request","2024-01-15"
"Bug: Login Issue","Cannot login with Google account, getting error 500.","Jane Smith","jane@example.com","bug","2024-01-14"
"Great Product!","Really loving the new dashboard. It's so intuitive!","Alex Johnson","alex@example.com","praise","2024-01-13"`;

        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'signalsloop_import_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        Import Feedback from CSV
                    </DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to import feedback from Zendesk, Intercom, or any other source
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Success Result */}
                    {result && result.success && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-green-800 dark:text-green-200">Import Complete!</p>
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                        {result.imported} items imported, {result.skipped} skipped
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <Button onClick={handleClose}>Done</Button>
                            </div>
                        </div>
                    )}

                    {/* File Upload */}
                    {!result?.success && (
                        <>
                            <div
                                {...getRootProps()}
                                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                                    }
                  ${file ? 'bg-gray-50 dark:bg-gray-800' : ''}
                `}
                            >
                                <input {...getInputProps()} />

                                {file ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <FileSpreadsheet className="h-8 w-8 text-green-600" />
                                        <div className="text-left">
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {(file.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFile(null);
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                                        <p className="text-gray-600 dark:text-gray-300 mb-1">
                                            {isDragActive ? 'Drop your CSV file here' : 'Drag and drop a CSV file'}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            or click to browse (max 5MB)
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* Source Label */}
                            <div>
                                <Label htmlFor="sourceLabel">Source Label (optional)</Label>
                                <Input
                                    id="sourceLabel"
                                    placeholder="e.g., Zendesk Export, Intercom Q4, Support Tickets"
                                    value={sourceLabel}
                                    onChange={(e) => setSourceLabel(e.target.value)}
                                    className="mt-1"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    This helps you identify where this feedback came from
                                </p>
                            </div>

                            {/* Column Mapping Info */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                    Column Mapping
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    Your CSV should include a column for feedback content. We automatically detect:
                                </p>
                                <ul className="text-sm text-gray-500 dark:text-gray-400 grid grid-cols-2 gap-1">
                                    <li>• <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">content</code> or <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">description</code></li>
                                    <li>• <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">title</code> or <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">subject</code></li>
                                    <li>• <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">author_name</code> or <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">customer</code></li>
                                    <li>• <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">email</code></li>
                                    <li>• <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">category</code> or <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">type</code></li>
                                    <li>• <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">created_at</code> or <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">date</code></li>
                                </ul>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    onClick={downloadTemplate}
                                >
                                    <Download className="h-3 w-3 mr-1" />
                                    Download Template
                                </Button>
                            </div>

                            {/* Progress */}
                            {importing && (
                                <div className="space-y-2">
                                    <Progress value={progress} />
                                    <p className="text-sm text-gray-500 text-center">Importing...</p>
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-red-800 dark:text-red-200">Import Failed</p>
                                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={handleClose}>
                                    Cancel
                                </Button>
                                <Button onClick={handleImport} disabled={!file || importing}>
                                    {importing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Import Feedback
                                        </>
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
