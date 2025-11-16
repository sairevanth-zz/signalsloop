/**
 * Browser Configuration for Puppeteer
 * Handles different deployment environments (local, Docker, Vercel, etc.)
 */

export function getBrowserConfig() {
  // Check if we have a custom Chrome path from environment
  const customPath = process.env.CHROME_EXECUTABLE_PATH;

  if (customPath) {
    return {
      executablePath: customPath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    };
  }

  // Try to detect system Chrome/Chromium
  const possiblePaths = [
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  // Check which path exists
  const fs = require('fs');
  for (const path of possiblePaths) {
    try {
      if (fs.existsSync(path)) {
        console.log(`[Browser Config] Found Chrome at: ${path}`);
        return {
          executablePath: path,
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
          ],
        };
      }
    } catch (e) {
      // Continue checking
    }
  }

  // If no Chrome found, throw error with helpful message
  throw new Error(
    'Chrome/Chromium not found. Please install Chrome or set CHROME_EXECUTABLE_PATH environment variable.\n' +
    'Install Chrome:\n' +
    '  - Ubuntu/Debian: sudo apt-get install chromium-browser\n' +
    '  - macOS: brew install chromium\n' +
    '  - Or download from: https://www.google.com/chrome/\n' +
    'Or set environment variable:\n' +
    '  export CHROME_EXECUTABLE_PATH=/path/to/chrome'
  );
}

/**
 * Get browser config for serverless environments (Vercel, AWS Lambda)
 * Requires @sparticuz/chromium package
 */
export async function getServerlessBrowserConfig() {
  try {
    // Try to import chromium for serverless
    const chromium = await import('@sparticuz/chromium');

    return {
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    };
  } catch (error) {
    console.warn('[Browser Config] @sparticuz/chromium not found, falling back to local config');
    return getBrowserConfig();
  }
}
