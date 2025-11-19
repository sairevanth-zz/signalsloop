#!/bin/bash

# Script to set up testing environment for Sentiment Analysis Engine

echo "🧪 Setting up testing environment..."

# Install Jest and React Testing Library
echo "📦 Installing Jest and React Testing Library..."
npm install --save-dev \
  jest \
  jest-environment-jsdom \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  @types/jest

# Install Playwright
echo "📦 Installing Playwright..."
npm install --save-dev @playwright/test

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
npx playwright install

echo "✅ Test dependencies installed!"

echo ""
echo "📝 Adding test scripts to package.json..."

# Note: These scripts should be manually added to package.json:
cat << 'EOF'

Add these scripts to your package.json:

"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:unit": "jest __tests__/sentiment.test.ts",
  "test:components": "jest src/components/sentiment/__tests__",
  "test:integration": "jest __tests__/integration",
  "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand",
  "test:e2e": "playwright test",
  "test:e2e:headed": "playwright test --headed",
  "test:e2e:debug": "playwright test --debug",
  "test:e2e:ui": "playwright test --ui",
  "test:ci": "jest --ci --coverage --maxWorkers=2"
}

EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "Run tests with:"
echo "  npm test                  # Run all Jest tests"
echo "  npm run test:coverage     # Run with coverage report"
echo "  npm run test:e2e          # Run E2E tests"
echo ""
echo "📖 See TESTING_README.md for more information"
