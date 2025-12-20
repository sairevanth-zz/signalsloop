/**
 * Hunter Setup Component
 * Wizard-style onboarding for configuring the AI Feedback Hunter
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PlatformType, PLATFORM_META } from '@/types/hunter';
import { ChevronRight, ChevronLeft, Check, Loader2, Trash2 } from 'lucide-react';
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
  { id: 4, name: 'Product Context', description: 'AI disambiguation (optional)' },
];

/**
 * Platforms that are actually implemented and working
 * - reddit: Reddit API integration
 * - twitter: Grok-powered X search (Premium only)
 * - hackernews: HN API (free)
 * - g2/capterra/trustpilot: Grok-powered web search (paid)
 * - producthunt: PH API integration
 * 
 * NOT included (no working implementation):
 * - appstore: No hunter implemented
 * - playstore: Scraping is too fragile
 */
const AVAILABLE_PLATFORMS: PlatformType[] = [
  'reddit',
  'twitter',
  'hackernews',
  'g2',
  'capterra',
  'trustpilot',
  'producthunt',
];

/**
 * Industry/category to subreddit mapping for auto-suggestion
 * These are communities where target users typically discuss products
 */
const INDUSTRY_SUBREDDIT_MAP: Record<string, string[]> = {
  // Software & SaaS
  'saas': ['SaaS', 'startups', 'Entrepreneur', 'smallbusiness'],
  'software': ['software', 'technology', 'programming'],
  'b2b': ['SaaS', 'sales', 'marketing', 'startups'],

  // Project Management
  'project management': ['projectmanagement', 'productivity', 'agile', 'scrum', 'PMTools'],
  'productivity': ['productivity', 'getdisciplined', 'Notion', 'ObsidianMD'],
  'task management': ['productivity', 'organizemylife', 'GTD'],

  // Design & Creative
  'design': ['design', 'UI_Design', 'web_design', 'graphic_design', 'UXDesign'],
  'ux': ['UXDesign', 'userexperience', 'UI_Design'],
  'creative': ['creative', 'design', 'graphic_design'],

  // Developer Tools
  'developer tools': ['programming', 'webdev', 'devops', 'coding'],
  'devops': ['devops', 'sysadmin', 'kubernetes', 'docker'],
  'api': ['programming', 'webdev', 'api'],

  // Marketing & Sales
  'marketing': ['marketing', 'digital_marketing', 'SEO', 'PPC', 'socialmedia'],
  'sales': ['sales', 'salesforce', 'startups', 'Entrepreneur'],
  'analytics': ['analytics', 'datascience', 'webanalytics'],
  'seo': ['SEO', 'bigseo', 'digital_marketing'],

  // Customer Success
  'customer success': ['CustomerSuccess', 'customersupport', 'SaaS'],
  'support': ['customersupport', 'helpdesk', 'sysadmin'],
  'crm': ['sales', 'salesforce', 'CRM'],

  // Finance & Accounting
  'fintech': ['fintech', 'personalfinance', 'investing', 'startups'],
  'accounting': ['Accounting', 'bookkeeping', 'smallbusiness'],
  'payments': ['fintech', 'ecommerce', 'Entrepreneur'],

  // E-commerce
  'ecommerce': ['ecommerce', 'Entrepreneur', 'dropship', 'FulfillmentByAmazon'],
  'retail': ['retail', 'ecommerce', 'smallbusiness'],

  // HR & Recruiting
  'hr': ['humanresources', 'recruiting', 'jobs'],
  'recruiting': ['recruiting', 'recruitinghell', 'jobs'],

  // AI & Machine Learning
  'ai': ['artificial', 'MachineLearning', 'ChatGPT', 'LocalLLaMA'],
  'machine learning': ['MachineLearning', 'datascience', 'learnmachinelearning'],

  // Security
  'security': ['cybersecurity', 'netsec', 'sysadmin'],
  'cybersecurity': ['cybersecurity', 'netsec', 'hacking'],

  // Communication
  'communication': ['Slack', 'teams', 'remotework'],
  'collaboration': ['productivity', 'remotework', 'digitalnomad'],
};

export function HunterSetup({ projectId, onComplete, className }: HunterSetupProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [existingConfigId, setExistingConfigId] = useState<string | null>(null);

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

  // Step 4: Product Context (for AI disambiguation)
  const [productTagline, setProductTagline] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [excludeTerms, setExcludeTerms] = useState<string[]>(['']);
  const [targetSubreddits, setTargetSubreddits] = useState<string[]>(['']);
  const [generatingContext, setGeneratingContext] = useState(false);

  // Track if config has been loaded to prevent re-fetching on remount
  const configLoadedRef = useRef(false);

  // Load existing config only once on mount
  useEffect(() => {
    // Skip if already loaded (prevents losing edits on tab switch)
    if (configLoadedRef.current) return;

    const loadExistingConfig = async () => {
      try {
        setLoadingConfig(true);
        const res = await fetch(`/api/hunter/setup?projectId=${projectId}`);
        const data = await res.json();

        if (data.success && data.config) {
          const config = data.config;
          setExistingConfigId(config.id);
          setCompanyName(config.company_name || '');
          setNameVariations(config.name_variations?.length ? config.name_variations : ['']);
          setCompetitors(config.competitors?.length ? config.competitors : ['']);
          setIndustry(config.industry || '');
          setKeywords(config.keywords?.length ? config.keywords : ['']);
          setExcludedKeywords(config.excluded_keywords?.length ? config.excluded_keywords : ['']);

          // Load product context fields
          setProductTagline(config.product_tagline || '');
          setProductCategory(config.product_category || '');
          setProductDescription(config.product_description || '');
          setTargetAudience(config.target_audience || '');
          setWebsiteUrl(config.website_url || '');
          setTwitterHandle(config.social_handles?.twitter || '');
          setExcludeTerms(config.exclude_terms?.length ? config.exclude_terms : ['']);

          // Load platforms from integrations
          const platformsRes = await fetch(`/api/hunter/platforms?projectId=${projectId}`);
          const platformsData = await platformsRes.json();
          if (platformsData.success && platformsData.integrations) {
            setSelectedPlatforms(platformsData.integrations.map((i: any) => i.platform_type));

            // Load Reddit subreddits from integration config
            const redditIntegration = platformsData.integrations.find((i: any) => i.platform_type === 'reddit');
            if (redditIntegration?.config?.subreddits?.length) {
              setTargetSubreddits([...redditIntegration.config.subreddits, '']);
            }
          }
        }
        configLoadedRef.current = true;
      } catch (error) {
        console.error('Error loading config:', error);
      } finally {
        setLoadingConfig(false);
      }
    };

    loadExistingConfig();
  }, [projectId]);

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
      case 4:
        return true; // Step 4 is optional
      default:
        return false;
    }
  };

  // Auto-generate product context from company info when reaching step 4
  const autoGenerateContext = useCallback(async () => {
    // Only auto-generate if fields are empty and company name exists
    if (productTagline || productCategory || productDescription) return;
    if (!companyName.trim()) return;

    try {
      setGeneratingContext(true);

      // Build context from existing company info
      const companyLower = companyName.toLowerCase();

      // Auto-fill some fields based on company info
      if (!productTagline) {
        setProductTagline(`${companyName} - ${industry || 'Software Solution'}`);
      }

      if (!productCategory && industry) {
        setProductCategory(industry);
      }

      // Auto-fill website URL if not set
      if (!websiteUrl) {
        setWebsiteUrl(`${companyLower.replace(/\s+/g, '')}.com`);
      }

      // Build description from available info
      if (!productDescription) {
        const variations = nameVariations.filter(v => v.trim());
        const comps = competitors.filter(c => c.trim());
        let desc = `${companyName} is a ${industry || 'software'} product`;
        if (variations.length > 0) {
          desc += ` (also known as ${variations.join(', ')})`;
        }
        if (comps.length > 0) {
          desc += `. Competes with ${comps.join(', ')}`;
        }
        setProductDescription(desc + '.');
      }

      // Add common false positive exclusions based on company name
      if (excludeTerms.filter(t => t.trim()).length === 0) {
        const commonFalsePositives: string[] = [];
        // Add industry-specific exclusions
        if (companyLower.includes('signal')) {
          commonFalsePositives.push('traffic signal', 'signal processing', 'cell signal');
        }
        if (commonFalsePositives.length > 0) {
          setExcludeTerms([...commonFalsePositives, '']);
        }
      }

      // Auto-suggest subreddits based on industry and competitors
      if (targetSubreddits.filter(s => s.trim()).length === 0 && selectedPlatforms.includes('reddit')) {
        const suggestedSubreddits: string[] = [];

        // Match industry to subreddits
        const industryLower = industry.toLowerCase();
        for (const [key, subs] of Object.entries(INDUSTRY_SUBREDDIT_MAP)) {
          if (industryLower.includes(key) || key.includes(industryLower)) {
            suggestedSubreddits.push(...subs);
          }
        }

        // Add competitor-specific subreddits
        const comps = competitors.filter(c => c.trim());
        for (const comp of comps) {
          const compLower = comp.toLowerCase().replace(/\s+/g, '');
          // Check for known competitor subreddits
          if (compLower.includes('asana')) suggestedSubreddits.push('asana');
          if (compLower.includes('notion')) suggestedSubreddits.push('Notion', 'NotionSo');
          if (compLower.includes('monday')) suggestedSubreddits.push('mondaydotcom');
          if (compLower.includes('trello')) suggestedSubreddits.push('trello');
          if (compLower.includes('jira')) suggestedSubreddits.push('jira', 'atlassian');
          if (compLower.includes('clickup')) suggestedSubreddits.push('ClickUp');
          if (compLower.includes('slack')) suggestedSubreddits.push('Slack');
          if (compLower.includes('teams')) suggestedSubreddits.push('MicrosoftTeams');
          if (compLower.includes('hubspot')) suggestedSubreddits.push('hubspot', 'sales');
          if (compLower.includes('salesforce')) suggestedSubreddits.push('salesforce');
          if (compLower.includes('zendesk')) suggestedSubreddits.push('Zendesk', 'customersupport');
          if (compLower.includes('intercom')) suggestedSubreddits.push('Intercom', 'CustomerSuccess');
        }

        // Always add general startup/SaaS subreddits
        if (suggestedSubreddits.length === 0) {
          suggestedSubreddits.push('SaaS', 'startups', 'Entrepreneur');
        }

        // Deduplicate and limit
        const uniqueSubs = [...new Set(suggestedSubreddits)].slice(0, 8);
        if (uniqueSubs.length > 0) {
          setTargetSubreddits([...uniqueSubs, '']);
        }
      }

      toast.success('Auto-generated context from company info');
    } catch (error) {
      console.error('Error auto-generating context:', error);
    } finally {
      setGeneratingContext(false);
    }
  }, [companyName, industry, nameVariations, competitors, productTagline, productCategory, productDescription, websiteUrl, excludeTerms, targetSubreddits, selectedPlatforms]);

  const handleNext = async () => {
    if (canProceed() && currentStep < STEPS.length) {
      const nextStep = currentStep + 1;

      // Auto-generate context when moving to step 4
      if (nextStep === 4) {
        await autoGenerateContext();
      }

      setCurrentStep(nextStep);
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
          // Product context fields
          productTagline: productTagline.trim() || undefined,
          productCategory: productCategory.trim() || undefined,
          productDescription: productDescription.trim() || undefined,
          targetAudience: targetAudience.trim() || undefined,
          websiteUrl: websiteUrl.trim() || undefined,
          socialHandles: twitterHandle.trim() ? { twitter: twitterHandle.trim() } : undefined,
          excludeTerms: excludeTerms.filter((t) => t.trim()),
          // Platform-specific config
          redditSubreddits: targetSubreddits.filter((s) => s.trim()),
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

  // Handle reset/delete configuration
  const handleResetConfig = async () => {
    if (!confirm('Are you sure you want to delete this configuration? All settings will be lost.')) {
      return;
    }

    try {
      setLoading(true);

      // Delete hunter config
      const response = await fetch('/api/hunter/setup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (data.success) {
        // Reset all form state
        setCompanyName('');
        setNameVariations(['']);
        setCompetitors(['']);
        setIndustry('');
        setSelectedPlatforms([]);
        setKeywords(['']);
        setExcludedKeywords(['']);
        setProductTagline('');
        setProductCategory('');
        setProductDescription('');
        setTargetAudience('');
        setWebsiteUrl('');
        setTwitterHandle('');
        setExcludeTerms(['']);
        setTargetSubreddits(['']);
        setExistingConfigId(null);
        setCurrentStep(1);

        toast.success('Configuration reset! You can now set up from scratch.');
      } else {
        toast.error(data.error || 'Failed to reset configuration');
      }
    } catch (error) {
      console.error('[HunterSetup] Reset error:', error);
      toast.error('Failed to reset configuration');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while fetching config
  if (loadingConfig) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Edit mode indicator with Reset button */}
      {existingConfigId && (
        <div className="mb-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg flex items-center justify-between">
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Editing existing configuration
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetConfig}
            disabled={loading}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Reset & Start Over
          </Button>
        </div>
      )}

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
              {Object.entries(PLATFORM_META)
                .filter(([key]) => AVAILABLE_PLATFORMS.includes(key as PlatformType))
                .map(([key, meta]) => (
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

        {/* Step 4: Product Context */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">🎯 Improve AI Accuracy</h4>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                This optional context helps the AI distinguish your product from similarly-named products
                and filter out irrelevant results. You can skip this step if your product name is unique.
              </p>
            </div>

            <div>
              <Label>Product Tagline</Label>
              <Input
                value={productTagline}
                onChange={(e) => setProductTagline(e.target.value)}
                placeholder="e.g., AI-powered product feedback management"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">One-line value proposition</p>
            </div>

            <div>
              <Label>Product Category</Label>
              <Input
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                placeholder="e.g., B2B SaaS, Product Management Tools"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Product Description</Label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="2-3 sentence description of what your product does..."
                className="w-full mt-1 p-2 border rounded-md dark:bg-slate-800 dark:border-slate-600 min-h-[80px]"
              />
            </div>

            <div>
              <Label>Target Audience</Label>
              <Input
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., Product managers, startup founders, indie makers"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Website URL</Label>
                <Input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="e.g., example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Twitter/X Handle</Label>
                <Input
                  value={twitterHandle}
                  onChange={(e) => setTwitterHandle(e.target.value)}
                  placeholder="e.g., @yourproduct"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Terms to Exclude (False Positives)</Label>
              <p className="text-xs text-gray-500 mb-2">Add terms that might cause false matches</p>
              {excludeTerms.map((term, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Input
                    value={term}
                    onChange={(e) =>
                      updateField(excludeTerms, idx, e.target.value, setExcludeTerms)
                    }
                    placeholder="e.g., trading signals, traffic signals"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(excludeTerms, idx, setExcludeTerms)}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addField(excludeTerms, setExcludeTerms)}
                className="mt-2"
              >
                + Add Exclude Term
              </Button>
            </div>

            {/* Subreddits targeting - only show if Reddit is selected */}
            {selectedPlatforms.includes('reddit') && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🔍</span>
                  <Label className="text-orange-900 dark:text-orange-200 font-semibold">Target Subreddits</Label>
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-300 mb-3">
                  Specify subreddits where your target audience hangs out. Auto-suggested based on your industry.
                </p>
                {targetSubreddits.map((sub, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <div className="flex items-center bg-white dark:bg-slate-800 border rounded-md px-2">
                      <span className="text-gray-400 text-sm">r/</span>
                      <Input
                        value={sub}
                        onChange={(e) =>
                          updateField(targetSubreddits, idx, e.target.value, setTargetSubreddits)
                        }
                        placeholder="subredditname"
                        className="border-0 focus-visible:ring-0 pl-1"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeField(targetSubreddits, idx, setTargetSubreddits)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addField(targetSubreddits, setTargetSubreddits)}
                  className="mt-2"
                >
                  + Add Subreddit
                </Button>
              </div>
            )}
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
                  {existingConfigId ? 'Saving...' : 'Setting up...'}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {existingConfigId ? 'Save Changes' : 'Complete Setup'}
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
