import { describe, it, expect, beforeAll } from '@jest/globals';
import sharp from 'sharp';
import { ImageTransformer } from '../processing/image.transformer.js';
import type { OutputPolicy } from '@volontariapp/domain-storage';

describe('ImageTransformer', () => {
  let sampleImageBuffer: Buffer;

  beforeAll(async () => {
    // Generate a test 800x600 PNG image
    sampleImageBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 4,
        background: { r: 255, g: 100, b: 50, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
  });

  it('should transform to fixed dimensions (WebP 512x512) for avatars', async () => {
    const transformer = new ImageTransformer();
    const avatarPolicy: OutputPolicy = {
      format: 'webp',
      width: 512,
      height: 512,
    };

    const result = await transformer.transformImage(sampleImageBuffer, avatarPolicy);

    expect(result.format).toBe('webp');
    expect(result.mimeType).toBe('image/webp');
    expect(result.width).toBe(512);
    expect(result.height).toBe(512);
    expect(result.buffer.length).toBeGreaterThan(0);

    // Verify output buffer with sharp
    const outputMeta = await sharp(result.buffer).metadata();
    expect(outputMeta.format).toBe('webp');
    expect(outputMeta.width).toBe(512);
    expect(outputMeta.height).toBe(512);
  });

  it('should transform to fixed dimensions (PNG 256x256) for badge icons', async () => {
    const transformer = new ImageTransformer();
    const badgePolicy: OutputPolicy = {
      format: 'png',
      width: 256,
      height: 256,
    };

    const result = await transformer.transformImage(sampleImageBuffer, badgePolicy);

    expect(result.format).toBe('png');
    expect(result.mimeType).toBe('image/png');
    expect(result.width).toBe(256);
    expect(result.height).toBe(256);

    const outputMeta = await sharp(result.buffer).metadata();
    expect(outputMeta.format).toBe('png');
    expect(outputMeta.width).toBe(256);
    expect(outputMeta.height).toBe(256);
  });

  it('should transform with aspect ratio (max width 2048, height null) for posts and events', async () => {
    const transformer = new ImageTransformer();
    const postPolicy: OutputPolicy = {
      format: 'webp',
      width: 2048,
      height: null,
    };

    const result = await transformer.transformImage(sampleImageBuffer, postPolicy);

    expect(result.format).toBe('webp');
    expect(result.mimeType).toBe('image/webp');
    // Original was 800x600, so withoutEnlargement: true means it stays 800x600
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it('should downscale when image exceeds max width', async () => {
    const largeImage = await sharp({
      create: {
        width: 3000,
        height: 1500,
        channels: 4,
        background: { r: 0, g: 200, b: 100, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const transformer = new ImageTransformer();
    const postPolicy: OutputPolicy = {
      format: 'webp',
      width: 2048,
      height: null,
    };

    const result = await transformer.transformImage(largeImage, postPolicy);

    expect(result.width).toBe(2048);
    // 3000 -> 2048 (ratio = 2048/3000 * 1500 = 1024)
    expect(result.height).toBe(1024);
  });

  it('should throw error when image exceeds maxInputPixels (decompression bomb protection)', async () => {
    // Config with low maxInputPixels threshold
    const transformer = new ImageTransformer({ maxInputPixels: 1000 });
    const policy: OutputPolicy = { format: 'webp', width: 100, height: null };

    // sampleImageBuffer is 800x600 = 480,000 pixels > 1000
    await expect(transformer.transformImage(sampleImageBuffer, policy)).rejects.toThrow(
      /exceeds pixel limit|exceeds maximum allowed/,
    );
  });

  it('should throw error for corrupted or empty image buffer', async () => {
    const transformer = new ImageTransformer();
    const policy: OutputPolicy = { format: 'webp', width: 512, height: 512 };

    await expect(transformer.transformImage(Buffer.alloc(0), policy)).rejects.toThrow();
    await expect(
      transformer.transformImage(Buffer.from('corrupted garbage binary data'), policy),
    ).rejects.toThrow();
  });
});
