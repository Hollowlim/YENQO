import { expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { readdir, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { digestToken } from '../../apps/web/server/security.js';

it('delivers a local-only reset link and completes its one-use flow without exposing the token in the API', async () => {
  const base = process.env.RESET_DELIVERY_ORIGIN ?? 'http://127.0.0.1:3001';
  const db = new PrismaClient();
  const email = `reset-delivery-${Date.now()}@example.test`;
  const password = 'Local reset test passphrase 2026!';
  const post = (action: string, data: unknown) => fetch(`${base}/api/auth/${action}`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const outbox = path.resolve('apps/web/.local-mail');
  let mailPath: string | undefined;
  try {
    expect((await post('register', { name: 'Reset Delivery Test', email, password })).status).toBe(201);
    const response = await post('forgot-password', { email });
    expect(response.status).toBe(200);
    const message = await response.text();
    expect(message).not.toContain('token=');
    expect(message).not.toContain(email);
    let mail: { to: string; url: string } | undefined;
    await expect.poll(async () => {
    for (const file of await readdir(outbox).catch(() => [])) {
      const candidate = path.join(outbox, file);
      const value = JSON.parse(await readFile(candidate, 'utf8')) as { to: string; url: string };
      if (value.to === email) { mail = value; mailPath = candidate; break; }
    }
    return Boolean(mail);
    },{timeout:10000}).toBe(true);
    expect(mail).toBeDefined();
    const url = new URL(mail!.url);
    expect(url.origin).toBe(base);
    const token = url.searchParams.get('token')!;
    expect(token).toHaveLength(43);
    const record = await db.passwordReset.findUniqueOrThrow({ where: { tokenHash: digestToken(token) } });
    expect(record.tokenHash).not.toBe(token);
    expect((await post('reset-password', { token, password: `${password}new` })).status).toBe(200);
    expect((await post('reset-password', { token, password })).status).toBe(400);
    expect((await post('login', { email, password: `${password}new` })).status).toBe(200);
    const missing = await post('forgot-password', { email: `absent-${email}` });
    expect(missing.status).toBe(200);
    expect(await missing.text()).toBe(message);
  } finally {
    if (mailPath) await unlink(mailPath);
    await db.user.deleteMany({ where: { email } });
    await db.$disconnect();
  }
});
