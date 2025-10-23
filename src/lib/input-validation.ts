import { z } from 'zod';
import validator from 'validator';
import sanitizeHtml from 'sanitize-html';

/**
 * Input Validation and Sanitization Utilities
 * Provides comprehensive input validation and XSS protection
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHTML(dirty: string, options?: sanitizeHtml.IOptions): string {
  const defaultOptions: sanitizeHtml.IOptions = {
    allowedTags: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'target'],
      'img': ['src', 'alt', 'title']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto']
    },
    allowProtocolRelative: false,
    ...options
  };

  return sanitizeHtml(dirty, defaultOptions);
}

/**
 * Sanitize plain text (removes all HTML)
 */
export function sanitizePlainText(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [],
    allowedAttributes: {}
  });
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email: string): { valid: boolean; sanitized?: string; error?: string } {
  const trimmed = email.trim();

  if (!validator.isEmail(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }

  const normalized = validator.normalizeEmail(trimmed);
  if (!normalized) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true, sanitized: normalized };
}

/**
 * Validate URL
 */
export function validateURL(url: string): { valid: boolean; sanitized?: string; error?: string } {
  const trimmed = url.trim();

  if (!validator.isURL(trimmed, {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true,
    allow_underscores: false,
    allow_trailing_dot: false,
    allow_protocol_relative_urls: false
  })) {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Additional check for potentially malicious URLs
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validate and sanitize project slug
 */
export function validateSlug(slug: string): { valid: boolean; sanitized?: string; error?: string } {
  const trimmed = slug.trim().toLowerCase();

  // Check format: alphanumeric and hyphens only, 3-63 characters
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Slug must be 3-63 characters, start and end with alphanumeric, and contain only lowercase letters, numbers, and hyphens'
    };
  }

  // Prevent consecutive hyphens
  if (trimmed.includes('--')) {
    return { valid: false, error: 'Slug cannot contain consecutive hyphens' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validate UUID
 */
export function validateUUID(uuid: string): { valid: boolean; error?: string } {
  if (!validator.isUUID(uuid, 4)) {
    return { valid: false, error: 'Invalid UUID format' };
  }
  return { valid: true };
}

/**
 * Sanitize user input for display (basic XSS protection)
 */
export function sanitizeUserInput(input: string, maxLength?: number): string {
  let sanitized = sanitizePlainText(input.trim());

  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Common Zod schemas for validation
 */
export const commonSchemas = {
  email: z.string().email().max(255).transform(val => {
    const result = validateEmail(val);
    if (!result.valid) throw new Error(result.error);
    return result.sanitized!;
  }),

  url: z.string().url().max(2048).transform(val => {
    const result = validateURL(val);
    if (!result.valid) throw new Error(result.error);
    return result.sanitized!;
  }),

  slug: z.string().min(3).max(63).transform(val => {
    const result = validateSlug(val);
    if (!result.valid) throw new Error(result.error);
    return result.sanitized!;
  }),

  uuid: z.string().uuid(),

  title: z.string().min(1).max(200).transform(val => sanitizeUserInput(val, 200)),

  description: z.string().max(5000).transform(val => sanitizeHTML(val)),

  plainText: z.string().max(5000).transform(val => sanitizeUserInput(val, 5000)),

  name: z.string().min(1).max(100).transform(val => sanitizeUserInput(val, 100)),

  apiKey: z.string().regex(/^[A-Za-z0-9_-]+$/, 'Invalid API key format'),

  webhookUrl: z.string().url().max(2048).refine(val => {
    try {
      const url = new URL(val);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Must be a valid HTTP/HTTPS URL'),

  id: z.string().uuid(),

  positiveInt: z.number().int().positive(),

  nonNegativeInt: z.number().int().nonnegative(),
};

/**
 * SQL Injection Prevention - Validate table/column names
 * Only allows alphanumeric characters and underscores
 */
export function validateIdentifier(identifier: string): { valid: boolean; error?: string } {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    return {
      valid: false,
      error: 'Invalid identifier: must start with letter or underscore and contain only alphanumeric characters and underscores'
    };
  }

  // Prevent SQL keywords
  const sqlKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'EXEC', 'EXECUTE',
    'UNION', 'WHERE', 'FROM', 'JOIN', 'TRUNCATE', 'TABLE', 'DATABASE', 'SCHEMA'
  ];

  if (sqlKeywords.includes(identifier.toUpperCase())) {
    return { valid: false, error: 'Identifier cannot be a SQL keyword' };
  }

  return { valid: true };
}

/**
 * Validate JSON structure
 */
export function validateJSON(input: string): { valid: boolean; parsed?: any; error?: string } {
  try {
    const parsed = JSON.parse(input);
    return { valid: true, parsed };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON'
    };
  }
}

/**
 * Rate limit key sanitization
 */
export function sanitizeRateLimitKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9:._-]/g, '_');
}

/**
 * Prevent prototype pollution
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};

  for (const key in obj) {
    // Skip prototype-polluting keys
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }

    const value = obj[key];

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        item && typeof item === 'object' ? sanitizeObject(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validate file upload
 */
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

export function validateFile(
  file: { name: string; size: number; type: string },
  options: FileValidationOptions = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf']
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`
    };
  }

  // Check MIME type
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`
    };
  }

  // Check file extension
  const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File extension ${ext} is not allowed`
    };
  }

  return { valid: true };
}
