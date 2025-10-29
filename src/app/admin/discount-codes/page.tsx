'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Percent, 
  Plus, 
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  Shield,
  LogOut,
  AlertCircle,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface DiscountCode {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_amount: number;
  max_discount?: number;
  usage_limit?: number;
  usage_count: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  created_at: string;
  target_email?: string;
}

export default function AdminDiscountCodesPage() {
  const { isAdmin, loading: authLoading, getAccessToken } = useAdminAuth();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  
  // Form state
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [targetEmail, setTargetEmail] = useState(''); // New field for email-specific codes

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      window.location.href = '/login';
    }
  }, [authLoading, isAdmin]);

  const loadDiscountCodes = useCallback(async () => {
    const token = await getAccessToken();

    if (!token) {
      toast.error('Admin authorization missing. Please refresh.');
      return;
    }
    try {
      const response = await fetch('/api/admin/discount-codes', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch discount codes');
      }

      const data = await response.json();
      setCodes(data.codes || []);
    } catch (error) {
      console.error('Error loading discount codes:', error);
      toast.error('Failed to load discount codes');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadDiscountCodes();
    }
  }, [authLoading, isAdmin, loadDiscountCodes]);

  const createDiscountCode = async () => {
    const token = await getAccessToken();
    if (!token) {
      toast.error('Admin authorization missing. Please refresh.');
      return;
    }
    if (!code || !discountValue) {
      toast.error('Please fill in required fields');
      return;
    }

    setCreateLoading(true);
    try {
      const response = await fetch('/api/admin/discount-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: code.toUpperCase(),
          description: description || undefined,
          discount_type: discountType,
          discount_value: parseFloat(discountValue),
          min_amount: minAmount ? parseFloat(minAmount) : undefined,
          max_discount: maxDiscount ? parseFloat(maxDiscount) : undefined,
          usage_limit: usageLimit ? parseInt(usageLimit, 10) : undefined,
          valid_until: validUntil || undefined,
          target_email: targetEmail || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create discount code');
      }

      toast.success('Discount code created successfully!');
      
      // Reset form
      setCode('');
      setDescription('');
      setDiscountValue('');
      setMinAmount('');
      setMaxDiscount('');
      setUsageLimit('');
      setValidUntil('');
      setTargetEmail('');
      setShowCreateForm(false);
      
      // Reload codes
      loadDiscountCodes();

    } catch (error) {
      console.error('Error creating discount code:', error);
      toast.error('Failed to create discount code');
    } finally {
      setCreateLoading(false);
    }
  };

  const toggleCodeStatus = async (id: string, currentStatus: boolean) => {
    const token = await getAccessToken();
    if (!token) {
      toast.error('Admin authorization missing. Please refresh.');
      return;
    }
    try {
      const response = await fetch('/api/admin/discount-codes', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          action: 'toggle',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update discount code');
      }

      toast.success('Discount code status updated');
      loadDiscountCodes();
    } catch (error) {
      console.error('Error updating discount code:', error);
      toast.error('Failed to update discount code');
    }
  };
  
  const deleteCode = async (id: string) => {
    const token = await getAccessToken();
    if (!token) {
      toast.error('Admin authorization missing. Please refresh.');
      return;
    }
    if (!confirm('Are you sure you want to delete this discount code?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/discount-codes?id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete discount code');
      }

      toast.success('Discount code deleted');
      loadDiscountCodes();
    } catch (error) {
      console.error('Error deleting discount code:', error);
      toast.error('Failed to delete discount code');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Discount Codes</h1>
        <p className="text-gray-600">
          Create and manage discount codes for Stripe checkout - supports email-specific codes and usage limits
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Discount codes created here are synced with Stripe Checkout. You can create email-specific codes or public codes with usage limits.
          Codes will be automatically validated during checkout.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Codes</p>
                  <p className="text-2xl font-bold">{codes.length}</p>
                </div>
                <Percent className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Codes</p>
                  <p className="text-2xl font-bold text-green-600">
                    {codes.filter(c => c.is_active).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Usage</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {codes.reduce((sum, c) => sum + c.usage_count, 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Expired Codes</p>
                  <p className="text-2xl font-bold text-red-600">
                    {codes.filter(c => c.valid_until && new Date(c.valid_until) < new Date()).length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Create Code Section */}
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Discount Code
            </CardTitle>
            <CardDescription>
              Create a new discount code for promotions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showCreateForm ? (
              <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Code
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      placeholder="e.g., WELCOME20"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="e.g., Welcome discount for new users"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="discount-type">Discount Type</Label>
                    <Select value={discountType} onValueChange={(value: 'percentage' | 'fixed') => setDiscountType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="discount-value">Discount Value *</Label>
                    <Input
                      id="discount-value"
                      type="number"
                      placeholder={discountType === 'percentage' ? '20' : '50'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="min-amount">Minimum Amount</Label>
                    <Input
                      id="min-amount"
                      type="number"
                      placeholder="0"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="target-email">Target Email (Optional)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="target-email"
                        type="email"
                        placeholder="user@example.com"
                        value={targetEmail}
                        onChange={(e) => setTargetEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Leave empty for public codes, or specify an email for user-specific codes
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="valid-until">Valid Until</Label>
                    <Input
                      id="valid-until"
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max-discount">Max Discount</Label>
                    <Input
                      id="max-discount"
                      type="number"
                      placeholder="No limit"
                      value={maxDiscount}
                      onChange={(e) => setMaxDiscount(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="usage-limit">Usage Limit</Label>
                    <Input
                      id="usage-limit"
                      type="number"
                      placeholder="No limit"
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={createDiscountCode}
                    disabled={createLoading || !code || !discountValue}
                    className="flex items-center gap-2"
                  >
                    {createLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Create Code
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Codes List */}
      <Card>
          <CardHeader>
            <CardTitle>Discount Codes</CardTitle>
            <CardDescription>
              Manage existing discount codes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {codes.map((discountCode) => (
                <div key={discountCode.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{discountCode.code}</h3>
                      <Badge variant={discountCode.is_active ? 'default' : 'secondary'}>
                        {discountCode.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">
                        {discountCode.discount_type === 'percentage' ? 
                          `${discountCode.discount_value}%` : 
                          `$${discountCode.discount_value}`
                        }
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {discountCode.description && (
                        <p><strong>Description:</strong> {discountCode.description}</p>
                      )}
                      {discountCode.target_email && (
                        <p><strong>Target Email:</strong> {discountCode.target_email}</p>
                      )}
                      <p><strong>Usage:</strong> {discountCode.usage_count} / {discountCode.usage_limit || '∞'}</p>
                      <p><strong>Min Amount:</strong> ${discountCode.min_amount}</p>
                      {discountCode.max_discount && (
                        <p><strong>Max Discount:</strong> ${discountCode.max_discount}</p>
                      )}
                      <p><strong>Valid Until:</strong> {discountCode.valid_until ? formatDate(discountCode.valid_until) : 'No expiry'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyCode(discountCode.code)}
                      className="flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant={discountCode.is_active ? 'outline' : 'default'}
                      onClick={() => toggleCodeStatus(discountCode.id, discountCode.is_active)}
                    >
                      {discountCode.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteCode(discountCode.id)}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
