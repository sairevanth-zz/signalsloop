'use client';

import { useState, useEffect } from 'react';

const CATEGORY_OPTIONS = [
  { value: 'Feature Request', label: 'Feature Request', emoji: '✨', description: 'Suggest a new feature or capability' },
  { value: 'Bug', label: 'Bug Report', emoji: '🐞', description: 'Report a problem or defect' },
  { value: 'Improvement', label: 'Improvement', emoji: '💡', description: 'Enhance an existing feature or workflow' },
  { value: 'UI/UX', label: 'UI / UX', emoji: '🎨', description: 'Share design, usability, or user experience feedback' },
  { value: 'Integration', label: 'Integration', emoji: '🔌', description: 'Connect SignalsLoop with other tools or APIs' },
  { value: 'Performance', label: 'Performance', emoji: '🚀', description: 'Speed, stability, or reliability concerns' },
  { value: 'Documentation', label: 'Documentation', emoji: '📚', description: 'Guides, onboarding, or help content' },
  { value: 'Other', label: 'Other', emoji: '💬', description: 'Anything else not covered above' }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
];

const hexToRgba = (hex: string, alpha: number) => {
  const cleaned = hex.replace('#', '');
  const full = cleaned.length === 3
    ? cleaned.split('').map((char) => char + char).join('')
    : cleaned;
  const bigint = parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function WidgetTestPage() {
  const [apiKey, setApiKey] = useState('');
  const [position, setPosition] = useState('bottom-right');
  const [color, setColor] = useState('#6366f1');
  const [text, setText] = useState('Feedback');
  const [size, setSize] = useState('medium');
  const [widgetLoaded, setWidgetLoaded] = useState(false);

  // Update preview when settings change
  const updatePreview = () => {
    if (widgetLoaded) {
      createWidgetPreview();
    }
  };

  // Update preview when settings change
  useEffect(() => {
    updatePreview();
  }, [position, color, text, size, widgetLoaded]);

  const loadWidget = () => {
    // Validate API key
    if (!apiKey.trim()) {
      alert('Please enter an API key');
      return;
    }
    
    if (!apiKey.startsWith('sk_')) {
      alert('API key should start with "sk_"');
      return;
    }

    // Instead of loading the actual widget script, create a preview
    createWidgetPreview();
    setWidgetLoaded(true);
  };

  const createWidgetPreview = () => {
    // Remove existing preview
    const existingPreview = document.getElementById('widget-preview');
    if (existingPreview) {
      existingPreview.remove();
    }

    // Create preview container
    const preview = document.createElement('div');
    preview.id = 'widget-preview';
    preview.style.cssText = `
      position: fixed;
      ${position.includes('bottom') ? 'bottom' : 'top'}: 20px;
      ${position.includes('right') ? 'right' : 'left'}: 20px;
      background-color: ${color};
      color: white;
      padding: ${size === 'small' ? '8px 16px' : size === 'large' ? '16px 24px' : '12px 20px'};
      border-radius: 25px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-weight: 600;
      font-size: ${size === 'small' ? '14px' : size === 'large' ? '18px' : '16px'};
      cursor: pointer;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
      border: none;
      outline: none;
    `;
    preview.textContent = text;
    
    // Add hover effect
    preview.addEventListener('mouseenter', () => {
      preview.style.transform = 'scale(1.05)';
      preview.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.25)';
    });
    
    preview.addEventListener('mouseleave', () => {
      preview.style.transform = 'scale(1)';
      preview.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });

    // Add click handler to show preview modal
    preview.addEventListener('click', () => {
      showPreviewModal();
    });

    document.body.appendChild(preview);
  };

  const showPreviewModal = () => {
    // Remove existing modal
    const existingModal = document.getElementById('preview-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'preview-modal';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 1000000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
      width: 100%;
      max-width: 560px;
      max-height: calc(100vh - 80px);
      overflow-y: auto;
      position: relative;
    `;

    const activeBg = hexToRgba(color, 0.12);

    const categoryButtonsMarkup = CATEGORY_OPTIONS.map((option) => {
      const isActive = option.value === 'Feature Request';
      return `
        <button
          type="button"
          class="category-option${isActive ? ' active' : ''}"
          data-value="${option.value}"
          style="
            border: 2px solid ${isActive ? color : '#e5e7eb'};
            background: ${isActive ? activeBg : '#ffffff'};
            border-radius: 12px;
            padding: 14px;
            text-align: left;
            display: flex;
            flex-direction: column;
            gap: 6px;
            transition: all 0.2s ease;
          "
        >
          <div class="category-title" style="
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            font-size: 14px;
            color: ${isActive ? color : '#111827'};
          ">
            <span class="category-emoji" style="font-size: 18px;">${option.emoji}</span>
            ${option.label}
          </div>
          <p class="category-description" style="font-size: 12px; color: #6b7280; line-height: 1.45;">
            ${option.description}
          </p>
        </button>
      `;
    }).join('');

    const priorityButtonsMarkup = PRIORITY_OPTIONS.map((option) => {
      const isActive = option.value === 'medium';
      return `
        <button
          type="button"
          class="priority-option${isActive ? ' active' : ''}"
          data-value="${option.value}"
          style="
            flex: 1;
            padding: 10px 12px;
            border-radius: 10px;
            border: ${isActive ? `2px solid ${color}` : '1px solid #d1d5db'};
            background: ${isActive ? activeBg : '#ffffff'};
            font-size: 14px;
            font-weight: ${isActive ? '600' : '500'};
            color: ${isActive ? color : '#111827'};
            cursor: pointer;
            transition: all 0.2s ease;
          "
        >
          ${option.label}
        </button>
      `;
    }).join('');

    modal.innerHTML = `
      <div style="padding: 26px 28px 30px 28px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 16px;">
          <div>
            <h2 style="margin: 0; font-size: 22px; font-weight: 600; color: #111827;">Submit Feedback</h2>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #6b7280;">Help us improve by sharing your thoughts and ideas</p>
          </div>
          <button id="close-preview" style="background: none; border: none; font-size: 24px; color: #6b7280; cursor: pointer; line-height: 1;">×</button>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 10px; font-weight: 600; font-size: 14px; color: #374151;">Which category best fits this feedback?</label>
          <div class="category-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
            ${categoryButtonsMarkup}
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #374151;">Title *</label>
          <input type="text" placeholder="Brief summary of your feedback" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 10px; font-size: 16px; box-sizing: border-box;">
        </div>

        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <label style="font-weight: 600; font-size: 14px; color: #374151;">Description *</label>
            <span style="font-size: 12px; color: #9ca3af;">0/500</span>
          </div>
          <textarea placeholder="Describe your feedback in detail..." rows="4" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 10px; font-size: 16px; resize: vertical; box-sizing: border-box;"></textarea>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 10px; font-weight: 600; font-size: 14px; color: #374151;">Priority</label>
          <div style="display: flex; gap: 10px;">
            ${priorityButtonsMarkup}
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #374151;">Your Name *</label>
          <input type="text" placeholder="John Doe" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 10px; font-size: 16px; box-sizing: border-box;">
        </div>

        <div style="margin-bottom: 24px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #374151;">Email *</label>
          <input type="email" placeholder="your@email.com" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 10px; font-size: 16px; box-sizing: border-box;">
          <p style="margin: 6px 0 0 0; font-size: 12px; color: #6b7280;">We'll notify you about updates on your feedback</p>
        </div>

        <div style="display: flex; gap: 12px; justify-content: flex-end; padding-top: 18px; border-top: 1px solid #e5e7eb;">
          <button id="cancel-preview" style="padding: 12px 24px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 10px; cursor: pointer; font-weight: 500; font-size: 14px;">Cancel</button>
          <button id="submit-feedback" style="padding: 12px 24px; background: ${color}; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">Submit Feedback</button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const categoryButtons = modal.querySelectorAll<HTMLButtonElement>('.category-option');
    categoryButtons.forEach((buttonEl) => {
      buttonEl.addEventListener('click', () => {
        categoryButtons.forEach((btn) => {
          btn.style.border = '2px solid #e5e7eb';
          btn.style.background = '#ffffff';
          const title = btn.querySelector<HTMLElement>('.category-title');
          if (title) {
            title.style.color = '#111827';
          }
        });
        buttonEl.style.border = `2px solid ${color}`;
        buttonEl.style.background = activeBg;
        const title = buttonEl.querySelector<HTMLElement>('.category-title');
        if (title) {
          title.style.color = color;
        }
      });
    });

    const priorityButtons = modal.querySelectorAll<HTMLButtonElement>('.priority-option');
    priorityButtons.forEach((buttonEl) => {
      buttonEl.addEventListener('click', () => {
        priorityButtons.forEach((btn) => {
          btn.style.border = '1px solid #d1d5db';
          btn.style.background = '#ffffff';
          btn.style.color = '#111827';
          btn.style.fontWeight = '500';
        });
        buttonEl.style.border = `2px solid ${color}`;
        buttonEl.style.background = activeBg;
        buttonEl.style.color = color;
        buttonEl.style.fontWeight = '600';
      });
    });

    // Add close handlers
    const closeModal = () => {
      document.removeEventListener('keydown', handleEscape);
      overlay.remove();
    };

    document.getElementById('close-preview').addEventListener('click', closeModal);
    document.getElementById('cancel-preview').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Add submit handler
    document.getElementById('submit-feedback').addEventListener('click', () => {
      alert('✅ Feedback submitted successfully!');
      closeModal();
    });

    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  };

  const removeWidget = () => {
    // Remove preview widget
    const existingPreview = document.getElementById('widget-preview');
    if (existingPreview) {
      existingPreview.remove();
    }

    // Remove preview modal
    const existingModal = document.getElementById('preview-modal');
    if (existingModal) {
      existingModal.remove();
    }

    setWidgetLoaded(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Widget Test Page</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk_..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your API key from project settings (starts with sk_)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This is a preview of how your widget will look on external websites. 
                  The actual widget will be loaded via the embed script on your customers' sites.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Button Text
                </label>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Feedback"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size
                </label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={loadWidget}
                  disabled={!apiKey || widgetLoaded}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {widgetLoaded ? 'Widget Loaded' : 'Load Widget'}
                </button>
                
                <button
                  onClick={removeWidget}
                  disabled={!widgetLoaded}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Remove Widget
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Widget Code</h3>
              <div className="bg-gray-100 p-4 rounded-md">
                <code className="text-sm">
                  {`<script src="/embed/${apiKey}.js?position=${position}&color=${encodeURIComponent(color)}&text=${text}&size=${size}"></script>`}
                </code>
              </div>

              <div className="bg-blue-50 p-4 rounded-md">
                <h4 className="font-medium text-blue-900 mb-2">Parameters:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li><code>position</code> - Widget position (bottom-right, bottom-left, top-right, top-left)</li>
                  <li><code>color</code> - Button color (hex code)</li>
                  <li><code>text</code> - Button text</li>
                  <li><code>size</code> - Button size (small, medium, large)</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-md">
                <h4 className="font-medium text-green-900 mb-2">Features:</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>✓ Mobile responsive (44px minimum touch target)</li>
                  <li>✓ Z-index 999999 (appears above everything)</li>
                  <li>✓ Smooth animations and hover effects</li>
                  <li>✓ ESC key and click-outside to close modal</li>
                  <li>✓ Rate limiting and security headers</li>
                  <li>✓ Minified output (&lt;5KB)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Sample website content to test widget overlay */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Sample Website Content</h2>
          <p className="text-gray-600 mb-4">
            This is sample content to demonstrate how the widget appears over a real website.
            Try scrolling, resizing the window, or interacting with this content to see how
            the widget behaves.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Feature 1</h3>
              <p className="text-blue-800 text-sm">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Feature 2</h3>
              <p className="text-green-800 text-sm">Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Instructions</h3>
            <ol className="text-gray-700 text-sm space-y-1 list-decimal list-inside">
              <li>Enter a valid API key from your SignalsLoop project</li>
              <li>Customize the widget appearance using the controls</li>
              <li>Click "Load Widget" to see the widget in action</li>
              <li>Test the widget by clicking on it and submitting feedback</li>
              <li>Try different positions and styles to see the variations</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
