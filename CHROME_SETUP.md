# Chrome Setup for Web Scraping

The competitive intelligence scraping functionality requires Chrome/Chromium to be installed on your system.

## Quick Installation

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install chromium-browser
```

### macOS
```bash
brew install chromium
# or
brew install --cask google-chrome
```

### Windows
Download and install from: https://www.google.com/chrome/

## Verify Installation

After installing, verify Chrome is accessible:

```bash
# Linux
which chromium-browser
# or
which google-chrome

# macOS
ls "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Windows
dir "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

## Custom Chrome Path

If Chrome is installed in a non-standard location, set the environment variable:

```bash
export CHROME_EXECUTABLE_PATH=/path/to/chrome
```

Add to `.env.local`:
```
CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome
```

## For Docker Deployment

Add to your Dockerfile:

```dockerfile
# Install Chrome
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils

ENV CHROME_EXECUTABLE_PATH=/usr/bin/chromium
```

## For Vercel/Serverless

Install serverless Chrome package:

```bash
npm install @sparticuz/chromium
```

The scraper will automatically detect and use it.

## Troubleshooting

### Error: "Chrome/Chromium not found"

1. Install Chrome using the commands above
2. Or set `CHROME_EXECUTABLE_PATH` environment variable
3. Or install `@sparticuz/chromium` for serverless environments

### Error: "Failed to launch browser"

- Check Chrome permissions: `chmod +x /usr/bin/chromium`
- Ensure required libraries are installed (see Docker instructions)
- Try running with `--no-sandbox` flag (already configured)

### Memory Issues

Scraping requires ~1-2GB RAM per browser instance. For production:

1. Limit concurrent scraping jobs
2. Use a queue system (BullMQ, etc.)
3. Consider external browser services (Browserless.io)

## Testing

Test the scraper setup:

```typescript
// Test file: test-scraper.ts
import { scrapeG2Reviews } from './src/lib/competitive-intelligence/scrapers/g2-scraper';

async function test() {
  try {
    const reviews = await scrapeG2Reviews(
      'https://www.g2.com/products/jira/reviews',
      5
    );
    console.log(`✓ Successfully scraped ${reviews.length} reviews`);
  } catch (error) {
    console.error('✗ Scraping failed:', error);
  }
}

test();
```

Run:
```bash
npx tsx test-scraper.ts
```

## Production Recommendations

For production deployments, consider:

1. **Official APIs**: Contact G2, Capterra, TrustRadius for API access
2. **Licensed Services**: Use ScraperAPI, Bright Data, or Apify
3. **Managed Browsers**: Use Browserless.io or similar services
4. **Review ToS**: Ensure compliance with each platform's terms of service

## Support

If you continue to have issues:
1. Check the browser config logs in `/src/lib/competitive-intelligence/scrapers/browser-config.ts`
2. Verify Chrome is in PATH
3. Try setting `CHROME_EXECUTABLE_PATH` explicitly
4. Open an issue with error logs
