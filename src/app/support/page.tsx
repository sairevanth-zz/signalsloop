'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Phone, 
  MessageSquare, 
  Clock, 
  ArrowLeft,
  CheckCircle
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
        <div className="grid md:grid-cols-2 gap-6 mb-8">
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
                    signalsloop@gmail.com
                  </span>
                </div>
              </div>
              <Button 
                asChild
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <a href="mailto:signalsloop@gmail.com?subject=Support Request">
                  Send Email
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Phone Support */}
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg transform transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl font-semibold">Phone Support</CardTitle>
              <CardDescription>
                Call us directly for immediate assistance
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center gap-2">
                  <Phone className="w-5 h-5 text-gray-600" />
                  <span className="font-mono text-lg font-semibold text-gray-900">
                    (607) 654-8911
                  </span>
                </div>
              </div>
              <Button 
                asChild
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                <a href="tel:+16076548911">
                  Call Now
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Support Information */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Response Time */}
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
            <CardContent className="p-6 text-center">
              <Clock className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Response Time</h3>
              <p className="text-sm text-gray-600">
                Email: Within 24 hours<br />
                Phone: Immediate
              </p>
            </CardContent>
          </Card>

          {/* Availability */}
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
            <CardContent className="p-6 text-center">
              <MessageSquare className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Availability</h3>
              <p className="text-sm text-gray-600">
                Monday - Friday<br />
                9:00 AM - 6:00 PM EST
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
                Common Issues
              </span>
            </CardTitle>
            <CardDescription className="text-center">
              Quick solutions to frequently asked questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Getting Started</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• How to create your first feedback board</li>
                  <li>• Setting up AI categorization</li>
                  <li>• Customizing your board appearance</li>
                  <li>• Embedding widgets on your website</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Account & Billing</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Upgrading to Pro plan</li>
                  <li>• Managing subscription</li>
                  <li>• Canceling or changing plans</li>
                  <li>• Accessing billing history</li>
                </ul>
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
