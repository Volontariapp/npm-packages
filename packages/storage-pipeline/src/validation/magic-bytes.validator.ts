/**
 * Magic bytes signatures for supported media types.
 */
const JPEG_HEADER = [0xff, 0xd8, 0xff];
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF_HEADER = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WEBP_HEADER = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
const FTYP_HEADER = [0x66, 0x74, 0x79, 0x70]; // "ftyp"

/**
 * ISO BMFF / HEIF brand identifiers used by Apple iOS / macOS and standard HEIF.
 * Apple cameras default to 'heic' / 'heix' containers.
 */
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx']);
const HEIF_BRANDS = new Set(['mif1', 'msf1', 'heim', 'heis']);

/**
 * Checks whether the buffer matches a given byte pattern at a specified offset.
 */
function matchesBytes(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) {
    return false;
  }
  for (let i = 0; i < bytes.length; i++) {
    if (buffer[offset + i] !== bytes[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Inspects an ISOBMFF buffer to detect Apple HEIC or standard HEIF brands.
 */
function detectHeicOrHeif(buffer: Buffer): 'image/heic' | 'image/heif' | null {
  if (buffer.length < 12) {
    return null;
  }

  // Box header: 4 bytes length, followed by 'ftyp'
  if (!matchesBytes(buffer, FTYP_HEADER, 4)) {
    return null;
  }

  const boxLength = buffer.readUInt32BE(0);
  if (boxLength < 12) {
    return null;
  }

  // Major brand at offset 8 (4 bytes)
  const majorBrand = buffer.subarray(8, 12).toString('ascii').toLowerCase();
  if (HEIC_BRANDS.has(majorBrand)) {
    return 'image/heic';
  }

  // Scan compatible brands in the remainder of the ftyp box
  const scanLimit = Math.min(buffer.length, boxLength > 0 ? boxLength : 64);
  let isHeif = HEIF_BRANDS.has(majorBrand);

  for (let offset = 16; offset + 4 <= scanLimit; offset += 4) {
    const brand = buffer
      .subarray(offset, offset + 4)
      .toString('ascii')
      .toLowerCase();
    if (HEIC_BRANDS.has(brand)) {
      return 'image/heic';
    }
    if (HEIF_BRANDS.has(brand)) {
      isHeif = true;
    }
  }

  return isHeif ? 'image/heif' : null;
}

/**
 * Inspects a buffer to check if it contains SVG, XML or HTML text/script indicators.
 * SVG is strictly rejected across the platform due to SSRF and XSS vectors.
 */
export function isSvgOrScript(buffer: Buffer): boolean {
  // Read first 1024 bytes as ascii/utf-8 text
  const sampleLength = Math.min(buffer.length, 1024);
  const text = buffer.subarray(0, sampleLength).toString('utf8').toLowerCase();

  return (
    text.includes('<svg') ||
    text.includes('<?xml') ||
    text.includes('<!doctype') ||
    text.includes('<html') ||
    text.includes('<script')
  );
}

/**
 * Detects the MIME type of a file buffer based on its header magic bytes.
 * Returns the detected MIME type, or null if unknown / unsupported.
 * Supports: JPEG, PNG, WebP, Apple HEIC, and HEIF.
 */
export function detectMimeType(buffer: Buffer): string | null {
  if (buffer.length < 12) {
    return null;
  }

  // Reject script or SVG polyglots immediately
  if (isSvgOrScript(buffer)) {
    return null;
  }

  // JPEG: FF D8 FF
  if (matchesBytes(buffer, JPEG_HEADER, 0)) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (matchesBytes(buffer, PNG_HEADER, 0)) {
    return 'image/png';
  }

  // WebP: 'RIFF' at offset 0, 'WEBP' at offset 8
  if (matchesBytes(buffer, RIFF_HEADER, 0) && matchesBytes(buffer, WEBP_HEADER, 8)) {
    return 'image/webp';
  }

  // Apple HEIC / HEIF: 'ftyp' at offset 4 with heic/heix/hevc/mif1 brand
  const heicOrHeif = detectHeicOrHeif(buffer);
  if (heicOrHeif) {
    return heicOrHeif;
  }

  return null;
}

/**
 * Validates that the file buffer magic bytes strictly match the declared MIME type.
 *
 * Normalizes aliases:
 * - 'image/jpg' is treated as 'image/jpeg'
 * - 'image/heic' and 'image/heif' (plus sequence aliases) are cross-compatible
 */
export function validateMagicBytes(buffer: Buffer, declaredMimeType: string): boolean {
  if (!declaredMimeType) {
    return false;
  }

  const detected = detectMimeType(buffer);
  if (!detected) {
    return false;
  }

  const normalizedDeclared = declaredMimeType.trim().toLowerCase();
  const canonicalDeclared = normalizedDeclared === 'image/jpg' ? 'image/jpeg' : normalizedDeclared;

  if (detected === canonicalDeclared) {
    return true;
  }

  // Allow cross-validation between Apple HEIC and HEIF variants
  const heicFamily = new Set([
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence',
  ]);
  if (heicFamily.has(detected) && heicFamily.has(canonicalDeclared)) {
    return true;
  }

  return false;
}
