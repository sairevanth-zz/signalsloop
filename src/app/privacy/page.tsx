import React from 'react';
import { MetaHead } from '@/components/seo/meta-head';
import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <>
      <MetaHead
        title="Privacy Policy - SignalsLoop"
        description="SignalsLoop's privacy policy explaining how we collect, use, and protect your data."
        noIndex={true}
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
              ← Back to SignalsLoop
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
                <strong>Last Updated:</strong> December 5, 2024
              </p>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  SignalsLoop ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
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
                  <li>All data transmitted over HTTPS/TLS 1.3 encryption</li>
                  <li>AES-256 encryption for sensitive data at rest</li>
                  <li>Database access restricted with Row Level Security (RLS)</li>
                  <li>Regular security updates, monitoring, and vulnerability scanning</li>
                  <li>No storage of payment card information (handled by Stripe PCI-DSS)</li>
                  <li>Multi-factor authentication available for accounts</li>
                  <li>Audit logging of security-relevant events</li>
                  <li>Daily automated backups with 30-day retention</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We retain your information only as long as necessary for the purposes outlined in this policy:
                </p>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li><strong>Account Data:</strong> Retained while your account is active, deleted within 30 days of account deletion</li>
                  <li><strong>Feedback Data:</strong> Retained for the lifetime of the project unless deleted by you</li>
                  <li><strong>Audit Logs:</strong> Retained for 2 years for compliance and security purposes</li>
                  <li><strong>Security Logs:</strong> Retained for 1 year</li>
                  <li><strong>Analytics Data:</strong> Retained for 90 days (anonymized)</li>
                  <li><strong>Backups:</strong> Retained for 30 days</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Sub-Processors</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We use the following third-party service providers to process your data:
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-gray-700 mb-4">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-semibold">Provider</th>
                        <th className="text-left py-2 pr-4 font-semibold">Purpose</th>
                        <th className="text-left py-2 font-semibold">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 pr-4">Supabase</td>
                        <td className="py-2 pr-4">Database & Authentication</td>
                        <td className="py-2">USA</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4">Vercel</td>
                        <td className="py-2 pr-4">Hosting & CDN</td>
                        <td className="py-2">USA/Global</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4">Stripe</td>
                        <td className="py-2 pr-4">Payment Processing</td>
                        <td className="py-2">USA</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4">OpenAI</td>
                        <td className="py-2 pr-4">AI Analysis</td>
                        <td className="py-2">USA</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4">Cloudflare R2</td>
                        <td className="py-2 pr-4">File Storage & Backups</td>
                        <td className="py-2">USA/Global</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 pr-4">PostHog</td>
                        <td className="py-2 pr-4">Analytics</td>
                        <td className="py-2">USA/EU</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4">Resend</td>
                        <td className="py-2 pr-4">Transactional Email</td>
                        <td className="py-2">USA</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Your Rights</h2>
                <p className="text-gray-700 leading-relaxed mb-4">You have the right to:</p>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>Access, update, or delete your account information</li>
                  <li>Export your feedback data in standard formats</li>
                  <li>Request deletion of your account and associated data</li>
                  <li>Opt out of non-essential communications</li>
                  <li>Lodge a complaint with a data protection authority</li>
                  <li>Contact us with privacy concerns</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mb-4">
                  <strong>For GDPR/CCPA requests:</strong> Email privacy@signalsloop.com with your request. 
                  We will respond within 30 days.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Data Breach Notification</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  In the event of a data breach that affects your personal information, we will:
                </p>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>Notify affected users within 72 hours of discovery</li>
                  <li>Notify relevant data protection authorities as required by law</li>
                  <li>Provide details about the nature of the breach and data affected</li>
                  <li>Describe the measures taken to address the breach</li>
                  <li>Provide recommendations for protecting yourself</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Cookies and Tracking</h2>
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
                <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Children's Privacy</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Our service is not intended for children under 13 years of age. We do not knowingly 
                  collect personal information from children under 13.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">12. International Users</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Your information may be transferred to and processed in the United States. By using our 
                  service, you consent to this transfer. We ensure appropriate safeguards are in place for 
                  international data transfers.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Changes to This Policy</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We may update this Privacy Policy from time to time. We will notify you of any material 
                  changes by email and by updating the "Last Updated" date. Continued use of the service 
                  after changes constitutes acceptance of the updated policy.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">14. Contact Us</h2>
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
