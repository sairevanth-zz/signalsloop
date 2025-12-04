/**
 * Performance Optimizations for Large Datasets
 * Handles pagination, batching, and efficient querying
 */

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * Paginated result type
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginatedResult<any>['pagination'] {
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Batch process large arrays
 */
export async function batchProcess<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Debounce function for rate limiting
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for rate limiting
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Lazy load data in chunks
 */
export class LazyDataLoader<T> {
  private data: T[] = [];
  private loadedPages = new Set<number>();
  private pageSize: number;
  private totalItems?: number;

  constructor(pageSize: number = 20) {
    this.pageSize = pageSize;
  }

  /**
   * Load a specific page
   */
  async loadPage(
    page: number,
    fetcher: (offset: number, limit: number) => Promise<{ data: T[]; total: number }>
  ): Promise<void> {
    if (this.loadedPages.has(page)) {
      return; // Already loaded
    }

    const offset = (page - 1) * this.pageSize;
    const result = await fetcher(offset, this.pageSize);

    // Insert data at correct position
    const startIndex = offset;
    result.data.forEach((item, index) => {
      this.data[startIndex + index] = item;
    });

    this.loadedPages.add(page);
    this.totalItems = result.total;
  }

  /**
   * Get items for a specific page
   */
  getPage(page: number): T[] {
    const startIndex = (page - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.data.slice(startIndex, endIndex).filter(Boolean);
  }

  /**
   * Check if page is loaded
   */
  isPageLoaded(page: number): boolean {
    return this.loadedPages.has(page);
  }

  /**
   * Get total number of pages
   */
  getTotalPages(): number {
    if (!this.totalItems) return 0;
    return Math.ceil(this.totalItems / this.pageSize);
  }

  /**
   * Clear all loaded data
   */
  clear(): void {
    this.data = [];
    this.loadedPages.clear();
    this.totalItems = undefined;
  }
}

/**
 * Query optimizer for Supabase
 */
export class QueryOptimizer {
  /**
   * Optimize SELECT queries to only fetch needed columns
   */
  static selectOnlyNeeded(
    columns: string[],
    allColumns: string[]
  ): string {
    // Filter to only columns that exist
    const validColumns = columns.filter(col => allColumns.includes(col));

    if (validColumns.length === 0) {
      return '*';
    }

    return validColumns.join(', ');
  }

  /**
   * Add appropriate indexes suggestion based on query pattern
   */
  static suggestIndexes(
    table: string,
    filters: Array<{ column: string; operator: string }>
  ): string[] {
    const suggestions: string[] = [];

    // Suggest composite index for multiple filters
    if (filters.length > 1) {
      const columns = filters.map(f => f.column).join(', ');
      suggestions.push(`CREATE INDEX idx_${table}_${filters.map(f => f.column).join('_')} ON ${table}(${columns});`);
    }

    // Suggest individual indexes for equality checks
    filters.forEach(filter => {
      if (filter.operator === '=') {
        suggestions.push(`CREATE INDEX idx_${table}_${filter.column} ON ${table}(${filter.column});`);
      }
    });

    return suggestions;
  }

  /**
   * Optimize ORDER BY with proper index usage
   */
  static optimizeOrderBy(
    orderColumn: string,
    direction: 'ASC' | 'DESC',
    filterColumns: string[]
  ): string {
    // If we're filtering by certain columns and ordering by another,
    // suggest a composite index
    if (filterColumns.length > 0) {
      return `Suggestion: CREATE INDEX ON table(${filterColumns.join(', ')}, ${orderColumn} ${direction})`;
    }

    return `Suggestion: CREATE INDEX ON table(${orderColumn} ${direction})`;
  }
}

/**
 * Memory-efficient data streaming
 */
export async function* streamData<T>(
  fetcher: (offset: number, limit: number) => Promise<T[]>,
  totalItems: number,
  chunkSize: number = 100
): AsyncGenerator<T[], void, unknown> {
  let offset = 0;

  while (offset < totalItems) {
    const chunk = await fetcher(offset, chunkSize);

    if (chunk.length === 0) {
      break;
    }

    yield chunk;
    offset += chunkSize;
  }
}

/**
 * Aggregate large datasets efficiently
 */
export class DataAggregator<T> {
  /**
   * Group by key with counting
   */
  static groupByCount<T>(
    items: T[],
    keyExtractor: (item: T) => string
  ): Map<string, number> {
    const counts = new Map<string, number>();

    items.forEach(item => {
      const key = keyExtractor(item);
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return counts;
  }

  /**
   * Calculate average for numeric field
   */
  static average<T>(
    items: T[],
    valueExtractor: (item: T) => number
  ): number {
    if (items.length === 0) return 0;

    const sum = items.reduce((acc, item) => acc + valueExtractor(item), 0);
    return sum / items.length;
  }

  /**
   * Find top N items by value
   */
  static topN<T>(
    items: T[],
    n: number,
    valueExtractor: (item: T) => number,
    descending: boolean = true
  ): T[] {
    const sorted = [...items].sort((a, b) => {
      const aVal = valueExtractor(a);
      const bVal = valueExtractor(b);
      return descending ? bVal - aVal : aVal - bVal;
    });

    return sorted.slice(0, n);
  }

  /**
   * Percentile calculation
   */
  static percentile<T>(
    items: T[],
    percentile: number,
    valueExtractor: (item: T) => number
  ): number {
    if (items.length === 0) return 0;

    const values = items.map(valueExtractor).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * values.length) - 1;

    return values[Math.max(0, index)];
  }
}

/**
 * Efficient data sampling for large datasets
 */
export class DataSampler<T> {
  /**
   * Reservoir sampling - unbiased random sample
   */
  static reservoirSample(items: T[], sampleSize: number): T[] {
    if (items.length <= sampleSize) {
      return items;
    }

    const reservoir: T[] = items.slice(0, sampleSize);

    for (let i = sampleSize; i < items.length; i++) {
      const j = Math.floor(Math.random() * (i + 1));

      if (j < sampleSize) {
        reservoir[j] = items[i];
      }
    }

    return reservoir;
  }

  /**
   * Stratified sampling - maintain distribution
   */
  static stratifiedSample<T>(
    items: T[],
    sampleSize: number,
    stratifyBy: (item: T) => string
  ): T[] {
    // Group by strata
    const strata = new Map<string, T[]>();

    items.forEach(item => {
      const stratum = stratifyBy(item);
      if (!strata.has(stratum)) {
        strata.set(stratum, []);
      }
      strata.get(stratum)!.push(item);
    });

    // Calculate samples per stratum
    const result: T[] = [];
    const totalStrata = strata.size;
    const samplesPerStratum = Math.floor(sampleSize / totalStrata);

    strata.forEach(stratumItems => {
      const sample = this.reservoirSample(stratumItems, samplesPerStratum);
      result.push(...sample);
    });

    return result;
  }
}
