/**
 * Configuration for circuit breaker behavior.
 */
export interface CircuitBreakerConfig {
  /**
   * Number of consecutive failures before opening the circuit.
   * @default 5
   */
  failureThreshold?: number;

  /**
   * Duration in milliseconds before attempting to recover (transition to HALF_OPEN).
   * @default 30000 (30 seconds)
   */
  resetTimeoutMs?: number;

  /**
   * Number of successful calls in HALF_OPEN state before closing the circuit.
   * @default 2
   */
  successThreshold?: number;
}
