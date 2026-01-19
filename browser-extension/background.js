/**
 * SignalsLoop Visual Editor Extension
 * Background Service Worker
 */

// Extension state
let isEnabled = true;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_STATUS') {
        sendResponse({ enabled: isEnabled });
    } else if (message.type === 'SET_STATUS') {
        isEnabled = message.enabled;
        // Update rules based on status
        if (isEnabled) {
            chrome.declarativeNetRequest.updateEnabledRulesets({
                enableRulesetIds: ['ruleset_1']
            });
        } else {
            chrome.declarativeNetRequest.updateEnabledRulesets({
                disableRulesetIds: ['ruleset_1']
            });
        }
        sendResponse({ success: true });
    }
    return true;
});

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('[SignalsLoop] Visual Editor extension installed');

    // Set default state
    chrome.storage.local.set({ enabled: true });
});

// Listen for tab updates to notify content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url?.includes('signalsloop.com')) {
        chrome.tabs.sendMessage(tabId, { type: 'EXTENSION_READY' }).catch(() => {
            // Tab might not have content script, ignore
        });
    }
});
