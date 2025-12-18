/**
 * Hunter Setup Component
 * Wizard-style onboarding for configuring the AI Feedback Hunter
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PlatformType, PLATFORM_META } from '@/types/hunter';
import { ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface HunterSetupProps {
  projectId: string;
  onComplete?: () => void;
  className?: string;
}

const STEPS = [
  { id: 1, name: 'Company Info', description: 'Tell us about your product' },
  { id: 2, name: 'Platforms', description: 'Choose where to hunt' },
  { id: 3, name: 'Keywords', description: 'Define search terms' },
];

export function HunterSetup({ projectId, onComplete, className }: HunterSetupProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Company Info
  const [companyName, setCompanyName] = useState('');
  const [nameVariations, setNameVariations] = useState<string[]>(['']);
  const [competitors, setCompetitors] = useState<string[]>(['']);
  const [industry, setIndustry] = useState('');

  // Step 2: Platforms
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformType[]>([]);

  // Step 3: Keywords
  const [keywords, setKeywords] = useState<string[]>(['']);
  const [excludedKeywords, setExcludedKeywords] = useState<string[]>(['']);

  const addField = (
    array: string[],
    setter: (arr: string[]) => void
  ) => {
    setter([...array, '']);
  };

  const updateField = (
    array: string[],
    index: number,
    value: string,
    setter: (arr: string[]) => void
  ) => {
    const newArray = [...array];
    newArray[index] = value;
    setter(newArray);
  };

  const removeField = (
    array: string[],
    index: number,
    setter: (arr: string[]) => void
  ) => {
    if (array.length > 1) {
      setter(array.filter((_, i) => i !== index));
    }
  };

  const togglePlatform = (platform: PlatformType) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return companyName.trim().length > 0;
      case 2:
        return selectedPlatforms.length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/hunter/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          companyName,
          nameVariations: nameVariations.filter((v) => v.trim()),
          competitors: competitors.filter((c) => c.trim()),
          industry: industry.trim() || undefined,
          keywords: keywords.filter((k) => k.trim()),
          platforms: selectedPlatforms,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Hunter configured successfully!');
        onComplete?.();
      } else {
        toast.error(data.error || 'Failed to setup hunter');
      }
    } catch (error) {
      console.error('[HunterSetup] Error:', error);
      toast.error('Failed to setup hunter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${currentStep > step.id
                    ? 'bg-green-500 text-white'
                    : currentStep === step.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                    }`}
                >
                  {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                </div>
                <div className="mt-2 text-center">
                  <div className="text-sm font-medium dark:text-white">{step.name}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">{step.description}</div>
                </div>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-1 mx-4 bg-gray-200 dark:bg-slate-700">
                  <div
                    className={`h-full transition-all ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'
                      }`}
                    style={{ width: currentStep > step.id ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="p-6 dark:bg-slate-800 dark:border-slate-700">
        {/* Step 1: Company Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="companyName">Company/Product Name *</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., SignalsLoop"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                The main name to search for across platforms
              </p>
            </div>

            <div>
              <Label>Name Variations (Optional)</Label>
              {nameVariations.map((variation, idx) => (
                <div key={idx} className="flex gap-2 mt-2">
                  <Input
                    value={variation}
                    onChange={(e) =>
                      updateField(nameVariations, idx, e.target.value, setNameVariations)
                    }
                    placeholder="e.g., Signals Loop, SL"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(nameVariations, idx, setNameVariations)}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addField(nameVariations, setNameVariations)}
                className="mt-2"
              >
                + Add Variation
              </Button>
            </div>

            <div>
              <Label>Competitors (Optional)</Label>
              {competitors.map((competitor, idx) => (
                <div key={idx} className="flex gap-2 mt-2">
                  <Input
                    value={competitor}
                    onChange={(e) =>
                      updateField(competitors, idx, e.target.value, setCompetitors)
                    }
                    placeholder="e.g., Competitor Name"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(competitors, idx, setCompetitors)}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addField(competitors, setCompetitors)}
                className="mt-2"
              >
                + Add Competitor
              </Button>
            </div>

            <div>
              <Label htmlFor="industry">Industry (Optional)</Label>
              <Input
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., SaaS, E-commerce, FinTech"
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* Step 2: Platform Selection */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
              Select the platforms where you want to discover feedback
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(PLATFORM_META).map(([key, meta]) => (
                <div
                  key={key}
                  className={`border rounded-lg p-4 cursor-pointer transition-all select-none ${selectedPlatforms.includes(key as PlatformType)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400'
                    : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 dark:bg-slate-700/50'
                    }`}
                  onClick={() => togglePlatform(key as PlatformType)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && togglePlatform(key as PlatformType)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedPlatforms.includes(key as PlatformType)}
                      className="mt-1 h-5 w-5 pointer-events-none"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{meta.icon}</span>
                        <span className="font-semibold dark:text-white">{meta.name}</span>
                        {meta.costTier !== 'free' && (
                          <span className="text-xs bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded">
                            {meta.costTier}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-slate-300">{meta.description}</p>
                      <div className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                        Rate limit: {meta.rateLimitPerHour}/hour
                        {meta.requiresAuth && ' • Requires API key'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Keywords */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <Label>Additional Keywords (Optional)</Label>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                Add specific keywords or phrases to search for
              </p>
              {keywords.map((keyword, idx) => (
                <div key={idx} className="flex gap-2 mt-2">
                  <Input
                    value={keyword}
                    onChange={(e) =>
                      updateField(keywords, idx, e.target.value, setKeywords)
                    }
                    placeholder="e.g., feedback management, customer insights"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(keywords, idx, setKeywords)}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addField(keywords, setKeywords)}
                className="mt-2"
              >
                + Add Keyword
              </Button>
            </div>

            <div>
              <Label>Excluded Keywords (Optional)</Label>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                Filter out results containing these words
              </p>
              {excludedKeywords.map((keyword, idx) => (
                <div key={idx} className="flex gap-2 mt-2">
                  <Input
                    value={keyword}
                    onChange={(e) =>
                      updateField(excludedKeywords, idx, e.target.value, setExcludedKeywords)
                    }
                    placeholder="e.g., spam, unrelated"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(excludedKeywords, idx, setExcludedKeywords)}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addField(excludedKeywords, setExcludedKeywords)}
                className="mt-2"
              >
                + Add Excluded Keyword
              </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">What happens next?</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• Hunter will scan selected platforms every 15 minutes</li>
                <li>• Feedback will be automatically classified and scored</li>
                <li>• Sentiment analysis will run on all discovered items</li>
                <li>• Action recommendations will be generated</li>
                <li>• You'll be notified of urgent items</li>
              </ul>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t dark:border-slate-700">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < STEPS.length ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Complete Setup
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
