import { describe, it, expect } from '@jest/globals';
import {
  detectMimeType,
  validateMagicBytes,
  isSvgOrScript,
} from '../validation/magic-bytes.validator.js';

describe('MagicBytesValidator', () => {
  // Sample valid magic byte headers
  const validJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  const validPng = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  const validWebp = Buffer.concat([
    Buffer.from([0x52, 0x49, 0x46, 0x46]), // "RIFF"
    Buffer.from([0x20, 0x00, 0x00, 0x00]), // file size
    Buffer.from([0x57, 0x45, 0x42, 0x50]), // "WEBP"
    Buffer.from([0x56, 0x50, 0x38, 0x20]), // "VP8 "
  ]);

  // Apple HEIC header: ftyp at offset 4, heic brand at offset 8
  const validHeic = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x18]), // length 24
    Buffer.from('ftyp', 'ascii'),
    Buffer.from('heic', 'ascii'),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from('mif1', 'ascii'),
    Buffer.from('heic', 'ascii'),
  ]);

  // Apple HEIX header: ftyp at offset 4, heix brand at offset 8
  const validHeix = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x18]), // length 24
    Buffer.from('ftyp', 'ascii'),
    Buffer.from('heix', 'ascii'),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from('mif1', 'ascii'),
    Buffer.from('heix', 'ascii'),
  ]);

  // Standard HEIF header: ftyp at offset 4, mif1 brand at offset 8
  const validHeif = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x18]), // length 24
    Buffer.from('ftyp', 'ascii'),
    Buffer.from('mif1', 'ascii'),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from('mif1', 'ascii'),
    Buffer.from('msf1', 'ascii'),
  ]);

  // HEIF header with major brand mif1 but compatible brand heic
  const validMif1WithHeic = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x18]), // length 24
    Buffer.from('ftyp', 'ascii'),
    Buffer.from('mif1', 'ascii'),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from('mif1', 'ascii'),
    Buffer.from('heic', 'ascii'),
  ]);

  describe('detectMimeType', () => {
    it('should detect image/jpeg from JPEG header', () => {
      expect(detectMimeType(validJpeg)).toBe('image/jpeg');
    });

    it('should detect image/png from PNG header', () => {
      expect(detectMimeType(validPng)).toBe('image/png');
    });

    it('should detect image/webp from WebP header', () => {
      expect(detectMimeType(validWebp)).toBe('image/webp');
    });

    it('should detect image/heic from Apple HEIC header', () => {
      expect(detectMimeType(validHeic)).toBe('image/heic');
    });

    it('should detect image/heic from Apple HEIX header', () => {
      expect(detectMimeType(validHeix)).toBe('image/heic');
    });

    it('should detect image/heic when major brand is mif1 but compatible brand contains heic', () => {
      expect(detectMimeType(validMif1WithHeic)).toBe('image/heic');
    });

    it('should detect image/heif from generic HEIF header (mif1/msf1)', () => {
      expect(detectMimeType(validHeif)).toBe('image/heif');
    });

    it('should return null for buffer that is too short', () => {
      expect(detectMimeType(Buffer.from([0xff, 0xd8]))).toBeNull();
    });

    it('should return null for unknown binary format (e.g. PDF)', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 1234567890');
      expect(detectMimeType(pdfBuffer)).toBeNull();
    });

    it('should reject SVG files', () => {
      const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100"></svg>');
      expect(detectMimeType(svgBuffer)).toBeNull();
    });

    it('should reject XML files with embedded scripts', () => {
      const xmlBuffer = Buffer.from('<?xml version="1.0"?><script>alert(1)</script>');
      expect(detectMimeType(xmlBuffer)).toBeNull();
    });
  });

  describe('validateMagicBytes', () => {
    it('should return true when JPEG buffer matches image/jpeg', () => {
      expect(validateMagicBytes(validJpeg, 'image/jpeg')).toBe(true);
    });

    it('should return true when JPEG buffer matches image/jpg alias', () => {
      expect(validateMagicBytes(validJpeg, 'image/jpg')).toBe(true);
    });

    it('should return true when PNG buffer matches image/png', () => {
      expect(validateMagicBytes(validPng, 'image/png')).toBe(true);
    });

    it('should return true when WebP buffer matches image/webp', () => {
      expect(validateMagicBytes(validWebp, 'image/webp')).toBe(true);
    });

    it('should return true when Apple HEIC buffer matches image/heic', () => {
      expect(validateMagicBytes(validHeic, 'image/heic')).toBe(true);
    });

    it('should return true when Apple HEIC buffer matches image/heif cross-compatibility', () => {
      expect(validateMagicBytes(validHeic, 'image/heif')).toBe(true);
    });

    it('should return true when HEIF buffer matches image/heif', () => {
      expect(validateMagicBytes(validHeif, 'image/heif')).toBe(true);
    });

    it('should return false when declared MIME does not match detected MIME', () => {
      expect(validateMagicBytes(validJpeg, 'image/png')).toBe(false);
      expect(validateMagicBytes(validPng, 'image/jpeg')).toBe(false);
      expect(validateMagicBytes(validWebp, 'image/png')).toBe(false);
      expect(validateMagicBytes(validHeic, 'image/jpeg')).toBe(false);
      expect(validateMagicBytes(validJpeg, 'image/heic')).toBe(false);
    });

    it('should return false when buffer is empty or null', () => {
      expect(validateMagicBytes(Buffer.alloc(0), 'image/jpeg')).toBe(false);
    });
  });

  describe('isSvgOrScript', () => {
    it('should detect <svg tags', () => {
      expect(isSvgOrScript(Buffer.from('<svg viewBox="0 0 10 10"></svg>'))).toBe(true);
    });

    it('should detect <?xml tags', () => {
      expect(isSvgOrScript(Buffer.from('<?xml version="1.0" encoding="UTF-8"?>'))).toBe(true);
    });

    it('should detect <script tags', () => {
      expect(isSvgOrScript(Buffer.from('<script>console.log("pwned")</script>'))).toBe(true);
    });

    it('should return false for binary image data', () => {
      expect(isSvgOrScript(validJpeg)).toBe(false);
      expect(isSvgOrScript(validPng)).toBe(false);
      expect(isSvgOrScript(validHeic)).toBe(false);
    });
  });
});
