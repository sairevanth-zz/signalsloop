import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  validateSQLIdentifier,
  validateUUIDFormat,
  validatePaginationParams,
  validateSortParams,
  buildSafeSelect,
} from './sql-safety';

/**
 * Secure Supabase Client Wrapper
 * Provides additional validation and safety checks on top of Supabase
 */

/**
 * Create a secure Supabase client with service role
 */
export function getSupabaseServiceRoleClient(): SupabaseClient {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Create a secure Supabase client with anon key (for public operations)
 */
export function getSupabaseAnonClient(): SupabaseClient {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Secure query builder with validation
 */
export class SecureQueryBuilder {
  private client: SupabaseClient;
  private tableName: string;

  constructor(client: SupabaseClient, tableName: string) {
    // Validate table name
    validateSQLIdentifier(tableName, 'table name');
    this.client = client;
    this.tableName = tableName;
  }

  /**
   * Safe select with column validation
   */
  select(columns: string | string[]) {
    if (typeof columns === 'string') {
      if (columns === '*') {
        return this.client.from(this.tableName).select(columns);
      }
      // Validate column string
      const columnArray = columns.split(',').map(c => c.trim());
      return this.client.from(this.tableName).select(buildSafeSelect(columnArray));
    }

    return this.client.from(this.tableName).select(buildSafeSelect(columns));
  }

  /**
   * Safe single record fetch by UUID
   */
  async selectById(id: string, columns: string | string[] = '*') {
    if (!validateUUIDFormat(id)) {
      throw new Error('Invalid UUID format');
    }

    const query = typeof columns === 'string'
      ? this.client.from(this.tableName).select(columns)
      : this.client.from(this.tableName).select(buildSafeSelect(columns));

    return query.eq('id', id).single();
  }

  /**
   * Safe insert with data validation
   */
  insert(data: Record<string, any> | Record<string, any>[]) {
    // Remove dangerous keys
    const sanitized = Array.isArray(data)
      ? data.map(item => this.sanitizeData(item))
      : this.sanitizeData(data);

    return this.client.from(this.tableName).insert(sanitized);
  }

  /**
   * Safe update with data validation
   */
  update(id: string, data: Record<string, any>) {
    if (!validateUUIDFormat(id)) {
      throw new Error('Invalid UUID format');
    }

    const sanitized = this.sanitizeData(data);
    return this.client.from(this.tableName).update(sanitized).eq('id', id);
  }

  /**
   * Safe delete by UUID
   */
  delete(id: string) {
    if (!validateUUIDFormat(id)) {
      throw new Error('Invalid UUID format');
    }

    return this.client.from(this.tableName).delete().eq('id', id);
  }

  /**
   * Safe list with pagination and sorting
   */
  async list(options: {
    limit?: number;
    offset?: number;
    sortColumn?: string;
    sortDirection?: string;
    allowedSortColumns?: string[];
    columns?: string | string[];
  } = {}) {
    const {
      limit,
      offset,
      sortColumn,
      sortDirection,
      allowedSortColumns = ['created_at', 'updated_at', 'id'],
      columns = '*',
    } = options;

    // Validate pagination
    const { limit: safeLimit, offset: safeOffset } = validatePaginationParams(limit, offset);

    // Build query
    let query = typeof columns === 'string'
      ? this.client.from(this.tableName).select(columns, { count: 'exact' })
      : this.client.from(this.tableName).select(buildSafeSelect(columns), { count: 'exact' });

    // Apply sorting if provided
    if (sortColumn && sortDirection) {
      const { column, ascending } = validateSortParams(
        sortColumn,
        sortDirection,
        allowedSortColumns
      );
      query = query.order(column, { ascending });
    }

    // Apply pagination
    query = query.range(safeOffset, safeOffset + safeLimit - 1);

    return query;
  }

  /**
   * Sanitize data object - remove dangerous keys
   */
  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const key in data) {
      // Skip dangerous keys
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }

      // Validate column name
      try {
        validateSQLIdentifier(key, 'column name');
        sanitized[key] = data[key];
      } catch {
        console.warn(`Skipping invalid column name: ${key}`);
      }
    }

    return sanitized;
  }
}

/**
 * Create a secure query builder for a table
 */
export function secureQuery(tableName: string, useServiceRole: boolean = true): SecureQueryBuilder {
  const client = useServiceRole ? getSupabaseServiceRoleClient() : getSupabaseAnonClient();
  return new SecureQueryBuilder(client, tableName);
}

/**
 * Example usage:
 *
 * // Select with validation
 * const posts = await secureQuery('posts')
 *   .select(['id', 'title', 'content'])
 *   .list({ limit: 10, sortColumn: 'created_at', sortDirection: 'desc' });
 *
 * // Get by ID with validation
 * const post = await secureQuery('posts')
 *   .selectById(postId, ['id', 'title', 'content']);
 *
 * // Insert with validation
 * const { data, error } = await secureQuery('posts')
 *   .insert({ title: 'Hello', content: 'World' });
 *
 * // Update with validation
 * await secureQuery('posts')
 *   .update(postId, { title: 'Updated' });
 *
 * // Delete with validation
 * await secureQuery('posts')
 *   .delete(postId);
 */
