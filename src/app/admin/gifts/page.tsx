'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Gift, 
  Plus,
  Mail,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Users,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface GiftSubscription {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  durationMonths: number;
  message?: string;
  status: 'pending' | 'sent' | 'claimed' | 'expired';
  giftCode: string;
  sentAt?: string;
  claimedAt?: string;
  expiresAt: string;
  createdAt: string;
}

export default function AdminGiftsPage() {
  const [gifts, setGifts] = useState<GiftSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  
  // Form state
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [duration, setDuration] = useState('1');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadGifts();
  }, []);

  const loadGifts = async () => {
    // Simulate loading gifts
    setTimeout(() => {
      setGifts([
        {
          id: '1',
          recipientEmail: 'user@example.com',
          recipientName: 'John Doe',
          durationMonths: 3,
          message: 'Thank you for being a beta tester!',
          status: 'claimed',
          giftCode: 'GIFT-ABC123',
          sentAt: '2024-01-15',
          claimedAt: '2024-01-16',
          expiresAt: '2024-04-15',
          createdAt: '2024-01-15'
        },
        {
          id: '2',
          recipientEmail: 'influencer@example.com',
          recipientName: 'Jane Smith',
          durationMonths: 6,
          message: 'Partnership collaboration',
          status: 'sent',
          giftCode: 'GIFT-DEF456',
          sentAt: '2024-01-20',
          expiresAt: '2024-07-20',
          createdAt: '2024-01-20'
        },
        {
          id: '3',
          recipientEmail: 'partner@example.com',
          recipientName: 'Mike Johnson',
          durationMonths: 12,
          message: 'Strategic partnership gift',
          status: 'pending',
          giftCode: 'GIFT-GHI789',
          expiresAt: '2024-02-20',
          createdAt: '2024-01-25'
        }
      ]);
      setLoading(false);
    }, 1000);
  };

  const createGift = async () => {
    if (!recipientEmail || !duration) {
      toast.error('Please fill in required fields');
      return;
    }

    setCreateLoading(true);
    
    // Simulate creating gift
    setTimeout(() => {
      const newGift: GiftSubscription = {
        id: Date.now().toString(),
        recipientEmail,
        recipientName: recipientName || undefined,
        durationMonths: parseInt(duration),
        message: message || undefined,
        status: 'pending',
        giftCode: `GIFT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        createdAt: new Date().toISOString()
      };

      setGifts(prev => [newGift, ...prev]);
      toast.success('Gift subscription created successfully!');
      
      // Reset form
      setRecipientEmail('');
      setRecipientName('');
      setDuration('1');
      setMessage('');
      setShowCreateForm(false);
      setCreateLoading(false);
    }, 1000);
  };

  const sendGift = async (giftId: string) => {
    setGifts(prev => prev.map(gift => 
      gift.id === giftId 
        ? { ...gift, status: 'sent' as const, sentAt: new Date().toISOString() }
        : gift
    ));
    toast.success('Gift sent successfully!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'claimed': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'claimed': return CheckCircle;
      case 'sent': return Mail;
      case 'pending': return Clock;
      case 'expired': return XCircle;
      default: return Gift;
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Gift Subscriptions</h1>
        <p className="text-gray-600">
          Create and manage Pro subscription gifts for users and partners
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Gifts</p>
                <p className="text-2xl font-bold">{gifts.length}</p>
              </div>
              <Gift className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Claimed</p>
                <p className="text-2xl font-bold text-green-600">
                  {gifts.filter(g => g.status === 'claimed').length}
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
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {gifts.filter(g => g.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sent</p>
                <p className="text-2xl font-bold text-blue-600">
                  {gifts.filter(g => g.status === 'sent').length}
                </p>
              </div>
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Gift */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Gift Subscription
          </CardTitle>
          <CardDescription>
            Send a Pro subscription gift to a user
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showCreateForm ? (
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Gift
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipient-email">Recipient Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="recipient-email"
                      type="email"
                      placeholder="user@example.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="recipient-name">Recipient Name (Optional)</Label>
                  <Input
                    id="recipient-name"
                    placeholder="John Doe"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <select
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">1 Month</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">1 Year</option>
                    <option value="24">2 Years</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="message">Personal Message (Optional)</Label>
                  <Input
                    id="message"
                    placeholder="Thank you for being a beta tester!"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={createGift}
                  disabled={createLoading || !recipientEmail}
                  className="flex items-center gap-2"
                >
                  {createLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4" />
                      Create Gift
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

      {/* Gifts List */}
      <Card>
        <CardHeader>
          <CardTitle>Gift Subscriptions</CardTitle>
          <CardDescription>
            Manage all gift subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {gifts.map((gift) => {
              const StatusIcon = getStatusIcon(gift.status);
              return (
                <div key={gift.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {gift.recipientName || gift.recipientEmail}
                      </h3>
                      <Badge className={getStatusColor(gift.status)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {gift.status}
                      </Badge>
                      <Badge variant="outline">
                        {gift.durationMonths} month{gift.durationMonths > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Email:</strong> {gift.recipientEmail}</p>
                      <p><strong>Gift Code:</strong> {gift.giftCode}</p>
                      {gift.message && (
                        <p><strong>Message:</strong> {gift.message}</p>
                      )}
                      <p><strong>Created:</strong> {new Date(gift.createdAt).toLocaleDateString()}</p>
                      <p><strong>Expires:</strong> {new Date(gift.expiresAt).toLocaleDateString()}</p>
                      {gift.claimedAt && (
                        <p><strong>Claimed:</strong> {new Date(gift.claimedAt).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {gift.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => sendGift(gift.id)}
                        className="flex items-center gap-1"
                      >
                        <Mail className="h-3 w-3" />
                        Send
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
