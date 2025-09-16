import React from 'react';
import { MetaHead } from '@/components/seo/meta-head';
import Link from 'next/link';

export default function TermsOfService() {
  return (
    <>
      <MetaHead
        title="Terms of Service - SignalLoop"
        description="SignalLoop's terms of service outlining the rules and guidelines for using our feedback management platform."
        noIndex={true}
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
              ← Back to SignalLoop
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
            
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-600 mb-8">
                <strong>Effective Date:</strong> January 1, 2025<br />
                <strong>Last Updated:</strong> January 1, 2025
              </p>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  By accessing or using SignalLoop's feedback management service ("Service"), you agree to be 
                  bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  SignalLoop provides a feedback management platform that allows users to:
                </p>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>Create feedback boards and collect user input</li>
                  <li>Manage and moderate feedback submissions</li>
                  <li>Display public roadmaps and changelogs</li>
                  <li>Embed feedback widgets on websites</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>You must provide accurate and complete information when creating an account</li>
                  <li>You are responsible for maintaining the security of your account</li>
                  <li>You must be at least 13 years old to use the Service</li>
                  <li>One person may not maintain more than one free account</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
                <p className="text-gray-700 leading-relaxed mb-4">You agree not to:</p>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>Use the Service for any unlawful purpose or in violation of any laws</li>
                  <li>Post spam, harassment, or offensive content</li>
                  <li>Attempt to gain unauthorized access to other accounts or systems</li>
                  <li>Interfere with or disrupt the Service or servers</li>
                  <li>Use automated systems to access the Service without permission</li>
                  <li>Violate the intellectual property rights of others</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Pricing and Payment</h2>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>Free accounts have limited features and usage</li>
                  <li>Pro accounts are billed monthly at $19/month</li>
                  <li>All fees are non-refundable unless required by law</li>
                  <li>We may change prices with 30 days advance notice</li>
                  <li>Accounts may be suspended for non-payment</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Content and Data</h2>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>You retain ownership of all content you submit to the Service</li>
                  <li>You grant us a license to host, display, and distribute your content</li>
                  <li>You are responsible for the content you post and its compliance with laws</li>
                  <li>We may remove content that violates these Terms</li>
                  <li>We regularly backup your data but recommend you export it regularly</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Privacy</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Your privacy is important to us. Please review our Privacy Policy to understand how we 
                  collect, use, and protect your information.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Service Availability</h2>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>We strive for 99.9% uptime but do not guarantee uninterrupted service</li>
                  <li>We may temporarily suspend the Service for maintenance</li>
                  <li>We are not liable for any downtime or service interruptions</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Termination</h2>
                <ul className="list-disc pl-6 mb-4 text-gray-700">
                  <li>You may cancel your account at any time</li>
                  <li>We may suspend or terminate accounts that violate these Terms</li>
                  <li>Upon termination, you will lose access to the Service and your data</li>
                  <li>You have 30 days to export your data before permanent deletion</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Limitation of Liability</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, SIGNALLOOP SHALL NOT BE LIABLE FOR ANY 
                  INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT 
                  NOT LIMITED TO LOSS OF PROFITS, DATA, OR USE.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Changes to Terms</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We may modify these Terms at any time. We will notify users of material changes 
                  via email and by posting on our website. Continued use of the Service constitutes 
                  acceptance of the revised Terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Contact Information</h2>
                <p className="text-gray-700 leading-relaxed">
                  Questions about these Terms should be sent to:
                  <br />
                  <strong>Email:</strong> legal@signalloop.com
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
