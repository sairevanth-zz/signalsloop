import React from 'react';
import { ArrowRight, Info, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export function SignupCTA() {
    return (
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-0 overflow-hidden relative shadow-xl">
            {/* Ambient Background Effects */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl z-0" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl z-0" />

            <CardContent className="p-8 md:p-10 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-4 max-w-xl">
                    <div className="flex items-center gap-2 text-blue-100 font-medium bg-white/10 w-fit px-3 py-1 rounded-full text-sm border border-white/10">
                        <Info className="h-4 w-4" />
                        <span>This is a generated sample report</span>
                    </div>

                    <h3 className="text-3xl font-bold tracking-tight leading-tight">
                        Ready to track your competitors 24/7?
                    </h3>

                    <p className="text-blue-100 text-lg leading-relaxed">
                        Create a free account to get <span className="font-bold text-white">comprehensive reports</span>, <span className="font-bold text-white">monitor trends</span> over time, and receive <span className="font-bold text-white">daily alerts</span> on competitor moves.
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-blue-200 pt-2">
                        <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> No credit card required</span>
                        <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> 5 AI Models included</span>
                    </div>
                </div>

                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4 min-w-[300px]">
                    <Link href="/login" className="flex-1">
                        <Button size="lg" className="w-full bg-white text-blue-700 hover:bg-blue-50 font-bold h-12 text-base shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                            Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                    <Link href="/login" className="flex-1">
                        <Button size="lg" variant="outline" className="w-full border-2 border-white/30 hover:bg-white/10 text-white hover:text-white font-semibold h-12 text-base bg-transparent">
                            Sign In
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
