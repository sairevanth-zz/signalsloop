# Mobile Testing Checklist for SignalLoop

## 📱 Device Testing Matrix

### iOS Devices
- [ ] iPhone SE (375px - smallest, most important)
- [ ] iPhone 12/13 Mini (375px)
- [ ] iPhone 12/13/14 (390px)
- [ ] iPhone 14 Plus (428px)
- [ ] iPhone 14 Pro Max (430px)
- [ ] iPhone X/11 (notched devices - safe areas)
- [ ] iPad Mini (768px)
- [ ] iPad Pro (1024px)

### Android Devices
- [ ] Small phone (360px)
- [ ] Standard phone (375-390px)
- [ ] Large phone (412-428px)
- [ ] Tablet (768px+)

### Browsers to Test
- [ ] Safari (iOS)
- [ ] Chrome (iOS)
- [ ] Chrome (Android)
- [ ] Firefox (Mobile)
- [ ] Samsung Internet (Android)

## 🎯 Core Functionality Tests

### Landing Page (/)
- [ ] Header is readable and functional
- [ ] Logo and branding visible
- [ ] Hero section text is readable
- [ ] CTA buttons are tappable (44px+)
- [ ] "Start Free" button works
- [ ] "Demo" link works
- [ ] Images load and fit properly
- [ ] All sections scroll smoothly
- [ ] No horizontal scrolling
- [ ] Footer is accessible and readable
- [ ] Navigation menu works (if present)
- [ ] Trust badges are visible or hidden appropriately

### Dashboard (/app)
- [ ] Projects grid displays properly
- [ ] Project cards are readable
- [ ] Search bar works
- [ ] Filters are accessible
- [ ] "Create Project" button works
- [ ] Mobile floating action button appears
- [ ] Analytics cards stack properly
- [ ] Sidebar hidden on mobile
- [ ] Quick actions work
- [ ] Project cards are tappable
- [ ] Loading states work
- [ ] Empty state displays properly

### Board Page (/[slug]/board)
- [ ] Header is responsive
- [ ] Filter toggle button works
- [ ] Filters expand/collapse properly
- [ ] Search input works with mobile keyboard
- [ ] Post cards are readable
- [ ] Vote buttons are tappable (44px+)
- [ ] Post cards clickable
- [ ] "Submit Feedback" button prominent
- [ ] No elements overflow
- [ ] Pagination works
- [ ] Empty state displays properly
- [ ] Category badges readable

### Post Submission Form
- [ ] Modal is full-screen on mobile
- [ ] Close button is tappable (44px+)
- [ ] Title input doesn't zoom on iOS
- [ ] Description textarea works properly
- [ ] Post type selection works
- [ ] Category dropdown works
- [ ] Email input with proper keyboard
- [ ] Submit button always visible
- [ ] Sticky header works
- [ ] Sticky footer works
- [ ] Form validates properly
- [ ] Success message displays
- [ ] Can submit another post
- [ ] AI features work (if Pro)

### Widget (/[slug]/widget)
- [ ] Widget button visible and tappable
- [ ] Widget opens full-screen on mobile
- [ ] Close button is prominent (44px+)
- [ ] Form fields work properly
- [ ] Textarea doesn't zoom on iOS
- [ ] Email input has email keyboard
- [ ] Category selector works
- [ ] Submit button always visible
- [ ] Success state displays
- [ ] Can submit multiple feedbacks
- [ ] Widget closes properly
- [ ] Body scroll restored after close

### Widget Embed (External Sites)
- [ ] Widget button loads on mobile
- [ ] Button is touch-friendly
- [ ] Modal opens full-screen on mobile
- [ ] Iframe content loads properly
- [ ] Close button works (44px, top-right)
- [ ] Touch feedback on close button
- [ ] Safe areas respected on notched devices
- [ ] Body scroll disabled when open
- [ ] Scroll position restored on close
- [ ] No overlay click on mobile (intentional)
- [ ] ESC key closes widget

## 📏 Design & UI Tests

### Touch Targets
- [ ] All buttons are minimum 44x44px
- [ ] Links have adequate touch area
- [ ] Form inputs are at least 44px tall
- [ ] Icon buttons are touch-friendly
- [ ] Checkbox/radio inputs are tappable
- [ ] Dropdown selectors are 44px+ tall
- [ ] Tab buttons are adequately sized

### Typography
- [ ] All text is readable (min 14px)
- [ ] Headings scale appropriately
- [ ] Line heights are comfortable
- [ ] Text doesn't overflow containers
- [ ] No text cut off at edges
- [ ] Font sizes respond to screen size

### Spacing & Layout
- [ ] Adequate padding on all containers
- [ ] Elements don't touch screen edges
- [ ] Proper spacing between sections
- [ ] Cards have breathing room
- [ ] No overlapping elements
- [ ] Safe areas respected (iOS notch)
- [ ] Bottom navigation doesn't overlap content

### Forms & Inputs
- [ ] Input font size is 16px (prevents iOS zoom)
- [ ] Email inputs use `inputMode="email"`
- [ ] Number inputs use `inputMode="numeric"`
- [ ] Proper `autocomplete` attributes
- [ ] Labels are clearly visible
- [ ] Error messages are readable
- [ ] Validation feedback is clear
- [ ] Submit buttons are prominent

### Images & Media
- [ ] Images fit within viewport
- [ ] Images load properly
- [ ] Proper aspect ratios maintained
- [ ] No broken images
- [ ] Loading states for images
- [ ] Responsive image sizes

## 🚀 Performance Tests

### Page Load
- [ ] Initial load < 3 seconds on 3G
- [ ] Fast 3G performance acceptable
- [ ] Slow 3G still functional
- [ ] No blocking resources
- [ ] Progressive enhancement works

### Interactions
- [ ] Touch response < 100ms
- [ ] No 300ms tap delay
- [ ] Smooth scrolling (60fps)
- [ ] No janky animations
- [ ] Fast route transitions
- [ ] Quick form submissions

### Bundle Size
- [ ] JavaScript bundle reasonable
- [ ] No unnecessary code loaded
- [ ] Code splitting working
- [ ] Lazy loading implemented

## ♿ Accessibility Tests

### Screen Reader
- [ ] All images have alt text
- [ ] Buttons have aria-labels
- [ ] Form inputs have labels
- [ ] Landmarks are proper
- [ ] Heading hierarchy correct

### Keyboard Navigation
- [ ] Tab order is logical
- [ ] All interactive elements focusable
- [ ] Focus indicators visible
- [ ] Escape key closes modals
- [ ] Enter key submits forms

### Visual
- [ ] Sufficient color contrast
- [ ] Text is readable
- [ ] Focus states visible
- [ ] Error states clear
- [ ] Loading states apparent

## 🔧 Technical Tests

### Orientation
- [ ] Portrait mode works
- [ ] Landscape mode works
- [ ] Rotation doesn't break layout
- [ ] Content reflows properly

### Browser Features
- [ ] Service worker (if implemented)
- [ ] Web Share API works
- [ ] Clipboard API works
- [ ] Local storage works
- [ ] Session storage works

### Network Conditions
- [ ] Works on 4G
- [ ] Works on 3G
- [ ] Works on slow 3G
- [ ] Offline handling (if implemented)
- [ ] Network error messages

### Edge Cases
- [ ] Long text doesn't break layout
- [ ] Many projects display properly
- [ ] Empty states work
- [ ] Error states display
- [ ] Loading states show

## 🐛 Common Mobile Issues to Check

### Horizontal Scrolling
- [ ] No horizontal scroll on landing page
- [ ] No horizontal scroll on dashboard
- [ ] No horizontal scroll on board page
- [ ] No horizontal scroll in modals
- [ ] No horizontal scroll in forms
- [ ] Fixed width elements don't overflow

### iOS Specific
- [ ] No zoom on input focus
- [ ] Safe area insets respected
- [ ] Bottom bar doesn't overlap content
- [ ] Home indicator area clear
- [ ] Status bar area handled
- [ ] No rubber-band scrolling issues

### Android Specific
- [ ] System navigation bars handled
- [ ] Bottom sheet behavior correct
- [ ] Back button works properly
- [ ] Soft keyboard doesn't hide inputs
- [ ] Chrome PWA features work

### Touch & Gestures
- [ ] Tap feedback visible
- [ ] No accidental taps
- [ ] Swipe gestures work (if implemented)
- [ ] Pull-to-refresh (if implemented)
- [ ] Long press actions (if implemented)

## 📊 Testing Tools

### Browser DevTools
- [ ] Chrome Mobile Emulation
- [ ] Firefox Responsive Design Mode
- [ ] Safari Web Inspector
- [ ] Lighthouse Mobile Report
- [ ] Network throttling

### Real Device Testing
- [ ] Test on physical iPhone
- [ ] Test on physical Android
- [ ] Test with real network conditions
- [ ] Test with actual touch interactions
- [ ] Test in different lighting conditions

### Automated Testing
- [ ] Lighthouse CI
- [ ] WebPageTest Mobile
- [ ] BrowserStack device testing
- [ ] Performance monitoring
- [ ] Error tracking

## ✅ Final Checks

### Before Deployment
- [ ] All critical paths tested
- [ ] No console errors
- [ ] No console warnings
- [ ] Analytics working
- [ ] Error tracking configured
- [ ] Performance acceptable

### Post-Deployment
- [ ] Monitor real user metrics
- [ ] Check error logs
- [ ] Review analytics
- [ ] Gather user feedback
- [ ] Monitor performance
- [ ] Watch for edge cases

## 🎯 Success Criteria

Your mobile optimization is successful if:

1. ✅ **All touch targets** are at least 44x44px
2. ✅ **No horizontal scrolling** on any page
3. ✅ **Forms don't zoom** on iOS when focused
4. ✅ **iPhone SE (375px)** displays everything properly
5. ✅ **Safe areas** respected on notched devices
6. ✅ **Page load** < 3 seconds on 3G
7. ✅ **Smooth scrolling** at 60fps
8. ✅ **All features** work without desktop mouse
9. ✅ **Modals** are full-screen on mobile
10. ✅ **Navigation** is easily accessible

## 📝 Testing Notes

### How to Test Locally

1. **Open Chrome DevTools** (F12)
2. **Toggle Device Toolbar** (Ctrl+Shift+M / Cmd+Shift+M)
3. **Select "iPhone SE"** from dropdown
4. **Test all features**
5. **Check "Responsive"** mode for various sizes
6. **Enable throttling** to test on slow networks

### Using Safari for iOS Testing

1. **Enable Safari Developer Menu**
   - Safari > Preferences > Advanced > Show Develop menu
2. **Connect iPhone via USB**
3. **Enable Web Inspector** on iPhone
4. **Develop > [Your iPhone] > [Your Site]**
5. **Test real device** with desktop debugging

### Remote Device Testing

Use services like:
- **BrowserStack** - Real devices in cloud
- **Sauce Labs** - Automated mobile testing
- **AWS Device Farm** - Test on real devices
- **LambdaTest** - Cross-browser testing

## 🚨 Critical Issues to Fix Immediately

If you find any of these, fix them ASAP:

1. ❌ Horizontal scrolling on any page
2. ❌ Touch targets smaller than 44px
3. ❌ Forms zooming on iOS
4. ❌ Content hidden behind device chrome
5. ❌ Buttons not working on mobile
6. ❌ Modal not closeable
7. ❌ Page not loading on mobile
8. ❌ JavaScript errors on mobile
9. ❌ Images not loading
10. ❌ Forms not submitting

## 📚 Additional Resources

- [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios/)
- [Material Design Mobile Guidelines](https://material.io/design)
- [WebAIM Mobile Accessibility](https://webaim.org/articles/mobile/)
- [MDN Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)

---

**Remember**: Real device testing is essential! Emulators are good for development, but always test on actual phones before considering the mobile optimization complete.

