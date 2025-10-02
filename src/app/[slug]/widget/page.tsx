'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Send, X, CheckCircle } from 'lucide-react';
import AIWritingAssistant from '@/components/AIWritingAssistant';

interface WidgetProps {
  projectSlug: string;
}

export default function WidgetPage() {
  const params = useParams();
  const projectSlug = params.slug as string;
  
  const [feedback, setFeedback] = useState('');
  const [category, setCategory] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'improvement', label: 'Improvement' },
    { value: 'ui-ux', label: 'UI/UX' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_slug: projectSlug,
          content: feedback.trim(),
          category: category || 'other',
          user_email: email || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setIsSubmitted(true);
    } catch (err) {
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4 safe-top safe-bottom">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Thank you!</h2>
            <p className="text-gray-600 mb-4">
              Your feedback has been submitted successfully. Our team will review it and get back to you if needed.
            </p>
            <Button 
              onClick={() => {
                setIsSubmitted(false);
                setFeedback('');
                setCategory('');
                setEmail('');
              }}
              variant="outline"
              className="w-full min-touch-target tap-highlight-transparent"
            >
              Submit Another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-3 sm:p-4 safe-top safe-bottom">
      <div className="max-w-md mx-auto">
        <Card className="border-0 shadow-lg rounded-xl">
          <CardHeader className="pb-4 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-base sm:text-sm font-bold">S</span>
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Share Feedback</CardTitle>
                  <CardDescription className="text-sm">Help us improve our product</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
                  What's on your mind? *
                </label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe your feedback, bug report, or feature request..."
                  className="min-h-[120px] resize-none mb-2 text-base momentum-scroll"
                  autoComplete="off"
                  required
                />
                
                {/* AI Writing Assistant */}
                <AIWritingAssistant
                  currentText={feedback}
                  context={`Widget feedback for project: ${projectSlug}, Category: ${category || 'not selected'}`}
                  onTextImprove={(improved) => setFeedback(improved)}
                  placeholder="Describe your feedback..."
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="min-touch-target">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email (optional)
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  autoComplete="email"
                  inputMode="email"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll only use this to follow up if needed
                </p>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={!feedback.trim() || isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-95 transition-transform min-touch-target tap-highlight-transparent"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Submit Feedback
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-100">
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
