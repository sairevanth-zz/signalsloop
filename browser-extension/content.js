/**
 * SignalsLoop Visual Editor Extension
 * Content Script - Runs on SignalsLoop pages
 */

// Notify the page that the extension is installed
window.postMessage({
    type: 'SIGNALSLOOP_EXTENSION_INSTALLED',
    version: '1.0.0'
}, '*');

// Listen for messages from the page
window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data.type === 'CHECK_EXTENSION') {
        window.postMessage({
            type: 'SIGNALSLOOP_EXTENSION_STATUS',
            installed: true,
            version: '1.0.0'
        }, '*');
    }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXTENSION_READY') {
        window.postMessage({
            type: 'SIGNALSLOOP_EXTENSION_INSTALLED',
            version: '1.0.0'
        }, '*');
    }
});

console.log('[SignalsLoop] Visual Editor extension active on this page');
