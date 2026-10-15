import { partitionAll } from './partition.helper.js';

/**
 * Collects an AsyncIterable of chunks and converts them into a single Buffer
 * using partitioned chunk transformation with Promise.all.
 */
export async function streamToBuffer(
  stream: AsyncIterable<Uint8Array | Buffer | string>,
  partitionSize = 50,
): Promise<Buffer> {
  const rawChunks: (Uint8Array | Buffer | string)[] = [];
  for await (const chunk of stream) {
    rawChunks.push(chunk);
  }

  if (rawChunks.length === 0) {
    return Buffer.alloc(0);
  }

  // Convert raw chunks to Buffers concurrently in partitioned batches via Promise.all
  const bufferChunks = await partitionAll(rawChunks, partitionSize, (chunk) => {
    if (Buffer.isBuffer(chunk)) {
      return chunk;
    }
    if (chunk instanceof Uint8Array) {
      return Buffer.from(chunk);
    }
    return Buffer.from(chunk, 'utf8');
  });

  return Buffer.concat(bufferChunks);
}
