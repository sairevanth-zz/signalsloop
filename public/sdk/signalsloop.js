/**
 * SignalsLoop Experiments SDK
 * 
 * Lightweight JavaScript SDK for A/B testing and experimentation.
 * Customers embed this via a simple script tag to run experiments.
 * 
 * Usage:
 * <script src="https://signalsloop.com/sdk/{projectId}.js"></script>
 * <script>
 *   SignalsLoop.init({ projectId: 'xxx' });
 *   const variant = await SignalsLoop.getVariant('experiment-key');
 *   SignalsLoop.track('conversion', { value: 99 });
 * </script>
 */

(function (window) {
    'use strict';

    const SDK_VERSION = '1.0.0';
    const API_BASE = 'https://signalsloop.com/api';

    // Visitor ID management
    function getVisitorId() {
        const COOKIE_NAME = 'sl_visitor_id';
        let visitorId = getCookie(COOKIE_NAME);

        if (!visitorId) {
            visitorId = generateUUID();
            setCookie(COOKIE_NAME, visitorId, 365);
        }

        return visitorId;
    }

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    function setCookie(name, value, days) {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
    }

    // Local cache for variant assignments
    const variantCache = {};
    const eventQueue = [];
    let flushTimeout = null;

    // Main SDK object
    const SignalsLoop = {
        projectId: null,
        visitorId: null,
        userId: null,
        debug: false,
        initialized: false,

        /**
         * Initialize the SDK
         * @param {Object} config - Configuration object
         * @param {string} config.projectId - Your SignalsLoop project ID
         * @param {string} [config.userId] - Optional logged-in user ID
         * @param {boolean} [config.debug] - Enable debug logging
         */
        init: function (config) {
            if (!config || !config.projectId) {
                console.error('[SignalsLoop] projectId is required');
                return;
            }

            this.projectId = config.projectId;
            this.userId = config.userId || null;
            this.debug = config.debug || false;
            this.visitorId = getVisitorId();
            this.initialized = true;

            if (this.debug) {
                console.log('[SignalsLoop] Initialized', {
                    projectId: this.projectId,
                    visitorId: this.visitorId,
                    version: SDK_VERSION
                });
            }

            // Setup auto-tracking
            this._setupAutoTracking();

            return this;
        },

        /**
         * Get the variant for an experiment
         * @param {string} experimentKey - Experiment name or ID
         * @returns {Promise<Object>} - Variant object with key and config
         */
        getVariant: async function (experimentKey) {
            if (!this.initialized) {
                console.error('[SignalsLoop] SDK not initialized. Call init() first.');
                return null;
            }

            // Check cache first
            if (variantCache[experimentKey]) {
                return variantCache[experimentKey];
            }

            try {
                const response = await fetch(`${API_BASE}/experiments/decide`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        experimentKey: experimentKey,
                        visitorId: this.visitorId,
                        userId: this.userId,
                        context: {
                            url: window.location.href,
                            referrer: document.referrer,
                            userAgent: navigator.userAgent,
                            screenWidth: window.innerWidth,
                            screenHeight: window.innerHeight,
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();

                if (data.enabled && data.variant) {
                    variantCache[experimentKey] = data.variant;

                    if (this.debug) {
                        console.log('[SignalsLoop] Variant assigned', {
                            experiment: experimentKey,
                            variant: data.variant.key
                        });
                    }

                    return data.variant;
                }

                return null;
            } catch (error) {
                if (this.debug) {
                    console.error('[SignalsLoop] Error getting variant', error);
                }
                return null;
            }
        },

        /**
         * Track a conversion event
         * @param {string} eventName - Name of the event
         * @param {Object} [properties] - Optional event properties
         * @param {number} [properties.value] - Numeric value (e.g., revenue)
         */
        track: function (eventName, properties = {}) {
            if (!this.initialized) {
                console.error('[SignalsLoop] SDK not initialized. Call init() first.');
                return;
            }

            // Add to queue for batching
            eventQueue.push({
                experimentId: properties.experimentId || null,
                visitorId: this.visitorId,
                eventType: properties.type || 'conversion',
                eventName: eventName,
                eventValue: properties.value || null,
                properties: properties,
                timestamp: Date.now()
            });

            if (this.debug) {
                console.log('[SignalsLoop] Event queued', { eventName, properties });
            }

            // Debounced flush
            this._scheduleFlush();
        },

        /**
         * Track a click on a specific element
         * @param {string} selector - CSS selector
         * @param {string} eventName - Event name for tracking
         */
        trackClick: function (selector, eventName) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.addEventListener('click', () => {
                    this.track(eventName, { type: 'click', selector: selector });
                });
            });
        },

        /**
         * Apply variant changes to DOM elements
         * @param {string} experimentKey - Experiment name
         * @param {Object} changes - Object mapping variant keys to changes
         */
        applyVariant: async function (experimentKey, changes) {
            const variant = await this.getVariant(experimentKey);

            if (variant && changes[variant.key]) {
                const variantChanges = changes[variant.key];

                Object.entries(variantChanges).forEach(([selector, change]) => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => {
                        if (typeof change === 'string') {
                            element.textContent = change;
                        } else if (typeof change === 'object') {
                            Object.entries(change).forEach(([prop, value]) => {
                                if (prop === 'text') {
                                    element.textContent = value;
                                } else if (prop === 'html') {
                                    element.innerHTML = value;
                                } else if (prop === 'class') {
                                    element.className = value;
                                } else if (prop === 'style') {
                                    Object.assign(element.style, value);
                                } else {
                                    element.setAttribute(prop, value);
                                }
                            });
                        }
                    });
                });

                if (this.debug) {
                    console.log('[SignalsLoop] Applied variant changes', { experimentKey, variant: variant.key });
                }
            }
        },

        // Internal methods
        _scheduleFlush: function () {
            if (flushTimeout) {
                clearTimeout(flushTimeout);
            }
            flushTimeout = setTimeout(() => this._flushEvents(), 1000);
        },

        _flushEvents: async function () {
            if (eventQueue.length === 0) return;

            const events = eventQueue.splice(0, eventQueue.length);

            try {
                await fetch(`${API_BASE}/experiments/track`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ events })
                });

                if (this.debug) {
                    console.log('[SignalsLoop] Events flushed', events.length);
                }
            } catch (error) {
                // Put events back in queue
                eventQueue.unshift(...events);
                if (this.debug) {
                    console.error('[SignalsLoop] Error flushing events', error);
                }
            }
        },

        _setupAutoTracking: function () {
            // Track page views
            this.track('pageview', {
                type: 'pageview',
                url: window.location.href,
                title: document.title
            });

            // Track form submissions
            document.addEventListener('submit', (event) => {
                const form = event.target;
                if (form.tagName === 'FORM') {
                    this.track('form_submit', {
                        type: 'form_submit',
                        formId: form.id || null,
                        formAction: form.action || null
                    });
                }
            });

            // Flush events before page unload
            window.addEventListener('beforeunload', () => {
                this._flushEvents();
            });
        }
    };

    // Expose to global scope
    window.SignalsLoop = SignalsLoop;

    // Auto-initialize if config is present in script tag
    const currentScript = document.currentScript;
    if (currentScript) {
        const projectId = currentScript.getAttribute('data-project-id');
        if (projectId) {
            SignalsLoop.init({ projectId: projectId });
        }
    }

})(window);
