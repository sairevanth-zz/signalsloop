/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests to failing services
 */

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
  successCount: number;
}

class CircuitBreaker {
  private circuits: Map<string, CircuitBreakerState> = new Map();

  // Configuration
  private readonly FAILURE_THRESHOLD = 5; // Open circuit after 5 failures
  private readonly SUCCESS_THRESHOLD = 2; // Close circuit after 2 successes in half-open
  private readonly TIMEOUT = 30000; // 30 seconds before trying again
  private readonly RESET_TIMEOUT = 60000; // Reset failure count after 60s of success

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    fallback?: () => T
  ): Promise<T> {
    const circuit = this.getCircuit(key);

    // If circuit is open, reject immediately
    if (circuit.state === 'open') {
      const timeSinceFailure = Date.now() - circuit.lastFailureTime;

      if (timeSinceFailure < this.TIMEOUT) {
        if (fallback) {
          return fallback();
        }
        throw new Error(`Circuit breaker is open for ${key}. Retry after ${Math.ceil((this.TIMEOUT - timeSinceFailure) / 1000)}s`);
      }

      // Transition to half-open to try again
      circuit.state = 'half-open';
      circuit.successCount = 0;
    }

    try {
      const result = await fn();
      this.onSuccess(key);
      return result;
    } catch (error) {
      this.onFailure(key);
      throw error;
    }
  }

  /**
   * Get or create circuit state
   */
  private getCircuit(key: string): CircuitBreakerState {
    if (!this.circuits.has(key)) {
      this.circuits.set(key, {
        failures: 0,
        lastFailureTime: 0,
        state: 'closed',
        successCount: 0,
      });
    }
    return this.circuits.get(key)!;
  }

  /**
   * Handle successful execution
   */
  private onSuccess(key: string): void {
    const circuit = this.getCircuit(key);

    if (circuit.state === 'half-open') {
      circuit.successCount++;

      // Close circuit after threshold successes
      if (circuit.successCount >= this.SUCCESS_THRESHOLD) {
        circuit.state = 'closed';
        circuit.failures = 0;
        circuit.successCount = 0;
      }
    } else if (circuit.state === 'closed') {
      // Reset failure count on sustained success
      const timeSinceFailure = Date.now() - circuit.lastFailureTime;
      if (timeSinceFailure > this.RESET_TIMEOUT) {
        circuit.failures = 0;
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(key: string): void {
    const circuit = this.getCircuit(key);

    circuit.failures++;
    circuit.lastFailureTime = Date.now();

    // Open circuit if threshold reached
    if (circuit.failures >= this.FAILURE_THRESHOLD) {
      circuit.state = 'open';
    }
  }

  /**
   * Get circuit state for monitoring
   */
  getState(key: string): CircuitBreakerState | undefined {
    return this.circuits.get(key);
  }

  /**
   * Manually reset a circuit
   */
  reset(key: string): void {
    this.circuits.delete(key);
  }
}

// Export singleton instance
export const circuitBreaker = new CircuitBreaker();

/**
 * Wrapper function for circuit breaker with key generation
 */
export async function withCircuitBreaker<T>(
  operation: string,
  fn: () => Promise<T>,
  fallback?: () => T
): Promise<T> {
  return circuitBreaker.execute(operation, fn, fallback);
}
