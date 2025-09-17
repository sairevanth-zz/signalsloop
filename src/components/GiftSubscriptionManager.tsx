'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Gift, 
  Send, 
  Users, 
  Calendar, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Plus,
  History,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

interface GiftSubscription {
  id: string;
  project_id: string;
  gifter_email: string;
  recipient_email: string;
  gift_type: string;
  duration_months: number;
  status: 'pending' | 'claimed' | 'expired' | 'cancelled';
  expires_at: string;
  claimed_at?: string;
  gift_message?: string;
  created_at: string;
}

interface GiftStats {
  total_gifts: number;
  pending_gifts: number;
  claimed_gifts: number;
  expired_gifts: number;
}

interface GiftSubscriptionManagerProps {
  projectId: string;
  projectName: string;
}

export default function GiftSubscriptionManager({ 
  projectId, 
  projectName 
}: GiftSubscriptionManagerProps) {
  const [gifts, setGifts] = useState<GiftSubscription[]>([]);
  const [stats, setStats] = useState<GiftStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Form state
  const [recipientEmail, setRecipientEmail] = useState('');
  const [duration, setDuration] = useState('1');
  const [giftMessage, setGiftMessage] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');

  useEffect(() => {
    loadGifts();
    loadStats();
  }, [projectId]);

  const loadGifts = async () => {
    try {
      const response = await fetch(`/api/gifts/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setGifts(data.gifts || []);
      }
    } catch (error) {
      console.error('Error loading gifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/gifts/${projectId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const createGift = async () => {
    if (!recipientEmail.trim()) {
      toast.error('Please enter recipient email');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`/api/gifts/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_email: recipientEmail.trim(),
          duration_months: parseInt(duration),
          gift_message: giftMessage.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Gift subscription created successfully!');
        setShowCreateDialog(false);
        setRecipientEmail('');
        setGiftMessage('');
        loadGifts();
        loadStats();
      } else {
        toast.error(data.error || 'Failed to create gift subscription');
      }
    } catch (error) {
      console.error('Error creating gift:', error);
      toast.error('Failed to create gift subscription');
    } finally {
      setCreating(false);
    }
  };

  const createBulkGifts = async () => {
    const emails = bulkEmails
      .split('\n')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    if (emails.length === 0) {
      toast.error('Please enter at least one email address');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`/api/gifts/${projectId}/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails,
          duration_months: parseInt(duration),
          gift_message: giftMessage.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Created ${data.created_count} gift subscriptions!`);
        setShowCreateDialog(false);
        setBulkEmails('');
        setGiftMessage('');
        loadGifts();
        loadStats();
      } else {
        toast.error(data.error || 'Failed to create bulk gifts');
      }
    } catch (error) {
      console.error('Error creating bulk gifts:', error);
      toast.error('Failed to create bulk gifts');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      claimed: 'default',
      expired: 'destructive',
      cancelled: 'outline',
    } as const;

    const icons = {
      pending: <Clock className="h-3 w-3" />,
      claimed: <CheckCircle className="h-3 w-3" />,
      expired: <XCircle className="h-3 w-3" />,
      cancelled: <AlertCircle className="h-3 w-3" />,
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]} className="flex items-center gap-1">
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Gifts</p>
                  <p className="text-2xl font-bold">{stats.total_gifts}</p>
                </div>
                <Gift className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending_gifts}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Claimed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.claimed_gifts}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Expired</p>
                  <p className="text-2xl font-bold text-red-600">{stats.expired_gifts}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="gifts" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="gifts">Gift History</TabsTrigger>
            <TabsTrigger value="create">Create Gift</TabsTrigger>
          </TabsList>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Gift Pro Subscription
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Gift Pro Subscription</DialogTitle>
                <DialogDescription>
                  Send a Pro subscription gift to users for {projectName}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">Duration</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Month</SelectItem>
                        <SelectItem value="3">3 Months</SelectItem>
                        <SelectItem value="6">6 Months</SelectItem>
                        <SelectItem value="12">1 Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="gift-message">Gift Message (Optional)</Label>
                  <Textarea
                    id="gift-message"
                    placeholder="Add a personal message for the recipient..."
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Recipient Email</Label>
                  <Input
                    placeholder="user@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                  <Button 
                    onClick={createGift} 
                    disabled={creating || !recipientEmail.trim()}
                    className="w-full"
                  >
                    {creating ? 'Creating...' : 'Send Gift'}
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or bulk gift
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Multiple Recipients (one email per line)</Label>
                  <Textarea
                    placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    rows={4}
                  />
                  <Button 
                    onClick={createBulkGifts} 
                    disabled={creating || !bulkEmails.trim()}
                    variant="outline"
                    className="w-full"
                  >
                    {creating ? 'Creating...' : 'Send Bulk Gifts'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="gifts" className="space-y-4">
          {gifts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No gifts sent yet</h3>
                <p className="text-gray-600 mb-4">
                  Start by gifting Pro subscriptions to your team or users.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Send Your First Gift
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {gifts.map((gift) => (
                <Card key={gift.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{gift.recipient_email}</span>
                          {getStatusBadge(gift.status)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {gift.duration_months} month{gift.duration_months > 1 ? 's' : ''}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expires: {formatDate(gift.expires_at)}
                          </div>
                          {gift.claimed_at && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Claimed: {formatDate(gift.claimed_at)}
                            </div>
                          )}
                        </div>
                        
                        {gift.gift_message && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                            "{gift.gift_message}"
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
