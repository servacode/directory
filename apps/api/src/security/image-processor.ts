import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import type { SupportedImageMime } from './image-security.js';

export interface ProcessedImage {
  readonly bytes: Buffer;
  readonly mimeType: 'image/webp';
  readonly width: number;
  readonly height: number;
}

const MAX_INPUT_PIXELS = 40_000_000;
const MAX_INPUT_DIMENSION = 12_000;
const MAX_OUTPUT_DIMENSION = 2_560;

@Injectable()
export class ImageProcessor {
  async decodeValidateAndReencode(bytes: Buffer, _sourceMime: SupportedImageMime): Promise<ProcessedImage> {
    const source = sharp(bytes, {
      failOn: 'error',
      limitInputPixels: MAX_INPUT_PIXELS,
      sequentialRead: true,
      animated: false,
    });

    const metadata = await source.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (width <= 0 || height <= 0) throw new Error('IMAGE_DIMENSIONS_MISSING');
    if (width > MAX_INPUT_DIMENSION || height > MAX_INPUT_DIMENSION || width * height > MAX_INPUT_PIXELS) {
      throw new Error('IMAGE_DIMENSIONS_EXCEEDED');
    }
    if ((metadata.pages ?? 1) !== 1) throw new Error('ANIMATED_IMAGE_NOT_ALLOWED');

    // rotate() applies EXIF orientation while the output intentionally omits source metadata.
    const { data, info } = await source
      .rotate()
      .resize({
        width: MAX_OUTPUT_DIMENSION,
        height: MAX_OUTPUT_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    if (!info.width || !info.height || data.byteLength <= 0) throw new Error('IMAGE_REENCODE_FAILED');
    return { bytes: data, mimeType: 'image/webp', width: info.width, height: info.height };
  }
}
