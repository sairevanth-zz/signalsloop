'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckCircle, 
  Clock, 
  PlayCircle, 
  XCircle, 
  FileText,
  Mail,
  Send,
  Bell,
  Settings,
  Users,
  Eye,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Post {
  id: string;
  title: string;
  description: string;
  author_email: string;
  status: 'open' | 'planned' | 'in_progress' | 'done' | 'declined';
  votes: number;
  created_at: string;
}

interface StatusChangeEmailTemplate {
  status: Post['status'];
  subject: string;
  message: string;
}

interface AdminStatusChangeProps {
  post: Post;
  onStatusChange: (newStatus: Post['status'], adminNote?: string) => void;
  projectSlug: string;
}

export function AdminStatusChange({ 
  post, 
  onStatusChange,
  projectSlug 
}: AdminStatusChangeProps) {
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Post['status']>(post.status);
  const [adminNote, setAdminNote] = useState('');
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [emailSettings, setEmailSettings] = useState({
    enabled: true,
    customMessage: '',
    includeAdminNote: true
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supabase, setSupabase] = useState<any>(null);

  // Initialize Supabase client safely
  React.useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      setSupabase(client);
    }
  }, []);

  const statusConfig = {
    open: {
      label: 'Open',
      color: 'bg-gray-500',
      icon: <FileText className="h-4 w-4" />,
      description: 'Under review'
    },
    planned: {
      label: 'Planned',
      color: 'bg-blue-500',
      icon: <Clock className="h-4 w-4" />,
      description: 'Scheduled for development'
    },
    in_progress: {
      label: 'In Progress',
      color: 'bg-yellow-500',
      icon: <PlayCircle className="h-4 w-4" />,
      description: 'Currently being worked on'
    },
    done: {
      label: 'Done',
      color: 'bg-green-500',
      icon: <CheckCircle className="h-4 w-4" />,
      description: 'Completed and released'
    },
    declined: {
      label: 'Declined',
      color: 'bg-red-500',
      icon: <XCircle className="h-4 w-4" />,
      description: 'Will not be implemented'
    }
  };

  const emailTemplates: StatusChangeEmailTemplate[] = [
    {
      status: 'planned',
      subject: '🎯 Great news! Your feature request is now planned',
      message: `Hi there!

We're excited to let you know that your feature request "${post.title}" has been added to our development roadmap!

What this means:
• Your idea has been reviewed and approved
• We're planning to work on it in an upcoming release
• You'll get notified when development starts

Thank you for helping us improve ${projectSlug}! Your feedback is invaluable.

View the full roadmap: https://${projectSlug}.com/roadmap`
    },
    {
      status: 'in_progress',
      subject: '🚀 We\'re working on your feature request!',
      message: `Hi there!

Great news! We've started working on your feature request "${post.title}".

Our development team is actively building this feature and we expect to have it ready soon. We'll keep you updated on our progress.

You can track the progress on our public roadmap: https://${projectSlug}.com/roadmap

Thanks for your patience and for making ${projectSlug} better!`
    },
    {
      status: 'done',
      subject: '🎉 Your feature request is now live!',
      message: `Hi there!

Exciting news! Your feature request "${post.title}" has been completed and is now live!

You can start using this feature right away. We hope it meets your expectations and improves your experience with ${projectSlug}.

Check out the latest updates: https://${projectSlug}.com/changelog

Thank you for your valuable feedback - it directly shaped this improvement!`
    },
    {
      status: 'declined',
      subject: 'Update on your feature request',
      message: `Hi there!

Thank you for your feature request "${post.title}". After careful consideration, we've decided not to pursue this feature at this time.

This doesn't mean your idea wasn't valuable - it might not align with our current product direction or technical constraints.

We encourage you to continue sharing your ideas and feedback. Your input helps us build a better product.

You can always submit new suggestions: https://${projectSlug}.com/board`
    }
  ];

  const getEmailTemplate = (status: Post['status']): StatusChangeEmailTemplate | null => {
    return emailTemplates.find(template => template.status === status) || null;
  };

  const handleStatusChange = async () => {
    if (!supabase) {
      toast.error('Database connection not available. Please refresh the page.');
      return;
    }

    if (selectedStatus === post.status) {
      toast.error('Please select a different status');
      return;
    }

    setIsChangingStatus(true);

    try {
      // Update post status
      const { error: updateError } = await supabase
        .from('posts')
        .update({
          status: selectedStatus,
          admin_note: adminNote || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);

      if (updateError) throw updateError;

      // Send email notification if enabled and email exists
      if (sendEmailNotification && post.author_email && emailSettings.enabled) {
        await sendStatusChangeEmail();
      }

      // Log the status change
      await logStatusChange();

      onStatusChange(selectedStatus, adminNote);
      toast.success(`Status changed to ${statusConfig[selectedStatus].label}`);
      
    } catch (error) {
      console.error('Error changing status:', error);
      toast.error('Failed to change status');
    } finally {
      setIsChangingStatus(false);
    }
  };

  const sendStatusChangeEmail = async () => {
    const template = getEmailTemplate(selectedStatus);
    if (!template) return;

    try {
      const emailData = {
        to: post.author_email,
        subject: template.subject,
        html: generateEmailHtml(template),
        text: generateEmailText(template)
      };

      // For now, we'll just log the email data since we don't have the email service set up
      console.log('Email notification:', emailData);
      toast.success('Email notification prepared!');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Status updated but email failed to send');
    }
  };

  const generateEmailHtml = (template: StatusChangeEmailTemplate): string => {
    const postUrl = `https://${projectSlug}.com/post/${post.id}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${template.subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 24px;">${projectSlug}</h1>
            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Product Update</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; padding: 12px 24px; background-color: ${statusConfig[selectedStatus].color}; color: white; border-radius: 25px; font-weight: 500;">
                ${statusConfig[selectedStatus].label}
              </div>
            </div>
            
            <div style="white-space: pre-line; line-height: 1.6; color: #333; margin-bottom: 30px;">
              ${emailSettings.customMessage || template.message}
            </div>
            
            ${adminNote && emailSettings.includeAdminNote ? `
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 30px;">
                <h4 style="margin: 0 0 10px 0; color: #333;">Note from our team:</h4>
                <p style="margin: 0; color: #666; white-space: pre-line;">${adminNote}</p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${postUrl}" style="display: inline-block; background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                View Full Details
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              You're receiving this because you submitted feedback to ${projectSlug}.
            </p>
            <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 12px;">
              <a href="#" style="color: #6c757d;">Unsubscribe</a> from status updates
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const generateEmailText = (template: StatusChangeEmailTemplate): string => {
    return `
${template.subject}

${emailSettings.customMessage || template.message}

${adminNote && emailSettings.includeAdminNote ? `\nNote from our team:\n${adminNote}\n` : ''}

View full details: https://${projectSlug}.com/post/${post.id}

---
You're receiving this because you submitted feedback to ${projectSlug}.
    `.trim();
  };

  const logStatusChange = async () => {
    if (!supabase) return;

    try {
      await supabase
        .from('status_changes')
        .insert({
          post_id: post.id,
          from_status: post.status,
          to_status: selectedStatus,
          admin_note: adminNote || null,
          email_sent: sendEmailNotification && post.author_email && emailSettings.enabled,
          changed_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging status change:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Change Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Current Status</Label>
            <div className="flex items-center gap-2 mt-1">
              <div className={`p-2 rounded-full ${statusConfig[post.status].color} text-white`}>
                {statusConfig[post.status].icon}
              </div>
              <div>
                <div className="font-medium">{statusConfig[post.status].label}</div>
                <div className="text-sm text-muted-foreground">
                  {statusConfig[post.status].description}
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label>New Status</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2 mt-2">
              {Object.entries(statusConfig).map(([status, config]) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status as Post['status'])}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedStatus === status
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`p-1 rounded ${config.color} text-white`}>
                      {config.icon}
                    </div>
                    <span className="font-medium text-sm">{config.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {config.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="adminNote">Admin Note (Optional)</Label>
            <Textarea
              id="adminNote"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Add a note about this status change (visible to user if email is sent)..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Notification Settings */}
      {post.author_email && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendEmail"
                checked={sendEmailNotification}
                onCheckedChange={(checked) => setSendEmailNotification(checked === true)}
              />
              <Label htmlFor="sendEmail" className="flex items-center gap-2">
                Send email to <Badge variant="outline">{post.author_email}</Badge>
              </Label>
            </div>

            {sendEmailNotification && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeNote"
                    checked={emailSettings.includeAdminNote}
                    onCheckedChange={(checked) => 
                      setEmailSettings({...emailSettings, includeAdminNote: checked === true})
                    }
                  />
                  <Label htmlFor="includeNote">Include admin note in email</Label>
                </div>

                {getEmailTemplate(selectedStatus) && (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Email Preview
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Subject:</span> {getEmailTemplate(selectedStatus)?.subject}
                      </div>
                      <div>
                        <span className="font-medium">Message Preview:</span>
                        <div className="mt-1 p-2 bg-white rounded border text-xs max-h-32 overflow-y-auto">
                          {(() => {
                            const template = getEmailTemplate(selectedStatus);
                            if (!template) return '';
                            const lines = template.message.split('\n');
                            return lines.slice(0, 6).join('\n') + (lines.length > 6 ? '...' : '');
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Email Warning */}
      {!post.author_email && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                No email address provided by the author. Status will be updated without notification.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleStatusChange}
          disabled={isChangingStatus || selectedStatus === post.status}
          className="min-w-[120px]"
        >
          {isChangingStatus ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Updating...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Update Status
            </div>
          )}
        </Button>

        {sendEmailNotification && post.author_email && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Bell className="h-3 w-3" />
            Email will be sent
          </div>
        )}
      </div>

      {/* Recent Status Changes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Created {new Date(post.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span>{post.votes} votes received</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
