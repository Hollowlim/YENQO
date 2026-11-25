import { expect, it } from 'vitest';
import { readBoundedJson } from '../../apps/web/server/request-body.js';

it('parses a small streamed JSON body without content-length', async () => {
  const bytes = new TextEncoder().encode('{"name":"Member"}');
  const stream = new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } });
  expect(await readBoundedJson(stream, 8192)).toEqual({ name: 'Member' });
});

it('cancels an oversized stream before reading all of it', async () => {
  let read = 0;
  let cancelled = false;
  const stream = new ReadableStream({ pull(controller) { read++; controller.enqueue(new Uint8Array(4096)); }, cancel() { cancelled = true; } });
  await expect(readBoundedJson(stream, 8192)).rejects.toThrow('BODY_TOO_LARGE');
  expect(cancelled).toBe(true);
  expect(read).toBeLessThan(6);
});

it('rejects malformed and missing JSON bodies', async () => {
  await expect(readBoundedJson(null, 8192)).rejects.toThrow('INVALID_JSON');
  await expect(readBoundedJson(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{')); c.close(); } }), 8192)).rejects.toThrow('INVALID_JSON');
});
