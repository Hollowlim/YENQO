import { afterEach, expect, it, vi } from 'vitest';
import { deliverReset, resetDeliveryEnabled, deliverMembershipNotice, membershipDeliveryEnabled } from '../../apps/web/server/email.js';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const token = 'x'.repeat(43);
it('never enables a production development outbox', () => {
  vi.stubEnv('NODE_ENV','production'); vi.stubEnv('DEV_EMAIL_OUTBOX','true'); vi.stubEnv('RESEND_API_KEY',''); vi.stubEnv('RESET_EMAIL_FROM','');
  expect(resetDeliveryEnabled()).toBe(false);
});
it('can deliver production reset email through a privately configured provider', async () => {
  vi.stubEnv('NODE_ENV','production'); vi.stubEnv('APP_ORIGIN','https://hub.example.test'); vi.stubEnv('RESEND_API_KEY','synthetic-key'); vi.stubEnv('RESET_EMAIL_FROM','YENGFX <support@example.test>');
  const send = vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'synthetic-message'}),{status:200})); vi.stubGlobal('fetch',send);
  expect(resetDeliveryEnabled()).toBe(true); await deliverReset('client@example.test',token);
  const [url,request] = send.mock.calls[0]; expect(url).toBe('https://api.resend.com/emails');
  const payload = JSON.parse(request.body); expect(payload.to).toEqual(['client@example.test']); expect(payload.text).toContain(`https://hub.example.test/auth/reset-password?token=${token}`);
  expect(request.headers.Authorization).toBe('Bearer synthetic-key'); expect(payload.text).not.toContain('synthetic-key');
  expect(request.headers['Idempotency-Key']).toMatch(/^password-reset\/[a-f0-9]{64}$/);
  expect(request.headers['Idempotency-Key']).not.toContain(token);
  expect(request.redirect).toBe('error');
});
it('uses the shared sender and only enables member emails with an explicit flag', async()=>{
 vi.stubEnv('NODE_ENV','production');vi.stubEnv('APP_ORIGIN','https://hub.example.test');vi.stubEnv('RESEND_API_KEY','synthetic-key');vi.stubEnv('RESEND_FROM','YENGFX HUB <account@example.test>');vi.stubEnv('MEMBERSHIP_EMAIL_ENABLED','false');
 const send=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'fixture-message'})));vi.stubGlobal('fetch',send);
 expect(membershipDeliveryEnabled()).toBe(false);
 await expect(deliverMembershipNotice('client@example.test','APPROVED','audit-fixture',new Date(0))).rejects.toThrow('not configured');expect(send).not.toHaveBeenCalled();
 vi.stubEnv('MEMBERSHIP_EMAIL_ENABLED','true');
 expect(await deliverMembershipNotice('client@example.test','APPROVED','audit-fixture',new Date(0))).toBe('provider_accepted');
 const payload=JSON.parse(send.mock.calls[0][1].body);expect(payload.from).toBe('YENGFX HUB <account@example.test>');expect(payload.to).toEqual(['client@example.test']);expect(payload.subject).toContain('approved');expect(payload.text).toContain('https://hub.example.test/app/membership');expect(payload.text).not.toMatch(/MT5|10000|investor|synthetic-key/);expect(send.mock.calls[0][1].headers['Idempotency-Key']).toBe('membership-review/audit-fixture');
});
it('sanitizes membership failures, rejects invalid states and prevents unsafe reset origins',async()=>{
 vi.stubEnv('NODE_ENV','production');vi.stubEnv('APP_ORIGIN','https://hub.example.test');vi.stubEnv('RESEND_API_KEY','synthetic-key');vi.stubEnv('RESEND_FROM','account@example.test');vi.stubEnv('MEMBERSHIP_EMAIL_ENABLED','true');
 const send=vi.fn().mockResolvedValue(new Response('private-provider-diagnostic',{status:422}));vi.stubGlobal('fetch',send);
 await expect(deliverMembershipNotice('client@example.test','REVOKED','fixture',new Date(0))).rejects.toThrow('Email delivery unavailable');
 expect(JSON.parse(send.mock.calls[0][1].body).subject).toContain('access has changed');
 await expect(deliverMembershipNotice('client@example.test','FREE','fixture',new Date(0))).rejects.toThrow('Invalid membership');
 for(const origin of ['http://localhost:3000','ftp://localhost','https://user:secret@hub.example.test','https://hub.example.test?token=bad']){
  vi.stubEnv('APP_ORIGIN',origin);await expect(deliverReset('client@example.test',token)).rejects.toThrow('Invalid email origin');
 }
});
it('does not report delivery success on provider failures or unsafe origins', async () => {
  vi.stubEnv('RESEND_API_KEY','synthetic-key'); vi.stubEnv('RESET_EMAIL_FROM','support@example.test'); vi.stubEnv('APP_ORIGIN','https://hub.example.test');
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('provider error',{status:500})));
  await expect(deliverReset('client@example.test',token)).rejects.toThrow('Email delivery unavailable');
  vi.stubEnv('APP_ORIGIN','http://public.example.test'); await expect(deliverReset('client@example.test',token)).rejects.toThrow();
});
