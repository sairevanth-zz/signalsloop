import React from 'react';
import { MetaHead } from '@/components/seo/meta-head';
import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <>
      <MetaHead
        title="Privacy Policy - SignalSloop"
        description="SignalSloop's privacy policy explaining how we collect, use, and protect your data."
        noIndex={true}
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
              ← Back to SignalSloop
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
            
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-600 mb-8">
                <strong>Effective Date:</strong> January 1, 2025<br />
                <strong>Last Updated:</strong> January 1, 2025
              </p>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  SignalSloop ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
                  explains how we collect, use, disclose, and safeguard your information when you use our 
                  feedback management service at signalsloop.com.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
                
                <h3 className="text-lg font-medium text-gray-900 mb-3">Account Information</h3>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>Email address (for account creation and login)</li>
                  <li>Project names and settings you configure</li>
                  <li>Billing information (processed securely through Stripe)</li>
                </ul>

                <h3 className="text-lg font-medium text-gray-900 mb-3">Feedback Data</h3>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>Feedback posts, comments, and votes you submit</li>
                  <li>Optional email addresses provided with feedback</li>
                  <li>Status changes and moderation actions</li>
                </ul>

                <h3 className="text-lg font-medium text-gray-900 mb-3">Usage Information</h3>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>Pages visited and features used</li>
                  <li>Browser type, device information, and IP address</li>
                  <li>Analytics data through PostHog (anonymized)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>Provide and maintain our feedback management service</li>
                  <li>Send transactional emails (login links, status updates)</li>
                  <li>Process payments and manage subscriptions</li>
                  <li>Improve our service and develop new features</li>
                  <li>Prevent fraud and ensure security</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Information Sharing</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We do not sell, trade, or rent your personal information. We only share information in these situations:
                </p>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li><strong>Public Feedback:</strong> Posts on public boards are visible to anyone with the link</li>
                  <li><strong>Service Providers:</strong> Stripe (payments), Supabase (database), Vercel (hosting)</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                  <li><strong>Business Transfer:</strong> In connection with a merger, sale, or asset transfer</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We implement appropriate technical and organizational measures to protect your information:
                </p>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>All data transmitted over HTTPS encryption</li>
                  <li>Database access restricted to authorized personnel only</li>
                  <li>Regular security updates and monitoring</li>
                  <li>No storage of payment card information (handled by Stripe)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Your Rights</h2>
                <p className="text-gray-700 leading-relaxed mb-4">You have the right to:</p>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>Access, update, or delete your account information</li>
                  <li>Export your feedback data</li>
                  <li>Request deletion of your account and associated data</li>
                  <li>Opt out of non-essential communications</li>
                  <li>Contact us with privacy concerns</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Cookies and Tracking</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We use cookies and similar technologies to:
                </p>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>Keep you logged in to your account</li>
                  <li>Remember your preferences</li>
                  <li>Analyze usage patterns (via PostHog)</li>
                  <li>Prevent duplicate voting</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Children's Privacy</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Our service is not intended for children under 13 years of age. We do not knowingly 
                  collect personal information from children under 13.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">9. International Users</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Your information may be transferred to and processed in the United States. By using our 
                  service, you consent to this transfer.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Changes to This Policy</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We may update this Privacy Policy from time to time. We will notify you of any material 
                  changes by email and by updating the "Last Updated" date.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Contact Us</h2>
                <p className="text-gray-700 leading-relaxed">
                  If you have questions about this Privacy Policy, please contact us at:
                  <br />
                  <strong>Email:</strong> privacy@signalsloop.com
                  <br />
                  <strong>Address:</strong> [Your Business Address]
                </p>
              </section>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
