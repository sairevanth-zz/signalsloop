/**
 * SignalsLoop Visual Editor Extension
 * Content Script - Runs on SignalsLoop pages
 */

// Wait for document to be ready before initializing
const init = () => {
    // Notify the page that the extension is installed
    window.postMessage({
        type: 'SIGNALSLOOP_EXTENSION_INSTALLED',
        version: '1.0.1'
    }, '*');

    // Listen for messages from the page
    window.addEventListener('message', (event) => {
        if (event.source !== window) return;

        if (event.data?.type === 'CHECK_EXTENSION') {
            window.postMessage({
                type: 'SIGNALSLOOP_EXTENSION_STATUS',
                installed: true,
                version: '1.0.1'
            }, '*');
        }

        // Handle request to inject editor script into iframe
        if (event.data?.type === 'INJECT_EDITOR_SCRIPT') {
            // Get all iframes on the page
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach((iframe, index) => {
                try {
                    // Request background to inject script
                    chrome.runtime.sendMessage({
                        type: 'INJECT_EDITOR',
                        frameId: index
                    });
                } catch (e) {
                    console.error('[SignalsLoop] Failed to request script injection:', e);
                }
            });
        }
    });

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'EXTENSION_READY') {
            window.postMessage({
                type: 'SIGNALSLOOP_EXTENSION_INSTALLED',
                version: '1.0.1'
            }, '*');
        }
        return false;
    });

    // Auto-inject editor script into iframes when they load
    if (document.body) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeName === 'IFRAME') {
                        const iframe = node;
                        iframe.addEventListener('load', () => {
                            // Give iframe time to settle
                            setTimeout(() => {
                                try {
                                    // Try to inject via postMessage first (for same-origin)
                                    iframe.contentWindow?.postMessage({ type: 'SL_INIT_EDITOR' }, '*');
                                } catch (e) {
                                    // Cross-origin, extension will need to inject
                                    console.log('[SignalsLoop] Iframe is cross-origin, extension will inject');
                                }
                            }, 500);
                        });
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    console.log('[SignalsLoop] Visual Editor extension v1.0.1 active');
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
