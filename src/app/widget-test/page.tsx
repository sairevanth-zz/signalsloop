'use client';

import { useState, useEffect } from 'react';

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
      align-items: flex-start;
      justify-content: center;
      padding-top: 20px;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
      width: 90%;
      max-width: 500px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      position: relative;
    `;

    modal.innerHTML = `
      <div style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px; font-weight: 600;">Share your feedback and ideas</h2>
          <button id="close-preview" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
        </div>
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 500;">Title *</label>
          <input type="text" placeholder="Enter a title for your feedback" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px;">
        </div>
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 500;">Description</label>
          <textarea placeholder="Describe your feedback in detail..." rows="4" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; resize: vertical;"></textarea>
        </div>
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 500;">Category</label>
          <select style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px;">
            <option>Feature Request</option>
            <option>Bug Report</option>
            <option>Improvement</option>
            <option>Other</option>
          </select>
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="cancel-preview" style="padding: 12px 24px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">Cancel</button>
          <button style="padding: 12px 24px; background: ${color}; color: white; border: none; border-radius: 6px; cursor: pointer;">Submit Feedback</button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Add close handlers
    const closeModal = () => {
      overlay.remove();
    };

    document.getElementById('close-preview').addEventListener('click', closeModal);
    document.getElementById('cancel-preview').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Close on escape key
    const handleEscape = (e) => {
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
