/**
 * SignalsLoop Visual Editor - Editor Inject Script
 * This script is injected into target pages to enable element selection and modification
 */

(function () {
    'use strict';

    let isSelecting = false;
    let selectedElement = null;
    let highlightedElement = null;

    // Styles for editor overlay
    const injectStyles = () => {
        const style = document.createElement('style');
        style.id = 'sl-editor-styles';
        style.textContent = `
      .sl-editor-highlight {
        outline: 2px solid #3b82f6 !important;
        outline-offset: 2px !important;
        cursor: pointer !important;
      }
      .sl-editor-selected {
        outline: 3px solid #10b981 !important;
        outline-offset: 2px !important;
      }
      .sl-editor-modified {
        outline: 2px dashed #f59e0b !important;
        outline-offset: 1px !important;
      }
    `;
        document.head.appendChild(style);
    };

    // Generate unique CSS selector for an element
    const generateSelector = (element) => {
        if (element.id) {
            return `#${element.id}`;
        }

        const path = [];
        let current = element;

        while (current && current.tagName !== 'HTML') {
            let selector = current.tagName.toLowerCase();

            if (current.className && typeof current.className === 'string') {
                const classes = current.className.split(' ').filter(c =>
                    c && !c.startsWith('sl-editor')
                ).slice(0, 2);
                if (classes.length > 0) {
                    selector += '.' + classes.join('.');
                }
            }

            path.unshift(selector);
            current = current.parentElement;

            if (path.length >= 3) break;
        }

        return path.join(' > ');
    };

    // Handle element hover
    const handleMouseOver = (e) => {
        if (!isSelecting) return;

        const target = e.target;
        if (target.tagName !== 'HTML' && target.tagName !== 'BODY') {
            if (highlightedElement && highlightedElement !== target) {
                highlightedElement.classList.remove('sl-editor-highlight');
            }
            target.classList.add('sl-editor-highlight');
            highlightedElement = target;
        }
    };

    // Handle element mouse out
    const handleMouseOut = (e) => {
        const target = e.target;
        target.classList.remove('sl-editor-highlight');
    };

    // Handle element click
    const handleClick = (e) => {
        if (!isSelecting) return;

        e.preventDefault();
        e.stopPropagation();

        const target = e.target;

        if (selectedElement) {
            selectedElement.classList.remove('sl-editor-selected');
        }

        target.classList.remove('sl-editor-highlight');
        target.classList.add('sl-editor-selected');
        selectedElement = target;

        // Send selection to parent
        window.parent.postMessage({
            type: 'SL_ELEMENT_SELECTED',
            selector: generateSelector(target),
            textContent: target.textContent,
            tagName: target.tagName,
            rect: target.getBoundingClientRect()
        }, '*');

        isSelecting = false;
    };

    // Listen for messages from parent window
    window.addEventListener('message', (event) => {
        const { type, data } = event.data;

        switch (type) {
            case 'SL_START_SELECTING':
                isSelecting = true;
                document.body.style.cursor = 'crosshair';
                break;

            case 'SL_STOP_SELECTING':
                isSelecting = false;
                document.body.style.cursor = '';
                if (highlightedElement) {
                    highlightedElement.classList.remove('sl-editor-highlight');
                }
                break;

            case 'SL_APPLY_CHANGE':
                if (data) {
                    const element = document.querySelector(data.selector);
                    if (element) {
                        switch (data.changeType) {
                            case 'text':
                                element.textContent = data.newValue;
                                break;
                            case 'style':
                                if (data.property) {
                                    element.style[data.property] = data.newValue;
                                }
                                break;
                            case 'visibility':
                                element.style.display = data.newValue === 'hidden' ? 'none' : '';
                                break;
                        }
                        element.classList.add('sl-editor-modified');
                    }
                }
                break;

            case 'SL_PING':
                window.parent.postMessage({ type: 'SL_PONG' }, '*');
                break;
        }
    });

    // Initialize editor
    const init = () => {
        injectStyles();
        document.body.addEventListener('mouseover', handleMouseOver);
        document.body.addEventListener('mouseout', handleMouseOut);
        document.body.addEventListener('click', handleClick, true);

        // Notify parent that editor is ready
        window.parent.postMessage({ type: 'SL_EDITOR_READY' }, '*');
    };

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
