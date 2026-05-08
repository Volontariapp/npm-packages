/**
 * Pause execution for a given number of milliseconds
 * @param ms - Number of milliseconds to sleep
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait for a condition to be met
 * @param predicate - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @param interval - Time between checks in milliseconds (default: 100)
 */
export const waitFor = async (
  predicate: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await predicate()) {
      return;
    }
    await sleep(interval);
  }
  throw new Error(`Timeout waiting for condition after ${String(timeout)}ms`);
};
