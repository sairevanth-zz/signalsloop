import React from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function SignupCTA() {
    return (
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-0 overflow-hidden relative">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl z-0" />

            <CardContent className="p-8 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-4 max-w-xl">
                    <div className="flex items-center gap-2 text-blue-100 font-medium">
                        <Lock className="h-4 w-4" />
                        <span>Unlock Full Report</span>
                    </div>
                    <h3 className="text-3xl font-bold tracking-tight">
                        Get the comprehensive competitive analysis
                    </h3>
                    <p className="text-blue-100 text-lg">
                        Sign up to save this report, track competitors over time, and get started for free.
                    </p>
                </div>

                <div className="w-full md:w-auto flex flex-col gap-3 min-w-[320px] bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20">
                    <Input
                        type="email"
                        placeholder="Enter your work email"
                        className="bg-white/90 border-0 text-slate-900 placeholder:text-slate-500 h-11"
                    />
                    <Button size="lg" className="w-full bg-white text-blue-700 hover:bg-blue-50 font-bold h-11">
                        Unlock Trends <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <p className="text-xs text-center text-blue-200">
                        No credit card required. 14-day free trial.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
