import sharp from 'sharp';
import { createHash } from 'node:crypto';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
let activeJobs = 0;
export async function prepareCommunityImage(encoded) {
  if (!encoded || encoded.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error('INVALID_IMAGE');
  const input = Buffer.from(encoded, 'base64');
  if (!input.length || input.length > MAX_IMAGE_BYTES || input.toString('base64') !== encoded) throw new Error('INVALID_IMAGE');
  const png = input.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg = input[0] === 255 && input[1] === 216 && input[2] === 255;
  const webp = input.toString('ascii', 0, 4) === 'RIFF' && input.toString('ascii', 8, 12) === 'WEBP';
  if (!png && !jpeg && !webp) throw new Error('INVALID_IMAGE');
  if (activeJobs >= 2) throw new Error('IMAGE_BUSY');
  activeJobs++;
  try {
    const decoder = sharp(input, { limitInputPixels: 16000000, failOn: 'warning', animated: false });
    const metadata = await decoder.metadata();
    if (!['png', 'jpeg', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1) throw new Error('INVALID_IMAGE');
    const output = await decoder.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
    if (output.length > MAX_IMAGE_BYTES) throw new Error('INVALID_IMAGE');
    return { imageData: output, imageHash: createHash('sha256').update(input).digest('hex') };
  } catch { throw new Error('INVALID_IMAGE'); }
  finally { activeJobs--; }
}
