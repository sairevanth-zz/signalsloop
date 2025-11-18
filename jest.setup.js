// Jest setup file
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn()
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '';
  },
  useParams() {
    return {};
  }
}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.JIRA_CLIENT_ID = 'test-client-id';
process.env.JIRA_CLIENT_SECRET = 'test-client-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-12';
process.env.OPENAI_API_KEY = 'sk-test-key';

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn()
};
