import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// Rate limiting map (in production, use Redis or database)
const rateLimitMap = new Map();

function checkRateLimit(domain) {
  const now = Date.now();
  const limit = 100; // 100 requests per minute
  const windowMs = 60 * 1000; // 1 minute

  if (!rateLimitMap.has(domain)) {
    rateLimitMap.set(domain, { count: 0, resetTime: now + windowMs });
  }

  const entry = rateLimitMap.get(domain);

  if (entry.resetTime < now) {
    entry.count = 0;
    entry.resetTime = now + windowMs;
  }

  entry.count++;
  return entry.count <= limit;
}

export async function GET(
  request,
  { params }
) {
  try {
    const { searchParams } = new URL(request.url);
    const resolvedParams = await params;
    const key = resolvedParams.key.replace('.js', ''); // Remove .js extension if present

    // Determine the domain for rate limiting
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const domain = origin || referer || 'unknown';

    // Rate limiting
    if (!checkRateLimit(domain)) {
      return new NextResponse('Rate limit exceeded', { status: 429 });
    }

    // Get widget configuration options from URL params
    const position = searchParams.get('position') || 'bottom-right';
    const color = searchParams.get('color') || '#3B82F6';
    const text = searchParams.get('text') || 'Feedback';
    const size = searchParams.get('size') || 'medium';
    const theme = searchParams.get('theme') || 'light';

    // For demo purposes, we'll use a simple validation
    // In production, you'd validate against your API key database
    let projectSlug = key;
    
    // Try to find project by slug first
    const { data: project, error } = await supabase
      .from('projects')
      .select('id, name, slug, plan')
      .eq('slug', key)
      .single();

    if (error || !project) {
      // If not found by slug, try to use the key directly
      projectSlug = key;
    } else {
      projectSlug = project.slug;
    }

    // Generate the widget JavaScript
    const widgetScript = generateWidgetScript({
      apiKey: key,
      projectSlug: projectSlug,
      projectName: project?.name || 'SignalsLoop',
      position,
      color,
      text,
      size,
      theme,
      isPro: project?.plan === 'pro' || false
    });

    console.log('Generated widget script for key:', key, 'project:', project?.name);

    return new NextResponse(widgetScript, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY', // Prevent clickjacking
        'Content-Security-Policy': "default-src 'none'; script-src 'self' 'unsafe-inline'; connect-src 'self'; style-src 'self' 'unsafe-inline';"
      },
    });

  } catch (error) {
    console.error('Error generating widget script:', error);
    
    return new NextResponse(
      `console.error('SignalsLoop: Widget failed to load - ${error.message}');`,
      {
        status: 500,
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

function generateWidgetScript(config) {
  return `
(function() {
  'use strict';
  
  // Prevent multiple widget loads
  if (window.SignalsLoopWidget) {
    console.warn('SignalsLoop widget already loaded');
    return;
  }

  // Widget configuration
  const CONFIG = ${JSON.stringify(config)};
  const WIDGET_ID = 'signalsloop-widget-' + Math.random().toString(36).substr(2, 9);
  const IFRAME_URL = '${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/embed/' + CONFIG.apiKey + '/frame?theme=' + CONFIG.theme + '&color=' + encodeURIComponent(CONFIG.color);

  // Position configurations
  const POSITIONS = {
    'bottom-right': { bottom: '20px', right: '20px', top: 'auto', left: 'auto' },
    'bottom-left': { bottom: '20px', left: '20px', top: 'auto', right: 'auto' },
    'top-right': { top: '20px', right: '20px', bottom: 'auto', left: 'auto' },
    'top-left': { top: '20px', left: '20px', bottom: 'auto', left: 'auto' },
    'center-right': { top: '50%', right: '20px', bottom: 'auto', left: 'auto', transform: 'translateY(-50%)' }
  };

  // Size configurations
  const SIZES = {
    'small': { padding: '8px 16px', fontSize: '14px', width: '80px', height: '36px' },
    'medium': { padding: '12px 20px', fontSize: '16px', width: '100px', height: '44px' },
    'large': { padding: '16px 24px', fontSize: '18px', width: '120px', height: '52px' }
  };

  // Create widget button
  function createWidgetButton() {
    const button = document.createElement('button');
    button.id = WIDGET_ID;
    button.innerHTML = CONFIG.text;
    
    // Apply styles
    const position = POSITIONS[CONFIG.position] || POSITIONS['bottom-right'];
    const size = SIZES[CONFIG.size] || SIZES['medium'];
    
    Object.assign(button.style, {
      position: 'fixed',
      zIndex: '999999',
      backgroundColor: CONFIG.color,
      color: 'white',
      border: 'none',
      borderRadius: '25px',
      cursor: 'pointer',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontWeight: '600',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      transition: 'all 0.3s ease',
      outline: 'none',
      ...position,
      ...size
    });

    // Hover effects
    button.addEventListener('mouseenter', function() {
      button.style.transform = (position.transform || '') + ' scale(1.05)';
      button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.25)';
    });

    button.addEventListener('mouseleave', function() {
      button.style.transform = position.transform || '';
      button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });

    // Click handler
    button.addEventListener('click', openWidget);

    return button;
  }

  // Create modal overlay
  function createModal() {
    const overlay = document.createElement('div');
    overlay.id = WIDGET_ID + '-overlay';
    
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: '1000000',
      display: 'none',
      opacity: '0',
      transition: 'opacity 0.3s ease'
    });

    // Create iframe container
    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%) scale(0.9)',
      width: '90%',
      maxWidth: '500px',
      height: '80%',
      maxHeight: '600px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
      transition: 'transform 0.3s ease',
      overflow: 'hidden'
    });

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = IFRAME_URL;
    Object.assign(iframe.style, {
      width: '100%',
      height: '100%',
      border: 'none',
      borderRadius: '12px'
    });

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    Object.assign(closeButton.style, {
      position: 'absolute',
      top: '10px',
      right: '10px',
      width: '30px',
      height: '30px',
      borderRadius: '50%',
      border: 'none',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      color: '#666',
      fontSize: '18px',
      fontWeight: 'bold',
      cursor: 'pointer',
      zIndex: '10',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease'
    });

    closeButton.addEventListener('click', closeWidget);
    closeButton.addEventListener('mouseenter', function() {
      closeButton.style.backgroundColor = 'rgba(255, 255, 255, 1)';
      closeButton.style.color = '#333';
    });

    closeButton.addEventListener('mouseleave', function() {
      closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      closeButton.style.color = '#666';
    });

    container.appendChild(iframe);
    container.appendChild(closeButton);
    overlay.appendChild(container);

    // Close on overlay click
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        closeWidget();
      }
    });

    // Close on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.style.display === 'block') {
        closeWidget();
      }
    });

    return { overlay, container, iframe };
  }

  // Widget state
  let isOpen = false;
  let modal = null;

  // Open widget
  function openWidget() {
    if (isOpen) return;
    
    if (!modal) {
      modal = createModal();
      document.body.appendChild(modal.overlay);
    }

    isOpen = true;
    modal.overlay.style.display = 'block';
    
    // Animate in
    requestAnimationFrame(() => {
      modal.overlay.style.opacity = '1';
      modal.container.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    // Track widget open
    trackEvent('widget_opened');
    
    // Disable body scroll
    document.body.style.overflow = 'hidden';
  }

  // Close widget
  function closeWidget() {
    if (!isOpen || !modal) return;
    
    isOpen = false;
    
    // Animate out
    modal.overlay.style.opacity = '0';
    modal.container.style.transform = 'translate(-50%, -50%) scale(0.9)';
    
    setTimeout(() => {
      modal.overlay.style.display = 'none';
      document.body.style.overflow = '';
    }, 300);

    // Track widget close
    trackEvent('widget_closed');
  }

  // Simple event tracking
  function trackEvent(eventName) {
    try {
      // Send to SignalsLoop analytics
      fetch('${process.env.NEXT_PUBLIC_APP_URL || 'https://signalsloop.com'}/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: eventName,
          apiKey: CONFIG.apiKey,
          url: window.location.href,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {}); // Fail silently
    } catch (e) {
      // Fail silently
    }
  }

  // Initialize widget
  function initWidget() {
    // Don't load on admin pages or if already loaded
    if (window.location.href.includes('/admin') || 
        window.location.href.includes('/settings') ||
        document.getElementById(WIDGET_ID)) {
      return;
    }

    const button = createWidgetButton();
    document.body.appendChild(button);

    // Track widget load
    trackEvent('widget_loaded');

    // Add to global scope for API access
    window.SignalsLoopWidget = {
      open: openWidget,
      close: closeWidget,
      config: CONFIG,
      version: '1.0.0'
    };

    console.log('SignalsLoop widget loaded for', CONFIG.projectName);
    console.log('Widget config:', CONFIG);
    console.log('Iframe URL:', IFRAME_URL);
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

  // Listen for messages from iframe
  window.addEventListener('message', function(event) {
    if (event.origin !== '${process.env.NEXT_PUBLIC_APP_URL || 'https://signalsloop.com'}') {
      return;
    }

    if (event.data.type === 'signalsloop_close') {
      closeWidget();
    } else if (event.data.type === 'signalsloop_submitted') {
      // Show success message or perform action
      trackEvent('feedback_submitted');
      // Optional: Keep modal open or close it
      setTimeout(closeWidget, 2000); // Close after 2 seconds
    }
  });

})();
`;
}

// OPTIONS endpoint for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
