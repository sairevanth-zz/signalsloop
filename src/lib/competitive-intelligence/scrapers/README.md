# External Review Scrapers

This directory contains web scrapers for extracting competitor reviews from G2, Capterra, and TrustRadius.

## Important Legal & Ethical Considerations

### ⚠️ Terms of Service
Before using these scrapers in production, please review:
- **G2's Terms of Service**: https://www.g2.com/terms-of-use
- **Capterra's Terms of Service**: https://www.capterra.com/legal/terms-of-use
- **TrustRadius's Terms of Service**: https://www.trustradius.com/static/about-trustradius-terms-of-use

Some platforms explicitly prohibit automated scraping. Always check their `robots.txt` and terms of service.

### ✅ Recommended Approaches

1. **Official APIs (Preferred)**
   - Contact G2, Capterra, and TrustRadius to request API access
   - Some platforms offer partner APIs for legitimate business use
   - This is the most legal and reliable approach

2. **Licensed Data Providers**
   - Services like Bright Data, ScraperAPI, or Apify
   - They handle legal compliance and rate limiting
   - Often have pre-built scrapers for these platforms

3. **Manual Review Collection**
   - Have team members manually review and input data
   - Time-consuming but completely legal
   - Good for initial validation before automation

### 🛡️ Rate Limiting & Best Practices

Our scrapers include built-in protections:

- **User Agent**: Realistic browser user agent
- **Delays**: 2 seconds between platforms, 5 seconds between products
- **Scroll Speed**: Gradual scrolling to mimic human behavior
- **Request Limits**: Configurable maximum reviews per session
- **Error Handling**: Graceful failures with detailed logging

### 🔧 Configuration

The scrapers use Puppeteer in headless mode with the following settings:

```javascript
{
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
  ]
}
```

For production deployments (especially serverless), you may need:
- Chrome/Chromium binaries
- Puppeteer Extra with Stealth plugin
- Proxy rotation
- CAPTCHA solving services

## Installation

```bash
npm install puppeteer
# or
yarn add puppeteer
```

For serverless environments (Vercel, AWS Lambda):
```bash
npm install @sparticuz/chromium puppeteer-core
```

## Usage

### G2 Scraper

```typescript
import { scrapeG2Reviews } from './scrapers/g2-scraper';

const reviews = await scrapeG2Reviews(
  'https://www.g2.com/products/jira/reviews',
  50 // limit
);
```

### Capterra Scraper

```typescript
import { scrapeCapterraReviews } from './scrapers/capterra-scraper';

const reviews = await scrapeCapterraReviews(
  'https://www.capterra.com/p/12345/jira/reviews',
  50
);
```

### TrustRadius Scraper

```typescript
import { scrapeTrustRadiusReviews } from './scrapers/trustradius-scraper';

const reviews = await scrapeTrustRadiusReviews(
  'https://www.trustradius.com/products/jira/reviews',
  50
);
```

## Extracted Data

Each scraper returns an array of reviews with:

```typescript
interface Review {
  external_review_id: string;      // Unique identifier
  title: string;                    // Review title
  content: string;                  // Full review text
  rating: number;                   // 1-5 stars
  reviewer_name: string;            // Reviewer name
  reviewer_role?: string;           // Job title
  reviewer_company_size?: string;   // Company size
  published_at: string;             // ISO date string
  verified_reviewer: boolean;       // Verified badge
  incentivized_review: boolean;     // Incentivized badge
}
```

## Error Handling

All scrapers include comprehensive error handling:

- **Network Errors**: Retry logic with exponential backoff
- **Element Not Found**: Graceful degradation
- **Timeout Errors**: Configurable timeout (default: 60s)
- **Browser Crashes**: Automatic cleanup

Errors are logged to console and returned in the response:

```typescript
{
  success: false,
  reviewsScraped: 0,
  error: "Failed to scrape g2: Element not found"
}
```

## Deployment Considerations

### Vercel / Serverless

Puppeteer requires Chrome/Chromium binaries. Options:

1. **@sparticuz/chromium** (Recommended)
   ```bash
   npm install @sparticuz/chromium puppeteer-core
   ```

2. **Chrome AWS Lambda Layer**
   - Pre-built Lambda layers with Chrome

3. **External Browser Service**
   - Browserless.io
   - ScrapingBee
   - ScraperAPI

### Docker

Include Chrome in your Dockerfile:

```dockerfile
RUN apt-get update && apt-get install -y \\
    chromium \\
    chromium-driver
```

### Memory Requirements

- Minimum: 1GB RAM per browser instance
- Recommended: 2GB RAM for stability
- Each scraping job uses ~500MB while running

## Monitoring & Alerts

Track scraping health:

- **Success Rate**: % of successful scrapes
- **Error Types**: Network, timeout, element not found
- **Scraping Duration**: Average time per platform
- **Data Quality**: Reviews with missing fields

Set up alerts for:
- Scraping failures > 20%
- Platform structure changes (selectors changed)
- Rate limiting responses
- CAPTCHA challenges

## Alternatives to Web Scraping

If scraping proves unreliable or violates terms:

1. **Official Partner APIs**: Contact platforms directly
2. **Third-Party Data Providers**: Purchase review data
3. **RSS/Email Alerts**: Subscribe to review notifications
4. **Manual Collection**: Human-assisted review gathering
5. **User Surveys**: Ask your users about competitors

## Support

For issues or questions:
- Check scraper logs for detailed error messages
- Verify target URL structure hasn't changed
- Test with browser DevTools to inspect selectors
- Consider rate limiting or IP blocking
