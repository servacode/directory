import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { ImageProcessor } from './image-processor.js';

const processor = new ImageProcessor();

describe('ImageProcessor', () => {
  it('decodes and re-encodes uploads to bounded metadata-free WebP', async () => {
    const input = await sharp({
      create: { width: 3200, height: 1800, channels: 3, background: { r: 10, g: 40, b: 80 } },
    })
      .jpeg({ quality: 90 })
      .withMetadata({ orientation: 1 })
      .toBuffer();

    const result = await processor.decodeValidateAndReencode(input, 'image/jpeg');
    const metadata = await sharp(result.bytes).metadata();

    expect(result.mimeType).toBe('image/webp');
    expect(result.width).toBeLessThanOrEqual(2560);
    expect(result.height).toBeLessThanOrEqual(2560);
    expect(metadata.format).toBe('webp');
    expect(metadata.exif).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
  });

  it('rejects undecodable input', async () => {
    await expect(processor.decodeValidateAndReencode(Buffer.from('not-an-image'), 'image/jpeg')).rejects.toThrow();
  });

  it('rejects excessive input dimensions before storage', async () => {
    const oversized = await sharp({
      create: { width: 12001, height: 2, channels: 3, background: { r: 1, g: 2, b: 3 } },
    }).png().toBuffer();
    await expect(processor.decodeValidateAndReencode(oversized, 'image/png')).rejects.toThrow();
  });
});
