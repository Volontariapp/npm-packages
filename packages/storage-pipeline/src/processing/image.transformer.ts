import sharp from 'sharp';
import type { OutputPolicy } from '@volontariapp/domain-storage';
import type { ImageTransformerConfig } from '../config/storage-pipeline.config.js';

export interface TransformedImageResult {
  readonly buffer: Buffer;
  readonly format: 'webp' | 'png';
  readonly mimeType: 'image/webp' | 'image/png';
  readonly width: number;
  readonly height: number;
  readonly size: number;
}

const DEFAULT_MAX_INPUT_PIXELS = 25_000_000; // e.g. 5000 x 5000 px
const DEFAULT_WEBP_QUALITY = 85;
const DEFAULT_PNG_COMPRESSION = 8;

export class ImageTransformer {
  private readonly maxInputPixels: number;
  private readonly webpQuality: number;
  private readonly pngCompressionLevel: number;

  constructor(config?: ImageTransformerConfig) {
    this.maxInputPixels = config?.maxInputPixels ?? DEFAULT_MAX_INPUT_PIXELS;
    this.webpQuality = config?.webpQuality ?? DEFAULT_WEBP_QUALITY;
    this.pngCompressionLevel = config?.pngCompressionLevel ?? DEFAULT_PNG_COMPRESSION;
  }

  /**
   * Sanitizes, auto-orients, strips metadata (PII/GPS), resizes and converts
   * an input image according to the specified entity OutputPolicy.
   *
   * @throws Error if the image is corrupted, un-decodable, or exceeds pixel limits.
   */
  async transformImage(
    inputBuffer: Buffer,
    outputPolicy: OutputPolicy,
  ): Promise<TransformedImageResult> {
    if (inputBuffer.length === 0) {
      throw new Error('Image input buffer is empty');
    }

    // 1. Inspect metadata with decompression bomb limit
    const instance = sharp(inputBuffer, {
      limitInputPixels: this.maxInputPixels,
      failOnError: true,
    });

    const metadata = await instance.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to decode image dimensions from header');
    }

    const totalPixels = metadata.width * metadata.height;
    if (totalPixels > this.maxInputPixels) {
      throw new Error(
        `Image total pixels (${String(totalPixels)}) exceeds maximum allowed (${String(this.maxInputPixels)})`,
      );
    }

    // 2. Auto-orient based on EXIF before stripping metadata
    // Sharp's rotate() without parameters reads EXIF orientation and rotates accordingly.
    instance.rotate();

    // 3. Resize according to output policy
    if (outputPolicy.height !== null) {
      // Fixed square or rectangle (e.g. 512x512 for avatar, 256x256 for badge)
      instance.resize({
        width: outputPolicy.width,
        height: outputPolicy.height,
        fit: 'cover',
        position: 'center',
      });
    } else {
      // Max width, maintain aspect ratio, do not enlarge if smaller
      instance.resize({
        width: outputPolicy.width,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // 4. Strip all metadata (EXIF, GPS coordinates, camera model, etc.)
    // By default, Sharp discards all metadata unless withMetadata() is explicitly invoked.

    // 5. Convert to target output format
    let mimeType: 'image/webp' | 'image/png';

    if (outputPolicy.format === 'webp') {
      mimeType = 'image/webp';
      instance.webp({
        quality: this.webpQuality,
        effort: 4,
      });
    } else {
      mimeType = 'image/png';
      instance.png({
        compressionLevel: this.pngCompressionLevel,
      });
    }

    // 6. Execute pipeline to buffer
    const { data: outputBuffer, info } = await instance.toBuffer({ resolveWithObject: true });

    return {
      buffer: outputBuffer,
      format: outputPolicy.format,
      mimeType,
      width: info.width,
      height: info.height,
      size: outputBuffer.length,
    };
  }
}
