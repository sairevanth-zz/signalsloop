# SignalsLoop Visual Editor Extension

Chrome extension that enables the SignalsLoop Visual Editor to load any website for A/B testing.

## What It Does

This extension removes `X-Frame-Options` and `Content-Security-Policy` headers from HTTP responses, allowing websites to be loaded inside the SignalsLoop Visual Editor iframe.

**Only active when:**
- User is on signalsloop.com
- Using the Visual Editor feature
- Extension toggle is enabled

## Local Installation (Developer Mode)

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select this `browser-extension` folder
5. The extension icon should appear in your toolbar

## Testing

1. Go to https://signalsloop.com (or your local dev URL)
2. Navigate to Experiments → Create/View an experiment
3. Choose "Visual Editor" setup option
4. Enter any URL (e.g., https://example.com)
5. The page should now load in the editor iframe

## Files

```
browser-extension/
├── manifest.json    # Extension configuration
├── background.js    # Service worker for messaging
├── content.js       # Content script for SignalsLoop pages
├── popup.html       # Extension popup UI
├── popup.js         # Popup toggle logic
├── rules.json       # Declarative net request rules
└── icons/           # Extension icons (16, 32, 48, 128px)
```

## Building for Production

1. Create icon files (see icons/ folder)
2. Zip the entire folder contents
3. Submit to Chrome Web Store

---

# Chrome Web Store Submission Guide

## Prerequisites

1. **Google Developer Account** - $5 one-time fee
   - Go to: https://chrome.google.com/webstore/devconsole
   - Pay registration fee
   - Complete identity verification

2. **Required Assets**
   - 128x128 icon (PNG)
   - 1280x800 screenshot (PNG)
   - 440x280 small promo tile (PNG)
   - Privacy policy URL

## Step-by-Step Submission

### Step 1: Prepare the Package

```bash
cd browser-extension
zip -r signalsloop-visual-editor.zip . -x "*.DS_Store" -x "README.md"
```

### Step 2: Create Store Listing

1. Go to: https://chrome.google.com/webstore/devconsole
2. Click "New Item"
3. Upload the .zip file
4. Fill in details:

**Store Listing:**
- Name: `SignalsLoop Visual Editor`
- Summary (132 chars): `Enable no-code A/B testing with SignalsLoop's Visual Editor. Create experiments without writing code.`
- Category: `Productivity`
- Language: `English`

**Description (use this):**
```
SignalsLoop Visual Editor Extension

🧪 Create A/B tests without code!

This extension powers SignalsLoop's Visual Editor, allowing you to:

• Click any element on your website to select it
• Change text, colors, and styles visually
• Hide or show elements in your experiment
• Preview changes in real-time
• Start experiments with one click

HOW IT WORKS:
1. Open SignalsLoop and create an experiment
2. Choose "Visual Editor" setup
3. Enter your website URL
4. Make changes with point-and-click editing
5. Save and start your experiment

PRIVACY:
• Only active on signalsloop.com
• No data collection
• No analytics or tracking
• Open source

PERMISSIONS EXPLAINED:
• "Modify headers" - Required to load your site in the editor iframe
• "Access all URLs" - Needed to edit any website you own

Get started at https://signalsloop.com
```

### Step 3: Upload Screenshots

Create screenshots showing:
1. The extension popup
2. The Visual Editor in action
3. Before/after of a text change

### Step 4: Privacy Policy

Host this at `https://signalsloop.com/privacy/extension`:

```
SignalsLoop Visual Editor Extension Privacy Policy

Last updated: [DATE]

WHAT WE COLLECT: Nothing.

This extension does not collect, store, or transmit any personal data.

HOW THE EXTENSION WORKS:
- Modifies HTTP response headers to allow websites to load in iframes
- Only active when you use the SignalsLoop Visual Editor
- All processing happens locally in your browser

PERMISSIONS:
- "declarativeNetRequest": Removes X-Frame-Options headers
- "host_permissions": Required to modify headers for any website you test
- "storage": Saves your extension toggle preference

DATA SECURITY:
No data leaves your browser. This extension contains no analytics, 
tracking, or data collection of any kind.

CONTACT:
support@signalsloop.com
```

### Step 5: Submit for Review

1. Click "Submit for Review"
2. Answer questionnaire:
   - "Does your extension use remote code?" → No
   - "Does it handle user data?" → No
   - "Justification for host_permissions" → "Required to allow users to visually edit their own websites in the SignalsLoop A/B testing editor"

### Step 6: Wait for Review

- **Timeline**: 1-7 business days (usually 2-3)
- **Status**: Check in Developer Dashboard
- **If rejected**: They'll explain why, fix and resubmit

## Common Rejection Reasons & Fixes

| Reason | Fix |
|--------|-----|
| Missing privacy policy | Add URL to privacy policy |
| Broad permissions not justified | Add detailed justification text |
| Missing screenshots | Add at least 1 screenshot |
| Generic description | Make description specific to your use case |

## After Approval

Your extension will be live at:
```
https://chrome.google.com/webstore/detail/signalsloop-visual-editor/[EXTENSION_ID]
```

Add this link to your SignalsLoop Visual Editor UI with an "Install Extension" button.
