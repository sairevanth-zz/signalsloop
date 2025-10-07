'use client';

import React, { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  X,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Lightbulb,
  Bug,
  Star,
  Sparkles,
  Brain,
  Palette,
  Share2,
  Gauge,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import AIWritingAssistant from './AIWritingAssistant';
import AIUsageIndicator from './AIUsageIndicator';

interface PostSubmissionFormProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  boardId: string;
  onPostSubmitted?: () => void;
}

interface FormData {
  title: string;
  description: string;
  category:
    | 'Feature Request'
    | 'Bug'
    | 'Improvement'
    | 'UI/UX'
    | 'Integration'
    | 'Performance'
    | 'Documentation'
    | 'Other';
  priority: 'low' | 'medium' | 'high';
  name: string;
  email: string;
}

interface AICategory {
  category: string;
  confidence: number;
  reasoning?: string;
}

const categoryOptions: Array<{
  value: FormData['category'];
  label: string;
  icon: LucideIcon;
  description: string;
}> = [
  { value: 'Feature Request', label: 'Feature Request', icon: Star, description: 'Suggest a new feature or capability' },
  { value: 'Bug', label: 'Bug Report', icon: Bug, description: 'Report a problem or defect' },
  { value: 'Improvement', label: 'Improvement', icon: Lightbulb, description: 'Enhance an existing feature or workflow' },
  { value: 'UI/UX', label: 'UI / UX', icon: Palette, description: 'Design, usability, or user experience feedback' },
  { value: 'Integration', label: 'Integration', icon: Share2, description: 'Connect SignalsLoop with other tools or APIs' },
  { value: 'Performance', label: 'Performance', icon: Gauge, description: 'Speed, stability, or reliability issues' },
  { value: 'Documentation', label: 'Documentation', icon: BookOpen, description: 'Onboarding, guides, or help content' },
  { value: 'Other', label: 'Other', icon: MessageSquare, description: 'Anything else not covered above' }
];

const isValidCategory = (value: string): value is FormData['category'] =>
  categoryOptions.some((option) => option.value === value);

const priorities = [
  { value: 'low', label: 'Low', color: 'text-green-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'high', label: 'High', color: 'text-red-600' }
];

export default function PostSubmissionForm({ 
  isOpen, 
  onClose, 
  projectId, // eslint-disable-line @typescript-eslint/no-unused-vars
  boardId, 
  onPostSubmitted 
}: PostSubmissionFormProps) {
  const supabase = getSupabaseClient();
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category: 'Feature Request',
    priority: 'medium',
    name: '',
    email: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [aiCategory, setAiCategory] = useState<AICategory | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAICategory, setShowAICategory] = useState(false);
  const [aiUsage, setAiUsage] = useState<{current: number; limit: number; remaining: number; isPro: boolean} | null>(null);

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
        setAiCategory(data.result);
        setShowAICategory(true);
        if (data.result?.category && isValidCategory(data.result.category)) {
          setFormData((prev) => ({
            ...prev,
            category: data.result.category,
          }));
        }
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

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!supabase) {
      setErrors({ title: 'Database connection not available. Please refresh the page.' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      // If boardId is empty, fetch it from the project
      let finalBoardId = boardId;
      if (!finalBoardId) {
        const { data: boardData, error: boardError } = await supabase
          .from('boards')
          .select('id')
          .eq('project_id', projectId)
          .single();
        
        if (boardError || !boardData) {
          throw new Error('Board not found for this project');
        }
        
        finalBoardId = boardData.id;
      }
      
      // Create the post using the API route (includes automatic AI categorization)
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          board_id: finalBoardId,
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          author_name: formData.name.trim(),
          author_email: formData.email.trim() || session?.user?.email || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit post');
      }

      const result = await response.json();
      console.log('Post created successfully:', result);

      // Show success state
      setIsSuccess(true);
      toast.success('Feedback submitted successfully!');
      
      // Reset form after a delay
      setTimeout(() => {
        setIsSuccess(false);
        setFormData({
          title: '',
          description: '',
          category: 'Feature Request',
          priority: 'medium',
          name: '',
          email: ''
        });
        setErrors({});
        setAiCategory(null);
        setShowAICategory(false);
        onClose();
        onPostSubmitted?.();
      }, 2000);

    } catch (error) {
      console.error('Error submitting post:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && mounted) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, mounted]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
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
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
          maxWidth: '800px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'hidden',
          position: 'relative',
          margin: '20px auto',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Submit Feedback</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
              Help us improve by sharing your thoughts and ideas
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '20px', paddingBottom: '24px', flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
            {isSuccess ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Feedback Submitted!
                </h3>
                <p className="text-gray-600">
                  Thank you for your feedback. We&apos;ll review it and get back to you soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Which category best fits this feedback?
                  </label>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                    {categoryOptions.map((category) => {
                      const Icon = category.icon;
                      return (
                        <button
                          key={category.value}
                          type="button"
                          onClick={() => handleInputChange('category', category.value)}
                          className={`p-3 rounded-lg border-2 transition-all text-left min-touch-target tap-highlight-transparent active:scale-95 ${
                            formData.category === category.value
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
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Brief, descriptive title for your feedback"
                    className={`text-base ${errors.title ? 'border-red-500' : ''}`}
                    autoComplete="off"
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
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Provide more details about your feedback. Include steps to reproduce for bugs, or explain the benefit for feature requests."
                    rows={4}
                    className={`text-base momentum-scroll ${errors.description ? 'border-red-500 mb-2' : 'mb-2'}`}
                    autoComplete="off"
                  />
                  
                  {/* AI Writing Assistant */}
                  <AIWritingAssistant
                    currentText={formData.description}
                    context={`Feedback category: ${formData.category}, Title: ${formData.title}`}
                    onTextImprove={(improved) => handleInputChange('description', improved)}
                    placeholder="Provide more details..."
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

                {/* AI Analysis Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">AI Analysis</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={categorizeWithAI}
                      disabled={isAnalyzing || !formData.title.trim()}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50 min-touch-target tap-highlight-transparent"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Analyze
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {showAICategory && aiCategory && (
                    <div className="space-y-3">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-purple-900">
                            Suggested Category
                          </span>
                          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                            {Math.round(aiCategory.confidence * 100)}% confidence
                          </span>
                        </div>
                        <div className="mb-2">
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-800 bg-white border border-purple-200 rounded-full">
                            {aiCategory.category}
                          </span>
                        </div>
                        {aiCategory.reasoning && (
                          <p className="text-xs text-purple-700">
                            {aiCategory.reasoning}
                          </p>
                        )}
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

                  {!showAICategory && (
                    <p className="text-xs text-gray-500">
                      Get AI-powered category suggestions for your feedback
                    </p>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {priorities.map((priority) => (
                      <button
                        key={priority.value}
                        type="button"
                        onClick={() => handleInputChange('priority', priority.value)}
                        className={`px-3 py-2 rounded-md text-sm font-medium border transition-all ${
                          formData.priority === priority.value
                            ? 'border-gray-400 bg-gray-100'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${priority.color}`}
                      >
                        {priority.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name (Required) */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name *
                  </label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="John Doe"
                    className={`text-base ${errors.name ? 'border-red-500' : ''}`}
                    autoComplete="name"
                    required
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Email (Required) */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="your@email.com"
                    className={`text-base ${errors.email ? 'border-red-500' : ''}`}
                    autoComplete="email"
                    inputMode="email"
                    required
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.email}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    We&apos;ll use this to notify you of updates on your feedback.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 min-touch-target tap-highlight-transparent order-2 sm:order-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform min-touch-target tap-highlight-transparent order-1 sm:order-2"
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
            )}
        </div>
      </div>
    </div>
  );

  return modalContent;
}
