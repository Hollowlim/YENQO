import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword, newToken, digestToken, sessionIsValid, canAccessAdmin, ownsResource, isSameOrigin, credentialsSchema, registrationSchema, resetSchema } from '../../apps/web/server/security.js';

describe('password storage', () => {
  it('uses salted slow hashes and verifies only the correct password', async () => {
    const password = 'A long local test passphrase!';
    const a = await hashPassword(password);
    const b = await hashPassword(password);
    expect(a).not.toBe(b);
    expect(a).not.toContain(password);
    expect(await verifyPassword(password, a)).toBe(true);
    expect(await verifyPassword('wrong', a)).toBe(false);
    expect(await verifyPassword(password, 'broken')).toBe(false);
  });
});

describe('sessions and authorization', () => {
  it('stores only a digest of unpredictable opaque tokens', () => {
    const a = newToken();
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(newToken()).not.toBe(a);
    expect(digestToken(a)).toHaveLength(64);
    expect(digestToken(a)).not.toBe(a);
  });
  it('rejects expired sessions including the expiry boundary', () => {
    const now = new Date('2026-10-20T08:00:00Z');
    expect(sessionIsValid(null, now)).toBe(false);
    expect(sessionIsValid({ expiresAt: now }, now)).toBe(false);
    expect(sessionIsValid({ expiresAt: new Date(now.getTime() + 1) }, now)).toBe(true);
  });
  it('does not grant members admin access or admins customer ownership', () => {
    expect(canAccessAdmin(null)).toBe(false);
    expect(canAccessAdmin({ role: 'MEMBER' })).toBe(false);
    expect(canAccessAdmin({ role: 'ADMIN' })).toBe(true);
    expect(ownsResource({ id: 'admin', role: 'ADMIN' }, 'member')).toBe(false);
    expect(ownsResource({ id: 'member', role: 'MEMBER' }, 'member')).toBe(true);
    expect(ownsResource(null, 'member')).toBe(false);
  });
});

describe('request boundaries', () => {
  it('rejects cross-origin and originless mutations', () => {
    expect(isSameOrigin('https://hub.example', 'https://hub.example')).toBe(true);
    expect(isSameOrigin('https://evil.example', 'https://hub.example')).toBe(false);
    expect(isSameOrigin(null, 'https://hub.example')).toBe(false);
    expect(isSameOrigin('https://hub.example.evil', 'https://hub.example')).toBe(false);
  });
  it('normalizes email, bounds passwords and strips role escalation fields', () => {
    const input = { name: 'Test Member', email: ' MEMBER@Example.com ', password: 'Safe test password 2026!', role: 'ADMIN', userId: 'other' };
    expect(registrationSchema.parse(input)).toEqual({ name: 'Test Member', email: 'member@example.com', password: input.password, brokerName: '', mt5Account: '', mt5Server: '' });
    expect(registrationSchema.safeParse({ ...input, password: 'short' }).success).toBe(false);
    expect(credentialsSchema.safeParse({ email: 'not-email', password: 'x' }).success).toBe(false);
    expect(credentialsSchema.safeParse({ email: 'a@b.com', password: 'x'.repeat(257) }).success).toBe(false);
    expect(resetSchema.safeParse({ token: 'short', password: input.password }).success).toBe(false);
  });
});
