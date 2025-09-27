# Enhanced API Keys System - Complete Guide

## Overview

The enhanced API Keys system provides comprehensive widget management with advanced features including live preview, analytics, security controls, and platform-specific installation guides.

## 🚀 New Features

### 1. Live Widget Preview System
- **Desktop/Mobile Toggle**: Test how your widget looks on different screen sizes
- **Real-time Customization**: See changes instantly as you modify settings
- **Visual Website Mockup**: Preview widget placement on a simulated website
- **Animation Controls**: Test different animation speeds (slow, medium, fast)
- **Position Testing**: Visual position selector with directional indicators

### 2. Platform-Specific Installation Guides
- **HTML**: Standard script tag implementation
- **React**: useEffect hook with proper cleanup
- **WordPress**: functions.php integration with wp_enqueue_script
- **Squarespace**: Code injection in footer settings
- **Step-by-step Instructions**: Detailed guides for each platform
- **Troubleshooting**: Common issues and solutions
- **Video Tutorials**: Embedded walkthrough videos
- **Full Documentation**: Links to comprehensive guides

### 3. Advanced Analytics Dashboard
- **Key Metrics**: Total loads, submissions, conversion rates
- **Top Referring Domains**: See which sites drive the most traffic
- **Geographic Distribution**: Understand your global audience
- **Performance Over Time**: Track trends and optimize performance
- **Real-time Data**: Live updates from widget usage
- **Export Capabilities**: Download analytics reports

### 4. Enhanced Widget Customization
- **Brand Color Palette**: 12 predefined color options
- **Custom Color Picker**: Full hex color support
- **Position Grid**: Visual position selector with emojis
- **Animation Speed**: Three speed options with visual indicators
- **Character Counter**: Real-time text length tracking
- **Custom CSS**: Pro users can add custom styling
- **Export/Import**: Save and share widget configurations

### 5. Security & Access Control
- **Domain Allowlisting**: Restrict widget to specific domains
- **Usage Limits**: Set monthly usage caps
- **Suspicious Activity Detection**: Automated security monitoring
- **Security Alerts**: Real-time notifications for security events
- **Activity Logs**: Track all security-related changes
- **Key Rotation**: One-click API key rotation
- **Audit Trail**: Complete history of security actions

## 📊 Analytics Features

### Widget Performance Metrics
```typescript
interface WidgetAnalytics {
  totalLoads: number;           // Total widget loads
  totalSubmissions: number;     // Feedback submissions
  conversionRate: number;       // Load-to-submission rate
  topDomains: Array<{           // Top referring domains
    domain: string;
    count: number;
  }>;
  geographicData: Array<{       // Geographic distribution
    country: string;
    count: number;
  }>;
  performanceOverTime: Array<{  // Time-series data
    date: string;
    loads: number;
    submissions: number;
  }>;
}
```

### Security Monitoring
- **Real-time Alerts**: Instant notifications for security events
- **Usage Monitoring**: Track usage patterns and detect anomalies
- **Domain Validation**: Ensure widgets only load on authorized domains
- **Rate Limiting**: Prevent abuse and excessive usage

## 🛠️ Installation Guides

### HTML Implementation
```html
<script src="https://signalsloop.com/embed/your-api-key.js"></script>
```

### React Implementation
```jsx
import { useEffect } from 'react';

useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://signalsloop.com/embed/your-api-key.js';
  script.async = true;
  document.body.appendChild(script);
  
  return () => {
    document.body.removeChild(script);
  };
}, []);
```

### WordPress Implementation
```php
function add_signalsloop_widget() {
    wp_enqueue_script('signalsloop-widget', 'https://signalsloop.com/embed/your-api-key.js', array(), '1.0', true);
}
add_action('wp_enqueue_scripts', 'add_signalsloop_widget');
```

### Squarespace Implementation
```html
<!-- Add to Settings > Advanced > Code Injection > Footer -->
<script src="https://signalsloop.com/embed/your-api-key.js" async></script>
```

## 🎨 Customization Options

### Brand Colors
Predefined color palette with 12 professional options:
- `#667eea` - Primary Blue
- `#764ba2` - Purple Gradient
- `#f093fb` - Pink Gradient
- `#f5576c` - Red Gradient
- `#4facfe` - Light Blue
- `#00f2fe` - Cyan
- `#43e97b` - Green
- `#38f9d7` - Teal
- `#fa709a` - Rose
- `#fee140` - Yellow
- `#a8edea` - Mint
- `#d299c2` - Lavender

### Position Options
- **Top Left** (↖️): Upper-left corner
- **Top Right** (↗️): Upper-right corner
- **Bottom Left** (↙️): Lower-left corner
- **Bottom Right** (↘️): Lower-right corner (default)

### Animation Speeds
- **Slow** (🐌): 3-second pulse animation
- **Medium** (⚡): 2-second pulse animation (default)
- **Fast** (🚀): 1-second pulse animation

## 🔒 Security Features

### Domain Allowlisting
Restrict widget access to specific domains:
```
example.com
*.example.com
subdomain.example.com
```

### Usage Limits
Set monthly usage caps to prevent abuse:
- **Free Plan**: 10,000 loads/month
- **Pro Plan**: 100,000 loads/month
- **Enterprise**: Unlimited

### Security Alerts
Real-time notifications for:
- High usage detection (95% of limit)
- Suspicious domain access attempts
- API key rotation events
- Unusual geographic patterns

## 📱 Mobile Optimization

### Responsive Design
- **Mobile Preview**: Test widget appearance on mobile devices
- **Touch Targets**: Minimum 44px touch targets for accessibility
- **Viewport Adaptation**: Automatic sizing for different screen sizes
- **Performance**: Optimized loading for mobile networks

### Mobile-Specific Features
- **Swipe Gestures**: Natural mobile interactions
- **Bottom Sheet**: Mobile-friendly modal presentation
- **Keyboard Handling**: Proper keyboard avoidance
- **Orientation Support**: Works in both portrait and landscape

## 🚀 Pro Features

### Custom CSS Support
```css
/* Custom CSS for your widget */
.signalsloop-widget {
  border-radius: 20px !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
  transform: scale(1.1);
}

.signalsloop-widget:hover {
  transform: scale(1.15);
  transition: transform 0.3s ease;
}
```

### Advanced Analytics
- **Custom Events**: Track specific user interactions
- **A/B Testing**: Test different widget configurations
- **Conversion Funnels**: Analyze user journey
- **Real-time Dashboards**: Live analytics updates

### White-label Options
- **Remove Branding**: Hide "Powered by SignalsLoop"
- **Custom Domains**: Use your own domain for widget scripts
- **Custom Styling**: Complete visual customization
- **API Access**: Direct API integration

## 🔧 Troubleshooting

### Common Issues

#### Widget Not Appearing
1. Check browser console for JavaScript errors
2. Verify API key is active and has correct permissions
3. Ensure script loads before closing `</body>` tag
4. Clear browser cache and reload page

#### Performance Issues
1. Check network connectivity
2. Verify domain is in allowlist (if configured)
3. Monitor usage limits
4. Check for conflicting JavaScript

#### Styling Issues
1. Verify CSS specificity
2. Check for conflicting stylesheets
3. Test in different browsers
4. Validate custom CSS syntax

### Support Resources
- **Video Tutorials**: Step-by-step walkthroughs
- **Documentation**: Comprehensive guides
- **Community Forum**: User discussions and solutions
- **Direct Support**: Email support for Pro users

## 📈 Best Practices

### Performance Optimization
1. **Lazy Loading**: Load widget only when needed
2. **Caching**: Implement proper caching strategies
3. **CDN**: Use content delivery networks
4. **Monitoring**: Track performance metrics

### Security Best Practices
1. **Regular Key Rotation**: Rotate API keys monthly
2. **Domain Restrictions**: Use domain allowlisting
3. **Usage Monitoring**: Set appropriate usage limits
4. **Audit Logs**: Regularly review security logs

### User Experience
1. **Clear Messaging**: Use descriptive button text
2. **Accessible Design**: Ensure proper contrast and sizing
3. **Mobile First**: Design for mobile devices first
4. **Fast Loading**: Optimize for quick widget appearance

## 🎯 Future Enhancements

### Planned Features
- **A/B Testing**: Built-in widget testing capabilities
- **Advanced Analytics**: More detailed performance metrics
- **Custom Themes**: Pre-built widget themes
- **Multi-language**: Internationalization support
- **API Webhooks**: Real-time event notifications
- **Team Collaboration**: Multi-user management

### Integration Roadmap
- **Shopify**: Native Shopify app integration
- **Webflow**: Direct Webflow integration
- **Wix**: Wix widget marketplace
- **WordPress Plugin**: Official WordPress plugin
- **React Component**: NPM package for React apps

## 📞 Support

For questions or issues with the enhanced API Keys system:

1. **Check Documentation**: Review this guide first
2. **Community Forum**: Search existing discussions
3. **Video Tutorials**: Watch step-by-step guides
4. **Contact Support**: Email support@signalsloop.com

---

*This enhanced API Keys system provides enterprise-grade widget management with comprehensive analytics, security, and customization options. Start with the basics and gradually explore advanced features as your needs grow.*
