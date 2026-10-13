import { logger } from './monitoring-logger.js';

export interface ShutdownTarget {
  shutdown(): Promise<void>;
}

/** The part of `process` used here, so a test can stand in for it. */
export interface SignalProcess {
  readonly pid: number;
  listenerCount(event: 'SIGTERM'): number;
  prependOnceListener(event: 'SIGTERM', listener: () => void): unknown;
  kill(pid: number, signal: 'SIGTERM'): unknown;
}

/**
 * Flushes the SDK on SIGTERM without calling `process.exit`, which cut short the graceful
 * shutdown of NestJS (requests in flight were dropped).
 *
 * Node stops terminating on SIGTERM as soon as one listener exists. If another listener is
 * registered (NestJS `enableShutdownHooks`), it owns the termination. If not, this one is the
 * only listener and the process would never exit, so once the flush is done the signal is
 * sent again, and with no listener left Node terminates the process as it would by default.
 * That decision is taken when the signal arrives, not after the flush: NestJS removes its own
 * listener while it is still closing the application.
 */
export function registerGracefulShutdown(sdk: ShutdownTarget, proc: SignalProcess = process): void {
  // Prepended so this listener runs first and sees the others still registered.
  proc.prependOnceListener('SIGTERM', () => {
    const someoneElseTerminates = proc.listenerCount('SIGTERM') > 0;

    void sdk
      .shutdown()
      .catch((err: unknown) => {
        logger.error('OTel SDK shutdown error', err);
      })
      .finally(() => {
        if (!someoneElseTerminates) {
          proc.kill(proc.pid, 'SIGTERM');
        }
      });
  });
}
