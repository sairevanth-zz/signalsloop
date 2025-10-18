import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export async function GET(
  request,
  { params }
) {
  try {
    const resolvedParams = await params;
    const { key } = resolvedParams;
    const url = new URL(request.url);
    const theme = url.searchParams.get('theme') || 'light';
    const customColor = url.searchParams.get('color');
    const hideBranding = url.searchParams.get('hide_branding') === 'true';

    // Validate API key and get project info
    let project = null;
    
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
      console.log('Valid API key found in frame:', key, 'for project:', project.name);
    } else {
      // Fallback: try to find project by slug (for demo purposes)
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, slug, plan')
        .eq('slug', key)
        .single();

      if (projectData) {
        project = projectData;
        console.log('Project found by slug in frame:', key, 'project:', project.name);
      } else {
        return new NextResponse('Invalid API key', { status: 401 });
      }
    }

    // Get recent posts with vote counts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        category,
        vote_count,
        created_at,
        author_name,
        author_email
      `)
      .eq('project_id', project.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(10);

    if (postsError) {
      console.error('Error fetching posts:', postsError);
    }

    // Generate the iframe HTML
    const html = generateFrameHTML({
      project,
      posts: posts || [],
      theme,
      customColor,
      hideBranding: hideBranding && project.plan === 'pro',
      isPro: project.plan === 'pro'
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': "frame-ancestors 'self' https://*.signalsloop.com https://signalsloop.com;"
      }
    });

  } catch (error) {
    console.error('Widget frame error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

function generateFrameHTML(config) {
  const { project, posts, theme, customColor, hideBranding, isPro } = config;
  
  // Use custom color if provided, otherwise default to blue
  const primaryColor = customColor || '#6366f1';
  const primaryColorHover = adjustBrightness(primaryColor, -10);
  const primaryColorSoft = hexToRgba(primaryColor, 0.12);
  
  return `
<!DOCTYPE html>
<html lang="en" class="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name} - Feedback</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    :root {
      --sl-primary: ${primaryColor};
      --sl-primary-hover: ${primaryColorHover};
      --sl-primary-soft: ${primaryColorSoft};
    }
    
    html {
      overflow-y: auto;
      min-height: 100%;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      overflow-y: auto;
      min-height: 100vh;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      padding-bottom: 150px; /* Increased to ensure submit button is visible */
      min-height: calc(100vh - 40px);
    }
    
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    
    .header h1 {
      font-size: 24px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 8px;
    }
    
    .header p {
      color: #64748b;
      font-size: 14px;
    }
    
    .form-container {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    .form-group label {
      display: block;
      font-weight: 500;
      margin-bottom: 6px;
      color: #374151;
    }
    
    .form-group input,
    .form-group textarea,
    .form-group select {
      width: 100%;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s;
    }
    
    .form-group input:focus,
    .form-group textarea:focus,
    .form-group select:focus {
      outline: none;
      border-color: ${primaryColor};
      box-shadow: 0 0 0 3px ${primaryColor}20;
    }

    .form-label {
      display: block;
      font-weight: 500;
      margin-bottom: 10px;
      font-size: 14px;
      color: #374151;
    }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
    }

    .category-option {
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      padding: 12px 14px;
      background: white;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .category-option:hover {
      border-color: var(--sl-primary);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
    }

    .category-option.active {
      border-color: var(--sl-primary);
      background: var(--sl-primary-soft);
      box-shadow: 0 6px 18px rgba(99, 102, 241, 0.15);
    }

    .category-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #111827;
      font-size: 14px;
    }

    .category-option.active .category-title {
      color: var(--sl-primary);
    }

    .category-emoji {
      font-size: 18px;
      line-height: 1;
    }

    .category-description {
      font-size: 12px;
      color: #6b7280;
      line-height: 1.4;
    }

    .priority-group {
      display: flex;
      gap: 8px;
    }

    .priority-btn {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .priority-btn:hover {
      border-color: var(--sl-primary);
    }

    .priority-btn.active {
      border: 2px solid var(--sl-primary);
      color: var(--sl-primary);
      background: var(--sl-primary-soft);
    }

    .form-group textarea {
      resize: vertical;
      min-height: 80px;
    }
    
    .char-count {
      font-size: 12px;
      color: #9ca3af;
      text-align: right;
      margin-top: 4px;
    }
    
    .char-count.warning {
      color: #f59e0b;
    }
    
    .char-count.error {
      color: #ef4444;
    }
    
    .submit-btn {
      width: 100%;
      background: ${primaryColor};
      color: white;
      border: none;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .submit-btn:hover:not(:disabled) {
      background: ${primaryColorHover};
    }
    
    .submit-btn:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
    
    .posts-container {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .posts-header {
      display: flex;
      justify-content: between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .posts-header h2 {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
    }
    
    .post {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      transition: box-shadow 0.2s;
    }
    
    .post:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .post-header {
      display: flex;
      justify-content: between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    
    .post-title {
      font-weight: 500;
      color: #1e293b;
      margin-bottom: 4px;
    }
    
    .post-category {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    
    .post-category.feature {
      background: #dbeafe;
      color: #1d4ed8;
    }
    
    .post-category.bug {
      background: #fee2e2;
      color: #dc2626;
    }
    
    .post-category.improvement {
      background: #d1fae5;
      color: #059669;
    }
    
    .post-category.other {
      background: #f3f4f6;
      color: #6b7280;
    }
    
    .post-content {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 12px;
    }
    
    .post-footer {
      display: flex;
      justify-content: between;
      align-items: center;
    }
    
    .post-meta {
      font-size: 12px;
      color: #9ca3af;
    }
    
    .vote-button {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .vote-button:hover {
      background: ${primaryColor};
      color: white;
      border-color: ${primaryColor};
    }
    
    .vote-button.voted {
      background: ${primaryColor};
      color: white;
      border-color: ${primaryColor};
    }
    
    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
      color: #6b7280;
    }
    
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #e5e7eb;
      border-top: 2px solid ${primaryColor};
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 8px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .error-message {
      background: #fee2e2;
      color: #dc2626;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    
    .success-message {
      background: #d1fae5;
      color: #059669;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    
    .footer-text {
      font-size: 12px;
      color: #9ca3af;
    }
    
    .footer-text a {
      color: ${primaryColor};
      text-decoration: none;
    }
    
    .footer-text a:hover {
      text-decoration: underline;
    }
    
    /* Mobile responsive */
    @media (max-width: 640px) {
      .container {
        padding: 16px;
      }
      
      .form-container,
      .posts-container {
        padding: 16px;
      }
      
      .header h1 {
        font-size: 20px;
      }
      
      .post {
        padding: 12px;
      }
      
      .post-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .category-grid {
        grid-template-columns: 1fr;
      }

    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${project.name}</h1>
      <p>Share your feedback and ideas</p>
    </div>
    
    <div class="form-container">
      <form id="feedback-form">
        <!-- Feedback Category -->
        <div class="form-group">
          <label class="form-label">Feedback Category *</label>
          <div class="category-grid" id="category-grid"></div>
          <input type="hidden" id="category" name="category" value="Feature Request">
        </div>

        <div class="form-group">
          <label for="title">Title *</label>
          <input type="text" id="title" name="title" maxlength="100" required placeholder="Brief summary of your feedback">
          <div class="char-count" id="title-count">0/100</div>
        </div>

        <div class="form-group">
          <label for="description">Description *</label>
          <textarea id="description" name="description" maxlength="500" required placeholder="Describe your feedback in detail..."></textarea>
          <div class="char-count" id="desc-count">0/500</div>
        </div>

        <!-- Priority -->
        <div class="form-group">
          <label class="form-label">Priority</label>
          <div class="priority-group">
            <button type="button" class="priority-btn" data-priority="low">Low</button>
            <button type="button" class="priority-btn active" data-priority="medium">Medium</button>
            <button type="button" class="priority-btn" data-priority="high">High</button>
          </div>
          <input type="hidden" id="priority" name="priority" value="medium">
        </div>

        <div class="form-group">
          <label for="name">Your Name *</label>
          <input type="text" id="name" name="name" required placeholder="John Doe">
        </div>

        <div class="form-group">
          <label for="email">Email *</label>
          <input type="email" id="email" name="email" required placeholder="your@email.com">
          <p style="margin: 6px 0 0 0; font-size: 12px; color: #6b7280;">We'll notify you about updates on your feedback</p>
        </div>

        <!-- Honeypot field -->
        <input type="text" name="website" style="display: none;" tabindex="-1" autocomplete="off">

        <button type="submit" class="submit-btn" id="submit-btn">
          Submit Feedback
        </button>
      </form>

      <div style="text-align: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <a href="https://www.signalsloop.com/${project.slug}/board" target="_blank" style="color: ${primaryColor}; text-decoration: none; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;">
          View all feedback & vote
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
      </div>
    </div>
    
    ${!hideBranding ? `
    <div class="footer">
      <p class="footer-text">
        Powered by <a href="https://signalsloop.com" target="_blank">SignalsLoop</a>
      </p>
    </div>
    ` : ''}
  </div>

  <script>
    const CONFIG = {
      projectSlug: '${project.slug}'
    };
    
    const form = document.getElementById('feedback-form');
    const titleInput = document.getElementById('title');
    const descInput = document.getElementById('description');
    const titleCount = document.getElementById('title-count');
    const descCount = document.getElementById('desc-count');
    const submitBtn = document.getElementById('submit-btn');
    const categoryInput = document.getElementById('category');
    const categoryGrid = document.getElementById('category-grid');
    const priorityButtons = document.querySelectorAll('.priority-btn');
    const priorityInput = document.getElementById('priority');

    const CATEGORY_OPTIONS = [
      { value: 'Feature Request', label: 'Feature Request', emoji: '✨', description: 'Suggest a new feature or capability' },
      { value: 'Bug', label: 'Bug Report', emoji: '🐞', description: 'Report a problem or defect' },
      { value: 'Improvement', label: 'Improvement', emoji: '💡', description: 'Enhance an existing feature or workflow' },
      { value: 'UI/UX', label: 'UI / UX', emoji: '🎨', description: 'Share design, usability, or user experience feedback' },
      { value: 'Integration', label: 'Integration', emoji: '🔌', description: 'Connect SignalsLoop with other tools or APIs' },
      { value: 'Performance', label: 'Performance', emoji: '🚀', description: 'Speed, stability, or reliability issues' },
      { value: 'Documentation', label: 'Documentation', emoji: '📚', description: 'Guides, onboarding, or help content' },
      { value: 'Other', label: 'Other', emoji: '💬', description: 'Anything else that doesn’t fit above' }
    ];

    function updateCharCount(input, counter, max) {
      const count = input.value.length;
      counter.textContent = count + '/' + max;
      
      if (count > max * 0.9) {
        counter.classList.add('warning');
        if (count >= max) {
          counter.classList.add('error');
        }
      } else {
        counter.classList.remove('warning', 'error');
      }
    }
    
    titleInput.addEventListener('input', () => updateCharCount(titleInput, titleCount, 100));
    descInput.addEventListener('input', () => updateCharCount(descInput, descCount, 500));

    let categoryButtons = [];

    function renderCategoryOptions() {
      categoryGrid.innerHTML = '';
      CATEGORY_OPTIONS.forEach((option) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'category-option';
        button.dataset.value = option.value;
        button.innerHTML =
          '<div class="category-title">' +
            '<span class="category-emoji">' + option.emoji + '</span>' +
            option.label +
          '</div>' +
          '<p class="category-description">' + option.description + '</p>';
        button.addEventListener('click', () => setActiveCategory(option.value));
        categoryGrid.appendChild(button);
      });
      categoryButtons = Array.from(categoryGrid.querySelectorAll('.category-option'));
    }

    function setActiveCategory(value) {
      categoryInput.value = value;
      categoryButtons.forEach((button) => {
        if (button.dataset.value === value) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      });
    }

    renderCategoryOptions();
    setActiveCategory(categoryInput.value || 'Feature Request');

    function setActivePriority(value) {
      priorityInput.value = value;
      priorityButtons.forEach((button) => {
        if (button.dataset.priority === value) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      });
    }

    priorityButtons.forEach((button) => {
      button.addEventListener('click', () => setActivePriority(button.dataset.priority));
    });

    setActivePriority(priorityInput.value || 'medium');

    updateCharCount(titleInput, titleCount, 100);
    updateCharCount(descInput, descCount, 500);

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Check honeypot
      if (form.website.value) {
        return; // Spam detected
      }
      
      const formData = new FormData(form);
      const data = {
        project_slug: CONFIG.projectSlug,
        title: formData.get('title'),
        content: formData.get('description') || formData.get('title'),
        category: formData.get('category'),
        priority: formData.get('priority'),
        author_name: formData.get('name'),
        user_email: formData.get('email')
      };

      // Validate
      if (!data.title.trim()) {
        showMessage('Please enter a title', 'error');
        return;
      }

      if (!data.content.trim()) {
        showMessage('Please enter a description', 'error');
        return;
      }

      if (!data.author_name || !data.author_name.trim()) {
        showMessage('Please enter your name', 'error');
        return;
      }

      if (!data.user_email || !data.user_email.trim()) {
        showMessage('Please enter your email', 'error');
        return;
      }
      
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      
      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error('Failed to submit feedback');
        }
        
        showMessage('Thank you! Your feedback has been submitted.', 'success');
        form.reset();
        updateCharCount(titleInput, titleCount, 100);
        updateCharCount(descInput, descCount, 500);

        setActiveCategory('Feature Request');
        setActivePriority('medium');

        // Track event
        trackEvent('feedback_submitted', {
          category: data.category,
          priority: data.priority,
          has_email: !!data.user_email,
          has_name: !!data.author_name
        });
        
      } catch (error) {
        console.error('Submission error:', error);
        showMessage('Failed to submit feedback. Please try again.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Feedback';
      }
    });


    // Message display
    function showMessage(message, type) {
      const existing = document.querySelector('.error-message, .success-message');
      if (existing) {
        existing.remove();
      }
      
      const messageEl = document.createElement('div');
      messageEl.className = type + '-message';
      messageEl.textContent = message;
      
      form.insertBefore(messageEl, form.firstChild);
      
      setTimeout(() => {
        messageEl.remove();
      }, 5000);
    }
    
    // Analytics tracking
    function trackEvent(event, properties = {}) {
      try {
        if (window.posthog) {
          window.posthog.capture(event, {
            widget: true,
            project_slug: CONFIG.projectSlug,
            ...properties
          });
        }
      } catch (error) {
        console.error('Analytics error:', error);
      }
    }

    // Send height to parent for iOS scrolling fix
    function sendHeight() {
      const height = document.body.scrollHeight;
      window.parent.postMessage({ type: 'signalsloop-resize', height: height }, '*');
    }

    // Send height on load and resize
    window.addEventListener('load', () => {
      sendHeight();
      // Also send height after a short delay to catch any dynamic content
      setTimeout(sendHeight, 100);
      setTimeout(sendHeight, 500);
    });

    // Observe DOM changes and send updated height
    const observer = new ResizeObserver(() => {
      sendHeight();
    });
    observer.observe(document.body);

    // Initialize
    trackEvent('widget_loaded');
  </script>
</body>
</html>`;
}

function generatePostsHTML(posts) {
  if (!posts.length) {
    return `
      <div class="loading">
        <div class="spinner"></div>
        Loading feedback...
      </div>
    `;
  }
  
  return posts.map(post => {
    const authorName = post.author_name || 'Anonymous';
    return `
    <div class="post">
      <div class="post-header">
        <div>
          <div class="post-title">${escapeHtml(post.title)}</div>
          <span class="post-category ${post.category}">${post.category}</span>
        </div>
      </div>

      ${post.description ? `<div class="post-content">${escapeHtml(post.description)}</div>` : ''}

      <div class="post-footer">
        <div class="post-meta">
          ${formatDate(post.created_at)} • ${escapeHtml(authorName)}
        </div>
        <button class="vote-button" data-post-id="${post.id}">
          ↑ ${post.vote_count || 0}
        </button>
      </div>
    </div>
  `}).join('');
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return diffDays + ' days ago';
  } else {
    return date.toLocaleDateString();
  }
}

function adjustBrightness(color, percent) {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

function hexToRgba(hex, alpha) {
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(char => char + char).join('');
  }
  const bigint = parseInt(cleaned, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
