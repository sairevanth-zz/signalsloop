/**
 * SignalsLoop Visual Editor Extension
 * Content Script v1.0.2 - Runs on SignalsLoop pages
 */

// Wait for document to be ready before initializing
const init = () => {
    console.log('[SignalsLoop] Content script initializing...');

    // Notify the page that the extension is installed
    window.postMessage({
        type: 'SIGNALSLOOP_EXTENSION_INSTALLED',
        version: '1.0.2'
    }, '*');

    // Listen for messages from the page
    window.addEventListener('message', (event) => {
        if (event.source !== window) return;

        const { type, data } = event.data || {};

        if (type === 'CHECK_EXTENSION') {
            window.postMessage({
                type: 'SIGNALSLOOP_EXTENSION_STATUS',
                installed: true,
                version: '1.0.2'
            }, '*');
        }

        // Handle request to inject editor script into iframe
        if (type === 'SL_REQUEST_INJECT') {
            console.log('[SignalsLoop] Requesting iframe injection for:', data?.url);

            chrome.runtime.sendMessage({
                type: 'INJECT_INTO_IFRAME',
                tabId: null, // Will use sender's tab
                url: data?.url
            }, (response) => {
                console.log('[SignalsLoop] Injection response:', response);
                window.postMessage({
                    type: 'SL_INJECT_RESPONSE',
                    success: response?.success,
                    error: response?.error
                }, '*');
            });
        }
    });

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'EXTENSION_READY') {
            window.postMessage({
                type: 'SIGNALSLOOP_EXTENSION_INSTALLED',
                version: '1.0.2'
            }, '*');
        }
        return false;
    });

    console.log('[SignalsLoop] Visual Editor extension v1.0.2 active');
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
