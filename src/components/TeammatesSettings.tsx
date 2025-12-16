'use client';

import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  UserPlus,
  Trash2,
  Mail,
  Crown,
  Shield,
  User,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface TeammatesSettingsProps {
  projectId: string;
  projectSlug: string;
  currentUserId?: string;
  onShowNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface Member {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  email?: string;
  user_email?: string;
}

export function TeammatesSettings({
  projectId,
  projectSlug,
  currentUserId,
  onShowNotification
}: TeammatesSettingsProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  const supabase = getSupabaseClient();

  useEffect(() => {
    if (supabase && projectId) {
      loadMembers();
    }
  }, [supabase, projectId]);

  const loadMembers = async () => {
    if (!supabase) return;

    setLoading(true);
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        setLoading(false);
        return;
      }

      // Get members with user email from auth.users
      const { data: membersData, error } = await supabase
        .from('members')
        .select(`
          id,
          user_id,
          role,
          created_at
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading members:', error);
        toast.error('Failed to load team members');
        return;
      }

      // Fetch user emails from auth.users via API
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id);

        // Call API to get user emails
        const response = await fetch(`/api/projects/${projectSlug}/members/emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userIds }),
        });

        if (response.ok) {
          const { users } = await response.json();
          const membersWithEmails = membersData.map(member => ({
            ...member,
            user_email: users[member.user_id] || 'Unknown'
          }));
          setMembers(membersWithEmails);
        } else {
          setMembers(membersData);
        }
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !supabase) return;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setInviting(true);
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        setInviting(false);
        return;
      }

      const response = await fetch(`/api/projects/${projectSlug}/members/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to invite team member');
        return;
      }

      if (data.type === 'direct') {
        toast.success('Team member added successfully!');
        onShowNotification?.('Team member added successfully!', 'success');
      } else if (data.type === 'invitation') {
        toast.success(`Invitation sent to ${inviteEmail}! They'll receive an email with instructions to join.`);
        onShowNotification?.(`Invitation sent to ${inviteEmail}!`, 'success');
      }

      setInviteEmail('');
      setInviteRole('member');
      loadMembers();
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Failed to invite team member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (member: Member) => {
    if (!supabase || !member) return;

    setRemovingMemberId(member.id);
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        setRemovingMemberId(null);
        return;
      }

      const response = await fetch(`/api/projects/${projectSlug}/members/${member.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to remove team member');
        return;
      }

      toast.success('Team member removed successfully');
      onShowNotification?.('Team member removed successfully', 'success');
      setMemberToRemove(null);
      loadMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove team member');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:w-auto">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Team Members
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage who has access to this project
          </p>
        </div>
        <Badge variant="outline" className="text-sm self-start sm:self-auto">
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </Badge>
      </div>

      {/* Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Team Member
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(value: 'member' | 'admin') => setInviteRole(value)}
                disabled={inviting}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Member
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Admin
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleInvite}
            disabled={!inviteEmail || inviting}
            className="w-full md:w-auto"
          >
            {inviting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Inviting...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-900 dark:text-blue-300">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            If the user has an account, they'll be added immediately. Otherwise, they'll receive an invitation email.
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
              <p>No team members yet</p>
              <p className="text-sm mt-1">Invite your first team member above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-gray-200 dark:border-slate-600 rounded-lg hover:border-gray-300 dark:hover:border-slate-500 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {(member.user_email || 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.user_email || 'Unknown User'}
                        </p>
                        {member.user_id === currentUserId && (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
                        Added {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <Badge
                      variant="outline"
                      className={`${getRoleBadgeColor(member.role)} border`}
                    >
                      <span className="flex items-center gap-1">
                        {getRoleIcon(member.role)}
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                    </Badge>
                    {member.role !== 'owner' && member.user_id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMemberToRemove(member)}
                        disabled={removingMemberId === member.id}
                      >
                        {removingMemberId === member.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-600" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card className="bg-gray-50 dark:bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-lg">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Crown className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Owner</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Full access to project settings, billing, and team management. Cannot be removed.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Admin</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Can manage project settings, view analytics, and moderate content.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Member</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Can view project content and respond to feedback.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Remove Member Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{memberToRemove?.user_email}</strong> from this project?
              They will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && handleRemove(memberToRemove)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
