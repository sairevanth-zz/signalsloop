/**
 * Request Queue with Concurrency Limiting
 * Prevents overwhelming the database with too many concurrent requests
 */

interface QueuedRequest<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent = 50) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Add a request to the queue
   */
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  /**
   * Process queued requests
   */
  private async process(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const request = this.queue.shift();
    if (!request) return;

    this.running++;

    try {
      const result = await request.fn();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queued: this.queue.length,
      running: this.running,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

// Create singleton instance with conservative limit
// This prevents overwhelming Supabase with too many concurrent connections
export const dbRequestQueue = new RequestQueue(30);

/**
 * Wrapper to execute database requests through the queue
 */
export async function withQueue<T>(fn: () => Promise<T>): Promise<T> {
  return dbRequestQueue.add(fn);
}
