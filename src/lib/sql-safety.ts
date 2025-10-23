/**
 * SQL Injection Prevention Utilities
 * Provides helpers for safe SQL queries with Supabase
 */

import { validateIdentifier } from './input-validation';
import { logSQLInjectionAttempt } from './security-logger';
import { NextRequest } from 'next/server';

/**
 * Validate SQL identifier (table name, column name, etc.)
 * Throws error if invalid
 */
export function validateSQLIdentifier(identifier: string, fieldName: string = 'identifier'): string {
  const result = validateIdentifier(identifier);
  if (!result.valid) {
    throw new Error(`Invalid ${fieldName}: ${result.error}`);
  }
  return identifier;
}

/**
 * Validate array of SQL identifiers
 */
export function validateSQLIdentifiers(identifiers: string[], fieldName: string = 'identifiers'): string[] {
  return identifiers.map(id => validateSQLIdentifier(id, fieldName));
}

/**
 * Safe column selection builder for Supabase
 * Validates all column names to prevent SQL injection
 */
export function buildSafeSelect(columns: string[]): string {
  const validatedColumns = validateSQLIdentifiers(columns, 'column name');
  return validatedColumns.join(', ');
}

/**
 * Detect SQL injection attempts in user input
 */
export function detectSQLInjection(input: string): boolean {
  // Common SQL injection patterns
  const patterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b.*\b(select|from|where|table|database)\b)/i,
    /(\bor\b\s+\d+\s*=\s*\d+)/i,
    /(\band\b\s+\d+\s*=\s*\d+)/i,
    /(--|\/\*|\*\/)/,
    /(\bxp_cmdshell\b)/i,
    /(\bsp_executesql\b)/i,
    /(';\s*drop\s+table)/i,
    /(';\s*delete\s+from)/i,
    /(';\s*insert\s+into)/i,
    /(\bunion\b.*\ball\b.*\bselect\b)/i,
    /(\bselect\b.*\bfrom\b.*\bwhere\b.*\b(or|and)\b.*\b=)/i,
  ];

  return patterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize and validate user input for SQL queries
 */
export function sanitizeForSQL(
  input: string,
  maxLength: number = 1000,
  request?: NextRequest
): string {
  // Check for SQL injection
  if (detectSQLInjection(input)) {
    if (request) {
      logSQLInjectionAttempt(request, 'input', input);
    }
    throw new Error('Invalid input detected');
  }

  // Trim and limit length
  return input.trim().substring(0, maxLength);
}

/**
 * Parameterized query helper for Supabase
 *
 * Note: Supabase/PostgREST automatically uses parameterized queries,
 * but this helper provides additional validation
 */
export interface WhereCondition {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in';
  value: string | number | boolean | null | (string | number)[];
}

/**
 * Validate and build safe where conditions
 */
export function buildSafeWhereConditions(conditions: WhereCondition[]): WhereCondition[] {
  return conditions.map(condition => {
    // Validate column name
    validateSQLIdentifier(condition.column, 'column name');

    // Validate operator
    const validOperators = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in'];
    if (!validOperators.includes(condition.operator)) {
      throw new Error(`Invalid operator: ${condition.operator}`);
    }

    // Validate value based on operator
    if (condition.operator === 'in') {
      if (!Array.isArray(condition.value)) {
        throw new Error('Value must be an array for "in" operator');
      }
    } else if (condition.operator === 'is' && condition.value !== null) {
      throw new Error('Value must be null for "is" operator');
    }

    return condition;
  });
}

/**
 * Safe LIKE pattern builder
 * Escapes special characters in LIKE patterns
 */
export function buildSafeLikePattern(input: string, position: 'start' | 'end' | 'both' = 'both'): string {
  // Escape special characters
  const escaped = input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');

  switch (position) {
    case 'start':
      return `${escaped}%`;
    case 'end':
      return `%${escaped}`;
    case 'both':
      return `%${escaped}%`;
  }
}

/**
 * Validate UUID format (prevents injection via IDs)
 */
export function validateUUIDFormat(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Safe limit/offset validation
 */
export function validatePaginationParams(limit?: number, offset?: number): {
  limit: number;
  offset: number;
} {
  const safeLimit = Math.min(Math.max(1, limit || 50), 1000);
  const safeOffset = Math.max(0, offset || 0);

  return { limit: safeLimit, offset: safeOffset };
}

/**
 * Validate sort column and direction
 */
export function validateSortParams(
  column: string,
  direction: string,
  allowedColumns: string[]
): { column: string; ascending: boolean } {
  // Validate column name
  validateSQLIdentifier(column, 'sort column');

  // Check if column is in allowed list
  if (!allowedColumns.includes(column)) {
    throw new Error(`Sorting by column "${column}" is not allowed`);
  }

  // Validate direction
  const normalizedDirection = direction.toLowerCase();
  if (!['asc', 'desc', 'ascending', 'descending'].includes(normalizedDirection)) {
    throw new Error('Invalid sort direction');
  }

  const ascending = ['asc', 'ascending'].includes(normalizedDirection);

  return { column, ascending };
}

/**
 * Best Practices for SQL Safety with Supabase:
 *
 * 1. Always use Supabase's built-in query methods (they use parameterized queries)
 * 2. Never concatenate user input into SQL strings
 * 3. Validate all identifiers (table names, column names)
 * 4. Use Row Level Security (RLS) policies in Supabase
 * 5. Validate UUIDs and other IDs before using them
 * 6. Use the helpers in this file for additional safety
 *
 * Example safe query:
 *
 * const { data } = await supabase
 *   .from('posts')
 *   .select(buildSafeSelect(['id', 'title', 'content']))
 *   .eq('id', validateUUID(postId))
 *   .single();
 */
