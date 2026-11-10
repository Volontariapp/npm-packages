import type { mockRedisCall, RedisMockCallReturn } from './redis-call.mock.js';

export interface BlockingXreadgroupControl {
  /** True once the consumption loop is blocked inside XREADGROUP. */
  isReading(): boolean;
  /** Lets the blocked XREADGROUP return an empty result. */
  release(): void;
}

/**
 * Makes XREADGROUP block until `release()` is called, so a test can hold the consumption
 * loop in the middle of a cycle while it calls `stop()`.
 */
export function mockBlockingXreadgroup(
  callMock: ReturnType<typeof mockRedisCall>,
): BlockingXreadgroupControl {
  let reading = false;
  let releaseRead: (() => void) | null = null;
  const gate = new Promise<void>((resolve) => {
    releaseRead = resolve;
  });

  callMock.mockImplementation(
    async (command: string, ..._args: (string | number)[]): Promise<RedisMockCallReturn> => {
      if (command === 'XGROUP') return 'OK';
      if (command === 'XREADGROUP') {
        reading = true;
        await gate;
        return [];
      }
      return null;
    },
  );

  return {
    isReading: () => reading,
    release: () => {
      releaseRead?.();
    },
  };
}
