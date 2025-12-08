import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy getter for Supabase client to avoid build-time initialization
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );
}

// Rate limiting map (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(domain: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(domain);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(domain, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }

  if (limit.count >= 100) { // 100 requests per minute per domain
    return false;
  }

  limit.count++;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const { key } = params;
    const url = new URL(request.url);
    const domain = request.headers.get('referer') || request.headers.get('origin') || 'unknown';

    // Rate limiting
    if (!checkRateLimit(domain)) {
      return new NextResponse('Rate limit exceeded', { status: 429 });
    }

    // Validate API key - check both API keys table and project slugs
    let project = null;
    const supabase = getSupabase();

    // First, try to find by API key in api_keys table
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select(`
        id,
        project_id,
        name,
        usage_count,
        projects!inner(id, name, slug, plan)
      `)
      .eq('key_hash', btoa(key))
      .single();

    if (apiKeyData && apiKeyData.projects) {
      // Valid API key found
      project = apiKeyData.projects;

      // Update usage count and last used
      await supabase
        .from('api_keys')
        .update({
          usage_count: apiKeyData.usage_count + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', apiKeyData.id);

      console.log('Valid API key found:', key, 'for project:', project.name);
    } else {
      // Fallback: try to find project by slug (for demo purposes)
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, slug, plan')
        .eq('slug', key)
        .single();

      if (projectData) {
        project = projectData;
        console.log('Project found by slug:', key, 'project:', project.name);
      } else {
        // If no valid API key or project found, return error
        return new NextResponse('Invalid API key', { status: 401 });
      }
    }

    // Get customization parameters from URL
    const position = url.searchParams.get('position') || 'bottom-right';
    const color = url.searchParams.get('color') || '#6366f1';
    const text = url.searchParams.get('text') || 'Feedback';
    const size = url.searchParams.get('size') || 'medium';
    const theme = url.searchParams.get('theme') || 'light';
    const planValue = typeof project.plan === 'string' ? project.plan.toLowerCase() : '';
    const isPro = planValue === 'pro' || planValue.startsWith('pro_');
    const hideBranding = isPro;

    // Generate widget ID for this instance
    const widgetId = `signalsloop-${project.slug}-${Date.now()}`;

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://signalsloop.com').replace(/\/+$/, '');
    // Construct the widget URL - use the new frame endpoint
    const widgetUrl = `${appUrl}/embed/${key}/frame?theme=${theme}&color=${encodeURIComponent(color)}&hide_branding=${hideBranding}`;
    const boardUrl = `${appUrl}/${project.slug}/board`;

    // Generate the JavaScript code
    const jsCode = `
(function() {
  'use strict';
  
  // Configuration
  const CONFIG = {
    projectSlug: '${project.slug}',
    widgetUrl: '${widgetUrl}',
    position: '${position}',
    color: '${color}',
    text: '${text}',
    size: '${size}',
    widgetId: '${widgetId}',
    hideBranding: ${hideBranding},
    boardUrl: '${boardUrl}'
  };

  // CSS Styles
  const styles = \`
    .signalsloop-widget {
      position: fixed;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-sizing: border-box;
    }
    
    .signalsloop-widget-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: \${CONFIG.color};
      color: white;
      border: none;
      border-radius: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
      min-height: 44px;
      min-width: 44px;
    }
    
    .signalsloop-widget-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }
    
    .signalsloop-widget-button:active {
      transform: translateY(0);
    }
    
    .signalsloop-widget-logo {
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      color: \${CONFIG.color};
    }
    
    .signalsloop-widget-text {
      white-space: nowrap;
    }
    
    .signalsloop-widget-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }
    
    .signalsloop-widget-modal.open {
      opacity: 1;
      visibility: visible;
    }
    
    .signalsloop-widget-modal-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 90vw;
      height: 80vh;
      max-width: 500px;
      max-height: 600px;
      position: relative;
      transform: translateY(20px);
      transition: transform 0.3s ease;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
    }
    
    .signalsloop-widget-modal.open .signalsloop-widget-modal-content {
      transform: translateY(0);
    }
    
    .signalsloop-widget-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      border: none;
      background: #f3f4f6;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: #6b7280;
      z-index: 1;
    }
    
    .signalsloop-widget-close:hover {
      background: #e5e7eb;
    }

    .signalsloop-widget-iframe {
      width: 100%;
      border: none;
      border-radius: 12px;
      display: block;
    }
    
    .signalsloop-widget-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #6b7280;
    }
    
    .signalsloop-widget-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 20px;
      text-align: center;
      color: #6b7280;
    }
    
    /* Position variants */
    .signalsloop-widget[data-position="bottom-right"] {
      bottom: 20px;
      right: 20px;
    }
    
    .signalsloop-widget[data-position="bottom-left"] {
      bottom: 20px;
      left: 20px;
    }
    
    .signalsloop-widget[data-position="top-right"] {
      top: 20px;
      right: 20px;
    }
    
    .signalsloop-widget[data-position="top-left"] {
      top: 20px;
      left: 20px;
    }
    
    /* Size variants */
    .signalsloop-widget[data-size="small"] .signalsloop-widget-button {
      padding: 8px 12px;
      font-size: 12px;
    }
    
    .signalsloop-widget[data-size="small"] .signalsloop-widget-logo {
      width: 14px;
      height: 14px;
      font-size: 8px;
    }
    
    .signalsloop-widget[data-size="large"] .signalsloop-widget-button {
      padding: 16px 20px;
      font-size: 16px;
    }
    
    .signalsloop-widget[data-size="large"] .signalsloop-widget-logo {
      width: 18px;
      height: 18px;
      font-size: 12px;
    }
    
    /* Mobile responsive */
    @media (max-width: 768px) {
      .signalsloop-widget-modal-content {
        width: 100vw;
        height: 100vh;
        max-width: none;
        max-height: none;
        border-radius: 0;
        overflow: visible;
      }

      .signalsloop-widget-iframe {
        height: 100vh;
        border-radius: 0;
      }

      .signalsloop-widget-button {
        padding: 10px 14px;
        font-size: 13px;
      }
    }
  \`;

  // Utility functions
  function createElement(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.innerHTML = content;
    return element;
  }

  function injectStyles() {
    if (document.getElementById('signalsloop-widget-styles')) return;
    
    const style = createElement('style', null, styles);
    style.id = 'signalsloop-widget-styles';
    document.head.appendChild(style);
  }

  function getPosition() {
    const validPositions = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
    return validPositions.includes(CONFIG.position) ? CONFIG.position : 'bottom-right';
  }

  function createWidgetButton() {
    const button = createElement('button', 'signalsloop-widget-button');
    
    const text = createElement('span', 'signalsloop-widget-text', CONFIG.text);
    
    if (!CONFIG.hideBranding) {
      const logo = createElement('div', 'signalsloop-widget-logo', 'S');
      button.appendChild(logo);
    }
    button.appendChild(text);
    
    return button;
  }

  function createModal() {
    const modal = createElement('div', 'signalsloop-widget-modal');

    const content = createElement('div', 'signalsloop-widget-modal-content');
    const closeButton = createElement('button', 'signalsloop-widget-close', '×');
    const iframe = createElement('iframe', 'signalsloop-widget-iframe');
    const loading = createElement('div', 'signalsloop-widget-loading', 'Loading...');

    iframe.src = CONFIG.widgetUrl;
    iframe.setAttribute('scrolling', 'no');
    iframe.style.display = 'none';

    iframe.onload = function() {
      loading.style.display = 'none';
      iframe.style.display = 'block';

      // Listen for height messages from iframe for iOS scrolling fix
      window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'signalsloop-resize' && e.data.height) {
          iframe.style.setProperty('height', e.data.height + 'px', 'important');
          console.log('Resized iframe to:', e.data.height + 'px');
        }
      });
    };

    iframe.onerror = function() {
      loading.style.display = 'none';
      const error = createElement('div', 'signalsloop-widget-error',
        '<div style="font-size: 18px; margin-bottom: 8px;">⚠️</div>' +
        '<div style="font-weight: 500; margin-bottom: 4px;">Unable to load widget</div>' +
        '<div style="font-size: 14px;">Please try again later</div>'
      );
      content.appendChild(error);
    };

    content.appendChild(closeButton);
    content.appendChild(loading);
    content.appendChild(iframe);
    modal.appendChild(content);
    
    // Close handlers
    closeButton.onclick = closeModal;
    modal.onclick = function(e) {
      if (e.target === modal) closeModal();
    };
    
    // ESC key handler
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.classList.contains('open')) {
        closeModal();
      }
    });
    
    function closeModal() {
      modal.classList.remove('open');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300);
    }
    
    return modal;
  }

  function openWidget() {
    const modal = createModal();
    document.body.appendChild(modal);
    
    // Trigger animation
    requestAnimationFrame(() => {
      modal.classList.add('open');
    });
  }

  function init() {
    // Check if already initialized
    if (document.getElementById(CONFIG.widgetId)) return;
    
    // Inject styles
    injectStyles();
    
    // Create widget container
    const widget = createElement('div', 'signalsloop-widget');
    widget.id = CONFIG.widgetId;
    widget.setAttribute('data-position', getPosition());
    widget.setAttribute('data-size', CONFIG.size);
    widget.setAttribute('data-hide-branding', CONFIG.hideBranding ? 'true' : 'false');
    
    // Create and add button
    const button = createWidgetButton();
    button.onclick = openWidget;
    widget.appendChild(button);
    
    // Add to page
    document.body.appendChild(widget);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;

    // Set security headers
    const headers = new Headers({
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate', // Disable cache for testing
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "default-src 'self'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; connect-src *;"
    });

    return new NextResponse(jsCode, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Widget generation error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
