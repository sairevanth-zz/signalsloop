import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, Loader2 } from 'lucide-react';

interface CSVUploaderProps {
    products: string[];
    onUpload: (product: string, content: string) => Promise<void>;
}

export function CSVUploader({ products, onUpload }: CSVUploaderProps) {
    const [selectedProduct, setSelectedProduct] = useState<string>(products[0] || '');
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file || !selectedProduct) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            await onUpload(selectedProduct, text);
            setIsUploading(false);
            setFile(null);
        };
        reader.readAsText(file);
    };

    const validProducts = products.filter(p => p.trim().length > 0);

    return (
        <div className="space-y-4 border rounded-lg p-6 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <Label>Upload CSV for:</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                        {validProducts.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 flex flex-col items-center justify-center gap-4 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                {file ? (
                    <div className="flex items-center gap-2 text-primary">
                        <FileText className="h-8 w-8" />
                        <span className="font-medium">{file.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="ml-2">Remove</Button>
                    </div>
                ) : (
                    <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <div className="text-center">
                            <p className="text-sm font-medium">Click to upload or drag and drop</p>
                            <p className="text-xs text-muted-foreground">CSV files only</p>
                        </div>
                        <Input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                            id="csv-upload"
                        />
                        <Button variant="secondary" onClick={() => document.getElementById('csv-upload')?.click()}>
                            Select File
                        </Button>
                    </>
                )}
            </div>

            <div className="text-xs text-muted-foreground">
                Expected columns: reviews/text/body (required), rating/score, date, author
            </div>

            <div className="flex justify-end">
                <Button onClick={handleUpload} disabled={!file || !selectedProduct || isUploading}>
                    {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Upload & Parse
                </Button>
            </div>
        </div>
    );
}
