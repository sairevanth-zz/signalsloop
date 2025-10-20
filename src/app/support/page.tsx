'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Clock,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Settings as SettingsIcon,
  CreditCard,
  Layout,
  Code,
  Zap,
  Bell,
  Globe,
  Shield
} from 'lucide-react';
import GlobalBanner from '@/components/GlobalBanner';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Global Banner */}
      <GlobalBanner showBackButton={true} backUrl="/" backLabel="Back to Home" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-8 mb-6 transform transition-all duration-300 hover:shadow-xl animate-bounce-in">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <h1 className="text-4xl font-bold animate-fade-in">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Support Center
                  </span>
                </h1>
              </div>
              <p className="text-gray-600 text-lg animate-fade-in-delay max-w-2xl mx-auto">
                Get help with SignalsLoop. We're here to assist you with any questions or issues you may have.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Methods */}
        <div className="max-w-2xl mx-auto mb-8">
          {/* Email Support */}
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg transform transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl font-semibold">Email Support</CardTitle>
              <CardDescription>
                Send us an email and we'll get back to you within 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center gap-2">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <span className="font-mono text-lg font-semibold text-gray-900">
                    support@signalsloop.com
                  </span>
                </div>
              </div>
              <Button
                asChild
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <a href="mailto:support@signalsloop.com?subject=Support Request">
                  Send Email
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Support Information */}
        <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-3xl mx-auto">
          {/* Response Time */}
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
            <CardContent className="p-6 text-center">
              <Clock className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Response Time</h3>
              <p className="text-sm text-gray-600">
                Within 24 hours
              </p>
            </CardContent>
          </Card>

          {/* Support Level */}
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Support Level</h3>
              <p className="text-sm text-gray-600">
                All Plans<br />
                Priority for Pro users
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Common Issues */}
        <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Help Center
              </span>
            </CardTitle>
            <CardDescription className="text-center">
              Everything you need to know about SignalsLoop
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Getting Started */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900 text-lg">Getting Started</h4>
                </div>
                <div className="space-y-3 ml-7">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Creating your first feedback board</p>
                    <p className="text-gray-600">Sign up and click "Create Project" from the dashboard. Give your board a name and unique slug (URL). Your board is instantly live and ready to collect feedback.</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Embedding the feedback widget</p>
                    <p className="text-gray-600">Go to Settings → Widget tab, copy the provided JavaScript snippet, and paste it before the closing &lt;/body&gt; tag on your website. The widget will appear automatically.</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Setting up AI categorization</p>
                    <p className="text-gray-600">Enable AI categorization in your board Settings under the General tab. The AI will automatically categorize incoming feedback into relevant categories like Feature Request, Bug Report, Improvement, etc.</p>
                  </div>
                </div>
              </div>

              {/* Board Features */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Layout className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-gray-900 text-lg">Board Features</h4>
                </div>
                <div className="space-y-3 ml-7">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Customizing your board appearance</p>
                    <p className="text-gray-600">In Settings → General, customize your board name, description, colors, and logo. Changes are reflected immediately on your public board.</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Managing feedback posts</p>
                    <p className="text-gray-600">View all feedback in your board dashboard. You can edit, delete, merge similar posts, change categories, and update status (Planned, In Progress, Completed).</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Voting system</p>
                    <p className="text-gray-600">Users can upvote feedback posts they agree with. Posts are sorted by votes by default, helping you prioritize the most requested features.</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Private boards</p>
                    <p className="text-gray-600">Pro plan users can make boards private with password protection or restrict access to specific email domains.</p>
                  </div>
                </div>
              </div>

              {/* Integrations */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-gray-900 text-lg">Integrations & Notifications</h4>
                </div>
                <div className="space-y-3 ml-7">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Email notifications</p>
                    <p className="text-gray-600">Configure email recipients in Settings → Notifications. Get notified when new feedback is submitted, when posts receive votes, or when comments are added.</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Slack integration</p>
                    <p className="text-gray-600">Connect your Slack workspace in Settings → Integrations. Choose which channel receives feedback notifications and customize the notification format.</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Discord integration</p>
                    <p className="text-gray-600">Link your Discord server in Settings → Integrations. Select a channel and get real-time feedback updates with rich embeds.</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Webhooks</p>
                    <p className="text-gray-600">Set up webhooks in Settings → Integrations to send feedback data to any external service. Receive JSON payloads for new posts, votes, comments, and status changes.</p>
                  </div>
                </div>
              </div>

              {/* Advanced Features */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <SettingsIcon className="w-5 h-5 text-orange-600" />
                  <h4 className="font-semibold text-gray-900 text-lg">Advanced Features</h4>
                </div>
                <div className="space-y-3 ml-7">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">API access</p>
                    <p className="text-gray-600">Generate API keys in Settings → API Keys. Use our REST API to programmatically create, read, update, and delete feedback posts. View API documentation for endpoints and examples.</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Custom domains (Pro)</p>
                    <p className="text-gray-600">Add your custom domain in Settings → Custom Domain. Configure DNS records as shown, and your feedback board will be accessible at your own domain (e.g., feedback.yoursite.com).</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">CSV import/export</p>
                    <p className="text-gray-600">Import existing feedback from CSV files in Settings → Import. Export all your feedback data to CSV from Settings → Export for backup or migration.</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Changelog & Roadmap</p>
                    <p className="text-gray-600">Create public changelogs to announce new features and updates. Build a roadmap to show users what's coming next. Both are accessible from your board navigation.</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">AI Insights (Pro)</p>
                    <p className="text-gray-600">Access AI-powered analytics in your board dashboard. Get sentiment analysis, trending topics, and smart insights from your feedback data.</p>
                  </div>
                </div>
              </div>

              {/* Account & Billing */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-semibold text-gray-900 text-lg">Account & Billing</h4>
                </div>
                <div className="space-y-3 ml-7">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Upgrading to Pro plan</p>
                    <p className="text-gray-600">Click "Upgrade to Pro" from your dashboard or board settings. Pro includes unlimited boards, AI insights, custom domains, priority support, and advanced features. Billed monthly or annually (save 20%).</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Managing your subscription</p>
                    <p className="text-gray-600">Access your subscription in Settings → Billing. View your current plan, payment method, billing history, and upcoming invoice. Update payment details anytime.</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Canceling or changing plans</p>
                    <p className="text-gray-600">Cancel your subscription anytime from Settings → Billing. You'll retain Pro features until the end of your billing period. Downgrade to Free plan or reactivate anytime without losing data.</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Free plan limits</p>
                    <p className="text-gray-600">Free plan includes 1 board, up to 100 feedback posts, basic email notifications, and standard support. Upgrade to Pro for unlimited boards and posts.</p>
                  </div>
                </div>
              </div>

              {/* Troubleshooting */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-red-600" />
                  <h4 className="font-semibold text-gray-900 text-lg">Troubleshooting</h4>
                </div>
                <div className="space-y-3 ml-7">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Widget not showing on website</p>
                    <p className="text-gray-600">Verify the widget script is placed before &lt;/body&gt;. Check browser console for errors. Ensure there are no ad blockers interfering. Try clearing cache and hard refresh (Ctrl+Shift+R).</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Not receiving email notifications</p>
                    <p className="text-gray-600">Check spam/junk folder. Verify notification recipients are configured in Settings → Notifications. Ensure notification types are enabled. Contact support if emails still don't arrive.</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Custom domain not working</p>
                    <p className="text-gray-600">DNS changes can take up to 48 hours to propagate. Verify CNAME record points to signalsloop.com. Check domain status in Settings → Custom Domain. Contact support if issues persist after 48 hours.</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">API authentication errors</p>
                    <p className="text-gray-600">Ensure you're including the API key in the Authorization header as "Bearer YOUR_API_KEY". Verify the API key is active in Settings → API Keys. Check API documentation for correct endpoint format.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Still Need Help */}
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
              <div className="text-center">
                <Mail className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <h5 className="font-semibold text-gray-900 mb-2">Still need help?</h5>
                <p className="text-sm text-gray-600 mb-4">
                  Can't find what you're looking for? We're here to help!
                </p>
                <Button
                  asChild
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <a href="mailto:support@signalsloop.com?subject=Support Request">
                    Contact Support
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Button 
            asChild
            variant="outline"
            className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90"
          >
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Homepage
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
