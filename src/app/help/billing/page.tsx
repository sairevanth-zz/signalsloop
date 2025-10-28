import Link from 'next/link';

export const metadata = {
  title: 'Billing FAQ – SignalsLoop',
  description: 'Answers to common questions about billing, subscriptions, and Stripe portal access for SignalsLoop customers.',
};

const faqs = [
  {
    question: 'How do I update my payment method or view invoices?',
    answer:
      'Open the Manage Billing button inside SignalsLoop to launch the Stripe customer portal. From there you can update payment methods, download invoices, and review past payments.',
  },
  {
    question: 'Can I switch between monthly and yearly plans?',
    answer:
      'Yes. From the billing dashboard choose the upgrade option (monthly ⇆ yearly). If you have an active subscription, you can also change the plan inside the Stripe portal under “Update subscription”.',
  },
  {
    question: 'How do I cancel my subscription?',
    answer:
      'Use the Manage Billing button to open the Stripe portal and click “Cancel plan”. SignalsLoop will keep Pro features active until the end of the current billing period and then automatically downgrade to the Free plan.',
  },
  {
    question: 'What happens after I cancel?',
    answer:
      'You retain Pro access until the end of the paid term. The billing dashboard will display the exact cancellation date so you know when the downgrade will occur.',
  },
  {
    question: 'Need help with something else?',
    answer:
      'Email us at hello@signalsloop.com and a member of the SignalsLoop team will assist you.
      
You can also explore the in-product Quick Actions or the support site for more tutorials.',
  },
];

export default function BillingHelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-16">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900">Billing FAQ</h1>
          <p className="mt-3 text-lg text-slate-600">
            Answers to common questions about managing your SignalsLoop subscription. For anything not covered here, reach out and we&apos;ll be happy to help.
          </p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">{faq.question}</h2>
              <p className="mt-3 text-slate-600 whitespace-pre-line">{faq.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
          <h2 className="text-xl font-semibold text-indigo-900">Still need help?</h2>
          <p className="mt-3 text-indigo-800">
            Email us at <Link className="font-semibold underline" href="mailto:hello@signalsloop.com">hello@signalsloop.com</Link> and we&apos;ll respond quickly.
          </p>
        </div>
      </div>
    </div>
  );
}
