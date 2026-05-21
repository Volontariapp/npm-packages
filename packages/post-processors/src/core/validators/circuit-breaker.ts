import { CircuitBreakerState } from '../../enums/circuit-breaker-state.enum.js';
import type { CircuitBreakerConfig } from '../../interfaces/validators/circuit-breaker-config.interface.js';

/**
 * Simple circuit breaker implementation for fault tolerance.
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private resetTimeout: NodeJS.Timeout | null = null;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly successThreshold: number;

  constructor(config: Required<CircuitBreakerConfig>) {
    this.failureThreshold = config.failureThreshold;
    this.resetTimeoutMs = config.resetTimeoutMs;
    this.successThreshold = config.successThreshold;
  }

  /**
   * Records a successful operation.
   */
  recordSuccess(): void {
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.reset();
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      this.failureCount = 0;
    }
  }

  /**
   * Records a failed operation.
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.open();
    } else if (
      this.state === CircuitBreakerState.CLOSED &&
      this.failureCount >= this.failureThreshold
    ) {
      this.open();
    }
  }

  isAllowed(): boolean {
    if (this.state === CircuitBreakerState.CLOSED) {
      return true;
    }

    if (this.state === CircuitBreakerState.OPEN) {
      const timeSinceFailure = Date.now() - (this.lastFailureTime ?? Date.now());
      if (timeSinceFailure >= this.resetTimeoutMs) {
        this.transitionToHalfOpen();
        return true;
      }
      return false;
    }

    return true;
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getDiagnostics(): {
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number | null;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }
  }

  private open(): void {
    this.state = CircuitBreakerState.OPEN;
    this.successCount = 0;
  }

  private transitionToHalfOpen(): void {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.successCount = 0;
    this.failureCount = 0;
  }
}
