/**
 * SignalsLoop A/B Testing SDK
 * 
 * Lightweight JavaScript SDK for running visual A/B tests.
 * Features:
 * - Consistent variant assignment
 * - DOM manipulation for visual changes
 * - Event tracking (goals, clicks, conversions)
 * - Flicker prevention
 * 
 * Usage:
 * <script src="https://cdn.signalsloop.com/sdk/v1/signalsloop.min.js"></script>
 * <script>
 *   SignalsLoop.init({ projectId: 'your-project-id' });
 * </script>
 */

interface VisualChange {
    id: string;
    selector: string;
    action: 'text' | 'style' | 'visibility' | 'attribute' | 'class';
    property?: string;
    value: string;
    originalValue?: string;
}

interface Variant {
    key: string;
    weight: number;
    isControl: boolean;
    changes: VisualChange[];
    pageUrl?: string;
}

interface Goal {
    id: string;
    name: string;
    type: string;
    selector?: string;
    url?: string;
}

interface Experiment {
    id: string;
    key: string;
    name: string;
    status: string;
    trafficAllocation: number;
    assignedVariant: string;
    variants: Variant[];
    goals: Goal[];
}

interface SDKConfig {
    projectId: string;
    userId?: string;
    apiUrl?: string;
    debug?: boolean;
    onReady?: () => void;
    onError?: (error: Error) => void;
}

interface SignalsLoopSDK {
    init: (config: SDKConfig) => void;
    track: (eventName: string, eventValue?: number, metadata?: Record<string, unknown>) => void;
    getVariant: (experimentKey: string) => string | null;
    isReady: () => boolean;
}

// Self-executing module
(function (window: Window & { SignalsLoop?: SignalsLoopSDK }) {
    'use strict';

    const SDK_VERSION = '1.0.0';
    const DEFAULT_API_URL = 'https://signalsloop.com/api/sdk';
    const VISITOR_ID_KEY = 'sl_vid';
    const HIDE_CLASS = 'sl-hide-flicker';

    let config: SDKConfig | null = null;
    let experiments: Experiment[] = [];
    let visitorId: string = '';
    let isInitialized = false;
    let eventQueue: Array<{
        experimentId: string;
        variantKey: string;
        eventType: string;
        eventName: string;
        eventValue?: number;
        metadata?: Record<string, unknown>;
    }> = [];

    // Utility: Generate visitor ID
    function generateVisitorId(): string {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Utility: Get or create visitor ID
    function getVisitorId(): string {
        if (config?.userId) {
            return config.userId;
        }

        let vid = localStorage.getItem(VISITOR_ID_KEY);
        if (!vid) {
            vid = generateVisitorId();
            localStorage.setItem(VISITOR_ID_KEY, vid);
        }
        return vid;
    }

    // Utility: Debug log
    function debug(...args: unknown[]) {
        if (config?.debug) {
            console.log('[SignalsLoop]', ...args);
        }
    }

    // Add flicker prevention styles
    function addFlickerStyles() {
        const style = document.createElement('style');
        style.id = 'sl-flicker-styles';
        style.textContent = `.${HIDE_CLASS} { visibility: hidden !important; }`;
        document.head.appendChild(style);
        document.documentElement.classList.add(HIDE_CLASS);
    }

    // Remove flicker prevention
    function removeFlickerStyles() {
        document.documentElement.classList.remove(HIDE_CLASS);
        const style = document.getElementById('sl-flicker-styles');
        if (style) style.remove();
    }

    // Apply a single visual change
    function applyChange(change: VisualChange): boolean {
        try {
            const elements = document.querySelectorAll(change.selector);
            if (elements.length === 0) {
                debug('No elements found for selector:', change.selector);
                return false;
            }

            elements.forEach(element => {
                const el = element as HTMLElement;

                switch (change.action) {
                    case 'text':
                        el.textContent = change.value;
                        break;

                    case 'style':
                        if (change.property) {
                            (el.style as Record<string, string>)[change.property] = change.value;
                        }
                        break;

                    case 'visibility':
                        el.style.display = change.value === 'hidden' ? 'none' : '';
                        break;

                    case 'attribute':
                        if (change.property) {
                            el.setAttribute(change.property, change.value);
                        }
                        break;

                    case 'class':
                        if (change.value.startsWith('-')) {
                            el.classList.remove(change.value.substring(1));
                        } else if (change.value.startsWith('+')) {
                            el.classList.add(change.value.substring(1));
                        } else {
                            el.className = change.value;
                        }
                        break;
                }
            });

            debug('Applied change:', change.selector, change.action, change.value);
            return true;
        } catch (error) {
            debug('Error applying change:', error);
            return false;
        }
    }

    // Apply all changes for a variant
    function applyVariantChanges(experiment: Experiment) {
        const variant = experiment.variants.find(v => v.key === experiment.assignedVariant);
        if (!variant || variant.isControl) {
            debug('Control variant or no variant found for', experiment.key);
            return;
        }

        // Check page URL match
        if (variant.pageUrl) {
            const currentUrl = window.location.href;
            const targetUrl = new URL(variant.pageUrl, window.location.origin).href;
            if (!currentUrl.startsWith(targetUrl.split('?')[0])) {
                debug('Page URL mismatch, skipping changes for', experiment.key);
                return;
            }
        }

        debug('Applying', variant.changes.length, 'changes for variant', variant.key);
        variant.changes.forEach(change => applyChange(change));

        // Track pageview for this experiment
        trackEvent(experiment.id, experiment.assignedVariant, 'pageview', 'page_load');
    }

    // Setup click goal tracking
    function setupGoalTracking(experiment: Experiment) {
        experiment.goals.forEach(goal => {
            if (goal.type === 'click' && goal.selector) {
                document.querySelectorAll(goal.selector).forEach(element => {
                    element.addEventListener('click', () => {
                        trackEvent(
                            experiment.id,
                            experiment.assignedVariant,
                            'goal',
                            goal.name,
                            undefined,
                            { goalId: goal.id }
                        );
                    });
                });
                debug('Set up click tracking for goal:', goal.name, goal.selector);
            }

            if (goal.type === 'pageview' && goal.url) {
                // Check if current URL matches goal URL
                if (window.location.href.includes(goal.url)) {
                    trackEvent(
                        experiment.id,
                        experiment.assignedVariant,
                        'goal',
                        goal.name,
                        undefined,
                        { goalId: goal.id }
                    );
                }
            }
        });
    }

    // Track an event
    function trackEvent(
        experimentId: string,
        variantKey: string,
        eventType: string,
        eventName: string,
        eventValue?: number,
        metadata?: Record<string, unknown>
    ) {
        const event = {
            experimentId,
            variantKey,
            visitorId,
            eventType,
            eventName,
            eventValue,
            metadata,
            pageUrl: window.location.href,
            timestamp: Date.now(),
        };

        eventQueue.push(event);
        debug('Queued event:', eventType, eventName);

        // Debounce sending events
        debouncedSendEvents();
    }

    // Debounced event sending
    let sendTimeout: ReturnType<typeof setTimeout> | null = null;
    function debouncedSendEvents() {
        if (sendTimeout) clearTimeout(sendTimeout);
        sendTimeout = setTimeout(sendEvents, 1000);
    }

    // Send queued events to server
    async function sendEvents() {
        if (eventQueue.length === 0 || !config) return;

        const eventsToSend = [...eventQueue];
        eventQueue = [];

        try {
            const apiUrl = config.apiUrl || DEFAULT_API_URL;
            const response = await fetch(`${apiUrl}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    events: eventsToSend,
                    projectId: config.projectId,
                    visitorId,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            debug('Sent', eventsToSend.length, 'events');
        } catch (error) {
            debug('Error sending events:', error);
            // Re-queue failed events
            eventQueue.push(...eventsToSend);
        }
    }

    // Fetch experiments from server
    async function fetchExperiments(): Promise<Experiment[]> {
        if (!config) return [];

        const apiUrl = config.apiUrl || DEFAULT_API_URL;
        const url = new URL(`${apiUrl}/config`);
        url.searchParams.set('projectId', config.projectId);
        url.searchParams.set('visitorId', visitorId);
        url.searchParams.set('pageUrl', window.location.href);

        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.experiments || [];
    }

    // Initialize SDK
    async function init(sdkConfig: SDKConfig) {
        if (isInitialized) {
            debug('SDK already initialized');
            return;
        }

        config = sdkConfig;

        debug('Initializing SDK v' + SDK_VERSION);
        debug('Project ID:', config.projectId);

        // Add flicker prevention immediately
        addFlickerStyles();

        try {
            // Get visitor ID
            visitorId = getVisitorId();
            debug('Visitor ID:', visitorId);

            // Fetch experiments
            experiments = await fetchExperiments();
            debug('Fetched', experiments.length, 'running experiments');

            // Wait for DOM ready
            if (document.readyState === 'loading') {
                await new Promise<void>(resolve => {
                    document.addEventListener('DOMContentLoaded', () => resolve());
                });
            }

            // Apply changes for each experiment
            experiments.forEach(exp => {
                applyVariantChanges(exp);
                setupGoalTracking(exp);
            });

            isInitialized = true;
            config.onReady?.();

        } catch (error) {
            debug('Error initializing:', error);
            config.onError?.(error as Error);
        } finally {
            // Always remove flicker prevention
            removeFlickerStyles();
        }
    }

    // Public API
    const SignalsLoop: SignalsLoopSDK = {
        init,

        track(eventName: string, eventValue?: number, metadata?: Record<string, unknown>) {
            // Track custom event for all experiments
            experiments.forEach(exp => {
                trackEvent(exp.id, exp.assignedVariant, 'custom', eventName, eventValue, metadata);
            });
        },

        getVariant(experimentKey: string): string | null {
            const exp = experiments.find(e => e.key === experimentKey);
            return exp?.assignedVariant || null;
        },

        isReady(): boolean {
            return isInitialized;
        },
    };

    // Send events before page unload
    window.addEventListener('beforeunload', () => {
        if (eventQueue.length > 0 && config) {
            const apiUrl = config.apiUrl || DEFAULT_API_URL;
            navigator.sendBeacon(
                `${apiUrl}/events`,
                JSON.stringify({
                    events: eventQueue,
                    projectId: config.projectId,
                    visitorId,
                })
            );
        }
    });

    // Expose to window
    window.SignalsLoop = SignalsLoop;

})(window);
