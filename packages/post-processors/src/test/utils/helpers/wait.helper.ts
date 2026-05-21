/**
 * Waits for a condition to be met, polling at regular intervals.
 * Throws an error if the condition is not met within the timeout.
 */
export async function waitFor(
  fn: () => boolean | Promise<boolean>,
  timeoutMs = 2000,
  intervalMs = 10,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await fn()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timeout waiting for condition after ${String(timeoutMs)}ms`);
}
