'use client';

import React, { useState } from 'react';
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
  Shield,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import GlobalBanner from '@/components/GlobalBanner';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  items: {
    question: string;
    answer: string;
  }[];
}

export default function SupportPage() {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const helpSections: HelpSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <HelpCircle className="w-5 h-5" />,
      iconColor: 'text-blue-600',
      items: [
        {
          question: 'Creating your first feedback board',
          answer: 'Sign up and click "Create Project" from the dashboard. Give your board a name and unique slug (URL). Your board is instantly live and ready to collect feedback.'
        },
        {
          question: 'Embedding the feedback widget',
          answer: 'Go to Settings → Widget tab, copy the provided JavaScript snippet, and paste it before the closing </body> tag on your website. The widget will appear automatically.'
        },
        {
          question: 'Setting up AI categorization',
          answer: 'Enable AI categorization in your board Settings under the General tab. The AI will automatically categorize incoming feedback into relevant categories like Feature Request, Bug Report, Improvement, etc.'
        }
      ]
    },
    {
      id: 'board-features',
      title: 'Board Features',
      icon: <Layout className="w-5 h-5" />,
      iconColor: 'text-purple-600',
      items: [
        {
          question: 'Customizing your board appearance',
          answer: 'In Settings → General, customize your board name, description, colors, and logo. Changes are reflected immediately on your public board.'
        },
        {
          question: 'Managing feedback posts',
          answer: 'View all feedback in your board dashboard. You can edit, delete, merge similar posts, change categories, and update status (Planned, In Progress, Completed).'
        },
        {
          question: 'Voting system',
          answer: 'Users can upvote feedback posts they agree with. Posts are sorted by votes by default, helping you prioritize the most requested features.'
        },
        {
          question: 'Private boards',
          answer: 'Pro plan users can make boards private with password protection or restrict access to specific email domains.'
        }
      ]
    },
    {
      id: 'integrations',
      title: 'Integrations & Notifications',
      icon: <Zap className="w-5 h-5" />,
      iconColor: 'text-green-600',
      items: [
        {
          question: 'Email notifications',
          answer: 'Configure email recipients in Settings → Notifications. Get notified when new feedback is submitted, when posts receive votes, or when comments are added.'
        },
        {
          question: 'Slack integration',
          answer: 'Connect your Slack workspace in Settings → Integrations. Choose which channel receives feedback notifications and customize the notification format.'
        },
        {
          question: 'Discord integration',
          answer: 'Link your Discord server in Settings → Integrations. Select a channel and get real-time feedback updates with rich embeds.'
        },
        {
          question: 'Webhooks',
          answer: 'Set up webhooks in Settings → Integrations to send feedback data to any external service. Receive JSON payloads for new posts, votes, comments, and status changes.'
        }
      ]
    },
    {
      id: 'advanced-features',
      title: 'Advanced Features',
      icon: <SettingsIcon className="w-5 h-5" />,
      iconColor: 'text-orange-600',
      items: [
        {
          question: 'API access',
          answer: 'Generate API keys in Settings → API Keys. Use our REST API to programmatically create, read, update, and delete feedback posts. View API documentation for endpoints and examples.'
        },
        {
          question: 'Custom domains (Pro)',
          answer: 'Add your custom domain in Settings → Custom Domain. Configure DNS records as shown, and your feedback board will be accessible at your own domain (e.g., feedback.yoursite.com).'
        },
        {
          question: 'CSV import/export',
          answer: 'Import existing feedback from CSV files in Settings → Import. Export all your feedback data to CSV from Settings → Export for backup or migration.'
        },
        {
          question: 'Changelog & Roadmap',
          answer: 'Create public changelogs to announce new features and updates. Build a roadmap to show users what's coming next. Both are accessible from your board navigation.'
        },
        {
          question: 'AI Insights (Pro)',
          answer: 'Access AI-powered analytics in your board dashboard. Get sentiment analysis, trending topics, and smart insights from your feedback data.'
        }
      ]
    },
    {
      id: 'account-billing',
      title: 'Account & Billing',
      icon: <CreditCard className="w-5 h-5" />,
      iconColor: 'text-indigo-600',
      items: [
        {
          question: 'Upgrading to Pro plan',
          answer: 'Click "Upgrade to Pro" from your dashboard or board settings. Pro includes unlimited boards, AI insights, custom domains, priority support, and advanced features. Billed monthly or annually (save 20%).'
        },
        {
          question: 'Managing your subscription',
          answer: 'Access your subscription in Settings → Billing. View your current plan, payment method, billing history, and upcoming invoice. Update payment details anytime.'
        },
        {
          question: 'Canceling or changing plans',
          answer: 'Cancel your subscription anytime from Settings → Billing. You'll retain Pro features until the end of your billing period. Downgrade to Free plan or reactivate anytime without losing data.'
        },
        {
          question: 'Free plan limits',
          answer: 'Free plan includes 1 board, up to 100 feedback posts, basic email notifications, and standard support. Upgrade to Pro for unlimited boards and posts.'
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: <Shield className="w-5 h-5" />,
      iconColor: 'text-red-600',
      items: [
        {
          question: 'Widget not showing on website',
          answer: 'Verify the widget script is placed before </body>. Check browser console for errors. Ensure there are no ad blockers interfering. Try clearing cache and hard refresh (Ctrl+Shift+R).'
        },
        {
          question: 'Not receiving email notifications',
          answer: 'Check spam/junk folder. Verify notification recipients are configured in Settings → Notifications. Ensure notification types are enabled. Contact support if emails still don\'t arrive.'
        },
        {
          question: 'Custom domain not working',
          answer: 'DNS changes can take up to 48 hours to propagate. Verify CNAME record points to signalsloop.com. Check domain status in Settings → Custom Domain. Contact support if issues persist after 48 hours.'
        },
        {
          question: 'API authentication errors',
          answer: 'Ensure you\'re including the API key in the Authorization header as "Bearer YOUR_API_KEY". Verify the API key is active in Settings → API Keys. Check API documentation for correct endpoint format.'
        }
      ]
    }
  ];

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
            <div className="space-y-4">
              {helpSections.map((section) => (
                <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Section Header - Clickable */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={section.iconColor}>
                        {section.icon}
                      </div>
                      <h4 className="font-semibold text-gray-900 text-lg text-left">{section.title}</h4>
                    </div>
                    {expandedSections[section.id] ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}
                  </button>

                  {/* Section Content - Expandable */}
                  {expandedSections[section.id] && (
                    <div className="p-4 space-y-2 bg-white">
                      {section.items.map((item, index) => {
                        const itemId = `${section.id}-${index}`;
                        return (
                          <div key={itemId} className="border-b border-gray-100 last:border-b-0 pb-2 last:pb-0">
                            {/* Question - Clickable */}
                            <button
                              onClick={() => toggleItem(itemId)}
                              className="w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 px-2 rounded transition-colors"
                            >
                              <p className="font-medium text-gray-900 text-sm">{item.question}</p>
                              {expandedItems[itemId] ? (
                                <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0 ml-2" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0 ml-2" />
                              )}
                            </button>

                            {/* Answer - Expandable */}
                            {expandedItems[itemId] && (
                              <div className="pl-2 pr-2 pb-2 pt-1">
                                <p className="text-gray-600 text-sm">{item.answer}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
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
