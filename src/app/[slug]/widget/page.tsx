'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  Gauge,
  Lightbulb,
  Loader2,
  MessageSquare,
  Palette,
  Send,
  Share2,
  Star,
  Bug
} from 'lucide-react';

type FormState = {
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  name: string;
  email: string;
};

const categoryOptions = [
  { value: 'Feature Request', label: 'Feature Request', icon: Star, description: 'Suggest a new feature or capability' },
  { value: 'Bug', label: 'Bug Report', icon: Bug, description: 'Report a problem or defect' },
  { value: 'Improvement', label: 'Improvement', icon: Lightbulb, description: 'Enhance an existing feature or workflow' },
  { value: 'UI/UX', label: 'UI / UX', icon: Palette, description: 'Share design, usability, or user experience feedback' },
  { value: 'Integration', label: 'Integration', icon: Share2, description: 'Connect SignalsLoop with other tools or APIs' },
  { value: 'Performance', label: 'Performance', icon: Gauge, description: 'Speed, stability, or reliability concerns' },
  { value: 'Documentation', label: 'Documentation', icon: BookOpen, description: 'Guides, onboarding, or help content' },
  { value: 'Other', label: 'Other', icon: MessageSquare, description: 'Anything else not covered above' }
];

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
];

export default function WidgetPage() {
  const params = useParams();
  const projectSlug = params.slug as string;

  const [formData, setFormData] = useState<FormState>({
    title: '',
    description: '',
    category: categoryOptions[0].value,
    priority: 'medium',
    name: '',
    email: ''
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleInputChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const validationErrors: Partial<Record<keyof FormState, string>> = {};

    if (!formData.title.trim()) validationErrors.title = 'Title is required';
    if (!formData.description.trim()) validationErrors.description = 'Description is required';
    if (!formData.name.trim()) validationErrors.name = 'Please enter your name';
    if (!formData.email.trim()) validationErrors.email = 'Email is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      validationErrors.email = 'Please enter a valid email';
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_slug: projectSlug,
          title: formData.title.trim(),
          content: formData.description.trim(),
          category: formData.category,
          priority: formData.priority,
          author_name: formData.name.trim(),
          user_email: formData.email.trim()
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to submit feedback');
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error('Widget feedback submit error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 safe-top safe-bottom">
        <Card className="w-full max-w-xl border-0 shadow-2xl">
          <CardContent className="pt-10 pb-12 text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900">Feedback submitted!</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Thanks for sharing your thoughts. Our team reviews every submission and will reach out if we need more details.
              </p>
            </div>
            <Button
              onClick={() => {
                setIsSubmitted(false);
                setFormData({
                  title: '',
                  description: '',
                  category: categoryOptions[0].value,
                  priority: 'medium',
                  name: '',
                  email: ''
                });
                setErrors({});
              }}
              variant="outline"
              className="min-touch-target tap-highlight-transparent"
            >
              Submit another response
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6 safe-top safe-bottom">
      <div className="max-w-4xl mx-auto">
        <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="px-6 sm:px-10 pt-8 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl font-semibold shadow-lg">
                  SL
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-2xl">SignalsLoop Widget Preview</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    This is exactly what your embedded feedback widget looks like today.
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-6 sm:px-10 pb-10">
            <form onSubmit={handleSubmit} className="grid gap-8">
              <div className="grid gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">
                    Which category best fits this feedback?
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {categoryOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleInputChange('category', option.value)}
                          className={cn(
                            'rounded-2xl border-2 p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                            'bg-white/80 backdrop-blur-sm hover:border-blue-400',
                            formData.category === option.value
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200'
                          )}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="h-4 w-4 text-gray-600" />
                            <span className="font-semibold text-sm text-gray-900">{option.label}</span>
                          </div>
                          <p className="text-xs text-gray-600 leading-5">{option.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-semibold text-gray-800 mb-2">
                      Title *
                    </label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Brief, descriptive title for your feedback"
                      className={cn('h-11 text-base', errors.title && 'border-red-500')}
                      autoComplete="off"
                    />
                    {errors.title && (
                      <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-semibold text-gray-800 mb-2">
                      Description *
                    </label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Provide more details about your feedback. Include steps to reproduce for bugs, or explain the benefit for feature requests."
                      rows={4}
                      className={cn('text-base momentum-scroll', errors.description && 'border-red-500')}
                      autoComplete="off"
                    />
                    {errors.description && (
                      <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Priority</label>
                    <div className="flex gap-2">
                      {priorities.map((priority) => (
                        <Button
                          key={priority.value}
                          type="button"
                          variant={formData.priority === priority.value ? 'default' : 'outline'}
                          onClick={() => handleInputChange('priority', priority.value)}
                          className={cn(
                            'flex-1 min-touch-target tap-highlight-transparent',
                            formData.priority === priority.value
                              ? 'bg-gray-900 hover:bg-gray-800'
                              : 'border-gray-200'
                          )}
                        >
                          {priority.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-2">
                        Your Name *
                      </label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="John Doe"
                        className={cn('h-11 text-base', errors.name && 'border-red-500')}
                        autoComplete="name"
                      />
                      {errors.name && (
                        <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                        Email *
                      </label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="your@email.com"
                        className={cn('h-11 text-base', errors.email && 'border-red-500')}
                        autoComplete="email"
                        inputMode="email"
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.email}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        We'll use this to notify you of updates on your feedback.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
                  {submitError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end border-t border-gray-100 pt-6">
                <Button
                  type="reset"
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      title: '',
                      description: '',
                      category: categoryOptions[0].value,
                      priority: 'medium',
                      name: '',
                      email: ''
                    });
                    setErrors({});
                    setSubmitError('');
                  }}
                  className="sm:w-auto min-touch-target tap-highlight-transparent"
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="sm:w-auto min-touch-target tap-highlight-transparent bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-8 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MessageSquare className="h-3 w-3" />
                <span>Powered by SignalsLoop</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
