import { expect, it } from 'vitest';
import { stat } from 'node:fs/promises';
import { videoRange, validateMp4, videoPath } from '../../apps/web/server/video-storage.js';
it('parses bounded, open-ended and suffix byte ranges without accepting multiple or unsatisfiable ranges', () => {
  expect(videoRange(null, 100)).toEqual({ start: 0, end: 99, partial: false });
  expect(videoRange('bytes=5-9', 100)).toEqual({ start: 5, end: 9, partial: true });
  expect(videoRange('bytes=90-', 100)).toEqual({ start: 90, end: 99, partial: true });
  expect(videoRange('bytes=-10', 100)).toEqual({ start: 90, end: 99, partial: true });
  expect(videoRange('bytes=90-999', 100)?.end).toBe(99);
  for (const header of ['bytes=100-', 'bytes=9-2', 'bytes=-0', 'bytes=-', 'bytes=0-1,5-6', 'bytes=999999999999999999-']) expect(videoRange(header, 100)).toBeNull();
});
it('accepts the playable test MP4 and prevents filesystem path traversal', async () => {
  const file = 'tests/fixtures/lesson.mp4';
  expect(await validateMp4(file, (await stat(file)).size)).toBe(true);
  expect(() => videoPath('../.env')).toThrow();
  expect(await validateMp4('README.md', (await stat('README.md')).size)).toBe(false);
});
