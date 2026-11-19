import { closeSync, openSync, readSync } from 'node:fs';
/** Width and height from a WebP file's header (lossy VP8, lossless VP8L or extended VP8X), read from the first 30 bytes. */
export function webpSize(file: string): { width: number; height: number } {
  const b = Buffer.alloc(30);
  const fd = openSync(file, 'r');
  try {
    readSync(fd, b, 0, 30, 0);
  } finally {
    closeSync(fd);
  }
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') throw new Error(`not a WebP file: ${file}`);
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X') return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
  throw new Error(`unknown WebP chunk ${chunk}: ${file}`);
}
