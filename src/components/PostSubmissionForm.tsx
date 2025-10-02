'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Brain
} from 'lucide-react';
import { toast } from 'sonner';
import AIWritingAssistant from './AIWritingAssistant';

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
  type: 'feature' | 'bug' | 'improvement' | 'general';
  priority: 'low' | 'medium' | 'high';
  name: string;
  email: string;
}

interface AICategory {
  category: string;
  confidence: number;
  reasoning?: string;
}

const postTypes = [
  { value: 'feature', label: 'Feature Request', icon: Star, description: 'Suggest a new feature' },
  { value: 'bug', label: 'Bug Report', icon: Bug, description: 'Report a problem' },
  { value: 'improvement', label: 'Improvement', icon: Lightbulb, description: 'Improve existing feature' },
  { value: 'general', label: 'General Feedback', icon: MessageSquare, description: 'General thoughts' }
];

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
    type: 'feature',
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
          description: formData.description
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiCategory(data.result);
        setShowAICategory(true);
        toast.success('AI analysis complete!');
      } else {
        toast.error('AI analysis failed. Please try again.');
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

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
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
      
      // Create the post using the API route (includes automatic AI categorization)
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          board_id: boardId,
          title: formData.title.trim(),
          description: formData.description.trim(),
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
          type: 'feature',
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
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm">
      <div className="h-full flex items-start sm:items-center justify-center sm:p-4">
        <div className="bg-white w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-lg shadow-xl flex flex-col">
          {/* Fixed Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b flex-shrink-0 bg-white">
            <div className="flex-1 pr-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Submit Feedback</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Help us improve by sharing your thoughts and ideas
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="min-touch-target tap-highlight-transparent flex-shrink-0 -mr-2"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Scrollable Content */}
          <div 
            className="flex-1 overflow-y-auto p-4 sm:p-6"
            style={{
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain'
            }}
          >
            <Card className="border-0 shadow-none">
              <CardContent className="p-0 space-y-4 sm:space-y-6">
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
                {/* Post Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    What type of feedback is this?
                  </label>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                    {postTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => handleInputChange('type', type.value)}
                          className={`p-3 rounded-lg border-2 transition-all text-left min-touch-target tap-highlight-transparent active:scale-95 ${
                            formData.type === type.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="h-4 w-4 text-gray-600" />
                            <span className="font-medium text-sm">{type.label}</span>
                          </div>
                          <p className="text-xs text-gray-500">{type.description}</p>
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
                    context={`Feedback type: ${formData.type}, Title: ${formData.title}`}
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
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-purple-900">
                          Suggested Category
                        </span>
                        <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                          {Math.round(aiCategory.confidence * 100)}% confidence
                        </span>
                      </div>
                      <div className="text-sm text-purple-800 mb-2">
                        <strong>{aiCategory.category}</strong>
                      </div>
                      {aiCategory.reasoning && (
                        <p className="text-xs text-purple-700">
                          {aiCategory.reasoning}
                        </p>
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

                {/* Email (Optional) */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email (optional)
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
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.email}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    We&apos;ll use this to notify you of updates on your feedback
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
