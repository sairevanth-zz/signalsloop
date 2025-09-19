'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Crown, 
  Gift, 
  Users, 
  Calendar,
  Search,
  Plus,
  CheckCircle,
  AlertCircle,
  Shield,
  LogOut,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface Project {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro';
  owner_id: string;
  subscription_status?: string;
  current_period_end?: string;
  created_at: string;
  owner_email?: string;
}

interface SubscriptionGift {
  id: string;
  project_slug: string;
  project_name: string;
  owner_email: string;
  duration_months: number;
  status: 'active' | 'expired';
  gifted_at: string;
  expires_at: string;
}

export default function AdminSubscriptionsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [gifts, setGifts] = useState<SubscriptionGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGiftForm, setShowGiftForm] = useState(false);
  const [giftLoading, setGiftLoading] = useState(false);
  
  // Gift form state - Updated to use email instead of project
  const [giftEmail, setGiftEmail] = useState('');
  const [giftDuration, setGiftDuration] = useState('1');
  const [giftReason, setGiftReason] = useState('');

  const supabase = getSupabaseClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!supabase) return;

    try {
      // Load all projects with owner info
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          users!projects_owner_id_fkey(email)
        `)
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('Error loading projects:', projectsError);
        toast.error('Failed to load projects');
        return;
      }

      // Transform the data to include owner email
      const transformedProjects = projectsData.map(project => ({
        ...project,
        owner_email: project.users?.email || 'Unknown'
      }));

      setProjects(transformedProjects);

      // Load subscription gifts
      const { data: giftsData, error: giftsError } = await supabase
        .from('gift_subscriptions')
        .select(`
          *,
          projects!inner(name, slug)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (giftsError) {
        console.error('Error loading gifts:', giftsError);
      } else {
        const transformedGifts = giftsData?.map(gift => ({
          id: gift.id,
          project_slug: gift.projects?.slug || 'unknown',
          project_name: gift.projects?.name || 'Unknown Project',
          owner_email: gift.recipient_email,
          duration_months: gift.duration_months,
          status: gift.status === 'claimed' ? 'active' : gift.status,
          gifted_at: gift.created_at,
          expires_at: gift.expires_at
        })) || [];
        setGifts(transformedGifts);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const giftSubscription = async () => {
    if (!giftEmail || !giftDuration) {
      toast.error('Please enter email and duration');
      return;
    }

    console.log('Admin gift subscription attempt:', { giftEmail, giftDuration });
    setGiftLoading(true);
    try {
      // Find user by email first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', giftEmail)
        .single();

      if (userError || !userData) {
        console.error('User not found error:', userError);
        toast.error('User not found. Please make sure they have an account.');
        setGiftLoading(false);
        return;
      }
      
      console.log('User found:', userData);

      // Find their projects
      const { data: userProjects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', userData.id);

      if (projectsError) {
        console.error('Error finding user projects:', projectsError);
        toast.error('Failed to find user projects');
        setGiftLoading(false);
        return;
      }

      if (!userProjects || userProjects.length === 0) {
        toast.error('User has no projects yet');
        setGiftLoading(false);
        return;
      }

      // Calculate expiry date
      const durationMonths = parseInt(giftDuration);
      const newExpiry = new Date();
      newExpiry.setMonth(newExpiry.getMonth() + durationMonths);

      // Update all user's projects to Pro
      const { error } = await supabase
        .from('projects')
        .update({
          plan: 'pro',
          subscription_status: 'active',
          current_period_end: newExpiry.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('owner_id', userData.id);

      if (error) {
        console.error('Error gifting subscription:', error);
        toast.error('Failed to gift subscription');
        return;
      }

      // Create a gift subscription record for tracking
      const { error: giftError } = await supabase
        .from('gift_subscriptions')
        .insert({
          project_id: userProjects[0].id, // Use first project as reference
          gifter_id: null, // Admin gift
          gifter_email: 'admin@signalsloop.com',
          recipient_email: giftEmail,
          recipient_id: userData.id,
          gift_type: 'pro',
          duration_months: durationMonths,
          status: 'claimed', // Already applied
          expires_at: newExpiry.toISOString(),
          claimed_at: new Date().toISOString(),
          gift_message: giftReason || 'Admin gift subscription',
          admin_notes: `Gifted by admin for ${giftReason || 'administrative purposes'}`
        });

      if (giftError) {
        console.error('Error creating gift record:', giftError);
        // Continue anyway since the actual upgrade worked
      }

      // Log the gift
      console.log('Gift given:', {
        user_email: giftEmail,
        user_id: userData.id,
        projects_upgraded: userProjects.length,
        duration_months: durationMonths,
        reason: giftReason,
        gifted_at: new Date().toISOString(),
        expires_at: newExpiry.toISOString()
      });

      toast.success(`Successfully gifted ${durationMonths} month${durationMonths > 1 ? 's' : ''} of Pro to ${giftEmail} (${userProjects.length} project${userProjects.length > 1 ? 's' : ''} upgraded)!`);
      
      // Reset form
      setGiftEmail('');
      setGiftDuration('1');
      setGiftReason('');
      setShowGiftForm(false);
      
      // Reload data
      loadData();

    } catch (error) {
      console.error('Error gifting subscription:', error);
      toast.error('Failed to gift subscription');
    } finally {
      setGiftLoading(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.owner_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
        <p className="text-gray-600">
          Manage Pro subscriptions, gift subscriptions, and track user accounts
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Projects</p>
                  <p className="text-2xl font-bold">{projects.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pro Projects</p>
                  <p className="text-2xl font-bold text-green-600">
                    {projects.filter(p => p.plan === 'pro').length}
                  </p>
                </div>
                <Crown className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Free Projects</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {projects.filter(p => p.plan === 'free').length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gifts Given</p>
                  <p className="text-2xl font-bold text-purple-600">{gifts.length}</p>
                </div>
                <Gift className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Gift Subscription Section */}
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Gift Pro Subscription
            </CardTitle>
            <CardDescription>
              Give Pro access to any user for a specified duration
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showGiftForm ? (
              <Button onClick={() => setShowGiftForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Gift Subscription
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gift-email">User Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="gift-email"
                        type="email"
                        placeholder="user@example.com"
                        value={giftEmail}
                        onChange={(e) => setGiftEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Enter the email address of the user to gift Pro access to
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="duration">Duration</Label>
                    <Select value={giftDuration} onValueChange={setGiftDuration}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Month</SelectItem>
                        <SelectItem value="3">3 Months</SelectItem>
                        <SelectItem value="6">6 Months</SelectItem>
                        <SelectItem value="12">1 Year</SelectItem>
                        <SelectItem value="24">2 Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Input
                    id="reason"
                    placeholder="e.g., Influencer partnership, Beta tester, etc."
                    value={giftReason}
                    onChange={(e) => setGiftReason(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={giftSubscription}
                    disabled={giftLoading || !giftEmail}
                    className="flex items-center gap-2"
                  >
                    {giftLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Gifting...
                      </>
                    ) : (
                      <>
                        <Gift className="h-4 w-4" />
                        Gift Subscription
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowGiftForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Gift History */}
      {gifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Gift History
            </CardTitle>
            <CardDescription>
              Recent gift subscriptions given to users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {gifts.slice(0, 10).map((gift) => (
                <div key={gift.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{gift.owner_email}</h3>
                      <Badge variant={gift.status === 'active' ? 'default' : 'secondary'}>
                        {gift.status}
                      </Badge>
                      <Badge variant="outline">
                        {gift.duration_months} month{gift.duration_months > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Project:</strong> {gift.project_name} ({gift.project_slug})</p>
                      <p><strong>Gifted:</strong> {new Date(gift.gifted_at).toLocaleDateString()}</p>
                      <p><strong>Expires:</strong> {new Date(gift.expires_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects List */}
      <Card>
          <CardHeader>
            <CardTitle>All Projects</CardTitle>
            <CardDescription>
              View and manage all user projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search projects by name, slug, or owner email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              {filteredProjects.map((project) => (
                <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{project.name}</h3>
                      <Badge variant={project.plan === 'pro' ? 'default' : 'secondary'}>
                        {project.plan.toUpperCase()}
                      </Badge>
                      {project.subscription_status && (
                        <Badge variant="outline">
                          {project.subscription_status}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Slug:</strong> {project.slug}</p>
                      <p><strong>Owner:</strong> {project.owner_email}</p>
                      <p><strong>Created:</strong> {new Date(project.created_at).toLocaleDateString()}</p>
                      {project.current_period_end && (
                        <p><strong>Expires:</strong> {new Date(project.current_period_end).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {project.plan === 'free' ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setGiftEmail(project.owner_email || '');
                          setShowGiftForm(true);
                        }}
                        className="flex items-center gap-1"
                      >
                        <Gift className="h-3 w-3" />
                        Gift Pro
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Pro Active</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
