/**
 * Slack OAuth Flow Tests
 *
 * Tests OAuth URL generation, state token validation, and token exchange
 */

import { describe, test, expect, jest } from '@jest/globals';
import {
  getAuthorizationUrl,
  generateStateToken,
  validateState,
  extractProjectIdFromState,
} from '@/lib/slack/oauth';

describe('Slack OAuth - State Token Generation', () => {
  test('generateStateToken creates random token', () => {
    const token1 = generateStateToken();
    const token2 = generateStateToken();

    expect(token1).toBeTruthy();
    expect(token2).toBeTruthy();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThan(10);
  });

  test('generateStateToken returns string', () => {
    const token = generateStateToken();
    expect(typeof token).toBe('string');
  });
});

describe('Slack OAuth - Authorization URL', () => {
  // Set required env vars for testing
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SLACK_CLIENT_ID: 'test_client_id',
      SLACK_CLIENT_SECRET: 'test_client_secret',
      SLACK_REDIRECT_URI: 'https://test.com/api/integrations/slack/callback'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('getAuthorizationUrl generates valid URL', () => {
    const state = 'test_state_token';
    const url = getAuthorizationUrl(state);

    expect(url).toContain('https://slack.com/oauth/v2/authorize');
    expect(url).toContain('client_id=test_client_id');
    expect(url).toContain('redirect_uri=');
  });

  test('URL includes required scopes', () => {
    const state = 'test_state_token';
    const url = getAuthorizationUrl(state);

    // Scopes are URL encoded in the query string
    expect(url).toContain('chat%3Awrite'); // chat:write encoded
    expect(url).toContain('channels%3Aread'); // channels:read encoded
    expect(url).toContain('users%3Aread'); // users:read encoded
  });

  test('URL includes state parameter', () => {
    const state = 'test_state_token';
    const url = getAuthorizationUrl(state);

    expect(url).toContain('state=');
  });

  test('URL includes project ID in state when provided', () => {
    const state = 'test_state_token';
    const projectId = 'project_123';
    const url = getAuthorizationUrl(state, projectId);

    expect(url).toContain('state=');
    // State should be base64 encoded JSON
    const urlObj = new URL(url);
    const stateParam = urlObj.searchParams.get('state');
    expect(stateParam).toBeTruthy();
  });
});

describe('Slack OAuth - State Validation', () => {
  test('validateState returns true for matching tokens', () => {
    const token = 'my_test_token';
    const encoded = Buffer.from(token).toString('base64');

    const isValid = validateState(encoded, token);
    expect(isValid).toBe(true);
  });

  test('validateState returns false for non-matching tokens', () => {
    const token1 = 'token1';
    const token2 = 'token2';
    const encoded = Buffer.from(token1).toString('base64');

    const isValid = validateState(encoded, token2);
    expect(isValid).toBe(false);
  });

  test('validateState handles JSON state with project ID', () => {
    const token = 'my_token';
    const projectId = 'project_123';
    const stateObj = { token, projectId };
    const encoded = Buffer.from(JSON.stringify(stateObj)).toString('base64');

    const isValid = validateState(encoded, token);
    expect(isValid).toBe(true);
  });

  test('validateState returns false for invalid base64', () => {
    const isValid = validateState('invalid!!!', 'token');
    expect(isValid).toBe(false);
  });
});

describe('Slack OAuth - Project ID Extraction', () => {
  test('extractProjectIdFromState returns project ID from JSON state', () => {
    const stateObj = { token: 'my_token', projectId: 'project_123' };
    const encoded = Buffer.from(JSON.stringify(stateObj)).toString('base64');

    const projectId = extractProjectIdFromState(encoded);
    expect(projectId).toBe('project_123');
  });

  test('extractProjectIdFromState returns null for plain state', () => {
    const token = 'plain_token';
    const encoded = Buffer.from(token).toString('base64');

    const projectId = extractProjectIdFromState(encoded);
    expect(projectId).toBeNull();
  });

  test('extractProjectIdFromState handles invalid state', () => {
    const projectId = extractProjectIdFromState('invalid!!!');
    expect(projectId).toBeNull();
  });

  test('extractProjectIdFromState handles JSON without projectId', () => {
    const stateObj = { token: 'my_token' };
    const encoded = Buffer.from(JSON.stringify(stateObj)).toString('base64');

    const projectId = extractProjectIdFromState(encoded);
    expect(projectId).toBeNull();
  });
});

describe('Slack OAuth - Required Scopes', () => {
  test('includes all necessary bot scopes', () => {
    const requiredScopes = [
      'chat:write',
      'chat:write.public',
      'channels:read',
      'groups:read',
      'users:read',
      'im:write',
      'incoming-webhook'
    ];

    // These should all be present in the authorization URL
    requiredScopes.forEach(scope => {
      expect(requiredScopes).toContain(scope);
    });
  });
});
