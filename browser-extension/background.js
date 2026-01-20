/**
 * SignalsLoop Visual Editor Extension
 * Background Service Worker v1.0.2
 * Handles script injection into iframes for cross-origin editing
 */

// Extension state
let isEnabled = true;

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[SignalsLoop BG] Received message:', message.type);

    if (message.type === 'GET_STATUS') {
        sendResponse({ enabled: isEnabled });
        return false;
    }

    if (message.type === 'SET_STATUS') {
        isEnabled = message.enabled;
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
        return false;
    }

    if (message.type === 'INJECT_INTO_IFRAME') {
        // Inject the editor script into the specified tab's iframe
        const { tabId, url } = message;

        if (!tabId) {
            sendResponse({ success: false, error: 'No tabId provided' });
            return false;
        }

        // Get all frames in the tab
        chrome.webNavigation.getAllFrames({ tabId }, (frames) => {
            if (chrome.runtime.lastError) {
                console.error('[SignalsLoop BG] Error getting frames:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
            }

            // Find iframe with matching URL
            const targetFrame = frames?.find(f => f.url && f.url.includes(url?.replace(/^https?:\/\//, '').split('/')[0]));

            if (targetFrame) {
                chrome.scripting.executeScript({
                    target: { tabId, frameIds: [targetFrame.frameId] },
                    files: ['editor-inject.js']
                }).then(() => {
                    console.log('[SignalsLoop BG] Injected into frame:', targetFrame.frameId);
                    sendResponse({ success: true, frameId: targetFrame.frameId });
                }).catch((error) => {
                    console.error('[SignalsLoop BG] Injection failed:', error);
                    sendResponse({ success: false, error: error.message });
                });
            } else {
                // Try to inject into all frames
                const iframes = frames?.filter(f => f.frameId !== 0) || [];
                if (iframes.length > 0) {
                    Promise.all(iframes.map(frame =>
                        chrome.scripting.executeScript({
                            target: { tabId, frameIds: [frame.frameId] },
                            files: ['editor-inject.js']
                        }).catch(e => console.log('[SignalsLoop BG] Frame injection skipped:', e))
                    )).then(() => {
                        sendResponse({ success: true, framesInjected: iframes.length });
                    });
                } else {
                    sendResponse({ success: false, error: 'No iframes found' });
                }
            }
        });

        return true; // Keep channel open for async response
    }

    return false;
});

// Listen for iframe navigation to auto-inject
chrome.webNavigation.onCompleted.addListener((details) => {
    // Only handle iframes (frameId !== 0)
    if (details.frameId === 0) return;

    // Check if this is from a SignalsLoop tab
    chrome.tabs.get(details.tabId, (tab) => {
        if (chrome.runtime.lastError) return;

        if (tab.url && (tab.url.includes('signalsloop.com') || tab.url.includes('localhost:3000'))) {
            console.log('[SignalsLoop BG] Auto-injecting into iframe:', details.url);

            // Small delay to ensure page is ready
            setTimeout(() => {
                chrome.scripting.executeScript({
                    target: { tabId: details.tabId, frameIds: [details.frameId] },
                    files: ['editor-inject.js']
                }).then(() => {
                    console.log('[SignalsLoop BG] Auto-injection successful');
                }).catch((error) => {
                    console.log('[SignalsLoop BG] Auto-injection skipped (expected for some pages):', error.message);
                });
            }, 500);
        }
    });
});

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('[SignalsLoop] Visual Editor extension v1.0.2 installed');
    chrome.storage.local.set({ enabled: true });
});

// Notify SignalsLoop tabs when extension is ready
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        if (tab.url.includes('signalsloop.com') || tab.url.includes('localhost:3000')) {
            chrome.tabs.sendMessage(tabId, { type: 'EXTENSION_READY' }).catch(() => { });
        }
    }
});
