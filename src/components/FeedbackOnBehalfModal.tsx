'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Star,
  Bug,
  Lightbulb,
  MessageSquare,
  Brain,
  Sparkles,
  Palette,
  Share2,
  Gauge,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';
import { analytics } from '@/lib/analytics';
import AIWritingAssistant from './AIWritingAssistant';
import AIUsageIndicator from './AIUsageIndicator';

interface FeedbackOnBehalfModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectSlug: string;
  onSuccess?: () => void;
}

const categoryOptions = [
  { value: 'Feature Request', label: 'Feature Request', icon: Star, description: 'Suggest a new feature or capability' },
  { value: 'Bug', label: 'Bug Report', icon: Bug, description: 'Report a problem or defect' },
  { value: 'Improvement', label: 'Improvement', icon: Lightbulb, description: 'Enhance an existing feature or workflow' },
  { value: 'UI/UX', label: 'UI / UX', icon: Palette, description: 'Design, usability, or experience feedback' },
  { value: 'Integration', label: 'Integration', icon: Share2, description: 'Connect with other tools or APIs' },
  { value: 'Performance', label: 'Performance', icon: Gauge, description: 'Speed, stability, or reliability issues' },
  { value: 'Documentation', label: 'Documentation', icon: BookOpen, description: 'Guides, onboarding, or help content' },
  { value: 'Other', label: 'Other', icon: MessageSquare, description: 'Anything else not covered above' }
];

const isValidCategory = (value: string): value is (typeof categoryOptions)[number]['value'] =>
  categoryOptions.some((option) => option.value === value);

const PRIORITY_OPTIONS = [
  { value: 'must_have', label: 'Must Have', description: 'Critical for customer' },
  { value: 'important', label: 'Important', description: 'Significant impact' },
  { value: 'nice_to_have', label: 'Nice to Have', description: 'Would be helpful' },
];

const SOURCE_OPTIONS = [
  { value: 'sales_call', label: '📞 Sales Call' },
  { value: 'customer_meeting', label: '🤝 Customer Meeting' },
  { value: 'support_ticket', label: '🎫 Support Ticket' },
  { value: 'conference', label: '🎤 Conference' },
  { value: 'email', label: '📧 Email' },
  { value: 'other', label: '📋 Other' },
];

interface AICategory {
  category: string;
  confidence: number;
  reasoning?: string;
}

export default function FeedbackOnBehalfModal({
  isOpen,
  onClose,
  projectId,
  projectSlug,
  onSuccess,
}: FeedbackOnBehalfModalProps) {
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Feature Request' as (typeof categoryOptions)[number]['value'],
    title: '',
    description: '',
    customerName: '',
    customerEmail: '',
    customerCompany: '',
    priority: 'important',
    source: 'sales_call',
    internalNote: '',
    notifyCustomer: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aiCategory, setAiCategory] = useState<AICategory | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAICategory, setShowAICategory] = useState(false);
  const [aiUsage, setAiUsage] = useState<{ current: number; limit: number; remaining: number; isPro: boolean } | null>(null);

  if (!isOpen) return null;

  const categorizeWithAI = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title before analyzing');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          projectId: projectId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const suggested =
          data.result?.primaryCategory || data.result?.category || '';
        const normalizedCategory = isValidCategory(suggested)
          ? (suggested as (typeof categoryOptions)[number]['value'])
          : 'Other';

        setAiCategory({
          category: normalizedCategory,
          confidence: data.result?.confidence ?? 0,
          reasoning: data.result?.reasoning,
        });
        setShowAICategory(true);
        setFormData((prev) => ({
          ...prev,
          category: normalizedCategory,
        }));
        if (data.usage) {
          setAiUsage(data.usage);
        }
        toast.success('AI analysis complete!');
      } else {
        const errorData = await response.json();
        if (response.status === 429) {
          toast.error(errorData.message || 'Rate limit exceeded');
        } else {
          toast.error('AI analysis failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('AI categorization error:', error);
      toast.error('AI analysis unavailable. Please try again later.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }

    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'Customer email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error('You must be logged in');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/feedback/on-behalf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId,
          customerEmail: formData.customerEmail.toLowerCase().trim(),
          customerName: formData.customerName.trim(),
          customerCompany: formData.customerCompany.trim() || null,
          feedbackTitle: formData.title.trim(),
          feedbackDescription: formData.description.trim(),
          category: formData.category,
          priority: formData.priority,
          feedbackSource: formData.source,
          internalNote: formData.internalNote.trim() || null,
          notifyCustomer: formData.notifyCustomer,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit feedback');
      }

      // Track analytics
      try {
        analytics.track('Feedback Submitted On Behalf', {
          project_id: projectId,
          category: formData.category,
          type: formData.category,
          priority: formData.priority,
          has_company: !!formData.customerCompany,
        });
      } catch (e) {
        console.error('Analytics error:', e);
      }

      setIsSuccess(true);
      toast.success('Feedback submitted successfully!');

      setTimeout(() => {
        setIsSuccess(false);
        handleClose();
        onSuccess?.();
      }, 2000);

    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      category: 'Feature Request',
      title: '',
      description: '',
      customerName: '',
      customerEmail: '',
      customerCompany: '',
      priority: 'important',
      source: 'sales_call',
      internalNote: '',
      notifyCustomer: true,
    });
    setErrors({});
    onClose();
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 99999999,
        display: 'block',
        padding: '0',
        overflow: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-[800px] w-[90%] max-h-[90vh] relative my-5 mx-auto flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white m-0">Submit Feedback on Behalf</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Submit customer feedback from a sales call or meeting
            </p>
          </div>
          <button
            onClick={handleClose}
            className="bg-transparent border-none text-xl cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className="p-5 pb-6 flex-1 overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
          {isSuccess ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Feedback Submitted!
              </h3>
              <p className="text-gray-600">
                Feedback from {formData.customerName} has been submitted successfully.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Feedback Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  What type of feedback is this?
                </label>
                <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
                  {categoryOptions.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => handleInputChange('category', category.value)}
                        className={`p-3 rounded-lg border-2 transition-all text-left min-touch-target tap-highlight-transparent active:scale-95 ${formData.category === category.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4 text-gray-600" />
                          <span className="font-medium text-sm">{category.label}</span>
                        </div>
                        <p className="text-xs text-gray-500">{category.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Brief, descriptive title for the feedback"
                  className={`text-base ${errors.title ? 'border-red-500' : ''}`}
                  disabled={loading}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what the customer is requesting and why it's important to them..."
                  rows={4}
                  className={`text-base momentum-scroll ${errors.description ? 'border-red-500 mb-2' : 'mb-2'}`}
                  disabled={loading}
                />

                {/* AI Writing Assistant */}
                <AIWritingAssistant
                  currentText={formData.description}
                  context={`Feedback category: ${formData.category}, Title: ${formData.title}`}
                  onTextImprove={(improved) => handleInputChange('description', improved)}
                  placeholder="Describe the feedback..."
                />

                {errors.description && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.description}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {formData.description.length}/500 characters
                </p>
              </div>

              {/* AI Categorization Button */}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={categorizeWithAI}
                  disabled={isAnalyzing || loading}
                  className="w-full border-purple-200 hover:bg-purple-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </Button>

                {/* AI Category Display */}
                {showAICategory && aiCategory && (
                  <div className="mt-3 space-y-3">
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-purple-900 mb-1">
                            AI Suggested Category: {aiCategory.category}
                          </div>
                          <div className="text-sm text-purple-700 mb-2">
                            Confidence: {Math.round(aiCategory.confidence * 100)}%
                          </div>
                          {aiCategory.reasoning && (
                            <div className="text-sm text-purple-600 italic">
                              &quot;{aiCategory.reasoning}&quot;
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* AI Usage Indicator */}
                    {aiUsage && (
                      <AIUsageIndicator
                        current={aiUsage.current}
                        limit={aiUsage.limit}
                        remaining={aiUsage.remaining}
                        isPro={aiUsage.isPro}
                        featureName="AI categorization"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Customer Details</h3>

                <div className="space-y-4">
                  {/* Customer Name */}
                  <div>
                    <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Name *
                    </label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => handleInputChange('customerName', e.target.value)}
                      placeholder="John Doe"
                      className={`text-base ${errors.customerName ? 'border-red-500' : ''}`}
                      disabled={loading}
                    />
                    {errors.customerName && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.customerName}
                      </p>
                    )}
                  </div>

                  {/* Customer Email */}
                  <div>
                    <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email *
                    </label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                      placeholder="john@company.com"
                      className={`text-base ${errors.customerEmail ? 'border-red-500' : ''}`}
                      disabled={loading}
                    />
                    {errors.customerEmail && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.customerEmail}
                      </p>
                    )}
                  </div>

                  {/* Customer Company */}
                  <div>
                    <label htmlFor="customerCompany" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Company
                    </label>
                    <Input
                      id="customerCompany"
                      value={formData.customerCompany}
                      onChange={(e) => handleInputChange('customerCompany', e.target.value)}
                      placeholder="Acme Corp (optional)"
                      className="text-base"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Additional Details</h3>

                <div className="space-y-4">
                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PRIORITY_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleInputChange('priority', option.value)}
                          className={`p-2 rounded-lg border-2 transition-all text-center ${formData.priority === option.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <div className="font-medium text-xs">{option.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Source */}
                  <div>
                    <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-2">
                      Source
                    </label>
                    <select
                      id="source"
                      value={formData.source}
                      onChange={(e) => handleInputChange('source', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      disabled={loading}
                    >
                      {SOURCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Internal Note */}
                  <div>
                    <label htmlFor="internalNote" className="block text-sm font-medium text-gray-700 mb-2">
                      Internal Note (Optional)
                    </label>
                    <Textarea
                      id="internalNote"
                      value={formData.internalNote}
                      onChange={(e) => handleInputChange('internalNote', e.target.value)}
                      placeholder="Add context, requirements, or notes (only visible to your team)..."
                      rows={3}
                      className="text-base momentum-scroll"
                      disabled={loading}
                    />
                  </div>

                  {/* Notify Customer */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="notifyCustomer"
                      checked={formData.notifyCustomer}
                      onChange={(e) => handleInputChange('notifyCustomer', e.target.checked)}
                      className="rounded"
                      disabled={loading}
                    />
                    <label htmlFor="notifyCustomer" className="text-sm text-gray-700">
                      Notify customer via email
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  onClick={handleClose}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Feedback'
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
