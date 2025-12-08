"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { FeedbackAnalysisResults } from '@/components/user-feedback/FeedbackAnalysisResults';
import { ClusteringResult } from '@/lib/user-feedback/types';

export default function FeedbackDemoPage() {
    const [productName, setProductName] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [results, setResults] = useState<ClusteringResult | null>(null);

    // Source selections
    const [sources, setSources] = useState({
        reddit: true,
        app_store: true,
        play_store: true,
        hacker_news: false,
    });

    const [pastedText, setPastedText] = useState('');
    const [csvFile, setCsvFile] = useState<File | null>(null);

    const handleSourceChange = (key: keyof typeof sources) => {
        setSources(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleAnalyze = async () => {
        if (!productName.trim()) {
            toast.error('Please enter a product name');
            return;
        }

        setAnalyzing(true);
        setResults(null);

        try {
            let uploadedCsvContent: { text: string; source: string }[] | undefined;

            if (csvFile) {
                const text = await csvFile.text();
                // Simple CSV parse: assume header "text" or first column
                const lines = text.split('\n');
                uploadedCsvContent = lines.slice(1).map(line => ({
                    text: line.split(',')[0], // Very naive, but works for demo "text,..." CSVs
                    source: 'csv_upload'
                })).filter(r => r.text.length > 5);
            }

            const response = await fetch('/api/demo/feedback/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productName,
                    sources,
                    pastedFeedback: pastedText,
                    uploadedCsv: uploadedCsvContent
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Msg failed');
            }

            setResults(data);
            toast.success('Analysis complete!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to analyze feedback');
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black p-6 md:p-12 font-sans">
            <div className="max-w-6xl mx-auto space-y-12">

                {/* Header */}
                <div className="text-center space-y-4 max-w-2xl mx-auto">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
                        New Feature Demo
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white">
                        What Do Your Users <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Actually Want?</span>
                    </h1>
                    <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
                        Stop guessing. We'll aggregate your scattered feedback and organize it into actionable strategy in 60 seconds.
                    </p>
                </div>

                {/* Input Interface */}
                <AnimatePresence mode="wait">
                    {!results && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="max-w-3xl mx-auto"
                        >
                            <Card className="border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-slate-900/50">
                                <CardContent className="p-8 space-y-8">

                                    <div className="space-y-2">
                                        <Label className="text-base font-semibold">Your Product Name</Label>
                                        <Input
                                            placeholder="e.g. Linear, Notion, Spotify"
                                            className="text-lg h-12"
                                            value={productName}
                                            onChange={(e) => setProductName(e.target.value)}
                                        />
                                    </div>

                                    <Tabs defaultValue="auto">
                                        <TabsList className="grid w-full grid-cols-3 mb-6 h-auto p-1 bg-slate-100 dark:bg-slate-900/50">
                                            <TabsTrigger value="auto" className="py-3">Auto-Collect</TabsTrigger>
                                            <TabsTrigger value="paste" className="py-3">Paste Reviews</TabsTrigger>
                                            <TabsTrigger value="upload" className="py-3">Upload CSV</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="auto" className="space-y-4">
                                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                                <p className="text-sm text-muted-foreground mb-4">Select public sources to scrape:</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id="reddit" checked={sources.reddit} onCheckedChange={() => handleSourceChange('reddit')} />
                                                        <Label htmlFor="reddit">Reddit</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id="app_store" checked={sources.app_store} onCheckedChange={() => handleSourceChange('app_store')} />
                                                        <Label htmlFor="app_store">App Store</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id="play_store" checked={sources.play_store} onCheckedChange={() => handleSourceChange('play_store')} />
                                                        <Label htmlFor="play_store">Play Store</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id="hn" checked={sources.hacker_news} onCheckedChange={() => handleSourceChange('hacker_news')} />
                                                        <Label htmlFor="hn">Hacker News</Label>
                                                    </div>
                                                </div>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="paste">
                                            <Textarea
                                                placeholder="Paste reviews, support tickets, survey responses..."
                                                className="min-h-[200px]"
                                                value={pastedText}
                                                onChange={(e) => setPastedText(e.target.value)}
                                            />
                                        </TabsContent>

                                        <TabsContent value="upload">
                                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer">
                                                <Upload className="w-10 h-10 mx-auto text-slate-400 mb-4" />
                                                <p className="font-medium">Click to upload CSV</p>
                                                <p className="text-xs text-muted-foreground mt-2">Column must be named &quot;text&quot; or be the first column.</p>
                                                <Input
                                                    type="file"
                                                    accept=".csv"
                                                    className="hidden"
                                                    id="csv-upload"
                                                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                                                />
                                                <Label htmlFor="csv-upload" className="absolute inset-0 cursor-pointer" />
                                            </div>
                                            {csvFile && <p className="text-center text-sm font-bold text-green-600 mt-2">Selected: {csvFile.name}</p>}
                                        </TabsContent>
                                    </Tabs>

                                    <Button
                                        size="lg"
                                        className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                                        onClick={handleAnalyze}
                                        disabled={analyzing}
                                    >
                                        {analyzing ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Analyzing Feedback...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="mr-2 h-5 w-5" />
                                                Analyze My Feedback
                                            </>
                                        )}
                                    </Button>

                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Results View */}
                {results && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-bold">Analysis Results for <span className="text-primary">{productName}</span></h2>
                            <Button variant="outline" onClick={() => setResults(null)}>New Analysis</Button>
                        </div>

                        <FeedbackAnalysisResults results={results} />

                        <div className="mt-16 text-center space-y-4 pb-12">
                            <h3 className="text-2xl font-bold">Ready to track these themes continuously?</h3>
                            <p className="text-muted-foreground">SignalsLoop monitors your feedback 24/7 and alerts you to shifting trends.</p>
                            <div className="flex justify-center gap-4">
                                <Button size="lg" className="px-8">Start Free Trial</Button>
                                <Button size="lg" variant="outline">Export Report</Button>
                            </div>
                        </div>
                    </motion.div>
                )}

            </div>
        </div>
    );
}
