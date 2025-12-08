
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { UploadCloud, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ioProps {
    onInputChange: (type: 'text' | 'image' | 'file', value: string | File) => void;
}

export function RoadmapInput({ onInputChange }: ioProps) {
    const [activeTab, setActiveTab] = useState("text");
    const [textVal, setTextVal] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTextVal(e.target.value);
        onInputChange('text', e.target.value);
    };

    const onDropImage = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            setPreview(URL.createObjectURL(file));
            onInputChange('image', file);
        }
    }, [onInputChange]);

    const onDropFile = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            setFileName(file.name);
            onInputChange('file', file);
        }
    }, [onInputChange]);

    const { getRootProps: getImageRoot, getInputProps: getImageInput, isDragActive: isImageDrag } = useDropzone({
        onDrop: onDropImage,
        accept: { 'image/*': [] },
        maxFiles: 1
    });

    const { getRootProps: getFileRoot, getInputProps: getFileInput, isDragActive: isFileDrag } = useDropzone({
        onDrop: onDropFile,
        accept: {
            'text/csv': ['.csv'],
            'application/json': ['.json'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
        },
        maxFiles: 1
    });

    return (
        <Card className="p-1 shadow-sm border-gray-200 dark:border-zinc-800">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full grid grid-cols-3 mb-4">
                    <TabsTrigger value="text" className="gap-2"><FileText className="w-4 h-4" /> Paste Text</TabsTrigger>
                    <TabsTrigger value="image" className="gap-2"><ImageIcon className="w-4 h-4" /> Screenshot</TabsTrigger>
                    <TabsTrigger value="file" className="gap-2"><UploadCloud className="w-4 h-4" /> Upload File</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="px-4 pb-4">
                    <Textarea
                        placeholder="Paste your roadmap here... (bullet points, copied from Notion/Jira, etc.)"
                        className="min-h-[300px] resize-y font-mono text-sm"
                        value={textVal}
                        onChange={handleTextChange}
                    />
                    <div className="text-right text-xs text-gray-500 mt-2">
                        {textVal.length} characters
                    </div>
                </TabsContent>

                <TabsContent value="image" className="px-4 pb-4">
                    <div
                        {...getImageRoot()}
                        className={cn(
                            "border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[300px]",
                            isImageDrag ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-zinc-700 hover:border-gray-400"
                        )}
                    >
                        <input {...getImageInput()} />
                        {preview ? (
                            <div className="relative w-full h-full flex flex-col items-center">
                                <img src={preview} alt="Roadmap preview" className="max-h-[250px] object-contain rounded shadow-sm" />
                                <p className="mt-4 text-sm text-green-600 font-medium">Image selected. Click or drag to replace.</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4">
                                    <ImageIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                </div>
                                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Drag & drop screenshot</p>
                                <p className="text-sm text-gray-500 mt-1">or click to browse (PNG, JPG, WEBP)</p>
                            </>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="file" className="px-4 pb-4">
                    <div
                        {...getFileRoot()}
                        className={cn(
                            "border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[300px]",
                            isFileDrag ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" : "border-gray-300 dark:border-zinc-700 hover:border-gray-400"
                        )}
                    >
                        <input {...getFileInput()} />
                        {fileName ? (
                            <div className="flex flex-col items-center">
                                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-4">
                                    <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
                                </div>
                                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{fileName}</p>
                                <p className="text-sm text-green-600 mt-1">Ready to roast</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-full mb-4">
                                    <UploadCloud className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                                </div>
                                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Drag & drop your file</p>
                                <p className="text-sm text-gray-500 mt-1">CSV, JSON, or Excel</p>
                            </>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </Card>
    );
}
