'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Share2,
  Copy,
  QrCode,
  Link,
  Users,
  MessageSquare,
  Smartphone,
  Mail,
  MessageCircle,
  Check,
  ExternalLink
} from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';

interface BoardShareProps {
  projectSlug: string;
  projectName: string;
  boardUrl: string;
  isPublic?: boolean;
}

export default function BoardShare({
  projectSlug,
  projectName,
  boardUrl,
  isPublic = true
}: BoardShareProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('link');

  // Generate QR code
  useEffect(() => {
    const generateQR = async () => {
      try {
        const qrDataUrl = await QRCode.toDataURL(boardUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: '#1f2937',
            light: '#ffffff'
          }
        });
        setQrCodeDataUrl(qrDataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    generateQR();
  }, [boardUrl]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const shareText = `Check out our ${projectName} feedback board! Share your ideas and vote on features: ${boardUrl}`;

  const emailSubject = `Feedback Request: ${projectName}`;
  const emailBody = `Hi there!

I'd love to get your feedback on ${projectName}. I've set up a feedback board where you can:

• Share your ideas and suggestions
• Vote on features you'd like to see
• See what others are requesting
• Track our progress on your requests

Please take a moment to visit the board and share your thoughts:

${boardUrl}

Thank you for helping us improve!

Best regards`;

  const socialMediaText = `🚀 Check out our ${projectName} feedback board! Share your ideas and vote on features that matter to you. Your voice counts! ${boardUrl}`;

  return (
    <div className="w-full bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <Share2 className="w-5 h-5 mr-2 text-blue-600" />
            Share {projectName} Board
          </h3>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Share your feedback board with team members and customers
          </p>
        </div>
        {isPublic && (
          <Badge variant="outline" className="w-fit bg-green-50 text-green-700 border-green-200">
            <ExternalLink className="w-3 h-3 mr-1" />
            Public
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex gap-1 overflow-x-auto bg-transparent hide-scrollbar sm:inline-grid sm:grid-cols-3 sm:gap-2 pb-2">
          <TabsTrigger
            value="link"
            className="flex flex-1 min-w-[110px] items-center gap-1.5 justify-center whitespace-nowrap text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg px-3 py-2"
          >
            <Link className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Direct Link</span>
            <span className="inline xs:hidden">Link</span>
          </TabsTrigger>
          <TabsTrigger
            value="qr"
            className="flex flex-1 min-w-[110px] items-center gap-1.5 justify-center whitespace-nowrap text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg px-3 py-2"
          >
            <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            QR Code
          </TabsTrigger>
          <TabsTrigger
            value="instructions"
            className="flex flex-1 min-w-[110px] items-center gap-1.5 justify-center whitespace-nowrap text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg px-3 py-2"
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Instructions</span>
            <span className="inline xs:hidden">Info</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="link" className="mt-4 sm:mt-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="board-url" className="text-sm font-medium text-gray-700">
                Board URL
              </Label>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  id="board-url"
                  value={boardUrl}
                  readOnly
                  className="w-full font-mono text-xs sm:text-sm"
                />
                <Button
                  onClick={() => copyToClipboard(boardUrl, 'Board URL')}
                  variant={copied ? "default" : "outline"}
                  className={`${copied ? 'bg-green-600 hover:bg-green-700' : ''} w-full sm:w-auto whitespace-nowrap`}
                >
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  <span className="text-sm">{copied ? 'Copied!' : 'Copy'}</span>
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <h4 className="font-medium text-blue-900 mb-3 text-sm sm:text-base">Quick Share Options</h4>
              <div className="grid grid-cols-1 gap-2 sm:gap-3">
                <Button
                  onClick={() => copyToClipboard(shareText, 'Share text')}
                  variant="outline"
                  className="justify-start border-blue-300 text-blue-700 hover:bg-blue-50 text-sm w-full"
                >
                  <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Copy Share Text</span>
                </Button>
                <Button
                  onClick={() => copyToClipboard(socialMediaText, 'Social media text')}
                  variant="outline"
                  className="justify-start border-blue-300 text-blue-700 hover:bg-blue-50 text-sm w-full"
                >
                  <MessageCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Social Media Text</span>
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="qr" className="mt-4 sm:mt-6">
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <h4 className="font-medium text-gray-900 mb-4 text-sm sm:text-base">QR Code for Mobile Sharing</h4>
              {qrCodeDataUrl ? (
                <div className="inline-block p-3 sm:p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code for board"
                    className="w-40 h-40 sm:w-48 sm:h-48 mx-auto"
                  />
                </div>
              ) : (
                <div className="w-40 h-40 sm:w-48 sm:h-48 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                  <QrCode className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <p className="text-xs sm:text-sm text-gray-500 mt-3">
                Scan with your phone camera or QR code app
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
              <h4 className="font-medium text-green-900 mb-2 text-sm sm:text-base">Mobile Sharing Tips</h4>
              <ul className="text-xs sm:text-sm text-green-700 space-y-1">
                <li>• Display QR code on screens during meetings</li>
                <li>• Print QR code on flyers or business cards</li>
                <li>• Include in presentation slides</li>
                <li>• Share via messaging apps</li>
              </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="instructions" className="mt-4 sm:mt-6">
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-base sm:text-lg flex items-center text-blue-900">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    For Team Members
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                  <div className="text-xs sm:text-sm text-blue-800">
                    <p className="font-medium mb-2">Internal Team Sharing:</p>
                    <ul className="space-y-1 text-blue-700">
                      <li>• Share in team Slack/Discord channels</li>
                      <li>• Include in team meetings and standups</li>
                      <li>• Add to project documentation</li>
                      <li>• Pin in team communication tools</li>
                    </ul>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(`Team, please check out our ${projectName} feedback board and share your ideas: ${boardUrl}`, 'Team message')}
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100 w-full text-xs sm:text-sm"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Team Message
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-base sm:text-lg flex items-center text-green-900">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    For Customers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                  <div className="text-xs sm:text-sm text-green-800">
                    <p className="font-medium mb-2">Customer Engagement:</p>
                    <ul className="space-y-1 text-green-700">
                      <li>• Share via email newsletters</li>
                      <li>• Post on social media</li>
                      <li>• Include in support responses</li>
                      <li>• Add to website footer</li>
                    </ul>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(shareText, 'Customer message')}
                    variant="outline"
                    size="sm"
                    className="border-green-300 text-green-700 hover:bg-green-100 w-full text-xs sm:text-sm"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Customer Message
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="bg-gradient-to-r from-teal-50 to-amber-50 border border-teal-200 rounded-lg p-4 sm:p-6">
              <h4 className="font-medium text-teal-900 mb-3 sm:mb-4 flex items-center text-sm sm:text-base">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Email Template
              </h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-teal-800">Subject:</Label>
                  <Input
                    value={emailSubject}
                    readOnly
                    className="font-mono text-xs sm:text-sm mt-1 bg-white/50"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-teal-800">Body:</Label>
                  <textarea
                    value={emailBody}
                    readOnly
                    rows={10}
                    className="w-full mt-1 p-2 sm:p-3 text-xs sm:text-sm font-mono bg-white/50 border border-teal-200 rounded-md resize-none"
                  />
                </div>
                <Button
                  onClick={() => copyToClipboard(emailBody, 'Email template')}
                  variant="outline"
                  className="border-teal-300 text-teal-700 hover:bg-teal-100 w-full text-xs sm:text-sm"
                >
                  <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Copy Email Template
                </Button>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
              <h4 className="font-medium text-yellow-900 mb-2 text-sm sm:text-base">💡 Pro Tips</h4>
              <ul className="text-xs sm:text-sm text-yellow-800 space-y-1">
                <li>• <strong>Regular sharing:</strong> Mention the board in regular updates and newsletters</li>
                <li>• <strong>Response time:</strong> Acknowledge feedback within 24-48 hours</li>
                <li>• <strong>Status updates:</strong> Keep users informed about progress on their suggestions</li>
                <li>• <strong>Incentives:</strong> Consider offering rewards for the most helpful feedback</li>
                <li>• <strong>Analytics:</strong> Track which sharing methods bring the most engagement</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
