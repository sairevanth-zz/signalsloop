'use client';

import { useState } from 'react';

export default function WidgetTestPage() {
  const [apiKey, setApiKey] = useState('sk_n2h6kbpmyro5u0abj8ds');
  const [position, setPosition] = useState('bottom-right');
  const [color, setColor] = useState('#6366f1');
  const [text, setText] = useState('Feedback');
  const [size, setSize] = useState('medium');
  const [widgetLoaded, setWidgetLoaded] = useState(false);

  const loadWidget = () => {
    // Remove existing widget
    const existingScript = document.getElementById('signalsloop-widget-script');
    if (existingScript) {
      existingScript.remove();
    }

    // Remove existing widget elements
    const existingWidgets = document.querySelectorAll('[id^="signalsloop-"]');
    existingWidgets.forEach(widget => widget.remove());

    // Remove existing styles
    const existingStyles = document.getElementById('signalsloop-widget-styles');
    if (existingStyles) {
      existingStyles.remove();
    }

    // Build widget URL with parameters
    const params = new URLSearchParams({
      position,
      color: encodeURIComponent(color),
      text,
      size
    });

    const widgetUrl = `/api/embed/${apiKey}.js?${params.toString()}`;

    // Create and load script
    const script = document.createElement('script');
    script.id = 'signalsloop-widget-script';
    script.src = widgetUrl;
    script.onload = () => setWidgetLoaded(true);
    script.onerror = () => {
      alert('Failed to load widget. Please check your API key.');
      setWidgetLoaded(false);
    };
    
    document.head.appendChild(script);
  };

  const removeWidget = () => {
    const existingScript = document.getElementById('signalsloop-widget-script');
    if (existingScript) {
      existingScript.remove();
    }

    const existingWidgets = document.querySelectorAll('[id^="signalsloop-"]');
    existingWidgets.forEach(widget => widget.remove());

    const existingStyles = document.getElementById('signalsloop-widget-styles');
    if (existingStyles) {
      existingStyles.remove();
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
                  placeholder="Enter your project API key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  {`<script src="/api/embed/${apiKey}.js?position=${position}&color=${encodeURIComponent(color)}&text=${text}&size=${size}"></script>`}
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
