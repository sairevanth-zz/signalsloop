import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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

    // Validate API key and get project info
    let project = null;
    let projectSlug = key;
    
    // First, try to find by API key in api_keys table
    const keyHashBase64 = Buffer.from(key, 'utf8').toString('base64');
    const sha256Hash = crypto.createHash('sha256').update(key).digest('hex');

    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select(`
        id,
        project_id,
        name,
        usage_count,
        projects!inner(id, name, slug, plan)
      `)
      .eq('key_hash', keyHashBase64)
      .single();

    if (apiKeyData && apiKeyData.projects) {
      // Valid API key found
      project = apiKeyData.projects;
      projectSlug = project.slug;
      
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
      // Fallback to legacy hashed key (sha256 hex)
      const { data: hashedKeyData } = await supabase
        .from('api_keys')
        .select(`
          id,
          project_id,
          name,
          usage_count,
          projects!inner(id, name, slug, plan)
        `)
        .eq('key_hash', sha256Hash)
        .single();

      if (hashedKeyData && hashedKeyData.projects) {
        project = hashedKeyData.projects;
        projectSlug = project.slug;

        await supabase
          .from('api_keys')
          .update({
            usage_count: (hashedKeyData.usage_count || 0) + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('id', hashedKeyData.id);

        console.log('Valid (legacy) API key found:', key, 'for project:', project.name);
      } else {
      // Fallback: try to find project by slug (for demo purposes)
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, slug, plan')
        .eq('slug', key)
        .single();

      if (projectData) {
        project = projectData;
        projectSlug = project.slug;
        console.log('Project found by slug:', key, 'project:', project.name);
      } else {
        // If no valid API key or project found, return error
        return new NextResponse('Invalid API key', { status: 401 });
      }
      }
    }

    // Generate the widget JavaScript
    const planValue = typeof project?.plan === 'string' ? project.plan.toLowerCase() : '';
    const isPro = planValue === 'pro' || planValue.startsWith('pro_');
    const widgetScript = generateWidgetScript({
      apiKey: key,
      projectSlug: projectSlug,
      projectName: project?.name || 'SignalsLoop',
      position,
      color,
      text,
      size,
      theme,
      isPro
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

  const BLOCKED_HOST_PATTERNS = ['stripe.com'];
  const hostname = window.location.hostname || '';
  if (BLOCKED_HOST_PATTERNS.some(pattern => hostname === pattern || hostname.endsWith('.' + pattern))) {
    if (window.console && typeof window.console.debug === 'function') {
      console.debug('SignalsLoop widget disabled on host', hostname);
    }
    return;
  }
  
  // Prevent multiple widget loads
  if (window.SignalsLoopWidget) {
    if (window.console && typeof window.console.debug === 'function') {
      console.debug('SignalsLoop widget already loaded');
    }
    return;
  }

  // Widget configuration
  const CONFIG = ${JSON.stringify(config)};
  const WIDGET_ID = 'signalsloop-widget-' + Math.random().toString(36).substr(2, 9);
  const IFRAME_URL = 'https://www.signalsloop.com/embed/' + CONFIG.apiKey + '/frame?theme=' + CONFIG.theme + '&color=' + encodeURIComponent(CONFIG.color) + (CONFIG.isPro ? '&hide_branding=true' : '');

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

  // Create widget button in an iframe for complete isolation
  function createWidgetButton() {
    const position = POSITIONS[CONFIG.position] || POSITIONS['bottom-right'];

    // Create an iframe to isolate the button from page styles
    const iframe = document.createElement('iframe');
    iframe.id = WIDGET_ID + '-frame';

    // Set styles using setProperty with !important
    iframe.style.setProperty('position', 'fixed', 'important');
    iframe.style.setProperty('width', '120px', 'important');
    iframe.style.setProperty('height', '50px', 'important');
    iframe.style.setProperty('border', 'none', 'important');
    iframe.style.setProperty('background', 'transparent', 'important');
    iframe.style.setProperty('z-index', '2147483647', 'important');
    iframe.style.setProperty('pointer-events', 'auto', 'important');

    // Set position values - ONLY set the ones that aren't 'auto'
    if (position.top && position.top !== 'auto') {
      iframe.style.setProperty('top', position.top, 'important');
    }
    if (position.bottom && position.bottom !== 'auto') {
      iframe.style.setProperty('bottom', position.bottom, 'important');
    }
    if (position.left && position.left !== 'auto') {
      iframe.style.setProperty('left', position.left, 'important');
    }
    if (position.right && position.right !== 'auto') {
      iframe.style.setProperty('right', position.right, 'important');
    }
    if (position.transform) {
      iframe.style.setProperty('transform', position.transform, 'important');
    }

    if (window.console && typeof window.console.debug === 'function') {
      console.debug('Widget iframe position:', {
        top: iframe.style.top,
        bottom: iframe.style.bottom,
        left: iframe.style.left,
        right: iframe.style.right,
        position: CONFIG.position
      });
    }

    // Append iframe to body
    document.body.appendChild(iframe);

    // Use absolute positioning relative to body, update on scroll
    function enforceIframePosition() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;

      // Calculate position to keep it in viewport
      if (CONFIG.position === 'bottom-right' || !CONFIG.position) {
        const top = scrollTop + windowHeight - 70; // 50px height + 20px margin
        const left = scrollLeft + windowWidth - 140; // 120px width + 20px margin
        iframe.style.setProperty('position', 'absolute', 'important');
        iframe.style.setProperty('top', top + 'px', 'important');
        iframe.style.setProperty('left', left + 'px', 'important');
        iframe.style.removeProperty('bottom');
        iframe.style.removeProperty('right');
      } else if (CONFIG.position === 'bottom-left') {
        const top = scrollTop + windowHeight - 70;
        const left = scrollLeft + 20;
        iframe.style.setProperty('position', 'absolute', 'important');
        iframe.style.setProperty('top', top + 'px', 'important');
        iframe.style.setProperty('left', left + 'px', 'important');
        iframe.style.removeProperty('bottom');
        iframe.style.removeProperty('right');
      } else if (CONFIG.position === 'top-right') {
        const top = scrollTop + 20;
        const left = scrollLeft + windowWidth - 140;
        iframe.style.setProperty('position', 'absolute', 'important');
        iframe.style.setProperty('top', top + 'px', 'important');
        iframe.style.setProperty('left', left + 'px', 'important');
        iframe.style.removeProperty('bottom');
        iframe.style.removeProperty('right');
      } else if (CONFIG.position === 'top-left') {
        const top = scrollTop + 20;
        const left = scrollLeft + 20;
        iframe.style.setProperty('position', 'absolute', 'important');
        iframe.style.setProperty('top', top + 'px', 'important');
        iframe.style.setProperty('left', left + 'px', 'important');
        iframe.style.removeProperty('bottom');
        iframe.style.removeProperty('right');
      }
    }

    // Enforce immediately
    enforceIframePosition();

    // Re-enforce on scroll, resize, and periodically
    window.addEventListener('scroll', enforceIframePosition, { passive: true });
    window.addEventListener('resize', enforceIframePosition);

    // Enforce every 50ms for smooth scrolling
    setInterval(enforceIframePosition, 50);

    // Write button HTML into iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(
      '<!DOCTYPE html>' +
      '<html>' +
        '<head>' +
          '<style>' +
            '* { margin: 0; padding: 0; box-sizing: border-box; }' +
            'body {' +
              'overflow: hidden;' +
              'background: transparent;' +
              'width: 120px;' +
              'height: 50px;' +
            '}' +
            '#btn {' +
              'position: absolute;' +
              'bottom: 0;' +
              'right: 0;' +
              'background-color: ' + CONFIG.color + ';' +
              'color: white;' +
              'border: none;' +
              'border-radius: 25px;' +
              'padding: 12px 20px;' +
              'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;' +
              'font-size: 16px;' +
              'font-weight: 600;' +
              'cursor: pointer;' +
              'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);' +
              'pointer-events: auto;' +
              'transition: all 0.2s ease;' +
            '}' +
            '#btn:hover {' +
              'transform: scale(1.05);' +
              'box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);' +
            '}' +
          '</style>' +
        '</head>' +
        '<body>' +
          '<button id="btn">' + CONFIG.text + '</button>' +
        '</body>' +
      '</html>'
    );
    iframeDoc.close();

    // Get button from iframe and add click handler
    const button = iframeDoc.getElementById('btn');
    button.addEventListener('click', openWidget);

    // Make iframe pointer-events work for button
    iframe.style.pointerEvents = 'auto';

    return iframe;
  }

  // Create modal overlay
  function createModal() {
    const overlay = document.createElement('div');
    overlay.id = WIDGET_ID + '-overlay';
    
    // Detect mobile devices
    const isMobile = window.innerWidth <= 1024 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: isMobile ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      zIndex: '1000000',
      display: 'none',
      opacity: '0',
      transition: 'opacity 0.3s ease'
    });

    // Create iframe container
    const container = document.createElement('div');
    
    // Mobile-first styles
    if (isMobile) {
      Object.assign(container.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        width: '100%',
        height: '100vh',
        transform: 'translateY(100%)',
        backgroundColor: 'white',
        borderRadius: '0',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.25)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      });
    } else {
      Object.assign(container.style, {
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%) scale(0.9)',
        width: '90%',
        maxWidth: '500px',
        height: 'calc(100vh - 40px)',
        maxHeight: '600px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
        transition: 'transform 0.3s ease',
        overflow: 'auto' // CHANGED: enable scrolling in container
      });
    }

    // Create scroll wrapper for iOS fix
    let scrollWrapper;
    if (isMobile) {
      scrollWrapper = document.createElement('div');
      Object.assign(scrollWrapper.style, {
        width: '100%',
        height: '100%',
        overflowY: 'scroll',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        position: 'relative'
      });
      scrollWrapper.style.height = 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))';
      scrollWrapper.style.maxHeight = '100vh';
      scrollWrapper.style.paddingBottom = 'env(safe-area-inset-bottom)';
    }

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = IFRAME_URL;
    iframe.setAttribute('allow', 'clipboard-write');
    if (isMobile) {
      iframe.setAttribute('scrolling', 'yes');
    }
    // Don't set scrolling attribute - let it be auto
    Object.assign(iframe.style, {
      width: '100%',
      height: '100%',
      border: 'none',
      borderRadius: isMobile ? '0' : '12px'
    });

    function updateIframeHeight(contentHeight) {
      if (!contentHeight) return;
      const minHeight = isMobile ? window.innerHeight : 380;
      const targetHeight = Math.max(contentHeight + 40, minHeight);
      iframe.style.height = targetHeight + 'px';
    }

    // Listen for height messages from iframe for iOS scrolling
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'signalsloop-resize' && e.data.height) {
        updateIframeHeight(e.data.height);
      }
    });

    // Ensure initial sizing
    updateIframeHeight(window.innerHeight);

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.setAttribute('aria-label', 'Close feedback widget');
    
    // Mobile-optimized close button
    if (isMobile) {
      Object.assign(closeButton.style, {
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 12px)',
        right: '12px',
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        color: 'white',
        fontSize: '24px',
        fontWeight: 'bold',
        cursor: 'pointer',
        zIndex: '10',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent'
      });
    } else {
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
    }

    closeButton.addEventListener('click', closeWidget);
    
    // Touch feedback for mobile
    if (isMobile) {
      closeButton.addEventListener('touchstart', function() {
        closeButton.style.transform = 'scale(0.9)';
        closeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      });
      closeButton.addEventListener('touchend', function() {
        closeButton.style.transform = 'scale(1)';
        closeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
      });
    } else {
      closeButton.addEventListener('mouseenter', function() {
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 1)';
        closeButton.style.color = '#333';
      });
      closeButton.addEventListener('mouseleave', function() {
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        closeButton.style.color = '#666';
      });
    }

    if (isMobile) {
      scrollWrapper.appendChild(iframe);
      container.appendChild(scrollWrapper);
      container.appendChild(closeButton);
    } else {
      container.appendChild(iframe);
      container.appendChild(closeButton);
    }
    overlay.appendChild(container);

    // Close on overlay click (desktop only)
    if (!isMobile) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          closeWidget();
        }
      });
    }

    // Close on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.style.display === 'block') {
        closeWidget();
      }
    });
    
    // Store mobile state for later use
    overlay.dataset.isMobile = isMobile.toString();

    return { overlay, container, iframe, isMobile };
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
    
    // Animate in with mobile-specific transforms
    requestAnimationFrame(() => {
      modal.overlay.style.opacity = '1';
      if (modal.isMobile) {
        modal.container.style.transform = 'translateY(0)';
      } else {
        modal.container.style.transform = 'translateX(-50%) scale(1)';
      }
    });

    // Track widget open
    trackEvent('widget_opened');
    
    // Disable body scroll and prevent iOS bounce
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = '-' + window.scrollY + 'px';
  }

  // Close widget
  function closeWidget() {
    if (!isOpen || !modal) return;
    
    isOpen = false;
    
    // Store scroll position before closing
    const scrollY = parseInt(document.body.style.top || '0') * -1;
    
    // Animate out with mobile-specific transforms
    modal.overlay.style.opacity = '0';
    if (modal.isMobile) {
      modal.container.style.transform = 'translateY(100%)';
    } else {
      modal.container.style.transform = 'translateX(-50%) scale(0.9)';
    }
    
    setTimeout(() => {
      modal.overlay.style.display = 'none';
      
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      
      // Restore scroll position
      if (scrollY > 0) {
        window.scrollTo(0, scrollY);
      }
    }, 300);

    // Track widget close
    trackEvent('widget_closed');
  }

  // Simple event tracking
  function trackEvent(eventName) {
    try {
      // Send to SignalsLoop analytics
      fetch('${process.env.NEXT_PUBLIC_APP_URL || 'https://www.signalsloop.com'}/api/analytics/events', {
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

    const iframe = createWidgetButton();
    // iframe is already appended to body in createWidgetButton()

    // Track widget load
    trackEvent('widget_loaded');

    // Add to global scope for API access
    window.SignalsLoopWidget = {
      open: openWidget,
      close: closeWidget,
      config: CONFIG,
      version: '1.0.0'
    };

    if (window.console && typeof window.console.debug === 'function') {
      console.debug('SignalsLoop widget loaded for', CONFIG.projectName);
    }
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

  // Listen for messages from iframe
  window.addEventListener('message', function(event) {
    if (event.origin !== '${process.env.NEXT_PUBLIC_APP_URL || 'https://www.signalsloop.com'}') {
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
