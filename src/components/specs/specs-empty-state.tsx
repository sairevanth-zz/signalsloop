/**
 * Specs Empty State Component
 * Shows when user has no specs yet
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface SpecsEmptyStateProps {
  projectSlug: string;
  variant?: 'full' | 'compact';
}

export function SpecsEmptyState({
  projectSlug,
  variant = 'full',
}: SpecsEmptyStateProps) {
  if (variant === 'compact') {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="p-6 text-center">
          <Sparkles className="h-12 w-12 text-purple-500 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            No specs yet
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Transform ideas into PRDs in 60 seconds
          </p>
          <Link href={`/${projectSlug}/specs/new`}>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
              <Sparkles className="h-4 w-4 mr-2" />
              Create First Spec
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="text-center py-12">
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
            <FileText className="h-12 w-12 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="absolute -top-2 -right-2 w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center animate-pulse">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        Welcome to Spec Writer!
      </h3>

      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
        Transform your ideas into comprehensive Product Requirements Documents in
        just 60 seconds. Save 4 hours per spec with AI-powered generation.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
        <Link href={`/${projectSlug}/specs/new`}>
          <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
            <Sparkles className="h-5 w-5 mr-2" />
            Create Your First Spec
          </Button>
        </Link>
        <Button size="lg" variant="outline">
          <FileText className="h-5 w-5 mr-2" />
          Watch Demo
        </Button>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
        <Card>
          <CardContent className="p-6">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-3">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <h4 className="font-semibold mb-2">AI-Powered</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Generate complete PRDs with problem statements, user stories, and
              acceptance criteria
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-3">
              <ArrowRight className="h-5 w-5 text-purple-600" />
            </div>
            <h4 className="font-semibold mb-2">Context-Aware</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Learns from your past specs, personas, and feedback to generate
              better documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <h4 className="font-semibold mb-2">Multiple Templates</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose from Standard PRD, Feature Launch, Bug Fix, or API
              Specification templates
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
