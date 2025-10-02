'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, UserPlus, Loader2, Building2, AlertCircle, Mail, User, FileText, Tag, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';
import { analytics } from '@/lib/analytics';

interface VoteOnBehalfModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
  projectId: string;
  onSuccess?: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 'must_have', label: '🔴 Must Have', description: 'Critical for customer success' },
  { value: 'important', label: '🟡 Important', description: 'Significant business impact' },
  { value: 'nice_to_have', label: '🟢 Nice to Have', description: 'Would improve experience' },
];

const SOURCE_OPTIONS = [
  { value: 'sales_call', label: '📞 Sales Call' },
  { value: 'customer_meeting', label: '🤝 Customer Meeting' },
  { value: 'support_ticket', label: '🎫 Support Ticket' },
  { value: 'conference', label: '🎤 Conference/Event' },
  { value: 'email', label: '📧 Email Request' },
  { value: 'other', label: '📋 Other' },
];

export default function VoteOnBehalfModal({
  isOpen,
  onClose,
  postId,
  postTitle,
  projectId,
  onSuccess,
}: VoteOnBehalfModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerEmail: '',
    customerName: '',
    customerCompany: '',
    priority: 'important',
    voteSource: 'sales_call',
    internalNote: '',
    notifyCustomer: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'Customer email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Invalid email format';
    }

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }

    if (!formData.priority) {
      newErrors.priority = 'Priority is required';
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
      // Get the current user's session token
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('You must be logged in to vote on behalf of a customer');
        setLoading(false);
        return;
      }

      console.log('🔵 VERSION: v2.0 - Enhanced debugging');
      console.log('Submitting vote with data:', {
        postId,
        projectId,
        customerEmail: formData.customerEmail,
        customerName: formData.customerName,
      });

      console.log('📤 Sending request to /api/votes/on-behalf...');

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch('/api/votes/on-behalf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            postId,
            projectId,
            customerEmail: formData.customerEmail.toLowerCase().trim(),
            customerName: formData.customerName.trim(),
            customerCompany: formData.customerCompany.trim() || null,
            priority: formData.priority,
            voteSource: formData.voteSource,
            internalNote: formData.internalNote.trim() || null,
            notifyCustomer: formData.notifyCustomer,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log('✅ Response received! Status:', response.status);

        if (!response.ok) {
          const error = await response.json();
          console.error('❌ API error response:', error);
          throw new Error(error.error || 'Failed to submit vote');
        }

        const data = await response.json();
        console.log('✅ API success response:', data);

        // Track analytics
        try {
          analytics.voteOnBehalf(postId, projectId, formData.priority, {
            has_company: !!formData.customerCompany,
            source: formData.source,
            customer_notified: formData.notifyCustomer,
          });
        } catch (error) {
          console.error('Analytics tracking error:', error);
        }

      toast.success(
        <div className="flex items-start gap-2">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Vote submitted successfully!</div>
            <div className="text-sm text-gray-600 mt-1">
              {formData.notifyCustomer 
                ? `${formData.customerName} will be notified via email`
                : 'Customer was not notified'}
            </div>
          </div>
        </div>,
        { duration: 5000 }
      );

        onSuccess?.();
        handleClose();
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('❌ Request timed out after 30 seconds');
          throw new Error('Request timed out. Please try again.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('❌ Error submitting vote:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast.error(error instanceof Error ? error.message : 'Failed to submit vote');
    } finally {
      setLoading(false);
      console.log('✅ Form submission complete, loading state reset');
    }
  };

  const handleClose = () => {
    setFormData({
      customerEmail: '',
      customerName: '',
      customerCompany: '',
      priority: 'important',
      voteSource: 'sales_call',
      internalNote: '',
      notifyCustomer: true,
    });
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <Card className="w-full max-w-2xl my-8 shadow-2xl">
        <CardContent className="p-0">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Vote on Behalf of Customer</h2>
                  <p className="text-blue-100 text-sm mt-1">
                    Submit a vote for: <span className="font-semibold">{postTitle}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                disabled={loading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Customer Email */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                <Mail className="h-4 w-4 text-blue-600" />
                Customer Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => {
                  setFormData({ ...formData, customerEmail: e.target.value });
                  setErrors({ ...errors, customerEmail: '' });
                }}
                placeholder="john.doe@company.com"
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.customerEmail ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.customerEmail && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.customerEmail}
                </p>
              )}
            </div>

            {/* Customer Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                <User className="h-4 w-4 text-blue-600" />
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => {
                  setFormData({ ...formData, customerName: e.target.value });
                  setErrors({ ...errors, customerName: '' });
                }}
                placeholder="John Doe"
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.customerName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.customerName && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.customerName}
                </p>
              )}
            </div>

            {/* Customer Company */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Company (Optional)
              </label>
              <input
                type="text"
                value={formData.customerCompany}
                onChange={(e) => setFormData({ ...formData, customerCompany: e.target.value })}
                placeholder="Acme Corporation"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Helps track enterprise customer requests
              </p>
            </div>

            {/* Priority */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                <Tag className="h-4 w-4 text-blue-600" />
                Priority <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {PRIORITY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.priority === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={option.value}
                      checked={formData.priority === option.value}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="mt-1"
                      disabled={loading}
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Vote Source */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Vote Source
              </label>
              <select
                value={formData.voteSource}
                onChange={(e) => setFormData({ ...formData, voteSource: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={loading}
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Helps track where customer requests come from
              </p>
            </div>

            {/* Internal Note */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Internal Note (Private)
              </label>
              <textarea
                value={formData.internalNote}
                onChange={(e) => setFormData({ ...formData, internalNote: e.target.value })}
                placeholder="Add context from the call, specific requirements, or any relevant details..."
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Only visible to admins and your team
              </p>
            </div>

            {/* Notify Customer */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifyCustomer}
                  onChange={(e) => setFormData({ ...formData, notifyCustomer: e.target.checked })}
                  className="mt-1"
                  disabled={loading}
                />
                <div>
                  <div className="font-semibold text-gray-900">Notify customer via email</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Send an email letting them know their request was submitted and invite them to add comments
                  </div>
                </div>
              </label>
            </div>

            {/* Actions */}
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Submit Vote
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

