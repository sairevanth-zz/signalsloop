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
        <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30">

            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">
                <div className="max-w-6xl mx-auto space-y-12">

                    {/* Header */}
                    <div className="text-center space-y-4 max-w-2xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-2">
                            <Sparkles className="w-3 h-3" />
                            <span>AI-Powered Feedback Analysis</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-white via-white to-slate-400 bg-clip-text text-transparent pb-2">
                            What Do Your Users<br />Actually Want?
                        </h1>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                            Stop guessing. We'll aggregate your scattered feedback and
                            <br className="hidden md:block" />
                            organize it into actionable strategy in 60 seconds.
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
                                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm shadow-xl">
                                    <CardContent className="p-8 space-y-8">

                                        <div className="space-y-2">
                                            <Label className="text-base font-semibold text-slate-200">Your Product Name</Label>
                                            <Input
                                                placeholder="e.g. Linear, Notion, Spotify"
                                                className="text-lg h-12 bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-500"
                                                value={productName}
                                                onChange={(e) => setProductName(e.target.value)}
                                            />
                                        </div>

                                        <Tabs defaultValue="auto">
                                            <TabsList className="grid w-full grid-cols-3 mb-6 h-auto p-1 bg-slate-800/50">
                                                <TabsTrigger value="auto" className="py-3 data-[state=active]:bg-indigo-600">Auto-Collect</TabsTrigger>
                                                <TabsTrigger value="paste" className="py-3 data-[state=active]:bg-indigo-600">Paste Reviews</TabsTrigger>
                                                <TabsTrigger value="upload" className="py-3 data-[state=active]:bg-indigo-600">Upload CSV</TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="auto" className="space-y-4">
                                                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                                                    <p className="text-sm text-slate-400 mb-4">Select public sources to scrape:</p>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox id="reddit" checked={sources.reddit} onCheckedChange={() => handleSourceChange('reddit')} />
                                                            <Label htmlFor="reddit" className="text-slate-300">Reddit</Label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox id="app_store" checked={sources.app_store} onCheckedChange={() => handleSourceChange('app_store')} />
                                                            <Label htmlFor="app_store" className="text-slate-300">App Store</Label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox id="play_store" checked={sources.play_store} onCheckedChange={() => handleSourceChange('play_store')} />
                                                            <Label htmlFor="play_store" className="text-slate-300">Play Store</Label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox id="hn" checked={sources.hacker_news} onCheckedChange={() => handleSourceChange('hacker_news')} />
                                                            <Label htmlFor="hn" className="text-slate-300">Hacker News</Label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="paste">
                                                <Textarea
                                                    placeholder="Paste reviews, support tickets, survey responses..."
                                                    className="min-h-[200px] bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-500"
                                                    value={pastedText}
                                                    onChange={(e) => setPastedText(e.target.value)}
                                                />
                                            </TabsContent>

                                            <TabsContent value="upload">
                                                <div className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center hover:bg-slate-800/50 transition-colors cursor-pointer">
                                                    <Upload className="w-10 h-10 mx-auto text-slate-400 mb-4" />
                                                    <p className="font-medium text-slate-200">Click to upload CSV</p>
                                                    <p className="text-xs text-slate-500 mt-2">Column must be named &quot;text&quot; or be the first column.</p>
                                                    <Input
                                                        type="file"
                                                        accept=".csv"
                                                        className="hidden"
                                                        id="csv-upload"
                                                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                                                    />
                                                    <Label htmlFor="csv-upload" className="absolute inset-0 cursor-pointer" />
                                                </div>
                                                {csvFile && <p className="text-center text-sm font-bold text-green-400 mt-2">Selected: {csvFile.name}</p>}
                                            </TabsContent>
                                        </Tabs>

                                        <Button
                                            size="lg"
                                            className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 transition-all rounded-xl"
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
                                <h2 className="text-3xl font-bold text-white">Analysis Results for <span className="text-indigo-400">{productName}</span></h2>
                                <Button variant="outline" onClick={() => setResults(null)} className="border-slate-700 text-slate-300 hover:bg-slate-800">New Analysis</Button>
                            </div>

                            <FeedbackAnalysisResults results={results} />

                            <div className="mt-16 text-center space-y-4 pb-12">
                                <h3 className="text-2xl font-bold text-white">Ready to track these themes continuously?</h3>
                                <p className="text-slate-400">SignalsLoop monitors your feedback 24/7 and alerts you to shifting trends.</p>
                                <div className="flex justify-center gap-4">
                                    <Button size="lg" className="px-8 bg-indigo-600 hover:bg-indigo-500">Start Free Trial</Button>
                                    <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">Export Report</Button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                </div>
            </div>
        </div>
    );
}
