export type SupportedImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

const PNG_SIGNATURE = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);

export function detectImageMime(bytes: Buffer): SupportedImageMime | undefined {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0,8).equals(PNG_SIGNATURE)) return 'image/png';
  if (bytes.length >= 12 && bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP') return 'image/webp';
  return undefined;
}

export function assertImageSignature(bytes: Buffer, declaredMime: string): SupportedImageMime {
  const detected = detectImageMime(bytes);
  if (!detected || detected !== declaredMime) throw new Error('IMAGE_SIGNATURE_MISMATCH');
  return detected;
}

/** Removes common metadata containers without decoding pixel data. A full decode/re-encode
 * pipeline may replace this adapter when the production image processor is selected. */
export function stripImageMetadata(bytes: Buffer, mime: SupportedImageMime): Buffer {
  if (mime === 'image/jpeg') return stripJpegMetadata(bytes);
  if (mime === 'image/png') return stripPngMetadata(bytes);
  if (mime === 'image/webp') return stripWebpMetadata(bytes);
  return bytes;
}

function stripJpegMetadata(bytes: Buffer): Buffer {
  if (bytes.length < 4) return bytes;
  const chunks: Buffer[] = [bytes.subarray(0,2)];
  let offset = 2;
  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) { chunks.push(bytes.subarray(offset)); break; }
    let markerOffset = offset;
    while (markerOffset < bytes.length && bytes[markerOffset] === 0xff) markerOffset++;
    if (markerOffset >= bytes.length) break;
    const marker = bytes[markerOffset]!;
    if (marker === 0xda) { chunks.push(bytes.subarray(offset)); break; } // start of scan: pixel stream follows
    if (marker === 0xd9) { chunks.push(bytes.subarray(offset, markerOffset + 1)); break; }
    // Standalone markers have no length field.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(bytes.subarray(offset, markerOffset + 1)); offset = markerOffset + 1; continue;
    }
    const lengthPos = markerOffset + 1;
    if (lengthPos + 1 >= bytes.length) return bytes;
    const segmentLength = bytes.readUInt16BE(lengthPos);
    const segmentEnd = lengthPos + segmentLength;
    if (segmentLength < 2 || segmentEnd > bytes.length) return bytes;
    // APP1 (EXIF/XMP), APP13 (IPTC) and COM are metadata only.
    const drop = marker === 0xe1 || marker === 0xed || marker === 0xfe;
    if (!drop) chunks.push(bytes.subarray(offset, segmentEnd));
    offset = segmentEnd;
  }
  return Buffer.concat(chunks);
}

function stripPngMetadata(bytes: Buffer): Buffer {
  if (bytes.length < 12 || !bytes.subarray(0,8).equals(PNG_SIGNATURE)) return bytes;
  const out: Buffer[] = [bytes.subarray(0,8)];
  let offset = 8;
  const metadata = new Set(['tEXt','zTXt','iTXt','eXIf']);
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) return bytes;
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (!metadata.has(type)) out.push(bytes.subarray(offset,end));
    offset = end;
    if (type === 'IEND') break;
  }
  return Buffer.concat(out);
}

function stripWebpMetadata(bytes: Buffer): Buffer {
  if (bytes.length < 12 || bytes.toString('ascii',0,4) !== 'RIFF' || bytes.toString('ascii',8,12) !== 'WEBP') return bytes;
  const chunks: Buffer[] = [];
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = bytes.toString('ascii',offset,offset+4);
    const size = bytes.readUInt32LE(offset+4);
    const padded = size + (size % 2);
    const end = offset + 8 + padded;
    if (end > bytes.length) return bytes;
    if (type !== 'EXIF' && type !== 'XMP ') chunks.push(bytes.subarray(offset,end));
    offset = end;
  }
  const payload = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write('RIFF',0,'ascii'); header.writeUInt32LE(payload.length + 4,4); header.write('WEBP',8,'ascii');
  return Buffer.concat([header,payload]);
}
