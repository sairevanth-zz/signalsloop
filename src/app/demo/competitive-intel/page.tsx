"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductInputForm } from '@/components/competitive-intel/ProductInputForm';
import { ReviewPasteArea } from '@/components/competitive-intel/ReviewPasteArea';
import { CSVUploader } from '@/components/competitive-intel/CSVUploader';
import { DataSourceSelector } from '@/components/competitive-intel/DataSourceSelector';
import { CollectionProgress } from '@/components/competitive-intel/CollectionProgress';
import { SentimentComparison } from '@/components/competitive-intel/SentimentComparison';
import { ComplaintsList } from '@/components/competitive-intel/ComplaintsList';
import { FeatureGaps } from '@/components/competitive-intel/FeatureGapCard';
import { SignupCTA } from '@/components/competitive-intel/SignupCTA';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewSource, CompetitiveAnalysis } from '@/lib/competitive-intel/types';
import { toast } from 'sonner';

export default function CompetitiveIntelDemoPage() {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Products, 2: Data, 3: Processing, 4: Results

    // Data State
    const [userProduct, setUserProduct] = useState('');
    const [competitors, setCompetitors] = useState<string[]>(['']);
    const [sessionId, setSessionId] = useState<string | null>(null);

    // Scraper State
    const [selectedSources, setSelectedSources] = useState<ReviewSource[]>(['reddit', 'app_store']);

    // Processing State
    const [status, setStatus] = useState<'pending' | 'collecting' | 'analyzing' | 'completed' | 'failed'>('pending');
    const [results, setResults] = useState<CompetitiveAnalysis | null>(null);

    const handleStartSession = async () => {
        if (!userProduct) {
            toast.error("Please enter your product name");
            return;
        }

        try {
            const filteredCompetitors = competitors.filter(c => c.trim().length > 0);
            const res = await fetch('/api/competitive-intel/start', {
                method: 'POST',
                body: JSON.stringify({
                    userProduct,
                    competitors: filteredCompetitors
                })
            });

            const data = await res.json();
            if (data.sessionId) {
                setSessionId(data.sessionId);
                setStep(2);
            }
        } catch (e) {
            toast.error("Failed to start session");
        }
    };

    const handleManualAdd = async (product: string, content: string, type: 'text' | 'csv' = 'text') => {
        if (!sessionId) return;
        try {
            await fetch('/api/competitive-intel/add-reviews', {
                method: 'POST',
                body: JSON.stringify({ sessionId, product, content, type })
            });
            toast.success(`${type === 'text' ? 'Pasted' : 'Uploaded'} reviews added!`);
        } catch (e) {
            toast.error("Failed to add reviews");
        }
    };

    const startAnalysis = async () => {
        if (!sessionId) return;
        setStep(3);
        setStatus('collecting');

        try {
            // Trigger background scrape
            fetch('/api/competitive-intel/scrape', {
                method: 'POST',
                body: JSON.stringify({ sessionId, sources: selectedSources })
            });

            // Start Polling
            const poll = setInterval(async () => {
                const res = await fetch(`/api/competitive-intel/results/${sessionId}`);
                if (!res.ok) return;

                const data = await res.json();

                if (data.status) setStatus(data.status);

                if (data.status === 'completed') {
                    clearInterval(poll);
                    setResults(data.results);
                    setTimeout(() => setStep(4), 1000); // Small delay for UX
                } else if (data.status === 'failed') {
                    clearInterval(poll);
                    toast.error("Analysis failed. Please try again.");
                    setStep(2);
                }
            }, 2000);

        } catch (e) {
            toast.error("Failed to start analysis");
            setStep(2);
        }
    };

    const allProducts = [userProduct, ...competitors.filter(c => c.trim().length > 0)];

    return (
        <div className="min-h-screen bg-background p-6 md:p-12">
            <div className="max-w-5xl mx-auto space-y-12">

                {/* Header */}
                <div className="space-y-4 text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                        Competitive Intel in <span className="text-blue-600 dark:text-blue-400">60 Seconds</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        See what your competitors' users hate, and find exactly how to exploit it.
                    </p>
                </div>

                <AnimatePresence mode="wait">

                    {/* STEP 1: Products */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="max-w-xl mx-auto space-y-8"
                        >
                            <div className="bg-card border rounded-xl p-8 shadow-sm">
                                <ProductInputForm
                                    userProduct={userProduct}
                                    setUserProduct={setUserProduct}
                                    competitors={competitors}
                                    setCompetitors={setCompetitors}
                                />

                                <div className="mt-8">
                                    <Button size="lg" className="w-full" onClick={handleStartSession}>
                                        Continue to Data Sources
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: Data Collection */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <Tabs defaultValue="auto" className="w-full max-w-3xl mx-auto">
                                <TabsList className="grid w-full grid-cols-3 mb-8">
                                    <TabsTrigger value="auto">Auto-Collect</TabsTrigger>
                                    <TabsTrigger value="paste">Paste Reviews</TabsTrigger>
                                    <TabsTrigger value="upload">Upload CSV</TabsTrigger>
                                </TabsList>

                                <TabsContent value="auto" className="space-y-6">
                                    <div className="bg-card border rounded-xl p-6">
                                        <h3 className="text-lg font-semibold mb-4">Select Public Sources</h3>
                                        <DataSourceSelector
                                            selectedSources={selectedSources}
                                            onToggle={(s) => {
                                                if (selectedSources.includes(s)) setSelectedSources(selectedSources.filter(x => x !== s));
                                                else setSelectedSources([...selectedSources, s]);
                                            }}
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="paste">
                                    <ReviewPasteArea
                                        products={allProducts}
                                        onAddReviews={(p, t) => handleManualAdd(p, t, 'text')}
                                    />
                                </TabsContent>

                                <TabsContent value="upload">
                                    <CSVUploader
                                        products={allProducts}
                                        onUpload={(p, c) => handleManualAdd(p, c, 'csv')}
                                    />
                                </TabsContent>

                                <div className="mt-8 flex justify-end">
                                    <Button size="lg" className="px-8" onClick={startAnalysis}>
                                        Analyze Competition
                                    </Button>
                                </div>
                            </Tabs>
                        </motion.div>
                    )}

                    {/* STEP 3: Processing */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="flex justify-center py-12"
                        >
                            <CollectionProgress status={status} />
                        </motion.div>
                    )}

                    {/* STEP 4: Results */}
                    {step === 4 && results && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-12"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Executive Summary */}
                                <div className="bg-card border rounded-xl p-6 shadow-sm col-span-1 lg:col-span-2">
                                    <h3 className="text-lg font-semibold mb-2">Executive Summary</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {results.executive_summary}
                                    </p>
                                </div>

                                {/* Sentiment */}
                                <div className="bg-card border rounded-xl p-6 shadow-sm">
                                    <SentimentComparison data={results.sentiment_comparison} />
                                </div>

                                {/* Complaints */}
                                <div className="bg-card border rounded-xl p-6 shadow-sm">
                                    <ComplaintsList complaints={results.top_complaints_by_competitor} />
                                </div>
                            </div>

                            {/* Feature Gaps */}
                            <FeatureGaps gaps={results.feature_gaps} />

                            {/* CTA */}
                            <div className="pt-8">
                                <SignupCTA />
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
