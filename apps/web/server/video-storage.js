import { mkdir, open, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const root = fileURLToPath(new URL('../../../.private-videos/', import.meta.url));
export const videoPath = name => {
  if (!/^[a-f0-9-]{36}\.mp4(?:\.partial)?$/.test(name)) throw new Error('INVALID_FILE');
  return path.join(root, name);
};
export const prepareVideoStorage = () => mkdir(root, { recursive: true });
export const removeVideo = name => unlink(videoPath(name)).catch(error => { if (error.code !== 'ENOENT') throw error; });
// Inspect top-level ISO BMFF boxes without loading the video into memory.
export async function validateMp4(filename, bytes) {
  const file = await open(filename, 'r');
  try {
    let offset = 0, count = 0, ftyp = false, moov = false, mdat = false;
    const header = Buffer.alloc(32);
    while (offset < bytes && count++ < 100000) {
      const { bytesRead } = await file.read(header, 0, Math.min(32, bytes - offset), offset);
      if (bytesRead < 8) return false;
      let size = header.readUInt32BE(0), min = 8;
      const type = header.toString('ascii', 4, 8);
      if (size === 1) { if (bytesRead < 16) return false; const big = header.readBigUInt64BE(8); if (big > BigInt(bytes)) return false; size = Number(big); min = 16; }
      if (size === 0) size = bytes - offset;
      if (size < min || offset + size > bytes) return false;
      if (offset === 0) {
        if (type !== 'ftyp' || size < 16 || !['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V '].includes(header.toString('ascii', 8, 12))) return false;
        ftyp = true;
      }
      if (type === 'moov' && size > min) moov = true;
      if (type === 'mdat' && size > min) mdat = true;
      offset += size;
    }
    return offset === bytes && ftyp && moov && mdat;
  } finally { await file.close(); }
}
export function videoRange(header, size) {
  if (!header) return { start: 0, end: size - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size) return null;
  return { start, end, partial: true };
}
