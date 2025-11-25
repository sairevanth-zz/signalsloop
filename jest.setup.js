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

// Mock Supabase client
jest.mock('@/lib/supabase-client', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
    })),
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: { access_token: 'test-access-token' } },
        error: null,
      })),
    },
  })),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.JIRA_CLIENT_ID = 'test-client-id';
process.env.JIRA_CLIENT_SECRET = 'test-client-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-12';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Mock fetch globally
global.fetch = jest.fn()

// Polyfill Request for tests that rely on Next's web Request
if (typeof global.Request === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Request } = require('next/dist/server/web/spec-extension/request');
    global.Request = Request;
  } catch {
    global.Request = class Request {};
  }
}

if (typeof global.Response === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Response } = require('next/dist/server/web/spec-extension/response');
    global.Response = Response;
  } catch {
    global.Response = class Response {};
  }
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() { }
  disconnect() { }
  observe() { }
  unobserve() { }
  takeRecords() {
    return []
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() { }
  disconnect() { }
  observe() { }
  unobserve() { }
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Suppress noisy console output in tests
const originalError = console.error
const originalLog = console.log
beforeAll(() => {
  console.log = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Initializing real-time dashboard') ||
        args[0].includes('Cleaning up real-time subscriptions') ||
        args[0].includes('Posts channel status'))
    ) {
      return
    }
    originalLog.call(console, ...args)
  }

  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit') ||
        args[0].includes('not wrapped in act(...'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.log = originalLog
})
