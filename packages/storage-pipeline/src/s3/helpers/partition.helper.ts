/**
 * Processes an array of items in partitioned batches, executing each batch concurrently with Promise.all.
 *
 * @param items Array of items to process
 * @param batchSize Number of items per partition
 * @param fn Sync or async task to execute for each item
 */
export async function partitionAll<T, R>(
  items: readonly T[],
  batchSize: number,
  fn: (item: T) => Promise<R> | R,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const safeBatchSize = Math.max(1, batchSize);
  const results: R[] = [];

  for (let i = 0; i < items.length; i += safeBatchSize) {
    const partition = items.slice(i, i + safeBatchSize);
    const partitionResults = await Promise.all(partition.map((item) => fn(item)));
    results.push(...partitionResults);
  }

  return results;
}
