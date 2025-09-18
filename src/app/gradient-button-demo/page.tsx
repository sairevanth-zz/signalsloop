'use client';

import React from 'react';
import { GradientButton } from '@/components/ui/gradient-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';

export default function GradientButtonDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Gradient Button Component
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Beautiful animated gradient buttons with smooth hover effects and customizable variants.
          </p>
        </div>

        {/* Basic Examples */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Basic Examples
            </CardTitle>
            <CardDescription>
              Default and variant gradient buttons with different color schemes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 items-center">
              <GradientButton>Get Started</GradientButton>
              <GradientButton variant="variant">Get Started</GradientButton>
            </div>
          </CardContent>
        </Card>

        {/* With Icons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              With Icons
            </CardTitle>
            <CardDescription>
              Gradient buttons enhanced with Lucide React icons
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 items-center">
              <GradientButton className="gap-2">
                <ArrowRight className="h-4 w-4" />
                Continue
              </GradientButton>
              <GradientButton variant="variant" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Upgrade Now
              </GradientButton>
            </div>
          </CardContent>
        </Card>

        {/* Different Sizes */}
        <Card>
          <CardHeader>
            <CardTitle>Size Variations</CardTitle>
            <CardDescription>
              Customize button size with additional Tailwind classes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 items-center">
              <GradientButton className="min-w-[100px] px-6 py-3 text-sm">
                Small
              </GradientButton>
              <GradientButton>Medium</GradientButton>
              <GradientButton className="min-w-[180px] px-12 py-5 text-lg">
                Large
              </GradientButton>
            </div>
          </CardContent>
        </Card>

        {/* Disabled State */}
        <Card>
          <CardHeader>
            <CardTitle>States</CardTitle>
            <CardDescription>
              Different button states including disabled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 items-center">
              <GradientButton>Active</GradientButton>
              <GradientButton disabled>Disabled</GradientButton>
              <GradientButton variant="variant">Variant Active</GradientButton>
              <GradientButton variant="variant" disabled>Variant Disabled</GradientButton>
            </div>
          </CardContent>
        </Card>

        {/* Usage Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Perfect for SignalsLoop</CardTitle>
            <CardDescription>
              These buttons would work great for call-to-action elements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 items-center">
              <GradientButton className="gap-2">
                <Sparkles className="h-4 w-4" />
                Create Project
              </GradientButton>
              <GradientButton variant="variant" className="gap-2">
                <Zap className="h-4 w-4" />
                Upgrade to Pro
              </GradientButton>
              <GradientButton className="gap-2">
                <ArrowRight className="h-4 w-4" />
                View Demo
              </GradientButton>
            </div>
          </CardContent>
        </Card>

        {/* Code Example */}
        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>
              Import and use the component in your code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
              <code>{`import { GradientButton } from "@/components/ui/gradient-button";

function MyComponent() {
  return (
    <div>
      <GradientButton>Default Button</GradientButton>
      <GradientButton variant="variant">Variant Button</GradientButton>
      <GradientButton className="gap-2">
        <Icon className="h-4 w-4" />
        With Icon
      </GradientButton>
    </div>
  );
}`}</code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
