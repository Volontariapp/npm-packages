/**
 * Simple circuit breaker pattern to prevent cascading failures.
 * States: CLOSED -> OPEN -> HALF_OPEN -> CLOSED
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}
