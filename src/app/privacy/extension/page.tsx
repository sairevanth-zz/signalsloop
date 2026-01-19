import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Visual Editor Extension Privacy Policy | SignalsLoop',
    description: 'Privacy policy for the SignalsLoop Visual Editor Chrome extension',
};

export default function ExtensionPrivacyPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
            <div className="max-w-3xl mx-auto px-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
                    <h1 className="text-3xl font-bold mb-2">
                        SignalsLoop Visual Editor Extension
                    </h1>
                    <h2 className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                        Privacy Policy
                    </h2>

                    <p className="text-sm text-gray-500 mb-8">
                        Last updated: January 19, 2026
                    </p>

                    <div className="prose dark:prose-invert max-w-none">
                        <section className="mb-8">
                            <h3 className="text-lg font-semibold mb-3">What We Collect</h3>
                            <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">
                                Nothing.
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                This extension does not collect, store, or transmit any personal data.
                                All processing happens locally in your browser.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h3 className="text-lg font-semibold mb-3">How the Extension Works</h3>
                            <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-400">
                                <li>
                                    Modifies HTTP response headers to allow websites to load in iframes
                                    within the SignalsLoop Visual Editor
                                </li>
                                <li>
                                    Only active when you are using the SignalsLoop Visual Editor feature
                                </li>
                                <li>
                                    All processing happens entirely in your browser - no external servers
                                </li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h3 className="text-lg font-semibold mb-3">Permissions Explained</h3>
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                                <div>
                                    <code className="text-sm bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                                        declarativeNetRequest
                                    </code>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                                        Required to remove X-Frame-Options and CSP headers so websites can
                                        load in the Visual Editor iframe.
                                    </p>
                                </div>
                                <div>
                                    <code className="text-sm bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                                        host_permissions: &lt;all_urls&gt;
                                    </code>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                                        Required to modify headers for any website you choose to test in
                                        the Visual Editor.
                                    </p>
                                </div>
                                <div>
                                    <code className="text-sm bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                                        storage
                                    </code>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                                        Saves your extension toggle preference (on/off) locally.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="mb-8">
                            <h3 className="text-lg font-semibold mb-3">Data Security</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                No data leaves your browser. This extension contains no analytics,
                                tracking, telemetry, or data collection of any kind. We cannot see
                                which websites you test or what changes you make.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h3 className="text-lg font-semibold mb-3">Third-Party Services</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                This extension does not use any third-party services, analytics,
                                or external APIs.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h3 className="text-lg font-semibold mb-3">Changes to This Policy</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                If we ever make changes to this privacy policy, we will update
                                the "Last updated" date above.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h3 className="text-lg font-semibold mb-3">Contact</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                If you have any questions about this privacy policy, please contact us at:{' '}
                                <a
                                    href="mailto:support@signalsloop.com"
                                    className="text-purple-600 hover:underline"
                                >
                                    support@signalsloop.com
                                </a>
                            </p>
                        </section>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <a
                            href="/"
                            className="text-purple-600 hover:underline text-sm"
                        >
                            ← Back to SignalsLoop
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
